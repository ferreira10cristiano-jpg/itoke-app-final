import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
  TextInput,
  Switch,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { Offer, QRCode as QRCodeType } from '../types';

interface QRModalProps {
  visible: boolean;
  onClose: () => void;
  offer: Offer | null;
  qrCode: QRCodeType | null;
  isGenerating: boolean;
  onGenerate: (useCredits?: number) => void;
  userTokens: number;
  userCredits?: number;
}

export const QRModal: React.FC<QRModalProps> = ({
  visible,
  onClose,
  offer,
  qrCode,
  isGenerating,
  onGenerate,
  userTokens,
  userCredits = 0,
}) => {
  const router = useRouter();
  const [useCredits, setUseCredits] = useState(false);
  const [creditsToUse, setCreditsToUse] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [displayMode, setDisplayMode] = useState<'generate' | 'loading' | 'success' | 'result'>('generate');
  const [stableQR, setStableQR] = useState<QRCodeType | null>(null);

  // Animation refs
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  const playSuccessAnimation = () => {
    successScale.setValue(0);
    successOpacity.setValue(0);
    checkScale.setValue(0);

    Animated.sequence([
      // Fade in + scale up the success container
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // Pop the check icon
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 3,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Manage display mode transitions safely  
  useEffect(() => {
    if (isGenerating) {
      setDisplayMode('loading');
    } else if (qrCode && !isGenerating) {
      // Show success first, then QR
      const successTimer = setTimeout(() => {
        setStableQR(qrCode);
        setDisplayMode('success');
        playSuccessAnimation();
      }, 100);
      // Transition to QR result after success animation
      const resultTimer = setTimeout(() => {
        setDisplayMode('result');
      }, 2500);
      return () => {
        clearTimeout(successTimer);
        clearTimeout(resultTimer);
      };
    } else if (!qrCode && !isGenerating) {
      setDisplayMode('generate');
      setStableQR(null);
    }
  }, [qrCode, isGenerating]);

  // Reset ONLY when modal closes
  useEffect(() => {
    if (!visible) {
      // Small delay to avoid visual flash on close
      const timer = setTimeout(() => {
        setDisplayMode('generate');
        setStableQR(null);
        setUseCredits(false);
        setCreditsToUse('');
        setGenerateError('');
        successScale.setValue(0);
        successOpacity.setValue(0);
        checkScale.setValue(0);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  const handleShare = async () => {
    if (qrCode) {
      try {
        await Share.share({
          message: `Use o codigo ${qrCode.code_hash} para resgatar ${offer?.title} com ${offer?.discount_value}% de desconto!`,
        });
      } catch (error) {
        console.error('Share error:', error);
      }
    }
  };

  const getExpiresIn = () => {
    if (!stableQR) return '';
    const expires = new Date(stableQR.expires_at);
    const now = new Date();
    const days = Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days > 30) {
      const months = Math.floor(days / 30);
      return `Valido por ${months} ${months === 1 ? 'mes' : 'meses'}`;
    }
    return `Valido por ${days} dias`;
  };

  const handleBuyTokens = () => {
    onClose();
    setTimeout(() => {
      router.push('/buy-tokens');
    }, 300);
  };

  const handleCloseAndNavigate = () => {
    onClose();
    if (displayMode === 'result' || displayMode === 'success') {
      setTimeout(() => router.push('/(tabs)/qr'), 300);
    }
  };

  const sanitizeCreditInput = (text: string) => {
    let sanitized = text.replace(/[^0-9.,]/g, '');
    const parts = sanitized.replace(',', '.').split('.');
    if (parts.length > 1) {
      sanitized = parts[0] + '.' + parts.slice(1).join('').slice(0, 2);
    }
    return sanitized;
  };

  const handleCreditInputChange = (text: string) => {
    const sanitized = sanitizeCreditInput(text);
    setCreditsToUse(sanitized);
    setGenerateError('');
  };

  const hasTokens = userTokens >= 1;
  const hasCredits = userCredits > 0;
  const maxCredits = Math.min(userCredits, offer?.discounted_price || 0);

  const handleToggleCredits = (value: boolean) => {
    setUseCredits(value);
    setGenerateError('');
    if (value) {
      setCreditsToUse(maxCredits.toFixed(2));
    } else {
      setCreditsToUse('');
    }
  };

  const parsedCredits = parseFloat(creditsToUse.replace(',', '.')) || 0;
  const effectiveCredits = useCredits ? Math.min(parsedCredits, maxCredits) : 0;
  const remainingToPay = Math.max(0, (offer?.discounted_price || 0) - effectiveCredits);

  const creditInputError = useCredits && parsedCredits > 0 && (
    parsedCredits > userCredits ? 'Valor maior que seu saldo de creditos' :
    parsedCredits > (offer?.discounted_price || 0) ? 'Valor maior que o preco da oferta' :
    ''
  );

  const handleGenerate = () => {
    setGenerateError('');
    if (creditInputError) return;
    
    let creditsAmount = 0;
    if (useCredits && creditsToUse && creditsToUse.trim() !== '') {
      creditsAmount = parseFloat(creditsToUse.replace(',', '.')) || 0;
      creditsAmount = Math.min(creditsAmount, maxCredits);
    }
    
    onGenerate(creditsAmount);
  };

  const isResultMode = displayMode === 'result' || displayMode === 'success';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCloseAndNavigate}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, isResultMode && styles.containerResult]}>
          {/* Close Button - Always visible, prominent on result */}
          <TouchableOpacity
            style={[styles.closeButton, isResultMode && styles.closeButtonResult]}
            onPress={handleCloseAndNavigate}
            testID="qr-modal-close"
          >
            <Ionicons name="close" size={isResultMode ? 28 : 24} color={isResultMode ? '#FFFFFF' : '#94A3B8'} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={styles.scrollContent}>
          {offer && (
            <>
              {/* Hide offer title/price during success animation */}
              {displayMode !== 'success' && (
                <>
                  <Text style={styles.title}>{offer.title}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.discount}>{offer.discount_value}% OFF</Text>
                    <Text style={styles.price}>{formatPrice(offer.discounted_price)}</Text>
                  </View>
                </>
              )}

              {/* Loading State */}
              {displayMode === 'loading' && (
                <View style={styles.loadingContainer} testID="qr-generating">
                  <ActivityIndicator size="large" color="#10B981" />
                  <Text style={styles.loadingText}>Gerando seu QR Code...</Text>
                </View>
              )}

              {/* Success Animation */}
              {displayMode === 'success' && (
                <Animated.View
                  style={[
                    styles.successContainer,
                    {
                      opacity: successOpacity,
                      transform: [{ scale: successScale }],
                    },
                  ]}
                  testID="qr-success-message"
                >
                  <Animated.View
                    style={[
                      styles.successCheckCircle,
                      { transform: [{ scale: checkScale }] },
                    ]}
                  >
                    <Ionicons name="checkmark" size={56} color="#FFFFFF" />
                  </Animated.View>
                  <Text style={styles.successTitle}>Compra realizada{'\n'}com sucesso!</Text>
                  <Text style={styles.successSubtitle}>Seu QR Code foi gerado</Text>
                </Animated.View>
              )}

              {/* QR Result - persistent until user closes */}
              {displayMode === 'result' && stableQR && (
                <View style={styles.qrContainer} testID="qr-result-container">
                  {/* Inline success badge */}
                  <View style={styles.successBadge} testID="qr-success-badge">
                    <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                    <Text style={styles.successBadgeText}>Compra realizada com sucesso!</Text>
                  </View>

                  {/* Offer title in result */}
                  <Text style={styles.resultOfferTitle}>{offer.title}</Text>

                  {/* QR Code - large, white bg for scanner readability */}
                  <View style={styles.qrWrapper} testID="qr-code-display">
                    <QRCode
                      value={stableQR.code_hash || 'invalid'}
                      size={220}
                      backgroundColor="#FFFFFF"
                      color="#0F172A"
                    />
                  </View>
                  
                  {stableQR.backup_code ? (
                    <View style={styles.backupCodeContainer} testID="qr-modal-backup-code">
                      <Text style={styles.backupCodeLabel}>Codigo de Resgate:</Text>
                      <Text style={styles.backupCodeValue}>{stableQR.backup_code}</Text>
                      <Text style={styles.backupCodeHint}>Use se a camera nao funcionar</Text>
                    </View>
                  ) : null}
                  
                  {stableQR.offer_code ? (
                    <Text style={styles.offerCodeText}>Oferta: {stableQR.offer_code}</Text>
                  ) : null}
                  
                  <View style={styles.priceDetailsBox}>
                    {((stableQR.credits_reserved || 0) > 0 || (stableQR.credits_used || 0) > 0) ? (
                      <View style={styles.priceDetailRow}>
                        <View style={styles.priceDetailLeft}>
                          <Ionicons name="wallet" size={16} color="#3B82F6" />
                          <Text style={styles.priceDetailLabel}>Pago com creditos</Text>
                        </View>
                        <Text style={styles.priceDetailValueBlue}>
                          R$ {(stableQR.credits_used || stableQR.credits_reserved || 0).toFixed(2).replace('.', ',')}
                        </Text>
                      </View>
                    ) : null}
                    
                    <View style={styles.priceDetailRow}>
                      <View style={styles.priceDetailLeft}>
                        <Ionicons name="cash" size={16} color="#10B981" />
                        <Text style={styles.priceDetailLabel}>Pagar no balcao</Text>
                      </View>
                      <Text style={styles.priceDetailValueGreen}>
                        R$ {(stableQR.final_price_to_pay ?? Math.max(0, (offer.discounted_price - (stableQR.credits_reserved || 0)))).toFixed(2).replace('.', ',')}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.expiresText}>{getExpiresIn()}</Text>

                  <TouchableOpacity style={styles.shareButton} onPress={handleShare} testID="qr-modal-share">
                    <Ionicons name="share-outline" size={20} color="#0F172A" />
                    <Text style={styles.shareButtonText}>Compartilhar</Text>
                  </TouchableOpacity>

                  <Text style={styles.instructionText}>
                    Apresente este QR Code no estabelecimento para resgatar seu desconto
                  </Text>

                  <TouchableOpacity
                    style={styles.goToMyQRButton}
                    onPress={handleCloseAndNavigate}
                    testID="qr-go-to-my-qrs"
                  >
                    <Ionicons name="qr-code" size={18} color="#FFFFFF" />
                    <Text style={styles.goToMyQRText}>Fechar e Ver Meus QR Codes</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Generate Form */}
              {displayMode === 'generate' && hasTokens && (
                <View style={styles.generateContainer}>
                  <View style={styles.balanceSummary}>
                    <View style={styles.balanceItem}>
                      <Ionicons name="ticket" size={20} color="#10B981" />
                      <Text style={styles.balanceLabel}>Tokens:</Text>
                      <Text style={styles.balanceValue}>{userTokens}</Text>
                    </View>
                    <View style={styles.balanceDivider} />
                    <View style={styles.balanceItem}>
                      <Ionicons name="wallet" size={20} color="#3B82F6" />
                      <Text style={styles.balanceLabel}>Creditos:</Text>
                      <Text style={[styles.balanceValue, styles.creditValue]}>
                        R$ {userCredits.toFixed(2).replace('.', ',')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tokenCostInfo}>
                    <Ionicons name="information-circle" size={18} color="#10B981" />
                    <Text style={styles.tokenCostText}>
                      Sera descontado <Text style={styles.tokenCostHighlight}>1 token</Text> do seu saldo para gerar o QR Code
                    </Text>
                  </View>

                  {hasCredits && (
                    <View style={styles.creditsSection}>
                      <View style={styles.creditsSectionHeader}>
                        <View style={styles.creditsSectionTitleRow}>
                          <Ionicons name="wallet" size={20} color="#3B82F6" />
                          <Text style={styles.creditsSectionTitle}>Usar Creditos na Compra</Text>
                        </View>
                        <Switch
                          value={useCredits}
                          onValueChange={handleToggleCredits}
                          trackColor={{ false: '#334155', true: '#3B82F6' }}
                          thumbColor={useCredits ? '#FFFFFF' : '#94A3B8'}
                          testID="credits-toggle"
                        />
                      </View>
                      
                      {useCredits && (
                        <View style={styles.creditsInputContainer}>
                          <Text style={styles.creditsInputLabel}>
                            Quanto deseja usar? (max: {formatPrice(maxCredits)})
                          </Text>
                          <View style={styles.creditsInputRow}>
                            <Text style={styles.creditsPrefix}>R$</Text>
                            <TextInput
                              style={[styles.creditsInput, creditInputError ? styles.creditsInputError : null]}
                              value={creditsToUse}
                              onChangeText={handleCreditInputChange}
                              keyboardType="decimal-pad"
                              placeholder={maxCredits.toFixed(2)}
                              placeholderTextColor="#64748B"
                              testID="credits-input"
                            />
                          </View>
                          
                          <TouchableOpacity 
                            style={styles.maxButton}
                            onPress={() => { setCreditsToUse(maxCredits.toFixed(2)); setGenerateError(''); }}
                            testID="credits-max-btn"
                          >
                            <Text style={styles.maxButtonText}>MAX ({formatPrice(maxCredits)})</Text>
                          </TouchableOpacity>
                          
                          {parsedCredits > 0 && !creditInputError ? (
                            <View style={styles.calcPreview}>
                              <Text style={styles.calcText}>
                                Voce usara <Text style={styles.calcHighlightBlue}>{formatPrice(effectiveCredits)}</Text> em creditos.
                              </Text>
                              <Text style={styles.calcText}>
                                Restara <Text style={styles.calcHighlightGreen}>{formatPrice(remainingToPay)}</Text> para pagar no balcao.
                              </Text>
                            </View>
                          ) : null}
                          
                          {creditInputError ? (
                            <View style={styles.creditErrorRow}>
                              <Ionicons name="alert-circle" size={14} color="#EF4444" />
                              <Text style={styles.creditErrorText}>{creditInputError}</Text>
                            </View>
                          ) : null}
                        </View>
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.generateButton, (isGenerating || !!creditInputError) && styles.generateButtonDisabled]}
                    onPress={handleGenerate}
                    disabled={isGenerating || !!creditInputError}
                    testID="generate-qr-btn"
                  >
                    {isGenerating ? (
                      <ActivityIndicator color="#0F172A" />
                    ) : (
                      <>
                        <Ionicons name="qr-code" size={20} color="#0F172A" />
                        <Text style={styles.generateButtonText}>Gerar QR Code</Text>
                        <View style={styles.tokenBadge}>
                          <Ionicons name="ticket" size={12} color="#0F172A" />
                          <Text style={styles.tokenBadgeText}>-1</Text>
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* No tokens */}
              {displayMode === 'generate' && !hasTokens && (
                <View style={styles.noTokensContainer}>
                  <View style={styles.noTokensIcon}>
                    <Ionicons name="ticket-outline" size={48} color="#EF4444" />
                  </View>
                  <Text style={styles.noTokensTitle}>Tokens Insuficientes</Text>
                  <Text style={styles.noTokensText}>
                    Voce precisa de pelo menos 1 token para gerar o QR Code. Compre um pacote de tokens para continuar!
                  </Text>

                  <View style={styles.balanceSummary}>
                    <View style={styles.balanceItem}>
                      <Ionicons name="ticket" size={20} color="#EF4444" />
                      <Text style={styles.balanceLabel}>Tokens:</Text>
                      <Text style={[styles.balanceValue, styles.balanceZero]}>{userTokens}</Text>
                    </View>
                    <View style={styles.balanceDivider} />
                    <View style={styles.balanceItem}>
                      <Ionicons name="wallet" size={20} color="#3B82F6" />
                      <Text style={styles.balanceLabel}>Creditos:</Text>
                      <Text style={[styles.balanceValue, styles.creditValue]}>
                        R$ {userCredits.toFixed(2).replace('.', ',')}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.buyTokensButton}
                    onPress={handleBuyTokens}
                  >
                    <Ionicons name="cart" size={20} color="#0F172A" />
                    <Text style={styles.buyTokensText}>Comprar Pacote de Tokens</Text>
                  </TouchableOpacity>

                  <Text style={styles.priceHint}>A partir de R$ 7,00</Text>
                </View>
              )}
            </>
          )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '92%',
  },
  containerResult: {
    maxHeight: '95%',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // ========== CLOSE BUTTON ==========
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonResult: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
    top: 12,
    right: 12,
  },
  // ========== SUCCESS ANIMATION ==========
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  successCheckCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    // Shadow for depth
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 36,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 12,
    textAlign: 'center',
  },
  // ========== SUCCESS BADGE (inline in result) ==========
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
  },
  successBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
  },
  resultOfferTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  // ========== LOADING ==========
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  // ========== HEADER ==========
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    paddingRight: 48,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  discount: {
    backgroundColor: '#10B981',
    color: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '600',
    overflow: 'hidden',
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },
  // ========== QR RESULT ==========
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  qrWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    // Shadow for the QR card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  backupCodeContainer: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F59E0B',
    width: '100%',
    maxWidth: 300,
  },
  backupCodeLabel: {
    fontSize: 11,
    color: '#92400E',
    marginBottom: 4,
  },
  backupCodeValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#78350F',
    letterSpacing: 3,
  },
  backupCodeHint: {
    fontSize: 10,
    color: '#B45309',
    marginTop: 4,
    fontStyle: 'italic',
  },
  offerCodeText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceDetailsBox: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  priceDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  priceDetailLabel: {
    fontSize: 12,
    color: '#CBD5E1',
    flexShrink: 1,
  },
  priceDetailValueBlue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#60A5FA',
  },
  priceDetailValueGreen: {
    fontSize: 17,
    fontWeight: '800',
    color: '#10B981',
  },
  expiresText: {
    marginTop: 10,
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  shareButtonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionText: {
    marginTop: 20,
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  goToMyQRButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 14,
    gap: 8,
    width: '100%',
  },
  goToMyQRText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // ========== GENERATE FORM ==========
  generateContainer: {
    paddingVertical: 10,
  },
  balanceSummary: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  balanceItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  balanceDivider: {
    width: 1,
    backgroundColor: '#334155',
    marginHorizontal: 12,
  },
  balanceLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  creditValue: {
    color: '#3B82F6',
  },
  balanceZero: {
    color: '#EF4444',
  },
  tokenCostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  tokenCostText: {
    flex: 1,
    fontSize: 13,
    color: '#A7F3D0',
    lineHeight: 18,
  },
  tokenCostHighlight: {
    fontWeight: '700',
    color: '#10B981',
  },
  creditsSection: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  creditsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creditsSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creditsSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  creditsInputContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  creditsInputLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 8,
  },
  creditsInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  creditsPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    paddingRight: 8,
  },
  creditsInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
  },
  creditsInputError: {
    borderColor: '#EF4444',
  },
  maxButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  maxButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  calcPreview: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  calcText: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 20,
  },
  calcHighlightBlue: {
    fontWeight: '700',
    color: '#60A5FA',
  },
  calcHighlightGreen: {
    fontWeight: '700',
    color: '#10B981',
  },
  creditErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  creditErrorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  generateButtonText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
  },
  tokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 2,
  },
  tokenBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  // ========== NO TOKENS ==========
  noTokensContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  noTokensIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF444420',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noTokensTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 12,
  },
  noTokensText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  buyTokensButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    width: '100%',
  },
  buyTokensText: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
  },
  priceHint: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
  },
});

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
  // Stable state to prevent DOM swap crash (removeChild error)
  const [displayMode, setDisplayMode] = useState<'generate' | 'loading' | 'result'>('generate');
  const [stableQR, setStableQR] = useState<QRCodeType | null>(null);

  // Manage display mode transitions safely  
  useEffect(() => {
    if (isGenerating) {
      setDisplayMode('loading');
    } else if (qrCode && !isGenerating) {
      // Delay result display to let React finish unmounting spinner
      const timer = setTimeout(() => {
        setStableQR(qrCode);
        setDisplayMode('result');
      }, 100);
      return () => clearTimeout(timer);
    } else if (!qrCode && !isGenerating) {
      setDisplayMode('generate');
      setStableQR(null);
    }
  }, [qrCode, isGenerating]);

  // Reset when modal closes
  useEffect(() => {
    if (!visible) {
      setDisplayMode('generate');
      setStableQR(null);
      setUseCredits(false);
      setCreditsToUse('');
      setGenerateError('');
    }
  }, [visible]);

  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  const handleShare = async () => {
    if (qrCode) {
      try {
        await Share.share({
          message: `Use o código ${qrCode.code_hash} para resgatar ${offer?.title} com ${offer?.discount_value}% de desconto!`,
        });
      } catch (error) {
        console.error('Share error:', error);
      }
    }
  };

  const getExpiresIn = () => {
    if (!qrCode) return '';
    const expires = new Date(qrCode.expires_at);
    const now = new Date();
    const days = Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days > 30) {
      const months = Math.floor(days / 30);
      return `Válido por ${months} ${months === 1 ? 'mês' : 'meses'}`;
    }
    return `Válido por ${days} dias`;
  };

  const handleBuyTokens = () => {
    onClose();
    setTimeout(() => {
      router.push('/buy-tokens');
    }, 300);
  };

  const sanitizeCreditInput = (text: string) => {
    // Only allow digits, comma, and period
    let sanitized = text.replace(/[^0-9.,]/g, '');
    // Replace comma with period for parsing
    const parts = sanitized.replace(',', '.').split('.');
    // Only keep first decimal point, max 2 decimal places
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

  // Define maxCredits BEFORE functions that use it
  const hasTokens = userTokens >= 1;
  const hasCredits = userCredits > 0;
  const maxCredits = Math.min(userCredits, offer?.discounted_price || 0);

  const handleToggleCredits = (value: boolean) => {
    setUseCredits(value);
    setGenerateError('');
    if (value) {
      // Auto-fill with max possible credits
      setCreditsToUse(maxCredits.toFixed(2));
    } else {
      setCreditsToUse('');
    }
  };

  // Parse current credit amount
  const parsedCredits = parseFloat(creditsToUse.replace(',', '.')) || 0;
  const effectiveCredits = useCredits ? Math.min(parsedCredits, maxCredits) : 0;
  const remainingToPay = Math.max(0, (offer?.discounted_price || 0) - effectiveCredits);

  // Validation: only error if amount exceeds balance or offer price
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} data-testid="qr-modal-close">
            <Ionicons name="close" size={24} color="#94A3B8" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={styles.scrollContent}>
          {offer && (
            <>
              <Text style={styles.title}>{offer.title}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.discount}>{offer.discount_value}% OFF</Text>
                <Text style={styles.price}>{formatPrice(offer.discounted_price)}</Text>
              </View>

              {/* Loading State */}
              {displayMode === 'loading' && (
                <View style={styles.loadingContainer} data-testid="qr-generating">
                  <ActivityIndicator size="large" color="#10B981" />
                  <Text style={styles.loadingText}>Gerando seu QR Code...</Text>
                </View>
              )}

              {/* QR Result - only shows after stable transition */}
              {displayMode === 'result' && stableQR && (
                <View style={styles.qrContainer}>
                  <View style={styles.qrWrapper}>
                    <QRCode
                      value={stableQR.code_hash || 'invalid'}
                      size={180}
                      backgroundColor="#FFFFFF"
                      color="#0F172A"
                    />
                  </View>
                  
                  {stableQR.backup_code ? (
                    <View style={styles.backupCodeContainer} data-testid="qr-modal-backup-code">
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
                          <Text style={styles.priceDetailLabel}>Valor pago com creditos</Text>
                        </View>
                        <Text style={styles.priceDetailValueBlue}>
                          R$ {(stableQR.credits_used || stableQR.credits_reserved || 0).toFixed(2).replace('.', ',')}
                        </Text>
                      </View>
                    ) : null}
                    
                    <View style={styles.priceDetailRow}>
                      <View style={styles.priceDetailLeft}>
                        <Ionicons name="cash" size={16} color="#10B981" />
                        <Text style={styles.priceDetailLabel}>Valor a pagar no balcao</Text>
                      </View>
                      <Text style={styles.priceDetailValueGreen}>
                        R$ {(stableQR.final_price_to_pay ?? Math.max(0, (offer.discounted_price - (stableQR.credits_reserved || 0)))).toFixed(2).replace('.', ',')}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.expiresText}>{getExpiresIn()}</Text>

                  <TouchableOpacity style={styles.shareButton} onPress={handleShare} data-testid="qr-modal-share">
                    <Ionicons name="share-outline" size={20} color="#0F172A" />
                    <Text style={styles.shareButtonText}>Compartilhar</Text>
                  </TouchableOpacity>

                  <Text style={styles.instructionText}>
                    Apresente este QR Code no estabelecimento para resgatar seu desconto
                  </Text>
                </View>
              )}

              {/* Generate Form - only when no QR */}
              {displayMode === 'generate' && hasTokens && (
                <View style={styles.generateContainer}>
                  {/* Balance Summary */}
                  <View style={styles.balanceSummary}>
                    <View style={styles.balanceItem}>
                      <Ionicons name="ticket" size={20} color="#10B981" />
                      <Text style={styles.balanceLabel}>Tokens:</Text>
                      <Text style={styles.balanceValue}>{userTokens}</Text>
                    </View>
                    <View style={styles.balanceDivider} />
                    <View style={styles.balanceItem}>
                      <Ionicons name="wallet" size={20} color="#3B82F6" />
                      <Text style={styles.balanceLabel}>Créditos:</Text>
                      <Text style={[styles.balanceValue, styles.creditValue]}>
                        R$ {userCredits.toFixed(2).replace('.', ',')}
                      </Text>
                    </View>
                  </View>

                  {/* Token cost info */}
                  <View style={styles.tokenCostInfo}>
                    <Ionicons name="information-circle" size={18} color="#10B981" />
                    <Text style={styles.tokenCostText}>
                      Será descontado <Text style={styles.tokenCostHighlight}>1 token</Text> do seu saldo para gerar o QR Code
                    </Text>
                  </View>

                  {/* Optional: Use Credits */}
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
                          data-testid="credits-toggle"
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
                              data-testid="credits-input"
                            />
                            <TouchableOpacity 
                              style={styles.maxButton}
                              onPress={() => { setCreditsToUse(maxCredits.toFixed(2)); setGenerateError(''); }}
                              data-testid="credits-max-btn"
                            >
                              <Text style={styles.maxButtonText}>MAX</Text>
                            </TouchableOpacity>
                          </View>
                          
                          {/* Real-time calculation */}
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
                          
                          {/* Error message - only for actual invalid amounts */}
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
                    data-testid="generate-qr-btn"
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

              {/* No tokens message */}
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
                    <Text style={styles.buyTokensText}>
                      Comprar Pacote de Tokens
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.priceHint}>A partir de R$ 7,00 (5 tokens)</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
  scrollContent: {
    paddingBottom: 20,
  },
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
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    paddingRight: 40,
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
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  qrWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
  },
  backupCodeContainer: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F59E0B',
    width: '100%',
    maxWidth: 280,
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
    marginTop: 14,
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
    marginTop: 8,
    fontSize: 14,
    color: '#10B981',
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
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
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
    paddingVertical: 14,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maxButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
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

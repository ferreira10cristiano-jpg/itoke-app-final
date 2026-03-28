import React, { useState } from 'react';
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

  const handleGenerate = () => {
    if (useCredits && creditsToUse) {
      const credits = parseFloat(creditsToUse.replace(',', '.')) || 0;
      onGenerate(credits);
    } else {
      onGenerate(0);
    }
  };

  const hasTokens = userTokens >= 1;
  const hasCredits = userCredits > 0;
  const maxCredits = Math.min(userCredits, offer?.discounted_price || 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#94A3B8" />
          </TouchableOpacity>

          {offer && (
            <>
              <Text style={styles.title}>{offer.title}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.discount}>{offer.discount_value}% OFF</Text>
                <Text style={styles.price}>{formatPrice(offer.discounted_price)}</Text>
              </View>

              {qrCode ? (
                <View style={styles.qrContainer}>
                  <View style={styles.qrWrapper}>
                    <QRCode
                      value={qrCode.code_hash}
                      size={200}
                      backgroundColor="#FFFFFF"
                      color="#0F172A"
                    />
                  </View>
                  <Text style={styles.codeText}>{qrCode.code_hash}</Text>
                  {qrCode.offer_code && (
                    <Text style={styles.offerCodeText}>Código: {qrCode.offer_code}</Text>
                  )}
                  <Text style={styles.expiresText}>{getExpiresIn()}</Text>

                  <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                    <Ionicons name="share-outline" size={20} color="#0F172A" />
                    <Text style={styles.shareButtonText}>Compartilhar</Text>
                  </TouchableOpacity>

                  <Text style={styles.instructionText}>
                    Apresente este QR Code no estabelecimento para resgatar seu desconto
                  </Text>
                </View>
              ) : hasTokens ? (
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
                          <Text style={styles.creditsSectionTitle}>Usar Créditos na Compra</Text>
                        </View>
                        <Switch
                          value={useCredits}
                          onValueChange={setUseCredits}
                          trackColor={{ false: '#334155', true: '#3B82F6' }}
                          thumbColor={useCredits ? '#FFFFFF' : '#94A3B8'}
                        />
                      </View>
                      
                      {useCredits && (
                        <View style={styles.creditsInputContainer}>
                          <Text style={styles.creditsInputLabel}>
                            Quanto deseja usar? (máx: R$ {maxCredits.toFixed(2).replace('.', ',')})
                          </Text>
                          <View style={styles.creditsInputRow}>
                            <Text style={styles.creditsPrefix}>R$</Text>
                            <TextInput
                              style={styles.creditsInput}
                              value={creditsToUse}
                              onChangeText={setCreditsToUse}
                              keyboardType="decimal-pad"
                              placeholder={maxCredits.toFixed(2)}
                              placeholderTextColor="#64748B"
                            />
                            <TouchableOpacity 
                              style={styles.maxButton}
                              onPress={() => setCreditsToUse(maxCredits.toFixed(2))}
                            >
                              <Text style={styles.maxButtonText}>Máx</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.creditsHint}>
                            Este valor será descontado do preço final no estabelecimento
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.generateButton}
                    onPress={handleGenerate}
                    disabled={isGenerating}
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
              ) : (
                // No tokens - show buy tokens screen
                <View style={styles.noTokensContainer}>
                  <View style={styles.noTokensIcon}>
                    <Ionicons name="ticket-outline" size={48} color="#EF4444" />
                  </View>
                  <Text style={styles.noTokensTitle}>Tokens Insuficientes</Text>
                  <Text style={styles.noTokensText}>
                    Você precisa de pelo menos 1 token para gerar o QR Code. Compre um pacote de tokens para continuar!
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
                      <Text style={styles.balanceLabel}>Créditos:</Text>
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
    maxHeight: '90%',
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
    paddingVertical: 20,
  },
  qrWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
  },
  codeText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  offerCodeText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
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
    gap: 8,
  },
  creditsPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },
  creditsInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
  },
  maxButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  maxButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  creditsHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    fontStyle: 'italic',
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

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Share,
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
  onGenerate: () => void;
  userTokens: number;
}

export const QRModal: React.FC<QRModalProps> = ({
  visible,
  onClose,
  offer,
  qrCode,
  isGenerating,
  onGenerate,
  userTokens,
}) => {
  const router = useRouter();

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
                  <Text style={styles.expiresText}>{getExpiresIn()}</Text>

                  <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                    <Ionicons name="share-outline" size={20} color="#0F172A" />
                    <Text style={styles.shareButtonText}>Compartilhar</Text>
                  </TouchableOpacity>

                  <Text style={styles.instructionText}>
                    Apresente este QR Code no estabelecimento para resgatar seu desconto
                  </Text>
                </View>
              ) : (
                <View style={styles.generateContainer}>
                  {userTokens >= 1 ? (
                    <>
                      <View style={styles.tokenInfo}>
                        <Ionicons name="ticket" size={24} color="#10B981" />
                        <Text style={styles.tokenText}>
                          Você tem <Text style={styles.tokenCount}>{userTokens}</Text> tokens
                        </Text>
                      </View>

                      <Text style={styles.costText}>Custo: 1 token</Text>

                      <TouchableOpacity
                        style={styles.generateButton}
                        onPress={onGenerate}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <ActivityIndicator color="#0F172A" />
                        ) : (
                          <>
                            <Ionicons name="qr-code" size={20} color="#0F172A" />
                            <Text style={styles.generateButtonText}>Gerar QR Code</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      {/* Zero tokens state */}
                      <View style={styles.noTokensIcon}>
                        <Ionicons name="ticket-outline" size={48} color="#EF4444" />
                      </View>
                      <Text style={styles.noTokensTitle}>Sem Tokens</Text>
                      <Text style={styles.noTokensText}>
                        Ops! Você não possui tokens suficientes para gerar este desconto. Adquira um novo pacote de tokens para continuar economizando agora mesmo!
                      </Text>

                      <TouchableOpacity
                        style={styles.buyTokensButton}
                        onPress={handleBuyTokens}
                      >
                        <Ionicons name="cart" size={20} color="#0F172A" />
                        <Text style={styles.buyTokensText}>
                          Comprar Pacote de Tokens (R$ 7,00)
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
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
    marginBottom: 24,
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
    alignItems: 'center',
    paddingVertical: 20,
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tokenText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  tokenCount: {
    fontWeight: '700',
    color: '#10B981',
  },
  costText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '600',
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
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  buyTokensButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    width: '100%',
  },
  buyTokensText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
});

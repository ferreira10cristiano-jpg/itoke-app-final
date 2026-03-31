import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/store/authStore';
import { Offer, QRCode as QRCodeType } from '../../src/types';
import { QRModal } from '../../src/components/QRModal';

const PLACEHOLDER_IMAGES: Record<string, string> = {
  food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
  beauty: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
  fitness: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  auto: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800&q=80',
  default: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
};

export default function OfferDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, refreshUser, logout } = useAuthStore();
  const { width } = useWindowDimensions();
  const heroWidth = Math.min(width, 500);
  const heroHeight = heroWidth * 0.65;
  const [offer, setOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [generatedQR, setGeneratedQR] = useState<QRCodeType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadOffer();
  }, [id]);

  const loadOffer = async () => {
    try {
      const data = await api.getOffer(id as string);
      setOffer(data);
    } catch (error) {
      console.error('Error loading offer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQR = async (useCredits?: number) => {
    if (!offer) return;
    setIsGenerating(true);
    try {
      const qr = await api.generateQR(offer.offer_id, useCredits);
      setGeneratedQR(qr);
      await refreshUser();
    } catch (error: any) {
      console.error('Error generating QR:', error);
      const errorMsg = error.message || 'Erro ao gerar QR Code';
      
      if (errorMsg.includes('expirada') || errorMsg.includes('Invalid session')) {
        alert('Sua sessao expirou. Por favor, faca login novamente.');
        await logout();
        router.replace('/');
        return;
      }
      
      alert('Nao foi possivel gerar o QR Code. Motivo: ' + errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  const openSocialLink = (type: string, value: string) => {
    let url = '';
    if (type === 'instagram') {
      url = `https://instagram.com/${value.replace('@', '')}`;
    } else if (type === 'whatsapp') {
      url = `https://wa.me/55${value.replace(/\D/g, '')}`;
    } else if (type === 'website') {
      url = value.startsWith('http') ? value : `https://${value}`;
    }
    if (url) Linking.openURL(url).catch(() => {});
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!offer) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Oferta não encontrada</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl =
    offer.image_url ||
    PLACEHOLDER_IMAGES[offer.establishment?.category || 'default'] ||
    PLACEHOLDER_IMAGES.default;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero Image */}
        <ImageBackground
          source={{ uri: imageUrl }}
          style={[styles.heroImage, { width: heroWidth, height: heroHeight }]}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(15,23,42,0.6)', 'transparent', 'rgba(15,23,42,0.9)']}
            style={styles.heroGradient}
          >
            {/* Top bar */}
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity style={styles.topBarBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Hero bottom info */}
            <View style={styles.heroBottom}>
              <View style={styles.discountBadgeLarge}>
                <Text style={styles.discountValueLarge}>{Math.round(offer.discount_value)}%</Text>
                <Text style={styles.discountLabelLarge}>OFF</Text>
              </View>
              <Text style={styles.heroTitle}>{offer.title}</Text>
              {offer.establishment && (
                <Text style={styles.heroEstablishment}>
                  {offer.establishment.business_name}
                </Text>
              )}
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Price Section */}
        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>De</Text>
              <Text style={styles.originalPrice}>{formatPrice(offer.original_price)}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#475569" />
            <View>
              <Text style={styles.priceLabel}>Por</Text>
              <Text style={styles.discountedPrice}>{formatPrice(offer.discounted_price)}</Text>
            </View>
          </View>
          <View style={styles.savingsChip}>
            <Ionicons name="cash-outline" size={16} color="#39FF14" />
            <Text style={styles.savingsText}>
              Economia de {formatPrice(offer.original_price - offer.discounted_price)}
            </Text>
          </View>
        </View>

        {/* Description */}
        {(offer.description || offer.detailed_description) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color="#10B981" />
              <Text style={styles.sectionTitle}>Descrição</Text>
            </View>
            {offer.description && (
              <Text style={styles.sectionText}>{offer.description}</Text>
            )}
            {offer.detailed_description && (
              <Text style={styles.detailedText}>{offer.detailed_description}</Text>
            )}
          </View>
        )}

        {/* Rules */}
        {(offer.rules || offer.valid_days || offer.valid_hours) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={20} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Regras de Uso</Text>
            </View>
            {offer.rules && (
              <Text style={styles.sectionText}>{offer.rules}</Text>
            )}
            <View style={styles.rulesGrid}>
              {offer.valid_days && (
                <View style={styles.ruleItem}>
                  <Ionicons name="calendar" size={18} color="#3B82F6" />
                  <Text style={styles.ruleText}>{offer.valid_days}</Text>
                </View>
              )}
              {offer.valid_hours && (
                <View style={styles.ruleItem}>
                  <Ionicons name="time" size={18} color="#3B82F6" />
                  <Text style={styles.ruleText}>{offer.valid_hours}</Text>
                </View>
              )}
              {offer.delivery_allowed !== undefined && (
                <View style={styles.ruleItem}>
                  <Ionicons
                    name={offer.delivery_allowed ? 'bicycle' : 'close-circle'}
                    size={18}
                    color={offer.delivery_allowed ? '#10B981' : '#EF4444'}
                  />
                  <Text style={styles.ruleText}>
                    {offer.delivery_allowed ? 'Delivery disponível' : 'Sem delivery'}
                  </Text>
                </View>
              )}
              {offer.dine_in_only && (
                <View style={styles.ruleItem}>
                  <Ionicons name="restaurant" size={18} color="#F59E0B" />
                  <Text style={styles.ruleText}>Consumo no local</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* About Establishment */}
        {offer.establishment && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business" size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Sobre o Estabelecimento</Text>
            </View>

            <View style={styles.estCard}>
              <Text style={styles.estName}>{offer.establishment.business_name}</Text>

              <View style={styles.estInfoRow}>
                <Ionicons name="location" size={16} color="#64748B" />
                <Text style={styles.estInfoText}>
                  {offer.establishment.address}
                  {offer.establishment.neighborhood ? `, ${offer.establishment.neighborhood}` : ''}
                  {offer.establishment.city ? ` - ${offer.establishment.city}` : ''}
                </Text>
              </View>

              {offer.establishment.about && (
                <Text style={styles.estAbout}>{offer.establishment.about}</Text>
              )}

              {/* Social Links */}
              {offer.establishment.social_links && (
                <View style={styles.socialLinks}>
                  {offer.establishment.social_links.instagram && (
                    <TouchableOpacity
                      style={styles.socialBtn}
                      onPress={() => openSocialLink('instagram', offer.establishment!.social_links!.instagram!)}
                    >
                      <Ionicons name="logo-instagram" size={20} color="#E1306C" />
                      <Text style={styles.socialText}>
                        {offer.establishment.social_links.instagram}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Distance */}
            {offer.distance_km !== null && offer.distance_km !== undefined && (
              <View style={styles.distanceCard}>
                <Ionicons name="navigate" size={20} color="#10B981" />
                <Text style={styles.distanceText}>
                  {offer.distance_km < 1
                    ? `A ${(offer.distance_km * 1000).toFixed(0)} metros de você`
                    : `A ${offer.distance_km.toFixed(1)} km de você`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Token/Credit Info */}
        <View style={styles.tokenInfoBar}>
          <View style={styles.tokenInfoItem}>
            <Ionicons name="ticket" size={18} color="#10B981" />
            <Text style={styles.tokenInfoText}>Tokens: {user?.tokens || 0}</Text>
          </View>
          <View style={styles.tokenInfoItem}>
            <Ionicons name="wallet" size={18} color="#3B82F6" />
            <Text style={styles.creditInfoText}>Créditos: R$ {(user?.credits || 0).toFixed(2).replace('.', ',')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom CTA */}
      <View style={[styles.bottomCTA, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.generateButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="qr-code" size={22} color="#0F172A" />
          <Text style={styles.generateButtonText}>Gerar QR Code</Text>
        </TouchableOpacity>
      </View>

      <QRModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          // Do NOT reset generatedQR here - the modal handles its own reset
        }}
        offer={offer}
        qrCode={generatedQR}
        isGenerating={isGenerating}
        onGenerate={handleGenerateQR}
        userTokens={user?.tokens || 0}
        userCredits={user?.credits || 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 12,
  },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  heroImage: {
    // width and height are set dynamically via inline styles
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBottom: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  discountBadgeLarge: {
    alignSelf: 'flex-start',
    backgroundColor: '#39FF14',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 10,
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  discountValueLarge: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '900',
  },
  discountLabelLarge: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroEstablishment: {
    fontSize: 15,
    color: '#CBD5E1',
    marginTop: 4,
  },
  priceSection: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginTop: -10,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 2,
  },
  originalPrice: {
    fontSize: 18,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    textAlign: 'center',
  },
  discountedPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: '#39FF14',
    textAlign: 'center',
  },
  savingsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B98115',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  savingsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#39FF14',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionText: {
    fontSize: 15,
    color: '#CBD5E1',
    lineHeight: 22,
    marginBottom: 8,
  },
  detailedText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
  },
  rulesGrid: {
    gap: 10,
    marginTop: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ruleText: {
    fontSize: 14,
    color: '#CBD5E1',
    flex: 1,
  },
  estCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  estName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  estInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  estInfoText: {
    fontSize: 14,
    color: '#94A3B8',
    flex: 1,
    lineHeight: 20,
  },
  estAbout: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 22,
    marginBottom: 12,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  socialText: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  distanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98115',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
  },
  tokenInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tokenInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tokenInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  creditInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  tokenBalance: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  bottomCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#0F172AEE',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#39FF14',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  generateButtonText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
  },
  tokenCost: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  tokenCostText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
});

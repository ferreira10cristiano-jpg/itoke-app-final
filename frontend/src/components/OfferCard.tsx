import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Offer } from '../types';

const PLACEHOLDER_IMAGES: Record<string, string> = {
  food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
  beauty: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
  health: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80',
  fitness: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  auto: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800&q=80',
  retail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
  services: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80',
  entertainment: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
  education: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
  default: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
};

interface OfferCardProps {
  offer: Offer;
  onPress: () => void;
}

export const OfferCard: React.FC<OfferCardProps> = ({ offer, onPress }) => {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 32, 500);
  const cardHeight = cardWidth * 0.56;

  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  const imageUrl =
    offer.image_url ||
    PLACEHOLDER_IMAGES[offer.establishment?.category || 'default'] ||
    PLACEHOLDER_IMAGES.default;

  return (
    <TouchableOpacity style={[styles.card, { width: cardWidth, height: cardHeight, alignSelf: 'center' }]} onPress={onPress} activeOpacity={0.9}>
      <ImageBackground
        source={{ uri: imageUrl }}
        style={styles.imageBackground}
        imageStyle={styles.image}
        resizeMode="cover"
      >
        {/* Discount Badge - Top Right */}
        <View style={styles.discountBadge}>
          <Text style={styles.discountValue}>{Math.round(offer.discount_value)}%</Text>
          <Text style={styles.discountLabel}>OFF</Text>
        </View>

        {/* Distance Badge - Top Left */}
        {offer.distance_km !== null && offer.distance_km !== undefined && (
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={12} color="#FFFFFF" />
            <Text style={styles.distanceText}>
              {offer.distance_km < 1
                ? `${(offer.distance_km * 1000).toFixed(0)}m`
                : `${offer.distance_km.toFixed(1)}km`}
            </Text>
          </View>
        )}

        {/* Bottom Gradient with Info */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.92)']}
          style={styles.gradient}
        >
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {offer.title}
            </Text>

            {offer.establishment && (
              <View style={styles.establishmentRow}>
                <Ionicons name="business-outline" size={13} color="#94A3B8" />
                <Text style={styles.establishmentName} numberOfLines={1}>
                  {offer.establishment.business_name}
                </Text>
                {offer.establishment.neighborhood && (
                  <>
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.neighborhood} numberOfLines={1}>
                      {offer.establishment.neighborhood}
                    </Text>
                  </>
                )}
              </View>
            )}

            <View style={styles.priceRow}>
              <Text style={styles.originalPrice}>{formatPrice(offer.original_price)}</Text>
              <Text style={styles.discountedPrice}>{formatPrice(offer.discounted_price)}</Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  imageBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  image: {
    borderRadius: 16,
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#39FF14',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 56,
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  discountValue: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  discountLabel: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  distanceBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  gradient: {
    paddingTop: 40,
    paddingBottom: 14,
    paddingHorizontal: 14,
  },
  infoContainer: {
    gap: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  establishmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  establishmentName: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
    maxWidth: '50%',
  },
  dot: {
    color: '#64748B',
    fontSize: 13,
  },
  neighborhood: {
    fontSize: 13,
    color: '#94A3B8',
    maxWidth: '30%',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  originalPrice: {
    fontSize: 14,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#39FF14',
  },
});

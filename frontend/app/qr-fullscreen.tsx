import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  useWindowDimensions,
  BackHandler,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

export default function QRFullScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { code, title, establishment, discount } = useLocalSearchParams<{
    code: string;
    title: string;
    establishment: string;
    discount: string;
  }>();

  const qrSize = Math.min(width - 80, height * 0.45);

  // Prevent back gesture on Android
  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return false; // Prevent hardware back
    });
    return () => backHandler.remove();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Close button */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.instruction}>Apresente este QR Code no estabelecimento</Text>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <View style={styles.qrWrapper}>
            {code ? (
              <QRCode
                value={code}
                size={qrSize}
                color="#0F172A"
                backgroundColor="#FFFFFF"
              />
            ) : (
              <View style={[styles.qrPlaceholder, { width: qrSize, height: qrSize }]}>
                <Ionicons name="qr-code" size={qrSize * 0.6} color="#10B981" />
              </View>
            )}
          </View>
        </View>

        {/* Offer info */}
        <View style={styles.offerInfo}>
          <Text style={styles.offerTitle}>{title || 'Oferta'}</Text>
          <Text style={styles.offerEstablishment}>{establishment || 'Estabelecimento'}</Text>
          {discount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
        </View>

        <Text style={styles.hint}>
          Mantenha esta tela aberta até o estabelecimento escanear o código
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topBar: {
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  instruction: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    elevation: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  qrPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  offerInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  offerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  offerEstablishment: {
    fontSize: 15,
    color: '#94A3B8',
    marginBottom: 12,
  },
  discountBadge: {
    backgroundColor: '#39FF14',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
  },
  discountText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  hint: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});

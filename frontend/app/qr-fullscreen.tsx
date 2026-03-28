import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  useWindowDimensions,
  BackHandler,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

export default function QRFullScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { code, backupCode, title, establishment, discount, creditsUsed, finalPrice, originalPrice, discountedPrice } = useLocalSearchParams<{
    code: string;
    backupCode: string;
    title: string;
    establishment: string;
    discount: string;
    creditsUsed: string;
    finalPrice: string;
    originalPrice: string;
    discountedPrice: string;
  }>();

  const qrSize = Math.min(width - 80, height * 0.3);
  const creditsAmount = parseFloat(creditsUsed || '0');
  const finalAmount = parseFloat(finalPrice || '0');
  const origPrice = parseFloat(originalPrice || '0');
  const discPrice = parseFloat(discountedPrice || '0');

  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return false;
    });
    return () => backHandler.remove();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Close button */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()} data-testid="qr-fullscreen-close">
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
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
          <Text style={styles.offerTitle} numberOfLines={2}>{title || 'Oferta'}</Text>
          <Text style={styles.offerEstablishment}>{establishment || 'Estabelecimento'}</Text>
          {discount ? (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          ) : null}
        </View>

        {/* Backup Code */}
        {backupCode ? (
          <View style={styles.backupCodeContainer} data-testid="qr-fullscreen-backup-code">
            <Text style={styles.backupCodeLabel}>Codigo de Resgate</Text>
            <Text style={styles.backupCodeValue}>{backupCode}</Text>
            <Text style={styles.backupCodeHint}>Informe este codigo se a camera nao funcionar</Text>
          </View>
        ) : null}

        {/* Price Details */}
        <View style={styles.priceDetailsContainer}>
          <Text style={styles.priceDetailsTitle}>Detalhes do Pagamento</Text>
          
          {origPrice > 0 ? (
            <View style={styles.priceRow}>
              <View style={styles.priceIconRow}>
                <Ionicons name="pricetag" size={16} color="#94A3B8" />
                <Text style={styles.priceLabel}>Valor Original</Text>
              </View>
              <Text style={styles.priceValueStrike}>R$ {origPrice.toFixed(2).replace('.', ',')}</Text>
            </View>
          ) : null}
          
          {discPrice > 0 ? (
            <View style={styles.priceRow}>
              <View style={styles.priceIconRow}>
                <Ionicons name="pricetag" size={16} color="#F59E0B" />
                <Text style={styles.priceLabel}>Valor com Desconto</Text>
              </View>
              <Text style={styles.priceValueWhite}>R$ {discPrice.toFixed(2).replace('.', ',')}</Text>
            </View>
          ) : null}

          {creditsAmount > 0 ? (
            <View style={styles.priceRow}>
              <View style={styles.priceIconRow}>
                <Ionicons name="wallet" size={16} color="#3B82F6" />
                <Text style={styles.priceLabel}>Creditos Aplicados</Text>
              </View>
              <Text style={styles.priceValueRed}>- R$ {creditsAmount.toFixed(2).replace('.', ',')}</Text>
            </View>
          ) : null}
          
          <View style={styles.priceDivider} />
          
          <View style={styles.priceRow}>
            <View style={styles.priceIconRow}>
              <Ionicons name="cash" size={18} color="#10B981" />
              <Text style={styles.priceLabelBold}>VALOR A PAGAR NO BALCAO</Text>
            </View>
            <Text style={styles.priceValueGreen}>R$ {finalAmount.toFixed(2).replace('.', ',')}</Text>
          </View>
        </View>

        <Text style={styles.hint}>
          Mantenha esta tela aberta ate o estabelecimento escanear o codigo
        </Text>

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
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
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  instruction: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrWrapper: {
    padding: 16,
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
    marginBottom: 16,
    width: '100%',
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: 10,
  },
  offerEstablishment: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 10,
  },
  discountBadge: {
    backgroundColor: '#39FF14',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
  },
  discountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  backupCodeContainer: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#F59E0B',
    width: '100%',
    maxWidth: 320,
  },
  backupCodeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 2,
  },
  backupCodeValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#78350F',
    letterSpacing: 3,
  },
  backupCodeHint: {
    fontSize: 10,
    color: '#B45309',
    marginTop: 4,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  priceDetailsContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  priceDetailsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: '#CBD5E1',
    flexShrink: 1,
  },
  priceLabelBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A7F3D0',
    flexShrink: 1,
  },
  priceValueStrike: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    textDecorationLine: 'line-through',
  },
  priceValueWhite: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  priceValueRed: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  priceValueGreen: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  hint: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
});

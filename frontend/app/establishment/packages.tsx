import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';

const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
    onOk?.();
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
  }
};

const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  if (typeof window !== 'undefined') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: onConfirm },
    ]);
  }
};

const PRICE_PER_TOKEN = 2.0;

const PACKAGES = [
  { size: 50, label: 'Starter', icon: 'flash-outline' as const, color: '#3B82F6' },
  { size: 100, label: 'Popular', icon: 'flash' as const, color: '#F59E0B', popular: true },
  { size: 150, label: 'Premium', icon: 'diamond' as const, color: '#8B5CF6' },
];

export default function PackagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [tokenInfo, setTokenInfo] = useState({ total_balance: 0, allocated: 0, consumed: 0, available: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [pkgs, tokens] = await Promise.all([
        api.getMyPackages().catch(() => []),
        api.getTokenBalance().catch(() => ({ total_balance: 0, allocated: 0, consumed: 0, available: 0 })),
      ]);
      setPackages(pkgs);
      setTokenInfo(tokens);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handlePurchase = (size: number) => {
    const total = (size * PRICE_PER_TOKEN).toFixed(2).replace('.', ',');
    showConfirm(
      'Confirmar Compra',
      `Deseja comprar ${size} tokens por R$ ${total}?\n\nCada token permite validar 1 QR Code.`,
      async () => {
        setPurchasing(size);
        try {
          await api.purchasePackage(size);
          await loadData();
          showAlert('Compra realizada!', `${size} tokens adicionados ao seu saldo.`);
        } catch (error: any) {
          showAlert('Erro', error.message || 'Falha ao comprar pacote');
        } finally {
          setPurchasing(null);
        }
      }
    );
  };

  const handleCustomPurchase = () => {
    const amount = parseInt(customAmount);
    if (!amount || amount < 10) {
      showAlert('Atenção', 'Informe uma quantidade mínima de 10 tokens.');
      return;
    }
    if (amount > 1000) {
      showAlert('Atenção', 'Quantidade máxima por compra: 1000 tokens.');
      return;
    }
    handlePurchase(amount);
  };

  if (isLoading) {
    return (
      <View style={[s.container, s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" colors={['#F59E0B']} />}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} data-testid="packages-back-btn">
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Comprar Tokens</Text>
            <Text style={s.headerSub}>Aumente seu saldo para validar vendas</Text>
          </View>
        </View>

        {/* Current Balance Card */}
        <View style={s.balanceCard} data-testid="token-balance-card">
          <View style={s.balanceRow}>
            <View style={s.balanceLeft}>
              <Ionicons name="flash" size={28} color="#F59E0B" />
              <View>
                <Text style={s.balanceLabel}>Saldo Atual</Text>
                <Text style={s.balanceValue}>{tokenInfo.available} <Text style={s.balanceUnit}>tokens disponíveis</Text></Text>
              </View>
            </View>
          </View>
          <View style={s.balanceStats}>
            <View style={s.balanceStat}>
              <Text style={s.balanceStatValue}>{tokenInfo.total_balance}</Text>
              <Text style={s.balanceStatLabel}>Total</Text>
            </View>
            <View style={s.balanceStatDivider} />
            <View style={s.balanceStat}>
              <Text style={s.balanceStatValue}>{tokenInfo.allocated}</Text>
              <Text style={s.balanceStatLabel}>Alocados</Text>
            </View>
            <View style={s.balanceStatDivider} />
            <View style={s.balanceStat}>
              <Text style={s.balanceStatValue}>{tokenInfo.consumed}</Text>
              <Text style={s.balanceStatLabel}>Consumidos</Text>
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={s.infoCard}>
          <Ionicons name="information-circle" size={20} color="#60A5FA" />
          <Text style={s.infoText}>
            Cada QR Code validado consome 1 token (R$ 2,00). Tokens não utilizados ficam no seu saldo.
          </Text>
        </View>

        {/* Package Cards */}
        <Text style={s.sectionTitle}>Pacotes</Text>
        <View style={s.packagesGrid}>
          {PACKAGES.map(pkg => (
            <TouchableOpacity
              key={pkg.size}
              style={[s.packageCard, pkg.popular && s.packageCardPopular]}
              onPress={() => handlePurchase(pkg.size)}
              disabled={purchasing !== null}
              activeOpacity={0.7}
              data-testid={`package-${pkg.size}-btn`}
            >
              {pkg.popular && (
                <View style={s.popularBadge}>
                  <Text style={s.popularText}>MAIS POPULAR</Text>
                </View>
              )}
              <Ionicons name={pkg.icon} size={28} color={pkg.color} />
              <Text style={s.packageLabel}>{pkg.label}</Text>
              <Text style={s.packageSize}>{pkg.size}</Text>
              <Text style={s.packageUnit}>tokens</Text>
              <View style={s.packageDivider} />
              <Text style={s.packagePrice}>
                R$ {(pkg.size * PRICE_PER_TOKEN).toFixed(2).replace('.', ',')}
              </Text>
              <Text style={s.packagePerUnit}>R$ 2,00 por token</Text>
              {purchasing === pkg.size ? (
                <ActivityIndicator color={pkg.color} style={{ marginTop: 12 }} />
              ) : (
                <View style={[s.buyBtn, { backgroundColor: pkg.color }]}>
                  <Ionicons name="bag-add" size={16} color="#0D1B2A" />
                  <Text style={s.buyBtnText}>Comprar</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Amount */}
        <View style={s.customSection}>
          <Text style={s.sectionTitle}>Quantidade Personalizada</Text>
          <Text style={s.customDesc}>Mínimo 10 tokens, máximo 1.000 por compra.</Text>
          <View style={s.customRow}>
            <TextInput
              style={s.customInput}
              placeholder="Ex: 75"
              placeholderTextColor="#64748B"
              value={customAmount}
              onChangeText={v => setCustomAmount(v.replace(/\D/g, ''))}
              keyboardType="numeric"
              data-testid="custom-token-input"
            />
            <TouchableOpacity
              style={[s.customBtn, (!customAmount || purchasing !== null) && s.customBtnDisabled]}
              onPress={handleCustomPurchase}
              disabled={!customAmount || purchasing !== null}
              data-testid="custom-purchase-btn"
            >
              {purchasing && purchasing !== 50 && purchasing !== 100 && purchasing !== 150 ? (
                <ActivityIndicator size="small" color="#0D1B2A" />
              ) : (
                <>
                  <Ionicons name="bag-add" size={16} color="#0D1B2A" />
                  <Text style={s.customBtnText}>
                    {customAmount ? `Comprar R$ ${(parseInt(customAmount || '0') * PRICE_PER_TOKEN).toFixed(2).replace('.', ',')}` : 'Comprar'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Purchase History */}
        <View style={s.historySection}>
          <Text style={s.sectionTitle}>Histórico de Compras</Text>
          {packages.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="receipt-outline" size={40} color="#1E3A5F" />
              <Text style={s.emptyText}>Nenhuma compra realizada</Text>
            </View>
          ) : (
            packages.map((pkg: any) => (
              <View key={pkg.package_id} style={s.historyItem} data-testid={`history-${pkg.package_id}`}>
                <View style={s.historyIcon}>
                  <Ionicons name="flash" size={18} color="#F59E0B" />
                </View>
                <View style={s.historyContent}>
                  <Text style={s.historyTitle}>{pkg.size} tokens</Text>
                  <Text style={s.historyDate}>
                    {new Date(pkg.created_at).toLocaleDateString('pt-BR')} · R$ {(pkg.total_price || pkg.size * 2).toFixed(2).replace('.', ',')}
                  </Text>
                </View>
                <View style={s.historyBadge}>
                  <Text style={s.historyBadgeText}>{pkg.status === 'active' ? 'Ativo' : pkg.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A' },
  centered: { justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  headerSub: { fontSize: 13, color: '#64748B' },

  balanceCard: { marginHorizontal: 20, backgroundColor: '#132A43', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#F59E0B33' },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  balanceLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  balanceLabel: { fontSize: 12, color: '#94A3B8' },
  balanceValue: { fontSize: 22, fontWeight: '800', color: '#F59E0B' },
  balanceUnit: { fontSize: 13, fontWeight: '500', color: '#94A3B8' },
  balanceStats: { flexDirection: 'row', backgroundColor: '#0D1B2A', borderRadius: 10, padding: 12 },
  balanceStat: { flex: 1, alignItems: 'center' },
  balanceStatValue: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  balanceStatLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  balanceStatDivider: { width: 1, backgroundColor: '#1E3A5F', marginHorizontal: 8 },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 20, marginTop: 16, backgroundColor: '#1E3A5F', padding: 14, borderRadius: 10 },
  infoText: { flex: 1, fontSize: 13, color: '#93C5FD', lineHeight: 18 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', paddingHorizontal: 20, marginTop: 24, marginBottom: 12 },

  packagesGrid: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  packageCard: { flex: 1, backgroundColor: '#132A43', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1E3A5F' },
  packageCardPopular: { borderColor: '#F59E0B', borderWidth: 2 },
  popularBadge: { backgroundColor: '#78350F', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  popularText: { fontSize: 9, fontWeight: '800', color: '#FCD34D', letterSpacing: 0.5 },
  packageLabel: { fontSize: 11, color: '#94A3B8', marginTop: 6, fontWeight: '600' },
  packageSize: { fontSize: 32, fontWeight: '800', color: '#FFF', marginTop: 2 },
  packageUnit: { fontSize: 12, color: '#64748B' },
  packageDivider: { width: '80%', height: 1, backgroundColor: '#1E3A5F', marginVertical: 10 },
  packagePrice: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  packagePerUnit: { fontSize: 10, color: '#64748B', marginTop: 2 },
  buyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginTop: 12, width: '100%' },
  buyBtnText: { fontSize: 13, fontWeight: '700', color: '#0D1B2A' },

  customSection: { paddingHorizontal: 20 },
  customDesc: { fontSize: 12, color: '#64748B', marginBottom: 10, paddingHorizontal: 20 },
  customRow: { flexDirection: 'row', gap: 10 },
  customInput: { flex: 1, backgroundColor: '#132A43', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#FFF', borderWidth: 1, borderColor: '#1E3A5F' },
  customBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#F59E0B', paddingHorizontal: 16, borderRadius: 10, minWidth: 120 },
  customBtnDisabled: { backgroundColor: '#1E3A5F', opacity: 0.6 },
  customBtnText: { fontSize: 13, fontWeight: '700', color: '#0D1B2A' },

  historySection: { paddingHorizontal: 0, marginTop: 8 },
  historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#132A43', padding: 14, marginHorizontal: 20, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#1E3A5F' },
  historyIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#78350F', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  historyContent: { flex: 1 },
  historyTitle: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  historyDate: { fontSize: 12, color: '#64748B', marginTop: 2 },
  historyBadge: { backgroundColor: '#064E3B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  historyBadgeText: { fontSize: 11, fontWeight: '600', color: '#10B981' },
  emptyState: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#132A43', marginHorizontal: 20, borderRadius: 14, borderWidth: 1, borderColor: '#1E3A5F' },
  emptyText: { fontSize: 14, color: '#64748B', marginTop: 10 },
});

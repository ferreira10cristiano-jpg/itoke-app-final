import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { api } from '../src/lib/api';

interface TokenPackage {
  config_id: string;
  title: string;
  tokens: number;
  bonus: number;
  price: number;
  active: boolean;
}

export default function BuyTokensScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuthStore();
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPkg, setSelectedPkg] = useState<TokenPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await api.getActiveTokenPackages();
      setPackages(data);
      if (data.length > 0) setSelectedPkg(data[0]);
    } catch (err) {
      console.error('Error loading packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPkg) return;
    setPurchasing(true);
    try {
      const result = await api.createCheckoutSession(selectedPkg.config_id);
      if (result.url) {
        // Redirect to Stripe Checkout
        if (typeof window !== 'undefined') {
          window.location.href = result.url;
        }
      }
    } catch (error: any) {
      const errMsg = error.message || 'Falha ao iniciar pagamento';
      if (typeof window !== 'undefined') {
        window.alert(errMsg);
      } else {
        Alert.alert('Erro', errMsg);
      }
      setPurchasing(false);
    }
  };

  const totalTokens = selectedPkg ? selectedPkg.tokens + (selectedPkg.bonus || 0) : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} data-testid="buy-tokens-back-btn">
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comprar Tokens</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Current Balance */}
      <View style={styles.balanceCard}>
        <Ionicons name="ticket" size={32} color="#10B981" />
        <Text style={styles.balanceLabel}>Saldo Atual</Text>
        <Text style={styles.balanceValue} data-testid="current-token-balance">{user?.tokens || 0} tokens</Text>
      </View>

      {/* Purchase History Link */}
      <TouchableOpacity
        style={styles.historyLink}
        onPress={() => router.push('/purchase-history')}
        activeOpacity={0.7}
        data-testid="view-purchase-history-btn"
      >
        <Ionicons name="receipt-outline" size={16} color="#94A3B8" />
        <Text style={styles.historyLinkText}>Ver historico de compras</Text>
        <Ionicons name="chevron-forward" size={14} color="#475569" />
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Carregando pacotes...</Text>
        </View>
      ) : packages.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="cube-outline" size={48} color="#475569" />
          <Text style={styles.emptyText}>Nenhum pacote disponivel no momento</Text>
          <Text style={styles.emptySubtext}>Volte mais tarde para novas ofertas!</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Escolha seu pacote</Text>
          <ScrollView style={styles.packageList} contentContainerStyle={styles.packageListContent} showsVerticalScrollIndicator={false}>
            {packages.map((pkg) => {
              const isSelected = selectedPkg?.config_id === pkg.config_id;
              const pkgTotal = pkg.tokens + (pkg.bonus || 0);
              const pricePerToken = (pkg.price / pkgTotal).toFixed(2).replace('.', ',');
              return (
                <TouchableOpacity
                  key={pkg.config_id}
                  style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                  onPress={() => setSelectedPkg(pkg)}
                  activeOpacity={0.7}
                  data-testid={`package-card-${pkg.config_id}`}
                >
                  <View style={styles.packageCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.packageTitle, isSelected && styles.packageTitleSelected]}>{pkg.title}</Text>
                      <View style={styles.tokenRow}>
                        <Ionicons name="ticket" size={16} color={isSelected ? '#10B981' : '#64748B'} />
                        <Text style={[styles.tokenCount, isSelected && styles.tokenCountSelected]}>
                          {pkg.tokens} tokens
                        </Text>
                        {pkg.bonus > 0 && (
                          <View style={styles.bonusBadge} data-testid={`bonus-badge-${pkg.config_id}`}>
                            <Text style={styles.bonusText}>+{pkg.bonus} GRATIS</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.pricePerToken}>R$ {pricePerToken} por token</Text>
                    </View>
                    <View style={styles.priceWrap}>
                      <Text style={[styles.priceValue, isSelected && styles.priceValueSelected]}>
                        R$ {pkg.price.toFixed(2).replace('.', ',')}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                      <Text style={styles.selectedText}>Selecionado</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Purchase Summary & Button */}
          <View style={[styles.bottomCTA, { paddingBottom: insets.bottom + 12 }]}>
            {selectedPkg && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total: {totalTokens} tokens</Text>
                <Text style={styles.summaryPrice}>R$ {selectedPkg.price.toFixed(2).replace('.', ',')}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.purchaseButton, (!selectedPkg || purchasing) && styles.purchaseButtonDisabled]}
              onPress={handlePurchase}
              disabled={!selectedPkg || purchasing}
              data-testid="purchase-btn"
            >
              {purchasing ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <>
                  <Ionicons name="cart" size={22} color="#0F172A" />
                  <Text style={styles.purchaseButtonText}>
                    Comprar {totalTokens} Tokens
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.disclaimerText}>
              Pagamento seguro via Stripe
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  balanceCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 4,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyLinkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#CBD5E1',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  packageList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  packageListContent: {
    paddingBottom: 160,
    gap: 10,
  },
  packageCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#334155',
  },
  packageCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#0F2A1F',
  },
  packageCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 6,
  },
  packageTitleSelected: {
    color: '#FFFFFF',
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tokenCount: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tokenCountSelected: {
    color: '#CBD5E1',
  },
  bonusBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bonusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  pricePerToken: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  priceWrap: {
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#CBD5E1',
  },
  priceValueSelected: {
    color: '#10B981',
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  selectedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
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
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10B981',
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    width: '100%',
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonText: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

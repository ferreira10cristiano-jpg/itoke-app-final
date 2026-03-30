import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/lib/api';
import { Transaction, NetworkData } from '../../src/types';
import { ShareInviteModal } from '../../src/components/ShareInviteModal';

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshUser } = useAuthStore();
  const [credits, setCredits] = useState<{ balance: number; transactions: Transaction[] } | null>(null);
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareType, setShareType] = useState<'friend' | 'establishment'>('friend');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [creditsData, network] = await Promise.all([
        api.getMyCredits(),
        api.getMyNetwork(),
      ]);
      setCredits(creditsData);
      setNetworkData(network);
      await refreshUser();
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleCopyCode = () => {
    if (networkData?.referral_code) {
      if (Platform.OS === 'web') {
        navigator.clipboard?.writeText(networkData.referral_code);
        window.alert('Codigo copiado!');
      } else {
        try {
          const Clipboard = require('react-native').Clipboard;
          Clipboard.setString(networkData.referral_code);
        } catch (e) {}
      }
    }
  };

  if (isLoading) {
    return (
      <View style={[s.root, s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const totalReferrals = networkData?.total_referrals || 0;
  const level1 = networkData?.network?.level1 || [];
  const level2 = networkData?.network?.level2 || [];
  const level3 = networkData?.network?.level3 || [];
  const balance = credits?.balance || 0;
  const transactions = credits?.transactions || [];
  const tokens = user?.tokens || 0;

  // Calculate total savings (only positive amounts = earnings)
  const totalSavings = transactions.reduce((sum, t) => sum + Math.max(0, t.amount || 0), 0);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" colors={['#10B981']} />
        }
      >
        {/* ===== HERO: SALDO DE CREDITOS ===== */}
        <View style={s.hero} data-testid="wallet-hero">
          <Text style={s.heroLabel}>Carteira</Text>
          <View style={s.heroBalanceRow}>
            <Text style={s.heroCurrency}>R$</Text>
            <Text style={s.heroBalance}>{balance.toFixed(2)}</Text>
          </View>
          <Text style={s.heroCaption}>Saldo de creditos disponivel</Text>
          <View style={s.heroSavingsRow}>
            <Ionicons name="trending-up" size={14} color="#6EE7B7" />
            <Text style={s.heroSavings}>
              Economia total com iToke: R$ {totalSavings.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* ===== TOKENS: CARD HORIZONTAL ===== */}
        <View style={s.section}>
          <View style={s.tokenCard} data-testid="wallet-tokens">
            <View style={s.tokenLeft}>
              <View style={s.tokenIcon}>
                <Ionicons name="ticket" size={18} color="#10B981" />
              </View>
              <View>
                <Text style={s.tokenTitle}>Meus Tokens</Text>
                <Text style={s.tokenSub}>Para gerar QR Codes</Text>
              </View>
            </View>
            <Text style={s.tokenCount}>{tokens}</Text>
            <TouchableOpacity
              style={s.tokenBuyBtn}
              onPress={() => router.push('/buy-tokens')}
              activeOpacity={0.7}
              data-testid="buy-tokens-btn"
            >
              <Ionicons name="add" size={16} color="#10B981" />
              <Text style={s.tokenBuyText}>Comprar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== GANHE INDICANDO ===== */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ganhe Indicando</Text>
          <View style={s.referralCard} data-testid="wallet-referral">
            <View style={s.referralBtns}>
              <TouchableOpacity
                style={s.referralBtn}
                onPress={() => { setShareType('friend'); setShareModalVisible(true); }}
                activeOpacity={0.7}
                data-testid="share-friend-btn"
              >
                <View style={s.referralBtnIcon}>
                  <Ionicons name="person-add-outline" size={18} color="#10B981" />
                </View>
                <Text style={s.referralBtnLabel}>Indicar Amigo</Text>
              </TouchableOpacity>
              <View style={s.referralDivider} />
              <TouchableOpacity
                style={s.referralBtn}
                onPress={() => { setShareType('establishment'); setShareModalVisible(true); }}
                activeOpacity={0.7}
                data-testid="share-store-btn"
              >
                <View style={s.referralBtnIcon}>
                  <Ionicons name="storefront-outline" size={18} color="#10B981" />
                </View>
                <Text style={s.referralBtnLabel}>Indicar Loja</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.codeRow} onPress={handleCopyCode} activeOpacity={0.6}>
              <Ionicons name="link-outline" size={14} color="#475569" />
              <Text style={s.codeText}>{networkData?.referral_code || '---'}</Text>
              <Ionicons name="copy-outline" size={14} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== MINHA REDE ===== */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>Minha Rede</Text>
            <Text style={s.networkBadge}>{totalReferrals} indicados</Text>
          </View>
          <View style={s.networkList} data-testid="wallet-network">
            <NetworkLevel label="Nivel 1" sub="Diretos" count={level1.length} color="#10B981" />
            <View style={s.networkSep} />
            <NetworkLevel label="Nivel 2" sub="" count={level2.length} color="#3B82F6" />
            <View style={s.networkSep} />
            <NetworkLevel label="Nivel 3" sub="" count={level3.length} color="#F59E0B" />
          </View>
        </View>

        {/* ===== HISTORICO ===== */}
        {transactions.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Historico</Text>
            <View style={s.txList}>
              {transactions.slice(0, 8).map((item, index) => (
                <View key={index} style={s.txRow}>
                  <View style={[s.txDot, item.amount < 0 && { backgroundColor: '#EF4444' }]} />
                  <View style={s.txBody}>
                    <Text style={s.txDesc} numberOfLines={1}>{item.description}</Text>
                    <Text style={s.txDate}>
                      {new Date(item.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'short',
                      })}
                    </Text>
                  </View>
                  <Text style={[s.txAmt, item.amount < 0 && { color: '#EF4444' }]}>
                    {item.amount >= 0 ? '+' : ''}R$ {item.amount.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <ShareInviteModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        referralCode={networkData?.referral_code || ''}
        userName={user?.name || ''}
        type={shareType}
      />
    </View>
  );
}

function NetworkLevel({ label, sub, count, color }: { label: string; sub: string; count: number; color: string }) {
  return (
    <View style={s.networkRow}>
      <View style={[s.networkDot, { backgroundColor: color }]} />
      <Text style={s.networkLabel}>{label}{sub ? ` — ${sub}` : ''}</Text>
      <Text style={[s.networkCount, { color }]}>{count}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0F1A',
  },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: {
    paddingBottom: 20,
  },

  /* ===== HERO ===== */
  hero: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  heroBalanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  heroCurrency: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
    marginRight: 4,
  },
  heroBalance: {
    fontSize: 42,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: -1,
  },
  heroCaption: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  heroSavingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 5,
    backgroundColor: '#10B98110',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroSavings: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6EE7B7',
  },

  /* ===== SECTIONS ===== */
  section: {
    marginTop: 28,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  networkBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    backgroundColor: '#10B98112',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },

  /* ===== TOKEN CARD ===== */
  tokenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  tokenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  tokenIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#10B98115',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  tokenSub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },
  tokenCount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#E2E8F0',
    marginRight: 14,
  },
  tokenBuyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#10B98140',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tokenBuyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },

  /* ===== REFERRAL CARD ===== */
  referralCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  referralBtns: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  referralBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  referralBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B98112',
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  referralDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#1E293B',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0D111D',
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1.5,
  },

  /* ===== NETWORK ===== */
  networkList: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingVertical: 4,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  networkLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  networkCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  networkSep: {
    height: 1,
    backgroundColor: '#1E293B',
    marginHorizontal: 18,
  },

  /* ===== TRANSACTIONS ===== */
  txList: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingVertical: 4,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  txDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 12,
  },
  txBody: {
    flex: 1,
  },
  txDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: '#CBD5E1',
  },
  txDate: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  txAmt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
});

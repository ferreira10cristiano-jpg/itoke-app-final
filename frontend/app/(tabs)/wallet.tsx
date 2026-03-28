import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
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
      } else {
        try {
          const Clipboard = require('react-native').Clipboard;
          Clipboard.setString(networkData.referral_code);
        } catch (e) {}
      }
      Alert.alert('Copiado!', 'Código copiado para a área de transferência');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>  
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Carteira</Text>
        <TouchableOpacity
          style={styles.headerTokenBadge}
          onPress={() => router.push('/buy-tokens')}
          activeOpacity={0.7}
        >
          <Ionicons name="ticket" size={14} color="#10B981" />
          <Text style={styles.headerTokenLabel}>Tokens</Text>
          <Text style={styles.headerTokenValue}>{tokens}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10B981"
            colors={['#10B981']}
          />
        }
      >
        {/* ===== HERO TEXT ===== */}
        <View style={styles.heroCard}>
          <Ionicons name="sparkles" size={28} color="#10B981" />
          <Text style={styles.heroTitle}>
            Transforme suas indicações{'\n'}em recompensas reais!
          </Text>
          <Text style={styles.heroSubtitle}>
            Indique o iToke e ganhe créditos a cada compra dos seus indicados.
          </Text>
        </View>

        {/* ===== MEUS TOKENS (Ativos) ===== */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ATIVOS</Text>
          <View style={styles.tokensCard}>
            <View style={styles.tokensCardLeft}>
              <View style={styles.tokensIconCircle}>
                <Ionicons name="ticket" size={22} color="#0F172A" />
              </View>
              <View>
                <Text style={styles.tokensTitle}>Meus Tokens</Text>
                <Text style={styles.tokensHint}>Use para gerar QR Codes de desconto</Text>
              </View>
            </View>
            <Text style={styles.tokensValue}>{tokens}</Text>
          </View>
          <TouchableOpacity
            style={styles.buyTokensButton}
            onPress={() => router.push('/buy-tokens')}
            activeOpacity={0.8}
          >
            <Ionicons name="cart" size={18} color="#0F172A" />
            <Text style={styles.buyTokensText}>Comprar Tokens</Text>
            <Text style={styles.buyTokensPrice}>7 por R$ 7,00</Text>
          </TouchableOpacity>
        </View>

        {/* ===== MEUS CRÉDITOS (Ganhos) ===== */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>GANHOS POR INDICAÇÃO</Text>
          <View style={styles.creditsCard}>
            <Text style={styles.creditsLabel}>Saldo de Créditos</Text>
            <Text style={styles.creditsValue}>R$ {balance.toFixed(2)}</Text>
            <Text style={styles.creditsHint}>
              Ganhe R$ 1,00 por pacote comprado pelos seus indicados
            </Text>
          </View>
        </View>

        {/* ===== RESUMO DA REDE ===== */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MINHA REDE</Text>
          
          <View style={styles.networkTotal}>
            <Ionicons name="people" size={22} color="#10B981" />
            <Text style={styles.networkTotalLabel}>Total de Amigos Indicados</Text>
            <Text style={styles.networkTotalValue}>{totalReferrals}</Text>
          </View>

          {/* Levels */}
          <View style={styles.levelsContainer}>
            <LevelRow level={1} color="#10B981" label="Nível 1 — Diretos" users={level1} />
            <LevelRow level={2} color="#3B82F6" label="Nível 2" users={level2} />
            <LevelRow level={3} color="#F59E0B" label="Nível 3" users={level3} />
          </View>
        </View>

        {/* ===== HISTÓRICO DE COMISSÕES ===== */}
        {transactions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>HISTÓRICO DE COMISSÕES</Text>
            {transactions.slice(0, 10).map((item, index) => (
              <View key={index} style={styles.txItem}>
                <View style={styles.txIcon}>
                  <Ionicons name="trending-up" size={16} color="#10B981" />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txDesc}>{item.description}</Text>
                  <Text style={styles.txDate}>
                    {new Date(item.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Text style={styles.txAmount}>+R$ {item.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ===== CÓDIGO DE INDICAÇÃO + COMPARTILHAR ===== */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>INDIQUE E GANHE</Text>
          
          <TouchableOpacity style={styles.codeBox} onPress={handleCopyCode} activeOpacity={0.7}>
            <View style={styles.codeLeft}>
              <Ionicons name="gift" size={20} color="#10B981" />
              <Text style={styles.codeLabel}>Seu Código</Text>
            </View>
            <Text style={styles.codeValue}>{networkData?.referral_code || '---'}</Text>
            <Ionicons name="copy-outline" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.shareRow}>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={() => { setShareType('friend'); setShareModalVisible(true); }}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add" size={16} color="#0F172A" />
              <Text style={styles.shareBtnText}>Indicar Amigo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareBtn, styles.shareBtnBlue]}
              onPress={() => { setShareType('establishment'); setShareModalVisible(true); }}
              activeOpacity={0.8}
            >
              <Ionicons name="business" size={16} color="#FFF" />
              <Text style={[styles.shareBtnText, { color: '#FFF' }]}>Indicar Loja</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <ShareInviteModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        referralCode={networkData?.referral_code || ''}
        userName={user?.name || ''}
        isFriend={shareType === 'friend'}
      />
    </View>
  );
}

function LevelRow({ level, color, label, users }: { level: number; color: string; label: string; users: any[] }) {
  return (
    <View style={styles.levelRow}>
      <View style={[styles.levelDot, { backgroundColor: color }]} />
      <View style={styles.levelInfo}>
        <Text style={styles.levelLabel}>{label}</Text>
        <Text style={styles.levelCount}>{users.length} pessoa{users.length !== 1 ? 's' : ''}</Text>
      </View>
      {users.slice(0, 3).map((u, i) => (
        <View key={i} style={styles.userChip}>
          <Text style={styles.userChipText}>{u.name?.split(' ')[0]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#FFF' },
  headerTokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  headerTokenLabel: { fontSize: 11, fontWeight: '600', color: '#6EE7B7' },
  headerTokenValue: { fontSize: 15, fontWeight: '800', color: '#10B981' },

  // Hero
  heroCard: {
    marginHorizontal: 20,
    backgroundColor: '#064E3B',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#6EE7B7',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  // Section
  section: { marginTop: 20, marginHorizontal: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 10,
  },

  // Tokens Card
  tokensCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tokensCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  tokensIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokensTitle: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  tokensHint: { fontSize: 11, color: '#64748B', marginTop: 2 },
  tokensValue: { fontSize: 32, fontWeight: '800', color: '#10B981' },

  // Buy Button
  buyTokensButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 10,
    gap: 8,
  },
  buyTokensText: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  buyTokensPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#064E3B',
    backgroundColor: '#6EE7B7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },

  // Credits Card
  creditsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  creditsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  creditsValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 4,
  },
  creditsHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },

  // Network
  networkTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  networkTotalLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#CBD5E1' },
  networkTotalValue: { fontSize: 22, fontWeight: '800', color: '#10B981' },

  levelsContainer: { marginTop: 8, gap: 6 },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  levelDot: { width: 10, height: 10, borderRadius: 5 },
  levelInfo: { flex: 1 },
  levelLabel: { fontSize: 13, fontWeight: '600', color: '#E2E8F0' },
  levelCount: { fontSize: 11, color: '#64748B', marginTop: 1 },
  userChip: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  userChipText: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },

  // Transactions
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#064E3B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 13, fontWeight: '600', color: '#E2E8F0' },
  txDate: { fontSize: 10, color: '#64748B', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700', color: '#10B981' },

  // Referral Code
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },
  codeLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  codeLabel: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  codeValue: { fontSize: 16, fontWeight: '800', color: '#10B981', letterSpacing: 1.5 },

  // Share
  shareRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 13,
    borderRadius: 10,
  },
  shareBtnBlue: { backgroundColor: '#3B82F6' },
  shareBtnText: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
});

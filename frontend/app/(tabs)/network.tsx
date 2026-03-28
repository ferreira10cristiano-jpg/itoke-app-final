import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/lib/api';
import { NetworkData, Transaction } from '../../src/types';
import { ShareInviteModal } from '../../src/components/ShareInviteModal';

export default function NetworkScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareType, setShareType] = useState<'friend' | 'establishment'>('friend');

  useEffect(() => {
    loadNetwork();
  }, []);

  const loadNetwork = async () => {
    try {
      const data = await api.getMyNetwork();
      setNetworkData(data);
    } catch (error) {
      console.error('Error loading network:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNetwork();
    setRefreshing(false);
  }, []);

  const handleShareFriend = () => {
    setShareType('friend');
    setShareModalVisible(true);
  };

  const handleShareEstablishment = () => {
    setShareType('establishment');
    setShareModalVisible(true);
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionIcon}>
        <Ionicons
          name={item.type === 'purchase_commission' ? 'cart' : item.type === 'establishment_referral' ? 'business' : 'gift'}
          size={20}
          color="#10B981"
        />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDesc}>{item.description}</Text>
        <Text style={styles.transactionDate}>
          {new Date(item.created_at).toLocaleDateString('pt-BR')}
        </Text>
      </View>
      <Text style={styles.transactionAmount}>+R$ {item.amount.toFixed(2)}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Minha Rede</Text>
      </View>

      <FlatList
        data={[{ type: 'content' }]}
        renderItem={() => (
          <View>
            {/* Share Buttons */}
            <View style={styles.shareSection}>
              <Text style={styles.shareSectionTitle}>Convide e Ganhe!</Text>
              <View style={styles.shareCards}>
                <TouchableOpacity style={styles.shareCard} onPress={handleShareFriend} activeOpacity={0.8}>
                  <View style={[styles.shareCardIcon, { backgroundColor: '#10B98120' }]}>
                    <Ionicons name="person-add" size={28} color="#10B981" />
                  </View>
                  <Text style={styles.shareCardTitle}>Indicar Amigo</Text>
                  <Text style={styles.shareCardDesc}>Ganhe R$1 por compra{'\n'}em 3 níveis</Text>
                  <View style={styles.shareCardButton}>
                    <Ionicons name="share-social" size={16} color="#0F172A" />
                    <Text style={styles.shareCardButtonText}>Compartilhar</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.shareCard} onPress={handleShareEstablishment} activeOpacity={0.8}>
                  <View style={[styles.shareCardIcon, { backgroundColor: '#3B82F620' }]}>
                    <Ionicons name="business" size={28} color="#3B82F6" />
                  </View>
                  <Text style={[styles.shareCardTitle, { color: '#3B82F6' }]}>Indicar Loja</Text>
                  <Text style={styles.shareCardDesc}>Ganhe R$1 por venda{'\n'}por 12 meses</Text>
                  <View style={[styles.shareCardButton, { backgroundColor: '#3B82F6' }]}>
                    <Ionicons name="share-social" size={16} color="#FFFFFF" />
                    <Text style={[styles.shareCardButtonText, { color: '#FFFFFF' }]}>Compartilhar</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Referral Code Card */}
            <View style={styles.referralCard}>
              <View style={styles.referralHeader}>
                <Ionicons name="ticket" size={22} color="#10B981" />
                <Text style={styles.referralTitle}>Seu Código de Indicação</Text>
              </View>
              <Text style={styles.referralCode}>{networkData?.referral_code || '---'}</Text>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="people" size={28} color="#10B981" />
                <Text style={styles.statValue}>{networkData?.total_referrals || 0}</Text>
                <Text style={styles.statLabel}>Indicados</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="cash" size={28} color="#10B981" />
                <Text style={styles.statValue}>R$ {(networkData?.total_earned || 0).toFixed(2)}</Text>
                <Text style={styles.statLabel}>Total Ganho</Text>
              </View>
            </View>

            {/* Network Levels */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sua Rede</Text>
              
              <View style={styles.levelCard}>
                <View style={styles.levelHeader}>
                  <View style={[styles.levelBadge, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.levelNumber}>1</Text>
                  </View>
                  <Text style={styles.levelTitle}>Nível 1 - Indicações Diretas</Text>
                  <Text style={styles.levelCount}>{networkData?.network.level1.length || 0}</Text>
                </View>
                {networkData?.network.level1.slice(0, 5).map((u, index) => (
                  <View key={index} style={styles.userRow}>
                    <Ionicons name="person-circle" size={32} color="#475569" />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{u.name}</Text>
                      <Text style={styles.userEmail}>{u.email}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.levelCard}>
                <View style={styles.levelHeader}>
                  <View style={[styles.levelBadge, { backgroundColor: '#3B82F6' }]}>
                    <Text style={styles.levelNumber}>2</Text>
                  </View>
                  <Text style={styles.levelTitle}>Nível 2</Text>
                  <Text style={styles.levelCount}>{networkData?.network.level2.length || 0}</Text>
                </View>
                {networkData?.network.level2.slice(0, 3).map((u, index) => (
                  <View key={index} style={styles.userRow}>
                    <Ionicons name="person-circle" size={32} color="#475569" />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{u.name}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.levelCard}>
                <View style={styles.levelHeader}>
                  <View style={[styles.levelBadge, { backgroundColor: '#F59E0B' }]}>
                    <Text style={styles.levelNumber}>3</Text>
                  </View>
                  <Text style={styles.levelTitle}>Nível 3</Text>
                  <Text style={styles.levelCount}>{networkData?.network.level3.length || 0}</Text>
                </View>
              </View>
            </View>

            {/* Transactions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Extrato de Ganhos</Text>
              {!networkData?.transactions || networkData.transactions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="receipt-outline" size={48} color="#475569" />
                  <Text style={styles.emptyText}>Nenhuma comissão recebida ainda</Text>
                  <Text style={styles.emptyHint}>Indique amigos para começar a ganhar!</Text>
                </View>
              ) : (
                networkData.transactions.map((transaction) => (
                  <View key={transaction.transaction_id}>
                    {renderTransactionItem({ item: transaction })}
                  </View>
                ))
              )}
            </View>
          </View>
        )}
        keyExtractor={() => 'content'}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <ShareInviteModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        type={shareType}
        userName={user?.name || ''}
        referralCode={networkData?.referral_code || user?.referral_code || '---'}
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 20,
  },
  shareSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  shareSectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 12,
  },
  shareCards: {
    flexDirection: 'row',
    gap: 12,
  },
  shareCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  shareCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  shareCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  shareCardDesc: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  shareCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  shareCardButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  referralCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  referralTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  referralCode: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  levelCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  levelNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  levelTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#E2E8F0',
  },
  levelCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginLeft: 40,
    gap: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#064E3B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E2E8F0',
  },
  transactionDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
});

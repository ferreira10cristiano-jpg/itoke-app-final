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
import { Transaction, NetworkData } from '../../src/types';
import { ShareInviteModal } from '../../src/components/ShareInviteModal';

export default function CreditsScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuthStore();
  const [credits, setCredits] = useState<{ balance: number; transactions: Transaction[] } | null>(null);
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareType, setShareType] = useState<'friend' | 'establishment'>('friend');

  useEffect(() => {
    loadCredits();
  }, []);

  const loadCredits = async () => {
    try {
      const [creditsData, network] = await Promise.all([
        api.getMyCredits(),
        api.getMyNetwork(),
      ]);
      setCredits(creditsData);
      setNetworkData(network);
    } catch (error) {
      console.error('Error loading credits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCredits();
    await refreshUser();
    setRefreshing(false);
  }, [refreshUser]);

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
          {new Date(item.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
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
        <Text style={styles.title}>Meus Créditos</Text>
      </View>

      <FlatList
        data={[{ type: 'content' }]}
        renderItem={() => (
          <View>
            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <Ionicons name="wallet" size={40} color="#10B981" />
              <Text style={styles.balanceLabel}>Saldo Disponível</Text>
              <Text style={styles.balanceValue}>
                R$ {(credits?.balance || user?.credits || 0).toFixed(2)}
              </Text>
              <Text style={styles.balanceHint}>
                Use seus créditos para abater compras nos estabelecimentos parceiros
              </Text>
            </View>

            {/* Share Cards - Now Clickable! */}
            <View style={styles.infoCards}>
              <TouchableOpacity
                style={styles.infoCard}
                onPress={handleShareFriend}
                activeOpacity={0.8}
              >
                <View style={[styles.infoIconCircle, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="person-add" size={24} color="#10B981" />
                </View>
                <Text style={styles.infoTitle}>Indique Amigos</Text>
                <Text style={styles.infoText}>Ganhe R$1 por cada compra deles</Text>
                <View style={styles.infoButton}>
                  <Ionicons name="share-social" size={14} color="#0F172A" />
                  <Text style={styles.infoButtonText}>Indicar</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.infoCard}
                onPress={handleShareEstablishment}
                activeOpacity={0.8}
              >
                <View style={[styles.infoIconCircle, { backgroundColor: '#3B82F620' }]}>
                  <Ionicons name="business" size={24} color="#3B82F6" />
                </View>
                <Text style={[styles.infoTitle, { color: '#3B82F6' }]}>Indique Lojas</Text>
                <Text style={styles.infoText}>Ganhe R$1 por venda por 12 meses</Text>
                <View style={[styles.infoButton, { backgroundColor: '#3B82F6' }]}>
                  <Ionicons name="share-social" size={14} color="#FFFFFF" />
                  <Text style={[styles.infoButtonText, { color: '#FFFFFF' }]}>Indicar</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* How It Works */}
            <View style={styles.howItWorks}>
              <Text style={styles.howTitle}>Como Ganhar Créditos</Text>
              <View style={styles.howStep}>
                <View style={styles.howStepNumber}>
                  <Text style={styles.howStepNumberText}>1</Text>
                </View>
                <View style={styles.howStepContent}>
                  <Text style={styles.howStepTitle}>Indique amigos ou lojas</Text>
                  <Text style={styles.howStepDesc}>Compartilhe seu link exclusivo</Text>
                </View>
              </View>
              <View style={styles.howStep}>
                <View style={styles.howStepNumber}>
                  <Text style={styles.howStepNumberText}>2</Text>
                </View>
                <View style={styles.howStepContent}>
                  <Text style={styles.howStepTitle}>Eles se cadastram pelo link</Text>
                  <Text style={styles.howStepDesc}>Seu código é aplicado automaticamente</Text>
                </View>
              </View>
              <View style={styles.howStep}>
                <View style={styles.howStepNumber}>
                  <Text style={styles.howStepNumberText}>3</Text>
                </View>
                <View style={styles.howStepContent}>
                  <Text style={styles.howStepTitle}>Ganhe créditos a cada compra deles</Text>
                  <Text style={styles.howStepDesc}>R$1 por compra em 3 níveis de indicação</Text>
                </View>
              </View>
            </View>

            {/* Transactions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Histórico de Créditos</Text>
            </View>

            {!credits?.transactions || credits.transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={64} color="#475569" />
                <Text style={styles.emptyTitle}>Nenhum crédito ainda</Text>
                <Text style={styles.emptyText}>
                  Indique amigos e estabelecimentos para começar a ganhar!
                </Text>
                <TouchableOpacity style={styles.emptyButton} onPress={handleShareFriend}>
                  <Ionicons name="share-social" size={18} color="#0F172A" />
                  <Text style={styles.emptyButtonText}>Indicar Agora</Text>
                </TouchableOpacity>
              </View>
            ) : (
              credits.transactions.map((transaction) => (
                <View key={transaction.transaction_id} style={styles.transactionWrapper}>
                  {renderTransactionItem({ item: transaction })}
                </View>
              ))
            )}
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
  balanceCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
  },
  balanceValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 4,
  },
  balanceHint: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  infoCards: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 10,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 4,
  },
  infoButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  howItWorks: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  howTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  howStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  howStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  howStepNumberText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  howStepContent: {
    flex: 1,
  },
  howStepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  howStepDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  transactionWrapper: {
    paddingHorizontal: 20,
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
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    marginTop: 20,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
});

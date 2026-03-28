import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'commissions' | 'users'>('overview');

  const handleLogout = () => {
    // For web, use confirm dialog
    if (typeof window !== 'undefined') {
      if (window.confirm('Tem certeza que deseja sair?')) {
        logout().then(() => {
          window.location.href = '/';
        });
      }
    } else {
      Alert.alert(
        'Sair',
        'Tem certeza que deseja sair?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sair',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/');
            },
          },
        ]
      );
    }
  };

  // Mock data para demonstração
  const platformStats = {
    totalUsers: 1547,
    totalEstablishments: 89,
    totalRepresentatives: 23,
    totalOffers: 342,
    totalSales: 5678,
    totalCommissionsPaid: 15420.00,
    monthlyRevenue: 28500.00,
    activeQRCodes: 234,
  };

  const recentCommissions = [
    { id: 1, user: 'João Silva', type: 'purchase_commission', amount: 3.00, level: 'Nível 1-3' },
    { id: 2, user: 'Maria Santos', type: 'establishment_referral', amount: 1.00, level: 'Indicação' },
    { id: 3, user: 'Pedro Oliveira', type: 'token_package_commission', amount: 3.00, level: 'Nível 1-3' },
    { id: 4, user: 'Ana Costa', type: 'purchase_commission', amount: 2.00, level: 'Nível 1-2' },
    { id: 5, user: 'Carlos Lima', type: 'establishment_referral', amount: 1.00, level: 'Indicação' },
  ];

  const topEstablishments = [
    { id: 1, name: 'Pizzaria Napoli', sales: 145, revenue: 290.00 },
    { id: 2, name: 'Salão Beleza Pura', sales: 98, revenue: 196.00 },
    { id: 3, name: 'Academia FitLife', sales: 76, revenue: 152.00 },
  ];

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin iToke</Text>
          <Text style={styles.subtitle}>Painel de Controle</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Visão Geral</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'commissions' && styles.tabActive]}
          onPress={() => setActiveTab('commissions')}
        >
          <Text style={[styles.tabText, activeTab === 'commissions' && styles.tabTextActive]}>Comissões</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>Usuários</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' && (
        <>
          {/* Revenue Card */}
          <View style={styles.revenueCard}>
            <View style={styles.revenueHeader}>
              <Ionicons name="trending-up" size={32} color="#8B5CF6" />
              <View style={styles.revenueInfo}>
                <Text style={styles.revenueLabel}>Receita do Mês</Text>
                <Text style={styles.revenueValue}>R$ {platformStats.monthlyRevenue.toFixed(2)}</Text>
              </View>
            </View>
            <View style={styles.revenueFooter}>
              <Text style={styles.paidLabel}>Comissões Pagas:</Text>
              <Text style={styles.paidValue}>R$ {platformStats.totalCommissionsPaid.toFixed(2)}</Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={24} color="#3B82F6" />
              <Text style={styles.statValue}>{platformStats.totalUsers}</Text>
              <Text style={styles.statLabel}>Usuários</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="business" size={24} color="#10B981" />
              <Text style={styles.statValue}>{platformStats.totalEstablishments}</Text>
              <Text style={styles.statLabel}>Estabelecimentos</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="briefcase" size={24} color="#F59E0B" />
              <Text style={styles.statValue}>{platformStats.totalRepresentatives}</Text>
              <Text style={styles.statLabel}>Representantes</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cart" size={24} color="#EF4444" />
              <Text style={styles.statValue}>{platformStats.totalSales}</Text>
              <Text style={styles.statLabel}>Vendas</Text>
            </View>
          </View>

          {/* Top Establishments */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Estabelecimentos</Text>
            {topEstablishments.map((est, index) => (
              <View key={est.id} style={styles.topCard}>
                <View style={[styles.rankBadge, index === 0 && styles.rankFirst]}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.topInfo}>
                  <Text style={styles.topName}>{est.name}</Text>
                  <Text style={styles.topSales}>{est.sales} vendas</Text>
                </View>
                <Text style={styles.topRevenue}>R$ {est.revenue.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {activeTab === 'commissions' && (
        <View style={styles.section}>
          <View style={styles.commissionHeader}>
            <Text style={styles.sectionTitle}>Lógica de Comissões</Text>
          </View>

          {/* Commission Rules */}
          <View style={styles.ruleCard}>
            <View style={styles.ruleIcon}>
              <Ionicons name="people" size={24} color="#3B82F6" />
            </View>
            <View style={styles.ruleContent}>
              <Text style={styles.ruleTitle}>Comissão por Compra</Text>
              <Text style={styles.ruleDesc}>R$1 por nível (até 3 níveis)</Text>
              <Text style={styles.ruleExample}>Usuário A indica B, B indica C, C compra = A, B, C ganham R$1 cada</Text>
            </View>
          </View>

          <View style={styles.ruleCard}>
            <View style={styles.ruleIcon}>
              <Ionicons name="business" size={24} color="#10B981" />
            </View>
            <View style={styles.ruleContent}>
              <Text style={styles.ruleTitle}>Comissão Estabelecimento</Text>
              <Text style={styles.ruleDesc}>R$1 por venda durante 12 meses</Text>
              <Text style={styles.ruleExample}>Usuário indica loja = ganha R$1 em cada venda da loja</Text>
            </View>
          </View>

          <View style={styles.ruleCard}>
            <View style={styles.ruleIcon}>
              <Ionicons name="gift" size={24} color="#F59E0B" />
            </View>
            <View style={styles.ruleContent}>
              <Text style={styles.ruleTitle}>Comissão Pacotes</Text>
              <Text style={styles.ruleDesc}>R$1 por nível na compra de pacotes</Text>
              <Text style={styles.ruleExample}>Estabelecimento compra pacote = 3 níveis ganham</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Transações Recentes</Text>
          {recentCommissions.map((comm) => (
            <View key={comm.id} style={styles.transactionCard}>
              <View style={styles.transactionIcon}>
                <Ionicons
                  name={comm.type === 'establishment_referral' ? 'business' : 'gift'}
                  size={20}
                  color="#10B981"
                />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionUser}>{comm.user}</Text>
                <Text style={styles.transactionLevel}>{comm.level}</Text>
              </View>
              <Text style={styles.transactionAmount}>+R$ {comm.amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      {activeTab === 'users' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gestão de Usuários</Text>

          <View style={styles.userStatsGrid}>
            <View style={[styles.userStatCard, { borderColor: '#3B82F6' }]}>
              <Ionicons name="person" size={32} color="#3B82F6" />
              <Text style={styles.userStatValue}>{platformStats.totalUsers - platformStats.totalEstablishments - platformStats.totalRepresentatives}</Text>
              <Text style={styles.userStatLabel}>Clientes</Text>
            </View>
            <View style={[styles.userStatCard, { borderColor: '#10B981' }]}>
              <Ionicons name="business" size={32} color="#10B981" />
              <Text style={styles.userStatValue}>{platformStats.totalEstablishments}</Text>
              <Text style={styles.userStatLabel}>Estabelecimentos</Text>
            </View>
            <View style={[styles.userStatCard, { borderColor: '#F59E0B' }]}>
              <Ionicons name="briefcase" size={32} color="#F59E0B" />
              <Text style={styles.userStatValue}>{platformStats.totalRepresentatives}</Text>
              <Text style={styles.userStatLabel}>Representantes</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.adminActionCard}>
            <Ionicons name="person-add" size={24} color="#3B82F6" />
            <Text style={styles.adminActionText}>Gerenciar Usuários</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.adminActionCard}>
            <Ionicons name="shield-checkmark" size={24} color="#8B5CF6" />
            <Text style={styles.adminActionText}>Permissões e Roles</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.adminActionCard}>
            <Ionicons name="analytics" size={24} color="#10B981" />
            <Text style={styles.adminActionText}>Relatórios Completos</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#8B5CF6',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  revenueCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  revenueInfo: {
    marginLeft: 12,
  },
  revenueLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  revenueValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  revenueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  paidLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  paidValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
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
    fontSize: 11,
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
  commissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankFirst: {
    backgroundColor: '#F59E0B',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topInfo: {
    flex: 1,
  },
  topName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  topSales: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  topRevenue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  ruleCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ruleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ruleDesc: {
    fontSize: 13,
    color: '#10B981',
    marginTop: 4,
  },
  ruleExample: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#064E3B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  transactionLevel: {
    fontSize: 11,
    color: '#64748B',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  userStatsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  userStatCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  userStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  userStatLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  adminActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  adminActionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

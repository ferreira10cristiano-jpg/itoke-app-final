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

export default function RepresentativeDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuthStore();

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
  const stats = {
    totalPartners: 12,
    activePartners: 8,
    monthlyCommission: 450.00,
    totalCommission: 2340.00,
    pendingApprovals: 3,
  };

  const recentPartners = [
    { id: 1, name: 'Pizzaria Napoli', status: 'active', commission: 85.00 },
    { id: 2, name: 'Salão Beleza Pura', status: 'active', commission: 62.00 },
    { id: 3, name: 'Academia FitLife', status: 'pending', commission: 0 },
    { id: 4, name: 'Pet Shop Amigo', status: 'active', commission: 45.00 },
  ];

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0] || 'Representante'}!</Text>
          <Text style={styles.subtitle}>Dashboard do Representante</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Commission Card */}
      <View style={styles.commissionCard}>
        <View style={styles.commissionHeader}>
          <Ionicons name="cash" size={32} color="#F59E0B" />
          <View style={styles.commissionInfo}>
            <Text style={styles.commissionLabel}>Comissão do Mês</Text>
            <Text style={styles.commissionValue}>R$ {stats.monthlyCommission.toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.commissionFooter}>
          <Text style={styles.totalLabel}>Total acumulado:</Text>
          <Text style={styles.totalValue}>R$ {stats.totalCommission.toFixed(2)}</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="business" size={28} color="#3B82F6" />
          <Text style={styles.statValue}>{stats.totalPartners}</Text>
          <Text style={styles.statLabel}>Parceiros</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={28} color="#10B981" />
          <Text style={styles.statValue}>{stats.activePartners}</Text>
          <Text style={styles.statLabel}>Ativos</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time" size={28} color="#F59E0B" />
          <Text style={styles.statValue}>{stats.pendingApprovals}</Text>
          <Text style={styles.statLabel}>Pendentes</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        
        <TouchableOpacity style={styles.actionCard}>
          <View style={[styles.actionIcon, { backgroundColor: '#3B82F620' }]}>
            <Ionicons name="add-circle" size={24} color="#3B82F6" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Cadastrar Parceiro</Text>
            <Text style={styles.actionSubtitle}>Adicionar novo estabelecimento</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <View style={[styles.actionIcon, { backgroundColor: '#10B98120' }]}>
            <Ionicons name="wallet" size={24} color="#10B981" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Solicitar Saque</Text>
            <Text style={styles.actionSubtitle}>Transferir comissões</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <View style={[styles.actionIcon, { backgroundColor: '#F59E0B20' }]}>
            <Ionicons name="bar-chart" size={24} color="#F59E0B" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Relatórios</Text>
            <Text style={styles.actionSubtitle}>Performance e vendas</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Recent Partners */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Parceiros Recentes</Text>
        
        {recentPartners.map((partner) => (
          <View key={partner.id} style={styles.partnerCard}>
            <View style={styles.partnerIcon}>
              <Ionicons name="business" size={20} color="#3B82F6" />
            </View>
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerName}>{partner.name}</Text>
              <View style={[
                styles.statusBadge,
                partner.status === 'active' ? styles.statusActive : styles.statusPending
              ]}>
                <Text style={styles.statusText}>
                  {partner.status === 'active' ? 'Ativo' : 'Pendente'}
                </Text>
              </View>
            </View>
            {partner.commission > 0 && (
              <Text style={styles.partnerCommission}>R$ {partner.commission.toFixed(2)}</Text>
            )}
          </View>
        ))}
      </View>

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
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#F59E0B',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  commissionCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  commissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  commissionInfo: {
    marginLeft: 12,
  },
  commissionLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  commissionValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F59E0B',
  },
  commissionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  totalLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
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
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  partnerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F620',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  statusActive: {
    backgroundColor: '#10B98120',
  },
  statusPending: {
    backgroundColor: '#F59E0B20',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  partnerCommission: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
  },
});

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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/lib/api';
import { Establishment, Offer } from '../../src/types';

export default function EstablishmentDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, refreshUser } = useAuthStore();
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const est = await api.getMyEstablishment();
      setEstablishment(est);
      const [offersData, statsData] = await Promise.all([
        api.getMyOffers(),
        api.getEstablishmentStats(est.establishment_id),
      ]);
      setOffers(offersData);
      setStats(statsData.stats);
    } catch (error: any) {
      if (error.message?.includes('No establishment')) {
        router.replace('/establishment/register');
      }
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    await refreshUser();
    setRefreshing(false);
  }, [refreshUser]);

  const handleLogout = () => {
    // For web, use confirm dialog instead of Alert
    if (typeof window !== 'undefined') {
      if (window.confirm('Tem certeza que deseja sair?')) {
        logout().then(() => {
          window.location.href = '/';
        });
      }
    } else {
      Alert.alert('Sair', 'Tem certeza que deseja sair?', [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          style: 'destructive', 
          onPress: async () => { 
            await logout(); 
            router.replace('/');
          } 
        },
      ]);
    }
  };

  const handleGoBack = () => {
    // Back button = logout and go to selection screen
    // For web, perform logout and redirect
    if (typeof window !== 'undefined') {
      logout().then(() => {
        window.location.href = '/';
      });
    } else {
      logout().then(() => {
        router.replace('/');
      });
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" colors={['#10B981']} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton} testID="back-button" accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{establishment?.business_name || 'Estabelecimento'}</Text>
          <Text style={styles.subtitle}>Dashboard</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} testID="logout-button" accessibilityLabel="Sair">
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="eye" size={24} color="#3B82F6" />
          <Text style={styles.statValue}>{stats?.total_views || 0}</Text>
          <Text style={styles.statLabel}>Visualizações</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="qr-code" size={24} color="#10B981" />
          <Text style={styles.statValue}>{stats?.total_qr_generated || 0}</Text>
          <Text style={styles.statLabel}>QR Gerados</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="cart" size={24} color="#F59E0B" />
          <Text style={styles.statValue}>{stats?.total_sales || 0}</Text>
          <Text style={styles.statLabel}>Vendas</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="pricetags" size={24} color="#8B5CF6" />
          <Text style={styles.statValue}>{offers.length}</Text>
          <Text style={styles.statLabel}>Ofertas</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/establishment/offers')}>
          <View style={[styles.actionIcon, { backgroundColor: '#064E3B' }]}>
            <Ionicons name="add" size={24} color="#10B981" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Criar / Gerenciar Ofertas</Text>
            <Text style={styles.actionSub}>{offers.length === 0 ? 'Crie sua primeira oferta!' : `${offers.length} oferta${offers.length > 1 ? 's' : ''} ativa${offers.length > 1 ? 's' : ''}`}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/establishment/validate')}>
          <View style={[styles.actionIcon, { backgroundColor: '#1E3A5F' }]}>
            <Ionicons name="scan" size={24} color="#3B82F6" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Validar QR Code</Text>
            <Text style={styles.actionSub}>Escanear código do cliente</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Recent Offers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ofertas Recentes</Text>
          {offers.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/establishment/offers')}>
              <Text style={styles.seeAll}>Ver todas</Text>
            </TouchableOpacity>
          )}
        </View>

        {offers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetags-outline" size={40} color="#334155" />
            <Text style={styles.emptyText}>Nenhuma oferta criada</Text>
          </View>
        ) : (
          offers.slice(0, 3).map((offer) => (
            <View key={offer.offer_id} style={styles.offerCard}>
              <View style={styles.offerInfo}>
                <Text style={styles.offerTitle} numberOfLines={1}>{offer.title}</Text>
                <View style={styles.offerStats}>
                  <View style={styles.offerStat}>
                    <Ionicons name="qr-code" size={14} color="#64748B" />
                    <Text style={styles.offerStatText}>{offer.qr_generated} QR</Text>
                  </View>
                  <View style={styles.offerStat}>
                    <Ionicons name="cart" size={14} color="#64748B" />
                    <Text style={styles.offerStatText}>{offer.sales} vendas</Text>
                  </View>
                </View>
              </View>
              <View style={styles.offerDiscount}>
                <Text style={styles.discountText}>{offer.discount_value}%</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { marginRight: 12 },
  headerContent: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  subtitle: { fontSize: 13, color: '#64748B' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginTop: 8, gap: 8 },
  statCard: { width: '47%', backgroundColor: '#1E293B', padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#FFF', marginTop: 6 },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 12 },
  seeAll: { fontSize: 13, fontWeight: '600', color: '#10B981' },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  actionIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  actionSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  offerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  offerInfo: { flex: 1 },
  offerTitle: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  offerStats: { flexDirection: 'row', marginTop: 6, gap: 16 },
  offerStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offerStatText: { fontSize: 12, color: '#64748B' },
  offerDiscount: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  discountText: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  emptyState: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#1E293B', borderRadius: 14, borderWidth: 1, borderColor: '#334155' },
  emptyText: { fontSize: 14, color: '#64748B', marginTop: 10 },
});

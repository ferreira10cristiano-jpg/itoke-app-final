import React, { useState, useEffect, useCallback } from 'react';
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
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function RepresentativeDashboard() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const repToken = params.token as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<'overview' | 'clients' | 'establishments' | 'commissions'>('overview');

  const loadDashboard = async () => {
    if (!repToken) {
      setError('Token de acesso nao fornecido. Solicite um novo link ao administrador.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/rep/dashboard`, {
        headers: { 'X-Rep-Token': repToken },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Erro ao carregar dados');
      }
      const result = await res.json();
      setData(result);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Erro de conexao');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [repToken]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [repToken]);

  const formatCurrency = (val: number) => `R$ ${(val || 0).toFixed(2).replace('.', ',')}`;
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try { return new Date(dateStr).toLocaleDateString('pt-BR'); } catch { return dateStr.slice(0, 10); }
  };

  const handleCopyCode = () => {
    if (data?.referral_code && Platform.OS === 'web' && typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(data.referral_code);
      window.alert('Codigo copiado: ' + data.referral_code);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Ionicons name="lock-closed" size={56} color="#EF4444" />
        <Text style={styles.errorTitle}>Acesso Negado</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!data) return null;

  const stats = data.stats || {};
  const freeTokens = data.free_tokens || {};

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} data-testid="rep-dashboard-screen">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" colors={['#10B981']} />}
      >
        {/* Header */}
        <View style={styles.header} data-testid="rep-header">
          <View style={styles.headerIcon}>
            <Ionicons name="briefcase" size={24} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName}>{data.name}</Text>
            <Text style={styles.headerRole}>Representante Comercial PJ</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: data.status === 'active' ? '#10B98120' : '#F59E0B20' }]}>
            <Text style={[styles.statusText, { color: data.status === 'active' ? '#10B981' : '#F59E0B' }]}>
              {data.status === 'active' ? 'Ativo' : 'Pendente'}
            </Text>
          </View>
        </View>

        {/* Referral Code Card */}
        <TouchableOpacity style={styles.codeCard} onPress={handleCopyCode} activeOpacity={0.7} data-testid="rep-referral-code">
          <Ionicons name="link" size={18} color="#3B82F6" />
          <Text style={styles.codeLabel}>Seu codigo de indicacao:</Text>
          <Text style={styles.codeValue}>{data.referral_code}</Text>
          <Ionicons name="copy-outline" size={16} color="#64748B" />
        </TouchableOpacity>

        {/* Stats Cards */}
        <View style={styles.statsGrid} data-testid="rep-stats">
          <View style={styles.statCard}>
            <Ionicons name="people" size={20} color="#3B82F6" />
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.total_clients}</Text>
            <Text style={styles.statLabel}>Clientes</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="storefront" size={20} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{stats.total_establishments}</Text>
            <Text style={styles.statLabel}>Estabelec.</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={20} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>{formatCurrency(stats.commission_balance)}</Text>
            <Text style={styles.statLabel}>Saldo</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{formatCurrency(stats.total_earned)}</Text>
            <Text style={styles.statLabel}>Total Ganho</Text>
          </View>
        </View>

        {/* Free Tokens Card */}
        <View style={styles.freeTokensCard} data-testid="rep-free-tokens">
          <View style={styles.freeTokensHeader}>
            <Ionicons name="gift" size={20} color="#F59E0B" />
            <Text style={styles.freeTokensTitle}>Tokens Gratuitos</Text>
          </View>
          <View style={styles.freeTokensBar}>
            <View style={[styles.freeTokensFill, { width: `${freeTokens.allocated > 0 ? (freeTokens.used / freeTokens.allocated) * 100 : 0}%` }]} />
          </View>
          <View style={styles.freeTokensDetails}>
            <View style={styles.freeTokensItem}>
              <Text style={styles.ftLabel}>Alocados</Text>
              <Text style={styles.ftValue}>{freeTokens.allocated}</Text>
            </View>
            <View style={styles.freeTokensItem}>
              <Text style={styles.ftLabel}>Usados</Text>
              <Text style={[styles.ftValue, { color: '#EF4444' }]}>{freeTokens.used}</Text>
            </View>
            <View style={styles.freeTokensItem}>
              <Text style={styles.ftLabel}>Restantes</Text>
              <Text style={[styles.ftValue, { color: '#10B981' }]}>{freeTokens.remaining}</Text>
            </View>
          </View>
          <Text style={styles.freeTokensNote}>
            {freeTokens.remaining > 0
              ? `Voce tem ${freeTokens.remaining} tokens gratis para oferecer a novos estabelecimentos.`
              : 'Seus tokens gratuitos acabaram. Comissoes serao geradas quando estabelecimentos comprarem novos tokens.'}
          </Text>
        </View>

        {/* Section Tabs */}
        <View style={styles.sectionTabs}>
          {(['overview', 'clients', 'establishments', 'commissions'] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.sectionTab, activeSection === s && styles.sectionTabActive]}
              onPress={() => setActiveSection(s)}
              data-testid={`rep-section-${s}`}
            >
              <Text style={[styles.sectionTabText, activeSection === s && styles.sectionTabTextActive]}>
                {s === 'overview' ? 'Resumo' : s === 'clients' ? 'Clientes' : s === 'establishments' ? 'Estab.' : 'Comissoes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview Section */}
        {activeSection === 'overview' && (
          <View style={styles.section} data-testid="rep-overview-section">
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>CNPJ</Text>
                <Text style={styles.infoValue}>{data.cnpj}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>E-mail</Text>
                <Text style={styles.infoValue}>{data.email}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Sacado</Text>
                <Text style={styles.infoValue}>{formatCurrency(stats.total_withdrawn)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Clients Section */}
        {activeSection === 'clients' && (
          <View style={styles.section} data-testid="rep-clients-section">
            {(data.clients || []).length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="people-outline" size={40} color="#334155" />
                <Text style={styles.emptyText}>Nenhum cliente vinculado ainda</Text>
                <Text style={styles.emptySubtext}>Compartilhe seu codigo {data.referral_code} para indicar clientes</Text>
              </View>
            ) : (
              (data.clients || []).map((c: any, i: number) => (
                <View key={c.user_id || i} style={styles.listCard} data-testid={`rep-client-${i}`}>
                  <View style={styles.listCardIcon}>
                    <Ionicons name="person" size={18} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listCardName}>{c.name}</Text>
                    <Text style={styles.listCardSub}>{c.email}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.listCardDate}>Desde {formatDate(c.linked_at)}</Text>
                    <Text style={styles.listCardExpiry}>Ate {formatDate(c.expires_at)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Establishments Section */}
        {activeSection === 'establishments' && (
          <View style={styles.section} data-testid="rep-establishments-section">
            {(data.establishments || []).length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="storefront-outline" size={40} color="#334155" />
                <Text style={styles.emptyText}>Nenhum estabelecimento vinculado</Text>
                <Text style={styles.emptySubtext}>Use seu codigo para trazer novos parceiros</Text>
              </View>
            ) : (
              (data.establishments || []).map((e: any, i: number) => (
                <View key={e.establishment_id || i} style={styles.listCard} data-testid={`rep-est-${i}`}>
                  <View style={[styles.listCardIcon, { backgroundColor: '#8B5CF620' }]}>
                    <Ionicons name="storefront" size={18} color="#8B5CF6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listCardName}>{e.name}</Text>
                    <Text style={styles.listCardSub}>{e.category}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.listCardDate}>Desde {formatDate(e.linked_at)}</Text>
                    <Text style={styles.listCardExpiry}>Ate {formatDate(e.expires_at)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Commissions Section */}
        {activeSection === 'commissions' && (
          <View style={styles.section} data-testid="rep-commissions-section">
            {(data.recent_commissions || []).length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="cash-outline" size={40} color="#334155" />
                <Text style={styles.emptyText}>Nenhuma comissao gerada</Text>
                <Text style={styles.emptySubtext}>Comissoes aparecerao quando seus indicados fizerem transacoes</Text>
              </View>
            ) : (
              (data.recent_commissions || []).map((c: any, i: number) => (
                <View key={c.commission_id || i} style={styles.commissionCard} data-testid={`rep-commission-${i}`}>
                  <View style={styles.commissionLeft}>
                    <View style={[styles.commissionDot, { backgroundColor: c.status === 'approved' ? '#10B981' : '#F59E0B' }]} />
                    <View>
                      <Text style={styles.commissionType}>
                        {c.source_type === 'client' ? 'Venda do Cliente' : 'Venda do Estabelecimento'}
                      </Text>
                      <Text style={styles.commissionDate}>{formatDate(c.created_at)}</Text>
                    </View>
                  </View>
                  <Text style={styles.commissionAmount}>+{formatCurrency(c.amount)}</Text>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A' },
  centered: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  scrollContent: { paddingBottom: 20 },
  loadingText: { color: '#94A3B8', marginTop: 12, fontSize: 14 },
  errorTitle: { color: '#EF4444', fontSize: 22, fontWeight: '700', marginTop: 16 },
  errorText: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 8 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, gap: 14 },
  headerIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#10B98118', justifyContent: 'center', alignItems: 'center' },
  headerName: { fontSize: 20, fontWeight: '800', color: '#E2E8F0' },
  headerRole: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },

  codeCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 20, padding: 14, backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1E293B' },
  codeLabel: { color: '#64748B', fontSize: 12, flex: 1 },
  codeValue: { color: '#10B981', fontSize: 16, fontWeight: '800', letterSpacing: 1 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  statCard: { width: '47%', flexGrow: 1, backgroundColor: '#111827', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' },
  statValue: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 4, fontWeight: '600' },

  freeTokensCard: { marginHorizontal: 20, marginBottom: 20, padding: 16, backgroundColor: '#111827', borderRadius: 14, borderWidth: 1, borderColor: '#1E293B' },
  freeTokensHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  freeTokensTitle: { color: '#F59E0B', fontSize: 15, fontWeight: '700' },
  freeTokensBar: { height: 6, backgroundColor: '#1E293B', borderRadius: 3, marginBottom: 12, overflow: 'hidden' },
  freeTokensFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 3 },
  freeTokensDetails: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  freeTokensItem: { flex: 1, alignItems: 'center' },
  ftLabel: { color: '#64748B', fontSize: 11 },
  ftValue: { color: '#CBD5E1', fontSize: 16, fontWeight: '700', marginTop: 2 },
  freeTokensNote: { color: '#64748B', fontSize: 12, lineHeight: 18 },

  sectionTabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  sectionTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1E293B' },
  sectionTabActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  sectionTabText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  sectionTabTextActive: { color: '#0F172A' },

  section: { paddingHorizontal: 20 },

  infoCard: { backgroundColor: '#111827', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1E293B' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  infoLabel: { color: '#64748B', fontSize: 13 },
  infoValue: { color: '#E2E8F0', fontSize: 14, fontWeight: '600' },
  infoDivider: { height: 1, backgroundColor: '#1E293B' },

  emptySection: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#94A3B8', fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubtext: { color: '#64748B', fontSize: 13, marginTop: 6, textAlign: 'center' },

  listCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1E293B' },
  listCardIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#3B82F620', justifyContent: 'center', alignItems: 'center' },
  listCardName: { color: '#E2E8F0', fontSize: 14, fontWeight: '600' },
  listCardSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
  listCardDate: { color: '#64748B', fontSize: 11 },
  listCardExpiry: { color: '#475569', fontSize: 10, marginTop: 2 },

  commissionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1E293B' },
  commissionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  commissionDot: { width: 8, height: 8, borderRadius: 4 },
  commissionType: { color: '#CBD5E1', fontSize: 13, fontWeight: '500' },
  commissionDate: { color: '#475569', fontSize: 11, marginTop: 2 },
  commissionAmount: { color: '#10B981', fontSize: 16, fontWeight: '700' },
});

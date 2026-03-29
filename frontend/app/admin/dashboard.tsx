import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/lib/api';

interface AdminStats {
  total_users: number;
  total_establishments: number;
  total_offers: number;
  total_sales: number;
  total_transactions: number;
  total_commissions_paid: number;
  top_establishments: Array<{
    establishment_id: string;
    name: string;
    city: string;
    sales_count: number;
  }>;
}

interface VoucherAudit {
  voucher_id: string;
  backup_code: string;
  status: string;
  created_at: string;
  used_at: string | null;
  customer: { user_id: string; name: string; email: string };
  offer: { offer_id: string; title: string };
  establishment: { name: string; city: string };
  validated_by: { name: string; city: string } | null;
  pricing: {
    original_price: number;
    discounted_price: number;
    credits_used: number;
    final_price_paid: number;
  };
}

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'users'>('overview');

  // Real data state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Financial state
  const [financial, setFinancial] = useState<any>(null);
  const [financialLoading, setFinancialLoading] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<{ commission_percent: number } | null>(null);
  const [commissionInput, setCommissionInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<VoucherAudit | null>(null);
  const [searchError, setSearchError] = useState('');
  const [showAuditModal, setShowAuditModal] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err: any) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFinancial = useCallback(async () => {
    try {
      setFinancialLoading(true);
      const [fin, sett] = await Promise.all([
        api.getAdminFinancial(),
        api.getAdminSettings(),
      ]);
      setFinancial(fin);
      setSettings(sett);
      setCommissionInput(String(sett.commission_percent || 10));
    } catch (err: any) {
      console.error('Error fetching financial:', err);
    } finally {
      setFinancialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'financial') {
      fetchFinancial();
    }
  }, [activeTab, fetchFinancial]);

  const handleSaveCommission = async () => {
    const val = parseFloat(commissionInput.replace(',', '.'));
    if (isNaN(val) || val < 0 || val > 100) {
      setSettingsMsg('Valor invalido (0-100)');
      return;
    }
    setSavingSettings(true);
    setSettingsMsg('');
    try {
      await api.updateAdminSettings(val);
      setSettings({ commission_percent: val });
      setSettingsMsg('Salvo com sucesso!');
      setTimeout(() => setSettingsMsg(''), 3000);
    } catch (err: any) {
      setSettingsMsg(err.message || 'Erro ao salvar');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogout = () => {
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
          },
        },
      ]);
    }
  };

  const handleSearch = async () => {
    const code = searchQuery.trim();
    if (!code) return;
    setSearching(true);
    setSearchError('');
    setSearchResult(null);
    try {
      const result = await api.adminSearchVoucher(code);
      setSearchResult(result);
      setShowAuditModal(true);
    } catch (err: any) {
      setSearchError(err.message || 'Voucher nao encontrado');
    } finally {
      setSearching(false);
    }
  };

  const formatPrice = (v: number) => `R$ ${(v || 0).toFixed(2).replace('.', ',')}`;

  const formatDate = (d: string | null) => {
    if (!d) return 'N/A';
    const date = new Date(d);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'used': return '#10B981';
      case 'active': return '#3B82F6';
      case 'cancelled': return '#EF4444';
      default: return '#94A3B8';
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'used': return 'Utilizado';
      case 'active': return 'Ativo';
      case 'cancelled': return 'Cancelado';
      default: return s;
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingWrap, { paddingTop: insets.top }]} data-testid="admin-loading">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title} data-testid="admin-title">Admin iToke</Text>
            <Text style={styles.subtitle}>Painel de Controle</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} data-testid="admin-logout-btn">
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection} data-testid="admin-search-section">
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <Ionicons name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar voucher (ex: ITK-A1B)"
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={(t) => { setSearchQuery(t); setSearchError(''); }}
                onSubmitEditing={handleSearch}
                autoCapitalize="characters"
                data-testid="admin-search-input"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchError(''); }} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.searchBtn, searching && styles.searchBtnDisabled]}
              onPress={handleSearch}
              disabled={searching}
              data-testid="admin-search-btn"
            >
              {searching ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="search" size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
          {searchError ? (
            <Text style={styles.searchErrorText} data-testid="admin-search-error">{searchError}</Text>
          ) : null}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(['overview', 'financial', 'users'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              data-testid={`admin-tab-${tab}`}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'overview' ? 'Visao Geral' : tab === 'financial' ? 'Financeiro' : 'Usuarios'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'overview' && stats && (
          <>
            {/* Stats Cards */}
            <View style={styles.statsGrid} data-testid="admin-stats-grid">
              <View style={[styles.statCard, styles.statCardBlue]} data-testid="admin-stat-users">
                <View style={[styles.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="people" size={22} color="#3B82F6" />
                </View>
                <Text style={styles.statValue}>{stats.total_users}</Text>
                <Text style={styles.statLabel}>Usuarios</Text>
              </View>
              <View style={[styles.statCard, styles.statCardGreen]} data-testid="admin-stat-establishments">
                <View style={[styles.statIconWrap, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="business" size={22} color="#10B981" />
                </View>
                <Text style={styles.statValue}>{stats.total_establishments}</Text>
                <Text style={styles.statLabel}>Estabelecimentos</Text>
              </View>
              <View style={[styles.statCard, styles.statCardAmber]} data-testid="admin-stat-offers">
                <View style={[styles.statIconWrap, { backgroundColor: '#FFFBEB' }]}>
                  <Ionicons name="pricetag" size={22} color="#F59E0B" />
                </View>
                <Text style={styles.statValue}>{stats.total_offers}</Text>
                <Text style={styles.statLabel}>Ofertas</Text>
              </View>
              <View style={[styles.statCard, styles.statCardRed]} data-testid="admin-stat-sales">
                <View style={[styles.statIconWrap, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="cart" size={22} color="#EF4444" />
                </View>
                <Text style={styles.statValue}>{stats.total_sales}</Text>
                <Text style={styles.statLabel}>Vendas</Text>
              </View>
            </View>

            {/* Top Establishments */}
            <View style={styles.section} data-testid="admin-top-establishments">
              <Text style={styles.sectionTitle}>Top 5 Estabelecimentos</Text>
              {stats.top_establishments.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="analytics-outline" size={32} color="#CBD5E1" />
                  <Text style={styles.emptyText}>Nenhuma venda registrada ainda</Text>
                </View>
              ) : (
                stats.top_establishments.map((est, index) => (
                  <View key={est.establishment_id || index} style={styles.topCard} data-testid={`top-est-${index}`}>
                    <View style={[styles.rankBadge, index === 0 && styles.rankFirst, index === 1 && styles.rankSecond, index === 2 && styles.rankThird]}>
                      <Text style={styles.rankText}>#{index + 1}</Text>
                    </View>
                    <View style={styles.topInfo}>
                      <Text style={styles.topName}>{est.name}</Text>
                      <Text style={styles.topCity}>{est.city}</Text>
                    </View>
                    <View style={styles.topSalesWrap}>
                      <Text style={styles.topSalesNum}>{est.sales_count}</Text>
                      <Text style={styles.topSalesLabel}>vendas</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {activeTab === 'financial' && (
          <View style={styles.section}>
            {financialLoading ? (
              <View style={styles.financialLoading}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Carregando dados financeiros...</Text>
              </View>
            ) : financial ? (
              <>
                {/* Revenue Cards */}
                <Text style={styles.sectionTitle}>Receita da Plataforma</Text>
                <View style={styles.finCard} data-testid="fin-gross-revenue">
                  <View style={styles.finCardHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="trending-up" size={20} color="#10B981" />
                    </View>
                    <Text style={styles.finCardLabel}>Receita Bruta</Text>
                  </View>
                  <Text style={[styles.finCardValue, { color: '#10B981' }]}>
                    {formatPrice(financial.gross_revenue)}
                  </Text>
                  <View style={styles.finBreakdown}>
                    <View style={styles.finBreakdownRow}>
                      <Ionicons name="ticket" size={14} color="#64748B" />
                      <Text style={styles.finBreakdownLabel}>Tokens (Clientes)</Text>
                      <Text style={styles.finBreakdownValue}>{formatPrice(financial.client_token_revenue)}</Text>
                    </View>
                    <View style={styles.finBreakdownRow}>
                      <Ionicons name="cube" size={14} color="#64748B" />
                      <Text style={styles.finBreakdownLabel}>Pacotes (Estabelecimentos)</Text>
                      <Text style={styles.finBreakdownValue}>{formatPrice(financial.est_package_revenue)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.finCard} data-testid="fin-commissions">
                  <View style={styles.finCardHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#FEF2F2' }]}>
                      <Ionicons name="remove-circle" size={20} color="#EF4444" />
                    </View>
                    <Text style={styles.finCardLabel}>Comissoes Pagas</Text>
                  </View>
                  <Text style={[styles.finCardValue, { color: '#EF4444' }]}>
                    - {formatPrice(Math.abs(financial.total_commissions_paid))}
                  </Text>
                </View>

                <View style={[styles.finCard, styles.finCardHighlight]} data-testid="fin-net-revenue">
                  <View style={styles.finCardHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="diamond" size={20} color="#3B82F6" />
                    </View>
                    <Text style={styles.finCardLabel}>Receita Liquida (Lucro iToke)</Text>
                  </View>
                  <Text style={[styles.finCardValue, { color: '#3B82F6' }]}>
                    {formatPrice(financial.net_revenue)}
                  </Text>
                </View>

                <View style={styles.finCard} data-testid="fin-balance-settle">
                  <View style={styles.finCardHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#FFFBEB' }]}>
                      <Ionicons name="wallet" size={20} color="#F59E0B" />
                    </View>
                    <Text style={styles.finCardLabel}>Saldo a Liquidar</Text>
                  </View>
                  <Text style={[styles.finCardValue, { color: '#F59E0B' }]}>
                    {formatPrice(financial.balance_to_settle)}
                  </Text>
                  <Text style={styles.finCardHint}>
                    Total de creditos em conta dos estabelecimentos (pendente de saque)
                  </Text>
                </View>

                {/* Commission Config */}
                <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Configuracao de Comissao</Text>
                <View style={styles.configCard} data-testid="commission-config">
                  <View style={styles.configHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#F5F3FF' }]}>
                      <Ionicons name="settings" size={20} color="#8B5CF6" />
                    </View>
                    <View style={styles.configTitleWrap}>
                      <Text style={styles.configTitle}>Comissao Global (%)</Text>
                      <Text style={styles.configDesc}>
                        Percentual usado na conversao de credito para dinheiro real
                      </Text>
                    </View>
                  </View>
                  <View style={styles.configInputRow}>
                    <TextInput
                      style={styles.configInput}
                      value={commissionInput}
                      onChangeText={(t) => { setCommissionInput(t); setSettingsMsg(''); }}
                      keyboardType="decimal-pad"
                      placeholder="10"
                      placeholderTextColor="#94A3B8"
                      data-testid="commission-input"
                    />
                    <Text style={styles.configPercent}>%</Text>
                    <TouchableOpacity
                      style={[styles.configSaveBtn, savingSettings && styles.configSaveBtnDisabled]}
                      onPress={handleSaveCommission}
                      disabled={savingSettings}
                      data-testid="commission-save-btn"
                    >
                      {savingSettings ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.configSaveBtnText}>Salvar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {settingsMsg ? (
                    <Text style={[
                      styles.configMsg,
                      settingsMsg.includes('sucesso') ? styles.configMsgSuccess : styles.configMsgError
                    ]} data-testid="commission-msg">
                      {settingsMsg}
                    </Text>
                  ) : null}
                  {settings && (
                    <Text style={styles.configCurrentVal}>
                      Valor atual: {settings.commission_percent}%
                    </Text>
                  )}
                </View>

                {/* Commission Rules Info */}
                <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Regras de Comissao</Text>
                <View style={styles.ruleCard}>
                  <View style={[styles.ruleIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="people" size={22} color="#3B82F6" />
                  </View>
                  <View style={styles.ruleContent}>
                    <Text style={styles.ruleTitle}>Comissao por Compra</Text>
                    <Text style={styles.ruleDesc}>R$1 por nivel (ate 3 niveis)</Text>
                    <Text style={styles.ruleExample}>Usuario A indica B, B indica C, C compra = A, B, C ganham R$1 cada</Text>
                  </View>
                </View>
                <View style={styles.ruleCard}>
                  <View style={[styles.ruleIcon, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="business" size={22} color="#10B981" />
                  </View>
                  <View style={styles.ruleContent}>
                    <Text style={styles.ruleTitle}>Comissao Estabelecimento</Text>
                    <Text style={styles.ruleDesc}>R$1 por venda durante 12 meses</Text>
                    <Text style={styles.ruleExample}>Usuario indica loja = ganha R$1 em cada venda da loja</Text>
                  </View>
                </View>
                <View style={styles.ruleCard}>
                  <View style={[styles.ruleIcon, { backgroundColor: '#FFFBEB' }]}>
                    <Ionicons name="gift" size={22} color="#F59E0B" />
                  </View>
                  <View style={styles.ruleContent}>
                    <Text style={styles.ruleTitle}>Comissao Pacotes</Text>
                    <Text style={styles.ruleDesc}>R$1 por nivel na compra de pacotes</Text>
                    <Text style={styles.ruleExample}>Estabelecimento compra pacote = 3 niveis ganham</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="warning-outline" size={32} color="#CBD5E1" />
                <Text style={styles.emptyText}>Erro ao carregar dados financeiros</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'users' && stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gestao de Usuarios</Text>
            <View style={styles.userStatsGrid}>
              <View style={[styles.userStatCard, { borderColor: '#3B82F6' }]}>
                <Ionicons name="person" size={28} color="#3B82F6" />
                <Text style={styles.userStatValue}>
                  {Math.max(0, stats.total_users - stats.total_establishments)}
                </Text>
                <Text style={styles.userStatLabel}>Clientes</Text>
              </View>
              <View style={[styles.userStatCard, { borderColor: '#10B981' }]}>
                <Ionicons name="business" size={28} color="#10B981" />
                <Text style={styles.userStatValue}>{stats.total_establishments}</Text>
                <Text style={styles.userStatLabel}>Estabelecimentos</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.adminActionCard}>
              <Ionicons name="person-add" size={22} color="#3B82F6" />
              <Text style={styles.adminActionText}>Gerenciar Usuarios</Text>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.adminActionCard}>
              <Ionicons name="shield-checkmark" size={22} color="#8B5CF6" />
              <Text style={styles.adminActionText}>Permissoes e Roles</Text>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.adminActionCard}>
              <Ionicons name="analytics" size={22} color="#10B981" />
              <Text style={styles.adminActionText}>Relatorios Completos</Text>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Voucher Audit Modal */}
      <Modal visible={showAuditModal} animationType="fade" transparent onRequestClose={() => setShowAuditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer} data-testid="voucher-audit-modal">
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowAuditModal(false)} data-testid="audit-modal-close">
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>

            {searchResult && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <Text style={styles.modalTitle}>Auditoria de Voucher</Text>
                <View style={styles.auditCodeRow}>
                  <Text style={styles.auditCodeLabel}>{searchResult.backup_code}</Text>
                  <View style={[styles.auditStatusBadge, { backgroundColor: statusColor(searchResult.status) + '20' }]}>
                    <View style={[styles.auditStatusDot, { backgroundColor: statusColor(searchResult.status) }]} />
                    <Text style={[styles.auditStatusText, { color: statusColor(searchResult.status) }]}>
                      {statusLabel(searchResult.status)}
                    </Text>
                  </View>
                </View>

                {/* Customer */}
                <View style={styles.auditSection}>
                  <View style={styles.auditSectionHeader}>
                    <Ionicons name="person" size={16} color="#3B82F6" />
                    <Text style={styles.auditSectionTitle}>Quem Gerou</Text>
                  </View>
                  <Text style={styles.auditDetailValue}>{searchResult.customer.name}</Text>
                  <Text style={styles.auditDetailSub}>ID: {searchResult.customer.user_id}</Text>
                  {searchResult.customer.email && (
                    <Text style={styles.auditDetailSub}>{searchResult.customer.email}</Text>
                  )}
                </View>

                {/* Establishment Used */}
                <View style={styles.auditSection}>
                  <View style={styles.auditSectionHeader}>
                    <Ionicons name="business" size={16} color="#10B981" />
                    <Text style={styles.auditSectionTitle}>Onde Usou</Text>
                  </View>
                  {searchResult.validated_by ? (
                    <>
                      <Text style={styles.auditDetailValue}>{searchResult.validated_by.name}</Text>
                      <Text style={styles.auditDetailSub}>{searchResult.validated_by.city}</Text>
                    </>
                  ) : (
                    <Text style={styles.auditDetailMuted}>Ainda nao utilizado</Text>
                  )}
                </View>

                {/* Offer */}
                <View style={styles.auditSection}>
                  <View style={styles.auditSectionHeader}>
                    <Ionicons name="pricetag" size={16} color="#F59E0B" />
                    <Text style={styles.auditSectionTitle}>Oferta</Text>
                  </View>
                  <Text style={styles.auditDetailValue}>{searchResult.offer.title}</Text>
                </View>

                {/* Pricing */}
                <View style={styles.auditSection}>
                  <View style={styles.auditSectionHeader}>
                    <Ionicons name="cash" size={16} color="#8B5CF6" />
                    <Text style={styles.auditSectionTitle}>Valores</Text>
                  </View>
                  <View style={styles.pricingGrid}>
                    <View style={styles.pricingItem}>
                      <Text style={styles.pricingLabel}>Preco Original</Text>
                      <Text style={styles.pricingValue}>{formatPrice(searchResult.pricing.original_price)}</Text>
                    </View>
                    <View style={styles.pricingItem}>
                      <Text style={styles.pricingLabel}>Com Desconto</Text>
                      <Text style={styles.pricingValue}>{formatPrice(searchResult.pricing.discounted_price)}</Text>
                    </View>
                    <View style={styles.pricingItem}>
                      <Text style={styles.pricingLabel}>Creditos Aplicados</Text>
                      <Text style={[styles.pricingValue, { color: '#3B82F6' }]}>
                        {formatPrice(searchResult.pricing.credits_used)}
                      </Text>
                    </View>
                    <View style={styles.pricingItem}>
                      <Text style={styles.pricingLabel}>Valor Final (Balcao)</Text>
                      <Text style={[styles.pricingValue, { color: '#10B981', fontWeight: '800' }]}>
                        {formatPrice(searchResult.pricing.final_price_paid)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Dates */}
                <View style={styles.auditSection}>
                  <View style={styles.auditSectionHeader}>
                    <Ionicons name="calendar" size={16} color="#64748B" />
                    <Text style={styles.auditSectionTitle}>Data/Hora</Text>
                  </View>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Gerado em:</Text>
                    <Text style={styles.dateValue}>{formatDate(searchResult.created_at)}</Text>
                  </View>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Utilizado em:</Text>
                    <Text style={styles.dateValue}>{formatDate(searchResult.used_at)}</Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  // Search
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  clearBtn: {
    padding: 4,
  },
  searchBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnDisabled: {
    opacity: 0.6,
  },
  searchErrorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
    paddingLeft: 4,
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginTop: 4,
    gap: 10,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statCardBlue: { borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
  statCardGreen: { borderLeftWidth: 3, borderLeftColor: '#10B981' },
  statCardAmber: { borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  statCardRed: { borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  // Sections
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    color: '#94A3B8',
  },
  // Top Establishments
  topCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankFirst: { backgroundColor: '#F59E0B' },
  rankSecond: { backgroundColor: '#94A3B8' },
  rankThird: { backgroundColor: '#D97706' },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topInfo: {
    flex: 1,
  },
  topName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  topCity: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  topSalesWrap: {
    alignItems: 'flex-end',
  },
  topSalesNum: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  topSalesLabel: {
    fontSize: 10,
    color: '#94A3B8',
  },
  // Commissions
  commissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  ruleIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  ruleDesc: {
    fontSize: 13,
    color: '#10B981',
    marginTop: 3,
  },
  ruleExample: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
    fontStyle: 'italic',
  },
  // Users tab
  userStatsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  userStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  userStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  userStatLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  adminActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  adminActionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 1,
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  auditCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  auditCodeLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 2,
  },
  auditStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  auditStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  auditStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  auditSection: {
    marginBottom: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  auditSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  auditSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  auditDetailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  auditDetailSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  auditDetailMuted: {
    fontSize: 14,
    color: '#CBD5E1',
    fontStyle: 'italic',
  },
  pricingGrid: {
    gap: 8,
  },
  pricingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  pricingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  // Financial tab
  financialLoading: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  finCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  finCardHighlight: {
    borderColor: '#3B82F6',
    borderWidth: 2,
    backgroundColor: '#F8FAFF',
  },
  finCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  finIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  finCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  finCardValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  finCardHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  finBreakdown: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  finBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  finBreakdownLabel: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
  },
  finBreakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  // Config
  configCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  configTitleWrap: {
    flex: 1,
  },
  configTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  configDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 3,
    lineHeight: 16,
  },
  configInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  configInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  configPercent: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  configSaveBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  configSaveBtnDisabled: {
    opacity: 0.6,
  },
  configSaveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  configMsg: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  configMsgSuccess: {
    color: '#10B981',
  },
  configMsgError: {
    color: '#EF4444',
  },
  configCurrentVal: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },
});

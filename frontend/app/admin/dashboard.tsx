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
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'withdrawals' | 'users' | 'media'>('overview');

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

  // Token Package Config state
  const [tokenPackages, setTokenPackages] = useState<any[]>([]);
  const [tpLoading, setTpLoading] = useState(false);
  const [showTpForm, setShowTpForm] = useState(false);
  const [tpTitle, setTpTitle] = useState('');
  const [tpTokens, setTpTokens] = useState('');
  const [tpBonus, setTpBonus] = useState('');
  const [tpPrice, setTpPrice] = useState('');
  const [tpSaving, setTpSaving] = useState(false);
  const [editingTp, setEditingTp] = useState<any>(null);
  const [togglingTpId, setTogglingTpId] = useState<string | null>(null);

  // Withdrawals state
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Users state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  // Media state
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaTitle, setNewMediaTitle] = useState('');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video'>('image');
  const [addingMedia, setAddingMedia] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingText, setGeneratingText] = useState(false);
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

  const fetchWithdrawals = useCallback(async () => {
    try {
      setWithdrawalsLoading(true);
      const data = await api.getAdminWithdrawals();
      setWithdrawals(data);
    } catch (err: any) {
      console.error('Error fetching withdrawals:', err);
    } finally {
      setWithdrawalsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const data = await api.getAdminUsers();
      setUsersList(data);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchMedia = useCallback(async () => {
    try {
      setMediaLoading(true);
      const data = await api.getAdminMedia();
      setMediaList(data);
    } catch (err: any) {
      console.error('Error fetching media:', err);
    } finally {
      setMediaLoading(false);
    }
  }, []);

  const fetchTokenPackages = useCallback(async () => {
    try {
      setTpLoading(true);
      const data = await api.getAdminTokenPackages();
      setTokenPackages(data);
    } catch (err: any) {
      console.error('Error fetching token packages:', err);
    } finally {
      setTpLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'financial') { fetchFinancial(); fetchTokenPackages(); }
    if (activeTab === 'withdrawals') fetchWithdrawals();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'media') fetchMedia();
  }, [activeTab, fetchFinancial, fetchWithdrawals, fetchUsers, fetchMedia, fetchTokenPackages]);

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

  // Token Package Config Handlers
  const resetTpForm = () => {
    setTpTitle(''); setTpTokens(''); setTpBonus(''); setTpPrice('');
    setEditingTp(null); setShowTpForm(false);
  };

  const handleSaveTokenPackage = async () => {
    const tokens = parseInt(tpTokens);
    const bonus = parseInt(tpBonus) || 0;
    const price = parseFloat(tpPrice.replace(',', '.'));
    if (!tpTitle.trim()) { if (typeof window !== 'undefined') window.alert('Titulo obrigatorio'); return; }
    if (isNaN(tokens) || tokens < 1) { if (typeof window !== 'undefined') window.alert('Quantidade de tokens invalida'); return; }
    if (isNaN(price) || price <= 0) { if (typeof window !== 'undefined') window.alert('Preco invalido'); return; }
    setTpSaving(true);
    try {
      if (editingTp) {
        await api.updateTokenPackageConfig(editingTp.config_id, { title: tpTitle.trim(), tokens, bonus, price, active: editingTp.active });
      } else {
        await api.createTokenPackageConfig({ title: tpTitle.trim(), tokens, bonus, price, active: true });
      }
      resetTpForm();
      fetchTokenPackages();
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(err.message || 'Erro ao salvar pacote');
    } finally {
      setTpSaving(false);
    }
  };

  const handleToggleTpActive = async (pkg: any) => {
    setTogglingTpId(pkg.config_id);
    try {
      await api.updateTokenPackageConfig(pkg.config_id, { active: !pkg.active });
      fetchTokenPackages();
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(err.message || 'Erro');
    } finally {
      setTogglingTpId(null);
    }
  };

  const handleDeleteTp = async (configId: string) => {
    if (typeof window !== 'undefined') {
      if (!window.confirm('Remover este pacote?')) return;
    }
    try {
      await api.deleteTokenPackageConfig(configId);
      fetchTokenPackages();
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(err.message || 'Erro');
    }
  };

  const handleEditTp = (pkg: any) => {
    setEditingTp(pkg);
    setTpTitle(pkg.title);
    setTpTokens(String(pkg.tokens));
    setTpBonus(String(pkg.bonus || 0));
    setTpPrice(String(pkg.price));
    setShowTpForm(true);
  };

  const handleApproveWithdrawal = async (estId: string, amount: number) => {
    if (typeof window !== 'undefined') {
      if (!window.confirm(`Aprovar saque de R$ ${amount.toFixed(2).replace('.', ',')}?`)) return;
    }
    setApprovingId(estId);
    try {
      await api.approveWithdrawal(estId, amount);
      fetchWithdrawals();
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(err.message || 'Erro ao aprovar saque');
    } finally {
      setApprovingId(null);
    }
  };

  const handleToggleBlock = async (userId: string, currentBlocked: boolean) => {
    const action = currentBlocked ? 'desbloquear' : 'bloquear';
    if (typeof window !== 'undefined') {
      if (!window.confirm(`Deseja ${action} este usuario?`)) return;
    }
    setTogglingUserId(userId);
    try {
      await api.toggleBlockUser(userId, !currentBlocked);
      setUsersList(prev => prev.map(u =>
        u.user_id === userId ? { ...u, blocked: !currentBlocked } : u
      ));
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(err.message || 'Erro');
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleAddMedia = async () => {
    if (!newMediaUrl.trim()) return;
    setAddingMedia(true);
    try {
      await api.addMedia(newMediaUrl.trim(), newMediaTitle.trim(), newMediaType);
      setNewMediaUrl('');
      setNewMediaTitle('');
      fetchMedia();
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(err.message || 'Erro ao adicionar midia');
    } finally {
      setAddingMedia(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (typeof window !== 'undefined') {
      if (!window.confirm('Remover esta midia?')) return;
    }
    setDeletingMediaId(mediaId);
    try {
      await api.deleteMedia(mediaId);
      setMediaList(prev => prev.filter(m => m.media_id !== mediaId));
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(err.message || 'Erro');
    } finally {
      setDeletingMediaId(null);
    }
  };

  const handleGenerateImage = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingImage(true);
    try {
      const result = await api.generateMediaImage(aiPrompt.trim(), newMediaTitle.trim() || undefined);
      setAiPrompt('');
      setNewMediaTitle('');
      fetchMedia();
      if (typeof window !== 'undefined') window.alert('Imagem gerada com sucesso!');
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(err.message || 'Erro ao gerar imagem');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleGenerateText = async () => {
    setGeneratingText(true);
    try {
      const result = await api.generateEngagementText(newMediaTitle.trim() || undefined);
      setNewMediaTitle(result.text);
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(err.message || 'Erro ao gerar texto');
    } finally {
      setGeneratingText(false);
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
          {(['overview', 'financial', 'withdrawals', 'users', 'media'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              data-testid={`admin-tab-${tab}`}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'overview' ? 'Geral' : tab === 'financial' ? 'Financ.' : tab === 'withdrawals' ? 'Saques' : tab === 'users' ? 'Usuarios' : 'Midias'}
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

                {/* Token Package Management */}
                <Text style={[styles.sectionTitle, { marginTop: 28 }]} data-testid="token-packages-section-title">Gestao de Pacotes de Tokens</Text>
                <View style={styles.configCard} data-testid="token-packages-config">
                  <View style={styles.configHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="pricetags" size={20} color="#D97706" />
                    </View>
                    <View style={styles.configTitleWrap}>
                      <Text style={styles.configTitle}>Pacotes Dinamicos</Text>
                      <Text style={styles.configDesc}>Configure precos, tokens e bonus para os clientes</Text>
                    </View>
                  </View>

                  {/* Add/Edit Form Toggle */}
                  {!showTpForm ? (
                    <TouchableOpacity
                      style={[styles.configSaveBtn, { marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 16 }]}
                      onPress={() => { resetTpForm(); setShowTpForm(true); }}
                      data-testid="add-token-package-btn"
                    >
                      <Text style={styles.configSaveBtnText}>+ Novo Pacote</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ marginTop: 12, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' }} data-testid="token-package-form">
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 8 }}>
                        {editingTp ? 'Editar Pacote' : 'Novo Pacote'}
                      </Text>
                      <TextInput
                        style={styles.tpInput}
                        value={tpTitle}
                        onChangeText={setTpTitle}
                        placeholder="Titulo (ex: Promocao de Boas-vindas)"
                        placeholderTextColor="#94A3B8"
                        data-testid="tp-title-input"
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                          style={[styles.tpInput, { flex: 1 }]}
                          value={tpTokens}
                          onChangeText={setTpTokens}
                          placeholder="Tokens (ex: 10)"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          data-testid="tp-tokens-input"
                        />
                        <TextInput
                          style={[styles.tpInput, { flex: 1 }]}
                          value={tpBonus}
                          onChangeText={setTpBonus}
                          placeholder="Bonus (ex: 5)"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          data-testid="tp-bonus-input"
                        />
                      </View>
                      <TextInput
                        style={styles.tpInput}
                        value={tpPrice}
                        onChangeText={setTpPrice}
                        placeholder="Preco em R$ (ex: 9.99)"
                        placeholderTextColor="#94A3B8"
                        keyboardType="decimal-pad"
                        data-testid="tp-price-input"
                      />
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        <TouchableOpacity
                          style={[styles.configSaveBtn, tpSaving && styles.configSaveBtnDisabled]}
                          onPress={handleSaveTokenPackage}
                          disabled={tpSaving}
                          data-testid="tp-save-btn"
                        >
                          {tpSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.configSaveBtnText}>Salvar</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.configSaveBtn, { backgroundColor: '#94A3B8' }]}
                          onPress={resetTpForm}
                          data-testid="tp-cancel-btn"
                        >
                          <Text style={styles.configSaveBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Package List */}
                  {tpLoading ? (
                    <ActivityIndicator style={{ marginTop: 16 }} color="#3B82F6" />
                  ) : tokenPackages.length === 0 ? (
                    <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 12, fontStyle: 'italic' }}>
                      Nenhum pacote configurado. Crie o primeiro!
                    </Text>
                  ) : (
                    <View style={{ marginTop: 12, gap: 8 }}>
                      {tokenPackages.map((pkg) => (
                        <View key={pkg.config_id} style={{
                          backgroundColor: pkg.active ? '#F0FDF4' : '#FEF2F2',
                          borderRadius: 10, padding: 12, borderWidth: 1,
                          borderColor: pkg.active ? '#BBF7D0' : '#FECACA',
                        }} data-testid={`tp-item-${pkg.config_id}`}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B' }}>{pkg.title}</Text>
                              <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                                {pkg.tokens} tokens{pkg.bonus > 0 ? ` + ${pkg.bonus} bonus` : ''} — R$ {pkg.price.toFixed(2).replace('.', ',')}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                              <TouchableOpacity
                                onPress={() => handleToggleTpActive(pkg)}
                                style={{
                                  paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
                                  backgroundColor: pkg.active ? '#EF4444' : '#10B981',
                                }}
                                disabled={togglingTpId === pkg.config_id}
                                data-testid={`tp-toggle-${pkg.config_id}`}
                              >
                                {togglingTpId === pkg.config_id ? (
                                  <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>
                                    {pkg.active ? 'Desativar' : 'Ativar'}
                                  </Text>
                                )}
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleEditTp(pkg)}
                                style={{ padding: 6 }}
                                data-testid={`tp-edit-${pkg.config_id}`}
                              >
                                <Ionicons name="pencil" size={16} color="#3B82F6" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleDeleteTp(pkg.config_id)}
                                style={{ padding: 6 }}
                                data-testid={`tp-delete-${pkg.config_id}`}
                              >
                                <Ionicons name="trash" size={16} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          </View>
                          {pkg.bonus > 0 && (
                            <View style={{
                              backgroundColor: '#FEF3C7', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2,
                              alignSelf: 'flex-start', marginTop: 6,
                            }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E' }}>+{pkg.bonus} GRATIS</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Commission Rule Reminder */}
                  <View style={{ marginTop: 16, backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BFDBFE' }}>
                    <Text style={{ fontSize: 12, color: '#1E40AF', fontWeight: '600' }}>
                      Regra de Comissao Ativa: R$ 3,00 por venda (R$ 1,00 por nivel, 3 niveis)
                    </Text>
                    <Text style={{ fontSize: 11, color: '#3B82F6', marginTop: 2 }}>
                      Independente do preco do pacote, a comissao de R$ 3,00 e distribuida automaticamente.
                    </Text>
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

        {activeTab === 'withdrawals' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Solicitacoes de Saque</Text>
            {withdrawalsLoading ? (
              <View style={styles.financialLoading}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            ) : withdrawals.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                <Text style={styles.emptyText}>Nenhum saque pendente</Text>
              </View>
            ) : (
              withdrawals.map((wd) => (
                <View key={wd.establishment_id} style={styles.withdrawalCard} data-testid={`withdrawal-${wd.establishment_id}`}>
                  <View style={styles.withdrawalTop}>
                    <View style={styles.withdrawalInfo}>
                      <Text style={styles.withdrawalName}>{wd.name}</Text>
                      {wd.city ? <Text style={styles.withdrawalCity}>{wd.city}</Text> : null}
                    </View>
                    <View style={styles.withdrawalAmountWrap}>
                      <Text style={styles.withdrawalAmount}>
                        R$ {(wd.withdrawable_balance || 0).toFixed(2).replace('.', ',')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.withdrawalMeta}>
                    <View style={styles.withdrawalPixRow}>
                      <Ionicons name="key" size={14} color="#64748B" />
                      <Text style={styles.withdrawalPixLabel}>Chave PIX:</Text>
                      <Text style={styles.withdrawalPixValue}>
                        {wd.pix_key || 'Nao cadastrada'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.approveBtn, approvingId === wd.establishment_id && styles.approveBtnDisabled]}
                    onPress={() => handleApproveWithdrawal(wd.establishment_id, wd.withdrawable_balance)}
                    disabled={approvingId === wd.establishment_id}
                    data-testid={`approve-withdrawal-${wd.establishment_id}`}
                  >
                    {approvingId === wd.establishment_id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                        <Text style={styles.approveBtnText}>Aprovar Saque</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'users' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Listagem de Usuarios</Text>
            {usersLoading ? (
              <View style={styles.financialLoading}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            ) : usersList.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="people-outline" size={32} color="#CBD5E1" />
                <Text style={styles.emptyText}>Nenhum usuario encontrado</Text>
              </View>
            ) : (
              <>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Nome</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 2 }]}>E-mail</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Tipo</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Acao</Text>
                </View>
                {/* Table Rows */}
                {usersList.map((u) => (
                  <View key={u.user_id} style={styles.tableRow} data-testid={`user-row-${u.user_id}`}>
                    <Text style={[styles.tableCell, { flex: 2, fontWeight: '600' }]} numberOfLines={1}>
                      {u.name || '—'}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 2, color: '#64748B' }]} numberOfLines={1}>
                      {u.email}
                    </Text>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <View style={[
                        styles.roleBadge,
                        u.role === 'establishment' ? styles.roleBadgeEst :
                        u.role === 'admin' ? styles.roleBadgeAdmin : styles.roleBadgeClient
                      ]}>
                        <Text style={[
                          styles.roleBadgeText,
                          u.role === 'establishment' ? { color: '#10B981' } :
                          u.role === 'admin' ? { color: '#8B5CF6' } : { color: '#3B82F6' }
                        ]}>
                          {u.role === 'establishment' ? 'Estab.' : u.role === 'admin' ? 'Admin' : 'Cliente'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <View style={[styles.statusBadge, u.blocked ? styles.statusBlocked : styles.statusActive]}>
                        <View style={[styles.statusDot, { backgroundColor: u.blocked ? '#EF4444' : '#10B981' }]} />
                        <Text style={[styles.statusText, { color: u.blocked ? '#EF4444' : '#10B981' }]}>
                          {u.blocked ? 'Inativo' : 'Ativo'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      {u.role !== 'admin' ? (
                        <TouchableOpacity
                          style={[styles.blockBtn, u.blocked ? styles.unblockBtn : {}]}
                          onPress={() => handleToggleBlock(u.user_id, u.blocked)}
                          disabled={togglingUserId === u.user_id}
                          data-testid={`block-user-${u.user_id}`}
                        >
                          {togglingUserId === u.user_id ? (
                            <ActivityIndicator size="small" color={u.blocked ? '#10B981' : '#EF4444'} />
                          ) : (
                            <Ionicons
                              name={u.blocked ? 'lock-open' : 'lock-closed'}
                              size={15}
                              color={u.blocked ? '#10B981' : '#EF4444'}
                            />
                          )}
                        </TouchableOpacity>
                      ) : (
                        <Ionicons name="shield" size={16} color="#8B5CF6" />
                      )}
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {activeTab === 'media' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gestao de Midias</Text>
            
            {/* Add Media Form */}
            <View style={styles.mediaForm} data-testid="admin-media-form">
              <View style={styles.mediaTitleRow}>
                <TextInput
                  style={[styles.mediaInput, { flex: 1 }]}
                  value={newMediaTitle}
                  onChangeText={setNewMediaTitle}
                  placeholder="Titulo / Descricao"
                  placeholderTextColor="#94A3B8"
                  data-testid="media-title-input"
                />
                <TouchableOpacity
                  style={[styles.magicBtn, generatingText && { opacity: 0.5 }]}
                  onPress={handleGenerateText}
                  disabled={generatingText}
                  data-testid="ai-text-btn"
                >
                  {generatingText ? (
                    <ActivityIndicator size="small" color="#8B5CF6" />
                  ) : (
                    <Ionicons name="sparkles" size={18} color="#8B5CF6" />
                  )}
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.mediaInput}
                value={newMediaUrl}
                onChangeText={setNewMediaUrl}
                placeholder="URL da imagem ou video (opcional se gerar com IA)"
                placeholderTextColor="#94A3B8"
                data-testid="media-url-input"
              />

              <View style={styles.mediaTypeRow}>
                <TouchableOpacity
                  style={[styles.mediaTypeBtn, newMediaType === 'image' && styles.mediaTypeBtnActive]}
                  onPress={() => setNewMediaType('image')}
                >
                  <Ionicons name="image" size={16} color={newMediaType === 'image' ? '#FFF' : '#64748B'} />
                  <Text style={[styles.mediaTypeBtnText, newMediaType === 'image' && { color: '#FFF' }]}>Imagem</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mediaTypeBtn, newMediaType === 'video' && styles.mediaTypeBtnActive]}
                  onPress={() => setNewMediaType('video')}
                >
                  <Ionicons name="videocam" size={16} color={newMediaType === 'video' ? '#FFF' : '#64748B'} />
                  <Text style={[styles.mediaTypeBtnText, newMediaType === 'video' && { color: '#FFF' }]}>Video</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.mediaAddBtn, addingMedia && { opacity: 0.6 }]}
                onPress={handleAddMedia}
                disabled={addingMedia}
                data-testid="media-add-btn"
              >
                {addingMedia ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={18} color="#FFF" />
                    <Text style={styles.mediaAddBtnText}>Adicionar URL</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* AI Generation */}
              <View style={styles.aiSection}>
                <Text style={styles.aiSectionTitle}>Gerar com IA</Text>
                <TextInput
                  style={styles.mediaInput}
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                  placeholder="Descreva o tema da imagem (ex: Desconto de verao)"
                  placeholderTextColor="#94A3B8"
                  data-testid="ai-prompt-input"
                />
                <TouchableOpacity
                  style={[styles.aiGenerateBtn, generatingImage && { opacity: 0.6 }]}
                  onPress={handleGenerateImage}
                  disabled={generatingImage}
                  data-testid="ai-generate-image-btn"
                >
                  {generatingImage ? (
                    <>
                      <ActivityIndicator size="small" color="#FFF" />
                      <Text style={styles.aiGenerateBtnText}>Gerando imagem...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={18} color="#FFF" />
                      <Text style={styles.aiGenerateBtnText}>Gerar Imagem com IA</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Media List */}
            {mediaLoading ? (
              <View style={styles.financialLoading}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            ) : mediaList.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="images-outline" size={32} color="#CBD5E1" />
                <Text style={styles.emptyText}>Nenhuma midia cadastrada</Text>
              </View>
            ) : (
              mediaList.map((m) => (
                <View key={m.media_id} style={styles.mediaItem} data-testid={`admin-media-${m.media_id}`}>
                  <View style={styles.mediaItemLeft}>
                    <View style={[styles.mediaItemIcon, m.type === 'video' ? { backgroundColor: '#FEF2F2' } : { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name={m.type === 'video' ? 'videocam' : 'image'} size={18} color={m.type === 'video' ? '#EF4444' : '#3B82F6'} />
                    </View>
                    <View style={styles.mediaItemInfo}>
                      <Text style={styles.mediaItemTitle} numberOfLines={1}>{m.title}</Text>
                      <Text style={styles.mediaItemUrl} numberOfLines={1}>
                        {m.ai_generated ? 'Gerado por IA' : m.url?.substring(0, 40)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.mediaDeleteBtn}
                    onPress={() => handleDeleteMedia(m.media_id)}
                    disabled={deletingMediaId === m.media_id}
                    data-testid={`media-delete-${m.media_id}`}
                  >
                    {deletingMediaId === m.media_id ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )}
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
  tpInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 8,
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
  // Withdrawal styles
  withdrawalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  withdrawalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  withdrawalInfo: {
    flex: 1,
  },
  withdrawalName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  withdrawalCity: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  withdrawalAmountWrap: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  withdrawalAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
  },
  withdrawalMeta: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  withdrawalPixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  withdrawalPixLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  withdrawalPixValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
  },
  approveBtnDisabled: {
    opacity: 0.6,
  },
  approveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Users table styles
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableCell: {
    fontSize: 13,
    color: '#0F172A',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleBadgeClient: {
    backgroundColor: '#EFF6FF',
  },
  roleBadgeEst: {
    backgroundColor: '#ECFDF5',
  },
  roleBadgeAdmin: {
    backgroundColor: '#F5F3FF',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusActive: {},
  statusBlocked: {},
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  blockBtn: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  unblockBtn: {
    borderColor: '#D1FAE5',
    backgroundColor: '#ECFDF5',
  },
  // Media management styles
  mediaForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  mediaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  magicBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  mediaInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  mediaTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mediaTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  mediaTypeBtnActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  mediaTypeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  mediaAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
  },
  mediaAddBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiSection: {
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  aiSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  aiGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 10,
  },
  aiGenerateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mediaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  mediaItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mediaItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaItemInfo: {
    flex: 1,
  },
  mediaItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  mediaItemUrl: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  mediaDeleteBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
});

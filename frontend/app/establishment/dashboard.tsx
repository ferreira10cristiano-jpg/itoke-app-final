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
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/lib/api';
import { Establishment, Offer } from '../../src/types';

const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (typeof window !== 'undefined') {
    window.alert(`${title}\n${message}`);
    onOk?.();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
};

const PIX_KEY_TYPES = [
  { id: 'cpf_cnpj', label: 'CPF/CNPJ' },
  { id: 'email', label: 'E-mail' },
  { id: 'phone', label: 'Telefone' },
  { id: 'random', label: 'Chave Aleatória' },
];

export default function EstablishmentDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, refreshUser } = useAuthStore();
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Withdrawal modal
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<'pix' | 'confirm'>('pix');
  const [pixForm, setPixForm] = useState({
    key_type: '',
    key: '',
    holder_name: '',
    bank: '',
  });
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validators
  const [validators, setValidators] = useState<any[]>([]);

  // Token balance
  const [tokenInfo, setTokenInfo] = useState({ total_balance: 0, allocated: 0, consumed: 0, available: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const est = await api.getMyEstablishment();
      setEstablishment(est);
      const [offersData, statsData, financial, tokens] = await Promise.all([
        api.getMyOffers(),
        api.getEstablishmentStats(est.establishment_id),
        api.getEstablishmentFinancial().catch(() => ({
          withdrawable_balance: 0, total_sales: 0, withdrawal_requests: [], pix_data: null
        })),
        api.getTokenBalance().catch(() => ({ total_balance: 0, allocated: 0, consumed: 0, available: 0 })),
      ]);
      setOffers(offersData);
      setStats(statsData.stats);
      setFinancialData(financial);
      setTokenInfo(tokens);

      // Load validators
      try {
        const vals = await api.getMyValidators();
        setValidators(vals);
      } catch { setValidators([]); }

      // Pre-fill PIX data if available
      if (financial?.pix_data) {
        setPixForm({
          key_type: financial.pix_data.key_type || '',
          key: financial.pix_data.key || '',
          holder_name: financial.pix_data.holder_name || '',
          bank: financial.pix_data.bank || '',
        });
      }
    } catch (error: any) {
      if (error.message?.includes('No establishment') || error.message?.includes('not found')) {
        // Check if user explicitly needs to register vs. session desync
        if (user?.role === 'establishment') {
          // User IS establishment role but no establishment found - likely first time
          router.replace('/establishment/register');
        } else {
          console.warn('Dashboard: establishment not found for user', user?.user_id);
        }
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
    if (typeof window !== 'undefined') {
      if (window.confirm('Tem certeza que deseja sair?')) {
        logout().then(() => { window.location.href = '/'; });
      }
    } else {
      Alert.alert('Sair', 'Tem certeza que deseja sair?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } },
      ]);
    }
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined') {
      logout().then(() => { window.location.href = '/'; });
    } else {
      logout().then(() => { router.replace('/'); });
    }
  };

  const openWithdrawModal = () => {
    const balance = financialData?.withdrawable_balance || 0;
    if (balance <= 0) {
      showAlert('Sem saldo', 'Você não possui saldo disponível para saque.');
      return;
    }

    // Check for pending requests
    const pending = financialData?.withdrawal_requests?.find((r: any) => r.status === 'pending');
    if (pending) {
      showAlert('Solicitação pendente', `Você já possui uma solicitação de saque de R$ ${pending.amount.toFixed(2).replace('.', ',')} aguardando aprovação.`);
      return;
    }

    setWithdrawAmount(balance.toFixed(2));

    // If PIX data already exists, go straight to confirm
    if (financialData?.pix_data?.key) {
      setWithdrawStep('confirm');
    } else {
      setWithdrawStep('pix');
    }
    setShowWithdrawModal(true);
  };

  const handleSavePixAndContinue = async () => {
    if (!pixForm.key_type || !pixForm.key || !pixForm.holder_name || !pixForm.bank) {
      showAlert('Atenção', 'Preencha todos os dados PIX.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.updatePixData(pixForm);
      setWithdrawStep('confirm');
    } catch (error: any) {
      showAlert('Erro', error.message || 'Falha ao salvar dados PIX');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmWithdraw = async () => {
    const amount = parseFloat(withdrawAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      showAlert('Erro', 'Valor inválido');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.requestWithdrawal(amount);
      showAlert('Solicitação enviada!', res.message || 'Aguarde a aprovação do administrador.');
      setShowWithdrawModal(false);
      await loadData();
    } catch (error: any) {
      showAlert('Erro', error.message || 'Falha ao solicitar saque');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const balance = financialData?.withdrawable_balance || 0;
  const pendingRequest = financialData?.withdrawal_requests?.find((r: any) => r.status === 'pending');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" colors={['#10B981']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{establishment?.business_name || 'Estabelecimento'}</Text>
            <Text style={styles.subtitle}>Dashboard</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Token Balance Card */}
        <View style={styles.section}>
          <View style={[styles.creditCard, { borderColor: '#F59E0B33' }]}>
            <View style={styles.creditHeader}>
              <Ionicons name="flash" size={28} color="#F59E0B" />
              <Text style={styles.creditTitle}>Saldo de Tokens</Text>
            </View>
            <Text style={[styles.creditBalance, { color: '#F59E0B' }]}>
              {tokenInfo.available} disponíveis
            </Text>
            <Text style={styles.creditSub}>
              {tokenInfo.allocated} alocados em ofertas · {tokenInfo.consumed} consumidos
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#F59E0B', paddingVertical: 10, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                onPress={() => router.push('/establishment/packages')}
              >
                <Ionicons name="bag-add" size={16} color="#0F172A" />
                <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 13 }}>Comprar Tokens</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', paddingVertical: 10, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                onPress={() => router.push('/faq')}
              >
                <Ionicons name="help-circle" size={16} color="#94A3B8" />
                <Text style={{ color: '#94A3B8', fontWeight: '700', fontSize: 13 }}>Como Usar</Text>
              </TouchableOpacity>
            </View>
          </View>
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

        {/* Créditos Recebidos */}
        <View style={styles.section}>
          <View style={styles.creditCard}>
            <View style={styles.creditHeader}>
              <Ionicons name="wallet" size={28} color="#10B981" />
              <Text style={styles.creditTitle}>Créditos Recebidos</Text>
            </View>
            <Text style={styles.creditSubtitle}>Saldo para Saque</Text>
            <Text style={styles.creditValue}>
              R$ {balance.toFixed(2).replace('.', ',')}
            </Text>
            <Text style={styles.creditInfo}>
              Recebido de {stats?.total_sales || 0} validações de QR Code
            </Text>

            {pendingRequest && (
              <View style={styles.pendingBadge}>
                <Ionicons name="time" size={16} color="#F59E0B" />
                <Text style={styles.pendingText}>
                  Saque de R$ {pendingRequest.amount.toFixed(2).replace('.', ',')} pendente
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.withdrawBtn, balance <= 0 && styles.withdrawBtnDisabled]}
              onPress={openWithdrawModal}
              activeOpacity={0.8}
            >
              <Ionicons name="cash-outline" size={18} color={balance > 0 ? '#0F172A' : '#64748B'} />
              <Text style={[styles.withdrawBtnText, balance <= 0 && styles.withdrawBtnTextDisabled]}>
                Solicitar Resgate
              </Text>
            </TouchableOpacity>
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
              <Text style={styles.actionSub}>
                {offers.length === 0 ? 'Crie sua primeira oferta!' : `${offers.length} oferta${offers.length > 1 ? 's' : ''} ativa${offers.length > 1 ? 's' : ''}`}
              </Text>
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

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/establishment/team')}>
            <View style={[styles.actionIcon, { backgroundColor: '#3B1F6E' }]}>
              <Ionicons name="people" size={24} color="#A78BFA" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Equipe / Validadores</Text>
              <Text style={styles.actionSub}>
                {validators.length === 0 ? 'Convide seus colaboradores' : `${validators.length} colaborador${validators.length > 1 ? 'es' : ''}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/establishment/reports')}>
            <View style={[styles.actionIcon, { backgroundColor: '#7C3A1A' }]}>
              <Ionicons name="bar-chart" size={24} color="#F59E0B" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Relatório Financeiro</Text>
              <Text style={styles.actionSub}>Vendas, créditos e desempenho</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/establishment/profile')}>
            <View style={[styles.actionIcon, { backgroundColor: '#3B1F6E' }]}>
              <Ionicons name="person-circle-outline" size={24} color="#A78BFA" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Meu Perfil</Text>
              <Text style={styles.actionSub}>Editar dados, CEP e categoria</Text>
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

      {/* Withdrawal Modal */}
      <Modal visible={showWithdrawModal} transparent animationType="slide" onRequestClose={() => setShowWithdrawModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowWithdrawModal(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {withdrawStep === 'pix' ? 'Dados Bancários (PIX)' : 'Confirmar Resgate'}
              </Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {withdrawStep === 'pix' ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalDesc}>
                  Para receber seu saque, preencha seus dados PIX abaixo.
                </Text>

                <Text style={styles.fieldLabel}>Tipo de Chave Pix *</Text>
                <View style={styles.pixTypeRow}>
                  {PIX_KEY_TYPES.map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.pixTypeChip, pixForm.key_type === t.id && styles.pixTypeChipActive]}
                      onPress={() => setPixForm(p => ({ ...p, key_type: t.id }))}
                    >
                      <Text style={[styles.pixTypeText, pixForm.key_type === t.id && styles.pixTypeTextActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Chave Pix *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Digite sua chave Pix"
                  placeholderTextColor="#64748B"
                  value={pixForm.key}
                  onChangeText={v => setPixForm(p => ({ ...p, key: v }))}
                />

                <Text style={styles.fieldLabel}>Nome do Titular *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nome completo do titular"
                  placeholderTextColor="#64748B"
                  value={pixForm.holder_name}
                  onChangeText={v => setPixForm(p => ({ ...p, holder_name: v }))}
                />

                <Text style={styles.fieldLabel}>Banco *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Nubank, Itaú, Bradesco..."
                  placeholderTextColor="#64748B"
                  value={pixForm.bank}
                  onChangeText={v => setPixForm(p => ({ ...p, bank: v }))}
                />

                <TouchableOpacity
                  style={[styles.confirmBtn, isSubmitting && { opacity: 0.6 }]}
                  onPress={handleSavePixAndContinue}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#0F172A" />
                  ) : (
                    <>
                      <Text style={styles.confirmBtnText}>Salvar e Continuar</Text>
                      <Ionicons name="arrow-forward" size={18} color="#0F172A" />
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View>
                <View style={styles.confirmCard}>
                  <Text style={styles.confirmLabel}>Valor do Resgate</Text>
                  <Text style={styles.confirmValue}>
                    R$ {parseFloat(withdrawAmount).toFixed(2).replace('.', ',')}
                  </Text>
                </View>

                <View style={styles.pixSummary}>
                  <Text style={styles.pixSummaryTitle}>Dados PIX</Text>
                  <View style={styles.pixSummaryRow}>
                    <Text style={styles.pixSummaryLabel}>Chave:</Text>
                    <Text style={styles.pixSummaryValue}>{pixForm.key}</Text>
                  </View>
                  <View style={styles.pixSummaryRow}>
                    <Text style={styles.pixSummaryLabel}>Titular:</Text>
                    <Text style={styles.pixSummaryValue}>{pixForm.holder_name}</Text>
                  </View>
                  <View style={styles.pixSummaryRow}>
                    <Text style={styles.pixSummaryLabel}>Banco:</Text>
                    <Text style={styles.pixSummaryValue}>{pixForm.bank}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.editPixBtn}
                  onPress={() => setWithdrawStep('pix')}
                >
                  <Ionicons name="create-outline" size={16} color="#3B82F6" />
                  <Text style={styles.editPixBtnText}>Editar dados PIX</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmBtn, isSubmitting && { opacity: 0.6 }]}
                  onPress={handleConfirmWithdraw}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#0F172A" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#0F172A" />
                      <Text style={styles.confirmBtnText}>Confirmar Resgate</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
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

  // Credit Card
  creditCard: { backgroundColor: '#064E3B', padding: 20, borderRadius: 16, borderWidth: 2, borderColor: '#10B981' },
  creditHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  creditTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  creditSubtitle: { fontSize: 13, color: '#6EE7B7', marginBottom: 8 },
  creditBalance: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  creditSub: { fontSize: 13, color: '#94A3B8' },
  creditValue: { fontSize: 32, fontWeight: '800', color: '#10B981', marginBottom: 8 },
  creditInfo: { fontSize: 12, color: '#A7F3D0' },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#78350F', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 12 },
  pendingText: { fontSize: 13, color: '#FDE68A', fontWeight: '600' },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 12, marginTop: 16 },
  withdrawBtnDisabled: { backgroundColor: '#334155', opacity: 0.6 },
  withdrawBtnText: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  withdrawBtnTextDisabled: { color: '#64748B' },

  // Action Card
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  actionIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  actionSub: { fontSize: 13, color: '#64748B', marginTop: 2 },

  // Offers
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

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  modalDesc: { fontSize: 14, color: '#94A3B8', marginBottom: 20, lineHeight: 20 },

  // Form fields
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#CBD5E1', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#0F172A', color: '#FFF', borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  pixTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pixTypeChip: { backgroundColor: '#0F172A', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  pixTypeChipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  pixTypeText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  pixTypeTextActive: { color: '#0F172A', fontWeight: '700' },

  // Confirm
  confirmCard: { backgroundColor: '#064E3B', padding: 20, borderRadius: 14, alignItems: 'center', marginBottom: 16 },
  confirmLabel: { fontSize: 13, color: '#6EE7B7', marginBottom: 4 },
  confirmValue: { fontSize: 32, fontWeight: '800', color: '#10B981' },
  pixSummary: { backgroundColor: '#0F172A', padding: 16, borderRadius: 12, marginBottom: 12 },
  pixSummaryTitle: { fontSize: 14, fontWeight: '700', color: '#FFF', marginBottom: 10 },
  pixSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  pixSummaryLabel: { fontSize: 13, color: '#64748B' },
  pixSummaryValue: { fontSize: 13, color: '#CBD5E1', fontWeight: '600' },
  editPixBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginBottom: 8 },
  editPixBtnText: { fontSize: 13, color: '#3B82F6', fontWeight: '600' },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12, marginTop: 16, marginBottom: 10 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

  // Team/Validators
  copyLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1E3A5F', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#3B82F6' },
  copyLinkText: { fontSize: 14, fontWeight: '600', color: '#93C5FD' },
  copyLinkSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  validatorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  validatorBlocked: { opacity: 0.6, borderColor: '#EF4444' },
  validatorName: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  validatorInfo: { fontSize: 12, color: '#64748B', marginTop: 2 },
  blockBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7F1D1D', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  unblockBtn: { backgroundColor: '#064E3B' },
  blockBtnText: { fontSize: 12, fontWeight: '600', color: '#FCA5A5' },
  unblockBtnText: { color: '#6EE7B7' },
});

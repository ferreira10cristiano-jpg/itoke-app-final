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
  { id: 'random', label: 'Chave Aleatoria' },
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
  const [pixForm, setPixForm] = useState({ key_type: '', key: '', holder_name: '', bank: '' });
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validators
  const [validators, setValidators] = useState<any[]>([]);

  // Token balance
  const [tokenInfo, setTokenInfo] = useState({ total_balance: 0, allocated: 0, consumed: 0, available: 0 });

  // Onboarding modal
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0); // 0=welcome, 1-3=videos, 4=congrats
  const [onboardingVideos, setOnboardingVideos] = useState<any[]>([]);

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

      try { const vals = await api.getMyValidators(); setValidators(vals); } catch { setValidators([]); }

      if (financial?.pix_data) {
        setPixForm({
          key_type: financial.pix_data.key_type || '',
          key: financial.pix_data.key || '',
          holder_name: financial.pix_data.holder_name || '',
          bank: financial.pix_data.bank || '',
        });
      }

      // Check onboarding
      if (!est.has_seen_onboarding) {
        try {
          const videos = await api.getOnboardingVideos('establishment');
          if (videos.length > 0) {
            setOnboardingVideos(videos);
            setShowOnboarding(true);
            setOnboardingStep(0);
          }
        } catch { /* ignore */ }
      }
    } catch (error: any) {
      if (error.message?.includes('No establishment') || error.message?.includes('not found')) {
        if (user?.role === 'establishment') {
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
      showAlert('Sem saldo', 'Voce nao possui saldo disponivel para saque.');
      return;
    }
    const pending = financialData?.withdrawal_requests?.find((r: any) => r.status === 'pending');
    if (pending) {
      showAlert('Solicitacao pendente', `Voce ja possui uma solicitacao de saque de R$ ${pending.amount.toFixed(2).replace('.', ',')} aguardando aprovacao.`);
      return;
    }
    setWithdrawAmount(balance.toFixed(2));
    if (financialData?.pix_data?.key) {
      setWithdrawStep('confirm');
    } else {
      setWithdrawStep('pix');
    }
    setShowWithdrawModal(true);
  };

  const handleSavePixAndContinue = async () => {
    if (!pixForm.key_type || !pixForm.key || !pixForm.holder_name || !pixForm.bank) {
      showAlert('Atencao', 'Preencha todos os dados PIX.');
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
      showAlert('Erro', 'Valor invalido');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.requestWithdrawal(amount);
      showAlert('Solicitacao enviada!', res.message || 'Aguarde a aprovacao do administrador.');
      setShowWithdrawModal(false);
      await loadData();
    } catch (error: any) {
      showAlert('Erro', error.message || 'Falha ao solicitar saque');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Onboarding handlers
  const handleOnboardingNext = () => {
    if (onboardingStep < onboardingVideos.length) {
      setOnboardingStep(prev => prev + 1);
    } else {
      handleOnboardingFinish();
    }
  };

  const handleOnboardingSkip = () => {
    handleOnboardingFinish();
  };

  const handleOnboardingFinish = async () => {
    setShowOnboarding(false);
    try { await api.markOnboardingSeen(); } catch { /* ignore */ }
  };

  if (isLoading) {
    return (
      <View style={[s.container, s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  const balance = financialData?.withdrawable_balance || 0;
  const pendingRequest = financialData?.withdrawal_requests?.find((r: any) => r.status === 'pending');

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" colors={['#F59E0B']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={handleGoBack} style={s.backButton} data-testid="dashboard-back-btn">
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={s.headerContent}>
            <Text style={s.title}>{establishment?.business_name || 'Estabelecimento'}</Text>
            <Text style={s.subtitle}>Dashboard</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} data-testid="dashboard-logout-btn">
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Centro de Aprendizado */}
        <View style={s.learningSection} data-testid="learning-center">
          <View style={s.learningCard}>
            <View style={s.learningHeader}>
              <View style={s.learningIconWrap}>
                <Ionicons name="bulb" size={22} color="#FCD34D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.learningTitle}>Centro de Aprendizado</Text>
                <Text style={s.learningSub}>Aprenda como usar tokens e maximizar suas vendas!</Text>
              </View>
            </View>
            <TouchableOpacity
              style={s.learningBtn}
              onPress={() => router.push('/establishment/help')}
              activeOpacity={0.7}
              data-testid="learning-center-btn"
            >
              <Ionicons name="play-circle" size={22} color="#1B3A5C" />
              <Text style={s.learningBtnText}>Como Usar - Assista aos Videos</Text>
              <Ionicons name="arrow-forward" size={18} color="#1B3A5C" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Token Balance Card */}
        <View style={s.section}>
          <View style={s.tokenCard} data-testid="token-balance-card">
            <View style={s.tokenHeader}>
              <Ionicons name="flash" size={28} color="#F59E0B" />
              <Text style={s.tokenTitle}>Saldo de Tokens</Text>
            </View>
            <Text style={s.tokenBalance}>{tokenInfo.available} disponiveis</Text>
            <Text style={s.tokenSub}>
              {tokenInfo.allocated} alocados em ofertas  ·  {tokenInfo.consumed} consumidos
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={s.tokenBuyBtn}
                onPress={() => router.push('/establishment/packages')}
                data-testid="buy-tokens-btn"
              >
                <Ionicons name="bag-add" size={16} color="#1B3A5C" />
                <Text style={s.tokenBuyBtnText}>Comprar Tokens</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <Ionicons name="eye" size={24} color="#3B82F6" />
            <Text style={s.statValue}>{stats?.total_views || 0}</Text>
            <Text style={s.statLabel}>Visualizacoes</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons name="qr-code" size={24} color="#10B981" />
            <Text style={s.statValue}>{stats?.total_qr_generated || 0}</Text>
            <Text style={s.statLabel}>QR Gerados</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons name="cart" size={24} color="#F59E0B" />
            <Text style={s.statValue}>{stats?.total_sales || 0}</Text>
            <Text style={s.statLabel}>Vendas</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons name="pricetags" size={24} color="#8B5CF6" />
            <Text style={s.statValue}>{offers.length}</Text>
            <Text style={s.statLabel}>Ofertas</Text>
          </View>
        </View>

        {/* Creditos Recebidos */}
        <View style={s.section}>
          <View style={s.creditCard} data-testid="credit-balance-card">
            <View style={s.creditHeader}>
              <Ionicons name="wallet" size={28} color="#10B981" />
              <Text style={s.creditTitle}>Creditos Recebidos</Text>
            </View>
            <Text style={s.creditSubtitle}>Saldo para Saque</Text>
            <Text style={s.creditValue}>R$ {balance.toFixed(2).replace('.', ',')}</Text>
            <Text style={s.creditInfo}>Recebido de {stats?.total_sales || 0} validacoes de QR Code</Text>

            {pendingRequest && (
              <View style={s.pendingBadge}>
                <Ionicons name="time" size={16} color="#F59E0B" />
                <Text style={s.pendingText}>
                  Saque de R$ {pendingRequest.amount.toFixed(2).replace('.', ',')} pendente
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.withdrawBtn, balance <= 0 && s.withdrawBtnDisabled]}
              onPress={openWithdrawModal}
              activeOpacity={0.8}
              data-testid="withdraw-btn"
            >
              <Ionicons name="cash-outline" size={18} color={balance > 0 ? '#1B3A5C' : '#64748B'} />
              <Text style={[s.withdrawBtnText, balance <= 0 && s.withdrawBtnTextDisabled]}>
                Solicitar Resgate
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Acoes Rapidas</Text>

          <TouchableOpacity style={s.actionCard} onPress={() => router.push('/establishment/offers')} data-testid="action-offers">
            <View style={[s.actionIcon, { backgroundColor: '#064E3B' }]}>
              <Ionicons name="add" size={24} color="#10B981" />
            </View>
            <View style={s.actionContent}>
              <Text style={s.actionTitle}>Criar / Gerenciar Ofertas</Text>
              <Text style={s.actionSub}>
                {offers.length === 0 ? 'Crie sua primeira oferta!' : `${offers.length} oferta${offers.length > 1 ? 's' : ''} ativa${offers.length > 1 ? 's' : ''}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#475569" />
          </TouchableOpacity>

          <TouchableOpacity style={s.actionCard} onPress={() => router.push('/establishment/validate')} data-testid="action-validate">
            <View style={[s.actionIcon, { backgroundColor: '#2E5A8F' }]}>
              <Ionicons name="scan" size={24} color="#3B82F6" />
            </View>
            <View style={s.actionContent}>
              <Text style={s.actionTitle}>Validar QR Code</Text>
              <Text style={s.actionSub}>Escanear codigo do cliente</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#475569" />
          </TouchableOpacity>

          <TouchableOpacity style={s.actionCard} onPress={() => router.push('/establishment/team')} data-testid="action-team">
            <View style={[s.actionIcon, { backgroundColor: '#3B1F6E' }]}>
              <Ionicons name="people" size={24} color="#A78BFA" />
            </View>
            <View style={s.actionContent}>
              <Text style={s.actionTitle}>Equipe / Validadores</Text>
              <Text style={s.actionSub}>
                {validators.length === 0 ? 'Convide seus colaboradores' : `${validators.length} colaborador${validators.length > 1 ? 'es' : ''}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#475569" />
          </TouchableOpacity>

          <TouchableOpacity style={s.actionCard} onPress={() => router.push('/establishment/reports')} data-testid="action-reports">
            <View style={[s.actionIcon, { backgroundColor: '#7C3A1A' }]}>
              <Ionicons name="bar-chart" size={24} color="#F59E0B" />
            </View>
            <View style={s.actionContent}>
              <Text style={s.actionTitle}>Relatorio Financeiro</Text>
              <Text style={s.actionSub}>Vendas, creditos e desempenho</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#475569" />
          </TouchableOpacity>

          <TouchableOpacity style={s.actionCard} onPress={() => router.push('/establishment/profile')} data-testid="action-profile">
            <View style={[s.actionIcon, { backgroundColor: '#3B1F6E' }]}>
              <Ionicons name="person-circle-outline" size={24} color="#A78BFA" />
            </View>
            <View style={s.actionContent}>
              <Text style={s.actionTitle}>Meu Perfil</Text>
              <Text style={s.actionSub}>Editar dados, CEP e categoria</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* Recent Offers */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Ofertas Recentes</Text>
            {offers.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/establishment/offers')}>
                <Text style={s.seeAll}>Ver todas</Text>
              </TouchableOpacity>
            )}
          </View>

          {offers.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="pricetags-outline" size={40} color="#334155" />
              <Text style={s.emptyText}>Nenhuma oferta criada</Text>
            </View>
          ) : (
            offers.slice(0, 3).map((offer) => (
              <View key={offer.offer_id} style={s.offerCard}>
                <View style={s.offerInfo}>
                  <Text style={s.offerTitle} numberOfLines={1}>{offer.title}</Text>
                  <View style={s.offerStats}>
                    <View style={s.offerStat}>
                      <Ionicons name="qr-code" size={14} color="#64748B" />
                      <Text style={s.offerStatText}>{offer.qr_generated} QR</Text>
                    </View>
                    <View style={s.offerStat}>
                      <Ionicons name="cart" size={14} color="#64748B" />
                      <Text style={s.offerStatText}>{offer.sales} vendas</Text>
                    </View>
                  </View>
                </View>
                <View style={s.offerDiscount}>
                  <Text style={s.discountText}>{offer.discount_value}%</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Withdrawal Modal */}
      <Modal visible={showWithdrawModal} transparent animationType="slide" onRequestClose={() => setShowWithdrawModal(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShowWithdrawModal(false)}>
          <Pressable style={s.modalContent} onPress={() => {}}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {withdrawStep === 'pix' ? 'Dados Bancarios (PIX)' : 'Confirmar Resgate'}
              </Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {withdrawStep === 'pix' ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.modalDesc}>
                  Para receber seu saque, preencha seus dados PIX abaixo.
                </Text>
                <Text style={s.fieldLabel}>Tipo de Chave Pix *</Text>
                <View style={s.pixTypeRow}>
                  {PIX_KEY_TYPES.map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={[s.pixTypeChip, pixForm.key_type === t.id && s.pixTypeChipActive]}
                      onPress={() => setPixForm(p => ({ ...p, key_type: t.id }))}
                    >
                      <Text style={[s.pixTypeText, pixForm.key_type === t.id && s.pixTypeTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.fieldLabel}>Chave Pix *</Text>
                <TextInput style={s.input} placeholder="Digite sua chave Pix" placeholderTextColor="#64748B" value={pixForm.key} onChangeText={v => setPixForm(p => ({ ...p, key: v }))} />
                <Text style={s.fieldLabel}>Nome do Titular *</Text>
                <TextInput style={s.input} placeholder="Nome completo do titular" placeholderTextColor="#64748B" value={pixForm.holder_name} onChangeText={v => setPixForm(p => ({ ...p, holder_name: v }))} />
                <Text style={s.fieldLabel}>Banco *</Text>
                <TextInput style={s.input} placeholder="Ex: Nubank, Itau, Bradesco..." placeholderTextColor="#64748B" value={pixForm.bank} onChangeText={v => setPixForm(p => ({ ...p, bank: v }))} />
                <TouchableOpacity style={[s.confirmBtn, isSubmitting && { opacity: 0.6 }]} onPress={handleSavePixAndContinue} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator size="small" color="#1B3A5C" /> : (
                    <>
                      <Text style={s.confirmBtnText}>Salvar e Continuar</Text>
                      <Ionicons name="arrow-forward" size={18} color="#1B3A5C" />
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View>
                <View style={s.confirmCard}>
                  <Text style={s.confirmLabel}>Valor do Resgate</Text>
                  <Text style={s.confirmValue}>R$ {parseFloat(withdrawAmount).toFixed(2).replace('.', ',')}</Text>
                </View>
                <View style={s.pixSummary}>
                  <Text style={s.pixSummaryTitle}>Dados PIX</Text>
                  <View style={s.pixSummaryRow}><Text style={s.pixSummaryLabel}>Chave:</Text><Text style={s.pixSummaryValue}>{pixForm.key}</Text></View>
                  <View style={s.pixSummaryRow}><Text style={s.pixSummaryLabel}>Titular:</Text><Text style={s.pixSummaryValue}>{pixForm.holder_name}</Text></View>
                  <View style={s.pixSummaryRow}><Text style={s.pixSummaryLabel}>Banco:</Text><Text style={s.pixSummaryValue}>{pixForm.bank}</Text></View>
                </View>
                <TouchableOpacity style={s.editPixBtn} onPress={() => setWithdrawStep('pix')}>
                  <Ionicons name="create-outline" size={16} color="#3B82F6" />
                  <Text style={s.editPixBtnText}>Editar dados PIX</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.confirmBtn, isSubmitting && { opacity: 0.6 }]} onPress={handleConfirmWithdraw} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator size="small" color="#1B3A5C" /> : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#1B3A5C" />
                      <Text style={s.confirmBtnText}>Confirmar Resgate</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Onboarding Modal */}
      <Modal visible={showOnboarding} transparent animationType="fade" onRequestClose={handleOnboardingSkip}>
        <Pressable style={s.onbOverlay} onPress={() => {}}>
          <View style={s.onbContent} data-testid="onboarding-modal">
            {onboardingStep === 0 && (
              <View style={s.onbWelcome}>
                <View style={s.onbWelcomeIcon}>
                  <Ionicons name="sparkles" size={48} color="#F59E0B" />
                </View>
                <Text style={s.onbWelcomeTitle}>Bem-vindo ao iToke!</Text>
                <Text style={s.onbWelcomeSub}>
                  Aprenda como usar tokens em {onboardingVideos.length} videos curtos
                </Text>
                <TouchableOpacity style={s.onbStartBtn} onPress={handleOnboardingNext} data-testid="onboarding-start-btn">
                  <Ionicons name="play-circle" size={22} color="#1B3A5C" />
                  <Text style={s.onbStartBtnText}>Comecar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.onbSkipBtn} onPress={handleOnboardingSkip} data-testid="onboarding-skip-btn">
                  <Text style={s.onbSkipBtnText}>Pular por enquanto</Text>
                </TouchableOpacity>
              </View>
            )}

            {onboardingStep > 0 && onboardingStep <= onboardingVideos.length && (
              <View style={s.onbVideo}>
                {/* Progress */}
                <View style={s.onbProgress}>
                  {onboardingVideos.map((_, i) => (
                    <View key={i} style={[s.onbProgressDot, i + 1 <= onboardingStep && s.onbProgressDotActive]} />
                  ))}
                </View>

                <Text style={s.onbVideoStep}>
                  Video {onboardingStep} de {onboardingVideos.length}
                </Text>
                <Text style={s.onbVideoTitle}>
                  {onboardingVideos[onboardingStep - 1]?.title}
                </Text>

                {/* Video Placeholder */}
                {onboardingVideos[onboardingStep - 1]?.video_url ? (
                  <View style={s.onbVideoEmbed}>
                    {typeof window !== 'undefined' && (
                      <iframe
                        src={convertToEmbed(onboardingVideos[onboardingStep - 1].video_url)}
                        style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
                        allowFullScreen
                      />
                    )}
                  </View>
                ) : (
                  <View style={s.onbVideoPlaceholder} data-testid={`onboarding-video-placeholder-${onboardingStep}`}>
                    <Ionicons name="play-circle" size={56} color="#475569" />
                    <Text style={s.onbPlaceholderText}>Video em breve</Text>
                    <Text style={s.onbPlaceholderSub}>Espaco reservado para video</Text>
                  </View>
                )}

                <Text style={s.onbVideoDesc}>
                  {onboardingVideos[onboardingStep - 1]?.description}
                </Text>

                <View style={s.onbBtnRow}>
                  <TouchableOpacity style={s.onbNextBtn} onPress={handleOnboardingNext} data-testid="onboarding-next-btn">
                    <Text style={s.onbNextBtnText}>
                      {onboardingStep === onboardingVideos.length ? 'Concluido' : 'Proximo'}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#1B3A5C" />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.onbSkipBtn} onPress={handleOnboardingSkip} data-testid="onboarding-skip-series-btn">
                    <Text style={s.onbSkipBtnText}>Pular Serie</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {onboardingStep > onboardingVideos.length && (
              <View style={s.onbCongrats}>
                <View style={s.onbCongratsIcon}>
                  <Ionicons name="trophy" size={48} color="#F59E0B" />
                </View>
                <Text style={s.onbCongratsTitle}>Parabens!</Text>
                <Text style={s.onbCongratsSub}>
                  Voce aprendeu o basico sobre tokens. Pode assistir novamente em "Como Usar".
                </Text>
                <TouchableOpacity style={s.onbStartBtn} onPress={handleOnboardingFinish} data-testid="onboarding-close-btn">
                  <Ionicons name="checkmark-circle" size={22} color="#1B3A5C" />
                  <Text style={s.onbStartBtnText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function convertToEmbed(url: string): string {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#DBEAFE' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { marginRight: 12 },
  headerContent: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  subtitle: { fontSize: 13, color: '#64748B' },

  // Learning Center
  learningSection: { paddingHorizontal: 20, marginTop: 4 },
  learningCard: { backgroundColor: '#22476B', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#2E5A8F' },
  learningHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  learningIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#78350F', justifyContent: 'center', alignItems: 'center' },
  learningTitle: { fontSize: 16, fontWeight: '700', color: '#FCD34D' },
  learningSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  learningBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 12 },
  learningBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  // Token Card
  section: { paddingHorizontal: 20, marginTop: 20 },
  tokenCard: { backgroundColor: '#22476B', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F59E0B33' },
  tokenHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  tokenTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  tokenBalance: { fontSize: 28, fontWeight: '800', color: '#F59E0B', marginBottom: 4 },
  tokenSub: { fontSize: 13, color: '#94A3B8' },
  tokenBuyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#F59E0B', paddingVertical: 10, borderRadius: 10 },
  tokenBuyBtnText: { color: '#1E293B', fontWeight: '700', fontSize: 13 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginTop: 16, gap: 8 },
  statCard: { width: '47%', backgroundColor: '#F1F5F9', padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1E293B', marginTop: 6 },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },

  // Credit Card
  creditCard: { backgroundColor: '#064E3B', padding: 20, borderRadius: 16, borderWidth: 2, borderColor: '#10B981' },
  creditHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  creditTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  creditSubtitle: { fontSize: 13, color: '#6EE7B7', marginBottom: 8 },
  creditValue: { fontSize: 32, fontWeight: '800', color: '#10B981', marginBottom: 8 },
  creditInfo: { fontSize: 12, color: '#A7F3D0' },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#78350F', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 12 },
  pendingText: { fontSize: 13, color: '#FDE68A', fontWeight: '600' },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 12, marginTop: 16 },
  withdrawBtnDisabled: { backgroundColor: '#E2E8F0', opacity: 0.6 },
  withdrawBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  withdrawBtnTextDisabled: { color: '#94A3B8' },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  seeAll: { fontSize: 13, fontWeight: '600', color: '#10B981' },

  // Action Card
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  actionIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  actionSub: { fontSize: 13, color: '#64748B', marginTop: 2 },

  // Offers
  offerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  offerInfo: { flex: 1 },
  offerTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  offerStats: { flexDirection: 'row', marginTop: 6, gap: 16 },
  offerStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offerStatText: { fontSize: 12, color: '#64748B' },
  offerDiscount: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  discountText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  emptyState: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#F1F5F9', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  emptyText: { fontSize: 14, color: '#64748B', marginTop: 10 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#22476B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  modalDesc: { fontSize: 14, color: '#94A3B8', marginBottom: 20, lineHeight: 20 },

  // Form
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#CBD5E1', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#1B3A5C', color: '#FFF', borderWidth: 1, borderColor: '#2E5A8F', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  pixTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pixTypeChip: { backgroundColor: '#1B3A5C', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#2E5A8F' },
  pixTypeChipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  pixTypeText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  pixTypeTextActive: { color: '#FFF', fontWeight: '700' },

  // Confirm
  confirmCard: { backgroundColor: '#064E3B', padding: 20, borderRadius: 14, alignItems: 'center', marginBottom: 16 },
  confirmLabel: { fontSize: 13, color: '#6EE7B7', marginBottom: 4 },
  confirmValue: { fontSize: 32, fontWeight: '800', color: '#10B981' },
  pixSummary: { backgroundColor: '#1B3A5C', padding: 16, borderRadius: 12, marginBottom: 12 },
  pixSummaryTitle: { fontSize: 14, fontWeight: '700', color: '#FFF', marginBottom: 10 },
  pixSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  pixSummaryLabel: { fontSize: 13, color: '#94A3B8' },
  pixSummaryValue: { fontSize: 13, color: '#CBD5E1', fontWeight: '600' },
  editPixBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginBottom: 8 },
  editPixBtnText: { fontSize: 13, color: '#3B82F6', fontWeight: '600' },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12, marginTop: 16, marginBottom: 10 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // Onboarding Modal
  onbOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  onbContent: { backgroundColor: '#22476B', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90%', borderWidth: 1, borderColor: '#2E5A8F' },

  onbWelcome: { alignItems: 'center' },
  onbWelcomeIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#78350F', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  onbWelcomeTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 8 },
  onbWelcomeSub: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  onbStartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F59E0B', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, width: '100%' },
  onbStartBtnText: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  onbSkipBtn: { paddingVertical: 12, alignItems: 'center' },
  onbSkipBtnText: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },

  onbVideo: {},
  onbProgress: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  onbProgressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2E5A8F' },
  onbProgressDotActive: { backgroundColor: '#F59E0B' },
  onbVideoStep: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
  onbVideoTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  onbVideoPlaceholder: { aspectRatio: 16 / 9, backgroundColor: '#1B3A5C', borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#2E5A8F', marginBottom: 14 },
  onbVideoEmbed: { aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  onbPlaceholderText: { fontSize: 16, color: '#94A3B8', fontWeight: '600', marginTop: 8 },
  onbPlaceholderSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  onbVideoDesc: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  onbBtnRow: { alignItems: 'center' },
  onbNextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F59E0B', paddingVertical: 14, borderRadius: 12, width: '100%' },
  onbNextBtnText: { fontSize: 16, fontWeight: '700', color: '#1E293B' },

  onbCongrats: { alignItems: 'center' },
  onbCongratsIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#064E3B', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  onbCongratsTitle: { fontSize: 24, fontWeight: '800', color: '#F59E0B', marginBottom: 8 },
  onbCongratsSub: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22, marginBottom: 24 },

  // Team
  copyLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#2E5A8F', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#3B82F6' },
  copyLinkText: { fontSize: 14, fontWeight: '600', color: '#93C5FD' },
  copyLinkSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  validatorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  validatorBlocked: { opacity: 0.6, borderColor: '#EF4444' },
  validatorName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  validatorInfo: { fontSize: 12, color: '#64748B', marginTop: 2 },
  blockBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7F1D1D', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  unblockBtn: { backgroundColor: '#064E3B' },
  blockBtnText: { fontSize: 12, fontWeight: '600', color: '#FCA5A5' },
  unblockBtnText: { color: '#6EE7B7' },
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';

const TABS = [
  { id: 'credits', label: 'Créditos', icon: 'wallet-outline' as const },
  { id: 'qr', label: 'QR Codes', icon: 'qr-code-outline' as const },
  { id: 'top', label: 'Top Ofertas', icon: 'trophy-outline' as const },
  { id: 'total', label: 'Resumo', icon: 'stats-chart-outline' as const },
];

const formatCurrency = (v: number) => `R$ ${(v || 0).toFixed(2).replace('.', ',')}`;
const formatDate = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};
const formatDateTime = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const getToday = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};
const get30DaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
};

export default function ReportsPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('credits');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [showAllSales, setShowAllSales] = useState(false);

  // Date filter
  const [startDate, setStartDate] = useState(get30DaysAgo());
  const [endDate, setEndDate] = useState(getToday());
  const [filterLabel, setFilterLabel] = useState('Últimos 30 dias');

  // Custom date inputs
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Quick date presets
  const presets = [
    { label: 'Hoje', getRange: () => { const t = getToday(); return { s: t, e: t, l: 'Hoje' }; } },
    { label: '7 dias', getRange: () => { const d = new Date(); d.setDate(d.getDate() - 7); return { s: d.toISOString().split('T')[0], e: getToday(), l: 'Últimos 7 dias' }; } },
    { label: '30 dias', getRange: () => ({ s: get30DaysAgo(), e: getToday(), l: 'Últimos 30 dias' }) },
    { label: '90 dias', getRange: () => { const d = new Date(); d.setDate(d.getDate() - 90); return { s: d.toISOString().split('T')[0], e: getToday(), l: 'Últimos 90 dias' }; } },
    { label: 'Tudo', getRange: () => ({ s: '', e: '', l: 'Todo o período' }) },
  ];

  useEffect(() => { loadData(); }, [startDate, endDate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getEstablishmentReports(startDate || undefined, endDate || undefined);
      setData(res);
    } catch (e: any) {
      console.error('Reports error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [startDate, endDate]);

  const applyPreset = (preset: any) => {
    const { s, e, l } = preset.getRange();
    setStartDate(s);
    setEndDate(e);
    setFilterLabel(l);
    setShowAllSales(false);
    setShowCustomDate(false);
  };

  const formatInputDate = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  };

  const parseInputDate = (input: string) => {
    const parts = input.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      const [dd, mm, yyyy] = parts;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
    return '';
  };

  const applyCustomDate = () => {
    const sd = parseInputDate(customStart);
    const ed = parseInputDate(customEnd);
    if (!sd && !ed) return;
    setStartDate(sd);
    setEndDate(ed || getToday());
    setFilterLabel(`${customStart || '...'} até ${customEnd || 'hoje'}`);
    setShowAllSales(false);
  };

  const renderCreditsTab = () => {
    if (!data) return null;
    const { credits_received } = data;
    const sales = credits_received?.sales || [];
    const displaySales = showAllSales ? sales : sales.slice(0, 5);

    return (
      <View>
        {/* Total card */}
        <View style={s.totalCard} data-testid="credits-total-card">
          <View style={s.totalCardHeader}>
            <Ionicons name="wallet" size={28} color="#10B981" />
            <Text style={s.totalCardLabel}>Total Recebido em Créditos</Text>
          </View>
          <Text style={s.totalCardValue}>{formatCurrency(credits_received?.total_credits || 0)}</Text>
          <View style={s.totalCardRow}>
            <View style={s.totalCardSub}>
              <Text style={s.totalSubLabel}>Pago em dinheiro/cartão</Text>
              <Text style={s.totalSubValue}>{formatCurrency(credits_received?.total_cash || 0)}</Text>
            </View>
            <View style={s.totalCardSub}>
              <Text style={s.totalSubLabel}>Total geral</Text>
              <Text style={[s.totalSubValue, { color: '#F59E0B' }]}>
                {formatCurrency((credits_received?.total_credits || 0) + (credits_received?.total_cash || 0))}
              </Text>
            </View>
          </View>
        </View>

        {/* Sales list */}
        <View style={s.listHeader}>
          <Text style={s.listTitle}>Detalhamento ({sales.length} vendas)</Text>
          {sales.length > 5 && (
            <TouchableOpacity onPress={() => setShowAllSales(!showAllSales)}>
              <Text style={s.listToggle}>{showAllSales ? 'Mostrar menos' : 'Ver todas'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {sales.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="receipt-outline" size={40} color="#2E5A8F" />
            <Text style={s.emptyText}>Nenhuma venda no período</Text>
          </View>
        ) : (
          displaySales.map((sale: any, i: number) => (
            <View key={sale.sale_id || i} style={s.saleRow} data-testid={`sale-row-${i}`}>
              <View style={{ flex: 1 }}>
                <Text style={s.saleTitle} numberOfLines={1}>{sale.offer_title || 'Oferta'}</Text>
                <Text style={s.saleSub}>
                  {formatDateTime(sale.validated_at)} · {sale.customer_name || 'Cliente'}
                </Text>
                {sale.validated_by && sale.validated_by !== 'Proprietário' && (
                  <Text style={s.saleValidator}>Validado por: {sale.validated_by}</Text>
                )}
              </View>
              <View style={s.saleAmounts}>
                <Text style={s.saleCreditAmount}>{formatCurrency(sale.credits_used || 0)}</Text>
                <Text style={s.saleCashAmount}>+ {formatCurrency(sale.amount_to_pay_cash || 0)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderQRTab = () => {
    if (!data) return null;
    const { qr_codes_read } = data;
    const sales = qr_codes_read?.sales || [];

    return (
      <View>
        <View style={s.totalCard} data-testid="qr-total-card">
          <View style={s.totalCardHeader}>
            <Ionicons name="qr-code" size={28} color="#3B82F6" />
            <Text style={s.totalCardLabel}>QR Codes Validados</Text>
          </View>
          <Text style={[s.totalCardValue, { color: '#3B82F6' }]}>{qr_codes_read?.total || 0}</Text>
        </View>

        <Text style={s.listTitle}>Histórico de Validações</Text>
        {sales.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="qr-code-outline" size={40} color="#2E5A8F" />
            <Text style={s.emptyText}>Nenhum QR Code validado no período</Text>
          </View>
        ) : (
          sales.slice(0, 20).map((sale: any, i: number) => (
            <View key={sale.sale_id || i} style={s.saleRow}>
              <View style={s.qrBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.saleTitle} numberOfLines={1}>{sale.offer_title || 'Oferta'}</Text>
                <Text style={s.saleSub}>{formatDateTime(sale.validated_at)}</Text>
              </View>
              <Text style={s.qrCode}>{sale.backup_code || '-'}</Text>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderTopOffersTab = () => {
    if (!data) return null;
    const topOffers = data.top_offers || [];
    const maxCount = topOffers.length > 0 ? topOffers[0].count : 1;

    return (
      <View>
        <View style={s.totalCard} data-testid="top-offers-card">
          <View style={s.totalCardHeader}>
            <Ionicons name="trophy" size={28} color="#F59E0B" />
            <Text style={s.totalCardLabel}>Top 5 Ofertas Mais Vendidas</Text>
          </View>
        </View>

        {topOffers.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="trophy-outline" size={40} color="#2E5A8F" />
            <Text style={s.emptyText}>Nenhuma venda no período</Text>
          </View>
        ) : (
          topOffers.map((offer: any, i: number) => (
            <View key={offer.offer_id || i} style={s.topOfferRow} data-testid={`top-offer-${i}`}>
              <View style={[s.rankBadge, i === 0 && s.rankGold, i === 1 && s.rankSilver, i === 2 && s.rankBronze]}>
                <Text style={s.rankText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.saleTitle} numberOfLines={1}>{offer.offer_title}</Text>
                <Text style={s.saleSub}>{offer.count} vendas · {offer.percentage}% do total</Text>
                {/* Simple bar chart */}
                <View style={s.barBg}>
                  <View style={[s.barFill, { width: `${(offer.count / maxCount) * 100}%` }]} />
                </View>
              </View>
              <Text style={s.topOfferAmount}>{formatCurrency(offer.total_credits + offer.total_cash)}</Text>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderTotalTab = () => {
    if (!data) return null;
    const { sales_summary } = data;

    return (
      <View>
        <View style={[s.totalCard, { borderColor: '#F59E0B33' }]} data-testid="total-sales-card">
          <View style={s.totalCardHeader}>
            <Ionicons name="stats-chart" size={28} color="#F59E0B" />
            <Text style={s.totalCardLabel}>Total de Vendas pelo App</Text>
          </View>
          <Text style={[s.totalCardValue, { color: '#F59E0B' }]}>
            {formatCurrency(sales_summary?.total_revenue || 0)}
          </Text>
        </View>

        <View style={s.summaryGrid}>
          <View style={s.summaryItem}>
            <Ionicons name="cart-outline" size={24} color="#3B82F6" />
            <Text style={s.summaryNumber}>{sales_summary?.total_transactions || 0}</Text>
            <Text style={s.summaryLabel}>Transações</Text>
          </View>
          <View style={s.summaryItem}>
            <Ionicons name="cash-outline" size={24} color="#10B981" />
            <Text style={s.summaryNumber}>{formatCurrency(sales_summary?.ticket_medio || 0)}</Text>
            <Text style={s.summaryLabel}>Ticket Médio</Text>
          </View>
        </View>

        <View style={s.dateRange}>
          <View style={s.dateRangeItem}>
            <Ionicons name="flag-outline" size={18} color="#64748B" />
            <View>
              <Text style={s.dateRangeLabel}>Primeira Venda</Text>
              <Text style={s.dateRangeValue}>{formatDate(sales_summary?.first_sale)}</Text>
            </View>
          </View>
          <View style={s.dateRangeItem}>
            <Ionicons name="checkmark-done-outline" size={18} color="#64748B" />
            <View>
              <Text style={s.dateRangeLabel}>Última Venda</Text>
              <Text style={s.dateRangeValue}>{formatDate(sales_summary?.last_sale)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} data-testid="reports-back-btn">
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Relatório Financeiro</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Date presets */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.presetsRow} contentContainerStyle={s.presetsContent}>
        {presets.map((p, i) => (
          <TouchableOpacity
            key={i}
            style={[s.presetChip, !showCustomDate && filterLabel === p.getRange().l && s.presetChipActive]}
            onPress={() => applyPreset(p)}
            data-testid={`preset-${p.label}`}
          >
            <Text style={[s.presetText, !showCustomDate && filterLabel === p.getRange().l && s.presetTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Custom date inputs - always visible */}
      <View style={s.customDateRow} data-testid="custom-date-section">
        <View style={s.dateInputGroup}>
          <Text style={s.dateInputLabel}>Data Inicial</Text>
          <TextInput
            style={s.dateInput}
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#475569"
            value={customStart}
            onChangeText={(t) => setCustomStart(formatInputDate(t))}
            keyboardType="numeric"
            maxLength={10}
            data-testid="custom-start-date"
          />
        </View>
        <View style={s.dateInputGroup}>
          <Text style={s.dateInputLabel}>Data Final</Text>
          <TextInput
            style={s.dateInput}
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#475569"
            value={customEnd}
            onChangeText={(t) => setCustomEnd(formatInputDate(t))}
            keyboardType="numeric"
            maxLength={10}
            data-testid="custom-end-date"
          />
        </View>
        <TouchableOpacity
          style={[s.dateApplyBtn, (!customStart && !customEnd) && { opacity: 0.4 }]}
          onPress={applyCustomDate}
          disabled={!customStart && !customEnd}
          data-testid="apply-custom-date"
        >
          <Ionicons name="search" size={18} color="#1B3A5C" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsRow} contentContainerStyle={s.tabsContent}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[s.tab, activeTab === tab.id && s.tabActive]}
            onPress={() => { setActiveTab(tab.id); setShowAllSales(false); }}
            data-testid={`tab-${tab.id}`}
          >
            <Ionicons name={tab.icon} size={16} color={activeTab === tab.id ? '#FFF' : '#64748B'} />
            <Text style={[s.tabText, activeTab === tab.id && s.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={s.loadingText}>Carregando relatório...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
        >
          {activeTab === 'credits' && renderCreditsTab()}
          {activeTab === 'qr' && renderQRTab()}
          {activeTab === 'top' && renderTopOffersTab()}
          {activeTab === 'total' && renderTotalTab()}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1B3A5C' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#22476B',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },

  presetsRow: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: '#22476B' },
  presetsContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  presetChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#22476B', borderWidth: 1, borderColor: '#2E5A8F' },
  presetChipActive: { backgroundColor: '#064E3B', borderColor: '#10B981' },
  presetText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  presetTextActive: { color: '#10B981' },
  filterInfo: { textAlign: 'center', fontSize: 12, color: '#64748B', paddingVertical: 6 },

  customDateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#22476B',
  },
  dateInputGroup: { flex: 1 },
  dateInputLabel: { fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: '600' },
  dateInput: {
    backgroundColor: '#22476B',
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#2E5A8F',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  dateApplyBtn: {
    backgroundColor: '#10B981',
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  tabsRow: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: '#22476B' },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 6, flexDirection: 'row' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#22476B' },
  tabActive: { backgroundColor: '#10B981' },
  tabText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  tabTextActive: { color: '#FFF' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: '#94A3B8', marginTop: 12 },

  scrollContent: { padding: 16, paddingBottom: 40 },

  totalCard: {
    backgroundColor: '#22476B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  totalCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  totalCardLabel: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  totalCardValue: { fontSize: 36, fontWeight: '800', color: '#10B981', marginBottom: 12 },
  totalCardRow: { flexDirection: 'row', gap: 16 },
  totalCardSub: { flex: 1, backgroundColor: '#1B3A5C', borderRadius: 10, padding: 12 },
  totalSubLabel: { fontSize: 11, color: '#64748B', marginBottom: 4 },
  totalSubValue: { fontSize: 16, fontWeight: '700', color: '#CBD5E1' },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  listTitle: { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  listToggle: { fontSize: 13, color: '#10B981', fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#64748B', marginTop: 8 },

  saleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22476B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2E5A8F',
  },
  saleTitle: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  saleSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  saleValidator: { fontSize: 11, color: '#A78BFA', marginTop: 2 },
  saleAmounts: { alignItems: 'flex-end' },
  saleCreditAmount: { fontSize: 14, fontWeight: '700', color: '#10B981' },
  saleCashAmount: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  qrBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#064E3B', justifyContent: 'center', alignItems: 'center' },
  qrCode: { fontSize: 12, fontWeight: '700', color: '#64748B', fontFamily: 'monospace' },

  topOfferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#22476B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2E5A8F',
  },
  rankBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2E5A8F', justifyContent: 'center', alignItems: 'center' },
  rankGold: { backgroundColor: '#78350F' },
  rankSilver: { backgroundColor: '#374151' },
  rankBronze: { backgroundColor: '#44403C' },
  rankText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  barBg: { height: 6, backgroundColor: '#1B3A5C', borderRadius: 3, marginTop: 6 },
  barFill: { height: 6, backgroundColor: '#F59E0B', borderRadius: 3 },
  topOfferAmount: { fontSize: 14, fontWeight: '700', color: '#10B981' },

  summaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryItem: {
    flex: 1,
    backgroundColor: '#22476B',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#2E5A8F',
  },
  summaryNumber: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  summaryLabel: { fontSize: 12, color: '#64748B' },

  dateRange: { gap: 10 },
  dateRangeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#22476B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2E5A8F',
  },
  dateRangeLabel: { fontSize: 12, color: '#64748B' },
  dateRangeValue: { fontSize: 15, fontWeight: '700', color: '#FFF', marginTop: 2 },
});

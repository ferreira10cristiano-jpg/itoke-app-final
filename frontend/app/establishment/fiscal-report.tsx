import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';

export default function FiscalReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloading, setDownloading] = useState(false);

  const formatDateBR = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 8);
    if (clean.length <= 2) return clean;
    if (clean.length <= 4) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
    return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
  };

  const brToIso = (br: string): string | undefined => {
    const parts = br.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return undefined;
  };

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const data = await api.getFiscalReport(brToIso(startDate), brToIso(endDate));
      setReport(data);
    } catch (error: any) {
      console.error('Error loading fiscal report:', error);
      if (typeof window !== 'undefined') {
        window.alert('Erro ao carregar relatorio: ' + (error.message || ''));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const token = await api.getToken();
      const pdfUrl = api.getFiscalReportPdfUrl(brToIso(startDate), brToIso(endDate));
      if (typeof window !== 'undefined') {
        const res = await fetch(pdfUrl, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Erro ao gerar PDF');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'relatorio_fiscal.pdf';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      if (typeof window !== 'undefined') {
        window.alert('Erro ao baixar PDF: ' + (error.message || ''));
      }
    } finally {
      setDownloading(false);
    }
  };

  const formatCpf = (cpf: string) => {
    if (!cpf || cpf.length !== 11) return cpf || 'N/I';
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return dateStr.slice(0, 10);
    }
  };

  const formatCurrency = (val: number) => `R$ ${(val || 0).toFixed(2).replace('.', ',')}`;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} data-testid="fiscal-back-btn">
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Relatorio Fiscal</Text>
            <Text style={s.headerSub}>Comprovante de pagamentos dos clientes</Text>
          </View>
          <Ionicons name="document-text" size={28} color="#0891B2" />
        </View>

        {/* Info Card */}
        <View style={s.infoCard}>
          <Ionicons name="information-circle" size={20} color="#0891B2" />
          <Text style={s.infoText}>
            Este relatorio comprova que os valores foram pagos diretamente pelos clientes, e nao pela plataforma iToke.
          </Text>
        </View>

        {/* Date Filter */}
        <View style={s.filterSection}>
          <Text style={s.filterLabel}>Filtrar por periodo:</Text>
          <View style={s.filterRow}>
            <View style={s.dateInputWrap}>
              <Text style={s.dateLabel}>Inicio</Text>
              <TextInput
                style={s.dateInput}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#94A3B8"
                value={startDate}
                onChangeText={(t) => setStartDate(formatDateBR(t))}
                keyboardType="numeric"
                maxLength={10}
                data-testid="fiscal-start-date"
              />
            </View>
            <View style={s.dateInputWrap}>
              <Text style={s.dateLabel}>Fim</Text>
              <TextInput
                style={s.dateInput}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#94A3B8"
                value={endDate}
                onChangeText={(t) => setEndDate(formatDateBR(t))}
                keyboardType="numeric"
                maxLength={10}
                data-testid="fiscal-end-date"
              />
            </View>
            <TouchableOpacity style={s.filterBtn} onPress={loadReport} data-testid="fiscal-filter-btn">
              <Ionicons name="search" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color="#0891B2" />
            <Text style={s.loadingText}>Carregando relatorio...</Text>
          </View>
        ) : report ? (
          <>
            {/* Establishment Info */}
            <View style={s.estCard}>
              <Text style={s.estName}>{report.establishment?.business_name}</Text>
              <Text style={s.estDetail}>CNPJ: {report.establishment?.cnpj || 'N/A'}</Text>
              <Text style={s.estDetail}>
                {report.establishment?.address} - {report.establishment?.neighborhood}, {report.establishment?.city}
              </Text>
              <Text style={s.estDetail}>
                Periodo: {formatDate(report.period?.start)} a {formatDate(report.period?.end)}
              </Text>
            </View>

            {/* Summary */}
            <View style={s.summaryRow}>
              <View style={s.summaryCard}>
                <Text style={s.summaryValue}>{report.summary?.total_transactions || 0}</Text>
                <Text style={s.summaryLabel}>Transacoes</Text>
              </View>
              <View style={s.summaryCard}>
                <Text style={[s.summaryValue, { color: '#10B981' }]}>{formatCurrency(report.summary?.total_credits_received)}</Text>
                <Text style={s.summaryLabel}>Creditos</Text>
              </View>
              <View style={s.summaryCard}>
                <Text style={[s.summaryValue, { color: '#3B82F6' }]}>{formatCurrency(report.summary?.total_cash_received)}</Text>
                <Text style={s.summaryLabel}>Dinheiro</Text>
              </View>
            </View>

            <View style={s.totalCard}>
              <Text style={s.totalLabel}>VALOR TOTAL</Text>
              <Text style={s.totalValue}>{formatCurrency(report.summary?.total_revenue)}</Text>
            </View>

            {/* Download PDF */}
            <TouchableOpacity
              style={s.downloadBtn}
              onPress={handleDownloadPdf}
              disabled={downloading}
              data-testid="fiscal-download-pdf"
            >
              {downloading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="download" size={20} color="#FFF" />
                  <Text style={s.downloadText}>Baixar PDF Completo</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Transactions Table */}
            <View style={s.tableSection}>
              <Text style={s.tableTitle}>Detalhamento das Transacoes</Text>
              {report.transactions?.length === 0 ? (
                <View style={s.emptyState}>
                  <Ionicons name="document-text-outline" size={40} color="#94A3B8" />
                  <Text style={s.emptyText}>Nenhuma transacao no periodo</Text>
                </View>
              ) : (
                report.transactions?.map((t: any, idx: number) => (
                  <View key={t.sale_id || idx} style={s.txCard} data-testid={`fiscal-tx-${idx}`}>
                    <View style={s.txHeader}>
                      <View style={s.txBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={s.txBadgeText}>{formatDate(t.validated_at)}</Text>
                      </View>
                      <Text style={s.txCode}>{t.backup_code}</Text>
                    </View>
                    <View style={s.txBody}>
                      <View style={s.txRow}>
                        <Ionicons name="person" size={14} color="#64748B" />
                        <Text style={s.txLabel}>Cliente:</Text>
                        <Text style={s.txValue}>{t.customer_name}</Text>
                      </View>
                      <View style={s.txRow}>
                        <Ionicons name="card" size={14} color="#64748B" />
                        <Text style={s.txLabel}>CPF:</Text>
                        <Text style={s.txValue}>{formatCpf(t.customer_cpf)}</Text>
                      </View>
                      <View style={s.txRow}>
                        <Ionicons name="mail" size={14} color="#64748B" />
                        <Text style={s.txLabel}>Email:</Text>
                        <Text style={s.txValue}>{t.customer_email || 'N/I'}</Text>
                      </View>
                      <View style={s.txRow}>
                        <Ionicons name="pricetag" size={14} color="#64748B" />
                        <Text style={s.txLabel}>Oferta:</Text>
                        <Text style={s.txValue}>{t.offer_title}</Text>
                      </View>
                      <View style={s.txAmounts}>
                        <View style={s.txAmountItem}>
                          <Text style={s.txAmountLabel}>Creditos</Text>
                          <Text style={[s.txAmountValue, { color: '#10B981' }]}>{formatCurrency(t.credits_used)}</Text>
                        </View>
                        <View style={s.txAmountItem}>
                          <Text style={s.txAmountLabel}>Dinheiro</Text>
                          <Text style={[s.txAmountValue, { color: '#3B82F6' }]}>{formatCurrency(t.amount_to_pay_cash)}</Text>
                        </View>
                        <View style={s.txAmountItem}>
                          <Text style={s.txAmountLabel}>Total</Text>
                          <Text style={[s.txAmountValue, { fontWeight: '700' }]}>{formatCurrency((t.credits_used || 0) + (t.amount_to_pay_cash || 0))}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Disclaimer */}
            {report.layout?.disclaimer && (
              <View style={s.disclaimerCard}>
                <Ionicons name="shield-checkmark" size={20} color="#0891B2" />
                <Text style={s.disclaimerTitle}>DECLARACAO</Text>
                <Text style={s.disclaimerText}>{report.layout.disclaimer}</Text>
              </View>
            )}
          </>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#BFDBFE' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  headerSub: { fontSize: 13, color: '#64748B' },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 20, marginBottom: 16, padding: 14,
    backgroundColor: '#ECFEFF', borderRadius: 12, borderWidth: 1, borderColor: '#A5F3FC',
  },
  infoText: { flex: 1, fontSize: 13, color: '#164E63', lineHeight: 18 },

  filterSection: { paddingHorizontal: 20, marginBottom: 16 },
  filterLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
  filterRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  dateInputWrap: { flex: 1 },
  dateLabel: { fontSize: 11, color: '#64748B', marginBottom: 4 },
  dateInput: {
    backgroundColor: '#FFF', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0',
  },
  filterBtn: {
    backgroundColor: '#0891B2', borderRadius: 10, padding: 12,
    justifyContent: 'center', alignItems: 'center',
  },

  loadingWrap: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { color: '#64748B', marginTop: 12 },

  estCard: {
    marginHorizontal: 20, marginBottom: 16, padding: 16,
    backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0',
  },
  estName: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  estDetail: { fontSize: 13, color: '#64748B', marginBottom: 2 },

  summaryRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  summaryCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  summaryValue: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  summaryLabel: { fontSize: 11, color: '#64748B', marginTop: 4 },

  totalCard: {
    marginHorizontal: 20, marginBottom: 16, padding: 18,
    backgroundColor: '#164E63', borderRadius: 14, alignItems: 'center',
  },
  totalLabel: { fontSize: 12, fontWeight: '600', color: '#A5F3FC', marginBottom: 4 },
  totalValue: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },

  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 20, padding: 16,
    backgroundColor: '#0891B2', borderRadius: 14,
  },
  downloadText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  tableSection: { paddingHorizontal: 20, marginBottom: 16 },
  tableTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12 },

  emptyState: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  emptyText: { fontSize: 14, color: '#64748B', marginTop: 10 },

  txCard: {
    backgroundColor: '#FFF', borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden',
  },
  txHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#F8FAFC',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  txBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  txBadgeText: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  txCode: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  txBody: { padding: 14 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  txLabel: { fontSize: 12, color: '#64748B', width: 50 },
  txValue: { fontSize: 13, color: '#1E293B', fontWeight: '500', flex: 1 },
  txAmounts: {
    flexDirection: 'row', marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 8,
  },
  txAmountItem: { flex: 1, alignItems: 'center' },
  txAmountLabel: { fontSize: 10, color: '#94A3B8', marginBottom: 2 },
  txAmountValue: { fontSize: 14, fontWeight: '600', color: '#1E293B' },

  disclaimerCard: {
    marginHorizontal: 20, padding: 18, backgroundColor: '#ECFEFF',
    borderRadius: 14, borderWidth: 1, borderColor: '#A5F3FC', alignItems: 'center',
  },
  disclaimerTitle: { fontSize: 14, fontWeight: '700', color: '#164E63', marginTop: 8, marginBottom: 6 },
  disclaimerText: { fontSize: 12, color: '#475569', textAlign: 'center', lineHeight: 18 },
});

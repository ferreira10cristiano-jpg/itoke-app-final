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
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/lib/api';

interface Purchase {
  id: string;
  type: string;
  package_title: string;
  total_tokens: number;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  session_id: string;
  created_at: string;
}

export default function PurchaseHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      const data = await api.getPurchaseHistory();
      setPurchases(data);
    } catch (err) {
      console.error('Error loading purchase history:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPurchases();
    setRefreshing(false);
  }, []);

  const handleDownloadReceipt = async (purchase: Purchase) => {
    setDownloadingId(purchase.id);
    try {
      const token = await api.getToken();
      const pdfUrl = api.getReceiptPdfUrl(purchase.id);

      if (Platform.OS === 'web') {
        const res = await fetch(pdfUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Erro ao gerar recibo');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recibo_${purchase.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // On native, open in browser which triggers download
        const urlWithToken = `${pdfUrl}?token=${token}`;
        await Linking.openURL(urlWithToken);
      }
    } catch (error: any) {
      const msg = error.message || 'Erro ao baixar recibo';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Erro', msg);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr.slice(0, 10);
    }
  };

  const formatCurrency = (val: number) =>
    `R$ ${(val || 0).toFixed(2).replace('.', ',')}`;

  const totalSpent = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalTokensBought = purchases.reduce((sum, p) => sum + (p.total_tokens || 0), 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} data-testid="purchase-history-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          data-testid="purchase-history-back-btn"
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minhas Compras</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Carregando historico...</Text>
        </View>
      ) : purchases.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="receipt-outline" size={56} color="#334155" />
          <Text style={styles.emptyTitle}>Nenhuma compra realizada</Text>
          <Text style={styles.emptySubtext}>
            Suas compras de tokens aparecerao aqui
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/buy-tokens')}
            data-testid="purchase-history-buy-btn"
          >
            <Ionicons name="cart" size={18} color="#0F172A" />
            <Text style={styles.emptyBtnText}>Comprar Tokens</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10B981"
              colors={['#10B981']}
            />
          }
        >
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Ionicons name="receipt" size={20} color="#10B981" />
              <Text style={styles.summaryValue}>{purchases.length}</Text>
              <Text style={styles.summaryLabel}>Compras</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="ticket" size={20} color="#3B82F6" />
              <Text style={[styles.summaryValue, { color: '#3B82F6' }]}>
                {totalTokensBought}
              </Text>
              <Text style={styles.summaryLabel}>Tokens</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="cash" size={20} color="#F59E0B" />
              <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>
                {formatCurrency(totalSpent)}
              </Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
          </View>

          {/* Purchase List */}
          <Text style={styles.sectionTitle}>Historico de Compras</Text>
          {purchases.map((purchase, idx) => {
            const isDownloading = downloadingId === purchase.id;
            return (
              <View
                key={purchase.id || idx}
                style={styles.purchaseCard}
                data-testid={`purchase-card-${idx}`}
              >
                <View style={styles.purchaseHeader}>
                  <View style={styles.purchaseStatusBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.purchaseStatusText}>Confirmado</Text>
                  </View>
                  <Text style={styles.purchaseDate}>
                    {formatDate(purchase.created_at)}
                  </Text>
                </View>

                <View style={styles.purchaseBody}>
                  <View style={styles.purchaseInfo}>
                    <Text style={styles.purchaseTitle}>
                      {purchase.package_title}
                    </Text>
                    <View style={styles.purchaseDetailRow}>
                      <Ionicons name="ticket" size={14} color="#64748B" />
                      <Text style={styles.purchaseDetail}>
                        {purchase.total_tokens} tokens
                      </Text>
                    </View>
                    <View style={styles.purchaseDetailRow}>
                      <Ionicons name="card" size={14} color="#64748B" />
                      <Text style={styles.purchaseDetail}>
                        {purchase.payment_method}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.purchaseAmountWrap}>
                    <Text style={styles.purchaseAmount}>
                      {formatCurrency(purchase.amount)}
                    </Text>
                  </View>
                </View>

                {/* Download Receipt Button */}
                <TouchableOpacity
                  style={styles.receiptBtn}
                  onPress={() => handleDownloadReceipt(purchase)}
                  disabled={isDownloading}
                  data-testid={`download-receipt-${idx}`}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#10B981" />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={16} color="#10B981" />
                      <Text style={styles.receiptBtnText}>Baixar Recibo PDF</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Transaction ID */}
                <Text style={styles.txId}>ID: {purchase.id}</Text>
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#CBD5E1',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 6,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 12,
  },
  purchaseCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  purchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  purchaseStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  purchaseStatusText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  purchaseDate: {
    fontSize: 12,
    color: '#64748B',
  },
  purchaseBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  purchaseInfo: {
    flex: 1,
  },
  purchaseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 6,
  },
  purchaseDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  purchaseDetail: {
    fontSize: 13,
    color: '#94A3B8',
  },
  purchaseAmountWrap: {
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  purchaseAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10B98140',
    backgroundColor: '#10B98110',
  },
  receiptBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  txId: {
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
    paddingBottom: 10,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/lib/api';

interface QRCodeItem {
  qr_id: string;
  voucher_id?: string;
  code_hash: string;
  backup_code?: string;
  generated_by_user_id: string;
  for_offer_id: string;
  establishment_id: string;
  used: boolean;
  used_at?: string;
  status?: string;
  created_at: string;
  expires_at: string;
  credits_used?: number;
  credits_reserved?: number;
  final_price_to_pay?: number;
  discounted_price?: number;
  original_price?: number;
  offer?: {
    title: string;
    discount_value: number;
    original_price: number;
    discounted_price: number;
    establishment?: {
      business_name: string;
    };
  };
}

type FilterType = 'all' | 'active' | 'used' | 'expired';

export default function MyQRScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const [qrCodes, setQrCodes] = useState<QRCodeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadQRCodes();
  }, []);

  const loadQRCodes = async () => {
    try {
      const data = await api.getMyQRCodes();
      setQrCodes(data || []);
    } catch (error) {
      console.error('Error loading QR codes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadQRCodes();
    setRefreshing(false);
  }, []);

  const getStatus = (qr: QRCodeItem): 'active' | 'used' | 'expired' | 'cancelled' => {
    if (qr.status === 'cancelled') return 'cancelled';
    if (qr.used) return 'used';
    const expiresAt = new Date(qr.expires_at);
    if (expiresAt < new Date()) return 'expired';
    return 'active';
  };

  const getStatusConfig = (status: 'active' | 'used' | 'expired' | 'cancelled') => {
    switch (status) {
      case 'active':
        return { label: 'Ativo', color: '#10B981', bg: '#10B98120', icon: 'checkmark-circle' as const };
      case 'used':
        return { label: 'Utilizado', color: '#3B82F6', bg: '#3B82F620', icon: 'checkmark-done-circle' as const };
      case 'expired':
        return { label: 'Expirado', color: '#EF4444', bg: '#EF444420', icon: 'close-circle' as const };
      case 'cancelled':
        return { label: 'Cancelado', color: '#F59E0B', bg: '#F59E0B20', icon: 'ban' as const };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTimeUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expirado';
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    
    if (months > 0) return `Expira em ${months} ${months === 1 ? 'mês' : 'meses'}`;
    if (days > 0) return `Expira em ${days} ${days === 1 ? 'dia' : 'dias'}`;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    return `Expira em ${hours}h`;
  };

  const filteredQRCodes = qrCodes.filter((qr) => {
    if (filter === 'all') return true;
    return getStatus(qr) === filter;
  });

  const counts = {
    all: qrCodes.length,
    active: qrCodes.filter((qr) => getStatus(qr) === 'active').length,
    used: qrCodes.filter((qr) => getStatus(qr) === 'used').length,
    expired: qrCodes.filter((qr) => getStatus(qr) === 'expired' || getStatus(qr) === 'cancelled').length,
  };

  const handleCancelVoucher = async (voucherId: string) => {
    setCancellingId(voucherId);
    try {
      await api.cancelVoucher(voucherId);
      await loadQRCodes();
    } catch (error: any) {
      console.error('Error cancelling voucher:', error);
      alert(error.message || 'Erro ao cancelar voucher');
    } finally {
      setCancellingId(null);
    }
  };

  const handleOpenQR = (qr: QRCodeItem) => {
    const creditsUsed = qr.credits_used || qr.credits_reserved || 0;
    const finalPrice = qr.final_price_to_pay ?? (qr.offer?.discounted_price || 0);
    router.push({
      pathname: '/qr-fullscreen',
      params: {
        code: qr.code_hash,
        backupCode: qr.backup_code || '',
        title: qr.offer?.title || 'Oferta',
        establishment: qr.offer?.establishment?.business_name || 'Estabelecimento',
        discount: qr.offer?.discount_value ? String(Math.round(qr.offer.discount_value)) : '',
        creditsUsed: String(creditsUsed),
        finalPrice: String(finalPrice),
      },
    });
  };

  const renderQRItem = ({ item }: { item: QRCodeItem }) => {
    const status = getStatus(item);
    const statusConfig = getStatusConfig(status);
    const creditsUsed = item.credits_used || item.credits_reserved || 0;
    const finalPrice = item.final_price_to_pay ?? (item.offer?.discounted_price || 0);
    const isCancelling = cancellingId === (item.voucher_id || item.qr_id);

    return (
      <TouchableOpacity
        style={styles.qrCard}
        onPress={() => status === 'active' ? handleOpenQR(item) : null}
        activeOpacity={status === 'active' ? 0.8 : 1}
        data-testid={`qr-card-${item.voucher_id || item.qr_id}`}
      >
        <View style={styles.qrCardHeader}>
          <View style={styles.qrIconContainer}>
            <Ionicons name="qr-code" size={28} color="#10B981" />
          </View>
          <View style={styles.qrCardInfo}>
            <Text style={styles.qrOfferTitle} numberOfLines={1}>
              {item.offer?.title || 'Oferta'}
            </Text>
            <Text style={styles.qrEstablishment} numberOfLines={1}>
              {item.offer?.establishment?.business_name || 'Estabelecimento'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.qrCardDetails}>
          <View style={styles.qrDetailRow}>
            <View style={styles.qrDetail}>
              <Ionicons name="pricetag" size={14} color="#64748B" />
              <Text style={styles.qrDetailText}>
                {item.offer?.discount_value ? `${Math.round(item.offer.discount_value)}% OFF` : '--'}
              </Text>
            </View>
            <View style={styles.qrDetail}>
              <Ionicons name="calendar" size={14} color="#64748B" />
              <Text style={styles.qrDetailText}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>

          {/* Price breakdown */}
          <View style={styles.priceBreakdown}>
            {creditsUsed > 0 && (
              <View style={styles.priceBreakdownRow}>
                <Ionicons name="wallet" size={14} color="#3B82F6" />
                <Text style={styles.priceBreakdownLabel}>Pago com creditos:</Text>
                <Text style={styles.priceBreakdownValueBlue}>R$ {creditsUsed.toFixed(2).replace('.', ',')}</Text>
              </View>
            )}
            <View style={styles.priceBreakdownRow}>
              <Ionicons name="cash" size={14} color="#10B981" />
              <Text style={styles.priceBreakdownLabel}>Pagar no balcao:</Text>
              <Text style={styles.priceBreakdownValueGreen}>R$ {finalPrice.toFixed(2).replace('.', ',')}</Text>
            </View>
          </View>

          {/* Status bars */}
          {status === 'active' && (
            <View style={styles.expiryBar}>
              <Ionicons name="time" size={14} color="#F59E0B" />
              <Text style={styles.expiryText}>{getTimeUntilExpiry(item.expires_at)}</Text>
            </View>
          )}

          {status === 'used' && item.used_at && (
            <View style={[styles.expiryBar, { backgroundColor: '#3B82F615' }]}>
              <Ionicons name="checkmark-done" size={14} color="#3B82F6" />
              <Text style={[styles.expiryText, { color: '#3B82F6' }]}>
                Usado em {formatDate(item.used_at)}
              </Text>
            </View>
          )}

          {status === 'expired' && (
            <View style={[styles.expiryBar, { backgroundColor: '#EF444415' }]}>
              <Ionicons name="close-circle" size={14} color="#EF4444" />
              <Text style={[styles.expiryText, { color: '#EF4444' }]}>Expirou em {formatDate(item.expires_at)}</Text>
            </View>
          )}

          {status === 'cancelled' && (
            <View style={[styles.expiryBar, { backgroundColor: '#F59E0B15' }]}>
              <Ionicons name="ban" size={14} color="#F59E0B" />
              <Text style={[styles.expiryText, { color: '#F59E0B' }]}>
                Cancelado{creditsUsed > 0 ? ` - R$ ${creditsUsed.toFixed(2).replace('.', ',')} devolvidos` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Backup Code */}
        {item.backup_code && (
          <View style={styles.backupCodeBar}>
            <View style={styles.backupCodeLeft}>
              <Ionicons name="key" size={16} color="#F59E0B" />
              <Text style={styles.backupCodeLabel}>Resgate:</Text>
            </View>
            <Text style={styles.backupCodeValue}>{item.backup_code}</Text>
          </View>
        )}

        {/* Cancel button for active vouchers */}
        {status === 'active' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelVoucher(item.voucher_id || item.qr_id)}
            disabled={isCancelling}
            data-testid={`cancel-voucher-${item.voucher_id || item.qr_id}`}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={14} color="#EF4444" />
                <Text style={styles.cancelButtonText}>Cancelar Voucher</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Meus QR Codes</Text>
        <View style={styles.tokenBadge}>
          <Ionicons name="ticket" size={16} color="#10B981" />
          <Text style={styles.tokenCount}>{user?.tokens || 0}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['all', 'active', 'used', 'expired'] as FilterType[]).map((f) => {
          const isActive = filter === f;
          const labels: Record<FilterType, string> = {
            all: 'Todos',
            active: 'Gerados',
            used: 'Utilizados',
            expired: 'Expirados',
          };
          const colors: Record<FilterType, string> = {
            all: '#10B981',
            active: '#10B981',
            used: '#3B82F6',
            expired: '#EF4444',
          };
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, isActive && { backgroundColor: colors[f] + '20', borderColor: colors[f] }]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterTabText, isActive && { color: colors[f] }]}>
                {labels[f]} ({counts[f]})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredQRCodes}
        renderItem={renderQRItem}
        keyExtractor={(item) => item.voucher_id || item.qr_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="qr-code-outline" size={64} color="#475569" />
            <Text style={styles.emptyTitle}>
              {filter === 'all' ? 'Nenhum QR Code gerado' : `Nenhum QR Code ${filter === 'active' ? 'gerado' : filter === 'used' ? 'utilizado' : 'expirado'}`}
            </Text>
            <Text style={styles.emptyText}>
              Acesse uma oferta e gere um QR Code para usar no estabelecimento
            </Text>
            {filter === 'all' && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/(tabs)')}
              >
                <Ionicons name="pricetags" size={18} color="#0F172A" />
                <Text style={styles.emptyButtonText}>Ver Ofertas</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Info footer */}
      <View style={[styles.infoFooter, { paddingBottom: insets.bottom + 8 }]} pointerEvents="none">
        <Ionicons name="information-circle" size={16} color="#64748B" />
        <Text style={styles.infoFooterText}>
          QR Codes não utilizados expiram em 6 meses
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  tokenCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  qrCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  qrCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  qrIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#10B98115',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  qrCardInfo: {
    flex: 1,
  },
  qrOfferTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  qrEstablishment: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  qrCardDetails: {
    gap: 8,
  },
  qrDetailRow: {
    flexDirection: 'row',
    gap: 16,
  },
  qrDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qrDetailText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  expiryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  expiryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#F59E0B',
  },
  expiryDate: {
    fontSize: 11,
    color: '#64748B',
  },
  priceBreakdown: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  priceBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceBreakdownLabel: {
    flex: 1,
    fontSize: 12,
    color: '#94A3B8',
  },
  priceBreakdownValueBlue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#60A5FA',
  },
  priceBreakdownValueGreen: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  backupCodeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  backupCodeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backupCodeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  backupCodeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#78350F',
    letterSpacing: 2,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF444440',
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    marginTop: 20,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  infoFooterText: {
    fontSize: 12,
    color: '#64748B',
  },
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Image,
  Linking,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/lib/api';
import { Transaction, NetworkData } from '../../src/types';
import { ShareInviteModal } from '../../src/components/ShareInviteModal';

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshUser } = useAuthStore();
  const [credits, setCredits] = useState<{ balance: number; transactions: Transaction[] } | null>(null);
  const [networkData, setNetworkData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareType, setShareType] = useState<'friend' | 'establishment'>('friend');
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [shareMediaData, setShareMediaData] = useState<any>(null);

  // Fullscreen media viewer
  const [viewingMedia, setViewingMedia] = useState<any>(null);
  const [showMediaViewer, setShowMediaViewer] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [creditsData, network, media] = await Promise.all([
        api.getMyCredits(),
        api.getMyNetwork(),
        api.getPublicMedia().catch(() => []),
      ]);
      setCredits(creditsData);
      setNetworkData(network);
      setMediaAssets(media);
      await refreshUser();
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleCopyCode = () => {
    if (networkData?.referral_code) {
      if (Platform.OS === 'web') {
        navigator.clipboard?.writeText(networkData.referral_code);
        window.alert('Codigo copiado!');
      } else {
        try { require('react-native').Clipboard.setString(networkData.referral_code); } catch (e) {}
      }
    }
  };

  const handleMediaClick = (media: any) => {
    setViewingMedia(media);
    setShowMediaViewer(true);
  };

  const handlePostFromViewer = () => {
    // Keep the media info for sharing, then open share modal
    const media = viewingMedia;
    setShowMediaViewer(false);
    setTimeout(() => {
      setShareType('friend');
      setShareMediaData(media);
      setShareModalVisible(true);
    }, 300);
  };

  if (isLoading) {
    return (
      <View style={[st.root, st.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const balance = credits?.balance || 0;
  const transactions = credits?.transactions || [];
  const tokens = user?.tokens || 0;
  const stats = networkData?.network_stats || {};
  const l1 = stats.level1 || { total: 0, active: 0, credits: 0 };
  const l2 = stats.level2 || { total: 0, active: 0, credits: 0 };
  const l3 = stats.level3 || { total: 0, active: 0, credits: 0 };
  const est = stats.establishments || { total: 0, active: 0, credits: 0 };
  const totalSavings = transactions.reduce((sum: number, t: Transaction) => sum + Math.max(0, t.amount || 0), 0);
  const fmtPrice = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" colors={['#10B981']} />}
      >
        {/* ===== HERO ===== */}
        <View style={st.hero} data-testid="wallet-hero">
          <Text style={st.heroTitle}>Creditos</Text>
          <View style={st.heroBalanceRow}>
            <Text style={st.heroCurrency}>R$</Text>
            <Text style={st.heroBalance}>{balance.toFixed(2)}</Text>
          </View>
          <Text style={st.heroImpact}>Seus creditos podem ser usados para pagar suas compras!</Text>
          <View style={st.heroMeta}>
            <View style={st.heroSavingsPill}>
              <Ionicons name="trending-up" size={13} color="#6EE7B7" />
              <Text style={st.heroSavingsText}>Economia total: {fmtPrice(totalSavings)}</Text>
            </View>
            <TouchableOpacity style={st.helpBtn} onPress={() => router.push('/(tabs)/help')} activeOpacity={0.7} data-testid="how-to-earn-btn">
              <Ionicons name="help-circle-outline" size={15} color="#10B981" />
              <Text style={st.helpBtnText}>Como ganhar creditos</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== TOKENS ===== */}
        <View style={st.section}>
          <View style={st.tokenCard} data-testid="wallet-tokens">
            <View style={st.tokenLeft}>
              <View style={st.tokenIcon}><Ionicons name="ticket" size={18} color="#10B981" /></View>
              <View>
                <Text style={st.tokenTitle}>Meus Tokens</Text>
                <Text style={st.tokenSub}>Para gerar QR Codes</Text>
              </View>
            </View>
            <Text style={st.tokenCount}>{tokens}</Text>
            <TouchableOpacity style={st.tokenBuyBtn} onPress={() => router.push('/buy-tokens')} activeOpacity={0.7} data-testid="buy-tokens-btn">
              <Ionicons name="add" size={16} color="#10B981" />
              <Text style={st.tokenBuyText}>Comprar</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={st.purchaseHistoryBtn}
            onPress={() => router.push('/purchase-history')}
            activeOpacity={0.7}
            data-testid="purchase-history-btn"
          >
            <Ionicons name="receipt-outline" size={16} color="#94A3B8" />
            <Text style={st.purchaseHistoryText}>Ver historico de compras</Text>
            <Ionicons name="chevron-forward" size={14} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* ===== GANHE CREDITOS INDICANDO ===== */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Ganhe creditos indicando</Text>
          <View style={st.referralCard} data-testid="wallet-referral">
            <View style={st.referralBtns}>
              <TouchableOpacity style={st.referralBtn} onPress={() => { setShareType('friend'); setShareModalVisible(true); }} activeOpacity={0.7} data-testid="share-friend-btn">
                <View style={st.referralBtnIcon}><Ionicons name="person-add-outline" size={18} color="#10B981" /></View>
                <Text style={st.referralBtnLabel}>Indicar Amigo</Text>
              </TouchableOpacity>
              <View style={st.referralDivider} />
              <TouchableOpacity style={st.referralBtn} onPress={() => { setShareType('establishment'); setShareModalVisible(true); }} activeOpacity={0.7} data-testid="share-store-btn">
                <View style={st.referralBtnIcon}><Ionicons name="storefront-outline" size={18} color="#10B981" /></View>
                <Text style={st.referralBtnLabel}>Indicar Loja</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={st.codeRow} onPress={handleCopyCode} activeOpacity={0.6}>
              <Ionicons name="link-outline" size={14} color="#475569" />
              <Text style={st.codeText}>{networkData?.referral_code || '---'}</Text>
              <Ionicons name="copy-outline" size={14} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== GALERIA DE MIDIAS ===== */}
        {mediaAssets.length > 0 && (
          <View style={st.section}>
            <Text style={st.sectionTitle}>Materiais para Divulgacao</Text>
            <View style={st.mediaGrid}>
              {mediaAssets.map((asset) => (
                <TouchableOpacity
                  key={asset.media_id}
                  style={st.mediaCard}
                  onPress={() => handleMediaClick(asset)}
                  activeOpacity={0.7}
                  data-testid={`media-${asset.media_id}`}
                >
                  {asset.type === 'image' ? (
                    <Image source={{ uri: asset.url }} style={st.mediaThumb} resizeMode="cover" />
                  ) : (
                    <View style={st.mediaVideoThumb}>
                      <Ionicons name="play-circle" size={36} color="#10B981" />
                    </View>
                  )}
                  <View style={st.mediaCardFooter}>
                    <Text style={st.mediaTitle} numberOfLines={1}>{asset.title}</Text>
                    <Ionicons name="expand-outline" size={14} color="#475569" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ===== MINHA REDE ===== */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Minha Rede</Text>
          <View style={st.netCard} data-testid="wallet-network">
            <View style={st.netHeader}>
              <Text style={[st.netHeaderCell, { flex: 2 }]}></Text>
              <Text style={st.netHeaderCell}>Indicados</Text>
              <Text style={st.netHeaderCell}>Ativos</Text>
              <Text style={st.netHeaderCell}>Creditos</Text>
            </View>
            <NetRow label="Nivel 1" sub="Diretos" color="#10B981" total={l1.total} active={l1.active} credits={l1.credits} />
            <View style={st.netSep} />
            <NetRow label="Nivel 2" sub="" color="#3B82F6" total={l2.total} active={l2.active} credits={l2.credits} />
            <View style={st.netSep} />
            <NetRow label="Nivel 3" sub="" color="#F59E0B" total={l3.total} active={l3.active} credits={l3.credits} />
            <View style={st.netSep} />
            <NetRow label="Estabelecimentos" sub="" color="#8B5CF6" total={est.total} active={est.active} credits={est.credits} />
          </View>
        </View>

        {/* ===== HISTORICO ===== */}
        {transactions.length > 0 && (
          <View style={st.section}>
            <Text style={st.sectionTitle}>Historico</Text>
            <View style={st.txList}>
              {transactions.slice(0, 8).map((item: Transaction, index: number) => (
                <View key={index} style={st.txRow}>
                  <View style={[st.txDot, item.amount < 0 && { backgroundColor: '#EF4444' }]} />
                  <View style={st.txBody}>
                    <Text style={st.txDesc} numberOfLines={1}>{item.description}</Text>
                    <Text style={st.txDate}>{new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</Text>
                  </View>
                  <Text style={[st.txAmt, item.amount < 0 && { color: '#EF4444' }]}>
                    {item.amount >= 0 ? '+' : ''}R$ {item.amount.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ===== FULLSCREEN MEDIA VIEWER MODAL ===== */}
      <Modal visible={showMediaViewer} animationType="fade" transparent onRequestClose={() => setShowMediaViewer(false)}>
        <View style={st.viewerOverlay}>
          <View style={st.viewerContainer} data-testid="media-viewer-modal">
            {/* Close button */}
            <TouchableOpacity style={st.viewerClose} onPress={() => setShowMediaViewer(false)} data-testid="media-viewer-close">
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {viewingMedia && (
              <>
                {viewingMedia.type === 'image' ? (
                  <Image source={{ uri: viewingMedia.url }} style={st.viewerImage} resizeMode="contain" />
                ) : viewingMedia.type === 'video' && viewingMedia.url ? (
                  <View style={st.viewerVideoPlayer}>
                    {typeof document !== 'undefined' ? (
                      <video
                        src={viewingMedia.url}
                        controls
                        playsInline
                        style={{ width: '100%', maxHeight: 320, borderRadius: 12, backgroundColor: '#000' }}
                      />
                    ) : (
                      <View style={st.viewerVideo}>
                        <Ionicons name="play-circle" size={64} color="#10B981" />
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={st.viewerVideo}>
                    <Ionicons name="play-circle" size={64} color="#10B981" />
                  </View>
                )}
                <Text style={st.viewerTitle}>{viewingMedia.title}</Text>
                <View style={st.viewerButtons}>
                  <TouchableOpacity style={st.viewerBackBtn} onPress={() => setShowMediaViewer(false)} data-testid="media-viewer-back">
                    <Ionicons name="arrow-back" size={18} color="#CBD5E1" />
                    <Text style={st.viewerBackText}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={st.viewerPostBtn} onPress={handlePostFromViewer} data-testid="media-viewer-post">
                    <Ionicons name="share-social" size={18} color="#FFF" />
                    <Text style={st.viewerPostText}>Postar / Indicar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <ShareInviteModal
        visible={shareModalVisible}
        onClose={() => { setShareModalVisible(false); setShareMediaData(null); }}
        referralCode={networkData?.referral_code || ''}
        userName={user?.name || ''}
        type={shareType}
        mediaData={shareMediaData}
      />
    </View>
  );
}

function NetRow({ label, sub, color, total, active, credits }: {
  label: string; sub: string; color: string; total: number; active: number; credits: number;
}) {
  return (
    <View style={st.netRow}>
      <View style={[st.netCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
        <View style={[st.netDot, { backgroundColor: color }]} />
        <View>
          <Text style={st.netLabel}>{label}</Text>
          {sub ? <Text style={st.netSub}>{sub}</Text> : null}
        </View>
      </View>
      <Text style={st.netValue}>{total}</Text>
      <Text style={[st.netValue, { color: active > 0 ? '#10B981' : '#475569' }]}>{active}</Text>
      <Text style={[st.netValue, { color: credits > 0 ? '#10B981' : '#475569' }]}>
        {credits > 0 ? `R$${credits.toFixed(0)}` : '—'}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0F1A' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 20 },

  hero: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#E2E8F0', letterSpacing: -0.5 },
  heroBalanceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  heroCurrency: { fontSize: 20, fontWeight: '600', color: '#10B981', marginRight: 4 },
  heroBalance: { fontSize: 46, fontWeight: '800', color: '#10B981', letterSpacing: -1.5 },
  heroImpact: { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginTop: 8, lineHeight: 20 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 10, flexWrap: 'wrap' },
  heroSavingsPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#10B98110', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  heroSavingsText: { fontSize: 12, fontWeight: '600', color: '#6EE7B7' },
  helpBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#10B98130', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  helpBtnText: { fontSize: 12, fontWeight: '600', color: '#10B981' },

  section: { marginTop: 28, paddingHorizontal: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#CBD5E1', marginBottom: 14 },

  tokenCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1E293B' },
  tokenLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  tokenIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#10B98115', justifyContent: 'center', alignItems: 'center' },
  tokenTitle: { fontSize: 14, fontWeight: '600', color: '#E2E8F0' },
  tokenSub: { fontSize: 11, color: '#475569', marginTop: 1 },
  tokenCount: { fontSize: 26, fontWeight: '800', color: '#E2E8F0', marginRight: 14 },
  tokenBuyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#10B98140', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  tokenBuyText: { fontSize: 13, fontWeight: '600', color: '#10B981' },

  purchaseHistoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#0D111D', borderRadius: 10, borderWidth: 1, borderColor: '#1E293B' },
  purchaseHistoryText: { flex: 1, fontSize: 13, fontWeight: '500', color: '#94A3B8' },

  referralCard: { backgroundColor: '#111827', borderRadius: 16, borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden' },
  referralBtns: { flexDirection: 'row', alignItems: 'center' },
  referralBtn: { flex: 1, alignItems: 'center', paddingVertical: 18, gap: 8 },
  referralBtnIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10B98112', justifyContent: 'center', alignItems: 'center' },
  referralBtnLabel: { fontSize: 13, fontWeight: '600', color: '#CBD5E1' },
  referralDivider: { width: 1, height: 40, backgroundColor: '#1E293B' },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1E293B', backgroundColor: '#0D111D' },
  codeText: { fontSize: 13, fontWeight: '700', color: '#475569', letterSpacing: 1.5 },

  /* Media Gallery (Grid) */
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mediaCard: { width: '47%', backgroundColor: '#111827', borderRadius: 14, borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden' },
  mediaThumb: { width: '100%', height: 110 },
  mediaVideoThumb: { width: '100%', height: 110, backgroundColor: '#0D111D', justifyContent: 'center', alignItems: 'center' },
  mediaCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 },
  mediaTitle: { fontSize: 12, fontWeight: '600', color: '#CBD5E1', flex: 1, marginRight: 4 },

  /* Fullscreen Viewer */
  viewerOverlay: { flex: 1, backgroundColor: '#000000EE', justifyContent: 'center', alignItems: 'center' },
  viewerContainer: { width: '92%', maxWidth: 440, maxHeight: '88%', alignItems: 'center' },
  viewerClose: { position: 'absolute', top: -40, right: 0, zIndex: 10, padding: 8 },
  viewerImage: { width: '100%', height: 320, borderRadius: 16 },
  viewerVideo: { width: '100%', height: 320, borderRadius: 16, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
  viewerVideoPlayer: { width: '100%', borderRadius: 16, overflow: 'hidden' as any, backgroundColor: '#000' },
  viewerVideoText: { color: '#475569', marginTop: 8, fontSize: 14 },
  viewerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginTop: 16, textAlign: 'center' },
  viewerButtons: { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' },
  viewerBackBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  viewerBackText: { fontSize: 14, fontWeight: '600', color: '#CBD5E1' },
  viewerPostBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: '#10B981' },
  viewerPostText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  /* Network Table */
  netCard: { backgroundColor: '#111827', borderRadius: 16, borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden' },
  netHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#0D111D', borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  netHeaderCell: { flex: 1, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  netRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  netCell: { flex: 1 },
  netDot: { width: 8, height: 8, borderRadius: 4 },
  netLabel: { fontSize: 13, fontWeight: '600', color: '#CBD5E1' },
  netSub: { fontSize: 10, color: '#475569', marginTop: 1 },
  netValue: { flex: 1, fontSize: 14, fontWeight: '700', color: '#CBD5E1', textAlign: 'center' },
  netSep: { height: 1, backgroundColor: '#1E293B', marginHorizontal: 16 },

  txList: { backgroundColor: '#111827', borderRadius: 16, borderWidth: 1, borderColor: '#1E293B', paddingVertical: 4 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  txDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 12 },
  txBody: { flex: 1 },
  txDesc: { fontSize: 13, fontWeight: '500', color: '#CBD5E1' },
  txDate: { fontSize: 11, color: '#475569', marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: '700', color: '#10B981' },
});

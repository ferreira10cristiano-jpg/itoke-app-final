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
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/lib/api';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Video Form Component
const VideoForm = ({ title, setTitle, desc, setDesc, url, setUrl, order, setOrder, active, setActive, saving, editing, onSave, onCancel, testPrefix }: any) => (
  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 }} data-testid={`${testPrefix}-video-form`}>
    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 10 }}>
      {editing ? 'Editar Video' : 'Novo Video'}
    </Text>
    <TextInput
      style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1E293B', marginBottom: 8 }}
      value={title}
      onChangeText={setTitle}
      placeholder="Titulo do video"
      placeholderTextColor="#94A3B8"
      data-testid={`${testPrefix}-video-title-input`}
    />
    <TextInput
      style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1E293B', marginBottom: 8 }}
      value={desc}
      onChangeText={setDesc}
      placeholder="Descricao curta"
      placeholderTextColor="#94A3B8"
      data-testid={`${testPrefix}-video-desc-input`}
    />
    <TextInput
      style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1E293B', marginBottom: 8 }}
      value={url}
      onChangeText={setUrl}
      placeholder="URL do video (YouTube ou Vimeo) - deixe vazio para placeholder"
      placeholderTextColor="#94A3B8"
      data-testid={`${testPrefix}-video-url-input`}
    />
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
      <TextInput
        style={{ flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1E293B' }}
        value={order}
        onChangeText={setOrder}
        placeholder="Ordem (1, 2, 3...)"
        placeholderTextColor="#94A3B8"
        keyboardType="numeric"
        data-testid={`${testPrefix}-video-order-input`}
      />
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: active ? '#ECFDF5' : '#FEF2F2', borderWidth: 1, borderColor: active ? '#10B981' : '#EF4444' }}
        onPress={() => setActive(!active)}
        data-testid={`${testPrefix}-video-toggle-active`}
      >
        <Ionicons name={active ? 'checkmark-circle' : 'close-circle'} size={18} color={active ? '#10B981' : '#EF4444'} />
        <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#065F46' : '#991B1B' }}>{active ? 'Ativo' : 'Inativo'}</Text>
      </TouchableOpacity>
    </View>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <TouchableOpacity
        style={{ backgroundColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, opacity: saving ? 0.6 : 1 }}
        onPress={onSave}
        disabled={saving}
        data-testid={`${testPrefix}-video-save-btn`}
      >
        {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Salvar</Text>}
      </TouchableOpacity>
      <TouchableOpacity
        style={{ backgroundColor: '#94A3B8', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}
        onPress={onCancel}
        data-testid={`${testPrefix}-video-cancel-btn`}
      >
        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// Video Item Component
const VideoItem = ({ video, onEdit, onDelete, onToggle, color }: any) => (
  <View style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }} data-testid={`video-item-${video.video_id}`}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: video.active ? (color + '20') : '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="videocam" size={18} color={video.active ? color : '#EF4444'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }} numberOfLines={1}>{video.title}</Text>
          <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }} numberOfLines={1}>
            {video.video_url || 'Sem URL (placeholder)'}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <View style={{ backgroundColor: video.active ? '#ECFDF5' : '#FEF2F2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: video.active ? '#065F46' : '#991B1B' }}>
            {video.active ? 'Ativo' : 'Inativo'}
          </Text>
        </View>
        <View style={{ backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>#{video.order}</Text>
        </View>
        <TouchableOpacity onPress={() => onToggle(video)} style={{ padding: 6 }}>
          <Ionicons name={video.active ? 'pause-circle' : 'play-circle'} size={18} color={video.active ? '#F59E0B' : '#10B981'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onEdit(video)} style={{ padding: 6 }} data-testid={`video-edit-${video.video_id}`}>
          <Ionicons name="pencil" size={16} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(video.video_id)} style={{ padding: 6 }} data-testid={`video-delete-${video.video_id}`}>
          <Ionicons name="trash" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

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
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'withdrawals' | 'users' | 'media' | 'faq' | 'brand' | 'relatorio' | 'legal' | 'loja' | 'alertas' | 'reps'>('overview');

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
  const [newMediaTarget, setNewMediaTarget] = useState<'client' | 'establishment' | 'both'>('both');
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [uploadedBase64, setUploadedBase64] = useState<string>('');
  const [previewMedia, setPreviewMedia] = useState<any>(null);

  // FAQ state
  const [faqTopics, setFaqTopics] = useState<any[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  const [faqTitle, setFaqTitle] = useState('');
  const [faqContent, setFaqContent] = useState('');
  const [faqIcon, setFaqIcon] = useState('help-circle-outline');
  const [faqOrder, setFaqOrder] = useState('');
  const [faqVideoUrl, setFaqVideoUrl] = useState('');
  const [faqSaving, setFaqSaving] = useState(false);
  const [supportEmail, setSupportEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');

  // Establishment FAQ state
  const [estFaqTopics, setEstFaqTopics] = useState<any[]>([]);
  const [estFaqLoading, setEstFaqLoading] = useState(false);
  const [showEstFaqForm, setShowEstFaqForm] = useState(false);
  const [editingEstFaq, setEditingEstFaq] = useState<any>(null);
  const [estFaqTitle, setEstFaqTitle] = useState('');
  const [estFaqContent, setEstFaqContent] = useState('');
  const [estFaqIcon, setEstFaqIcon] = useState('help-circle-outline');
  const [estFaqOrder, setEstFaqOrder] = useState('');
  const [estFaqVideoUrl, setEstFaqVideoUrl] = useState('');
  const [estFaqSaving, setEstFaqSaving] = useState(false);
  const [faqSubTab, setFaqSubTab] = useState<'client' | 'establishment'>('client');

  // Video management state
  const [clientVideos, setClientVideos] = useState<any[]>([]);
  const [estVideos, setEstVideos] = useState<any[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoOrder, setVideoOrder] = useState('');
  const [videoActive, setVideoActive] = useState(true);
  const [videoSaving, setVideoSaving] = useState(false);

  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingText, setGeneratingText] = useState(false);
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<VoucherAudit | null>(null);
  const [searchError, setSearchError] = useState('');
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Brand state
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [brandTagline, setBrandTagline] = useState('Ofertas que saem de Graça');
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandMsg, setBrandMsg] = useState('');

  // Report Layout state
  const [reportLayout, setReportLayout] = useState<any>(null);
  const [reportLayoutLoading, setReportLayoutLoading] = useState(false);
  const [reportCompanyName, setReportCompanyName] = useState('iToke');
  const [reportTagline, setReportTagline] = useState('Ofertas que saem de Graça');
  const [reportDisclaimer, setReportDisclaimer] = useState('');
  const [reportFooter, setReportFooter] = useState('');
  const [reportSaving, setReportSaving] = useState(false);
  const [reportMsg, setReportMsg] = useState('');

  // Legal documents state
  const [legalDocs, setLegalDocs] = useState<any[]>([]);
  const [legalLoading, setLegalLoading] = useState(false);
  const [editingLegalDoc, setEditingLegalDoc] = useState<any>(null);
  const [legalEditContent, setLegalEditContent] = useState('');
  const [legalEditTitle, setLegalEditTitle] = useState('');
  const [legalSaving, setLegalSaving] = useState(false);
  const [legalMsg, setLegalMsg] = useState('');

  // App Store config state
  const [storeConfig, setStoreConfig] = useState<any>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeMsg, setStoreMsg] = useState('');
  const [storeAppName, setStoreAppName] = useState('iToke');
  const [storeTagline, setStoreTagline] = useState('Ofertas que saem de Graça');
  const [storeShortDesc, setStoreShortDesc] = useState('');
  const [storeFullDesc, setStoreFullDesc] = useState('');
  const [storeKeywords, setStoreKeywords] = useState('');
  const [storeCategory, setStoreCategory] = useState('Compras');
  const [storeLogoUrl, setStoreLogoUrl] = useState('');
  const [storeSplashColor, setStoreSplashColor] = useState('#0F172A');


  // Fraud alerts state
  const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);
  const [fraudStats, setFraudStats] = useState<any>({ total: 0, new: 0, reviewed: 0 });
  const [fraudLoading, setFraudLoading] = useState(false);
  const [fraudFilter, setFraudFilter] = useState('all');

  // Representatives state
  const [reps, setReps] = useState<any[]>([]);
  const [repsLoading, setRepsLoading] = useState(false);
  const [showRepForm, setShowRepForm] = useState(false);
  const [repName, setRepName] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [repCnpj, setRepCnpj] = useState('');
  const [repFreeTokens, setRepFreeTokens] = useState('0');
  const [repSaving, setRepSaving] = useState(false);
  const [repMsg, setRepMsg] = useState('');
  const [selectedRep, setSelectedRep] = useState<any>(null);
  const [repCommissionValue, setRepCommissionValue] = useState('1.00');
  const [addTokensAmount, setAddTokensAmount] = useState('');

  // Establishment Contract state
  const [estContractText, setEstContractText] = useState('');
  const [estContractLoading, setEstContractLoading] = useState(false);
  const [estContractSaving, setEstContractSaving] = useState(false);
  const [estContractMsg, setEstContractMsg] = useState('');

  // App Videos state
  const [openingVideoUrl, setOpeningVideoUrl] = useState('');
  const [freeOffersVideoUrl, setFreeOffersVideoUrl] = useState('');
  const [videosSaving, setVideosSaving] = useState(false);
  const [videosMsg, setVideosMsg] = useState('');

  // Admin Offers editing state
  const [adminOffers, setAdminOffers] = useState<any[]>([]);
  const [adminOffersLoading, setAdminOffersLoading] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [offerEditTitle, setOfferEditTitle] = useState('');
  const [offerEditCity, setOfferEditCity] = useState('');
  const [offerEditDesc, setOfferEditDesc] = useState('');
  const [offerSaving, setOfferSaving] = useState(false);

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

  const fetchFaqTopics = useCallback(async () => {
    try {
      setFaqLoading(true);
      const [topics, settings] = await Promise.all([
        api.getAdminHelpTopics(),
        api.getAdminHelpSettings(),
      ]);
      setFaqTopics(topics);
      setSupportEmail(settings.support_email || '');
    } catch (err: any) {
      console.error('Error fetching FAQ:', err);
    } finally {
      setFaqLoading(false);
    }
  }, []);

  const fetchEstFaqTopics = useCallback(async () => {
    try {
      setEstFaqLoading(true);
      const topics = await api.getAdminEstHelpTopics();
      setEstFaqTopics(topics);
    } catch (err: any) {
      console.error('Error fetching Est FAQ:', err);
    } finally {
      setEstFaqLoading(false);
    }
  }, []);

  const fetchVideos = useCallback(async () => {
    try {
      setVideosLoading(true);
      const [cVideos, eVideos] = await Promise.all([
        api.getAllOnboardingVideos('client'),
        api.getAllOnboardingVideos('establishment'),
      ]);
      setClientVideos(cVideos);
      setEstVideos(eVideos);
    } catch (err: any) {
      console.error('Error fetching videos:', err);
    } finally {
      setVideosLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'financial') { fetchFinancial(); fetchTokenPackages(); }
    if (activeTab === 'withdrawals') fetchWithdrawals();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'media') { fetchMedia(); fetchAppVideos(); }
    if (activeTab === 'faq') { fetchFaqTopics(); fetchEstFaqTopics(); fetchVideos(); }
    if (activeTab === 'brand') fetchBrand();
    if (activeTab === 'relatorio') fetchReportLayout();
    if (activeTab === 'legal') { fetchLegalDocs(); fetchEstContract(); }
    if (activeTab === 'loja') { fetchStoreConfig(); fetchAdminOffers(); }
    if (activeTab === 'alertas') fetchFraudAlerts();
    if (activeTab === 'reps') fetchReps();
  }, [activeTab, fetchFinancial, fetchWithdrawals, fetchUsers, fetchMedia, fetchTokenPackages, fetchFaqTopics, fetchEstFaqTopics, fetchVideos]);

  const fetchBrand = async () => {
    setBrandLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/brand`, {
        headers: { 'Authorization': `Bearer ${await api.getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBrandLogoUrl(data.logo_url || '');
        setBrandTagline(data.tagline || 'Ofertas que saem de Graça');
      }
    } catch (e) {
      console.error('Error fetching brand:', e);
    } finally {
      setBrandLoading(false);
    }
  };

  const handleBrandLogoUpload = async () => {
    // Web
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target?.result as string;
          setBrandLogoUrl(base64);
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }

    // Native: use expo-image-picker
    try {
      const ImagePicker = require('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Permita o acesso à galeria.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setBrandLogoUrl(base64);
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível abrir a galeria');
    }
  };

  const handleSaveBrand = async () => {
    setBrandSaving(true);
    setBrandMsg('');
    try {
      const res = await fetch(`${API_URL}/api/admin/brand`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await api.getToken()}`,
        },
        body: JSON.stringify({ logo_url: brandLogoUrl, tagline: brandTagline }),
      });
      if (res.ok) {
        setBrandMsg('Marca atualizada com sucesso!');
      } else {
        setBrandMsg('Erro ao salvar');
      }
    } catch (e) {
      setBrandMsg('Erro ao salvar');
    } finally {
      setBrandSaving(false);
      setTimeout(() => setBrandMsg(''), 3000);
    }
  };

  // Report Layout functions
  const fetchReportLayout = async () => {
    setReportLayoutLoading(true);
    try {
      const data = await api.getReportLayout();
      setReportLayout(data);
      setReportCompanyName(data.company_name || 'iToke');
      setReportTagline(data.tagline || 'Ofertas que saem de Graça');
      setReportDisclaimer(data.disclaimer || '');
      setReportFooter(data.footer_text || '');
    } catch (e) {
      console.error('Error fetching report layout:', e);
    } finally {
      setReportLayoutLoading(false);
    }
  };

  const handleSaveReportLayout = async () => {
    setReportSaving(true);
    setReportMsg('');
    try {
      await api.updateReportLayout({
        company_name: reportCompanyName,
        tagline: reportTagline,
        disclaimer: reportDisclaimer,
        footer_text: reportFooter,
      });
      setReportMsg('Layout do relatorio atualizado!');
    } catch (e: any) {
      setReportMsg('Erro ao salvar: ' + (e.message || ''));
    } finally {
      setReportSaving(false);
      setTimeout(() => setReportMsg(''), 3000);
    }
  };

  // Legal documents functions
  const fetchLegalDocs = async () => {
    setLegalLoading(true);
    try {
      const docs = await api.getAdminLegalDocuments();
      setLegalDocs(docs);
    } catch (e) {
      console.error('Error fetching legal docs:', e);
    } finally {
      setLegalLoading(false);
    }
  };

  const handleSaveLegalDoc = async () => {
    if (!editingLegalDoc) return;
    setLegalSaving(true);
    setLegalMsg('');
    try {
      await api.updateLegalDocument(editingLegalDoc.key, {
        title: legalEditTitle,
        content: legalEditContent,
      });
      setLegalMsg('Documento atualizado!');
      setEditingLegalDoc(null);
      fetchLegalDocs();
    } catch (e: any) {
      setLegalMsg('Erro: ' + (e.message || ''));
    } finally {
      setLegalSaving(false);
      setTimeout(() => setLegalMsg(''), 3000);
    }
  };

  // App Store config functions

  const fetchFraudAlerts = async () => {
    setFraudLoading(true);
    try {
      const data = await api.getFraudAlerts(fraudFilter);
      setFraudAlerts(data.alerts);
      setFraudStats(data.stats);
    } catch (err) { console.error(err); }
    setFraudLoading(false);
  };

  const handleReviewAlert = async (alertId: string) => {
    try {
      await api.reviewFraudAlert(alertId);
      fetchFraudAlerts();
    } catch (err) { console.error(err); }
  };


  const fetchStoreConfig = async () => {
    setStoreLoading(true);
    try {
      const data = await api.getAppStoreConfig();
      setStoreConfig(data);
      setStoreAppName(data.app_name || 'iToke');
      setStoreTagline(data.tagline || '');
      setStoreShortDesc(data.short_description || '');
      setStoreFullDesc(data.full_description || '');
      setStoreKeywords(data.keywords || '');
      setStoreCategory(data.category || 'Compras');
      setStoreLogoUrl(data.logo_url || '');
      setStoreSplashColor(data.splash_background_color || '#0F172A');
    } catch (e) {
      console.error('Error fetching store config:', e);
    } finally {
      setStoreLoading(false);
    }
  };

  const fetchReps = async () => {
    setRepsLoading(true);
    try {
      const data = await api.getRepresentatives();
      setReps(data);
      const settings = await api.getRepCommissionSettings();
      setRepCommissionValue(String(settings.commission_value));
    } catch (err) { console.error(err); }
    setRepsLoading(false);
  };

  const handleCreateRep = async () => {
    if (!repName || !repEmail || !repCnpj) {
      setRepMsg('Preencha todos os campos');
      return;
    }
    setRepSaving(true);
    setRepMsg('');
    try {
      await api.createRepresentative({
        name: repName,
        email: repEmail,
        cnpj: repCnpj,
        free_tokens: parseInt(repFreeTokens) || 0,
      });
      setRepMsg('Representante criado com sucesso!');
      setRepName(''); setRepEmail(''); setRepCnpj(''); setRepFreeTokens('0');
      setShowRepForm(false);
      fetchReps();
    } catch (err: any) {
      setRepMsg(err.message || 'Erro ao criar representante');
    }
    setRepSaving(false);
  };

  const handleUpdateRepStatus = async (repId: string, status: string) => {
    try {
      await api.updateRepresentative(repId, { status });
      fetchReps();
    } catch (err) { console.error(err); }
  };

  const handleAddFreeTokens = async (repId: string) => {
    const amount = parseInt(addTokensAmount);
    if (!amount || amount <= 0) return;
    try {
      await api.updateRepresentative(repId, { free_tokens_to_add: amount });
      setAddTokensAmount('');
      fetchReps();
    } catch (err) { console.error(err); }
  };

  const handleSaveCommissionValue = async () => {
    try {
      await api.updateRepCommissionSettings(parseFloat(repCommissionValue));
      setRepMsg('Valor de comissao atualizado!');
    } catch (err) { console.error(err); }
  };

  const fetchEstContract = async () => {
    setEstContractLoading(true);
    try {
      const data = await api.getAdminEstContract();
      setEstContractText(data.contract_text || '');
    } catch (err) { console.error(err); }
    setEstContractLoading(false);
  };

  const handleSaveEstContract = async () => {
    if (!estContractText.trim()) { setEstContractMsg('Texto obrigatorio'); return; }
    setEstContractSaving(true);
    setEstContractMsg('');
    try {
      await api.updateAdminEstContract(estContractText);
      setEstContractMsg('Contrato atualizado com sucesso!');
    } catch (err: any) {
      setEstContractMsg(err.message || 'Erro ao salvar');
    }
    setEstContractSaving(false);
  };

  const fetchAppVideos = async () => {
    try {
      const data = await api.getAppVideos();
      setOpeningVideoUrl(data.opening_video_url || '');
      setFreeOffersVideoUrl(data.free_offers_video_url || '');
    } catch {}
  };

  const handleSaveAppVideos = async () => {
    setVideosSaving(true); setVideosMsg('');
    try {
      await api.updateAppVideos({ opening_video_url: openingVideoUrl, free_offers_video_url: freeOffersVideoUrl });
      setVideosMsg('Videos atualizados!');
    } catch (err: any) { setVideosMsg(err.message || 'Erro'); }
    setVideosSaving(false);
  };

  const fetchAdminOffers = async () => {
    setAdminOffersLoading(true);
    try {
      const data = await api.getAdminAllOffers();
      setAdminOffers(data);
    } catch {}
    setAdminOffersLoading(false);
  };

  const handleSaveOffer = async () => {
    if (!editingOffer) return;
    setOfferSaving(true);
    try {
      await api.updateAdminOffer(editingOffer.offer_id, {
        title: offerEditTitle,
        city: offerEditCity,
        description: offerEditDesc,
      });
      setEditingOffer(null);
      fetchAdminOffers();
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(err.message || 'Erro');
    }
    setOfferSaving(false);
  };

  const copyToClipboard = (text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {
          fallbackCopy(text);
        });
      } else {
        fallbackCopy(text);
      }
    } catch {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    if (Platform.OS === 'web') window.alert('Copiado: ' + text);
  };

  const handleSaveStoreConfig = async () => {
    setStoreSaving(true);
    setStoreMsg('');
    try {
      await api.updateAppStoreConfig({
        app_name: storeAppName,
        tagline: storeTagline,
        short_description: storeShortDesc,
        full_description: storeFullDesc,
        keywords: storeKeywords,
        category: storeCategory,
        logo_url: storeLogoUrl,
        splash_background_color: storeSplashColor,
      });
      setStoreMsg('Configuracoes salvas!');
    } catch (e: any) {
      setStoreMsg('Erro: ' + (e.message || ''));
    } finally {
      setStoreSaving(false);
      setTimeout(() => setStoreMsg(''), 3000);
    }
  };

  const handleDownloadLogo = () => {
    // Create a canvas with logo + text
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 1080, 1080);

    const drawText = () => {
      // Name "iToke"
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 96px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('iToke', 540, 700);

      // Tagline
      ctx.fillStyle = '#94A3B8';
      ctx.font = '36px sans-serif';
      ctx.fillText(brandTagline, 540, 770);

      // Download
      const link = document.createElement('a');
      link.download = 'iToke-logo.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    if (brandLogoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Draw logo centered
        const size = 320;
        const x = (1080 - size) / 2;
        const y = 200;
        ctx.drawImage(img, x, y, size, size);
        drawText();
      };
      img.onerror = () => {
        // Draw placeholder circle
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(540, 360, 140, 0, Math.PI * 2);
        ctx.stroke();
        drawText();
      };
      img.src = brandLogoUrl;
    } else {
      // Draw placeholder
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(540, 360, 140, 0, Math.PI * 2);
      ctx.stroke();
      drawText();
    }
  };

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
    if (!newMediaUrl.trim() && !uploadedBase64) return;
    setAddingMedia(true);
    try {
      await api.addMedia(
        newMediaUrl.trim(),
        newMediaTitle.trim(),
        newMediaType,
        uploadedBase64 || undefined,
        newMediaTarget
      );
      setNewMediaUrl('');
      setNewMediaTitle('');
      setUploadedBase64('');
      fetchMedia();
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(err.message || 'Erro ao adicionar midia');
    } finally {
      setAddingMedia(false);
    }
  };

  const handleFileUpload = async (type: 'image' | 'video') => {
    // Web: use document.createElement('input')
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = type === 'image' ? 'image/*' : 'video/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const maxSize = type === 'image' ? 5 * 1024 * 1024 : 20 * 1024 * 1024;
        if (file.size > maxSize) {
          if (typeof window !== 'undefined') window.alert(`Arquivo muito grande. Max: ${type === 'image' ? '5MB' : '20MB'}`);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          setUploadedBase64(base64);
          setNewMediaUrl('');
          setNewMediaType(type);
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }

    // Native: use expo-image-picker
    try {
      const ImagePicker = require('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Permita o acesso à galeria para fazer upload.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'image' ? ['images'] : ['videos'],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const mimeType = type === 'image' ? 'image/jpeg' : 'video/mp4';
          const base64 = `data:${mimeType};base64,${asset.base64}`;
          setUploadedBase64(base64);
          setNewMediaUrl('');
          setNewMediaType(type);
        } else if (asset.uri) {
          setNewMediaUrl(asset.uri);
          setNewMediaType(type);
        }
      }
    } catch (err) {
      console.error('Image picker error:', err);
      Alert.alert('Erro', 'Não foi possível abrir a galeria');
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

  // FAQ Handlers
  const resetFaqForm = () => {
    setFaqTitle(''); setFaqContent(''); setFaqIcon('help-circle-outline'); setFaqOrder(''); setFaqVideoUrl('');
    setEditingFaq(null); setShowFaqForm(false);
  };

  const handleSaveFaqTopic = async () => {
    if (!faqTitle.trim() || !faqContent.trim()) {
      if (typeof window !== 'undefined') window.alert('Titulo e conteudo obrigatorios');
      return;
    }
    setFaqSaving(true);
    try {
      const order = parseInt(faqOrder) || faqTopics.length + 1;
      if (editingFaq) {
        await api.updateHelpTopic(editingFaq.topic_id, { title: faqTitle.trim(), content: faqContent.trim(), icon: faqIcon, order, video_url: faqVideoUrl.trim() });
      } else {
        await api.createHelpTopic({ title: faqTitle.trim(), content: faqContent.trim(), icon: faqIcon, order, video_url: faqVideoUrl.trim() } as any);
      }
      resetFaqForm();
      fetchFaqTopics();
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(err.message || 'Erro ao salvar topico');
    } finally {
      setFaqSaving(false);
    }
  };

  const handleEditFaq = (topic: any) => {
    setEditingFaq(topic);
    setFaqTitle(topic.title);
    setFaqContent(topic.content);
    setFaqIcon(topic.icon || 'help-circle-outline');
    setFaqOrder(String(topic.order));
    setFaqVideoUrl(topic.video_url || '');
    setShowFaqForm(true);
  };

  const handleDeleteFaq = async (topicId: string) => {
    if (typeof window !== 'undefined') {
      if (!window.confirm('Remover este topico?')) return;
    }
    try {
      await api.deleteHelpTopic(topicId);
      fetchFaqTopics();
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(err.message || 'Erro');
    }
  };

  const handleSaveSupportEmail = async () => {
    if (!supportEmail.trim()) {
      setEmailMsg('Email obrigatorio');
      return;
    }
    setSavingEmail(true);
    setEmailMsg('');
    try {
      await api.updateHelpSettings(supportEmail.trim());
      setEmailMsg('Salvo com sucesso!');
      setTimeout(() => setEmailMsg(''), 3000);
    } catch (err: any) {
      setEmailMsg(err.message || 'Erro ao salvar');
    } finally {
      setSavingEmail(false);
    }
  };

  // Establishment FAQ Handlers
  const resetEstFaqForm = () => {
    setEstFaqTitle(''); setEstFaqContent(''); setEstFaqIcon('help-circle-outline'); setEstFaqOrder(''); setEstFaqVideoUrl('');
    setEditingEstFaq(null); setShowEstFaqForm(false);
  };

  const handleSaveEstFaqTopic = async () => {
    if (!estFaqTitle.trim() || !estFaqContent.trim()) {
      if (typeof window !== 'undefined') window.alert('Titulo e conteudo obrigatorios');
      return;
    }
    setEstFaqSaving(true);
    try {
      const order = parseInt(estFaqOrder) || estFaqTopics.length + 1;
      if (editingEstFaq) {
        await api.updateEstHelpTopic(editingEstFaq.topic_id, { title: estFaqTitle.trim(), content: estFaqContent.trim(), icon: estFaqIcon, order, video_url: estFaqVideoUrl.trim() });
      } else {
        await api.createEstHelpTopic({ title: estFaqTitle.trim(), content: estFaqContent.trim(), icon: estFaqIcon, order, video_url: estFaqVideoUrl.trim() } as any);
      }
      resetEstFaqForm();
      fetchEstFaqTopics();
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(err.message || 'Erro ao salvar topico');
    } finally {
      setEstFaqSaving(false);
    }
  };

  const handleEditEstFaq = (topic: any) => {
    setEditingEstFaq(topic);
    setEstFaqTitle(topic.title);
    setEstFaqContent(topic.content);
    setEstFaqIcon(topic.icon || 'help-circle-outline');
    setEstFaqOrder(String(topic.order));
    setEstFaqVideoUrl(topic.video_url || '');
    setShowEstFaqForm(true);
  };

  const handleDeleteEstFaq = async (topicId: string) => {
    if (typeof window !== 'undefined') {
      if (!window.confirm('Remover este topico?')) return;
    }
    try {
      await api.deleteEstHelpTopic(topicId);
      fetchEstFaqTopics();
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(err.message || 'Erro');
    }
  };

  const ICON_OPTIONS = [
    'help-circle-outline', 'ticket-outline', 'wallet-outline', 'trending-up-outline',
    'time-outline', 'storefront-outline', 'infinite-outline', 'shield-checkmark-outline',
    'card-outline', 'people-outline', 'gift-outline', 'star-outline',
    'chatbubble-outline', 'phone-portrait-outline', 'key-outline', 'settings-outline',
    'flash-outline', 'bag-add-outline', 'layers-outline', 'cash-outline',
    'pause-circle-outline', 'bar-chart-outline',
  ];

  // Video Handlers
  const resetVideoForm = () => {
    setVideoTitle(''); setVideoDesc(''); setVideoUrl(''); setVideoOrder(''); setVideoActive(true);
    setEditingVideo(null); setShowVideoForm(false);
  };

  const isValidVideoUrl = (url: string) => {
    if (!url) return true; // empty is ok (placeholder)
    return /youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/\d+/.test(url);
  };

  const handleSaveVideo = async () => {
    if (!videoTitle.trim()) {
      if (typeof window !== 'undefined') window.alert('Titulo obrigatorio');
      return;
    }
    if (videoUrl && !isValidVideoUrl(videoUrl)) {
      if (typeof window !== 'undefined') window.alert('URL de video invalida. Use links do YouTube ou Vimeo.');
      return;
    }
    setVideoSaving(true);
    const target = faqSubTab === 'client' ? 'client' : 'establishment';
    const currentVideos = faqSubTab === 'client' ? clientVideos : estVideos;
    const order = parseInt(videoOrder) || currentVideos.length + 1;
    try {
      if (editingVideo) {
        await api.updateOnboardingVideo(editingVideo.video_id, { title: videoTitle.trim(), description: videoDesc.trim(), video_url: videoUrl.trim(), order, active: videoActive, target });
      } else {
        await api.createOnboardingVideo({ title: videoTitle.trim(), description: videoDesc.trim(), video_url: videoUrl.trim(), target, order, active: videoActive });
      }
      resetVideoForm();
      fetchVideos();
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(err.message || 'Erro ao salvar video');
    } finally {
      setVideoSaving(false);
    }
  };

  const handleEditVideo = (video: any) => {
    setEditingVideo(video);
    setVideoTitle(video.title);
    setVideoDesc(video.description || '');
    setVideoUrl(video.video_url || '');
    setVideoOrder(String(video.order));
    setVideoActive(video.active ?? true);
    setShowVideoForm(true);
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (typeof window !== 'undefined') {
      if (!window.confirm('Remover este video?')) return;
    }
    try {
      await api.deleteOnboardingVideo(videoId);
      fetchVideos();
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(err.message || 'Erro');
    }
  };

  const handleToggleVideoActive = async (video: any) => {
    try {
      await api.updateOnboardingVideo(video.video_id, { active: !video.active });
      fetchVideos();
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(err.message || 'Erro');
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
          {(['overview', 'financial', 'withdrawals', 'users', 'media', 'faq', 'brand', 'relatorio', 'legal', 'loja', 'alertas', 'reps'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              data-testid={`admin-tab-${tab}`}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'overview' ? 'Geral' : tab === 'financial' ? 'Financ.' : tab === 'withdrawals' ? 'Saques' : tab === 'users' ? 'Usuarios' : tab === 'media' ? 'Midias' : tab === 'faq' ? 'FAQ' : tab === 'brand' ? 'Marca' : tab === 'relatorio' ? 'Relatorio' : tab === 'legal' ? 'Legal' : tab === 'loja' ? 'Loja' : tab === 'alertas' ? 'Alertas' : 'Reps'}
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

              {/* Upload Buttons */}
              <View style={styles.mediaTypeRow}>
                <TouchableOpacity
                  style={[styles.mediaUploadBtn, newMediaType === 'image' && uploadedBase64 && styles.mediaUploadBtnActive]}
                  onPress={() => handleFileUpload('image')}
                  data-testid="media-upload-image-btn"
                >
                  <Ionicons name="cloud-upload" size={16} color={uploadedBase64 && newMediaType === 'image' ? '#FFF' : '#3B82F6'} />
                  <Text style={[styles.mediaUploadBtnText, uploadedBase64 && newMediaType === 'image' && { color: '#FFF' }]}>
                    {uploadedBase64 && newMediaType === 'image' ? 'Imagem carregada' : 'Upload Imagem'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mediaUploadBtn, newMediaType === 'video' && uploadedBase64 && styles.mediaUploadBtnActive]}
                  onPress={() => handleFileUpload('video')}
                  data-testid="media-upload-video-btn"
                >
                  <Ionicons name="videocam" size={16} color={uploadedBase64 && newMediaType === 'video' ? '#FFF' : '#3B82F6'} />
                  <Text style={[styles.mediaUploadBtnText, uploadedBase64 && newMediaType === 'video' && { color: '#FFF' }]}>
                    {uploadedBase64 && newMediaType === 'video' ? 'Video carregado' : 'Upload Video'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Upload Preview */}
              {uploadedBase64 && newMediaType === 'image' && (
                <View style={styles.uploadPreview}>
                  <Image source={{ uri: uploadedBase64 }} style={styles.uploadThumb} />
                  <TouchableOpacity style={styles.uploadRemoveBtn} onPress={() => setUploadedBase64('')}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}

              {/* OR: URL input */}
              {!uploadedBase64 && (
                <TextInput
                  style={styles.mediaInput}
                  value={newMediaUrl}
                  onChangeText={setNewMediaUrl}
                  placeholder="Ou cole a URL da imagem/video"
                  placeholderTextColor="#94A3B8"
                  data-testid="media-url-input"
                />
              )}

              {/* Target selector */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                {[{v: 'client', l: 'Clientes'}, {v: 'establishment', l: 'Estabelecimentos'}, {v: 'both', l: 'Ambos'}].map(t => (
                  <TouchableOpacity
                    key={t.v}
                    style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: newMediaTarget === t.v ? '#10B981' : '#0F172A', borderWidth: 1, borderColor: newMediaTarget === t.v ? '#10B981' : '#334155' }}
                    onPress={() => setNewMediaTarget(t.v as any)}
                    data-testid={`media-target-${t.v}`}
                  >
                    <Text style={{ color: newMediaTarget === t.v ? '#0F172A' : '#94A3B8', fontSize: 12, fontWeight: '600' }}>{t.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.mediaPublishBtn, addingMedia && { opacity: 0.6 }]}
                onPress={handleAddMedia}
                disabled={addingMedia || (!newMediaUrl.trim() && !uploadedBase64)}
                data-testid="media-publish-btn"
              >
                {addingMedia ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="rocket" size={18} color="#FFF" />
                    <Text style={styles.mediaPublishBtnText}>Publicar Midia no App</Text>
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
                <TouchableOpacity
                  key={m.media_id}
                  style={styles.mediaItem}
                  onPress={() => setPreviewMedia(m)}
                  activeOpacity={0.7}
                  data-testid={`admin-media-${m.media_id}`}
                >
                  <View style={styles.mediaItemLeft}>
                    {/* Thumbnail */}
                    {m.type === 'image' && m.url ? (
                      <Image
                        source={{ uri: m.url }}
                        style={styles.mediaThumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.mediaItemIcon, m.type === 'video' ? { backgroundColor: '#FEF2F2' } : { backgroundColor: '#EFF6FF' }]}>
                        <Ionicons name={m.type === 'video' ? 'videocam' : 'image'} size={18} color={m.type === 'video' ? '#EF4444' : '#3B82F6'} />
                      </View>
                    )}
                    <View style={styles.mediaItemInfo}>
                      <Text style={styles.mediaItemTitle} numberOfLines={1}>{m.title}</Text>
                      <Text style={styles.mediaItemUrl} numberOfLines={1}>
                        {m.ai_generated ? 'Gerado por IA' : m.url?.startsWith('data:') ? 'Upload local' : m.url?.substring(0, 40)}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={styles.mediaExpandHint}>
                      <Ionicons name="expand" size={14} color="#64748B" />
                    </View>
                    <TouchableOpacity
                      style={styles.mediaDeleteBtn}
                      onPress={(e) => { e.stopPropagation(); handleDeleteMedia(m.media_id); }}
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
                </TouchableOpacity>
              ))
            )}

            {/* App Videos Section */}
            <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#8B5CF618', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="videocam" size={20} color="#8B5CF6" />
                </View>
                <View>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Videos do App</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 12 }}>Videos de abertura e do botao "Ofertas de graca"</Text>
                </View>
              </View>

              <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Video de abertura do app (ao abrir)</Text>
              <TextInput
                style={[styles.tpInput, { marginBottom: 12 }]}
                value={openingVideoUrl}
                onChangeText={setOpeningVideoUrl}
                placeholder="URL do video (YouTube ou link direto)"
                placeholderTextColor="#64748B"
                data-testid="opening-video-input"
              />

              <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Video "Ofertas de graca?" (botao na Home)</Text>
              <TextInput
                style={[styles.tpInput, { marginBottom: 12 }]}
                value={freeOffersVideoUrl}
                onChangeText={setFreeOffersVideoUrl}
                placeholder="URL do video (YouTube ou link direto)"
                placeholderTextColor="#64748B"
                data-testid="free-offers-video-input"
              />

              {videosMsg ? <Text style={{ color: videosMsg.includes('atualizado') ? '#10B981' : '#EF4444', fontSize: 13, marginBottom: 8 }}>{videosMsg}</Text> : null}
              <TouchableOpacity
                style={{ backgroundColor: '#8B5CF6', paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, opacity: videosSaving ? 0.6 : 1 }}
                onPress={handleSaveAppVideos}
                disabled={videosSaving}
                data-testid="save-videos-btn"
              >
                {videosSaving ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="save" size={16} color="#FFF" />
                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Salvar Videos</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Admin Edit Offers */}
            <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#F59E0B18', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="create" size={20} color="#F59E0B" />
                </View>
                <View>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Editar Ofertas</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 12 }}>Altere titulo, cidade e descricao das ofertas</Text>
                </View>
              </View>

              {adminOffersLoading ? <ActivityIndicator color="#F59E0B" /> : (
                adminOffers.map((offer: any) => (
                  <View key={offer.offer_id} style={{ backgroundColor: '#0F172A', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#1E293B' }}>
                    {editingOffer?.offer_id === offer.offer_id ? (
                      <View>
                        <TextInput style={[styles.tpInput, { marginBottom: 6 }]} value={offerEditTitle} onChangeText={setOfferEditTitle} placeholder="Titulo" placeholderTextColor="#64748B" />
                        <TextInput style={[styles.tpInput, { marginBottom: 6 }]} value={offerEditCity} onChangeText={setOfferEditCity} placeholder="Cidade" placeholderTextColor="#64748B" />
                        <TextInput style={[styles.tpInput, { marginBottom: 8, minHeight: 60 }]} value={offerEditDesc} onChangeText={setOfferEditDesc} placeholder="Descricao" placeholderTextColor="#64748B" multiline />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity style={{ flex: 1, backgroundColor: '#10B981', paddingVertical: 10, borderRadius: 8, alignItems: 'center', opacity: offerSaving ? 0.6 : 1 }} onPress={handleSaveOffer} disabled={offerSaving}>
                            <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 13 }}>Salvar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={{ flex: 1, backgroundColor: '#334155', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }} onPress={() => setEditingOffer(null)}>
                            <Text style={{ color: '#94A3B8', fontWeight: '600', fontSize: 13 }}>Cancelar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => { setEditingOffer(offer); setOfferEditTitle(offer.title); setOfferEditCity(offer.city || ''); setOfferEditDesc(offer.description || ''); }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#E2E8F0', fontSize: 14, fontWeight: '600' }}>{offer.title}</Text>
                            <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{offer.establishment_name} | {offer.city || 'Sem cidade'}</Text>
                          </View>
                          <Ionicons name="pencil" size={16} color="#F59E0B" />
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gestao de Ajuda (FAQ)</Text>

            {/* Sub-tabs: Cliente / Estabelecimento */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }} data-testid="faq-sub-tabs">
              <TouchableOpacity
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                  backgroundColor: faqSubTab === 'client' ? '#3B82F6' : '#F1F5F9',
                  borderWidth: 1, borderColor: faqSubTab === 'client' ? '#3B82F6' : '#E2E8F0',
                }}
                onPress={() => setFaqSubTab('client')}
                data-testid="faq-subtab-client"
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: faqSubTab === 'client' ? '#FFF' : '#64748B' }}>
                  FAQ Cliente
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                  backgroundColor: faqSubTab === 'establishment' ? '#F59E0B' : '#F1F5F9',
                  borderWidth: 1, borderColor: faqSubTab === 'establishment' ? '#F59E0B' : '#E2E8F0',
                }}
                onPress={() => setFaqSubTab('establishment')}
                data-testid="faq-subtab-establishment"
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: faqSubTab === 'establishment' ? '#0F172A' : '#64748B' }}>
                  FAQ Estabelecimento
                </Text>
              </TouchableOpacity>
            </View>

            {faqSubTab === 'client' && (
              <View>
            {/* Support Email Config */}
            <View style={styles.configCard} data-testid="faq-email-config">
              <View style={styles.configHeader}>
                <View style={[styles.finIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="mail" size={20} color="#3B82F6" />
                </View>
                <View style={styles.configTitleWrap}>
                  <Text style={styles.configTitle}>E-mail de Suporte</Text>
                  <Text style={styles.configDesc}>Exibido para o cliente na aba Ajuda</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TextInput
                  style={[styles.tpInput, { flex: 1, marginBottom: 0 }]}
                  value={supportEmail}
                  onChangeText={setSupportEmail}
                  placeholder="suporte@itoke.com.br"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  data-testid="faq-email-input"
                />
                <TouchableOpacity
                  style={[styles.configSaveBtn, savingEmail && styles.configSaveBtnDisabled]}
                  onPress={handleSaveSupportEmail}
                  disabled={savingEmail}
                  data-testid="faq-email-save-btn"
                >
                  {savingEmail ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.configSaveBtnText}>Salvar</Text>}
                </TouchableOpacity>
              </View>
              {emailMsg ? <Text style={{ marginTop: 6, fontSize: 12, color: emailMsg.includes('sucesso') ? '#10B981' : '#EF4444' }}>{emailMsg}</Text> : null}
            </View>

            {/* Add/Edit Topic Form */}
            {!showFaqForm ? (
              <TouchableOpacity
                style={[styles.configSaveBtn, { marginTop: 16, alignSelf: 'flex-start', paddingHorizontal: 16 }]}
                onPress={() => { resetFaqForm(); setShowFaqForm(true); }}
                data-testid="faq-add-topic-btn"
              >
                <Text style={styles.configSaveBtnText}>+ Novo Topico</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ marginTop: 16, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }} data-testid="faq-topic-form">
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 10 }}>
                  {editingFaq ? 'Editar Topico' : 'Novo Topico'}
                </Text>
                <TextInput
                  style={styles.tpInput}
                  value={faqTitle}
                  onChangeText={setFaqTitle}
                  placeholder="Titulo da pergunta (ex: O que sao Tokens?)"
                  placeholderTextColor="#94A3B8"
                  data-testid="faq-title-input"
                />
                <TextInput
                  style={[styles.tpInput, { height: 100, textAlignVertical: 'top' }]}
                  value={faqContent}
                  onChangeText={setFaqContent}
                  placeholder="Conteudo da resposta (texto detalhado)"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  data-testid="faq-content-input"
                />
                <TextInput
                  style={styles.tpInput}
                  value={faqVideoUrl}
                  onChangeText={setFaqVideoUrl}
                  placeholder="URL do video (YouTube ou Vimeo) - opcional"
                  placeholderTextColor="#94A3B8"
                  data-testid="faq-video-url-input"
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.tpInput, { flex: 1 }]}
                    value={faqOrder}
                    onChangeText={setFaqOrder}
                    placeholder="Ordem (1, 2, 3...)"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    data-testid="faq-order-input"
                  />
                </View>

                {/* Icon Picker */}
                <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>Icone:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {ICON_OPTIONS.map((ic) => (
                    <TouchableOpacity
                      key={ic}
                      style={{
                        width: 38, height: 38, borderRadius: 8, borderWidth: 2,
                        borderColor: faqIcon === ic ? '#3B82F6' : '#E2E8F0',
                        backgroundColor: faqIcon === ic ? '#EFF6FF' : '#FFF',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                      onPress={() => setFaqIcon(ic)}
                    >
                      <Ionicons name={ic as any} size={18} color={faqIcon === ic ? '#3B82F6' : '#94A3B8'} />
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.configSaveBtn, faqSaving && styles.configSaveBtnDisabled]}
                    onPress={handleSaveFaqTopic}
                    disabled={faqSaving}
                    data-testid="faq-save-btn"
                  >
                    {faqSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.configSaveBtnText}>Salvar</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.configSaveBtn, { backgroundColor: '#94A3B8' }]}
                    onPress={resetFaqForm}
                    data-testid="faq-cancel-btn"
                  >
                    <Text style={styles.configSaveBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Topics List */}
            {faqLoading ? (
              <ActivityIndicator style={{ marginTop: 20 }} color="#3B82F6" />
            ) : faqTopics.length === 0 ? (
              <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 16, fontStyle: 'italic' }}>
                Nenhum topico cadastrado.
              </Text>
            ) : (
              <View style={{ marginTop: 16, gap: 8 }}>
                {faqTopics.map((topic) => (
                  <View key={topic.topic_id} style={{
                    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
                    borderWidth: 1, borderColor: '#E2E8F0',
                  }} data-testid={`faq-item-${topic.topic_id}`}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name={(topic.icon || 'help-circle-outline') as any} size={18} color="#3B82F6" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }} numberOfLines={1}>{topic.title}</Text>
                          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }} numberOfLines={1}>{topic.content.substring(0, 60)}...</Text>
                          {topic.video_url ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <Ionicons name="videocam" size={12} color="#3B82F6" />
                              <Text style={{ fontSize: 10, color: '#3B82F6' }}>Video vinculado</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>#{topic.order}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleEditFaq(topic)}
                          style={{ padding: 6 }}
                          data-testid={`faq-edit-${topic.topic_id}`}
                        >
                          <Ionicons name="pencil" size={16} color="#3B82F6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteFaq(topic.topic_id)}
                          style={{ padding: 6 }}
                          data-testid={`faq-delete-${topic.topic_id}`}
                        >
                          <Ionicons name="trash" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
              </View>
            )}

            {faqSubTab === 'establishment' && (
              <View>
                <View style={{ backgroundColor: '#FFFBEB', padding: 14, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#F59E0B33' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="flash" size={18} color="#F59E0B" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#92400E' }}>FAQ para Estabelecimentos</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#78350F', marginTop: 4 }}>
                    Estes topicos aparecem na tela "Como Usar" do painel do estabelecimento (sobre tokens, creditos, etc.)
                  </Text>
                </View>

                {/* Add/Edit Est Topic Form */}
                {!showEstFaqForm ? (
                  <TouchableOpacity
                    style={[styles.configSaveBtn, { alignSelf: 'flex-start', paddingHorizontal: 16, backgroundColor: '#F59E0B' }]}
                    onPress={() => { resetEstFaqForm(); setShowEstFaqForm(true); }}
                    data-testid="est-faq-add-topic-btn"
                  >
                    <Text style={[styles.configSaveBtnText, { color: '#0F172A' }]}>+ Novo Topico</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F59E0B33' }} data-testid="est-faq-topic-form">
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 10 }}>
                      {editingEstFaq ? 'Editar Topico' : 'Novo Topico (Estabelecimento)'}
                    </Text>
                    <TextInput
                      style={styles.tpInput}
                      value={estFaqTitle}
                      onChangeText={setEstFaqTitle}
                      placeholder="Titulo (ex: Como comprar Tokens?)"
                      placeholderTextColor="#94A3B8"
                      data-testid="est-faq-title-input"
                    />
                    <TextInput
                      style={[styles.tpInput, { height: 100, textAlignVertical: 'top' }]}
                      value={estFaqContent}
                      onChangeText={setEstFaqContent}
                      placeholder="Conteudo da resposta"
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={4}
                      data-testid="est-faq-content-input"
                    />
                    <TextInput
                      style={styles.tpInput}
                      value={estFaqVideoUrl}
                      onChangeText={setEstFaqVideoUrl}
                      placeholder="URL do video (YouTube ou Vimeo) - opcional"
                      placeholderTextColor="#94A3B8"
                      data-testid="est-faq-video-url-input"
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        style={[styles.tpInput, { flex: 1 }]}
                        value={estFaqOrder}
                        onChangeText={setEstFaqOrder}
                        placeholder="Ordem (1, 2, 3...)"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        data-testid="est-faq-order-input"
                      />
                    </View>

                    {/* Icon Picker */}
                    <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>Icone:</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {ICON_OPTIONS.map((ic) => (
                        <TouchableOpacity
                          key={ic}
                          style={{
                            width: 38, height: 38, borderRadius: 8, borderWidth: 2,
                            borderColor: estFaqIcon === ic ? '#F59E0B' : '#E2E8F0',
                            backgroundColor: estFaqIcon === ic ? '#FFFBEB' : '#FFF',
                            alignItems: 'center', justifyContent: 'center',
                          }}
                          onPress={() => setEstFaqIcon(ic)}
                        >
                          <Ionicons name={ic as any} size={18} color={estFaqIcon === ic ? '#F59E0B' : '#94A3B8'} />
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.configSaveBtn, { backgroundColor: '#F59E0B' }, estFaqSaving && styles.configSaveBtnDisabled]}
                        onPress={handleSaveEstFaqTopic}
                        disabled={estFaqSaving}
                        data-testid="est-faq-save-btn"
                      >
                        {estFaqSaving ? <ActivityIndicator size="small" color="#0F172A" /> : <Text style={[styles.configSaveBtnText, { color: '#0F172A' }]}>Salvar</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.configSaveBtn, { backgroundColor: '#94A3B8' }]}
                        onPress={resetEstFaqForm}
                        data-testid="est-faq-cancel-btn"
                      >
                        <Text style={styles.configSaveBtnText}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Est Topics List */}
                {estFaqLoading ? (
                  <ActivityIndicator style={{ marginTop: 20 }} color="#F59E0B" />
                ) : estFaqTopics.length === 0 ? (
                  <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 16, fontStyle: 'italic' }}>
                    Nenhum topico cadastrado para estabelecimentos.
                  </Text>
                ) : (
                  <View style={{ marginTop: 16, gap: 8 }}>
                    {estFaqTopics.map((topic) => (
                      <View key={topic.topic_id} style={{
                        backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
                        borderWidth: 1, borderColor: '#F59E0B33',
                      }} data-testid={`est-faq-item-${topic.topic_id}`}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#FFFBEB', alignItems: 'center', justifyContent: 'center' }}>
                              <Ionicons name={(topic.icon || 'help-circle-outline') as any} size={18} color="#F59E0B" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }} numberOfLines={1}>{topic.title}</Text>
                              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }} numberOfLines={1}>{topic.content.substring(0, 60)}...</Text>
                              {topic.video_url ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                  <Ionicons name="videocam" size={12} color="#3B82F6" />
                                  <Text style={{ fontSize: 10, color: '#3B82F6' }}>Video vinculado</Text>
                                </View>
                              ) : null}
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ backgroundColor: '#FFFBEB', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#92400E' }}>#{topic.order}</Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => handleEditEstFaq(topic)}
                              style={{ padding: 6 }}
                              data-testid={`est-faq-edit-${topic.topic_id}`}
                            >
                              <Ionicons name="pencil" size={16} color="#F59E0B" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeleteEstFaq(topic.topic_id)}
                              style={{ padding: 6 }}
                              data-testid={`est-faq-delete-${topic.topic_id}`}
                            >
                              <Ionicons name="trash" size={16} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

              </View>
            )}
          </View>
        )}

        {/* Brand Tab */}
        {activeTab === 'brand' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Identidade Visual</Text>

            {brandLoading ? (
              <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} />
            ) : (
              <>
                {/* Logo Preview */}
                <View style={styles.configCard} data-testid="brand-logo-section">
                  <View style={styles.configHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#064E3B' }]}>
                      <Ionicons name="image" size={20} color="#10B981" />
                    </View>
                    <View style={styles.configTitleWrap}>
                      <Text style={styles.configTitle}>Simbolo / Logo</Text>
                      <Text style={styles.configDesc}>Imagem do icone da marca (PNG ou JPG)</Text>
                    </View>
                  </View>

                  {/* Preview */}
                  <View style={{ alignItems: 'center', marginVertical: 20, backgroundColor: '#0F172A', borderRadius: 16, padding: 24 }}>
                    {brandLogoUrl ? (
                      <Image
                        source={{ uri: brandLogoUrl }}
                        style={{ width: 160, height: 160, borderRadius: 16 }}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={{ width: 160, height: 160, borderRadius: 80, borderWidth: 3, borderColor: '#10B981', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="ticket" size={64} color="#10B981" />
                      </View>
                    )}
                    <Text style={{ color: '#FFF', fontSize: 32, fontWeight: '800', marginTop: 16 }}>iToke</Text>
                    <Text style={{ color: '#94A3B8', fontSize: 16, marginTop: 4 }}>{brandTagline}</Text>
                  </View>

                  <TouchableOpacity
                    style={{ backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                    onPress={handleBrandLogoUpload}
                    data-testid="brand-upload-logo-btn"
                  >
                    <Ionicons name="cloud-upload" size={20} color="#3B82F6" />
                    <Text style={{ color: '#3B82F6', fontWeight: '600', fontSize: 14 }}>
                      {brandLogoUrl ? 'Trocar Simbolo' : 'Enviar Simbolo'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Tagline */}
                <View style={styles.configCard} data-testid="brand-tagline-section">
                  <View style={styles.configHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#7C3A1A' }]}>
                      <Ionicons name="text" size={20} color="#F59E0B" />
                    </View>
                    <View style={styles.configTitleWrap}>
                      <Text style={styles.configTitle}>Frase de Efeito</Text>
                      <Text style={styles.configDesc}>Slogan exibido abaixo do nome</Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.tpInput, { marginTop: 10, marginBottom: 0 }]}
                    value={brandTagline}
                    onChangeText={setBrandTagline}
                    placeholder="Ex: Ofertas que saem de Graça"
                    placeholderTextColor="#94A3B8"
                    data-testid="brand-tagline-input"
                  />
                </View>

                {/* Save + Download */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: brandSaving ? 0.6 : 1 }}
                    onPress={handleSaveBrand}
                    disabled={brandSaving}
                    data-testid="brand-save-btn"
                  >
                    {brandSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="save" size={18} color="#FFF" />}
                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Salvar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                    onPress={handleDownloadLogo}
                    data-testid="brand-download-btn"
                  >
                    <Ionicons name="download" size={18} color="#F59E0B" />
                    <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 15 }}>Baixar Logo</Text>
                  </TouchableOpacity>
                </View>

                {brandMsg ? (
                  <Text style={{ marginTop: 10, fontSize: 13, textAlign: 'center', color: brandMsg.includes('sucesso') ? '#10B981' : '#EF4444' }}>{brandMsg}</Text>
                ) : null}
              </>
            )}
          </View>
        )}

        {activeTab === 'relatorio' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Layout do Relatorio Fiscal</Text>
            <Text style={{ color: '#94A3B8', fontSize: 13, marginBottom: 16 }}>
              Configure o cabecalho, rodape e declaracao que aparecem no PDF de relatorio fiscal dos estabelecimentos.
            </Text>

            {reportLayoutLoading ? (
              <ActivityIndicator size="large" color="#0891B2" style={{ marginTop: 40 }} />
            ) : (
              <>
                <View style={styles.configCard} data-testid="report-company-section">
                  <View style={styles.configHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#164E63' }]}>
                      <Ionicons name="business" size={20} color="#22D3EE" />
                    </View>
                    <View style={styles.configTitleWrap}>
                      <Text style={styles.configTitle}>Nome da Empresa</Text>
                      <Text style={styles.configDesc}>Exibido no cabecalho do PDF</Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.tpInput, { marginTop: 10, marginBottom: 0 }]}
                    value={reportCompanyName}
                    onChangeText={setReportCompanyName}
                    placeholder="iToke"
                    placeholderTextColor="#94A3B8"
                    data-testid="report-company-input"
                  />
                </View>

                <View style={styles.configCard} data-testid="report-tagline-section">
                  <View style={styles.configHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#7C3A1A' }]}>
                      <Ionicons name="text" size={20} color="#F59E0B" />
                    </View>
                    <View style={styles.configTitleWrap}>
                      <Text style={styles.configTitle}>Slogan</Text>
                      <Text style={styles.configDesc}>Frase exibida abaixo do nome no cabecalho</Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.tpInput, { marginTop: 10, marginBottom: 0 }]}
                    value={reportTagline}
                    onChangeText={setReportTagline}
                    placeholder="Ofertas que saem de Graça"
                    placeholderTextColor="#94A3B8"
                    data-testid="report-tagline-input"
                  />
                </View>

                <View style={styles.configCard} data-testid="report-disclaimer-section">
                  <View style={styles.configHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#064E3B' }]}>
                      <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                    </View>
                    <View style={styles.configTitleWrap}>
                      <Text style={styles.configTitle}>Declaracao Legal</Text>
                      <Text style={styles.configDesc}>Texto que comprova que o pagamento veio do cliente</Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.tpInput, { marginTop: 10, marginBottom: 0, minHeight: 80 }]}
                    value={reportDisclaimer}
                    onChangeText={setReportDisclaimer}
                    placeholder="Os valores foram pagos diretamente pelos clientes..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={4}
                    data-testid="report-disclaimer-input"
                  />
                </View>

                <View style={styles.configCard} data-testid="report-footer-section">
                  <View style={styles.configHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#3B1F6E' }]}>
                      <Ionicons name="document-text" size={20} color="#A78BFA" />
                    </View>
                    <View style={styles.configTitleWrap}>
                      <Text style={styles.configTitle}>Rodape</Text>
                      <Text style={styles.configDesc}>Texto ao final do PDF</Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.tpInput, { marginTop: 10, marginBottom: 0 }]}
                    value={reportFooter}
                    onChangeText={setReportFooter}
                    placeholder="Documento gerado automaticamente pela plataforma iToke"
                    placeholderTextColor="#94A3B8"
                    data-testid="report-footer-input"
                  />
                </View>

                <TouchableOpacity
                  style={{ backgroundColor: '#0891B2', paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 16, opacity: reportSaving ? 0.6 : 1 }}
                  onPress={handleSaveReportLayout}
                  disabled={reportSaving}
                  data-testid="report-save-btn"
                >
                  {reportSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="save" size={18} color="#FFF" />}
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Salvar Layout</Text>
                </TouchableOpacity>

                {reportMsg ? (
                  <Text style={{ marginTop: 10, fontSize: 13, textAlign: 'center', color: reportMsg.includes('atualizado') ? '#10B981' : '#EF4444' }}>{reportMsg}</Text>
                ) : null}
              </>
            )}
          </View>
        )}

        {activeTab === 'legal' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documentos Legais</Text>
            <Text style={{ color: '#94A3B8', fontSize: 13, marginBottom: 16 }}>
              Edite os termos de uso, politica de privacidade e declaracao de conformidade que aparecem no app.
            </Text>

            {legalLoading ? (
              <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
            ) : editingLegalDoc ? (
              <>
                <View style={styles.configCard} data-testid="legal-edit-section">
                  <View style={styles.configHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#3B1F6E' }]}>
                      <Ionicons name="create" size={20} color="#A78BFA" />
                    </View>
                    <View style={styles.configTitleWrap}>
                      <Text style={styles.configTitle}>Editando: {editingLegalDoc.title}</Text>
                      <Text style={styles.configDesc}>Chave: {editingLegalDoc.key}</Text>
                    </View>
                  </View>
                </View>
                <Text style={{ color: '#CBD5E1', fontSize: 13, marginBottom: 4, marginTop: 8 }}>Titulo</Text>
                <TextInput
                  style={[styles.tpInput, { marginBottom: 10 }]}
                  value={legalEditTitle}
                  onChangeText={setLegalEditTitle}
                  data-testid="legal-edit-title"
                />
                <Text style={{ color: '#CBD5E1', fontSize: 13, marginBottom: 4 }}>Conteudo</Text>
                <TextInput
                  style={[styles.tpInput, { minHeight: 300, marginBottom: 10 }]}
                  value={legalEditContent}
                  onChangeText={setLegalEditContent}
                  multiline
                  numberOfLines={20}
                  data-testid="legal-edit-content"
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#475569', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
                    onPress={() => setEditingLegalDoc(null)}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#3B82F6', paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, opacity: legalSaving ? 0.6 : 1 }}
                    onPress={handleSaveLegalDoc}
                    disabled={legalSaving}
                    data-testid="legal-save-btn"
                  >
                    {legalSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="save" size={16} color="#FFF" />}
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Salvar</Text>
                  </TouchableOpacity>
                </View>
                {legalMsg ? (
                  <Text style={{ marginTop: 10, fontSize: 13, textAlign: 'center', color: legalMsg.includes('atualizado') ? '#10B981' : '#EF4444' }}>{legalMsg}</Text>
                ) : null}
              </>
            ) : (
              <>
                {legalDocs.map((doc) => (
                  <TouchableOpacity
                    key={doc.key}
                    style={styles.configCard}
                    onPress={() => {
                      setEditingLegalDoc(doc);
                      setLegalEditTitle(doc.title);
                      setLegalEditContent(doc.content);
                    }}
                    data-testid={`legal-doc-${doc.key}`}
                  >
                    <View style={styles.configHeader}>
                      <View style={[styles.finIconWrap, { backgroundColor: doc.key.includes('privacy') ? '#7F1D1D' : doc.key.includes('compliance') ? '#713F12' : '#1E3A5F' }]}>
                        <Ionicons
                          name={doc.key.includes('privacy') ? 'lock-closed' : doc.key.includes('compliance') ? 'checkmark-shield' : 'document-text'}
                          size={20}
                          color={doc.key.includes('privacy') ? '#FCA5A5' : doc.key.includes('compliance') ? '#FDE68A' : '#93C5FD'}
                        />
                      </View>
                      <View style={styles.configTitleWrap}>
                        <Text style={styles.configTitle}>{doc.title}</Text>
                        <Text style={styles.configDesc}>Versao {doc.version} - Toque para editar</Text>
                      </View>
                      <Ionicons name="create-outline" size={20} color="#64748B" />
                    </View>
                  </TouchableOpacity>
                ))}
                {legalMsg ? (
                  <Text style={{ marginTop: 10, fontSize: 13, textAlign: 'center', color: '#10B981' }}>{legalMsg}</Text>
                ) : null}
              </>
            )}

            {/* Establishment Intermediation Contract */}
            <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#10B98118', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="document-text" size={20} color="#10B981" />
                </View>
                <View>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Contrato de Intermediacao</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 12 }}>Exibido ao estabelecimento antes da 1a oferta</Text>
                </View>
              </View>

              {estContractLoading ? (
                <ActivityIndicator color="#10B981" style={{ marginVertical: 20 }} />
              ) : (
                <>
                  <TextInput
                    style={[styles.tpInput, { minHeight: 250, marginBottom: 10, fontSize: 11 }]}
                    value={estContractText}
                    onChangeText={setEstContractText}
                    multiline
                    numberOfLines={15}
                    data-testid="est-contract-editor"
                  />
                  {estContractMsg ? (
                    <Text style={{ color: estContractMsg.includes('sucesso') ? '#10B981' : '#EF4444', fontSize: 13, marginBottom: 8 }}>
                      {estContractMsg}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    style={{ backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, opacity: estContractSaving ? 0.6 : 1 }}
                    onPress={handleSaveEstContract}
                    disabled={estContractSaving}
                    data-testid="save-est-contract-btn"
                  >
                    {estContractSaving ? <ActivityIndicator color="#0F172A" /> : (
                      <>
                        <Ionicons name="save" size={16} color="#0F172A" />
                        <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 14 }}>Salvar Contrato</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {activeTab === 'loja' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configuracoes da Loja de Apps</Text>
            <Text style={{ color: '#94A3B8', fontSize: 13, marginBottom: 16 }}>
              Configure nome, descricao, logo e splash screen para Play Store e App Store.
            </Text>

            {storeLoading ? (
              <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
            ) : (
              <>
                <View style={styles.configCard} data-testid="store-name-section">
                  <View style={styles.configHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#164E63' }]}>
                      <Ionicons name="phone-portrait" size={20} color="#22D3EE" />
                    </View>
                    <View style={styles.configTitleWrap}>
                      <Text style={styles.configTitle}>Nome do App</Text>
                      <Text style={styles.configDesc}>Nome exibido nas lojas</Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.tpInput, { marginTop: 10, marginBottom: 0 }]}
                    value={storeAppName}
                    onChangeText={setStoreAppName}
                    data-testid="store-name-input"
                  />
                </View>

                <View style={styles.configCard} data-testid="store-tagline-section">
                  <View style={styles.configHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#7C3A1A' }]}>
                      <Ionicons name="text" size={20} color="#F59E0B" />
                    </View>
                    <View style={styles.configTitleWrap}>
                      <Text style={styles.configTitle}>Slogan</Text>
                      <Text style={styles.configDesc}>Frase principal do app</Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.tpInput, { marginTop: 10, marginBottom: 0 }]}
                    value={storeTagline}
                    onChangeText={setStoreTagline}
                    data-testid="store-tagline-input"
                  />
                </View>

                <View style={styles.configCard} data-testid="store-short-desc-section">
                  <View style={styles.configHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#064E3B' }]}>
                      <Ionicons name="create" size={20} color="#10B981" />
                    </View>
                    <View style={styles.configTitleWrap}>
                      <Text style={styles.configTitle}>Descricao Curta</Text>
                      <Text style={styles.configDesc}>Resumo para a loja (max 80 caracteres)</Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.tpInput, { marginTop: 10, marginBottom: 0 }]}
                    value={storeShortDesc}
                    onChangeText={setStoreShortDesc}
                    maxLength={80}
                    data-testid="store-short-desc-input"
                  />
                  <Text style={{ color: '#64748B', fontSize: 11, marginTop: 4 }}>{storeShortDesc.length}/80</Text>
                </View>

                <View style={styles.configCard} data-testid="store-full-desc-section">
                  <View style={styles.configHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#3B1F6E' }]}>
                      <Ionicons name="document-text" size={20} color="#A78BFA" />
                    </View>
                    <View style={styles.configTitleWrap}>
                      <Text style={styles.configTitle}>Descricao Completa</Text>
                      <Text style={styles.configDesc}>Descricao detalhada para as lojas</Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.tpInput, { marginTop: 10, marginBottom: 0, minHeight: 200 }]}
                    value={storeFullDesc}
                    onChangeText={setStoreFullDesc}
                    multiline
                    numberOfLines={12}
                    data-testid="store-full-desc-input"
                  />
                </View>

                <View style={styles.configCard} data-testid="store-keywords-section">
                  <View style={styles.configHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#7F1D1D' }]}>
                      <Ionicons name="search" size={20} color="#FCA5A5" />
                    </View>
                    <View style={styles.configTitleWrap}>
                      <Text style={styles.configTitle}>Palavras-chave</Text>
                      <Text style={styles.configDesc}>Separadas por virgula (para busca na loja)</Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.tpInput, { marginTop: 10, marginBottom: 0 }]}
                    value={storeKeywords}
                    onChangeText={setStoreKeywords}
                    data-testid="store-keywords-input"
                  />
                </View>

                <View style={styles.configCard} data-testid="store-logo-section">
                  <View style={styles.configHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#1E3A5F' }]}>
                      <Ionicons name="image" size={20} color="#93C5FD" />
                    </View>
                    <View style={styles.configTitleWrap}>
                      <Text style={styles.configTitle}>Logo URL</Text>
                      <Text style={styles.configDesc}>URL da imagem do logo (1024x1024 recomendado)</Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.tpInput, { marginTop: 10, marginBottom: 0 }]}
                    value={storeLogoUrl}
                    onChangeText={setStoreLogoUrl}
                    placeholder="https://..."
                    placeholderTextColor="#94A3B8"
                    data-testid="store-logo-input"
                  />
                </View>

                <View style={styles.configCard} data-testid="store-splash-section">
                  <View style={styles.configHeader}>
                    <View style={[styles.finIconWrap, { backgroundColor: '#713F12' }]}>
                      <Ionicons name="color-palette" size={20} color="#FDE68A" />
                    </View>
                    <View style={styles.configTitleWrap}>
                      <Text style={styles.configTitle}>Cor da Splash Screen</Text>
                      <Text style={styles.configDesc}>Cor de fundo da tela de abertura</Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.tpInput, { marginTop: 10, marginBottom: 0 }]}
                    value={storeSplashColor}
                    onChangeText={setStoreSplashColor}
                    placeholder="#0F172A"
                    placeholderTextColor="#94A3B8"
                    data-testid="store-splash-input"
                  />
                  <View style={{ marginTop: 8, height: 30, borderRadius: 8, backgroundColor: storeSplashColor || '#0F172A' }} />
                </View>

                <TouchableOpacity
                  style={{ backgroundColor: '#3B82F6', paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 16, opacity: storeSaving ? 0.6 : 1 }}
                  onPress={handleSaveStoreConfig}
                  disabled={storeSaving}
                  data-testid="store-save-btn"
                >
                  {storeSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="save" size={18} color="#FFF" />}
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Salvar Configuracoes</Text>
                </TouchableOpacity>

                {storeMsg ? (
                  <Text style={{ marginTop: 10, fontSize: 13, textAlign: 'center', color: storeMsg.includes('salvas') ? '#10B981' : '#EF4444' }}>{storeMsg}</Text>
                ) : null}
              </>
            )}
          </View>
        )}

        {activeTab === 'alertas' && (
          <View style={styles.tabContent} data-testid="admin-alertas-tab">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>Alertas de Fraude</Text>
              <TouchableOpacity
                style={{ backgroundColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                onPress={fetchFraudAlerts}
                data-testid="refresh-alerts-btn"
              >
                <Ionicons name="refresh" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                <Text style={{ color: '#EF4444', fontSize: 24, fontWeight: '700' }} data-testid="alerts-new-count">{fraudStats.new}</Text>
                <Text style={{ color: '#94A3B8', fontSize: 12 }}>Novos</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                <Text style={{ color: '#10B981', fontSize: 24, fontWeight: '700' }}>{fraudStats.reviewed}</Text>
                <Text style={{ color: '#94A3B8', fontSize: 12 }}>Revisados</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                <Text style={{ color: '#3B82F6', fontSize: 24, fontWeight: '700' }}>{fraudStats.total}</Text>
                <Text style={{ color: '#94A3B8', fontSize: 12 }}>Total</Text>
              </View>
            </View>

            {/* Filter */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {['all', 'new', 'reviewed'].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: fraudFilter === f ? '#3B82F6' : '#1E293B' }}
                  onPress={() => { setFraudFilter(f); setTimeout(() => fetchFraudAlerts(), 100); }}
                  data-testid={`filter-${f}`}
                >
                  <Text style={{ color: fraudFilter === f ? '#FFF' : '#94A3B8', fontSize: 13, fontWeight: '600' }}>
                    {f === 'all' ? 'Todos' : f === 'new' ? 'Novos' : 'Revisados'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {fraudLoading ? (
              <ActivityIndicator size="large" color="#3B82F6" />
            ) : fraudAlerts.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <Ionicons name="shield-checkmark" size={48} color="#10B981" />
                <Text style={{ color: '#94A3B8', marginTop: 12, fontSize: 16 }}>Nenhum alerta encontrado</Text>
                <Text style={{ color: '#64748B', marginTop: 4, fontSize: 13 }}>O sistema esta seguro</Text>
              </View>
            ) : (
              fraudAlerts.map((alert: any) => (
                <View
                  key={alert.alert_id}
                  style={{ backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: alert.reviewed ? '#10B981' : '#EF4444' }}
                  data-testid={`alert-${alert.alert_id}`}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons
                        name={alert.type.includes('login') ? 'log-in' : alert.type.includes('cpf') ? 'card' : alert.type.includes('qr') ? 'qr-code' : 'warning'}
                        size={18}
                        color={alert.reviewed ? '#10B981' : '#EF4444'}
                      />
                      <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
                        {alert.type === 'rate_limit_login' ? 'Excesso de Login' :
                         alert.type === 'rate_limit_qr' ? 'Excesso de QR Codes' :
                         alert.type === 'rate_limit_payment' ? 'Excesso de Pagamentos' :
                         alert.type === 'duplicate_cpf' ? 'CPF Duplicado' : alert.type}
                      </Text>
                    </View>
                    <Text style={{ color: '#64748B', fontSize: 11 }}>
                      {new Date(alert.created_at).toLocaleDateString('pt-BR')} {new Date(alert.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  <View style={{ marginTop: 8 }}>
                    {alert.details?.ip && (
                      <Text style={{ color: '#94A3B8', fontSize: 12 }}>IP: {alert.details.ip}</Text>
                    )}
                    {alert.details?.email && (
                      <Text style={{ color: '#94A3B8', fontSize: 12 }}>Email: {alert.details.email}</Text>
                    )}
                    {alert.details?.user_id && (
                      <Text style={{ color: '#94A3B8', fontSize: 12 }}>User ID: {alert.details.user_id}</Text>
                    )}
                    {alert.details?.reason && (
                      <Text style={{ color: '#FCA5A5', fontSize: 12, marginTop: 4 }}>{alert.details.reason}</Text>
                    )}
                  </View>

                  {!alert.reviewed && (
                    <TouchableOpacity
                      style={{ backgroundColor: '#10B981', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-end', marginTop: 10 }}
                      onPress={() => handleReviewAlert(alert.alert_id)}
                      data-testid={`review-${alert.alert_id}`}
                    >
                      <Text style={{ color: '#0F172A', fontWeight: '600', fontSize: 13 }}>Marcar Revisado</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'reps' && (
          <View style={styles.tabContent} data-testid="admin-reps-tab">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>Representantes PJ</Text>
              <TouchableOpacity
                style={{ backgroundColor: '#10B981', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                onPress={() => setShowRepForm(!showRepForm)}
                data-testid="add-rep-btn"
              >
                <Ionicons name={showRepForm ? 'close' : 'add'} size={16} color="#0F172A" />
                <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 13 }}>{showRepForm ? 'Fechar' : 'Novo Rep.'}</Text>
              </TouchableOpacity>
            </View>

            {/* Global Commission Setting */}
            <View style={{ backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="cash" size={20} color="#F59E0B" />
              <Text style={{ color: '#CBD5E1', fontSize: 13, flex: 1 }}>Comissao global (R$):</Text>
              <TextInput
                style={{ backgroundColor: '#0F172A', borderRadius: 8, padding: 8, color: '#10B981', fontWeight: '700', fontSize: 14, width: 80, textAlign: 'center', borderWidth: 1, borderColor: '#334155' }}
                value={repCommissionValue}
                onChangeText={setRepCommissionValue}
                keyboardType="numeric"
                data-testid="rep-commission-input"
              />
              <TouchableOpacity
                style={{ backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                onPress={handleSaveCommissionValue}
                data-testid="save-commission-btn"
              >
                <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 12 }}>Salvar</Text>
              </TouchableOpacity>
            </View>

            {/* Create Rep Form */}
            {showRepForm && (
              <View style={{ backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' }} data-testid="rep-create-form">
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Cadastrar Representante</Text>
                <TextInput style={{ backgroundColor: '#0F172A', borderRadius: 10, padding: 12, color: '#E2E8F0', fontSize: 14, marginBottom: 8, borderWidth: 1, borderColor: '#334155' }} placeholder="Nome completo" placeholderTextColor="#64748B" value={repName} onChangeText={setRepName} data-testid="rep-name-input" />
                <TextInput style={{ backgroundColor: '#0F172A', borderRadius: 10, padding: 12, color: '#E2E8F0', fontSize: 14, marginBottom: 8, borderWidth: 1, borderColor: '#334155' }} placeholder="E-mail" placeholderTextColor="#64748B" value={repEmail} onChangeText={setRepEmail} keyboardType="email-address" data-testid="rep-email-input" />
                <TextInput style={{ backgroundColor: '#0F172A', borderRadius: 10, padding: 12, color: '#E2E8F0', fontSize: 14, marginBottom: 8, borderWidth: 1, borderColor: '#334155' }} placeholder="CNPJ (somente numeros)" placeholderTextColor="#64748B" value={repCnpj} onChangeText={setRepCnpj} keyboardType="numeric" maxLength={18} data-testid="rep-cnpj-input" />
                <TextInput style={{ backgroundColor: '#0F172A', borderRadius: 10, padding: 12, color: '#E2E8F0', fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: '#334155' }} placeholder="Tokens gratuitos iniciais" placeholderTextColor="#64748B" value={repFreeTokens} onChangeText={setRepFreeTokens} keyboardType="numeric" data-testid="rep-tokens-input" />
                {repMsg ? <Text style={{ color: repMsg.includes('sucesso') ? '#10B981' : '#EF4444', fontSize: 13, marginBottom: 8 }}>{repMsg}</Text> : null}
                <TouchableOpacity
                  style={{ backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 10, alignItems: 'center', opacity: repSaving ? 0.6 : 1 }}
                  onPress={handleCreateRep}
                  disabled={repSaving}
                  data-testid="rep-submit-btn"
                >
                  {repSaving ? <ActivityIndicator color="#0F172A" /> : <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 15 }}>Cadastrar Representante</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* Reps List */}
            {repsLoading ? (
              <ActivityIndicator size="large" color="#10B981" />
            ) : reps.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <Ionicons name="people-outline" size={48} color="#334155" />
                <Text style={{ color: '#94A3B8', marginTop: 12, fontSize: 16 }}>Nenhum representante cadastrado</Text>
              </View>
            ) : (
              reps.map((rep: any) => (
                <View key={rep.rep_id} style={{ backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' }} data-testid={`rep-card-${rep.rep_id}`}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{rep.name}</Text>
                      <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>{rep.email}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ backgroundColor: rep.status === 'active' ? '#10B98120' : '#EF444420', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                        <Text style={{ color: rep.status === 'active' ? '#10B981' : '#EF4444', fontSize: 11, fontWeight: '600' }}>
                          {rep.status === 'active' ? 'Ativo' : 'Suspenso'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* CNPJ and Code */}
                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#64748B', fontSize: 11 }}>CNPJ</Text>
                      <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '600' }}>{rep.cnpj}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#64748B', fontSize: 11 }}>Codigo Indicacao</Text>
                      <TouchableOpacity onPress={() => copyToClipboard(rep.referral_code)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '700' }}>{rep.referral_code}</Text>
                        <Ionicons name="copy-outline" size={12} color="#10B981" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Stats */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    <View style={{ flex: 1, backgroundColor: '#0F172A', borderRadius: 8, padding: 10, alignItems: 'center' }}>
                      <Text style={{ color: '#3B82F6', fontSize: 16, fontWeight: '700' }}>{rep.clients_count || 0}</Text>
                      <Text style={{ color: '#64748B', fontSize: 10 }}>Clientes</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#0F172A', borderRadius: 8, padding: 10, alignItems: 'center' }}>
                      <Text style={{ color: '#8B5CF6', fontSize: 16, fontWeight: '700' }}>{rep.establishments_count || 0}</Text>
                      <Text style={{ color: '#64748B', fontSize: 10 }}>Estab.</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#0F172A', borderRadius: 8, padding: 10, alignItems: 'center' }}>
                      <Text style={{ color: '#10B981', fontSize: 16, fontWeight: '700' }}>R${(rep.commission_balance || 0).toFixed(2)}</Text>
                      <Text style={{ color: '#64748B', fontSize: 10 }}>Saldo</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#0F172A', borderRadius: 8, padding: 10, alignItems: 'center' }}>
                      <Text style={{ color: '#F59E0B', fontSize: 16, fontWeight: '700' }}>{(rep.free_tokens_allocated || 0) - (rep.free_tokens_used || 0)}</Text>
                      <Text style={{ color: '#64748B', fontSize: 10 }}>Tk Gratis</Text>
                    </View>
                  </View>

                  {/* Access Link */}
                  <View style={{ backgroundColor: '#0F172A', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                    <Text style={{ color: '#64748B', fontSize: 11, marginBottom: 4 }}>Link privado do dashboard:</Text>
                    <TouchableOpacity onPress={() => copyToClipboard(`${API_URL}/representative/dashboard?token=${rep.access_token}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: '#94A3B8', fontSize: 11, flex: 1 }} numberOfLines={1}>{API_URL}/representative/dashboard?token=...{rep.access_token?.slice(-8)}</Text>
                      <Ionicons name="copy" size={14} color="#3B82F6" />
                    </TouchableOpacity>
                  </View>

                  {/* Add Free Tokens */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    <TextInput
                      style={{ flex: 1, backgroundColor: '#0F172A', borderRadius: 8, padding: 8, color: '#E2E8F0', fontSize: 13, borderWidth: 1, borderColor: '#334155' }}
                      placeholder="Qtd tokens gratis"
                      placeholderTextColor="#475569"
                      value={selectedRep?.rep_id === rep.rep_id ? addTokensAmount : ''}
                      onChangeText={(t) => { setSelectedRep(rep); setAddTokensAmount(t); }}
                      keyboardType="numeric"
                      data-testid={`add-tokens-${rep.rep_id}`}
                    />
                    <TouchableOpacity
                      style={{ backgroundColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                      onPress={() => handleAddFreeTokens(rep.rep_id)}
                      data-testid={`add-tokens-btn-${rep.rep_id}`}
                    >
                      <Text style={{ color: '#0F172A', fontWeight: '600', fontSize: 12 }}>+ Tokens</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ backgroundColor: rep.status === 'active' ? '#EF444420' : '#10B98120', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                      onPress={() => handleUpdateRepStatus(rep.rep_id, rep.status === 'active' ? 'suspended' : 'active')}
                      data-testid={`toggle-status-${rep.rep_id}`}
                    >
                      <Ionicons name={rep.status === 'active' ? 'pause' : 'play'} size={14} color={rep.status === 'active' ? '#EF4444' : '#10B981'} />
                    </TouchableOpacity>
                  </View>
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

      {/* Media Preview Modal */}
      <Modal visible={!!previewMedia} animationType="fade" transparent onRequestClose={() => setPreviewMedia(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { padding: 0, overflow: 'hidden' as any }]} data-testid="media-preview-modal">
            <TouchableOpacity
              style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: '#EF4444', borderRadius: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => setPreviewMedia(null)}
              data-testid="media-preview-close"
            >
              <Ionicons name="close" size={20} color="#FFF" />
            </TouchableOpacity>
            {previewMedia && (
              <View style={{ alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12, textAlign: 'center' }}>
                  {previewMedia.title}
                </Text>
                {previewMedia.type === 'image' && previewMedia.url ? (
                  <Image
                    source={{ uri: previewMedia.url }}
                    style={{ width: '100%', height: 350, borderRadius: 12, backgroundColor: '#F1F5F9' }}
                    resizeMode="contain"
                  />
                ) : previewMedia.type === 'video' && previewMedia.url ? (
                  <View style={{ width: '100%', borderRadius: 12, overflow: 'hidden' as any, backgroundColor: '#000' }}>
                    {typeof document !== 'undefined' ? (
                      <video
                        src={previewMedia.url}
                        controls
                        style={{ width: '100%', maxHeight: 350, borderRadius: 12, backgroundColor: '#000' }}
                        playsInline
                      />
                    ) : (
                      <View style={{ height: 250, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="play-circle" size={64} color="#10B981" />
                      </View>
                    )}
                  </View>
                ) : null}
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 10 }}>
                  {previewMedia.ai_generated ? 'Gerado por IA' : previewMedia.url?.startsWith('data:') ? 'Upload local' : previewMedia.url?.substring(0, 60)}
                </Text>
              </View>
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
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
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
  mediaThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  mediaExpandHint: {
    padding: 4,
  },
  mediaUploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: '#F8FAFC',
  },
  mediaUploadBtnActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  mediaUploadBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  uploadPreview: {
    alignItems: 'center',
    position: 'relative',
  },
  uploadThumb: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  uploadRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  mediaPublishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
  },
  mediaPublishBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

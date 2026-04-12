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
  TextInput,
  Modal,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function RepresentativeDashboard() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const repToken = params.token as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<'overview' | 'clients' | 'establishments' | 'commissions' | 'contract' | 'docs' | 'withdrawals'>('overview');

  // Contract state
  const [contractData, setContractData] = useState<any>(null);
  const [contractName, setContractName] = useState('');
  const [contractAccepting, setContractAccepting] = useState(false);

  // Documents state
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('rg');

  // Withdrawals state
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [wdAmount, setWdAmount] = useState('');
  const [wdPixKey, setWdPixKey] = useState('');
  const [wdPixType, setWdPixType] = useState('cpf');
  const [wdSubmitting, setWdSubmitting] = useState(false);
  const [wdMsg, setWdMsg] = useState('');

  // Share state
  const [shareLinks, setShareLinks] = useState<any>({});
  const [shareTarget, setShareTarget] = useState<'client' | 'establishment'>('client');

  // Token allocation state
  const [allocations, setAllocations] = useState<any[]>([]);
  const [allocEstId, setAllocEstId] = useState('');
  const [allocAmount, setAllocAmount] = useState('');
  const [allocMsg, setAllocMsg] = useState('');
  const [allocSubmitting, setAllocSubmitting] = useState(false);

  // Special package
  const [specialPkg, setSpecialPkg] = useState<any>(null);

  const repFetch = async (endpoint: string, options: RequestInit = {}) => {
    const res = await fetch(`${API_URL}/api${endpoint}`, {
      ...options,
      headers: { 'X-Rep-Token': repToken, 'Content-Type': 'application/json', ...options.headers },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Erro' }));
      throw new Error(err.detail || 'Erro');
    }
    return res.json();
  };

  const loadDashboard = async () => {
    if (!repToken) {
      setError('Token de acesso nao fornecido. Solicite um novo link ao administrador.');
      setLoading(false);
      return;
    }
    try {
      const [result, contractRes, docsRes, wdRes, linksRes, allocRes, pkgRes] = await Promise.all([
        repFetch('/rep/dashboard'),
        repFetch('/rep/contract').catch(() => null),
        repFetch('/rep/documents').catch(() => []),
        repFetch('/rep/withdrawals').catch(() => []),
        repFetch('/rep/share-link').catch(() => ({})),
        repFetch('/rep/token-allocations').catch(() => []),
        repFetch('/rep/special-package').catch(() => null),
      ]);
      setData(result);
      setContractData(contractRes);
      setDocuments(docsRes || []);
      setWithdrawals(wdRes || []);
      setShareLinks(linksRes || {});
      setAllocations(allocRes || []);
      setSpecialPkg(pkgRes);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Erro de conexao');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [repToken]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [repToken]);

  const formatCurrency = (val: number) => `R$ ${(val || 0).toFixed(2).replace('.', ',')}`;
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try { return new Date(dateStr).toLocaleDateString('pt-BR'); } catch { return dateStr.slice(0, 10); }
  };

  const handleCopyCode = () => {
    if (!data?.referral_code) return;
    if (Platform.OS === 'web') {
      try {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(data.referral_code).catch(() => {
            fallbackCopy(data.referral_code);
          });
        } else {
          fallbackCopy(data.referral_code);
        }
      } catch {
        fallbackCopy(data.referral_code);
      }
    }
  };

  const fallbackCopy = (text: string) => {
    if (typeof document !== 'undefined') {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    window.alert('Copiado: ' + text);
  };

  const getShareMessage = (target: 'client' | 'establishment') => {
    return target === 'client'
      ? shareLinks.share_message_client || `Baixe o iToke e ganhe descontos! Use meu codigo ${data?.referral_code}`
      : shareLinks.share_message_establishment || `Cadastre seu negocio no iToke! Use meu codigo ${data?.referral_code}`;
  };

  const handleShareWhatsApp = async (target: 'client' | 'establishment') => {
    const msg = getShareMessage(target);
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    await Linking.openURL(url);
  };

  const handleShareEmail = (target: 'client' | 'establishment') => {
    const msg = getShareMessage(target);
    const subject = target === 'client' ? 'Descontos incriveis no iToke!' : 'Aumente suas vendas com o iToke';
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
    Linking.openURL(url);
  };

  const handleShareNative = async (target: 'client' | 'establishment') => {
    const msg = getShareMessage(target);
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        try { await (navigator as any).share({ text: msg, title: 'iToke' }); return; } catch {}
      }
      handleCopyCode();
    } else {
      await Share.share({ message: msg });
    }
  };

  const handleAllocateTokens = async () => {
    if (!allocEstId || !allocAmount || parseInt(allocAmount) <= 0) {
      setAllocMsg('Selecione um estabelecimento e quantidade'); return;
    }
    setAllocSubmitting(true); setAllocMsg('');
    try {
      const result = await repFetch('/rep/allocate-tokens', {
        method: 'POST',
        body: JSON.stringify({ establishment_id: allocEstId, amount: parseInt(allocAmount) }),
      });
      setAllocMsg(result.message);
      setAllocAmount('');
      await loadDashboard();
    } catch (err: any) {
      setAllocMsg(err.message || 'Erro ao alocar tokens');
    }
    setAllocSubmitting(false);
  };

  const handleAcceptContract = async () => {
    if (!contractName.trim()) {
      if (Platform.OS === 'web') window.alert('Digite seu nome completo');
      else Alert.alert('Erro', 'Digite seu nome completo');
      return;
    }
    setContractAccepting(true);
    try {
      await repFetch('/rep/accept-contract', {
        method: 'POST',
        body: JSON.stringify({ full_name: contractName }),
      });
      await loadDashboard();
    } catch (err: any) {
      const msg = err.message || 'Erro ao aceitar contrato';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Erro', msg);
    }
    setContractAccepting(false);
  };

  const handleUploadDocument = async () => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        window.alert('Arquivo muito grande. Maximo 5MB.');
        return;
      }
      setUploading(true);
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          await repFetch('/rep/upload-document', {
            method: 'POST',
            body: JSON.stringify({ doc_type: selectedDocType, base64_data: base64, filename: file.name }),
          });
          const newDocs = await repFetch('/rep/documents');
          setDocuments(newDocs);
          setUploading(false);
        };
        reader.readAsDataURL(file);
      } catch (err: any) {
        window.alert(err.message || 'Erro no upload');
        setUploading(false);
      }
    };
    input.click();
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await repFetch(`/rep/documents/${docId}`, { method: 'DELETE' });
      setDocuments(documents.filter(d => d.doc_id !== docId));
    } catch (err) { console.error(err); }
  };

  const handleRequestWithdrawal = async () => {
    if (!wdAmount || parseFloat(wdAmount) <= 0) { setWdMsg('Valor invalido'); return; }
    if (!wdPixKey) { setWdMsg('Chave PIX obrigatoria'); return; }
    setWdSubmitting(true);
    setWdMsg('');
    try {
      const result = await repFetch('/rep/withdrawals', {
        method: 'POST',
        body: JSON.stringify({ amount: parseFloat(wdAmount), pix_key: wdPixKey, pix_type: wdPixType }),
      });
      setWdMsg(result.message);
      setWdAmount('');
      setWdPixKey('');
      await loadDashboard();
    } catch (err: any) {
      setWdMsg(err.message || 'Erro ao solicitar saque');
    }
    setWdSubmitting(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Ionicons name="lock-closed" size={56} color="#EF4444" />
        <Text style={styles.errorTitle}>Acesso Negado</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!data) return null;

  const stats = data.stats || {};
  const freeTokens = data.free_tokens || {};

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} data-testid="rep-dashboard-screen">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" colors={['#10B981']} />}
      >
        {/* Header */}
        <View style={styles.header} data-testid="rep-header">
          <View style={styles.headerIcon}>
            <Ionicons name="briefcase" size={24} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName}>{data.name}</Text>
            <Text style={styles.headerRole}>Representante Comercial PJ</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: data.status === 'active' ? '#10B98120' : '#F59E0B20' }]}>
            <Text style={[styles.statusText, { color: data.status === 'active' ? '#10B981' : '#F59E0B' }]}>
              {data.status === 'active' ? 'Ativo' : 'Pendente'}
            </Text>
          </View>
        </View>

        {/* Referral Share Card */}
        <View style={styles.codeCard} data-testid="rep-referral-code">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Ionicons name="link" size={18} color="#3B82F6" />
            <Text style={styles.codeLabel}>Seu codigo de indicacao:</Text>
            <Text style={styles.codeValue}>{data.referral_code}</Text>
            <TouchableOpacity onPress={handleCopyCode}>
              <Ionicons name="copy-outline" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Target selector */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity
              style={[styles.shareTargetBtn, shareTarget === 'client' && styles.shareTargetBtnActive]}
              onPress={() => setShareTarget('client')}
              data-testid="share-target-client"
            >
              <Ionicons name="people" size={14} color={shareTarget === 'client' ? '#0F172A' : '#94A3B8'} />
              <Text style={[styles.shareTargetText, shareTarget === 'client' && { color: '#0F172A' }]}>Clientes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareTargetBtn, shareTarget === 'establishment' && styles.shareTargetBtnActive]}
              onPress={() => setShareTarget('establishment')}
              data-testid="share-target-est"
            >
              <Ionicons name="storefront" size={14} color={shareTarget === 'establishment' ? '#0F172A' : '#94A3B8'} />
              <Text style={[styles.shareTargetText, shareTarget === 'establishment' && { color: '#0F172A' }]}>Estabelecimentos</Text>
            </TouchableOpacity>
          </View>

          {/* Share buttons */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#25D366' }]} onPress={() => handleShareWhatsApp(shareTarget)} data-testid="share-whatsapp">
              <Ionicons name="logo-whatsapp" size={18} color="#FFF" />
              <Text style={styles.shareBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#3B82F6' }]} onPress={() => handleShareEmail(shareTarget)} data-testid="share-email">
              <Ionicons name="mail" size={18} color="#FFF" />
              <Text style={styles.shareBtnText}>E-mail</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#8B5CF6' }]} onPress={() => handleShareNative(shareTarget)} data-testid="share-native">
              <Ionicons name="share-social" size={18} color="#FFF" />
              <Text style={styles.shareBtnText}>Mais</Text>
            </TouchableOpacity>
          </View>

          {/* Special package promo for clients */}
          {shareTarget === 'client' && specialPkg?.active && (
            <View style={{ marginTop: 12, backgroundColor: '#F59E0B15', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#F59E0B30' }}>
              <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '700' }}>{specialPkg.name}</Text>
              <Text style={{ color: '#CBD5E1', fontSize: 12, marginTop: 4 }}>
                {specialPkg.tokens} tokens por R$ {(specialPkg.price || 0).toFixed(2).replace('.', ',')} — oferta exclusiva para seus indicados!
              </Text>
            </View>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid} data-testid="rep-stats">
          <View style={styles.statCard}>
            <Ionicons name="people" size={20} color="#3B82F6" />
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.total_clients}</Text>
            <Text style={styles.statLabel}>Clientes</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="storefront" size={20} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{stats.total_establishments}</Text>
            <Text style={styles.statLabel}>Estabelec.</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={20} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>{formatCurrency(stats.commission_balance)}</Text>
            <Text style={styles.statLabel}>Saldo</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{formatCurrency(stats.total_earned)}</Text>
            <Text style={styles.statLabel}>Total Ganho</Text>
          </View>
        </View>

        {/* Free Tokens Card */}
        <View style={styles.freeTokensCard} data-testid="rep-free-tokens">
          <View style={styles.freeTokensHeader}>
            <Ionicons name="gift" size={20} color="#F59E0B" />
            <Text style={styles.freeTokensTitle}>Tokens Gratuitos</Text>
          </View>
          <View style={styles.freeTokensBar}>
            <View style={[styles.freeTokensFill, { width: `${freeTokens.allocated > 0 ? (freeTokens.used / freeTokens.allocated) * 100 : 0}%` }]} />
          </View>
          <View style={styles.freeTokensDetails}>
            <View style={styles.freeTokensItem}>
              <Text style={styles.ftLabel}>Alocados</Text>
              <Text style={styles.ftValue}>{freeTokens.allocated}</Text>
            </View>
            <View style={styles.freeTokensItem}>
              <Text style={styles.ftLabel}>Usados</Text>
              <Text style={[styles.ftValue, { color: '#EF4444' }]}>{freeTokens.used}</Text>
            </View>
            <View style={styles.freeTokensItem}>
              <Text style={styles.ftLabel}>Restantes</Text>
              <Text style={[styles.ftValue, { color: '#10B981' }]}>{freeTokens.remaining}</Text>
            </View>
          </View>
          <Text style={styles.freeTokensNote}>
            {freeTokens.remaining > 0
              ? `Voce tem ${freeTokens.remaining} tokens gratis para oferecer a novos estabelecimentos.`
              : 'Seus tokens gratuitos acabaram. Comissoes serao geradas quando estabelecimentos comprarem novos tokens.'}
          </Text>
        </View>

        {/* Section Tabs */}
        <View style={styles.sectionTabs}>
          {(['overview', 'contract', 'docs', 'clients', 'establishments', 'commissions', 'withdrawals'] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.sectionTab, activeSection === s && styles.sectionTabActive]}
              onPress={() => setActiveSection(s)}
              data-testid={`rep-section-${s}`}
            >
              <Text style={[styles.sectionTabText, activeSection === s && styles.sectionTabTextActive]}>
                {s === 'overview' ? 'Resumo' : s === 'contract' ? 'Contrato' : s === 'docs' ? 'Docs' : s === 'clients' ? 'Clientes' : s === 'establishments' ? 'Estab.' : s === 'commissions' ? 'Comissoes' : 'Saques'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview Section */}
        {activeSection === 'overview' && (
          <View style={styles.section} data-testid="rep-overview-section">
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>CNPJ</Text>
                <Text style={styles.infoValue}>{data.cnpj}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>E-mail</Text>
                <Text style={styles.infoValue}>{data.email}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Sacado</Text>
                <Text style={styles.infoValue}>{formatCurrency(stats.total_withdrawn)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Clients Section */}
        {activeSection === 'clients' && (
          <View style={styles.section} data-testid="rep-clients-section">
            {(data.clients || []).length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="people-outline" size={40} color="#334155" />
                <Text style={styles.emptyText}>Nenhum cliente vinculado ainda</Text>
                <Text style={styles.emptySubtext}>Compartilhe seu codigo {data.referral_code} para indicar clientes</Text>
              </View>
            ) : (
              (data.clients || []).map((c: any, i: number) => (
                <View key={c.user_id || i} style={styles.listCard} data-testid={`rep-client-${i}`}>
                  <View style={styles.listCardIcon}>
                    <Ionicons name="person" size={18} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listCardName}>{c.name}</Text>
                    <Text style={styles.listCardSub}>{c.email}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.listCardDate}>Desde {formatDate(c.linked_at)}</Text>
                    <Text style={styles.listCardExpiry}>Ate {formatDate(c.expires_at)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Establishments Section */}
        {activeSection === 'establishments' && (
          <View style={styles.section} data-testid="rep-establishments-section">
            {/* Allocate Tokens Form */}
            {(data.establishments || []).length > 0 && (
              <View style={{ backgroundColor: '#111827', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#F59E0B30', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Ionicons name="gift" size={18} color="#F59E0B" />
                  <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '700' }}>Alocar Tokens Gratis</Text>
                </View>
                <View style={{ backgroundColor: '#0F172A', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                  {(data.establishments || []).map((e: any) => (
                    <TouchableOpacity
                      key={e.establishment_id}
                      style={{ padding: 10, borderRadius: 8, backgroundColor: allocEstId === e.establishment_id ? '#10B98120' : 'transparent', marginBottom: 4 }}
                      onPress={() => setAllocEstId(e.establishment_id)}
                    >
                      <Text style={{ color: allocEstId === e.establishment_id ? '#10B981' : '#CBD5E1', fontSize: 13, fontWeight: '600' }}>{e.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={{ backgroundColor: '#0F172A', borderRadius: 8, padding: 10, color: '#E2E8F0', fontSize: 13, borderWidth: 1, borderColor: '#334155', marginBottom: 8 }}
                  placeholder="Quantidade de tokens"
                  placeholderTextColor="#64748B"
                  value={allocAmount}
                  onChangeText={setAllocAmount}
                  keyboardType="numeric"
                  data-testid="alloc-amount-input"
                />
                {allocMsg ? <Text style={{ color: allocMsg.includes('alocados') || allocMsg.includes('aprovacao') ? '#10B981' : '#EF4444', fontSize: 12, marginBottom: 6 }}>{allocMsg}</Text> : null}
                <TouchableOpacity
                  style={{ backgroundColor: '#F59E0B', paddingVertical: 12, borderRadius: 10, alignItems: 'center', opacity: allocSubmitting ? 0.6 : 1 }}
                  onPress={handleAllocateTokens}
                  disabled={allocSubmitting}
                  data-testid="alloc-submit-btn"
                >
                  {allocSubmitting ? <ActivityIndicator color="#0F172A" /> : (
                    <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 14 }}>Alocar Tokens</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Allocation History */}
            {allocations.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Alocacoes realizadas</Text>
                {allocations.map((a: any, i: number) => (
                  <View key={a.allocation_id || i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#1E293B' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '600' }}>{a.establishment_name}</Text>
                      <Text style={{ color: '#64748B', fontSize: 11 }}>{a.amount} tokens | {formatDate(a.created_at)}</Text>
                    </View>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: a.status === 'approved' ? '#10B98120' : a.status === 'pending_approval' ? '#F59E0B20' : '#EF444420' }}>
                      <Text style={{ color: a.status === 'approved' ? '#10B981' : a.status === 'pending_approval' ? '#F59E0B' : '#EF4444', fontSize: 10, fontWeight: '600' }}>
                        {a.status === 'approved' ? 'Aprovado' : a.status === 'pending_approval' ? 'Pendente' : 'Rejeitado'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Establishment List */}
            {(data.establishments || []).length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="storefront-outline" size={40} color="#334155" />
                <Text style={styles.emptyText}>Nenhum estabelecimento vinculado</Text>
                <Text style={styles.emptySubtext}>Use seu codigo para trazer novos parceiros</Text>
              </View>
            ) : (
              (data.establishments || []).map((e: any, i: number) => (
                <View key={e.establishment_id || i} style={styles.listCard} data-testid={`rep-est-${i}`}>
                  <View style={[styles.listCardIcon, { backgroundColor: '#8B5CF620' }]}>
                    <Ionicons name="storefront" size={18} color="#8B5CF6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listCardName}>{e.name}</Text>
                    <Text style={styles.listCardSub}>{e.category}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.listCardDate}>Desde {formatDate(e.linked_at)}</Text>
                    <Text style={styles.listCardExpiry}>Ate {formatDate(e.expires_at)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Commissions Section */}
        {activeSection === 'commissions' && (
          <View style={styles.section} data-testid="rep-commissions-section">
            {(data.recent_commissions || []).length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="cash-outline" size={40} color="#334155" />
                <Text style={styles.emptyText}>Nenhuma comissao gerada</Text>
                <Text style={styles.emptySubtext}>Comissoes aparecerao quando seus indicados fizerem transacoes</Text>
              </View>
            ) : (
              (data.recent_commissions || []).map((c: any, i: number) => (
                <View key={c.commission_id || i} style={styles.commissionCard} data-testid={`rep-commission-${i}`}>
                  <View style={styles.commissionLeft}>
                    <View style={[styles.commissionDot, { backgroundColor: c.status === 'approved' ? '#10B981' : '#F59E0B' }]} />
                    <View>
                      <Text style={styles.commissionType}>
                        {c.source_type === 'client' ? 'Venda do Cliente' : 'Venda do Estabelecimento'}
                      </Text>
                      <Text style={styles.commissionDate}>{formatDate(c.created_at)}</Text>
                    </View>
                  </View>
                  <Text style={styles.commissionAmount}>+{formatCurrency(c.amount)}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Contract Section */}
        {activeSection === 'contract' && (
          <View style={styles.section} data-testid="rep-contract-section">
            {contractData?.accepted ? (
              <View>
                <View style={styles.contractAcceptedBanner}>
                  <Ionicons name="checkmark-shield" size={24} color="#10B981" />
                  <Text style={styles.contractAcceptedText}>Contrato Assinado</Text>
                  <Text style={styles.contractAcceptedDate}>Em {formatDate(contractData.contract?.accepted_at)}</Text>
                </View>
                <View style={styles.contractTextBox}>
                  <Text style={styles.contractText}>{contractData.preview_text}</Text>
                </View>
                <View style={styles.contractMeta}>
                  <Text style={styles.contractMetaText}>Assinado por: {contractData.contract?.full_name_signed}</Text>
                  <Text style={styles.contractMetaText}>IP: {contractData.contract?.ip_address}</Text>
                </View>
              </View>
            ) : (
              <View>
                <View style={styles.contractPendingBanner}>
                  <Ionicons name="document-text" size={24} color="#F59E0B" />
                  <Text style={styles.contractPendingText}>Contrato Pendente de Aceite</Text>
                </View>
                <View style={styles.contractTextBox}>
                  <Text style={styles.contractText}>{contractData?.preview_text || 'Carregando...'}</Text>
                </View>
                <TextInput
                  style={styles.contractInput}
                  placeholder="Digite seu nome completo para aceitar"
                  placeholderTextColor="#64748B"
                  value={contractName}
                  onChangeText={setContractName}
                  data-testid="contract-name-input"
                />
                <TouchableOpacity
                  style={[styles.acceptBtn, contractAccepting && { opacity: 0.6 }]}
                  onPress={handleAcceptContract}
                  disabled={contractAccepting}
                  data-testid="accept-contract-btn"
                >
                  {contractAccepting ? <ActivityIndicator color="#0F172A" /> : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#0F172A" />
                      <Text style={styles.acceptBtnText}>Aceitar Contrato</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Documents Section */}
        {activeSection === 'docs' && (
          <View style={styles.section} data-testid="rep-docs-section">
            <Text style={styles.docsTitle}>Documentos para Analise</Text>
            <Text style={styles.docsSubtitle}>Envie seus documentos pessoais e da empresa para verificacao</Text>

            {/* Upload area */}
            <View style={styles.uploadArea}>
              <View style={styles.docTypeRow}>
                {[{v: 'rg', l: 'RG'}, {v: 'cnpj_card', l: 'Cartao CNPJ'}, {v: 'contrato_social', l: 'Contrato Social'}, {v: 'selfie', l: 'Selfie'}].map(dt => (
                  <TouchableOpacity
                    key={dt.v}
                    style={[styles.docTypeBtn, selectedDocType === dt.v && styles.docTypeBtnActive]}
                    onPress={() => setSelectedDocType(dt.v)}
                    data-testid={`doc-type-${dt.v}`}
                  >
                    <Text style={[styles.docTypeBtnText, selectedDocType === dt.v && styles.docTypeBtnTextActive]}>{dt.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.uploadBtn, uploading && { opacity: 0.6 }]}
                onPress={handleUploadDocument}
                disabled={uploading}
                data-testid="upload-doc-btn"
              >
                {uploading ? <ActivityIndicator color="#3B82F6" /> : (
                  <>
                    <Ionicons name="cloud-upload" size={20} color="#3B82F6" />
                    <Text style={styles.uploadBtnText}>Enviar Documento</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Document list */}
            {documents.length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="folder-open-outline" size={40} color="#334155" />
                <Text style={styles.emptyText}>Nenhum documento enviado</Text>
              </View>
            ) : (
              documents.map((doc: any, i: number) => (
                <View key={doc.doc_id || i} style={styles.docCard} data-testid={`doc-card-${i}`}>
                  <Ionicons name="document-attach" size={20} color="#3B82F6" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docCardType}>
                      {doc.doc_type === 'rg' ? 'RG' : doc.doc_type === 'cnpj_card' ? 'Cartao CNPJ' : doc.doc_type === 'contrato_social' ? 'Contrato Social' : doc.doc_type === 'selfie' ? 'Selfie' : doc.doc_type}
                    </Text>
                    <Text style={styles.docCardFile}>{doc.filename}</Text>
                  </View>
                  <View style={[styles.docStatusBadge, { backgroundColor: doc.status === 'approved' ? '#10B98120' : doc.status === 'rejected' ? '#EF444420' : '#F59E0B20' }]}>
                    <Text style={{ color: doc.status === 'approved' ? '#10B981' : doc.status === 'rejected' ? '#EF4444' : '#F59E0B', fontSize: 11, fontWeight: '600' }}>
                      {doc.status === 'approved' ? 'Aprovado' : doc.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                    </Text>
                  </View>
                  {doc.status === 'pending' && (
                    <TouchableOpacity onPress={() => handleDeleteDoc(doc.doc_id)} data-testid={`delete-doc-${i}`}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Withdrawals Section */}
        {activeSection === 'withdrawals' && (
          <View style={styles.section} data-testid="rep-withdrawals-section">
            <Text style={styles.docsTitle}>Saques</Text>

            {/* Balance */}
            <View style={styles.wdBalanceCard}>
              <Text style={styles.wdBalanceLabel}>Saldo disponivel</Text>
              <Text style={styles.wdBalanceValue}>{formatCurrency(stats.commission_balance)}</Text>
            </View>

            {/* Request Form */}
            <View style={styles.wdForm}>
              <TextInput
                style={styles.wdInput}
                placeholder="Valor do saque (R$)"
                placeholderTextColor="#64748B"
                value={wdAmount}
                onChangeText={setWdAmount}
                keyboardType="numeric"
                data-testid="wd-amount-input"
              />
              <View style={styles.wdPixRow}>
                {['cpf', 'cnpj', 'email', 'telefone'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.wdPixTypeBtn, wdPixType === t && styles.wdPixTypeBtnActive]}
                    onPress={() => setWdPixType(t)}
                  >
                    <Text style={[styles.wdPixTypeBtnText, wdPixType === t && { color: '#0F172A' }]}>{t.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.wdInput}
                placeholder="Chave PIX"
                placeholderTextColor="#64748B"
                value={wdPixKey}
                onChangeText={setWdPixKey}
                data-testid="wd-pix-input"
              />
              {wdMsg ? <Text style={{ color: wdMsg.includes('solicitado') ? '#10B981' : '#EF4444', fontSize: 13, marginTop: 4 }}>{wdMsg}</Text> : null}
              <TouchableOpacity
                style={[styles.wdSubmitBtn, wdSubmitting && { opacity: 0.6 }]}
                onPress={handleRequestWithdrawal}
                disabled={wdSubmitting}
                data-testid="wd-submit-btn"
              >
                {wdSubmitting ? <ActivityIndicator color="#0F172A" /> : (
                  <Text style={styles.wdSubmitText}>Solicitar Saque</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* History */}
            {withdrawals.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.wdHistoryTitle}>Historico</Text>
                {withdrawals.map((w: any, i: number) => (
                  <View key={w.withdrawal_id || i} style={styles.wdCard} data-testid={`wd-card-${i}`}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.wdCardAmount}>{formatCurrency(w.amount)}</Text>
                      <Text style={styles.wdCardDate}>{formatDate(w.created_at)}</Text>
                    </View>
                    <View style={[styles.wdStatusBadge, { backgroundColor: w.status === 'paid' ? '#10B98120' : w.status === 'rejected' ? '#EF444420' : '#F59E0B20' }]}>
                      <Text style={{ color: w.status === 'paid' ? '#10B981' : w.status === 'rejected' ? '#EF4444' : '#F59E0B', fontSize: 12, fontWeight: '600' }}>
                        {w.status === 'paid' ? 'Pago' : w.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A' },
  centered: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  scrollContent: { paddingBottom: 20 },
  loadingText: { color: '#94A3B8', marginTop: 12, fontSize: 14 },
  errorTitle: { color: '#EF4444', fontSize: 22, fontWeight: '700', marginTop: 16 },
  errorText: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 8 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, gap: 14 },
  headerIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#10B98118', justifyContent: 'center', alignItems: 'center' },
  headerName: { fontSize: 20, fontWeight: '800', color: '#E2E8F0' },
  headerRole: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },

  codeCard: { marginHorizontal: 20, marginBottom: 20, padding: 16, backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1E293B' },
  codeLabel: { color: '#64748B', fontSize: 12, flex: 1 },
  codeValue: { color: '#10B981', fontSize: 16, fontWeight: '800', letterSpacing: 1 },

  shareTargetBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 20, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155' },
  shareTargetBtnActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  shareTargetText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  shareBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  statCard: { width: '47%', flexGrow: 1, backgroundColor: '#111827', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' },
  statValue: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 4, fontWeight: '600' },

  freeTokensCard: { marginHorizontal: 20, marginBottom: 20, padding: 16, backgroundColor: '#111827', borderRadius: 14, borderWidth: 1, borderColor: '#1E293B' },
  freeTokensHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  freeTokensTitle: { color: '#F59E0B', fontSize: 15, fontWeight: '700' },
  freeTokensBar: { height: 6, backgroundColor: '#1E293B', borderRadius: 3, marginBottom: 12, overflow: 'hidden' },
  freeTokensFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 3 },
  freeTokensDetails: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  freeTokensItem: { flex: 1, alignItems: 'center' },
  ftLabel: { color: '#64748B', fontSize: 11 },
  ftValue: { color: '#CBD5E1', fontSize: 16, fontWeight: '700', marginTop: 2 },
  freeTokensNote: { color: '#64748B', fontSize: 12, lineHeight: 18 },

  sectionTabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  sectionTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1E293B' },
  sectionTabActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  sectionTabText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  sectionTabTextActive: { color: '#0F172A' },

  section: { paddingHorizontal: 20 },

  infoCard: { backgroundColor: '#111827', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1E293B' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  infoLabel: { color: '#64748B', fontSize: 13 },
  infoValue: { color: '#E2E8F0', fontSize: 14, fontWeight: '600' },
  infoDivider: { height: 1, backgroundColor: '#1E293B' },

  emptySection: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#94A3B8', fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubtext: { color: '#64748B', fontSize: 13, marginTop: 6, textAlign: 'center' },

  listCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1E293B' },
  listCardIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#3B82F620', justifyContent: 'center', alignItems: 'center' },
  listCardName: { color: '#E2E8F0', fontSize: 14, fontWeight: '600' },
  listCardSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
  listCardDate: { color: '#64748B', fontSize: 11 },
  listCardExpiry: { color: '#475569', fontSize: 10, marginTop: 2 },

  commissionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1E293B' },
  commissionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  commissionDot: { width: 8, height: 8, borderRadius: 4 },
  commissionType: { color: '#CBD5E1', fontSize: 13, fontWeight: '500' },
  commissionDate: { color: '#475569', fontSize: 11, marginTop: 2 },
  commissionAmount: { color: '#10B981', fontSize: 16, fontWeight: '700' },

  // Contract styles
  contractAcceptedBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#10B98115', borderRadius: 12, padding: 16, marginBottom: 16 },
  contractAcceptedText: { color: '#10B981', fontSize: 16, fontWeight: '700', flex: 1 },
  contractAcceptedDate: { color: '#64748B', fontSize: 12 },
  contractPendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F59E0B15', borderRadius: 12, padding: 16, marginBottom: 16 },
  contractPendingText: { color: '#F59E0B', fontSize: 16, fontWeight: '700' },
  contractTextBox: { backgroundColor: '#111827', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1E293B', maxHeight: 300 },
  contractText: { color: '#94A3B8', fontSize: 12, lineHeight: 20, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  contractMeta: { backgroundColor: '#0D111D', borderRadius: 8, padding: 12 },
  contractMetaText: { color: '#64748B', fontSize: 11, marginBottom: 2 },
  contractInput: { backgroundColor: '#111827', borderRadius: 12, padding: 14, color: '#E2E8F0', fontSize: 15, borderWidth: 1, borderColor: '#334155', marginBottom: 12 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12 },
  acceptBtnText: { color: '#0F172A', fontSize: 16, fontWeight: '700' },

  // Documents styles
  docsTitle: { color: '#E2E8F0', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  docsSubtitle: { color: '#64748B', fontSize: 13, marginBottom: 16 },
  uploadArea: { backgroundColor: '#111827', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1E293B', marginBottom: 16 },
  docTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  docTypeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155' },
  docTypeBtnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  docTypeBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  docTypeBtnTextActive: { color: '#FFF' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#3B82F640', backgroundColor: '#3B82F610' },
  uploadBtnText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
  docCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#1E293B' },
  docCardType: { color: '#CBD5E1', fontSize: 13, fontWeight: '600' },
  docCardFile: { color: '#64748B', fontSize: 11, marginTop: 2 },
  docStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },

  // Withdrawals styles
  wdBalanceCard: { backgroundColor: '#10B98118', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#10B98130' },
  wdBalanceLabel: { color: '#64748B', fontSize: 13 },
  wdBalanceValue: { color: '#10B981', fontSize: 32, fontWeight: '800', marginTop: 4 },
  wdForm: { backgroundColor: '#111827', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1E293B' },
  wdInput: { backgroundColor: '#0F172A', borderRadius: 10, padding: 12, color: '#E2E8F0', fontSize: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 10 },
  wdPixRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  wdPixTypeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155' },
  wdPixTypeBtnActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  wdPixTypeBtnText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  wdSubmitBtn: { backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  wdSubmitText: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  wdHistoryTitle: { color: '#CBD5E1', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  wdCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#1E293B' },
  wdCardAmount: { color: '#E2E8F0', fontSize: 16, fontWeight: '700' },
  wdCardDate: { color: '#64748B', fontSize: 11, marginTop: 2 },
  wdStatusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
});

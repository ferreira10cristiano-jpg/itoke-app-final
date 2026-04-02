import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const showAlert = (title: string, msg: string, onOk?: () => void) => {
  if (typeof window !== 'undefined') { window.alert(`${title}\n${msg}`); onOk?.(); }
  else { Alert.alert(title, msg, [{ text: 'OK', onPress: onOk }]); }
};

export default function ValidatorPage() {
  const insets = useSafeAreaInsets();
  const { id: estId } = useLocalSearchParams<{ id: string }>();

  const [estName, setEstName] = useState('');
  const [validatorId, setValidatorId] = useState<string | null>(null);
  const [validatorName, setValidatorName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);

  // Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<any>(null);

  // Preview
  const [preview, setPreview] = useState<any>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Result
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (estId) loadEstablishment();
  }, [estId]);

  const loadEstablishment = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v/${estId}/info`);
      if (!res.ok) throw new Error('Estabelecimento não encontrado');
      const data = await res.json();
      setEstName(data.business_name);

      // Check localStorage for saved validator
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`validator_${estId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Verify validator is still active
          const checkRes = await fetch(`${API_URL}/api/v/${estId}/check/${parsed.validator_id}`);
          if (checkRes.ok) {
            setValidatorId(parsed.validator_id);
            setValidatorName(parsed.name);
          } else if (checkRes.status === 403) {
            setBlocked(true);
            localStorage.removeItem(`validator_${estId}`);
          } else {
            localStorage.removeItem(`validator_${estId}`);
          }
        }
      }
    } catch (e: any) {
      showAlert('Erro', e.message || 'Não foi possível carregar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!nameInput.trim()) {
      showAlert('Atenção', 'Digite seu nome para continuar.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/v/${estId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao registrar');
      const data = await res.json();
      setValidatorId(data.validator_id);
      setValidatorName(data.name);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`validator_${estId}`, JSON.stringify({
          validator_id: data.validator_id,
          name: data.name,
        }));
      }
    } catch (e: any) {
      showAlert('Erro', e.message);
    }
  };

  const handleScan = async (code: string) => {
    if (!code.trim() || scanLoading) return;
    setScanLoading(true);
    setShowScanner(false);
    try {
      const res = await fetch(`${API_URL}/api/v/${estId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validator_id: validatorId, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erro ao escanear');

      if (data.step === 'already_pending') {
        showAlert('Já pré-validado', data.message);
      } else {
        setPreview(data);
      }
    } catch (e: any) {
      showAlert('Erro', e.message);
    } finally {
      setScanLoading(false);
      setManualCode('');
    }
  };

  const handleFinalize = async () => {
    if (!preview) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v/${estId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validator_id: validatorId, voucher_id: preview.voucher_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erro ao finalizar');
      setResult({ type: 'finalized', data });
      setPreview(null);
    } catch (e: any) {
      showAlert('Erro', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendToCashier = async () => {
    if (!preview) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v/${estId}/pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validator_id: validatorId, voucher_id: preview.voucher_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erro');
      setResult({ type: 'pending', data });
      setPreview(null);
    } catch (e: any) {
      showAlert('Erro', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const startHtml5Scanner = () => {
    setShowScanner(true);
    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const scanner = new Html5Qrcode('validator-scanner');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (text: string) => {
            scanner.stop().catch(() => {});
            scannerRef.current = null;
            handleScan(text);
          },
          () => {}
        );
      } catch (e) {
        console.error('Scanner error:', e);
      }
    }, 500);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setShowScanner(false);
  };

  if (isLoading) {
    return (
      <View style={[s.container, s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (blocked) {
    return (
      <View style={[s.container, s.centered, { paddingTop: insets.top }]}>
        <Ionicons name="lock-closed" size={64} color="#EF4444" />
        <Text style={s.blockedTitle}>Acesso Bloqueado</Text>
        <Text style={s.blockedText}>Seu acesso foi revogado pelo estabelecimento.</Text>
      </View>
    );
  }

  // Registration screen
  if (!validatorId) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.registerCard}>
          <View style={s.logoCircle}>
            <Ionicons name="shield-checkmark" size={40} color="#10B981" />
          </View>
          <Text style={s.registerTitle}>Validador de QR Code</Text>
          <Text style={s.registerSub}>{estName}</Text>
          <Text style={s.registerDesc}>
            Digite seu nome para acessar o scanner de validação de QR Codes.
          </Text>
          <TextInput
            style={s.nameInput}
            placeholder='Ex: "João - Garçom"'
            placeholderTextColor="#64748B"
            value={nameInput}
            onChangeText={setNameInput}
            autoFocus
          />
          <TouchableOpacity style={s.registerBtn} onPress={handleRegister} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={20} color="#0F172A" />
            <Text style={s.registerBtnText}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Result screen
  if (result) {
    const isFinalized = result.type === 'finalized';
    return (
      <View style={[s.container, s.centered, { paddingTop: insets.top }]}>
        <View style={s.resultCard}>
          <View style={[s.resultIconCircle, { backgroundColor: isFinalized ? '#064E3B' : '#78350F' }]}>
            <Ionicons
              name={isFinalized ? 'checkmark-circle' : 'time'}
              size={48}
              color={isFinalized ? '#10B981' : '#F59E0B'}
            />
          </View>
          <Text style={s.resultTitle}>
            {isFinalized ? 'Venda Finalizada!' : 'Enviado ao Caixa'}
          </Text>
          <Text style={s.resultMessage}>
            {isFinalized
              ? result.data.message || 'Transação concluída com sucesso.'
              : result.data.message || 'QR Code ficará aberto até a confirmação no caixa.'}
          </Text>
          <TouchableOpacity
            style={s.newScanBtn}
            onPress={() => setResult(null)}
            activeOpacity={0.8}
          >
            <Ionicons name="scan" size={20} color="#0F172A" />
            <Text style={s.newScanBtnText}>Nova Validação</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Preview screen
  if (preview) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={s.previewContainer}>
          <View style={s.previewHeader}>
            <Ionicons name="receipt" size={28} color="#10B981" />
            <Text style={s.previewTitle}>Detalhes do Voucher</Text>
          </View>

          <View style={s.previewCard}>
            <View style={s.previewRow}>
              <Text style={s.previewLabel}>Cliente</Text>
              <Text style={s.previewValue}>{preview.customer_name}</Text>
            </View>
            <View style={s.previewRow}>
              <Text style={s.previewLabel}>Oferta</Text>
              <Text style={s.previewValue}>{preview.offer_title}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.previewRow}>
              <Text style={s.previewLabel}>Preço Original</Text>
              <Text style={[s.previewValue, { textDecorationLine: 'line-through', color: '#64748B' }]}>
                R$ {preview.original_price?.toFixed(2).replace('.', ',')}
              </Text>
            </View>
            <View style={s.previewRow}>
              <Text style={s.previewLabel}>Preço c/ Desconto</Text>
              <Text style={s.previewValue}>R$ {preview.discounted_price?.toFixed(2).replace('.', ',')}</Text>
            </View>
            <View style={s.previewRow}>
              <Text style={s.previewLabel}>Créditos Usados</Text>
              <Text style={[s.previewValue, { color: '#10B981' }]}>
                - R$ {preview.credits_used?.toFixed(2).replace('.', ',')}
              </Text>
            </View>
            <View style={s.divider} />
            <View style={s.previewRow}>
              <Text style={[s.previewLabel, { fontWeight: '700', color: '#FFF' }]}>A Pagar (Dinheiro/Cartão)</Text>
              <Text style={[s.previewValue, { fontSize: 22, fontWeight: '800', color: '#F59E0B' }]}>
                R$ {preview.amount_to_pay_cash?.toFixed(2).replace('.', ',')}
              </Text>
            </View>
          </View>

          <View style={s.actionButtons}>
            <TouchableOpacity
              style={s.finalizeBtn}
              onPress={handleFinalize}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading ? <ActivityIndicator color="#0F172A" /> : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#0F172A" />
                  <Text style={s.finalizeBtnText}>Finalizar Venda</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.pendingBtn}
              onPress={handleSendToCashier}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="time-outline" size={20} color="#F59E0B" />
              <Text style={s.pendingBtnText}>Pagar o restante no caixa (Pendente)</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.cancelPreviewBtn} onPress={() => setPreview(null)}>
            <Text style={s.cancelPreviewText}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Main scanner screen
  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.mainHeader}>
        <View>
          <Text style={s.mainHeaderName}>{validatorName}</Text>
          <Text style={s.mainHeaderEst}>{estName}</Text>
        </View>
        <View style={s.onlineBadge}>
          <View style={s.onlineDot} />
          <Text style={s.onlineText}>Online</Text>
        </View>
      </View>

      <View style={s.scannerArea}>
        {showScanner ? (
          <View style={s.scannerContainer}>
            <View id="validator-scanner" style={{ width: '100%', height: 300 }} />
            <TouchableOpacity style={s.stopScanBtn} onPress={stopScanner}>
              <Ionicons name="close" size={20} color="#FFF" />
              <Text style={s.stopScanText}>Fechar Câmera</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.scanButton} onPress={startHtml5Scanner} activeOpacity={0.8}>
            <View style={s.scanIconCircle}>
              <Ionicons name="scan" size={48} color="#10B981" />
            </View>
            <Text style={s.scanButtonText}>Escanear QR Code</Text>
            <Text style={s.scanButtonSub}>Aponte a câmera para o código do cliente</Text>
          </TouchableOpacity>
        )}

        {scanLoading && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={s.loadingText}>Verificando código...</Text>
          </View>
        )}
      </View>

      {/* Manual Code */}
      <View style={s.manualSection}>
        <Text style={s.manualLabel}>Ou digite o código manualmente:</Text>
        <View style={s.manualRow}>
          <TextInput
            style={s.manualInput}
            placeholder="Código do voucher"
            placeholderTextColor="#64748B"
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[s.manualBtn, !manualCode.trim() && { opacity: 0.5 }]}
            onPress={() => handleScan(manualCode)}
            disabled={!manualCode.trim()}
          >
            <Ionicons name="search" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 30 },

  // Register
  registerCard: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#064E3B', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  registerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  registerSub: { fontSize: 14, color: '#64748B', marginTop: 4, marginBottom: 24 },
  registerDesc: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  nameInput: { width: '100%', backgroundColor: '#1E293B', color: '#FFF', borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, textAlign: 'center' },
  registerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', width: '100%', paddingVertical: 16, borderRadius: 12, marginTop: 16 },
  registerBtnText: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

  // Blocked
  blockedTitle: { fontSize: 20, fontWeight: '700', color: '#EF4444', marginTop: 16 },
  blockedText: { fontSize: 14, color: '#94A3B8', marginTop: 8, textAlign: 'center' },

  // Main Header
  mainHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  mainHeaderName: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  mainHeaderEst: { fontSize: 13, color: '#64748B', marginTop: 2 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#064E3B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  onlineText: { fontSize: 12, color: '#10B981', fontWeight: '600' },

  // Scanner
  scannerArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  scanButton: { alignItems: 'center', padding: 30 },
  scanIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#064E3B', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 3, borderColor: '#10B981' },
  scanButtonText: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  scanButtonSub: { fontSize: 14, color: '#64748B', marginTop: 8 },
  scannerContainer: { width: '100%', alignItems: 'center' },
  stopScanBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EF4444', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 12 },
  stopScanText: { fontSize: 14, color: '#FFF', fontWeight: '600' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.9)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: '#94A3B8', marginTop: 12 },

  // Manual
  manualSection: { paddingHorizontal: 20, paddingBottom: 30 },
  manualLabel: { fontSize: 13, color: '#64748B', marginBottom: 8 },
  manualRow: { flexDirection: 'row', gap: 8 },
  manualInput: { flex: 1, backgroundColor: '#1E293B', color: '#FFF', borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, textTransform: 'uppercase' },
  manualBtn: { backgroundColor: '#10B981', width: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },

  // Preview
  previewContainer: { padding: 20 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  previewTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  previewCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#334155' },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  previewLabel: { fontSize: 14, color: '#94A3B8' },
  previewValue: { fontSize: 14, color: '#CBD5E1', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 8 },

  actionButtons: { marginTop: 20, gap: 12 },
  finalizeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12 },
  finalizeBtnText: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  pendingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1E293B', paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: '#F59E0B' },
  pendingBtnText: { fontSize: 15, fontWeight: '700', color: '#F59E0B' },
  cancelPreviewBtn: { alignItems: 'center', marginTop: 16, paddingVertical: 12 },
  cancelPreviewText: { fontSize: 14, color: '#64748B' },

  // Result
  resultCard: { alignItems: 'center', padding: 20 },
  resultIconCircle: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  resultTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', marginBottom: 8 },
  resultMessage: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  newScanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  newScanBtnText: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
});

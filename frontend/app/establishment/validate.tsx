import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/store/authStore';

type FlowStep = 'scan' | 'preview' | 'confirmed';

export default function ValidateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refreshUser } = useAuthStore();
  const [codeInput, setCodeInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [flowStep, setFlowStep] = useState<FlowStep>('scan');
  const [inputMode, setInputMode] = useState<'scanner' | 'manual'>('manual');
  const [errorMsg, setErrorMsg] = useState('');
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef<any>(null);
  const scannedCodeRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Stop scanner safely
  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      const state = scanner.getState?.();
      // State 2 = SCANNING
      if (state === 2) {
        await scanner.stop();
      }
    } catch (e) {
      // Ignore - scanner may already be stopped
    }
    try {
      scanner.clear();
    } catch (e) {
      // Ignore - element may already be removed
    }
    scannerRef.current = null;
    if (isMountedRef.current) setScannerReady(false);
  }, []);

  // Initialize html5-qrcode scanner
  useEffect(() => {
    if (inputMode !== 'scanner' || flowStep !== 'scan' || Platform.OS !== 'web') return;

    let cancelled = false;

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        // Wait for DOM element
        await new Promise(resolve => setTimeout(resolve, 400));
        if (cancelled) return;

        const el = document.getElementById('qr-reader');
        if (!el || cancelled) return;

        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 8,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            if (cancelled || scannedCodeRef.current) return;
            // Prevent double scans
            scannedCodeRef.current = decodedText;
            
            // Vibrate for feedback
            if (navigator.vibrate) navigator.vibrate(200);
            
            // Stop scanner FIRST, then process
            scanner.stop().catch(() => {}).finally(() => {
              if (isMountedRef.current) {
                processScannedCode(decodedText);
              }
            });
          },
          () => {} // ignore individual frame failures
        );

        if (!cancelled && isMountedRef.current) {
          setScannerReady(true);
        }
      } catch (err) {
        console.warn('Scanner init failed:', err);
        if (isMountedRef.current) {
          setScannerReady(false);
          setInputMode('manual');
        }
      }
    };

    initScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [inputMode, flowStep, stopScanner]);

  const processScannedCode = async (code: string) => {
    if (!code.trim()) return;
    setIsValidating(true);
    setErrorMsg('');
    try {
      const result = await api.validateQR(code.trim());
      if (isMountedRef.current) {
        setPreviewData(result);
        setFlowStep('preview');
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        setErrorMsg(error.message || 'Falha ao validar codigo');
        scannedCodeRef.current = null; // Allow re-scan
      }
    } finally {
      if (isMountedRef.current) setIsValidating(false);
    }
  };

  const handleValidateManual = async () => {
    const code = codeInput.trim();
    if (!code) {
      setErrorMsg('Digite o codigo');
      return;
    }
    setIsValidating(true);
    setErrorMsg('');
    try {
      const result = await api.validateQR(code);
      setPreviewData(result);
      setFlowStep('preview');
      setCodeInput('');
    } catch (error: any) {
      setErrorMsg(error.message || 'Falha ao validar codigo');
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!previewData?.voucher_id) return;
    setIsConfirming(true);
    setErrorMsg('');
    try {
      const result = await api.confirmQR(previewData.voucher_id);
      setConfirmResult(result);
      setFlowStep('confirmed');
      await refreshUser();
    } catch (error: any) {
      setErrorMsg(error.message || 'Erro ao confirmar pagamento');
    } finally {
      setIsConfirming(false);
    }
  };

  const resetAll = useCallback(() => {
    setPreviewData(null);
    setConfirmResult(null);
    setFlowStep('scan');
    setCodeInput('');
    setErrorMsg('');
    scannedCodeRef.current = null;
  }, []);

  const formatPrice = (v: number) => `R$ ${(v || 0).toFixed(2).replace('.', ',')}`;

  const switchToScanner = () => {
    if (Platform.OS !== 'web') {
      setErrorMsg('Camera so disponivel na versao web');
      return;
    }
    setInputMode('scanner');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { stopScanner(); router.back(); }} style={styles.backButton} data-testid="validate-back">
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Validar QR Code</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* STEP 1: Scan or Enter Code */}
        {flowStep === 'scan' && (
          <>
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[styles.modeButton, inputMode === 'scanner' && styles.modeButtonActive]}
                onPress={switchToScanner}
                data-testid="mode-scanner"
              >
                <Ionicons name="camera" size={20} color={inputMode === 'scanner' ? '#FFFFFF' : '#64748B'} />
                <Text style={[styles.modeButtonText, inputMode === 'scanner' && styles.modeButtonTextActive]}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, inputMode === 'manual' && styles.modeButtonActive]}
                onPress={() => { stopScanner(); setInputMode('manual'); }}
                data-testid="mode-manual"
              >
                <Ionicons name="keypad" size={20} color={inputMode === 'manual' ? '#FFFFFF' : '#64748B'} />
                <Text style={[styles.modeButtonText, inputMode === 'manual' && styles.modeButtonTextActive]}>Digitar</Text>
              </TouchableOpacity>
            </View>

            {errorMsg ? (
              <View style={styles.errorBar}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {inputMode === 'scanner' && Platform.OS === 'web' ? (
              <View style={styles.scannerContainer}>
                <View style={styles.cameraContainer}>
                  <div id="qr-reader" style={{ width: '100%', borderRadius: 16, overflow: 'hidden' }} />
                  {!scannerReady && !isValidating && (
                    <View style={styles.scanningOverlay}>
                      <ActivityIndicator size="large" color="#10B981" />
                      <Text style={styles.scanningText}>Iniciando camera...</Text>
                    </View>
                  )}
                  {isValidating && (
                    <View style={styles.scanningOverlay}>
                      <ActivityIndicator size="large" color="#F59E0B" />
                      <Text style={styles.scanningText}>Validando codigo...</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.scanHintText}>Aponte a camera para o QR Code do cliente</Text>
              </View>
            ) : (
              <View style={styles.manualContainer}>
                <View style={styles.inputIcon}>
                  <Ionicons name="keypad" size={48} color="#3B82F6" />
                </View>
                <Text style={styles.inputTitle}>Digite o Codigo</Text>
                <Text style={styles.inputHint}>Codigo de backup (ITK-XXX) ou codigo QR completo</Text>
                <TextInput
                  style={styles.input}
                  value={codeInput}
                  onChangeText={setCodeInput}
                  placeholder="Ex: ITK-ABC"
                  placeholderTextColor="#64748B"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  data-testid="manual-code-input"
                />
                <TouchableOpacity
                  style={[styles.validateButton, !codeInput.trim() && styles.validateButtonDisabled]}
                  onPress={handleValidateManual}
                  disabled={isValidating || !codeInput.trim()}
                  data-testid="validate-code-btn"
                >
                  {isValidating ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="search" size={20} color="#FFFFFF" />
                      <Text style={styles.validateButtonText}>Buscar Voucher</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* STEP 2: Billing Summary / Preview */}
        {flowStep === 'preview' && previewData && (
          <View style={styles.previewContainer}>
            <View style={styles.previewIconWrap}>
              <Ionicons name="receipt" size={56} color="#F59E0B" />
            </View>
            <Text style={styles.previewTitle}>Resumo de Cobranca</Text>
            <Text style={styles.previewSubtitle}>Voucher encontrado - confirme o recebimento</Text>

            <View style={styles.previewCard}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Cliente:</Text>
                <Text style={styles.previewValue}>{previewData.customer_name}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Oferta:</Text>
                <Text style={styles.previewValue} numberOfLines={2}>{previewData.offer_title}</Text>
              </View>
              {previewData.backup_code ? (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Codigo:</Text>
                  <Text style={styles.previewValueCode}>{previewData.backup_code}</Text>
                </View>
              ) : null}

              <View style={styles.divider} />

              {previewData.original_price > 0 ? (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Valor Original:</Text>
                  <Text style={styles.previewValueStrike}>{formatPrice(previewData.original_price)}</Text>
                </View>
              ) : null}
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Valor com Desconto:</Text>
                <Text style={styles.previewValue}>{formatPrice(previewData.discounted_price)}</Text>
              </View>

              <View style={styles.creditsPreviewRow}>
                <Ionicons name="wallet" size={20} color="#3B82F6" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.creditsPreviewLabel}>Creditos iToke usados:</Text>
                  <Text style={styles.creditsPreviewHint}>Este valor ja caiu no saldo do lojista</Text>
                </View>
                <Text style={styles.creditsPreviewValue}>{formatPrice(previewData.credits_used)}</Text>
              </View>

              <View style={styles.cashCollectRow}>
                <Ionicons name="cash" size={28} color="#10B981" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cashCollectLabel}>COBRAR DO CLIENTE:</Text>
                  <Text style={styles.cashCollectHint}>Valor em dinheiro/cartao no balcao</Text>
                </View>
                <Text style={styles.cashCollectValue}>{formatPrice(previewData.amount_to_pay_cash)}</Text>
              </View>
            </View>

            {errorMsg ? (
              <View style={[styles.errorBar, { marginTop: 12 }]}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmPayment}
              disabled={isConfirming}
              data-testid="confirm-payment-btn"
            >
              {isConfirming ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-done-circle" size={22} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>Confirmar Recebimento e Finalizar</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelPreviewButton} onPress={resetAll} data-testid="cancel-preview-btn">
              <Text style={styles.cancelPreviewText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: Confirmation Done */}
        {flowStep === 'confirmed' && confirmResult && (
          <View style={styles.confirmedContainer}>
            <View style={styles.confirmedIconWrap}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </View>
            <Text style={styles.confirmedTitle}>Venda Finalizada!</Text>
            <Text style={styles.confirmedSubtitle}>Transacao registrada com sucesso</Text>

            <View style={styles.confirmedCard}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Cliente:</Text>
                <Text style={styles.previewValue}>{confirmResult.customer_name}</Text>
              </View>
              {confirmResult.backup_code ? (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Codigo:</Text>
                  <Text style={styles.previewValueCode}>{confirmResult.backup_code}</Text>
                </View>
              ) : null}
              <View style={styles.divider} />

              {(confirmResult.credits_used || 0) > 0 ? (
                <View style={styles.confirmedInfoRow}>
                  <Ionicons name="wallet" size={18} color="#3B82F6" />
                  <Text style={styles.confirmedInfoText}>
                    {formatPrice(confirmResult.credits_used)} recebidos via creditos iToke
                  </Text>
                </View>
              ) : null}
              <View style={styles.confirmedInfoRow}>
                <Ionicons name="cash" size={18} color="#10B981" />
                <Text style={styles.confirmedInfoText}>
                  {formatPrice(confirmResult.amount_to_pay_cash)} recebido em dinheiro/cartao
                </Text>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL DA VENDA:</Text>
                <Text style={styles.totalValue}>{formatPrice(confirmResult.discounted_price)}</Text>
              </View>

              <View style={styles.statusBadge}>
                <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                <Text style={styles.statusBadgeText}>Totalmente Pago</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.newScanButton} onPress={resetAll} data-testid="new-scan-btn">
              <Ionicons name="qr-code" size={20} color="#FFFFFF" />
              <Text style={styles.newScanButtonText}>Validar Outro Codigo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  backButton: { marginRight: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  content: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 40 },

  modeSelector: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 12, padding: 4, marginBottom: 16 },
  modeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 8 },
  modeButtonActive: { backgroundColor: '#3B82F6' },
  modeButtonText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  modeButtonTextActive: { color: '#FFFFFF' },

  errorBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#7F1D1D', padding: 12, borderRadius: 10, marginBottom: 16, gap: 8 },
  errorText: { fontSize: 14, color: '#FCA5A5', flex: 1 },

  scannerContainer: { minHeight: 380 },
  cameraContainer: { borderRadius: 16, overflow: 'hidden', minHeight: 300, position: 'relative', backgroundColor: '#000' },
  scanningOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  scanningText: { fontSize: 16, color: '#FFFFFF', marginTop: 16 },
  scanHintText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 12 },

  manualContainer: { alignItems: 'center', paddingVertical: 20 },
  inputIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  inputTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  inputHint: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 },
  input: { backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 16, fontSize: 18, color: '#FFFFFF', width: '100%', textAlign: 'center', borderWidth: 1, borderColor: '#334155', letterSpacing: 2 },
  validateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', paddingVertical: 16, borderRadius: 12, width: '100%', marginTop: 20, gap: 8 },
  validateButtonDisabled: { opacity: 0.5 },
  validateButtonText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

  previewContainer: { alignItems: 'center' },
  previewIconWrap: { marginBottom: 12 },
  previewTitle: { fontSize: 24, fontWeight: '800', color: '#F59E0B', marginBottom: 4, textAlign: 'center' },
  previewSubtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 20, textAlign: 'center' },
  previewCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 18, width: '100%', borderWidth: 1, borderColor: '#334155' },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 },
  previewLabel: { fontSize: 14, color: '#94A3B8' },
  previewValue: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', flexShrink: 1, textAlign: 'right' },
  previewValueStrike: { fontSize: 14, fontWeight: '500', color: '#64748B', textDecorationLine: 'line-through' },
  previewValueCode: { fontSize: 17, fontWeight: '800', color: '#F59E0B', letterSpacing: 2 },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 14 },

  creditsPreviewRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E3A5F', padding: 12, borderRadius: 10, marginTop: 8 },
  creditsPreviewLabel: { fontSize: 13, color: '#93C5FD', fontWeight: '600' },
  creditsPreviewHint: { fontSize: 11, color: '#60A5FA', marginTop: 2 },
  creditsPreviewValue: { fontSize: 18, fontWeight: '700', color: '#3B82F6' },

  cashCollectRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#064E3B', padding: 14, borderRadius: 12, marginTop: 12, borderWidth: 2, borderColor: '#10B981' },
  cashCollectLabel: { fontSize: 14, fontWeight: '800', color: '#A7F3D0' },
  cashCollectHint: { fontSize: 11, color: '#6EE7B7', marginTop: 2 },
  cashCollectValue: { fontSize: 24, fontWeight: '900', color: '#10B981' },

  confirmButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', paddingVertical: 18, borderRadius: 14, width: '100%', marginTop: 24, gap: 8 },
  confirmButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  cancelPreviewButton: { marginTop: 14, paddingVertical: 10 },
  cancelPreviewText: { fontSize: 15, color: '#94A3B8', fontWeight: '600' },

  confirmedContainer: { alignItems: 'center' },
  confirmedIconWrap: { marginBottom: 12 },
  confirmedTitle: { fontSize: 26, fontWeight: '800', color: '#10B981', marginBottom: 4 },
  confirmedSubtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 20 },
  confirmedCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 18, width: '100%', borderWidth: 1, borderColor: '#334155' },
  confirmedInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  confirmedInfoText: { fontSize: 14, color: '#CBD5E1', flex: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#334155' },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  totalValue: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#064E3B', paddingVertical: 8, borderRadius: 8, marginTop: 14 },
  statusBadgeText: { fontSize: 14, fontWeight: '700', color: '#10B981' },

  newScanButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', paddingVertical: 16, borderRadius: 12, width: '100%', marginTop: 24, gap: 8 },
  newScanButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});

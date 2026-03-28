import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/store/authStore';

export default function ValidateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refreshUser } = useAuthStore();
  const [codeInput, setCodeInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  const handleValidate = async () => {
    if (!codeInput.trim()) {
      Alert.alert('Erro', 'Digite o código QR');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await api.validateQR(codeInput.trim());
      setValidationResult(result);
      await refreshUser();
      setCodeInput('');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao validar QR Code');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Validar QR Code</Text>
      </View>

      <View style={styles.content}>
        {/* Manual Input */}
        <View style={styles.inputSection}>
          <View style={styles.scanIcon}>
            <Ionicons name="qr-code" size={64} color="#3B82F6" />
          </View>
          
          <Text style={styles.instructionText}>
            Digite o código mostrado pelo cliente
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Digite o código aqui"
              placeholderTextColor="#9CA3AF"
              value={codeInput}
              onChangeText={setCodeInput}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.validateButton,
              (!codeInput.trim() || isValidating) && styles.validateButtonDisabled,
            ]}
            onPress={handleValidate}
            disabled={!codeInput.trim() || isValidating}
          >
            {isValidating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.validateButtonText}>Validar Venda</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Validation Result */}
        {validationResult && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text style={styles.resultTitle}>Venda Validada!</Text>
            </View>

            <View style={styles.resultDetails}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Oferta:</Text>
                <Text style={styles.resultValue}>{validationResult.offer?.title}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Desconto:</Text>
                <Text style={styles.resultValue}>{validationResult.offer?.discount_value}%</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Preço Final:</Text>
                <Text style={styles.resultValueHighlight}>
                  R$ {validationResult.offer?.discounted_price?.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.deductionInfo}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text style={styles.deductionText}>
                1 token foi debitado do seu saldo
              </Text>
            </View>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Como funciona?</Text>
            <Text style={styles.infoText}>
              1. O cliente mostra o código QR{"\n"}
              2. Digite o código no campo acima{"\n"}
              3. Valide a venda e aplique o desconto{"\n"}
              4. 1 token (R$ 2,00) será debitado do seu saldo
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputSection: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scanIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
    color: '#1F2937',
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  validateButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  validateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#D1FAE5',
    padding: 24,
    borderRadius: 16,
    marginTop: 20,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#065F46',
    marginTop: 8,
  },
  resultDetails: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  resultLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  resultValueHighlight: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  deductionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deductionText: {
    fontSize: 13,
    color: '#047857',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D4ED8',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#3B82F6',
    lineHeight: 20,
  },
});

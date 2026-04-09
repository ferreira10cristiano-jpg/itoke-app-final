import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { api } from '../src/lib/api';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshUser } = useAuthStore();
  const params = useLocalSearchParams();
  const sessionId = params.session_id as string;

  const [status, setStatus] = useState<'checking' | 'success' | 'pending' | 'error'>('checking');
  const [tokensAdded, setTokensAdded] = useState(0);
  const [newBalance, setNewBalance] = useState(0);
  const [message, setMessage] = useState('Verificando pagamento...');

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus(0);
    } else {
      setStatus('error');
      setMessage('Sessao de pagamento nao encontrada');
    }
  }, [sessionId]);

  const pollPaymentStatus = async (attempts: number) => {
    const maxAttempts = 8;
    const pollInterval = 2500;

    if (attempts >= maxAttempts) {
      setStatus('pending');
      setMessage('O pagamento esta sendo processado. Verifique seu saldo em alguns minutos.');
      return;
    }

    try {
      const result = await api.getPaymentStatus(sessionId);

      if (result.payment_status === 'paid') {
        setStatus('success');
        setTokensAdded(result.tokens_added);
        setNewBalance(result.new_balance || 0);
        setMessage('Pagamento confirmado!');
        await refreshUser();
        return;
      } else if (result.status === 'expired') {
        setStatus('error');
        setMessage('Sessao de pagamento expirada. Tente novamente.');
        return;
      }

      setMessage(`Verificando pagamento... (${attempts + 1}/${maxAttempts})`);
      setTimeout(() => pollPaymentStatus(attempts + 1), pollInterval);
    } catch (error) {
      if (attempts < maxAttempts - 1) {
        setTimeout(() => pollPaymentStatus(attempts + 1), pollInterval);
      } else {
        setStatus('error');
        setMessage('Erro ao verificar pagamento. Verifique seu saldo.');
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} data-testid="payment-success-screen">
      <View style={styles.content}>
        {status === 'checking' && (
          <>
            <ActivityIndicator size="large" color="#10B981" style={styles.icon} />
            <Text style={styles.title}>Processando...</Text>
            <Text style={styles.subtitle}>{message}</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={styles.successIcon} data-testid="payment-success-icon">
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </View>
            <Text style={styles.title}>Pagamento Confirmado!</Text>
            <Text style={styles.subtitle}>Seus tokens foram adicionados</Text>

            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tokens adicionados</Text>
                <Text style={styles.detailValue} data-testid="tokens-added">+{tokensAdded}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Novo saldo</Text>
                <Text style={styles.detailValueGreen} data-testid="new-balance">{newBalance} tokens</Text>
              </View>
            </View>
          </>
        )}

        {status === 'pending' && (
          <>
            <View style={styles.pendingIcon}>
              <Ionicons name="time" size={80} color="#F59E0B" />
            </View>
            <Text style={styles.title}>Processando Pagamento</Text>
            <Text style={styles.subtitle}>{message}</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={styles.errorIcon}>
              <Ionicons name="close-circle" size={80} color="#EF4444" />
            </View>
            <Text style={styles.title}>Ops!</Text>
            <Text style={styles.subtitle}>{message}</Text>
          </>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(tabs)')}
          data-testid="go-home-btn"
        >
          <Ionicons name="home" size={20} color="#0F172A" />
          <Text style={styles.buttonText}>Voltar ao Inicio</Text>
        </TouchableOpacity>

        {(status === 'error' || status === 'pending') && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace('/buy-tokens')}
            data-testid="try-again-btn"
          >
            <Text style={styles.secondaryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  icon: {
    marginBottom: 24,
  },
  successIcon: {
    marginBottom: 24,
  },
  pendingIcon: {
    marginBottom: 24,
  },
  errorIcon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
  },
  detailsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: '#94A3B8',
  },
  detailValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailValueGreen: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#94A3B8',
  },
});

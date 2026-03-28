import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';

export default function CallbackPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { login } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'input' | 'processing' | 'error'>('loading');
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Tenta obter session_id do URL de várias formas
    let sid: string | null = null;

    // 1. Tenta dos params do expo-router
    if (params.session_id) {
      sid = params.session_id as string;
    }

    // 2. Na web, tenta do hash da URL
    if (!sid && Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      
      console.log('URL hash:', hash);
      console.log('URL search:', search);
      
      if (hash && hash.includes('session_id=')) {
        const hashParams = new URLSearchParams(hash.substring(1));
        sid = hashParams.get('session_id');
      }
      
      if (!sid && search && search.includes('session_id=')) {
        const searchParams = new URLSearchParams(search);
        sid = searchParams.get('session_id');
      }
    }

    console.log('Found session_id:', sid);

    if (sid) {
      handleLogin(sid);
    } else {
      // Não encontrou session_id, mostra input manual
      setStatus('input');
    }
  }, [params]);

  const handleLogin = async (sid: string) => {
    setStatus('processing');
    setError(null);
    
    try {
      console.log('Processing login with session_id:', sid);
      const user = await login(sid);
      console.log('Login successful:', user);
      
      // Redirect based on role
      setTimeout(() => {
        switch (user.role) {
          case 'establishment':
            router.replace('/establishment/dashboard');
            break;
          case 'representative':
            router.replace('/representative/dashboard');
            break;
          case 'admin':
            router.replace('/admin/comissoes');
            break;
          default:
            router.replace('/(tabs)');
        }
      }, 500);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Código inválido ou expirado');
      setStatus('error');
    }
  };

  const handleSubmit = () => {
    const trimmedId = sessionId.trim();
    if (!trimmedId) {
      Alert.alert('Erro', 'Cole o código de sessão');
      return;
    }
    handleLogin(trimmedId);
  };

  const handleRetry = () => {
    setError(null);
    setSessionId('');
    setStatus('input');
  };

  const handleBack = () => {
    router.replace('/');
  };

  // Tela de loading/processamento
  if (status === 'loading' || status === 'processing') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>
          {status === 'loading' ? 'Verificando...' : 'Entrando...'}
        </Text>
      </View>
    );
  }

  // Tela de erro
  if (status === 'error') {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={[styles.iconContainer, styles.errorIcon]}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
          </View>
          
          <Text style={styles.title}>Erro no Login</Text>
          <Text style={styles.errorMessage}>{error}</Text>

          <TouchableOpacity style={styles.button} onPress={handleRetry}>
            <Text style={styles.buttonText}>Tentar Novamente</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color="#94A3B8" />
            <Text style={styles.backButtonText}>Voltar ao início</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Tela de input manual
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="key" size={48} color="#10B981" />
        </View>
        
        <Text style={styles.title}>Completar Login</Text>
        <Text style={styles.subtitle}>
          Após fazer login com Google, copie o código que apareceu e cole aqui:
        </Text>

        <TextInput
          style={styles.input}
          value={sessionId}
          onChangeText={setSessionId}
          placeholder="Cole o código aqui"
          placeholderTextColor="#64748B"
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Entrar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color="#94A3B8" />
          <Text style={styles.backButtonText}>Voltar ao início</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94A3B8',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#064E3B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorIcon: {
    backgroundColor: '#7F1D1D',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorMessage: {
    fontSize: 14,
    color: '#FCA5A5',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 14,
    width: '100%',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  backButtonText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../src/store/authStore';
import { api } from '../src/lib/api';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role } = useLocalSearchParams<{ role: string }>();
  const { setUser, setSessionToken } = useAuthStore();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingReferral, setPendingReferral] = useState<string | null>(null);

  const isClient = role === 'client';
  const accentColor = isClient ? '#10B981' : '#3B82F6';

  // Load pending referral code from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem('pending_referral_code').then((code) => {
      if (code) {
        setPendingReferral(code);
        console.log('Pending referral code found:', code);
      }
    });
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const callbackUrl = `${backendUrl}/callback`;
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(callbackUrl)}`;
      await WebBrowser.openBrowserAsync(authUrl);
      router.push('/callback');
    } catch (err: any) {
      console.error('Login error:', err);
      Alert.alert('Erro', 'Não foi possível abrir a página de login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !name.trim()) {
      Alert.alert('Atenção', 'Preencha e-mail e nome para continuar');
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    try {
      const userRole = role || 'client';
      const result = await api.emailLogin(email.trim(), name.trim(), userRole, pendingReferral || undefined);

      // Clear the pending referral code after successful login
      if (pendingReferral) {
        await AsyncStorage.removeItem('pending_referral_code');
        console.log('Referral code applied and cleared:', pendingReferral);
      }

      api.setSessionToken(result.session_token);
      setSessionToken(result.session_token);
      setUser(result.user);

      if (userRole === 'establishment') {
        router.replace('/establishment/dashboard');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.error('Email login error:', err);
      Alert.alert('Erro', err.message || 'Falha ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { borderColor: accentColor }]}>
            <Ionicons
              name={isClient ? 'person' : 'business'}
              size={40}
              color={accentColor}
            />
          </View>
          <Text style={styles.title}>
            {isClient ? 'Entrar como Cliente' : 'Entrar como Estabelecimento'}
          </Text>
          <Text style={styles.subtitle}>
            {isClient
              ? 'Descubra ofertas e economize com iToke'
              : 'Atraia clientes e venda mais com iToke'}
          </Text>
        </View>

        {/* Google Login */}
        <TouchableOpacity
          style={[styles.googleButton, { backgroundColor: accentColor }]}
          onPress={handleGoogleLogin}
          disabled={isLoading}
        >
          {isLoading && !showEmailForm ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <>
              <Ionicons name="logo-google" size={22} color="#0F172A" />
              <Text style={styles.googleButtonText}>Entrar com Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email Login */}
        {!showEmailForm ? (
          <TouchableOpacity
            style={styles.emailButton}
            onPress={() => setShowEmailForm(true)}
          >
            <Ionicons name="mail" size={22} color="#FFFFFF" />
            <Text style={styles.emailButtonText}>Entrar com E-mail</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.emailForm}>
            <Text style={styles.inputLabel}>Nome</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="Seu nome completo"
                placeholderTextColor="#475569"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <Text style={styles.inputLabel}>E-mail</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor="#475569"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {pendingReferral && (
              <View style={styles.referralBanner}>
                <Ionicons name="gift" size={18} color="#10B981" />
                <Text style={styles.referralBannerText}>
                  Código de indicação: {pendingReferral}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: accentColor }]}
              onPress={handleEmailLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <Text style={styles.submitButtonText}>Entrar</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.testModeText}>
              Modo de teste: login sem verificação de senha
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#64748B',
    fontSize: 14,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
    gap: 10,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emailForm: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 6,
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#FFFFFF',
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 20,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  testModeText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  referralBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  referralBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
});

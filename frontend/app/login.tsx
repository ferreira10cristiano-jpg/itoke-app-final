import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../src/store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role } = useLocalSearchParams<{ role: string }>();
  const { login } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [pendingReferral, setPendingReferral] = useState<string | null>(null);

  const isClient = role === 'client';
  const accentColor = isClient ? '#10B981' : '#3B82F6';

  useEffect(() => {
    AsyncStorage.getItem('pending_referral_code').then((code) => {
      if (code) setPendingReferral(code);
    });
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.setItem('intended_role', role || 'client');

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const redirectUrl = window.location.origin + '/callback';
        const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
        window.location.href = authUrl;
      } else {
        // Native: use openAuthSessionAsync with deep link redirect
        const redirectUrl = Linking.createURL('callback');
        const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
        
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          // Extract session_id from the redirect URL
          const url = result.url;
          let sessionId: string | null = null;
          
          // Check hash fragment
          const hashIndex = url.indexOf('#');
          if (hashIndex !== -1) {
            const hashStr = url.substring(hashIndex + 1);
            const hashParams = new URLSearchParams(hashStr);
            sessionId = hashParams.get('session_id');
          }
          
          // Check query params
          if (!sessionId) {
            const qIndex = url.indexOf('?');
            if (qIndex !== -1) {
              const queryStr = url.substring(qIndex + 1);
              const queryParams = new URLSearchParams(queryStr);
              sessionId = queryParams.get('session_id');
            }
          }
          
          if (sessionId) {
            // Login directly without going to callback page
            const intendedRole = await AsyncStorage.getItem('intended_role') || 'client';
            await AsyncStorage.removeItem('intended_role');
            
            if (pendingReferral) {
              await AsyncStorage.removeItem('pending_referral_code');
            }
            
            const user = await login(sessionId, intendedRole);
            
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
            return;
          }
        }
        
        // Fallback: if we couldn't get session_id, go to manual callback page
        router.push('/callback');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      Alert.alert('Erro', 'Nao foi possivel abrir a pagina de login. Tente novamente.');
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

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

        <TouchableOpacity
          style={[styles.googleButton, { backgroundColor: accentColor }]}
          onPress={handleGoogleLogin}
          disabled={isLoading}
          data-testid="google-login-btn"
        >
          {isLoading ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <>
              <Ionicons name="logo-google" size={22} color="#0F172A" />
              <Text style={styles.googleButtonText}>Entrar com Google</Text>
            </>
          )}
        </TouchableOpacity>
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
});

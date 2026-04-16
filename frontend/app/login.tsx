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
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role } = useLocalSearchParams<{ role: string }>();

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
      // Store intended role for callback to use
      await AsyncStorage.setItem('intended_role', role || 'client');
      
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      const redirectUrl = Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin + '/callback'
        : `${process.env.EXPO_PUBLIC_BACKEND_URL}/callback`;
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = authUrl;
      } else {
        await WebBrowser.openBrowserAsync(authUrl);
        router.push('/callback');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      Alert.alert('Erro', 'Não foi possível abrir a página de login');
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

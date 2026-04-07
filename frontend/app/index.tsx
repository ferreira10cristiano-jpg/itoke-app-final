import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { api } from '../src/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const params = useLocalSearchParams<{ ref?: string }>();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showRepModal, setShowRepModal] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [repKey, setRepKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Capture referral code from URL params (?ref=CODE)
  useEffect(() => {
    if (params.ref) {
      AsyncStorage.setItem('pending_referral_code', params.ref).then(() => {
        console.log('Referral code captured:', params.ref);
      });
    }
  }, [params.ref]);

  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'establishment') {
        router.replace('/establishment/dashboard');
      } else if (user.role === 'admin') {
        router.replace('/admin/dashboard');
      } else if (user.role === 'representative') {
        router.replace('/representative/dashboard');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, user]);

  const handleSelectProfile = (role: 'client' | 'establishment') => {
    router.push({ pathname: '/login', params: { role } });
  };

  const handleAdminAccess = async () => {
    if (adminKey.trim() !== 'admin123') {
      Alert.alert('Erro', 'Chave de acesso inválida');
      return;
    }
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      const result = await api.emailLogin('admin@itoke.master', 'Admin iToke', 'admin');
      api.setSessionToken(result.session_token);
      const { setUser, setSessionToken } = useAuthStore.getState();
      setSessionToken(result.session_token);
      setUser(result.user);
      setShowAdminModal(false);
      setAdminKey('');
      router.replace('/admin/dashboard');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha no acesso');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepAccess = async () => {
    if (repKey.trim() !== 'rep123') {
      Alert.alert('Erro', 'Chave de acesso inválida');
      return;
    }
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      const result = await api.emailLogin('rep@itoke.master', 'Representante iToke', 'representative');
      api.setSessionToken(result.session_token);
      const { setUser, setSessionToken } = useAuthStore.getState();
      setSessionToken(result.session_token);
      setUser(result.user);
      setShowRepModal(false);
      setRepKey('');
      router.replace('/representative/dashboard');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha no acesso');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Logo - Long press for Admin */}
      <View style={styles.logoContainer}>
        <Pressable
          onLongPress={() => setShowAdminModal(true)}
          delayLongPress={3000}
          style={styles.logoCircle}
        >
          <Ionicons name="ticket" size={50} color="#10B981" />
        </Pressable>
        <Text style={styles.logoText}>iToke</Text>
        {/* Tagline - Long press for Representative */}
        <Pressable onLongPress={() => setShowRepModal(true)} delayLongPress={3000}>
          <Text style={styles.tagline}>Ofertas que saem de Graça</Text>
        </Pressable>
      </View>

      {/* Profile Selection */}
      <Text style={styles.selectLabel}>Como deseja usar o iToke?</Text>

      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => handleSelectProfile('client')}
        activeOpacity={0.8}
      >
        <View style={[styles.profileIcon, { backgroundColor: '#10B98120' }]}>
          <Ionicons name="person" size={32} color="#10B981" />
        </View>
        <View style={styles.profileContent}>
          <Text style={styles.profileTitle}>Sou Cliente</Text>
          <Text style={styles.profileDesc}>
            Encontre ofertas incríveis, gere QR Codes e economize!
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#64748B" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => handleSelectProfile('establishment')}
        activeOpacity={0.8}
      >
        <View style={[styles.profileIcon, { backgroundColor: '#3B82F620' }]}>
          <Ionicons name="business" size={32} color="#3B82F6" />
        </View>
        <View style={styles.profileContent}>
          <Text style={[styles.profileTitle, { color: '#3B82F6' }]}>Sou Estabelecimento</Text>
          <Text style={styles.profileDesc}>
            Crie ofertas, atraia clientes e venda mais!
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#64748B" />
      </TouchableOpacity>

      {/* Terms */}
      <Text style={styles.termsText}>
        Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade
      </Text>

      {/* Admin Access Modal */}
      <Modal visible={showAdminModal} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Ionicons name="shield-checkmark" size={32} color="#F59E0B" />
              <Text style={styles.modalTitle}>Acesso Admin iToke</Text>
            </View>
            <Text style={styles.modalSubtitle}>Digite a chave de acesso master</Text>
            <View style={styles.modalInputContainer}>
              <Ionicons name="key" size={20} color="#64748B" />
              <TextInput
                style={styles.modalInput}
                placeholder="Chave de acesso"
                placeholderTextColor="#475569"
                value={adminKey}
                onChangeText={setAdminKey}
                secureTextEntry
                autoFocus
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowAdminModal(false); setAdminKey(''); }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleAdminAccess}>
                <Text style={styles.modalConfirmText}>Entrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Representative Access Modal */}
      <Modal visible={showRepModal} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Ionicons name="people" size={32} color="#8B5CF6" />
              <Text style={styles.modalTitle}>Acesso Representante</Text>
            </View>
            <Text style={styles.modalSubtitle}>Digite a chave de acesso</Text>
            <View style={styles.modalInputContainer}>
              <Ionicons name="key" size={20} color="#64748B" />
              <TextInput
                style={styles.modalInput}
                placeholder="Chave de acesso"
                placeholderTextColor="#475569"
                value={repKey}
                onChangeText={setRepKey}
                secureTextEntry
                autoFocus
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowRepModal(false); setRepKey(''); }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: '#8B5CF6' }]} onPress={handleRepAccess}>
                <Text style={styles.modalConfirmText}>Entrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 30,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#10B981',
  },
  logoText: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  selectLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  profileIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileContent: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  profileDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  termsText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
    marginBottom: 20,
  },
  modalInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#334155',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },
  modalConfirmBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
});

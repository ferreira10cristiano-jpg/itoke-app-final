import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/lib/api';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Category } from '../../src/types';

// CNPJ Validation Algorithm
const validateCNPJ = (cnpj: string): boolean => {
  // Remove non-digits
  const cleaned = cnpj.replace(/\D/g, '');
  
  // Must be 14 digits
  if (cleaned.length !== 14) return false;
  
  // Check for all same digits
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validate check digits
  const calcDigit = (str: string, weights: number[]): number => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += parseInt(str[i]) * weights[i];
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  const digit1 = calcDigit(cleaned, weights1);
  const digit2 = calcDigit(cleaned, weights2);
  
  return cleaned[12] === String(digit1) && cleaned[13] === String(digit2);
};

// Format CNPJ as user types
const formatCNPJ = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
  if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
};

export default function EstablishmentRegister() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refreshUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cnpjError, setCnpjError] = useState('');
  const [formData, setFormData] = useState({
    business_name: '',
    cnpj: '',
    cep: '',
    street: '',
    neighborhood: '',
    city: '',
    state: '',
    number: '',
    complement: '',
    category: '',
    history: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepValid, setCepValid] = useState(false);
  const [cepError, setCepError] = useState('');

  useEffect(() => {
    loadCategories();
    getLocation();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await api.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setFormData((prev) => ({
          ...prev,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }));
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleCNPJChange = (text: string) => {
    const formatted = formatCNPJ(text);
    setFormData({ ...formData, cnpj: formatted });
    
    // Validate when complete
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length === 14) {
      if (!validateCNPJ(cleaned)) {
        setCnpjError('CNPJ inválido');
      } else {
        setCnpjError('');
      }
    } else {
      setCnpjError('');
    }
  };

  const formatCEP = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
  };

  const handleCEPChange = async (text: string) => {
    const formatted = formatCEP(text);
    const cleaned = text.replace(/\D/g, '');
    setFormData(p => ({ ...p, cep: formatted, street: '', neighborhood: '', city: '', state: '' }));
    setCepValid(false);
    setCepError('');

    if (cleaned.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
        const data = await res.json();
        if (data.erro) {
          setCepError('CEP não encontrado');
          setCepValid(false);
        } else {
          setFormData(p => ({
            ...p,
            cep: formatted,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
          }));
          setCepValid(true);
          setCepError('');
        }
      } catch {
        setCepError('Erro ao consultar CEP');
        setCepValid(false);
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.business_name.trim()) {
      Alert.alert('Erro', 'Nome do estabelecimento é obrigatório');
      return;
    }
    
    // Validate CNPJ
    const cleanedCNPJ = formData.cnpj.replace(/\D/g, '');
    if (cleanedCNPJ.length > 0 && cleanedCNPJ.length !== 14) {
      Alert.alert('Erro', 'CNPJ incompleto');
      return;
    }
    if (cleanedCNPJ.length === 14 && !validateCNPJ(cleanedCNPJ)) {
      Alert.alert('Erro', 'CNPJ inválido');
      return;
    }
    
    if (!formData.cep.trim() || !cepValid) {
      Alert.alert('Erro', 'CEP válido é obrigatório');
      return;
    }
    if (!formData.category) {
      Alert.alert('Erro', 'Selecione uma categoria');
      return;
    }

    setIsLoading(true);
    try {
      await api.createEstablishment({
        business_name: formData.business_name,
        cnpj: cleanedCNPJ || undefined,
        address: `${formData.street}, ${formData.number}${formData.complement ? ` - ${formData.complement}` : ''}, ${formData.neighborhood}, ${formData.city}/${formData.state}`,
        category: formData.category,
        history: formData.history || undefined,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
        structured_address: {
          cep: formData.cep.replace(/\D/g, ''),
          city: formData.city,
          neighborhood: formData.neighborhood,
          street: formData.street,
          number: formData.number,
          complement: formData.complement,
        },
        city: formData.city,
        neighborhood: formData.neighborhood,
      });

      await refreshUser();
      Alert.alert('Sucesso', 'Estabelecimento cadastrado com sucesso!', [
        { text: 'OK', onPress: () => router.replace('/establishment/dashboard') },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao cadastrar estabelecimento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!formData.business_name.trim()) {
      Alert.alert('Atenção', 'Informe pelo menos o nome do estabelecimento para continuar.');
      return;
    }
    if (!formData.category) {
      Alert.alert('Atenção', 'Selecione uma categoria para continuar.');
      return;
    }
    setIsLoading(true);
    try {
      await api.createEstablishment({
        business_name: formData.business_name,
        category: formData.category,
        address: '',
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
      });
      await refreshUser();
      Alert.alert('Cadastro rápido realizado!', 'Complete seu perfil depois para publicar ofertas.', [
        { text: 'OK', onPress: () => router.replace('/establishment/dashboard') },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao cadastrar');
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
        style={[styles.scrollView, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Cadastrar Estabelecimento</Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <Text style={styles.infoText}>
            Cadastre seu negócio para criar ofertas e atrair mais clientes.
            Sua primeira oferta é grátis!
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Nome do Estabelecimento *"
            placeholder="Ex: Restaurante Sabor & Arte"
            value={formData.business_name}
            onChangeText={(text) => setFormData({ ...formData, business_name: text })}
            leftIcon="business"
          />

          {/* CNPJ Field */}
          <Text style={styles.label}>CNPJ</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="document-text" size={20} color="#64748B" style={styles.inputIcon} />
            <View style={styles.inputWrapper}>
              <Input
                placeholder="00.000.000/0000-00"
                value={formData.cnpj}
                onChangeText={handleCNPJChange}
                keyboardType="numeric"
                maxLength={18}
              />
            </View>
          </View>
          {cnpjError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{cnpjError}</Text>
            </View>
          ) : formData.cnpj.replace(/\D/g, '').length === 14 ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.successText}>CNPJ válido</Text>
            </View>
          ) : null}

          {/* CEP + Endereço Estruturado */}
          <Text style={styles.label}>CEP *</Text>
          <View style={styles.cepRow}>
            <View style={styles.cepInputWrap}>
              <Input
                placeholder="00000-000"
                value={formData.cep}
                onChangeText={handleCEPChange}
                keyboardType="numeric"
                maxLength={9}
                leftIcon="location"
              />
            </View>
            {cepLoading && <ActivityIndicator size="small" color="#10B981" style={{ marginLeft: 8 }} />}
          </View>
          {cepError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{cepError}</Text>
            </View>
          ) : cepValid ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.successText}>CEP válido</Text>
            </View>
          ) : null}

          {cepValid && (
            <>
              <Text style={styles.label}>Rua</Text>
              <Input
                placeholder="Rua"
                value={formData.street}
                onChangeText={() => {}}
                editable={false}
                style={{ opacity: 0.6 }}
              />

              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Número *</Text>
                  <Input
                    placeholder="Nº"
                    value={formData.number}
                    onChangeText={(text) => setFormData({ ...formData, number: text })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.label}>Complemento</Text>
                  <Input
                    placeholder="Apto, Sala, Bloco..."
                    value={formData.complement}
                    onChangeText={(text) => setFormData({ ...formData, complement: text })}
                  />
                </View>
              </View>

              <Text style={styles.label}>Bairro</Text>
              <Input
                placeholder="Bairro"
                value={formData.neighborhood}
                onChangeText={() => {}}
                editable={false}
                style={{ opacity: 0.6 }}
              />

              <Text style={styles.label}>Cidade / UF</Text>
              <Input
                placeholder="Cidade"
                value={`${formData.city}${formData.state ? ` / ${formData.state}` : ''}`}
                onChangeText={() => {}}
                editable={false}
                style={{ opacity: 0.6 }}
              />
            </>
          )}

          {/* Minha História Field */}
          <Text style={styles.label}>Minha História</Text>
          <View style={styles.historyContainer}>
            <Ionicons name="book" size={20} color="#64748B" style={styles.historyIcon} />
            <Input
              placeholder="Conte a história do seu estabelecimento, especialidades, diferenciais..."
              value={formData.history}
              onChangeText={(text) => setFormData({ ...formData, history: text })}
              multiline
              numberOfLines={4}
              style={styles.historyInput}
            />
          </View>

          <Text style={styles.label}>Categoria *</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  formData.category === cat.id && styles.categoryChipSelected,
                ]}
                onPress={() => setFormData({ ...formData, category: cat.id })}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={18}
                  color={formData.category === cat.id ? '#FFFFFF' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.categoryText,
                    formData.category === cat.id && styles.categoryTextSelected,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {formData.latitude && formData.longitude && (
            <View style={styles.locationBadge}>
              <Ionicons name="location" size={16} color="#10B981" />
              <Text style={styles.locationText}>Localização detectada automaticamente</Text>
            </View>
          )}

          <Button
            title={isLoading ? 'Cadastrando...' : 'Cadastrar Estabelecimento'}
            onPress={handleSubmit}
            disabled={isLoading || !cepValid}
            loading={isLoading}
            size="large"
            style={{ marginTop: 24, opacity: (!cepValid) ? 0.5 : 1 }}
          />

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isLoading}
          >
            <Ionicons name="time-outline" size={18} color="#94A3B8" />
            <Text style={styles.skipButtonText}>Preencher depois</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
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
    color: '#FFF',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#1E3A5F',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#93C5FD',
    lineHeight: 20,
  },
  form: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 8,
    marginTop: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inputIcon: {
    marginRight: 8,
    marginTop: 14,
  },
  inputWrapper: {
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  successText: {
    fontSize: 12,
    color: '#10B981',
  },
  historyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  historyIcon: {
    marginRight: 8,
    marginTop: 14,
  },
  historyInput: {
    flex: 1,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryChipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: '#10B981',
  },
  cepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cepInputWrap: {
    flex: 1,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
});

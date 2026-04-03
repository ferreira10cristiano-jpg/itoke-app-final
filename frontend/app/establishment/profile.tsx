import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/lib/api';

const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (typeof window !== 'undefined') {
    window.alert(`${title}\n${message}`);
    onOk?.();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
};

interface Category {
  id: string;
  name: string;
  icon: string;
}

export default function EstablishmentProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refreshUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [form, setForm] = useState({
    business_name: '',
    cnpj: '',
    cep: '',
    street: '',
    neighborhood: '',
    city: '',
    state: '',
    number: '',
    complement: '',
    history: '',
    instagram: '',
    category: '',
  });

  const [cepLoading, setCepLoading] = useState(false);
  const [cepValid, setCepValid] = useState(false);
  const [cepError, setCepError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [est, cats] = await Promise.all([
        api.getMyEstablishment(),
        api.getCategories(),
      ]);
      setCategories(cats);

      const sa = (est as any)?.structured_address || {};
      setForm({
        business_name: est.business_name || '',
        cnpj: (est as any)?.cnpj || '',
        cep: sa.cep ? formatCEP(sa.cep) : '',
        street: sa.street || '',
        neighborhood: sa.neighborhood || (est as any)?.neighborhood || '',
        city: sa.city || (est as any)?.city || '',
        state: sa.state || '',
        number: sa.number || '',
        complement: sa.complement || '',
        history: (est as any)?.history || '',
        instagram: (est as any)?.instagram || '',
        category: est.category || '',
      });
      setCepValid(!!(sa.cep));
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCEP = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
  };

  const handleCEPChange = async (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = formatCEP(text);
    setForm(p => ({ ...p, cep: formatted, street: '', neighborhood: '', city: '', state: '' }));
    setCepValid(false);
    setCepError('');

    if (cleaned.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
        const data = await res.json();
        if (data.erro) {
          setCepError('CEP não encontrado');
        } else {
          setForm(p => ({
            ...p,
            cep: formatted,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
          }));
          setCepValid(true);
        }
      } catch {
        setCepError('Erro ao consultar CEP');
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!form.business_name.trim()) {
      showAlert('Atenção', 'Nome do estabelecimento é obrigatório.');
      return;
    }
    const cleanedCNPJ = form.cnpj.replace(/\D/g, '');
    if (cleanedCNPJ.length !== 14) {
      showAlert('Atenção', 'CNPJ é obrigatório (14 dígitos).');
      return;
    }
    if (!form.cep.trim() || !cepValid) {
      showAlert('Atenção', 'CEP válido é obrigatório.');
      return;
    }
    setIsSaving(true);
    try {
      await api.updateEstablishment({
        business_name: form.business_name,
        cnpj: cleanedCNPJ,
        history: form.history,
        instagram: form.instagram,
        category: form.category,
        ...(cepValid && {
          structured_address: {
            cep: form.cep.replace(/\D/g, ''),
            city: form.city,
            neighborhood: form.neighborhood,
            street: form.street,
            number: form.number,
            complement: form.complement,
          },
        }),
      });
      await refreshUser();
      showAlert('Sucesso!', 'Perfil atualizado com sucesso.', () => {
        if (typeof window !== 'undefined') {
          window.location.href = '/establishment/dashboard';
        } else {
          router.replace('/establishment/dashboard');
        }
      });
    } catch (error: any) {
      showAlert('Erro', error.message || 'Falha ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[s.container, s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Meu Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Nome */}
        <Text style={s.label}>Nome do Estabelecimento *</Text>
        <TextInput
          style={s.input}
          placeholder="Ex: Restaurante Sabor & Arte"
          placeholderTextColor="#64748B"
          value={form.business_name}
          onChangeText={v => setForm(p => ({ ...p, business_name: v }))}
        />

        {/* CNPJ */}
        <Text style={s.label}>CNPJ *</Text>
        <TextInput
          style={s.input}
          placeholder="00.000.000/0000-00"
          placeholderTextColor="#64748B"
          value={form.cnpj}
          onChangeText={v => {
            // Format CNPJ
            const digits = v.replace(/\D/g, '').slice(0, 14);
            let formatted = digits;
            if (digits.length > 2) formatted = digits.slice(0,2) + '.' + digits.slice(2);
            if (digits.length > 5) formatted = formatted.slice(0,6) + '.' + digits.slice(5);
            if (digits.length > 8) formatted = formatted.slice(0,10) + '/' + digits.slice(8);
            if (digits.length > 12) formatted = formatted.slice(0,15) + '-' + digits.slice(12);
            setForm(p => ({ ...p, cnpj: formatted }));
          }}
          keyboardType="numeric"
          maxLength={18}
        />

        {/* CEP */}
        <Text style={s.label}>CEP *</Text>
        <View style={s.cepRow}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            placeholder="00000-000"
            placeholderTextColor="#64748B"
            value={form.cep}
            onChangeText={handleCEPChange}
            keyboardType="numeric"
            maxLength={9}
          />
          {cepLoading && <ActivityIndicator size="small" color="#10B981" style={{ marginLeft: 10 }} />}
        </View>
        {cepError ? (
          <Text style={s.errorText}>{cepError}</Text>
        ) : cepValid ? (
          <Text style={s.successText}>CEP válido</Text>
        ) : null}

        {cepValid && (
          <>
            <Text style={s.label}>Rua</Text>
            <TextInput style={[s.input, s.readOnly]} value={form.street} editable={false} />

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Número</Text>
                <TextInput
                  style={s.input}
                  placeholder="Nº"
                  placeholderTextColor="#64748B"
                  value={form.number}
                  onChangeText={v => setForm(p => ({ ...p, number: v }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1.5 }}>
                <Text style={s.label}>Complemento</Text>
                <TextInput
                  style={s.input}
                  placeholder="Apto, Sala..."
                  placeholderTextColor="#64748B"
                  value={form.complement}
                  onChangeText={v => setForm(p => ({ ...p, complement: v }))}
                />
              </View>
            </View>

            <Text style={s.label}>Bairro</Text>
            <TextInput style={[s.input, s.readOnly]} value={form.neighborhood} editable={false} />

            <Text style={s.label}>Cidade / UF</Text>
            <TextInput
              style={[s.input, s.readOnly]}
              value={`${form.city}${form.state ? ` / ${form.state}` : ''}`}
              editable={false}
            />
          </>
        )}

        {/* Categoria */}
        <Text style={s.label}>Categoria</Text>
        <View style={s.catGrid}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[s.catChip, form.category === cat.id && s.catChipActive]}
              onPress={() => setForm(p => ({ ...p, category: cat.id }))}
            >
              <Ionicons
                name={(cat.icon || 'grid-outline') as any}
                size={16}
                color={form.category === cat.id ? '#10B981' : '#64748B'}
              />
              <Text style={[s.catText, form.category === cat.id && s.catTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Minha História */}
        <Text style={s.label}>Minha História</Text>
        <TextInput
          style={[s.input, s.textArea]}
          placeholder="Conte a história do seu estabelecimento..."
          placeholderTextColor="#64748B"
          value={form.history}
          onChangeText={v => setForm(p => ({ ...p, history: v }))}
          multiline
          numberOfLines={4}
        />

        {/* Instagram */}
        <Text style={s.label}>Instagram</Text>
        <TextInput
          style={s.input}
          placeholder="@seuinstagram"
          placeholderTextColor="#64748B"
          value={form.instagram}
          onChangeText={v => setForm(p => ({ ...p, instagram: v }))}
        />

        {/* Salvar */}
        <TouchableOpacity
          style={[s.saveBtn, isSaving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#0F172A" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#0F172A" />
              <Text style={s.saveBtnText}>Salvar Alterações</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  label: { fontSize: 13, fontWeight: '600', color: '#CBD5E1', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#1E293B', color: '#FFF', borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  readOnly: { opacity: 0.6 },
  textArea: { minHeight: 90, textAlignVertical: 'top' },

  cepRow: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 4 },
  successText: { fontSize: 12, color: '#10B981', marginTop: 4 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  catChipActive: { borderColor: '#10B981', backgroundColor: '#10B98115' },
  catText: { fontSize: 13, color: '#94A3B8' },
  catTextActive: { color: '#10B981', fontWeight: '600' },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12, marginTop: 28 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
});

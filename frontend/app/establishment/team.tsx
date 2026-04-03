import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
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

const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  if (typeof window !== 'undefined') {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', style: 'destructive', onPress: onConfirm },
    ]);
  }
};

export default function TeamPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const [establishment, setEstablishment] = useState<any>(null);
  const [validators, setValidators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const est = await api.getMyEstablishment();
      setEstablishment(est);
      const vals = await api.getMyValidators();
      setValidators(vals);
    } catch (e: any) {
      showAlert('Erro', e.message || 'Falha ao carregar');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const getValidatorLink = () => {
    if (!establishment) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/v/${establishment.establishment_id}`;
  };

  const copyLink = () => {
    const link = getValidatorLink();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        showAlert('Link copiado!', 'Cole e envie para seus colaboradores.');
      }).catch(() => {
        showAlert('Link', link);
      });
    } else {
      showAlert('Link', link);
    }
  };

  const openWhatsAppInvite = () => {
    const link = getValidatorLink();
    const estName = establishment?.business_name || 'nosso estabelecimento';
    const message = `Olá! Você foi convidado(a) para ser Validador de QR Code em *${estName}*.\n\nAcesse o link abaixo para se registrar e começar a validar ofertas:\n${link}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    if (typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank');
    } else {
      Linking.openURL(whatsappUrl);
    }
  };

  const resendLinkToValidator = (validatorName: string) => {
    const link = getValidatorLink();
    const estName = establishment?.business_name || 'nosso estabelecimento';
    const message = `Olá ${validatorName}! Segue o link para acessar o Validador de QR Code de *${estName}*:\n${link}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    if (typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank');
    } else {
      Linking.openURL(whatsappUrl);
    }
  };

  const toggleValidator = async (validatorId: string) => {
    try {
      await api.toggleValidator(validatorId);
      const vals = await api.getMyValidators();
      setValidators(vals);
    } catch (e: any) {
      showAlert('Erro', e.message || 'Falha ao atualizar');
    }
  };

  const deleteValidator = (validatorId: string, name: string) => {
    showConfirm(
      'Excluir Colaborador',
      `Tem certeza que deseja remover "${name}" da equipe? Esta ação não pode ser desfeita.`,
      async () => {
        try {
          await api.deleteValidator(validatorId);
          setValidators(prev => prev.filter(v => v.validator_id !== validatorId));
          showAlert('Removido', `${name} foi removido da equipe.`);
        } catch (e: any) {
          showAlert('Erro', e.message || 'Falha ao remover');
        }
      }
    );
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
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} data-testid="team-back-btn">
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Equipe / Validadores</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      >
        {/* Actions */}
        <View style={s.actionsCard}>
          <TouchableOpacity style={s.whatsappBtn} onPress={openWhatsAppInvite} activeOpacity={0.8} data-testid="team-whatsapp-btn">
            <Ionicons name="logo-whatsapp" size={22} color="#FFF" />
            <Text style={s.whatsappBtnText}>Convidar via WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.copyBtn} onPress={copyLink} activeOpacity={0.8} data-testid="team-copy-link-btn">
            <Ionicons name="link" size={18} color="#3B82F6" />
            <Text style={s.copyBtnText}>Copiar Link de Acesso</Text>
            <Ionicons name="copy-outline" size={18} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Team List */}
        <Text style={s.sectionLabel}>Colaboradores ({validators.length})</Text>

        {validators.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="people-outline" size={48} color="#2E5A8F" />
            <Text style={s.emptyTitle}>Nenhum colaborador registrado</Text>
            <Text style={s.emptyText}>Convide seus garçons e caixa pelo WhatsApp acima</Text>
          </View>
        ) : (
          validators.map((v: any) => (
            <View key={v.validator_id} style={[s.validatorCard, v.blocked && s.validatorBlocked]} data-testid={`validator-card-${v.validator_id}`}>
              <View style={s.validatorTop}>
                <View style={s.validatorAvatar}>
                  <Ionicons name="person" size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.validatorName}>{v.name}</Text>
                  <Text style={s.validatorInfo}>
                    {v.validations_count || 0} validações
                    {v.blocked ? ' · Bloqueado' : ' · Ativo'}
                  </Text>
                </View>
              </View>

              <View style={s.validatorActions}>
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => resendLinkToValidator(v.name)}
                  data-testid={`resend-link-${v.validator_id}`}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                  <Text style={[s.actionBtnText, { color: '#25D366' }]}>Reenviar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => toggleValidator(v.validator_id)}
                  data-testid={`toggle-block-${v.validator_id}`}
                >
                  <Ionicons
                    name={v.blocked ? 'lock-open-outline' : 'lock-closed-outline'}
                    size={16}
                    color={v.blocked ? '#10B981' : '#F59E0B'}
                  />
                  <Text style={[s.actionBtnText, { color: v.blocked ? '#10B981' : '#F59E0B' }]}>
                    {v.blocked ? 'Desbloquear' : 'Bloquear'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => deleteValidator(v.validator_id, v.name)}
                  data-testid={`delete-validator-${v.validator_id}`}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={[s.actionBtnText, { color: '#EF4444' }]}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1B3A5C' },
  centered: { justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#22476B',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },

  scrollContent: { padding: 20, paddingBottom: 40 },

  actionsCard: {
    backgroundColor: '#22476B',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2E5A8F',
    marginBottom: 24,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 12,
  },
  whatsappBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1B3A5C',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2E5A8F',
  },
  copyBtnText: { fontSize: 14, fontWeight: '600', color: '#3B82F6', flex: 1, textAlign: 'center' },

  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#64748B', marginTop: 12 },
  emptyText: { fontSize: 13, color: '#475569', marginTop: 4, textAlign: 'center' },

  validatorCard: {
    backgroundColor: '#22476B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2E5A8F',
  },
  validatorBlocked: { borderColor: '#EF444433', opacity: 0.7 },
  validatorTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  validatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#064E3B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  validatorName: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  validatorInfo: { fontSize: 12, color: '#64748B', marginTop: 2 },

  validatorActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#2E5A8F',
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1B3A5C',
  },
  actionBtnText: { fontSize: 11, fontWeight: '600' },
});

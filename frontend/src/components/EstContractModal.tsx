import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';

interface EstContractModalProps {
  visible: boolean;
  onAccepted: () => void;
}

export const EstContractModal: React.FC<EstContractModalProps> = ({ visible, onAccepted }) => {
  const [contractText, setContractText] = useState('');
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  useEffect(() => {
    if (visible) {
      loadContract();
      setScrolledToEnd(false);
    }
  }, [visible]);

  const loadContract = async () => {
    setLoading(true);
    try {
      const data = await api.getEstContractStatus();
      setContractText(data.contract_text || '');
      if (data.accepted) {
        onAccepted();
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAccept = async () => {
    if (!fullName.trim()) {
      setError('Digite seu nome completo para assinar');
      return;
    }
    setAccepting(true);
    setError('');
    try {
      await api.acceptEstContract(fullName.trim());
      onAccepted();
    } catch (err: any) {
      setError(err.message || 'Erro ao aceitar contrato');
    }
    setAccepting(false);
  };

  const handleScroll = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 40) {
      setScrolledToEnd(true);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container} data-testid="est-contract-modal">
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="document-text" size={24} color="#10B981" />
          <Text style={styles.headerTitle}>Contrato de Intermediacao</Text>
        </View>

        <Text style={styles.subtitle}>
          Para publicar ofertas na plataforma, e necessario aceitar o contrato de intermediacao digital.
        </Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        ) : (
          <>
            {/* Contract Text */}
            <ScrollView
              style={styles.contractScroll}
              contentContainerStyle={styles.contractContent}
              onScroll={handleScroll}
              scrollEventThrottle={200}
              data-testid="contract-scroll"
            >
              <Text style={styles.contractText}>{contractText}</Text>
            </ScrollView>

            {!scrolledToEnd && (
              <View style={styles.scrollHint}>
                <Ionicons name="chevron-down" size={16} color="#64748B" />
                <Text style={styles.scrollHintText}>Role ate o final para aceitar</Text>
              </View>
            )}

            {/* Acceptance Form */}
            <View style={styles.acceptArea}>
              <TextInput
                style={styles.nameInput}
                placeholder="Seu nome completo (para assinatura)"
                placeholderTextColor="#64748B"
                value={fullName}
                onChangeText={setFullName}
                data-testid="contract-name-input"
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.acceptBtn, (!scrolledToEnd || accepting) && styles.acceptBtnDisabled]}
                onPress={handleAccept}
                disabled={!scrolledToEnd || accepting}
                data-testid="accept-contract-btn"
              >
                {accepting ? (
                  <ActivityIndicator color="#0F172A" />
                ) : (
                  <>
                    <Ionicons name="checkmark-shield" size={20} color={scrolledToEnd ? '#0F172A' : '#64748B'} />
                    <Text style={[styles.acceptBtnText, !scrolledToEnd && { color: '#64748B' }]}>
                      {scrolledToEnd ? 'Aceitar e Assinar Contrato' : 'Role ate o final primeiro'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    paddingHorizontal: 20,
    marginBottom: 12,
    lineHeight: 20,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contractScroll: {
    flex: 1,
    marginHorizontal: 16,
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  contractContent: {
    padding: 16,
  },
  contractText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 20,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  scrollHintText: {
    color: '#64748B',
    fontSize: 12,
  },
  acceptArea: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  nameInput: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    color: '#E2E8F0',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 8,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
  },
  acceptBtnDisabled: {
    backgroundColor: '#1E293B',
  },
  acceptBtnText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
});

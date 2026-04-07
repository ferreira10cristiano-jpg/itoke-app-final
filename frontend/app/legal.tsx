import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/lib/api';

const DOC_CONFIG: Record<string, { icon: string; color: string }> = {
  terms_client: { icon: 'document-text', color: '#3B82F6' },
  terms_establishment: { icon: 'business', color: '#10B981' },
  terms_general: { icon: 'shield-checkmark', color: '#8B5CF6' },
  privacy_lgpd: { icon: 'lock-closed', color: '#EF4444' },
  legal_compliance: { icon: 'checkmark-shield', color: '#F59E0B' },
};

export default function LegalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const docKey = params.doc as string | undefined;

  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (docKey && documents.length > 0) {
      const doc = documents.find(d => d.key === docKey);
      if (doc) setSelectedDoc(doc);
    }
  }, [docKey, documents]);

  const loadDocuments = async () => {
    try {
      const docs = await api.getAllLegalDocuments();
      setDocuments(docs);
    } catch (e) {
      console.error('Error loading legal docs:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (selectedDoc) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setSelectedDoc(null)} style={s.backBtn} data-testid="legal-back-btn">
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle} numberOfLines={1}>{selectedDoc.title}</Text>
            <Text style={s.headerSub}>Versao {selectedDoc.version}</Text>
          </View>
        </View>
        <ScrollView style={s.contentScroll} showsVerticalScrollIndicator={false}>
          <View style={s.contentCard}>
            <Text style={s.contentText}>{selectedDoc.content}</Text>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} data-testid="legal-list-back-btn">
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Termos e Politicas</Text>
          <Text style={s.headerSub}>Documentos legais da plataforma iToke</Text>
        </View>
        <Ionicons name="shield-checkmark" size={28} color="#3B82F6" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.infoCard}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={s.infoText}>
            Ao utilizar a plataforma iToke, voce concorda com todos os termos e politicas listados abaixo.
          </Text>
        </View>

        {documents.map((doc) => {
          const cfg = DOC_CONFIG[doc.key] || { icon: 'document', color: '#64748B' };
          return (
            <TouchableOpacity
              key={doc.key}
              style={s.docCard}
              onPress={() => setSelectedDoc(doc)}
              data-testid={`legal-doc-${doc.key}`}
            >
              <View style={[s.docIcon, { backgroundColor: cfg.color + '20' }]}>
                <Ionicons name={cfg.icon as any} size={24} color={cfg.color} />
              </View>
              <View style={s.docInfo}>
                <Text style={s.docTitle}>{doc.title}</Text>
                <Text style={s.docVersion}>Versao {doc.version}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          );
        })}

        <View style={s.contactCard}>
          <Ionicons name="mail" size={20} color="#64748B" />
          <View>
            <Text style={s.contactLabel}>Duvidas sobre termos?</Text>
            <Text style={s.contactEmail}>legal@itoke.com.br</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  headerSub: { fontSize: 13, color: '#64748B' },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 20, marginBottom: 16, padding: 14,
    backgroundColor: '#EFF6FF', borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE',
  },
  infoText: { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 18 },

  docCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 10, padding: 16,
    backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0',
  },
  docIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  docInfo: { flex: 1 },
  docTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  docVersion: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  contactCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 20, marginTop: 10, padding: 16,
    backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  contactLabel: { fontSize: 13, color: '#64748B' },
  contactEmail: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },

  contentScroll: { flex: 1 },
  contentCard: {
    marginHorizontal: 20, padding: 20,
    backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0',
  },
  contentText: { fontSize: 14, color: '#334155', lineHeight: 22 },
});

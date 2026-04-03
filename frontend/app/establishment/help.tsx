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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';

export default function EstablishmentHelp() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [topics, setTopics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      const data = await api.getEstHelpTopics();
      setTopics(data);
    } catch (error) {
      console.error('Error loading help topics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (topicId: string) => {
    setExpandedId(prev => prev === topicId ? null : topicId);
  };

  if (isLoading) {
    return (
      <View style={[s.container, s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} data-testid="est-help-back-btn">
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Como Usar o iToke</Text>
            <Text style={s.headerSub}>Guia para Estabelecimentos</Text>
          </View>
          <Ionicons name="help-buoy" size={28} color="#F59E0B" />
        </View>

        {/* Intro Card */}
        <View style={s.introCard}>
          <Ionicons name="flash" size={24} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={s.introTitle}>Tokens + Creditos</Text>
            <Text style={s.introText}>
              Tokens voce compra para validar QR Codes. Creditos voce recebe quando clientes pagam. Entenda tudo abaixo!
            </Text>
          </View>
        </View>

        {/* Topics */}
        {topics.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="document-text-outline" size={40} color="#334155" />
            <Text style={s.emptyText}>Nenhum topico de ajuda disponivel</Text>
          </View>
        ) : (
          <View style={s.topicsList}>
            {topics.map((topic) => {
              const isExpanded = expandedId === topic.topic_id;
              return (
                <TouchableOpacity
                  key={topic.topic_id}
                  style={[s.topicCard, isExpanded && s.topicCardExpanded]}
                  onPress={() => toggleExpand(topic.topic_id)}
                  activeOpacity={0.7}
                  data-testid={`est-help-topic-${topic.topic_id}`}
                >
                  <View style={s.topicHeader}>
                    <View style={[s.topicIcon, isExpanded && s.topicIconExpanded]}>
                      <Ionicons
                        name={(topic.icon || 'help-circle-outline') as any}
                        size={20}
                        color={isExpanded ? '#0F172A' : '#F59E0B'}
                      />
                    </View>
                    <Text style={[s.topicTitle, isExpanded && s.topicTitleExpanded]}>
                      {topic.title}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={isExpanded ? '#F59E0B' : '#64748B'}
                    />
                  </View>
                  {isExpanded && (
                    <View style={s.topicContent}>
                      <Text style={s.topicText}>{topic.content}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Contact */}
        <View style={s.contactCard} data-testid="est-help-contact">
          <Ionicons name="chatbubble-ellipses" size={24} color="#3B82F6" />
          <View style={{ flex: 1 }}>
            <Text style={s.contactTitle}>Ainda tem duvidas?</Text>
            <Text style={s.contactText}>Entre em contato pelo suporte no app ou pelo email de ajuda.</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  headerSub: { fontSize: 13, color: '#64748B' },

  introCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginHorizontal: 20, backgroundColor: '#1E293B', padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: '#F59E0B33',
  },
  introTitle: { fontSize: 15, fontWeight: '700', color: '#F59E0B', marginBottom: 4 },
  introText: { fontSize: 13, color: '#94A3B8', lineHeight: 18 },

  topicsList: { paddingHorizontal: 20, marginTop: 20, gap: 8 },
  topicCard: {
    backgroundColor: '#1E293B', borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#334155',
  },
  topicCardExpanded: { borderColor: '#F59E0B55' },
  topicHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
  },
  topicIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#78350F',
    justifyContent: 'center', alignItems: 'center',
  },
  topicIconExpanded: { backgroundColor: '#F59E0B' },
  topicTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#FFF' },
  topicTitleExpanded: { color: '#F59E0B' },
  topicContent: {
    paddingHorizontal: 16, paddingBottom: 16, paddingTop: 0,
    borderTopWidth: 1, borderTopColor: '#334155',
  },
  topicText: { fontSize: 14, color: '#CBD5E1', lineHeight: 22, paddingTop: 12 },

  contactCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginHorizontal: 20, marginTop: 24, backgroundColor: '#1E3A5F', padding: 16, borderRadius: 14,
  },
  contactTitle: { fontSize: 15, fontWeight: '700', color: '#93C5FD', marginBottom: 4 },
  contactText: { fontSize: 13, color: '#60A5FA', lineHeight: 18 },

  emptyState: { alignItems: 'center', paddingVertical: 40, marginHorizontal: 20, backgroundColor: '#1E293B', borderRadius: 14, borderWidth: 1, borderColor: '#334155' },
  emptyText: { fontSize: 14, color: '#64748B', marginTop: 10 },
});

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

function convertToEmbed(url: string): string {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}

export default function EstablishmentHelp() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [topics, setTopics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const topicsData = await api.getEstHelpTopics();
      setTopics(topicsData);
    } catch (error) {
      console.error('Error loading help data:', error);
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
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
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

        {/* FAQ Topics with embedded videos */}
        <View style={s.faqHeader}>
          <Ionicons name="chatbubbles" size={20} color="#22476B" />
          <Text style={s.faqHeaderTitle}>Perguntas Frequentes</Text>
        </View>

        {topics.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="document-text-outline" size={40} color="#94A3B8" />
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
                        color={isExpanded ? '#FFF' : '#22476B'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.topicTitle, isExpanded && s.topicTitleExpanded]}>
                        {topic.title}
                      </Text>
                      {topic.video_url && !isExpanded ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Ionicons name="videocam" size={12} color="#3B82F6" />
                          <Text style={{ fontSize: 11, color: '#3B82F6' }}>Inclui video</Text>
                        </View>
                      ) : null}
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={isExpanded ? '#F59E0B' : '#94A3B8'}
                    />
                  </View>
                  {isExpanded && (
                    <View style={s.topicContent}>
                      <Text style={s.topicText}>{topic.content}</Text>

                      {/* Video embedded in topic */}
                      {topic.video_url ? (
                        <View style={s.videoSection}>
                          <View style={s.videoLabel}>
                            <Ionicons name="play-circle" size={16} color="#3B82F6" />
                            <Text style={s.videoLabelText}>Video explicativo</Text>
                          </View>
                          <View style={s.videoEmbed}>
                            {typeof window !== 'undefined' && (
                              <iframe
                                src={convertToEmbed(topic.video_url)}
                                style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
                                allowFullScreen
                              />
                            )}
                          </View>
                        </View>
                      ) : null}
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
  container: { flex: 1, backgroundColor: '#BFDBFE' },
  centered: { justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  headerSub: { fontSize: 13, color: '#64748B' },

  introCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginHorizontal: 20, backgroundColor: '#22476B', padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: '#2E5A8F',
  },
  introTitle: { fontSize: 15, fontWeight: '700', color: '#FCD34D', marginBottom: 4 },
  introText: { fontSize: 13, color: '#CBD5E1', lineHeight: 18 },

  faqHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginTop: 24, marginBottom: 14 },
  faqHeaderTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B' },

  topicsList: { paddingHorizontal: 20, gap: 8 },
  topicCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  topicCardExpanded: { borderColor: '#3B82F6' },
  topicHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  topicIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#DBEAFE',
    justifyContent: 'center', alignItems: 'center',
  },
  topicIconExpanded: { backgroundColor: '#22476B' },
  topicTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1E293B' },
  topicTitleExpanded: { color: '#22476B' },
  topicContent: {
    paddingHorizontal: 16, paddingBottom: 16, paddingTop: 0,
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  topicText: { fontSize: 14, color: '#475569', lineHeight: 22, paddingTop: 12 },

  // Video inside topic
  videoSection: { marginTop: 16, backgroundColor: '#F8FAFC', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  videoLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, backgroundColor: '#EFF6FF' },
  videoLabelText: { fontSize: 13, fontWeight: '600', color: '#3B82F6' },
  videoEmbed: { aspectRatio: 16 / 9 },

  contactCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginHorizontal: 20, marginTop: 24, backgroundColor: '#22476B', padding: 16, borderRadius: 14,
  },
  contactTitle: { fontSize: 15, fontWeight: '700', color: '#93C5FD', marginBottom: 4 },
  contactText: { fontSize: 13, color: '#CBD5E1', lineHeight: 18 },

  emptyState: { alignItems: 'center', paddingVertical: 40, marginHorizontal: 20, backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  emptyText: { fontSize: 14, color: '#64748B', marginTop: 10 },
});

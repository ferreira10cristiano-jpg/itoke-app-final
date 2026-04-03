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
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [topicsData, videosData] = await Promise.all([
        api.getEstHelpTopics(),
        api.getOnboardingVideos('establishment'),
      ]);
      setTopics(topicsData);
      setVideos(videosData);
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
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Como Usar o iToke</Text>
            <Text style={s.headerSub}>Guia para Estabelecimentos</Text>
          </View>
          <Ionicons name="help-buoy" size={28} color="#F59E0B" />
        </View>

        {/* Videos Section */}
        {videos.length > 0 && (
          <View style={s.videosSection} data-testid="videos-section">
            <View style={s.videosSectionHeader}>
              <Ionicons name="play-circle" size={22} color="#F59E0B" />
              <Text style={s.videosSectionTitle}>Videos Explicativos</Text>
            </View>

            {videos.map((video) => (
              <View key={video.video_id} style={s.videoCard} data-testid={`video-card-${video.video_id}`}>
                {video.video_url ? (
                  <View style={s.videoEmbed}>
                    {typeof window !== 'undefined' && (
                      <iframe
                        src={convertToEmbed(video.video_url)}
                        style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
                        allowFullScreen
                      />
                    )}
                  </View>
                ) : (
                  <View style={s.videoPlaceholder}>
                    <Ionicons name="play-circle" size={44} color="#475569" />
                    <Text style={s.placeholderText}>Video em breve</Text>
                  </View>
                )}
                <Text style={s.videoTitle}>{video.title}</Text>
                <Text style={s.videoDesc}>{video.description}</Text>
              </View>
            ))}
          </View>
        )}

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

        {/* FAQ Topics */}
        <View style={s.faqHeader}>
          <Ionicons name="chatbubbles" size={20} color="#10B981" />
          <Text style={s.faqHeaderTitle}>Perguntas Frequentes</Text>
        </View>

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
                        color={isExpanded ? '#1B3A5C' : '#F59E0B'}
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
  container: { flex: 1, backgroundColor: '#1B3A5C' },
  centered: { justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  headerSub: { fontSize: 13, color: '#64748B' },

  // Videos Section
  videosSection: { paddingHorizontal: 20, marginTop: 4 },
  videosSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  videosSectionTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  videoCard: { backgroundColor: '#22476B', borderRadius: 14, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#2E5A8F' },
  videoEmbed: { aspectRatio: 16 / 9, backgroundColor: '#1B3A5C' },
  videoPlaceholder: { aspectRatio: 16 / 9, backgroundColor: '#1B3A5C', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 14, color: '#475569', fontWeight: '600', marginTop: 6 },
  videoTitle: { fontSize: 15, fontWeight: '700', color: '#FFF', paddingHorizontal: 14, paddingTop: 12 },
  videoDesc: { fontSize: 13, color: '#94A3B8', paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4, lineHeight: 18 },

  // Intro
  introCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginHorizontal: 20, marginTop: 20, backgroundColor: '#22476B', padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: '#F59E0B33',
  },
  introTitle: { fontSize: 15, fontWeight: '700', color: '#F59E0B', marginBottom: 4 },
  introText: { fontSize: 13, color: '#94A3B8', lineHeight: 18 },

  // FAQ Header
  faqHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginTop: 24, marginBottom: 14 },
  faqHeaderTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },

  topicsList: { paddingHorizontal: 20, gap: 8 },
  topicCard: {
    backgroundColor: '#22476B', borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#2E5A8F',
  },
  topicCardExpanded: { borderColor: '#F59E0B55' },
  topicHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  topicIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#78350F',
    justifyContent: 'center', alignItems: 'center',
  },
  topicIconExpanded: { backgroundColor: '#F59E0B' },
  topicTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#FFF' },
  topicTitleExpanded: { color: '#F59E0B' },
  topicContent: {
    paddingHorizontal: 16, paddingBottom: 16, paddingTop: 0,
    borderTopWidth: 1, borderTopColor: '#2E5A8F',
  },
  topicText: { fontSize: 14, color: '#CBD5E1', lineHeight: 22, paddingTop: 12 },

  contactCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginHorizontal: 20, marginTop: 24, backgroundColor: '#2E5A8F', padding: 16, borderRadius: 14,
  },
  contactTitle: { fontSize: 15, fontWeight: '700', color: '#93C5FD', marginBottom: 4 },
  contactText: { fontSize: 13, color: '#60A5FA', lineHeight: 18 },

  emptyState: { alignItems: 'center', paddingVertical: 40, marginHorizontal: 20, backgroundColor: '#22476B', borderRadius: 14, borderWidth: 1, borderColor: '#2E5A8F' },
  emptyText: { fontSize: 14, color: '#64748B', marginTop: 10 },
});

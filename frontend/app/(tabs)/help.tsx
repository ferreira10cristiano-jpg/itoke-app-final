import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';

interface HelpTopic {
  topic_id: string;
  title: string;
  content: string;
  icon: string;
  order: number;
  video_url?: string;
}

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [topics, setTopics] = useState<HelpTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [supportEmail, setSupportEmail] = useState('suporte@itoke.com.br');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [topicsData, settingsData] = await Promise.all([
        api.getHelpTopics(),
        api.getHelpSettings(),
      ]);
      setTopics(topicsData);
      setSupportEmail(settingsData.support_email || 'suporte@itoke.com.br');
    } catch (err) {
      console.error('Error loading help:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleContact = () => {
    const subject = encodeURIComponent('Ajuda - iToke App');
    const body = encodeURIComponent('Ola, preciso de ajuda com...');
    Linking.openURL(`mailto:${supportEmail}?subject=${subject}&body=${body}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="help-buoy" size={28} color="#10B981" />
        <Text style={styles.headerTitle}>Central de Ajuda</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Encontre respostas para as duvidas mais frequentes
        </Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Carregando...</Text>
          </View>
        ) : topics.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="document-text-outline" size={48} color="#475569" />
            <Text style={styles.emptyText}>Nenhum topico disponivel no momento</Text>
          </View>
        ) : (
          <View style={styles.topicsList}>
            {topics.map((topic, index) => {
              const isExpanded = expandedId === topic.topic_id;
              return (
                <TouchableOpacity
                  key={topic.topic_id}
                  style={[styles.topicCard, isExpanded && styles.topicCardExpanded]}
                  onPress={() => toggleExpand(topic.topic_id)}
                  activeOpacity={0.7}
                  data-testid={`help-topic-${topic.topic_id}`}
                >
                  <View style={styles.topicHeader}>
                    <View style={[styles.topicIconWrap, isExpanded && styles.topicIconWrapExpanded]}>
                      <Ionicons
                        name={(topic.icon || 'help-circle-outline') as any}
                        size={20}
                        color={isExpanded ? '#FFFFFF' : '#10B981'}
                      />
                    </View>
                    <Text style={[styles.topicTitle, isExpanded && styles.topicTitleExpanded]}>
                      {topic.title}
                    </Text>
                    {topic.video_url && !isExpanded ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginRight: 4 }}>
                        <Ionicons name="videocam" size={12} color="#3B82F6" />
                      </View>
                    ) : null}
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={isExpanded ? '#10B981' : '#64748B'}
                    />
                  </View>
                  {isExpanded && (
                    <View style={styles.topicContent}>
                      <View style={styles.topicDivider} />
                      <Text style={styles.topicContentText}>{topic.content}</Text>
                      {topic.video_url && topic.video_url.trim() !== '' ? (
                        <View style={styles.videoSection} data-testid={`help-video-${topic.topic_id}`}>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                              if (topic.video_url) {
                                Linking.openURL(topic.video_url);
                              }
                            }}
                          >
                            <View style={styles.videoHeader}>
                              <Ionicons name="logo-youtube" size={20} color="#EF4444" />
                              <Text style={styles.videoHeaderText}>Assistir Video</Text>
                              <Ionicons name="open-outline" size={16} color="#93C5FD" />
                            </View>
                            <View style={styles.videoBody}>
                              <View style={styles.videoThumb}>
                                <Ionicons name="play" size={24} color="#EF4444" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.videoTitle}>{topic.title}</Text>
                                <Text style={styles.videoSubtitle}>Toque para abrir no YouTube</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Terms & Policies */}
        <TouchableOpacity
          style={styles.termsCard}
          onPress={() => router.push('/legal')}
          data-testid="help-terms-link"
        >
          <View style={styles.termsIcon}>
            <Ionicons name="shield-checkmark" size={22} color="#3B82F6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.termsTitle}>Termos e Politicas</Text>
            <Text style={styles.termsDesc}>Termos de uso, privacidade e LGPD</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#475569" />
        </TouchableOpacity>

        {/* Contact Section */}
        <View style={styles.contactSection} data-testid="help-contact-section">
          <View style={styles.contactIconCircle}>
            <Ionicons name="mail-outline" size={32} color="#3B82F6" />
          </View>
          <Text style={styles.contactTitle}>Ainda precisa de ajuda?</Text>
          <Text style={styles.contactDesc}>
            Ainda nao encontrou resposta para sua duvida? Entre em contato conosco!
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContact}
            data-testid="help-contact-btn"
          >
            <Ionicons name="mail" size={20} color="#FFFFFF" />
            <Text style={styles.contactButtonText}>Enviar E-mail</Text>
          </TouchableOpacity>
          <Text style={styles.contactEmail} data-testid="help-contact-email">{supportEmail}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
    lineHeight: 20,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
    marginTop: 12,
  },
  topicsList: {
    gap: 10,
  },
  topicCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  topicCardExpanded: {
    borderColor: '#10B981',
    backgroundColor: '#0F2A1F',
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topicIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#10B98120',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicIconWrapExpanded: {
    backgroundColor: '#10B981',
  },
  topicTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  topicTitleExpanded: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  topicContent: {
    marginTop: 12,
  },
  topicDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginBottom: 12,
  },
  topicContentText: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 22,
  },
  // Video inside topic
  videoSection: {
    marginTop: 14,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: '#1E3A5F',
  },
  videoHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  videoBody: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  videoThumb: {
    width: 60,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoTitle: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  videoSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  // Terms card
  termsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  termsIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#3B82F620',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  termsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  termsDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  // Contact Section
  contactSection: {
    marginTop: 32,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    // Subtle gradient effect with border
    borderTopColor: '#3B82F640',
  },
  contactIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F620',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  contactDesc: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    gap: 8,
    width: '100%',
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contactEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
});

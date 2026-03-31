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
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';

interface HelpTopic {
  topic_id: string;
  title: string;
  content: string;
  icon: string;
  order: number;
}

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
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
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

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

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface AccordionItem {
  icon: string;
  title: string;
  content: string;
}

function AccordionSection({ item, isOpen, onToggle }: { item: AccordionItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <View style={styles.accordionItem}>
      <TouchableOpacity style={styles.accordionHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.accordionIconContainer}>
          <Ionicons name={item.icon as any} size={20} color="#10B981" />
        </View>
        <Text style={styles.accordionTitle}>{item.title}</Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#64748B"
        />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.accordionBody}>
          <Text style={styles.accordionContent}>{item.content}</Text>
        </View>
      )}
    </View>
  );
}

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const [openSection, setOpenSection] = useState<number | null>(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenSection(openSection === index ? null : index);
  };

  const handleFaqToggle = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const sections: AccordionItem[] = [
    {
      icon: 'ticket-outline',
      title: 'O que são Tokens?',
      content:
        'Tokens são a moeda do iToke! Eles são comprados em pacotes de 7 unidades por R$ 7,00 cada pacote.\n\nCom os tokens, você pode gerar QR Codes de desconto para usar nos estabelecimentos parceiros. Cada QR Code gerado consome 1 token.\n\nQuanto mais tokens você tiver, mais descontos poderá aproveitar!',
    },
    {
      icon: 'wallet-outline',
      title: 'O que são Créditos?',
      content:
        'Créditos são ganhos quando seus amigos e indicados compram tokens no iToke. É dinheiro real no seu saldo!\n\nVocê ganha R$ 1,00 por pacote comprado em até 3 níveis de indicação:\n\n• Nível 1 (indicação direta): R$ 1,00/pacote\n• Nível 2 (amigo do amigo): R$ 1,00/pacote\n• Nível 3: R$ 1,00/pacote\n\nExemplo: Se seu indicado comprar 5 pacotes, você recebe R$ 5,00!',
    },
    {
      icon: 'trending-up-outline',
      title: 'Como ganhar mais?',
      content:
        'Existem duas formas principais de ganhar mais créditos:\n\n1. Indicar Amigos: Compartilhe seu código de indicação com amigos. Cada vez que eles ou os indicados deles comprarem tokens, você ganha comissão em 3 níveis!\n\n2. Indicar Estabelecimentos: Indique lojas, restaurantes e prestadores de serviço. Quando eles começarem a vender no iToke, você ganha R$ 1,00 por venda durante 12 meses!\n\nDica: Quanto maior sua rede, mais você ganha automaticamente!',
    },
  ];

  const faqItems: AccordionItem[] = [
    {
      icon: 'help-circle-outline',
      title: 'Quanto tempo dura o QR Code de desconto?',
      content:
        'Cada QR Code gerado tem validade de 24 horas. Após esse período, ele expira automaticamente e o token não é devolvido. Gere o QR Code somente quando estiver pronto para utilizá-lo no estabelecimento.',
    },
    {
      icon: 'help-circle-outline',
      title: 'Posso usar o desconto em qualquer loja?',
      content:
        'Os descontos são válidos apenas nos estabelecimentos parceiros cadastrados no iToke. Cada oferta está vinculada a um estabelecimento específico. Verifique na aba "Ofertas" quais estabelecimentos estão disponíveis na sua região.',
    },
    {
      icon: 'help-circle-outline',
      title: 'Os créditos que eu ganho expiram?',
      content:
        'Não! Seus créditos não expiram e ficam acumulados na sua carteira. Futuramente, será possível utilizá-los para comprar tokens ou transferi-los. Por enquanto, eles representam seus ganhos com a rede de indicações.',
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Ajuda</Text>
        <Text style={styles.subtitle}>Como funciona o iToke</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={styles.heroCard}>
          <Ionicons name="information-circle" size={36} color="#10B981" />
          <Text style={styles.heroTitle}>Bem-vindo ao iToke!</Text>
          <Text style={styles.heroText}>
            O iToke conecta você a ofertas exclusivas e te recompensa por indicar amigos e estabelecimentos.
          </Text>
        </View>

        {/* Como Funciona */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Como Funciona</Text>
          {sections.map((item, index) => (
            <AccordionSection
              key={index}
              item={item}
              isOpen={openSection === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </View>

        {/* Passo a Passo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Passo a Passo</Text>
          <View style={styles.stepsContainer}>
            {[
              { step: '1', icon: 'cart', text: 'Compre pacotes de tokens (7 por R$7)' },
              { step: '2', icon: 'search', text: 'Encontre ofertas de desconto no feed' },
              { step: '3', icon: 'qr-code', text: 'Gere um QR Code para a oferta' },
              { step: '4', icon: 'storefront', text: 'Apresente o QR Code no estabelecimento' },
              { step: '5', icon: 'share-social', text: 'Indique amigos e ganhe comissões!' },
            ].map((s, i) => (
              <View key={i} style={styles.stepItem}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>{s.step}</Text>
                </View>
                <Ionicons name={s.icon as any} size={20} color="#10B981" style={{ marginRight: 10 }} />
                <Text style={styles.stepText}>{s.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perguntas Frequentes</Text>
          {faqItems.map((item, index) => (
            <AccordionSection
              key={index}
              item={item}
              isOpen={openFaq === index}
              onToggle={() => handleFaqToggle(index)}
            />
          ))}
        </View>

        <View style={{ height: 32 }} />
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // Hero
  heroCard: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#064E3B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 10,
  },
  heroText: {
    fontSize: 13,
    color: '#6EE7B7',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  // Sections
  section: {
    marginTop: 24,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },

  // Accordion
  accordionItem: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  accordionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#064E3B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accordionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  accordionContent: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 21,
  },

  // Steps
  stepsContainer: {
    gap: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#CBD5E1',
  },
});

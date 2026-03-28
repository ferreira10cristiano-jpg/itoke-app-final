import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  RefreshControl,
  Switch,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../src/lib/api';
import { Offer, Establishment } from '../../src/types';

// Cross-platform alert
const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
  }
};

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// 14 Professional Rules Checklist
const PROFESSIONAL_RULES = [
  { id: 'r1', text: 'Não cumulativa com outros descontos ou combos vigentes.' },
  { id: 'r2', text: 'Obrigatória a apresentação do QR Code no balcão para validação.' },
  { id: 'r3', text: 'Válido exclusivamente nos dias e horários informados.' },
  { id: 'r4', text: 'Limite de 01 (um) voucher por CPF/Usuário por visita.' },
  { id: 'r5', text: 'O desconto não se aplica à taxa de serviço (10%) ou couvert.' },
  { id: 'r6', text: 'Necessário agendamento prévio com no mínimo 24h.' },
  { id: 'r7', text: 'Oferta sujeita à disponibilidade de estoque diário.' },
  { id: 'r8', text: 'Não válido para feriados, vésperas ou datas comemorativas.' },
];

interface FormData {
  title: string;
  description: string;
  image_base64: string;
  original_price: string;
  discounted_price: string;
  valid_days: string[];
  valid_hours_start: string;
  valid_hours_end: string;
  dine_in_only: boolean;
  delivery_allowed: boolean;
  pickup_allowed: boolean;
  selectedRules: string[];
  customRules: string;
}

const INITIAL_FORM: FormData = {
  title: '',
  description: '',
  image_base64: '',
  original_price: '',
  discounted_price: '',
  valid_days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
  valid_hours_start: '11:00',
  valid_hours_end: '22:00',
  dine_in_only: true,
  delivery_allowed: false,
  pickup_allowed: false,
  selectedRules: ['r1', 'r2', 'r3', 'r4'],
  customRules: '',
};

export default function OffersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [mediaHubVisible, setMediaHubVisible] = useState(false);
  const [aiPromptVisible, setAiPromptVisible] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [formData, setFormData] = useState<FormData>({ ...INITIAL_FORM });
  const [formStep, setFormStep] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [profileEditVisible, setProfileEditVisible] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    business_name: '',
    address: '',
    history: '',
    instagram: '',
  });
  const isEditing = !!editingOfferId;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const estData = await api.getMyEstablishment();
      setEstablishment(estData);
      
      const offersData = await api.getMyOffers();
      setOffers(offersData);
    } catch (error: any) {
      console.error('Error loading data:', error);
      // If no establishment found, redirect to register
      if (error.message?.includes('No establishment') || error.message?.includes('not found')) {
        router.replace('/establishment/register');
        return;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // ===== MEDIA HUB FUNCTIONS =====
  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permissão necessária', 'Precisamos acessar sua câmera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setFormData(f => ({ ...f, image_base64: `data:image/jpeg;base64,${result.assets[0].base64}` }));
      setMediaHubVisible(false);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permissão necessária', 'Precisamos acessar sua galeria.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setFormData(f => ({ ...f, image_base64: `data:image/jpeg;base64,${result.assets[0].base64}` }));
      setMediaHubVisible(false);
    }
  };

  const openAiGenerator = () => {
    setMediaHubVisible(false);
    const defaultPrompt = formData.title 
      ? `Foto profissional de: ${formData.title}. ${formData.description || ''}`
      : 'Foto profissional de comida gourmet, iluminação perfeita, apetitoso';
    setAiPrompt(defaultPrompt);
    setAiPromptVisible(true);
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) {
      showAlert('Atenção', 'Digite uma descrição para gerar a imagem');
      return;
    }
    setIsGeneratingAI(true);
    try {
      const response = await api.generateImage(aiPrompt);
      if (response.image_base64) {
        setFormData(f => ({ ...f, image_base64: `data:image/png;base64,${response.image_base64}` }));
        setAiPromptVisible(false);
        setAiPrompt('');
        showAlert('Sucesso!', 'Imagem gerada com IA!');
      }
    } catch (error: any) {
      showAlert('Erro', error.message || 'Falha ao gerar imagem. Tente novamente.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const useImageUrl = () => {
    if (!imageUrl.trim()) {
      showAlert('Atenção', 'Digite a URL da imagem');
      return;
    }
    setFormData(f => ({ ...f, image_base64: imageUrl.trim() }));
    setImageUrl('');
    setMediaHubVisible(false);
  };

  const calcDiscount = (): number => {
    const orig = parseFloat(formData.original_price);
    const disc = parseFloat(formData.discounted_price);
    if (!orig || !disc || orig <= 0) return 0;
    return Math.round(((orig - disc) / orig) * 100);
  };

  const toggleRule = (ruleId: string) => {
    setFormData(f => ({
      ...f,
      selectedRules: f.selectedRules.includes(ruleId)
        ? f.selectedRules.filter(r => r !== ruleId)
        : [...f.selectedRules, ruleId]
    }));
  };

  const getSelectedRulesText = (): string => {
    const selected = PROFESSIONAL_RULES
      .filter(r => formData.selectedRules.includes(r.id))
      .map(r => `• ${r.text}`)
      .join('\n');
    const custom = formData.customRules.trim();
    return custom ? `${selected}\n• ${custom}` : selected;
  };

  const openProfileEdit = () => {
    setEditProfileData({
      business_name: establishment?.business_name || '',
      address: establishment?.address || '',
      history: (establishment as any)?.history || '',
      instagram: (establishment as any)?.instagram || '',
    });
    setProfileEditVisible(true);
  };

  const saveProfileEdit = async () => {
    try {
      await api.updateEstablishment({
        business_name: editProfileData.business_name,
        address: editProfileData.address,
        history: editProfileData.history,
        instagram: editProfileData.instagram,
      });
      await loadData();
      setProfileEditVisible(false);
      showAlert('Sucesso!', 'Perfil atualizado!');
    } catch (error: any) {
      showAlert('Erro', error.message || 'Falha ao atualizar perfil');
    }
  };

  const openCreateForm = () => {
    setEditingOfferId(null);
    setFormData({ ...INITIAL_FORM });
    setFormStep(0);
    setModalVisible(true);
  };

  const openEditForm = (offer: Offer) => {
    setEditingOfferId(offer.offer_id);
    let validDaysArr: string[] = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
    if (offer.valid_days) {
      validDaysArr = offer.valid_days.split(',').map(d => d.trim()).filter(Boolean);
    }
    let hoursStart = '11:00';
    let hoursEnd = '22:00';
    if (offer.valid_hours) {
      const parts = offer.valid_hours.split('às').map(h => h.trim());
      if (parts.length === 2) {
        hoursStart = parts[0];
        hoursEnd = parts[1];
      }
    }
    setFormData({
      title: offer.title || '',
      description: offer.description || '',
      image_base64: offer.image_url || '',
      original_price: offer.original_price?.toString() || '',
      discounted_price: offer.discounted_price?.toString() || '',
      valid_days: validDaysArr,
      valid_hours_start: hoursStart,
      valid_hours_end: hoursEnd,
      dine_in_only: offer.dine_in_only ?? true,
      delivery_allowed: offer.delivery_allowed ?? false,
      pickup_allowed: (offer as any).pickup_allowed ?? false,
      selectedRules: ['r1', 'r2', 'r3', 'r4'],
      customRules: '',
    });
    setFormStep(0);
    setModalVisible(true);
  };

  const handleSubmitOffer = async () => {
    console.log('[handleSubmitOffer] Starting submission...');
    console.log('[handleSubmitOffer] Form data:', JSON.stringify(formData, null, 2));
    console.log('[handleSubmitOffer] Establishment:', establishment);
    
    if (!establishment) {
      console.log('[handleSubmitOffer] No establishment found');
      showAlert('Erro', 'Estabelecimento não encontrado. Por favor, registre seu estabelecimento primeiro.');
      router.replace('/establishment/register');
      return;
    }
    
    if (!formData.title.trim()) {
      console.log('[handleSubmitOffer] Validation failed: no title');
      showAlert('Atenção', 'Preencha o título da oferta');
      return;
    }
    const orig = parseFloat(formData.original_price);
    const disc = parseFloat(formData.discounted_price);
    console.log('[handleSubmitOffer] Prices:', { orig, disc });
    
    if (!orig || orig <= 0) {
      console.log('[handleSubmitOffer] Validation failed: invalid original price');
      showAlert('Atenção', 'Preencha o preço original');
      return;
    }
    if (!disc || disc <= 0 || disc >= orig) {
      console.log('[handleSubmitOffer] Validation failed: invalid discounted price');
      showAlert('Atenção', 'Preço com desconto deve ser menor que o original');
      return;
    }

    Keyboard.dismiss();
    setIsCreating(true);
    try {
      const discount = calcDiscount();
      const validDays = formData.valid_days.join(', ');
      const validHours = `${formData.valid_hours_start} às ${formData.valid_hours_end}`;
      const rulesText = getSelectedRulesText();

      const payload: any = {
        title: formData.title,
        description: formData.description || undefined,
        rules: rulesText || undefined,
        discount_value: discount,
        original_price: orig,
        discounted_price: disc,
        valid_days: validDays,
        valid_hours: validHours,
        delivery_allowed: formData.delivery_allowed,
        dine_in_only: formData.dine_in_only,
        pickup_allowed: formData.pickup_allowed,
      };

      if (formData.image_base64 && formData.image_base64.startsWith('data:')) {
        payload.image_base64 = formData.image_base64;
      }

      console.log('[handleSubmitOffer] Payload:', JSON.stringify(payload, null, 2));

      if (isEditing && editingOfferId) {
        console.log('[handleSubmitOffer] Updating offer:', editingOfferId);
        await api.updateOffer(editingOfferId, payload);
        showAlert('Sucesso!', 'Oferta atualizada!');
      } else {
        console.log('[handleSubmitOffer] Creating new offer...');
        const result = await api.createOffer(payload);
        console.log('[handleSubmitOffer] Offer created:', result);
        showAlert('Sucesso!', 'Oferta publicada no feed!');
      }

      setModalVisible(false);
      setFormData({ ...INITIAL_FORM });
      setEditingOfferId(null);
      setFormStep(0);
      await loadData();
    } catch (error: any) {
      console.error('[handleSubmitOffer] Error:', error);
      showAlert('Erro', error.message || 'Falha ao salvar oferta');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleOfferStatus = async (offer: Offer) => {
    try {
      await api.updateOffer(offer.offer_id, { active: !offer.active });
      await loadData();
    } catch (error: any) {
      showAlert('Erro', error.message);
    }
  };

  const toggleDay = (day: string) => {
    setFormData(f => {
      const days = f.valid_days.includes(day)
        ? f.valid_days.filter(d => d !== day)
        : [...f.valid_days, day];
      return { ...f, valid_days: days };
    });
  };

  // ===== RENDER OFFER CARD =====
  const renderOfferCard = ({ item }: { item: Offer }) => (
    <View style={[s.offerCard, !item.active && s.offerCardInactive]}>
      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={s.offerImage} resizeMode="cover" />
      )}
      <View style={s.offerBody}>
        <View style={s.offerTopRow}>
          <View style={s.titleRow}>
            <Text style={s.offerTitle} numberOfLines={1}>{item.title}</Text>
            {item.offer_code && (
              <View style={s.codeChip}>
                <Text style={s.codeChipText}>{item.offer_code}</Text>
              </View>
            )}
          </View>
          <View style={s.badgesRow}>
            {(item as any).is_simulation && (
              <View style={s.badgeSimulation}>
                <Text style={s.badgeSimulationText}>SIMULAÇÃO</Text>
              </View>
            )}
            <View style={[s.badge, item.active ? s.badgeGreen : s.badgeRed]}>
              <Text style={[s.badgeText, !item.active && s.badgeTextRed]}>{item.active ? 'Ativa' : 'Pausada'}</Text>
            </View>
          </View>
        </View>
        {item.description ? <Text style={s.offerDesc} numberOfLines={2}>{item.description}</Text> : null}
        <View style={s.priceRow}>
          <Text style={s.oldPrice}>R$ {item.original_price?.toFixed(2)}</Text>
          <Text style={s.newPrice}>R$ {item.discounted_price?.toFixed(2)}</Text>
          <View style={s.discountChip}>
            <Text style={s.discountChipText}>{item.discount_value}% OFF</Text>
          </View>
        </View>
        <View style={s.metricsRow}>
          <View style={s.metric}><Ionicons name="eye" size={14} color="#64748B" /><Text style={s.metricText}>{item.views}</Text></View>
          <View style={s.metric}><Ionicons name="qr-code" size={14} color="#64748B" /><Text style={s.metricText}>{item.qr_generated} QR</Text></View>
          <View style={s.metric}><Ionicons name="cart" size={14} color="#64748B" /><Text style={s.metricText}>{item.sales} vendas</Text></View>
        </View>
        <View style={s.actionRow}>
          <TouchableOpacity style={s.editBtn} onPress={() => openEditForm(item)}>
            <Ionicons name="create-outline" size={16} color="#3B82F6" />
            <Text style={s.editBtnText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleStatusBtn, item.active ? s.togglePauseBtn : s.toggleActivateBtn]}
            onPress={() => toggleOfferStatus(item)}
          >
            <Ionicons name={item.active ? 'pause-circle-outline' : 'play-circle-outline'} size={16} color={item.active ? '#F59E0B' : '#10B981'} />
            <Text style={[s.toggleStatusText, item.active ? s.togglePauseText : s.toggleActivateText]}>{item.active ? 'Pausar' : 'Ativar'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ===== MEDIA HUB MODAL =====
  const renderMediaHub = () => (
    <Modal visible={mediaHubVisible} transparent animationType="slide" onRequestClose={() => setMediaHubVisible(false)}>
      <View style={s.mediaHubOverlay}>
        <View style={s.mediaHubContent}>
          <View style={s.mediaHubHeader}>
            <Text style={s.mediaHubTitle}>Selecionar Foto</Text>
            <TouchableOpacity onPress={() => setMediaHubVisible(false)}>
              <Ionicons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={s.mediaHubGrid}>
            <TouchableOpacity style={s.mediaHubOption} onPress={pickFromCamera}>
              <View style={[s.mediaHubIcon, { backgroundColor: '#064E3B' }]}>
                <Ionicons name="camera" size={28} color="#10B981" />
              </View>
              <Text style={s.mediaHubLabel}>Captura Direta</Text>
              <Text style={s.mediaHubSub}>Usar câmera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.mediaHubOption} onPress={pickFromGallery}>
              <View style={[s.mediaHubIcon, { backgroundColor: '#1E3A5F' }]}>
                <Ionicons name="images" size={28} color="#3B82F6" />
              </View>
              <Text style={s.mediaHubLabel}>Galeria Local</Text>
              <Text style={s.mediaHubSub}>Seus arquivos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.mediaHubOption} onPress={openAiGenerator}>
              <View style={[s.mediaHubIcon, { backgroundColor: '#4C1D95' }]}>
                <Ionicons name="sparkles" size={28} color="#A855F7" />
              </View>
              <Text style={s.mediaHubLabel}>Gerador Criativo IA</Text>
              <Text style={s.mediaHubSub}>Criar com IA</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.mediaHubOption} onPress={() => {}}>
              <View style={[s.mediaHubIcon, { backgroundColor: '#7C2D12' }]}>
                <Ionicons name="globe" size={28} color="#F97316" />
              </View>
              <Text style={s.mediaHubLabel}>Busca Digital</Text>
              <Text style={s.mediaHubSub}>Da internet</Text>
            </TouchableOpacity>
          </View>

          <View style={s.urlInputContainer}>
            <TextInput
              style={s.urlInput}
              placeholder="Ou cole a URL da imagem aqui..."
              placeholderTextColor="#64748B"
              value={imageUrl}
              onChangeText={setImageUrl}
            />
            <TouchableOpacity style={s.urlBtn} onPress={useImageUrl}>
              <Ionicons name="checkmark" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ===== AI PROMPT MODAL =====
  const renderAiPromptModal = () => (
    <Modal visible={aiPromptVisible} transparent animationType="fade" onRequestClose={() => setAiPromptVisible(false)}>
      <View style={s.aiModalOverlay}>
        <View style={s.aiModalContent}>
          <View style={s.aiModalHeader}>
            <View style={s.aiIconContainer}>
              <Ionicons name="sparkles" size={24} color="#A855F7" />
            </View>
            <Text style={s.aiModalTitle}>Gerador Criativo IA</Text>
            <TouchableOpacity onPress={() => setAiPromptVisible(false)}>
              <Ionicons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={s.aiModalSubtitle}>Descreva a imagem que deseja criar:</Text>

          <TextInput
            style={s.aiPromptInput}
            placeholder="Ex: Foto profissional de um hambúrguer gourmet com queijo derretido, bacon crocante, iluminação de estúdio..."
            placeholderTextColor="#64748B"
            value={aiPrompt}
            onChangeText={setAiPrompt}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={s.aiSuggestions}>
            <Text style={s.aiSuggestionsTitle}>Sugestões:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['Foto gourmet', 'Estilo minimalista', 'Cores vibrantes', 'Fundo escuro'].map((sug, i) => (
                <TouchableOpacity key={i} style={s.aiSuggestionChip} onPress={() => setAiPrompt(p => `${p} ${sug}`)}>
                  <Text style={s.aiSuggestionText}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity
            style={[s.aiGenerateBtn, isGeneratingAI && s.aiGenerateBtnDisabled]}
            onPress={generateWithAI}
            disabled={isGeneratingAI}
          >
            {isGeneratingAI ? (
              <>
                <ActivityIndicator size="small" color="#0F172A" />
                <Text style={s.aiGenerateBtnText}>Gerando imagem...</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#0F172A" />
                <Text style={s.aiGenerateBtnText}>Gerar Imagem com IA</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ===== FORM STEP 0: BASIC INFO =====
  const renderStep0 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={s.stepTitle}>Informações da Oferta</Text>

      <TouchableOpacity style={s.imagePicker} onPress={() => setMediaHubVisible(true)} activeOpacity={0.7}>
        {formData.image_base64 ? (
          <Image source={{ uri: formData.image_base64 }} style={s.imagePreview} resizeMode="cover" />
        ) : (
          <View style={s.imagePickerPlaceholder}>
            <Ionicons name="camera" size={32} color="#64748B" />
            <Text style={s.imagePickerText}>Adicionar Foto</Text>
            <Text style={s.imagePickerSub}>Câmera • Galeria • IA • Internet</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={s.fieldLabel}>Título da Oferta *</Text>
      <TextInput style={s.input} placeholder="Ex: Smash Burger Duplo" placeholderTextColor="#64748B"
        value={formData.title} onChangeText={v => setFormData(f => ({ ...f, title: v }))} />

      <View style={s.row}>
        <View style={s.half}>
          <Text style={s.fieldLabel}>Preço Original (R$) *</Text>
          <TextInput style={s.input} placeholder="49.90" placeholderTextColor="#64748B" keyboardType="decimal-pad"
            value={formData.original_price} onChangeText={v => setFormData(f => ({ ...f, original_price: v }))} />
        </View>
        <View style={s.half}>
          <Text style={s.fieldLabel}>Preço com Desconto (R$) *</Text>
          <TextInput style={s.input} placeholder="29.90" placeholderTextColor="#64748B" keyboardType="decimal-pad"
            value={formData.discounted_price} onChangeText={v => setFormData(f => ({ ...f, discounted_price: v }))} />
        </View>
      </View>
      {formData.original_price && formData.discounted_price && calcDiscount() > 0 && (
        <View style={s.discountPreview}>
          <Ionicons name="pricetag" size={18} color="#10B981" />
          <Text style={s.discountPreviewText}>{calcDiscount()}% de desconto</Text>
        </View>
      )}

      <Text style={s.fieldLabel}>Descrição da Oferta</Text>
      <TextInput style={[s.input, s.textArea]} placeholder="Descreva sua oferta: ingredientes, tamanho, detalhes..." placeholderTextColor="#64748B"
        multiline numberOfLines={4} textAlignVertical="top"
        value={formData.description} onChangeText={v => setFormData(f => ({ ...f, description: v }))} />

      <TouchableOpacity style={s.nextBtn} onPress={() => setFormStep(1)} activeOpacity={0.8}>
        <Text style={s.nextBtnText}>Próximo: Regras de Uso</Text>
        <Ionicons name="arrow-forward" size={18} color="#0F172A" />
      </TouchableOpacity>
    </ScrollView>
  );

  // ===== FORM STEP 1: SMART RULES =====
  const renderStep1 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={s.stepTitle}>Regras e Condições</Text>

      {/* Days */}
      <Text style={s.fieldLabel}>Dias de Validade</Text>
      <View style={s.daysRow}>
        {WEEKDAYS.map(day => (
          <TouchableOpacity key={day} style={[s.dayChip, formData.valid_days.includes(day) && s.dayChipActive]} onPress={() => toggleDay(day)}>
            <Text style={[s.dayChipText, formData.valid_days.includes(day) && s.dayChipTextActive]}>{day}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Hours */}
      <Text style={s.fieldLabel}>Horário de Validade</Text>
      <View style={s.row}>
        <View style={s.half}>
          <TextInput style={s.input} placeholder="11:00" placeholderTextColor="#64748B"
            value={formData.valid_hours_start} onChangeText={v => setFormData(f => ({ ...f, valid_hours_start: v }))} />
        </View>
        <Text style={s.hoursSeparator}>às</Text>
        <View style={s.half}>
          <TextInput style={s.input} placeholder="22:00" placeholderTextColor="#64748B"
            value={formData.valid_hours_end} onChangeText={v => setFormData(f => ({ ...f, valid_hours_end: v }))} />
        </View>
      </View>

      {/* Consumption Mode */}
      <Text style={s.fieldLabel}>Modo de Consumo</Text>
      <View style={s.switchRow}>
        <View style={s.switchItem}>
          <Ionicons name="restaurant" size={20} color={formData.dine_in_only ? '#10B981' : '#64748B'} />
          <Text style={s.switchLabel}>Consumo Local</Text>
          <Switch value={formData.dine_in_only} onValueChange={v => setFormData(f => ({ ...f, dine_in_only: v }))}
            trackColor={{ false: '#334155', true: '#064E3B' }} thumbColor={formData.dine_in_only ? '#10B981' : '#94A3B8'} />
        </View>
        <View style={s.switchItem}>
          <Ionicons name="bicycle" size={20} color={formData.delivery_allowed ? '#10B981' : '#64748B'} />
          <Text style={s.switchLabel}>Permite Delivery</Text>
          <Switch value={formData.delivery_allowed} onValueChange={v => setFormData(f => ({ ...f, delivery_allowed: v }))}
            trackColor={{ false: '#334155', true: '#064E3B' }} thumbColor={formData.delivery_allowed ? '#10B981' : '#94A3B8'} />
        </View>
        <View style={s.switchItem}>
          <Ionicons name="bag-handle" size={20} color={formData.pickup_allowed ? '#10B981' : '#64748B'} />
          <Text style={s.switchLabel}>Retirada no Balcão</Text>
          <Switch value={formData.pickup_allowed} onValueChange={v => setFormData(f => ({ ...f, pickup_allowed: v }))}
            trackColor={{ false: '#334155', true: '#064E3B' }} thumbColor={formData.pickup_allowed ? '#10B981' : '#94A3B8'} />
        </View>
      </View>

      {/* Professional Rules Checklist */}
      <Text style={s.fieldLabel}>Regras Padrão (selecione as aplicáveis)</Text>
      <View style={s.rulesChecklist}>
        {PROFESSIONAL_RULES.map(rule => (
          <TouchableOpacity
            key={rule.id}
            style={[s.ruleItem, formData.selectedRules.includes(rule.id) && s.ruleItemActive]}
            onPress={() => toggleRule(rule.id)}
          >
            <View style={[s.ruleCheckbox, formData.selectedRules.includes(rule.id) && s.ruleCheckboxActive]}>
              {formData.selectedRules.includes(rule.id) && <Ionicons name="checkmark" size={14} color="#0F172A" />}
            </View>
            <Text style={[s.ruleText, formData.selectedRules.includes(rule.id) && s.ruleTextActive]}>{rule.text}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom Rules */}
      <Text style={s.fieldLabel}>Regras Adicionais (opcional)</Text>
      <TextInput style={[s.input, s.textArea]} placeholder="Adicione regras personalizadas aqui..." placeholderTextColor="#64748B"
        multiline numberOfLines={3} textAlignVertical="top"
        value={formData.customRules} onChangeText={v => setFormData(f => ({ ...f, customRules: v }))} />

      <View style={s.navBtns}>
        <TouchableOpacity style={s.backStepBtn} onPress={() => setFormStep(0)}>
          <Ionicons name="arrow-back" size={18} color="#94A3B8" />
          <Text style={s.backStepText}>Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.nextBtn} onPress={() => setFormStep(2)} activeOpacity={0.8}>
          <Text style={s.nextBtnText}>Próximo: Localização</Text>
          <Ionicons name="arrow-forward" size={18} color="#0F172A" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ===== FORM STEP 2: LOCATION =====
  const renderStep2 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={s.stepTitle}>Confirmação de Localização</Text>

      <View style={s.profileDataCard}>
        <View style={s.profileDataHeader}>
          <Ionicons name="business" size={20} color="#10B981" />
          <Text style={s.profileDataTitle}>Dados do Estabelecimento</Text>
        </View>
        <Text style={s.profileDataSub}>Puxados automaticamente do seu perfil</Text>

        <View style={s.profileField}>
          <Ionicons name="storefront" size={18} color="#64748B" />
          <View style={s.profileFieldContent}>
            <Text style={s.profileFieldLabel}>Estabelecimento</Text>
            <Text style={s.profileFieldValue}>{establishment?.business_name || 'Não informado'}</Text>
          </View>
        </View>

        <View style={s.profileField}>
          <Ionicons name="location" size={18} color="#64748B" />
          <View style={s.profileFieldContent}>
            <Text style={s.profileFieldLabel}>Endereço</Text>
            <Text style={s.profileFieldValue}>{establishment?.address || 'Não informado'}</Text>
          </View>
        </View>

        <View style={s.profileField}>
          <Ionicons name="grid" size={18} color="#64748B" />
          <View style={s.profileFieldContent}>
            <Text style={s.profileFieldLabel}>Categoria</Text>
            <Text style={s.profileFieldValue}>{establishment?.category || 'Não informado'}</Text>
          </View>
        </View>

        {(establishment as any)?.history && (
          <View style={s.profileField}>
            <Ionicons name="book" size={18} color="#64748B" />
            <View style={s.profileFieldContent}>
              <Text style={s.profileFieldLabel}>Minha História</Text>
              <Text style={s.profileFieldValue} numberOfLines={3}>{(establishment as any).history}</Text>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity style={s.editProfileBtn} onPress={openProfileEdit}>
        <Ionicons name="create-outline" size={18} color="#3B82F6" />
        <Text style={s.editProfileBtnText}>Editar dados do perfil</Text>
      </TouchableOpacity>

      <View style={s.navBtns}>
        <TouchableOpacity style={s.backStepBtn} onPress={() => setFormStep(1)}>
          <Ionicons name="arrow-back" size={18} color="#94A3B8" />
          <Text style={s.backStepText}>Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.nextBtn} onPress={() => setFormStep(3)} activeOpacity={0.8}>
          <Text style={s.nextBtnText}>Próximo: Ver Anúncio</Text>
          <Ionicons name="arrow-forward" size={18} color="#0F172A" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ===== FORM STEP 3: FULL LIVE PREVIEW =====
  const renderStep3 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={s.previewHeader}>
        <Ionicons name="eye" size={20} color="#10B981" />
        <Text style={s.previewTitle}>Preview do Anúncio</Text>
      </View>
      <Text style={s.previewSub}>Exatamente como o cliente verá</Text>

      {/* Full Mirror Preview Card */}
      <View style={s.previewCard}>
        {formData.image_base64 ? (
          <Image source={{ uri: formData.image_base64 }} style={s.previewImage} resizeMode="cover" />
        ) : (
          <View style={s.previewImagePlaceholder}>
            <Ionicons name="image" size={40} color="#334155" />
          </View>
        )}

        {calcDiscount() > 0 && (
          <View style={s.previewBadge}>
            <Text style={s.previewBadgeText}>{calcDiscount()}% OFF</Text>
          </View>
        )}

        <View style={s.previewBody}>
          <View style={s.previewEstablishment}>
            <Ionicons name="business" size={14} color="#64748B" />
            <Text style={s.previewEstName}>{establishment?.business_name}</Text>
            <Text style={s.previewEstSeparator}>•</Text>
            <Ionicons name="location" size={14} color="#64748B" />
            <Text style={s.previewEstLocation} numberOfLines={1}>{establishment?.address}</Text>
          </View>

          <Text style={s.previewOfferTitle}>{formData.title || 'Título da Oferta'}</Text>

          <View style={s.previewPrices}>
            <Text style={s.previewOldPrice}>R$ {parseFloat(formData.original_price || '0').toFixed(2)}</Text>
            <Text style={s.previewNewPrice}>R$ {parseFloat(formData.discounted_price || '0').toFixed(2)}</Text>
          </View>

          {formData.description && (
            <Text style={s.previewDescription}>{formData.description}</Text>
          )}

          {/* Schedule */}
          <View style={s.previewSchedule}>
            <View style={s.previewScheduleItem}>
              <Ionicons name="calendar" size={14} color="#64748B" />
              <Text style={s.previewScheduleText}>{formData.valid_days.join(', ')}</Text>
            </View>
            <View style={s.previewScheduleItem}>
              <Ionicons name="time" size={14} color="#64748B" />
              <Text style={s.previewScheduleText}>{formData.valid_hours_start} às {formData.valid_hours_end}</Text>
            </View>
          </View>

          {/* Rules */}
          {(formData.selectedRules.length > 0 || formData.customRules) && (
            <View style={s.previewRules}>
              <View style={s.previewRulesHeader}>
                <Ionicons name="document-text" size={14} color="#F59E0B" />
                <Text style={s.previewRulesTitle}>REGRAS DA OFERTA</Text>
              </View>
              <Text style={s.previewRulesText}>{getSelectedRulesText()}</Text>
            </View>
          )}

          {/* History */}
          {(establishment as any)?.history && (
            <View style={s.previewHistory}>
              <Text style={s.previewHistoryTitle}>Sobre o estabelecimento</Text>
              <Text style={s.previewHistoryText} numberOfLines={3}>{(establishment as any).history}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={s.navBtns}>
        <TouchableOpacity style={s.backStepBtn} onPress={() => setFormStep(2)}>
          <Ionicons name="arrow-back" size={18} color="#94A3B8" />
          <Text style={s.backStepText}>Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={s.publishBtn} 
          onPress={() => {
            console.log('[PublishButton] Button pressed!');
            handleSubmitOffer();
          }} 
          disabled={isCreating} 
          activeOpacity={0.8}
          data-testid="publish-offer-btn"
        >
          {isCreating ? <ActivityIndicator size="small" color="#0F172A" /> : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#0F172A" />
              <Text style={s.publishBtnText}>{isEditing ? 'Salvar Alterações' : 'Publicar Oferta'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ===== MAIN RENDER =====
  if (isLoading) {
    return (
      <View style={[s.container, s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBack}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Minhas Ofertas</Text>
        <TouchableOpacity style={s.headerAddBtn} onPress={openCreateForm}>
          <Ionicons name="add" size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {offers.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="pricetags-outline" size={56} color="#334155" />
          <Text style={s.emptyTitle}>Nenhuma oferta criada</Text>
          <Text style={s.emptyText}>Crie sua primeira oferta e atraia clientes!</Text>
          <TouchableOpacity style={s.createFirstBtn} onPress={openCreateForm}>
            <Ionicons name="add-circle" size={20} color="#0F172A" />
            <Text style={s.createFirstText}>Criar Primeira Oferta</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={offers}
          renderItem={renderOfferCard}
          keyExtractor={item => item.offer_id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" colors={['#10B981']} />}
        />
      )}

      {/* CREATE/EDIT OFFER MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => { setModalVisible(false); setEditingOfferId(null); }}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => { setModalVisible(false); setEditingOfferId(null); }}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
              <Text style={s.modalTitle}>{isEditing ? 'Editar Oferta' : 'Nova Oferta'}</Text>
              <Text style={s.modalStep}>{formStep + 1}/4</Text>
            </View>

            <View style={s.stepIndicator}>
              {[0, 1, 2, 3].map(i => (
                <TouchableOpacity key={i} style={[s.stepDot, formStep >= i && s.stepDotActive]} onPress={() => setFormStep(i)} />
              ))}
            </View>

            {formStep === 0 && renderStep0()}
            {formStep === 1 && renderStep1()}
            {formStep === 2 && renderStep2()}
            {formStep === 3 && renderStep3()}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {renderMediaHub()}
      {renderAiPromptModal()}

      {/* PROFILE EDIT MODAL */}
      <Modal visible={profileEditVisible} transparent animationType="slide" onRequestClose={() => setProfileEditVisible(false)}>
        <View style={s.profileEditOverlay}>
          <View style={s.profileEditContent}>
            <View style={s.profileEditHeader}>
              <Text style={s.profileEditTitle}>Editar Perfil</Text>
              <TouchableOpacity onPress={() => setProfileEditVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.fieldLabel}>Nome do Estabelecimento</Text>
              <TextInput
                style={s.input}
                placeholder="Nome do estabelecimento"
                placeholderTextColor="#64748B"
                value={editProfileData.business_name}
                onChangeText={v => setEditProfileData(p => ({ ...p, business_name: v }))}
              />

              <Text style={s.fieldLabel}>Endereço</Text>
              <TextInput
                style={[s.input, s.textArea]}
                placeholder="Endereço completo"
                placeholderTextColor="#64748B"
                value={editProfileData.address}
                onChangeText={v => setEditProfileData(p => ({ ...p, address: v }))}
                multiline
              />

              <Text style={s.fieldLabel}>Minha História</Text>
              <TextInput
                style={[s.input, s.textArea]}
                placeholder="Conte a história do seu estabelecimento..."
                placeholderTextColor="#64748B"
                value={editProfileData.history}
                onChangeText={v => setEditProfileData(p => ({ ...p, history: v }))}
                multiline
                numberOfLines={4}
              />

              <Text style={s.fieldLabel}>Instagram</Text>
              <TextInput
                style={s.input}
                placeholder="@seuinstagram"
                placeholderTextColor="#64748B"
                value={editProfileData.instagram}
                onChangeText={v => setEditProfileData(p => ({ ...p, instagram: v }))}
              />

              <TouchableOpacity style={s.saveProfileBtn} onPress={saveProfileEdit}>
                <Ionicons name="checkmark-circle" size={20} color="#0F172A" />
                <Text style={s.saveProfileBtnText}>Salvar Alterações</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  headerBack: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#FFF' },
  headerAddBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  offerCard: { backgroundColor: '#1E293B', borderRadius: 14, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  offerCardInactive: { opacity: 0.65 },
  offerImage: { width: '100%', height: 140 },
  offerBody: { padding: 14 },
  offerTopRow: { flexDirection: 'column', gap: 6, marginBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  offerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#FFF' },
  codeChip: { backgroundColor: '#1E3A5F', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#3B82F6' },
  codeChipText: { fontSize: 10, fontWeight: '700', color: '#60A5FA', fontFamily: 'monospace' },
  badgesRow: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeGreen: { backgroundColor: '#064E3B' },
  badgeRed: { backgroundColor: '#7F1D1D' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#10B981' },
  badgeTextRed: { color: '#EF4444' },
  badgeSimulation: { backgroundColor: '#78350F', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B' },
  badgeSimulationText: { fontSize: 10, fontWeight: '700', color: '#FCD34D' },
  offerDesc: { fontSize: 13, color: '#94A3B8', marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  oldPrice: { fontSize: 13, color: '#64748B', textDecorationLine: 'line-through' },
  newPrice: { fontSize: 18, fontWeight: '700', color: '#10B981' },
  discountChip: { backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  discountChipText: { fontSize: 11, fontWeight: '700', color: '#0F172A' },
  metricsRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricText: { fontSize: 12, color: '#64748B' },
  actionRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 10 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1E3A5F', borderWidth: 1, borderColor: '#3B82F6' },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#3B82F6' },
  toggleStatusBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  togglePauseBtn: { backgroundColor: '#422006', borderColor: '#F59E0B' },
  toggleActivateBtn: { backgroundColor: '#064E3B', borderColor: '#10B981' },
  toggleStatusText: { fontSize: 13, fontWeight: '600' },
  togglePauseText: { color: '#F59E0B' },
  toggleActivateText: { color: '#10B981' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#94A3B8', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 6 },
  createFirstBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 24 },
  createFirstText: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0F172A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  modalStep: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  stepIndicator: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  stepDot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#334155' },
  stepDotActive: { backgroundColor: '#10B981' },
  stepTitle: { fontSize: 16, fontWeight: '700', color: '#10B981', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#CBD5E1', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#1E293B', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#FFF', borderWidth: 1, borderColor: '#334155' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  imagePicker: { borderRadius: 14, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed' },
  imagePreview: { width: '100%', height: 180 },
  imagePickerPlaceholder: { height: 140, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E293B' },
  imagePickerText: { fontSize: 13, color: '#64748B', marginTop: 6 },
  imagePickerSub: { fontSize: 11, color: '#475569', marginTop: 4 },
  discountPreview: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#064E3B', padding: 12, borderRadius: 10, marginTop: 8 },
  discountPreviewText: { fontSize: 14, fontWeight: '700', color: '#10B981' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  dayChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  dayChipActive: { backgroundColor: '#064E3B', borderColor: '#10B981' },
  dayChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  dayChipTextActive: { color: '#10B981' },
  hoursSeparator: { fontSize: 14, color: '#64748B', alignSelf: 'center', marginHorizontal: 4 },
  switchRow: { gap: 8, marginTop: 4 },
  switchItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', padding: 14, borderRadius: 10, gap: 10, borderWidth: 1, borderColor: '#334155' },
  switchLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#CBD5E1' },
  
  // Rules Checklist
  rulesChecklist: { gap: 8, marginTop: 8 },
  ruleItem: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#1E293B', padding: 12, borderRadius: 10, gap: 10, borderWidth: 1, borderColor: '#334155' },
  ruleItemActive: { backgroundColor: '#064E3B', borderColor: '#10B981' },
  ruleCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#475569', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  ruleCheckboxActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  ruleText: { flex: 1, fontSize: 13, color: '#94A3B8', lineHeight: 18 },
  ruleTextActive: { color: '#D1FAE5' },

  navBtns: { flexDirection: 'row', gap: 10, marginTop: 24, marginBottom: 20 },
  backStepBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  backStepText: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 10 },
  nextBtnText: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  publishBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 10 },
  publishBtnText: { fontSize: 15, fontWeight: '700', color: '#0F172A' },

  // Media Hub
  mediaHubOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  mediaHubContent: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  mediaHubHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  mediaHubTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  mediaHubGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  mediaHubOption: { width: '47%', backgroundColor: '#0F172A', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  mediaHubIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  mediaHubLabel: { fontSize: 13, fontWeight: '600', color: '#FFF', textAlign: 'center' },
  mediaHubSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  urlInputContainer: { flexDirection: 'row', gap: 10, marginTop: 8 },
  urlInput: { flex: 1, backgroundColor: '#0F172A', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#FFF', borderWidth: 1, borderColor: '#334155' },
  urlBtn: { width: 44, height: 44, backgroundColor: '#10B981', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  // AI Prompt Modal
  aiModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  aiModalContent: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20 },
  aiModalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  aiIconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#4C1D95', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  aiModalTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#FFF' },
  aiModalSubtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 12 },
  aiPromptInput: { backgroundColor: '#0F172A', borderRadius: 12, padding: 16, fontSize: 15, color: '#FFF', borderWidth: 1, borderColor: '#334155', minHeight: 120, textAlignVertical: 'top' },
  aiSuggestions: { marginTop: 12 },
  aiSuggestionsTitle: { fontSize: 12, color: '#64748B', marginBottom: 8 },
  aiSuggestionChip: { backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  aiSuggestionText: { fontSize: 12, color: '#CBD5E1' },
  aiGenerateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#A855F7', paddingVertical: 16, borderRadius: 12, marginTop: 20 },
  aiGenerateBtnDisabled: { opacity: 0.7 },
  aiGenerateBtnText: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

  // Profile Data Card
  profileDataCard: { backgroundColor: '#1E293B', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#334155' },
  profileDataHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  profileDataTitle: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  profileDataSub: { fontSize: 12, color: '#64748B', marginBottom: 16 },
  profileField: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155' },
  profileFieldContent: { flex: 1 },
  profileFieldLabel: { fontSize: 11, color: '#64748B', marginBottom: 2 },
  profileFieldValue: { fontSize: 14, color: '#E2E8F0' },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#3B82F6' },
  editProfileBtnText: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },

  // Preview
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  previewTitle: { fontSize: 16, fontWeight: '700', color: '#10B981' },
  previewSub: { fontSize: 12, color: '#64748B', marginBottom: 16 },
  previewCard: { backgroundColor: '#1E293B', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  previewImage: { width: '100%', height: 180 },
  previewImagePlaceholder: { width: '100%', height: 120, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  previewBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  previewBadgeText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  previewBody: { padding: 16 },
  previewEstablishment: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8, flexWrap: 'wrap' },
  previewEstName: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  previewEstSeparator: { color: '#475569', marginHorizontal: 4 },
  previewEstLocation: { fontSize: 12, color: '#64748B', flex: 1 },
  previewOfferTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 8 },
  previewPrices: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  previewOldPrice: { fontSize: 16, color: '#64748B', textDecorationLine: 'line-through' },
  previewNewPrice: { fontSize: 24, fontWeight: '800', color: '#10B981' },
  previewDescription: { fontSize: 14, color: '#CBD5E1', lineHeight: 20, marginBottom: 12 },
  previewSchedule: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  previewScheduleItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewScheduleText: { fontSize: 12, color: '#64748B' },
  previewRules: { backgroundColor: '#422006', borderRadius: 10, padding: 12, marginBottom: 12 },
  previewRulesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  previewRulesTitle: { fontSize: 11, fontWeight: '700', color: '#F59E0B' },
  previewRulesText: { fontSize: 12, color: '#FCD34D', lineHeight: 18 },
  previewHistory: { backgroundColor: '#0F172A', borderRadius: 10, padding: 12 },
  previewHistoryTitle: { fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  previewHistoryText: { fontSize: 12, color: '#94A3B8', lineHeight: 18 },

  // Profile Edit Modal
  profileEditOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  profileEditContent: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  profileEditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  profileEditTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  saveProfileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12, marginTop: 24, marginBottom: 20 },
  saveProfileBtnText: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Share,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';

interface ShareInviteModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'friend' | 'establishment';
  userName: string;
  referralCode: string;
  mediaData?: any;
}

export const ShareInviteModal: React.FC<ShareInviteModalProps> = ({
  visible,
  onClose,
  type,
  userName,
  referralCode,
  mediaData,
}) => {
  const [recipientName, setRecipientName] = useState('');
  const [dynamicLink, setDynamicLink] = useState('');
  const [preparingShare, setPreparingShare] = useState(false);
  const [showCopiedStep, setShowCopiedStep] = useState(false);
  const isFriend = type === 'friend';

  useEffect(() => {
    if (visible && referralCode) {
      api.getReferralShareLink()
        .then((data) => {
          setDynamicLink(data.share_link);
        })
        .catch(() => {
          const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://draft-offer-mode.preview.emergentagent.com';
          const cleanUrl = baseUrl.replace('/api', '').replace(/\/$/, '');
          setDynamicLink(`${cleanUrl}?ref=${referralCode}`);
        });
    }
  }, [visible, referralCode]);

  const appLink = dynamicLink || (() => {
    const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://draft-offer-mode.preview.emergentagent.com';
    const cleanUrl = baseUrl.replace('/api', '').replace(/\/$/, '');
    return `${cleanUrl}?ref=${referralCode}`;
  })();

  const getMessage = () => {
    const name = recipientName.trim();
    if (isFriend) {
      const greeting = name ? `Ola, ${name}!` : 'Ola!';
      return `${greeting} Olha que aplicativo fantastico onde voce ganha descontos e pode ate sair de graca sua compra, e so ajudar a divulgar e ganhar bonus. Veja como funciona aqui: ${appLink}`;
    } else {
      const estName = name || 'Responsavel';
      const senderName = userName || 'Um amigo';
      return `Ola, ${estName}! O ${senderName} indicou o iToke para o seu estabelecimento. Aumente suas vendas com nosso sistema de tokens e fidelidade! Veja como funciona aqui: ${appLink}`;
    }
  };

  // Convert data URI to Blob for Web Share API
  const dataURItoBlob = (dataURI: string): Blob => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  const shareWithMedia = async (target: 'whatsapp' | 'native' | 'instagram') => {
    setPreparingShare(true);
    const message = getMessage();
    
    try {
      // Try Web Share API with file (Chrome 76+, Safari 15+)
      if (mediaData?.url && typeof navigator !== 'undefined' && (navigator as any).share && (navigator as any).canShare) {
        let file: File | null = null;
        
        if (mediaData.url.startsWith('data:')) {
          const blob = dataURItoBlob(mediaData.url);
          const ext = mediaData.type === 'video' ? 'mp4' : 'png';
          file = new File([blob], `itoke_media.${ext}`, { type: blob.type });
        } else if (mediaData.url.startsWith('http')) {
          try {
            const resp = await fetch(mediaData.url);
            const blob = await resp.blob();
            const ext = mediaData.type === 'video' ? 'mp4' : 'png';
            file = new File([blob], `itoke_media.${ext}`, { type: blob.type });
          } catch {
            // File fetch failed, share text only
          }
        }

        // For Instagram: copy text to clipboard so user can paste it
        if (target === 'instagram' && typeof navigator !== 'undefined' && navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(message);
          } catch {}
        }

        const shareData: any = { text: message, title: 'iToke - Convite' };
        if (file && (navigator as any).canShare({ files: [file] })) {
          shareData.files = [file];
        }

        await (navigator as any).share(shareData);
        handleClose();
        return;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.log('Web Share API failed, falling back:', err);
      } else {
        handleClose();
        return;
      }
    } finally {
      setPreparingShare(false);
    }

    // Fallback: share text only via WhatsApp or native
    if (target === 'whatsapp') {
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
      try {
        const supported = await Linking.canOpenURL(whatsappUrl);
        if (supported) {
          await Linking.openURL(whatsappUrl);
        } else {
          await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
        }
      } catch {
        await Share.share({ message });
      }
    } else {
      await Share.share({ message });
    }
    handleClose();
  };

  const handleShareWhatsApp = async () => {
    Keyboard.dismiss();
    if (mediaData?.url) {
      await shareWithMedia('whatsapp');
    } else {
      const message = getMessage();
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
      try {
        const supported = await Linking.canOpenURL(whatsappUrl);
        if (supported) {
          await Linking.openURL(whatsappUrl);
        } else {
          await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
        }
        handleClose();
      } catch (error) {
        console.error('WhatsApp share error:', error);
        handleShareNative();
      }
    }
  };

  const handleShareEmail = async () => {
    Keyboard.dismiss();
    const message = getMessage();
    const subject = isFriend
      ? `${userName || 'Alguem'} te convidou para o iToke!`
      : `Convite iToke para seu estabelecimento`;
    const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(emailUrl);
      handleClose();
    } catch (error) {
      console.error('Email share error:', error);
      handleShareNative();
    }
  };

  const handleShareInstagram = async () => {
    Keyboard.dismiss();
    const message = getMessage();

    // Copy text to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try { await navigator.clipboard.writeText(message); } catch {}
    }

    if (mediaData?.url) {
      // Show intermediate "text copied" step before sharing
      setShowCopiedStep(true);
    } else {
      try {
        await Share.share({ message });
      } catch {
        // ignore
      }
      handleClose();
    }
  };

  const handleContinueInstagramShare = async () => {
    setShowCopiedStep(false);
    await shareWithMedia('instagram');
  };

  const handleShareNative = async () => {
    Keyboard.dismiss();
    if (mediaData?.url) {
      await shareWithMedia('native');
    } else {
      const message = getMessage();
      try {
        await Share.share({ message });
        handleClose();
      } catch (error) {
        console.error('Share error:', error);
      }
    }
  };

  const handleClose = () => {
    setRecipientName('');
    setPreparingShare(false);
    setShowCopiedStep(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.overlayTouchable} onPress={handleClose} activeOpacity={1} />
        <View style={styles.container}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: isFriend ? '#10B98120' : '#3B82F620' }]}>
              <Ionicons
                name={isFriend ? 'person-add' : 'business'}
                size={28}
                color={isFriend ? '#10B981' : '#3B82F6'}
              />
            </View>
            <Text style={styles.title}>
              {isFriend ? 'Indicar Amigo' : 'Indicar Estabelecimento'}
            </Text>
            <Text style={styles.subtitle}>
              {isFriend
                ? 'Ganhe R$1 por cada compra do seu indicado (3 niveis)'
                : 'Ganhe R$1 por venda da loja por 12 meses'}
            </Text>
          </View>

          {/* Media Preview */}
          {mediaData?.url && mediaData.type === 'image' && (
            <View style={styles.mediaPreviewRow} data-testid="share-media-preview">
              <Image source={{ uri: mediaData.url }} style={styles.mediaPreviewThumb} resizeMode="cover" />
              <View style={styles.mediaPreviewInfo}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.mediaPreviewText}>Midia sera compartilhada</Text>
              </View>
            </View>
          )}

          {/* Name Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>
              {isFriend ? 'Nome do amigo(a)' : 'Nome do responsavel'}
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder={isFriend ? 'Ex: Maria' : 'Ex: Joao da Padaria'}
                placeholderTextColor="#475569"
                value={recipientName}
                onChangeText={setRecipientName}
                autoCapitalize="words"
                autoFocus={false}
              />
            </View>
          </View>

          {/* Message Preview */}
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>Previa da mensagem:</Text>
            <View style={styles.previewBox}>
              <Text style={styles.previewText} numberOfLines={4}>
                {getMessage()}
              </Text>
            </View>
          </View>

          {/* Preparing Share Loading */}
          {preparingShare && (
            <View style={styles.preparingRow} data-testid="share-preparing-indicator">
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.preparingText}>Preparando midia para compartilhar...</Text>
            </View>
          )}

          {/* Instagram "Text Copied" intermediate step */}
          {showCopiedStep && (
            <View style={styles.copiedStepOverlay} data-testid="instagram-copied-step">
              <View style={styles.copiedStepCard}>
                <View style={styles.copiedCheckCircle}>
                  <Ionicons name="checkmark" size={32} color="#FFF" />
                </View>
                <Text style={styles.copiedTitle}>Texto de convite copiado!</Text>
                <Text style={styles.copiedDesc}>
                  O Instagram nao envia texto junto com a midia. O texto de convite ja foi copiado para a area de transferencia.
                </Text>
                <Text style={styles.copiedInstruction}>
                  Ao abrir o Instagram, cole o texto na mensagem junto com a midia.
                </Text>

                <View style={styles.copiedPreviewBox}>
                  <Text style={styles.copiedPreviewText} numberOfLines={3}>{getMessage()}</Text>
                </View>

                <TouchableOpacity
                  style={styles.copiedContinueBtn}
                  onPress={handleContinueInstagramShare}
                  data-testid="instagram-continue-btn"
                >
                  <Ionicons name="logo-instagram" size={20} color="#FFF" />
                  <Text style={styles.copiedContinueBtnText}>Abrir compartilhamento</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.copiedCancelBtn} onPress={() => setShowCopiedStep(false)}>
                  <Text style={styles.copiedCancelBtnText}>Voltar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Share Buttons */}
          <View style={styles.shareButtons}>
            <TouchableOpacity
              style={[styles.shareBtn, styles.shareBtnWhatsApp]}
              onPress={handleShareWhatsApp}
              disabled={preparingShare}
              data-testid="share-whatsapp-btn"
            >
              <Ionicons name="logo-whatsapp" size={22} color="#FFF" />
              <Text style={styles.shareBtnText}>WhatsApp</Text>
              {mediaData?.url && <Ionicons name="attach" size={14} color="#FFF" style={{ marginLeft: -4 }} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareBtn, styles.shareBtnEmail]}
              onPress={handleShareEmail}
              disabled={preparingShare}
              data-testid="share-email-btn"
            >
              <Ionicons name="mail" size={22} color="#FFF" />
              <Text style={styles.shareBtnText}>E-mail</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareBtn, styles.shareBtnInstagram]}
              onPress={handleShareInstagram}
              disabled={preparingShare}
              data-testid="share-instagram-btn"
            >
              <Ionicons name="logo-instagram" size={22} color="#FFF" />
              <Text style={styles.shareBtnText}>Instagram</Text>
              {mediaData?.url && <Ionicons name="attach" size={14} color="#FFF" style={{ marginLeft: -4 }} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareBtn, styles.shareBtnOther]}
              onPress={handleShareNative}
              disabled={preparingShare}
              data-testid="share-other-btn"
            >
              <Ionicons name="share-social" size={22} color="#FFF" />
              <Text style={styles.shareBtnText}>Outras</Text>
              {mediaData?.url && <Ionicons name="attach" size={14} color="#FFF" style={{ marginLeft: -4 }} />}
            </TouchableOpacity>
          </View>

          {mediaData?.url && (
            <View style={styles.clipboardHint} data-testid="share-clipboard-hint">
              <Ionicons name="clipboard" size={14} color="#F59E0B" />
              <Text style={styles.clipboardHintText}>
                O texto de convite sera copiado automaticamente para voce colar na mensagem
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  container: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 34,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  mediaPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    gap: 10,
  },
  mediaPreviewThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  mediaPreviewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  mediaPreviewText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 14,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  previewBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewText: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 20,
  },
  preparingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A5F',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  preparingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#60A5FA',
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  shareBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 4,
  },
  shareBtnWhatsApp: {
    backgroundColor: '#25D366',
  },
  shareBtnEmail: {
    backgroundColor: '#3B82F6',
  },
  shareBtnInstagram: {
    backgroundColor: '#E1306C',
  },
  shareBtnOther: {
    backgroundColor: '#64748B',
  },
  shareBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#334155',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94A3B8',
  },
  clipboardHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#78350F20',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  clipboardHintText: {
    fontSize: 12,
    color: '#F59E0B',
    flex: 1,
    lineHeight: 16,
  },
  copiedStepOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E293BF5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 20,
  },
  copiedStepCard: {
    alignItems: 'center',
    width: '100%',
  },
  copiedCheckCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  copiedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  copiedDesc: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 6,
  },
  copiedInstruction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  copiedPreviewBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
    width: '100%',
  },
  copiedPreviewText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  copiedContinueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E1306C',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    gap: 10,
    width: '100%',
    marginBottom: 10,
  },
  copiedContinueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  copiedCancelBtn: {
    paddingVertical: 12,
  },
  copiedCancelBtnText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
});

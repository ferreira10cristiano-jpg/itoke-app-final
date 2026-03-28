import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ShareInviteModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'friend' | 'establishment';
  userName: string;
  referralCode: string;
}

export const ShareInviteModal: React.FC<ShareInviteModalProps> = ({
  visible,
  onClose,
  type,
  userName,
  referralCode,
}) => {
  const [recipientName, setRecipientName] = useState('');
  const isFriend = type === 'friend';

  const appLink = `https://itoke-offers.preview.emergentagent.com/?ref=${referralCode}`;

  const getMessage = () => {
    const name = recipientName.trim() || (isFriend ? 'Amigo(a)' : 'Responsável');
    const senderName = userName || 'Um amigo';

    if (isFriend) {
      return `Olá, ${name}! O ${senderName} te enviou este link exclusivo para você conhecer o iToke. 🎫✨ Ele já está curtindo descontos incríveis de até 50% e economizando muito! Bora aproveitar também? Clique aqui e já comece com 5 tokens grátis: ${appLink}`;
    } else {
      return `Olá, ${name}! O ${senderName} indicou o iToke para o seu estabelecimento. Aumente suas vendas com nosso sistema de tokens e fidelidade! Veja como funciona aqui: ${appLink}`;
    }
  };

  const handleShareWhatsApp = async () => {
    Keyboard.dismiss();
    const message = getMessage();
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to web WhatsApp
        await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
      }
      handleClose();
    } catch (error) {
      console.error('WhatsApp share error:', error);
      // Fallback to native share
      handleShareNative();
    }
  };

  const handleShareEmail = async () => {
    Keyboard.dismiss();
    const message = getMessage();
    const subject = isFriend
      ? `${userName || 'Alguém'} te convidou para o iToke! 🎫`
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

  const handleShareNative = async () => {
    Keyboard.dismiss();
    const message = getMessage();
    try {
      await Share.share({ message });
      handleClose();
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleClose = () => {
    setRecipientName('');
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
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
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
                ? 'Ganhe R$1 por cada compra do seu indicado (3 níveis)'
                : 'Ganhe R$1 por venda da loja por 12 meses'}
            </Text>
          </View>

          {/* Name Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>
              {isFriend ? 'Nome do amigo(a)' : 'Nome do responsável'}
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder={isFriend ? 'Ex: Maria' : 'Ex: João da Padaria'}
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
            <Text style={styles.previewLabel}>Prévia da mensagem:</Text>
            <View style={styles.previewBox}>
              <Text style={styles.previewText} numberOfLines={4}>
                {getMessage()}
              </Text>
            </View>
          </View>

          {/* Share Buttons */}
          <View style={styles.shareButtons}>
            <TouchableOpacity style={styles.whatsappButton} onPress={handleShareWhatsApp}>
              <Ionicons name="logo-whatsapp" size={22} color="#FFFFFF" />
              <Text style={styles.whatsappText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.emailButton} onPress={handleShareEmail}>
              <Ionicons name="mail" size={22} color="#FFFFFF" />
              <Text style={styles.emailText}>E-mail</Text>
            </TouchableOpacity>
          </View>

          {/* Other share */}
          <TouchableOpacity style={styles.otherShare} onPress={handleShareNative}>
            <Ionicons name="share-outline" size={18} color="#94A3B8" />
            <Text style={styles.otherShareText}>Compartilhar de outra forma</Text>
          </TouchableOpacity>

          {/* Referral Code */}
          <View style={styles.codeSection}>
            <Text style={styles.codeLabel}>Seu código de indicação</Text>
            <Text style={styles.codeValue}>{referralCode}</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayTouchable: {
    flex: 1,
  },
  container: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    alignSelf: 'center',
    marginTop: 12,
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
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#FFFFFF',
  },
  previewSection: {
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  previewBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 19,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  whatsappButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  whatsappText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  emailText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  otherShare: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    marginBottom: 16,
  },
  otherShareText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  codeSection: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  codeLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  codeValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 2,
  },
});

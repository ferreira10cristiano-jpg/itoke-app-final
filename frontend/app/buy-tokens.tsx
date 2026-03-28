import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { api } from '../src/lib/api';

export default function BuyTokensScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuthStore();
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const pricePerPackage = 7;
  const tokensPerPackage = 7;
  const totalPrice = quantity * pricePerPackage;
  const totalTokens = quantity * tokensPerPackage;

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      const result = await api.purchaseTokens(quantity);
      await refreshUser();
      Alert.alert(
        'Compra Realizada!',
        `Seus tokens foram adicionados e as comissões de sua rede foram distribuídas.\n\n+${result.tokens_added} tokens\nNovo saldo: ${result.new_balance} tokens`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao processar compra');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comprar Tokens</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Current Balance */}
      <View style={styles.balanceCard}>
        <Ionicons name="ticket" size={32} color="#10B981" />
        <Text style={styles.balanceLabel}>Saldo Atual</Text>
        <Text style={styles.balanceValue}>{user?.tokens || 0} tokens</Text>
      </View>

      {/* Package Info */}
      <View style={styles.packageCard}>
        <View style={styles.packageHeader}>
          <Ionicons name="cube" size={24} color="#F59E0B" />
          <Text style={styles.packageTitle}>Pacote de Tokens</Text>
        </View>
        <Text style={styles.packageDesc}>
          Cada pacote contém <Text style={styles.bold}>7 tokens</Text> por{' '}
          <Text style={styles.bold}>R$ 7,00</Text> (R$ 1,00 por token)
        </Text>
      </View>

      {/* Quantity Selector */}
      <View style={styles.quantitySection}>
        <Text style={styles.quantityLabel}>Quantidade de pacotes</Text>
        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
          >
            <Ionicons name="remove" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.quantityDisplay}>
            <Text style={styles.quantityValue}>{quantity}</Text>
          </View>
          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={() => setQuantity(Math.min(20, quantity + 1))}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tokens</Text>
          <Text style={styles.summaryValue}>{totalTokens} tokens</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabelTotal}>Total</Text>
          <Text style={styles.summaryValueTotal}>R$ {totalPrice.toFixed(2)}</Text>
        </View>
      </View>

      {/* Quick select */}
      <View style={styles.quickSelect}>
        {[1, 2, 3, 5, 10].map((q) => (
          <TouchableOpacity
            key={q}
            style={[styles.quickBtn, quantity === q && styles.quickBtnActive]}
            onPress={() => setQuantity(q)}
          >
            <Text style={[styles.quickBtnText, quantity === q && styles.quickBtnTextActive]}>
              {q}x
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Purchase Button */}
      <View style={[styles.bottomCTA, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={handlePurchase}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <>
              <Ionicons name="cart" size={22} color="#0F172A" />
              <Text style={styles.purchaseButtonText}>
                Comprar {totalTokens} Tokens - R$ {totalPrice.toFixed(2)}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.disclaimerText}>
          Pagamento simulado para ambiente de desenvolvimento
        </Text>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  balanceCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 12,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 4,
  },
  packageCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  packageTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  packageDesc: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
  },
  bold: {
    color: '#10B981',
    fontWeight: '700',
  },
  quantitySection: {
    marginHorizontal: 16,
    marginTop: 24,
    alignItems: 'center',
  },
  quantityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 16,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  quantityBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityDisplay: {
    width: 80,
    height: 60,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  quantityValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summary: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  summaryValue: {
    fontSize: 14,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12,
  },
  summaryLabelTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryValueTotal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10B981',
  },
  quickSelect: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 10,
  },
  quickBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickBtnActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  quickBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  quickBtnTextActive: {
    color: '#0F172A',
  },
  bottomCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#0F172AEE',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    alignItems: 'center',
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    width: '100%',
  },
  purchaseButtonText: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/lib/api';
import { TokenPackage } from '../../src/types';

const PACKAGES = [
  { size: 50, savings: 0, popular: false },
  { size: 100, savings: 5, popular: true },
  { size: 150, savings: 10, popular: false },
];

export default function PackagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refreshUser } = useAuthStore();
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const data = await api.getMyPackages();
      setPackages(data);
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (size: number) => {
    Alert.alert(
      'Confirmar Compra',
      `Deseja comprar o pacote de ${size} tokens por R$ ${(size * 2).toFixed(2)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Comprar',
          onPress: async () => {
            setPurchasing(size);
            try {
              await api.purchasePackage(size);
              await refreshUser();
              await loadPackages();
              Alert.alert('Sucesso', `Pacote de ${size} tokens adquirido com sucesso!`);
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Falha ao comprar pacote');
            } finally {
              setPurchasing(null);
            }
          },
        },
      ]
    );
  };

  const renderPackageCard = (pkg: typeof PACKAGES[0]) => (
    <TouchableOpacity
      key={pkg.size}
      style={[
        styles.packageCard,
        pkg.popular && styles.packageCardPopular,
      ]}
      onPress={() => handlePurchase(pkg.size)}
      disabled={purchasing !== null}
    >
      {pkg.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Mais Popular</Text>
        </View>
      )}
      
      <View style={styles.packageHeader}>
        <Ionicons name="ticket" size={32} color={pkg.popular ? '#FFFFFF' : '#3B82F6'} />
        <Text style={[
          styles.packageSize,
          pkg.popular && styles.packageSizePopular
        ]}>
          {pkg.size}
        </Text>
        <Text style={[
          styles.packageUnit,
          pkg.popular && styles.packageUnitPopular
        ]}>tokens</Text>
      </View>

      <View style={styles.packagePricing}>
        <Text style={[
          styles.packagePrice,
          pkg.popular && styles.packagePricePopular
        ]}>
          R$ {(pkg.size * 2).toFixed(2)}
        </Text>
        <Text style={[
          styles.packagePerUnit,
          pkg.popular && styles.packagePerUnitPopular
        ]}>
          R$ 2,00 por venda
        </Text>
        {pkg.savings > 0 && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>Economize {pkg.savings}%</Text>
          </View>
        )}
      </View>

      {purchasing === pkg.size ? (
        <ActivityIndicator color={pkg.popular ? '#FFFFFF' : '#3B82F6'} />
      ) : (
        <View style={[
          styles.buyButton,
          pkg.popular && styles.buyButtonPopular
        ]}>
          <Text style={[
            styles.buyButtonText,
            pkg.popular && styles.buyButtonTextPopular
          ]}>Comprar</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Comprar Tokens</Text>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={24} color="#3B82F6" />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Como funciona?</Text>
          <Text style={styles.infoText}>
            Cada venda validada consome 1 token (R$ 2,00). Compre pacotes para ter saldo e validar vendas.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Escolha seu Pacote</Text>

      <View style={styles.packagesRow}>
        {PACKAGES.map(renderPackageCard)}
      </View>

      {/* Purchase History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Histórico de Compras</Text>
        
        {packages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Nenhuma compra realizada</Text>
          </View>
        ) : (
          packages.map((pkg) => (
            <View key={pkg.package_id} style={styles.historyItem}>
              <View style={styles.historyIcon}>
                <Ionicons name="ticket" size={20} color="#3B82F6" />
              </View>
              <View style={styles.historyContent}>
                <Text style={styles.historyTitle}>Pacote de {pkg.size} tokens</Text>
                <Text style={styles.historyDate}>
                  {new Date(pkg.created_at).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <View style={styles.historyStatus}>
                <Text style={styles.historyRemaining}>{pkg.tokens_remaining}</Text>
                <Text style={styles.historyRemainingLabel}>restantes</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#3B82F6',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
  },
  packagesRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  packageCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  packageCardPopular: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  popularBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  packageHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  packageSize: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 8,
  },
  packageSizePopular: {
    color: '#FFFFFF',
  },
  packageUnit: {
    fontSize: 12,
    color: '#6B7280',
  },
  packageUnitPopular: {
    color: 'rgba(255,255,255,0.8)',
  },
  packagePricing: {
    alignItems: 'center',
    marginBottom: 16,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  packagePricePopular: {
    color: '#FFFFFF',
  },
  packagePerUnit: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  packagePerUnitPopular: {
    color: 'rgba(255,255,255,0.7)',
  },
  savingsBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 8,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065F46',
  },
  buyButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buyButtonPopular: {
    backgroundColor: '#FFFFFF',
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  buyButtonTextPopular: {
    color: '#3B82F6',
  },
  section: {
    paddingHorizontal: 20,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  historyDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  historyStatus: {
    alignItems: 'center',
  },
  historyRemaining: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
  },
  historyRemainingLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
});

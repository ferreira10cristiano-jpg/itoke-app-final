import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useOffersStore } from '../../src/store/offersStore';
import { useAuthStore } from '../../src/store/authStore';
import { OfferCard } from '../../src/components/OfferCard';
import { api } from '../../src/lib/api';
import { Category } from '../../src/types';

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const { offers, isLoading, fetchOffers, setUserLocation, selectedCategory, setCategory } = useOffersStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Filters state
  const [cities, setCities] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'discount' | 'sales'>('discount');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
    // Seed data on first load
    api.seedData().catch(() => {});
  }, []);

  const loadData = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          lat: location.coords.latitude,
          lon: location.coords.longitude,
        });
      }

      const [cats, filters] = await Promise.all([
        api.getCategories(),
        api.getOfferFilters(),
      ]);
      setCategories(cats);
      setCities(filters.cities || []);
      setNeighborhoods(filters.neighborhoods || []);

      await fetchOffers();
    } catch (error) {
      console.error('Error loading data:', error);
      await fetchOffers();
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleOfferPress = (offerId: string) => {
    router.push(`/offer/${offerId}`);
  };

  const handleCityFilter = (city: string) => {
    const newCity = selectedCity === city ? null : city;
    setSelectedCity(newCity);
    setSelectedNeighborhood(null);
    fetchOffersWithFilters(newCity, null, sortBy);
  };

  const handleNeighborhoodFilter = (nb: string) => {
    const newNb = selectedNeighborhood === nb ? null : nb;
    setSelectedNeighborhood(newNb);
    fetchOffersWithFilters(selectedCity, newNb, sortBy);
  };

  const handleSortToggle = () => {
    const newSort = sortBy === 'discount' ? 'sales' : 'discount';
    setSortBy(newSort);
    fetchOffersWithFilters(selectedCity, selectedNeighborhood, newSort);
  };

  const fetchOffersWithFilters = async (city: string | null, nb: string | null, sort: string) => {
    try {
      const { userLocation, selectedCategory: cat } = useOffersStore.getState();
      const data = await api.getOffers(
        userLocation?.lat,
        userLocation?.lon,
        cat || undefined,
        city || undefined,
        nb || undefined,
        sort
      );
      useOffersStore.setState({ offers: data });
    } catch (err) {
      console.error('Error fetching filtered offers:', err);
    }
  };

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0] || 'Visitante'}!</Text>
          <Text style={styles.subtitle}>Encontre as melhores ofertas</Text>
        </View>
        <TouchableOpacity
          style={styles.tokenBadge}
          onPress={() => router.push('/buy-tokens')}
          activeOpacity={0.7}
        >
          <Ionicons name="ticket" size={16} color="#10B981" />
          <View>
            <Text style={styles.tokenLabel}>Tokens</Text>
            <Text style={styles.tokenCount}>{user?.tokens || 0}</Text>
          </View>
          <View style={styles.buyButton}>
            <Ionicons name="add" size={14} color="#0F172A" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, showFilters && styles.filterChipActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="options" size={16} color={showFilters ? '#0F172A' : '#94A3B8'} />
          <Text style={[styles.filterChipText, showFilters && styles.filterChipTextActive]}>Filtros</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, sortBy === 'sales' && styles.filterChipActive]}
          onPress={handleSortToggle}
        >
          <Ionicons name="flame" size={16} color={sortBy === 'sales' ? '#0F172A' : '#94A3B8'} />
          <Text style={[styles.filterChipText, sortBy === 'sales' && styles.filterChipTextActive]}>
            {sortBy === 'sales' ? 'Mais Vendidos' : 'Maior Desconto'}
          </Text>
        </TouchableOpacity>

        {selectedCity && (
          <TouchableOpacity
            style={styles.activeFilterChip}
            onPress={() => handleCityFilter(selectedCity)}
          >
            <Text style={styles.activeFilterText}>{selectedCity}</Text>
            <Ionicons name="close" size={14} color="#10B981" />
          </TouchableOpacity>
        )}

        {selectedNeighborhood && (
          <TouchableOpacity
            style={styles.activeFilterChip}
            onPress={() => handleNeighborhoodFilter(selectedNeighborhood)}
          >
            <Text style={styles.activeFilterText}>{selectedNeighborhood}</Text>
            <Ionicons name="close" size={14} color="#10B981" />
          </TouchableOpacity>
        )}
      </View>

      {/* Expandable Filters */}
      {showFilters && (
        <View style={styles.filtersExpanded}>
          {cities.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Cidade</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  {cities.map((city) => (
                    <TouchableOpacity
                      key={city}
                      style={[styles.filterOption, selectedCity === city && styles.filterOptionActive]}
                      onPress={() => handleCityFilter(city)}
                    >
                      <Text style={[styles.filterOptionText, selectedCity === city && styles.filterOptionTextActive]}>
                        {city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {neighborhoods.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Bairro</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  {neighborhoods.map((nb) => (
                    <TouchableOpacity
                      key={nb}
                      style={[styles.filterOption, selectedNeighborhood === nb && styles.filterOptionActive]}
                      onPress={() => handleNeighborhoodFilter(nb)}
                    >
                      <Text style={[styles.filterOptionText, selectedNeighborhood === nb && styles.filterOptionTextActive]}>
                        {nb}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
        style={styles.categoriesContainer}
      >
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
              onPress={() => setCategory(isSelected ? null : cat.id)}
            >
              <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {isLoading && offers.length === 0 ? (
        <View style={styles.loadingContainer}>
          {renderHeader()}
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        </View>
      ) : (
        <FlatList
          data={offers}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <OfferCard offer={item} onPress={() => handleOfferPress(item.offer_id)} />
          )}
          keyExtractor={(item) => item.offer_id}
          contentContainerStyle={styles.offersList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetags-outline" size={64} color="#475569" />
              <Text style={styles.emptyTitle}>Nenhuma oferta encontrada</Text>
              <Text style={styles.emptyText}>
                Puxe para baixo para atualizar ou ajuste os filtros
              </Text>
            </View>
          }
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  tokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  tokenLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6EE7B7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tokenCount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10B981',
    lineHeight: 20,
  },
  buyButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  filterChipText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#0F172A',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98120',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  activeFilterText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  filtersExpanded: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  filterSection: {
    gap: 6,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterOption: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterOptionActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  filterOptionText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#0F172A',
  },
  categoriesContainer: {
    marginBottom: 8,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryChipSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  categoryText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#0F172A',
  },
  offersList: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
});

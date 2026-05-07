import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { products, Category } from '../../data/products';
import { useCart } from '../../context/CartContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const FRAME_SHAPES = ['All', 'Round', 'Rectangle', 'Square', 'Cat-Eye', 'Aviator', 'Oval', 'Wayfarer'];
const GENDERS = ['All', 'Men', 'Women', 'Unisex', 'Kids'];
const PRICE_RANGES = ['All', 'Under ₹1,000', '₹1,000–₹2,000', '₹2,000–₹3,500', 'Above ₹3,500'];
const SORT_OPTIONS = ['Relevance', 'Price: Low to High', 'Price: High to Low', 'Newest First', 'Top Rated'];

function ProductCard({ item }: { item: (typeof products)[0] }) {
  const scale = useRef(new Animated.Value(1)).current;
  const { toggleWishlist, isInWishlist } = useCart();
  const wishlisted = isInWishlist(item.id);

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start()
        }
        onPress={() => router.push(`/product/${item.id}`)}
      >
        <View style={styles.imageWrap}>
          <Image source={{ uri: item.image }} style={styles.productImage} />
          {(item.isNew || item.isBestSeller) && (
            <View style={[styles.topBadge, { backgroundColor: item.isNew ? Colors.gold : Colors.navy }]}>
              <Text style={styles.topBadgeText}>{item.isNew ? 'NEW' : 'BESTSELLER'}</Text>
            </View>
          )}
          {item.hasTryOn && (
            <View style={styles.tryOnPill}>
              <Ionicons name="camera-outline" size={9} color={Colors.gold} />
              <Text style={styles.tryOnText}>Try On</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.wishBtn}
            onPress={() => toggleWishlist(item.id)}
          >
            <Ionicons
              name={wishlisted ? 'heart' : 'heart-outline'}
              size={16}
              color={wishlisted ? '#EF4444' : Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.brandLabel}>{item.brand}</Text>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={10} color={Colors.gold} />
            <Text style={styles.ratingText}>{item.rating}</Text>
            <Text style={styles.reviewCount}>({item.reviews})</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{item.price.toLocaleString()}</Text>
            {item.originalPrice && (
              <Text style={styles.strikePrice}>₹{item.originalPrice.toLocaleString()}</Text>
            )}
          </View>
          {item.originalPrice && (
            <Text style={styles.discount}>
              {Math.round((1 - item.price / item.originalPrice) * 100)}% off
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string }>();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(params.category || 'all');
  const [selectedShape, setSelectedShape] = useState('All');
  const [selectedGender, setSelectedGender] = useState('All');
  const [selectedPrice, setSelectedPrice] = useState('All');
  const [sortBy, setSortBy] = useState('Relevance');
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);

  const CATEGORIES = ['all', 'eyeglasses', 'sunglasses', 'contacts', 'kids'];

  const filtered = useMemo(() => {
    let list = [...products];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    }
    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category === selectedCategory);
    }
    if (selectedShape !== 'All') {
      list = list.filter(p => p.frameShape === selectedShape.toLowerCase().replace('-', '-'));
    }
    if (selectedGender !== 'All') {
      list = list.filter(p => p.gender === selectedGender.toLowerCase());
    }
    if (selectedPrice !== 'All') {
      if (selectedPrice === 'Under ₹1,000') list = list.filter(p => p.price < 1000);
      else if (selectedPrice === '₹1,000–₹2,000') list = list.filter(p => p.price >= 1000 && p.price <= 2000);
      else if (selectedPrice === '₹2,000–₹3,500') list = list.filter(p => p.price > 2000 && p.price <= 3500);
      else if (selectedPrice === 'Above ₹3,500') list = list.filter(p => p.price > 3500);
    }

    switch (sortBy) {
      case 'Price: Low to High': list.sort((a, b) => a.price - b.price); break;
      case 'Price: High to Low': list.sort((a, b) => b.price - a.price); break;
      case 'Top Rated': list.sort((a, b) => b.rating - a.rating); break;
      case 'Newest First': list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
    }
    return list;
  }, [search, selectedCategory, selectedShape, selectedGender, selectedPrice, sortBy]);

  const activeFilters = [selectedShape, selectedGender, selectedPrice].filter(f => f !== 'All').length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shop Eyewear</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setSortVisible(true)}>
            <Ionicons name="swap-vertical-outline" size={20} color={Colors.navy} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setFilterVisible(true)}>
            <Ionicons name="options-outline" size={20} color={Colors.navy} />
            {activeFilters > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilters}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search frames, brands..."
          placeholderTextColor={Colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryTabsScroll}
        contentContainerStyle={styles.categoryTabs}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.catTab, selectedCategory === cat && styles.catTabActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.catTabText, selectedCategory === cat && styles.catTabTextActive]}>
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>{filtered.length} products found</Text>
        {sortBy !== 'Relevance' && (
          <Text style={styles.sortIndicator}>Sorted by: {sortBy}</Text>
        )}
      </View>

      {/* Product Grid */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>🔍</Text>
            <Text style={styles.emptyTitle}>No frames found</Text>
            <Text style={styles.emptyDesc}>Try adjusting your filters</Text>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                setSearch('');
                setSelectedShape('All');
                setSelectedGender('All');
                setSelectedPrice('All');
                setSelectedCategory('all');
              }}
            >
              <Text style={styles.clearBtnText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => <ProductCard item={item} />}
      />

      {/* Filter Modal */}
      <Modal visible={filterVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.navy} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <FilterSection title="Frame Shape" options={FRAME_SHAPES} selected={selectedShape} onSelect={setSelectedShape} />
              <FilterSection title="Gender" options={GENDERS} selected={selectedGender} onSelect={setSelectedGender} />
              <FilterSection title="Price Range" options={PRICE_RANGES} selected={selectedPrice} onSelect={setSelectedPrice} />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearFiltersBtn}
                onPress={() => { setSelectedShape('All'); setSelectedGender('All'); setSelectedPrice('All'); }}
              >
                <Text style={styles.clearFiltersBtnText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setFilterVisible(false)}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal visible={sortVisible} animationType="slide" transparent>
        <TouchableOpacity style={styles.sortOverlay} onPress={() => setSortVisible(false)}>
          <View style={styles.sortModal}>
            <Text style={styles.sortTitle}>Sort By</Text>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={styles.sortOption}
                onPress={() => { setSortBy(opt); setSortVisible(false); }}
              >
                <Text style={[styles.sortOptionText, sortBy === opt && styles.sortOptionActive]}>
                  {opt}
                </Text>
                {sortBy === opt && <Ionicons name="checkmark" size={18} color={Colors.gold} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function FilterSection({
  title, options, selected, onSelect,
}: {
  title: string; options: string[]; selected: string; onSelect: (v: string) => void;
}) {
  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterSectionTitle}>{title}</Text>
      <View style={styles.filterOptions}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.filterChip, selected === opt && styles.filterChipActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.filterChipText, selected === opt && styles.filterChipTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 26,
    color: Colors.navy,
  },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.gold,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { color: Colors.white, fontSize: 9, fontFamily: 'DMSans_700Bold' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textPrimary,
  },

  categoryTabsScroll: { marginTop: 8 },
  categoryTabs: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  catTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catTabActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  catTabText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  catTabTextActive: { color: Colors.white },

  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultsText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sortIndicator: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.gold,
  },

  grid: { paddingHorizontal: 16, paddingBottom: 20 },
  row: { justifyContent: 'space-between', marginBottom: 16 },

  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  imageWrap: { position: 'relative' },
  productImage: { width: '100%', height: 140, resizeMode: 'cover' },
  topBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  topBadgeText: {
    color: Colors.white,
    fontFamily: 'DMSans_700Bold',
    fontSize: 8,
    letterSpacing: 0.8,
  },
  tryOnPill: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(13,27,42,0.82)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  tryOnText: { color: Colors.gold, fontFamily: 'DMSans_500Medium', fontSize: 9 },
  wishBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.white,
    borderRadius: 16,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardBody: { padding: 10 },
  brandLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 9,
    color: Colors.gold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  productName: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  ratingText: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.textPrimary },
  reviewCount: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.navy },
  strikePrice: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.textLight,
    textDecorationLine: 'line-through',
  },
  discount: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: '#10B981',
    marginTop: 2,
  },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 22,
    color: Colors.textPrimary,
    marginTop: 12,
  },
  emptyDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
    marginBottom: 20,
  },
  clearBtn: {
    backgroundColor: Colors.navy,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
  },
  clearBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.white },

  // Filter Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  filterModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 22,
    color: Colors.navy,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  clearFiltersBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.navy,
    alignItems: 'center',
  },
  clearFiltersBtnText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.navy,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: Colors.navy,
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.white,
  },

  filterSection: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  filterSectionTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  filterChipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  filterChipText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  filterChipTextActive: { color: Colors.white },

  // Sort Modal
  sortOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  sortModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  sortTitle: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 20,
    color: Colors.navy,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sortOptionText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  sortOptionActive: {
    fontFamily: 'DMSans_700Bold',
    color: Colors.gold,
  },
});

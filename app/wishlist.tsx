import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useCart } from '@/context/CartContext';
import { products as allProducts } from '@/data/products';
import { Colors } from '@/constants/Colors';

export default function WishlistScreen() {
  const insets = useSafeAreaInsets();
  const { wishlist, toggleWishlist, addItem } = useCart();

  const wishlistProducts = allProducts.filter(p => wishlist.includes(p.id));

  const handleAddToCart = (productId: string) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    addItem({ product, quantity: 1, lensType: 'non-powered', hasPower: false });
    router.push('/(tabs)/cart');
  };

  if (wishlistProducts.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.navy} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Wishlist</Text>
          <View style={{ width: 40 }} />
        </View>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="heart-outline" size={56} color={Colors.textLight} />
          </View>
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptyDesc}>
            Tap the heart icon on any frame to save it here for later
          </Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/(tabs)/products')}>
            <Ionicons name="grid-outline" size={16} color={Colors.white} />
            <Text style={styles.shopBtnText}>Browse Frames</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.navy} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>My Wishlist</Text>
          <Text style={styles.headerSub}>{wishlistProducts.length} item{wishlistProducts.length > 1 ? 's' : ''} saved</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={wishlistProducts}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.duration(350).delay(index * 60)}
            style={styles.card}
          >
            {/* Image */}
            <TouchableOpacity
              style={styles.imageWrap}
              onPress={() => router.push(`/product/${item.id}`)}
              activeOpacity={0.9}
            >
              <Image source={{ uri: item.image }} style={styles.image} />
              {item.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
              {item.isBestSeller && (
                <View style={styles.bestsellerBadge}>
                  <Text style={styles.bestsellerBadgeText}>⭐ BEST</Text>
                </View>
              )}
              {/* Discount */}
              {item.originalPrice && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>
                    -{Math.round((1 - item.price / item.originalPrice) * 100)}%
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Remove heart */}
            <TouchableOpacity
              style={styles.heartBtn}
              onPress={() => toggleWishlist(item.id)}
            >
              <Ionicons name="heart" size={18} color={Colors.error} />
            </TouchableOpacity>

            {/* Info */}
            <View style={styles.info}>
              <Text style={styles.brand}>{item.brand}</Text>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={11} color={Colors.gold} />
                <Text style={styles.rating}>{item.rating}</Text>
                <Text style={styles.reviews}>({item.reviews})</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.price}>₹{item.price.toLocaleString()}</Text>
                {item.originalPrice && (
                  <Text style={styles.originalPrice}>₹{item.originalPrice.toLocaleString()}</Text>
                )}
              </View>
            </View>

            {/* Add to cart */}
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => handleAddToCart(item.id)}
              activeOpacity={0.85}
            >
              <Ionicons name="bag-add-outline" size={14} color={Colors.white} />
              <Text style={styles.addBtnText}>Add to Bag</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.pageBg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.pageBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 22, color: Colors.navy, textAlign: 'center' },
  headerSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },

  // Grid
  grid: { padding: 12, paddingBottom: 32 },
  row: { gap: 12 },

  // Card
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: Colors.navy,
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    position: 'relative',
  },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 130, resizeMode: 'cover' },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.navy,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  newBadgeText: { fontFamily: 'DMSans_700Bold', fontSize: 9, color: Colors.white, letterSpacing: 0.5 },
  bestsellerBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.gold,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  bestsellerBadgeText: { fontFamily: 'DMSans_700Bold', fontSize: 9, color: Colors.navy },
  discountBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: Colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: Colors.white },

  // Heart button
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  // Info
  info: { padding: 10, gap: 3 },
  brand: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 9,
    color: Colors.gold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  name: { fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 15, color: Colors.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.textPrimary },
  reviews: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textLight },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  price: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.navy },
  originalPrice: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.textLight,
    textDecorationLine: 'line-through',
  },

  // Add to bag button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.navy,
    margin: 10,
    marginTop: 4,
    borderRadius: 8,
    paddingVertical: 9,
  },
  addBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.white },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14 },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    elevation: 2,
    shadowColor: Colors.navy,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  emptyTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 26, color: Colors.navy },
  emptyDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.navy,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 4,
  },
  shopBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.white },
});

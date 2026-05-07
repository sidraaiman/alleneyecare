import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { products, categories, getFeatured, getNewArrivals } from '../../data/products';
import { useCart } from '../../context/CartContext';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 480;

function ProductCard({ item }: { item: (typeof products)[0] }) {
  const scale = useRef(new Animated.Value(1)).current;
  const { toggleWishlist, isInWishlist } = useCart();
  const wishlisted = isInWishlist(item.id);

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  return (
    <Animated.View style={[styles.productCard, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => router.push(`/product/${item.id}`)}
      >
        <View style={styles.productImageWrap}>
          <Image source={{ uri: item.image }} style={styles.productImage} />
          {item.isNew && (
            <View style={[styles.badge, { backgroundColor: Colors.gold }]}>
              <Text style={styles.badgeText}>NEW</Text>
            </View>
          )}
          {item.isBestSeller && !item.isNew && (
            <View style={[styles.badge, { backgroundColor: Colors.navy }]}>
              <Text style={styles.badgeText}>BESTSELLER</Text>
            </View>
          )}
          {item.hasTryOn && (
            <View style={styles.tryOnBadge}>
              <Ionicons name="camera-outline" size={10} color={Colors.gold} />
              <Text style={styles.tryOnText}>Try On</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.wishlistBtn}
            onPress={() => toggleWishlist(item.id)}
          >
            <Ionicons
              name={wishlisted ? 'heart' : 'heart-outline'}
              size={18}
              color={wishlisted ? '#EF4444' : Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productBrand}>{item.brand}</Text>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={Colors.gold} />
            <Text style={styles.ratingText}>{item.rating} ({item.reviews})</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{item.price.toLocaleString()}</Text>
            {item.originalPrice && (
              <Text style={styles.originalPrice}>₹{item.originalPrice.toLocaleString()}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const featured = getFeatured();
  const newArrivals = getNewArrivals();

  const headerBg = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT - 80],
    outputRange: ['transparent', Colors.white],
    extrapolate: 'clamp',
  });
  const headerShadow = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 90, HERO_HEIGHT - 60],
    outputRange: [0, 8],
    extrapolate: 'clamp',
  });
  const logoColor = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT - 100],
    outputRange: [Colors.white, Colors.navy],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Floating sticky header */}
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: headerBg,
            shadowOpacity: headerShadow,
          },
        ]}
      >
        <View style={styles.headerInner}>
          <Animated.Text style={[styles.logo, { color: logoColor as any }]}>
            AllenEyeCare
          </Animated.Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIcon}>
              <Ionicons name="search-outline" size={22} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('/cart')}>
              <Ionicons name="bag-outline" size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <View style={[styles.hero, { height: HERO_HEIGHT }]}>
          <Image
            source={{ uri: 'https://placehold.co/800x600/0D1B2A/C9A84C.png?text=Premium+Eyewear' }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>✦ New Season Collection ✦</Text>
            <Text style={styles.heroTitle}>See the World{'\n'}in Luxury</Text>
            <Text style={styles.heroSubtitle}>
              Premium eyewear crafted for{'\n'}the discerning eye
            </Text>
            <TouchableOpacity
              style={styles.heroCta}
              onPress={() => router.push('/products')}
            >
              <Ionicons name="camera-outline" size={16} color={Colors.navy} />
              <Text style={styles.heroCtaText}>Try On Frames Virtually</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/products')}>
              <Text style={styles.heroSecondaryLink}>Explore Collection →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Promo Strip */}
        <View style={styles.promoStrip}>
          <Text style={styles.promoText}>🎉 BUY 1 GET 1 FREE on all frames + Free Shipping above ₹999</Text>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shop by Category</Text>
          </View>
          <View style={styles.categoryGrid}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryCard, { backgroundColor: cat.color }]}
                onPress={() => router.push({ pathname: '/products', params: { category: cat.id } })}
                activeOpacity={0.85}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={[styles.categoryLabel, { color: cat.textColor }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Best Sellers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Best Sellers</Text>
            <TouchableOpacity onPress={() => router.push('/products')}>
              <Text style={styles.seeAll}>See All →</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={featured}
            keyExtractor={i => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            renderItem={({ item }) => (
              <View style={{ width: 200, marginRight: 16 }}>
                <ProductCard item={item} />
              </View>
            )}
          />
        </View>

        {/* New Arrivals */}
        <View style={[styles.section, { backgroundColor: Colors.navy }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: Colors.white }]}>New Arrivals</Text>
            <TouchableOpacity onPress={() => router.push('/products')}>
              <Text style={[styles.seeAll, { color: Colors.gold }]}>See All →</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={newArrivals}
            keyExtractor={i => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            renderItem={({ item }) => (
              <View style={{ width: 200, marginRight: 16 }}>
                <ProductCard item={item} />
              </View>
            )}
          />
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign: 'center', marginBottom: 8 }]}>
            How It Works
          </Text>
          <Text style={styles.sectionSubtitle}>Your perfect frames in 3 easy steps</Text>
          <View style={styles.stepsRow}>
            {[
              { icon: 'search-outline', step: '01', title: 'Browse', desc: 'Explore 10,000+ frames across brands and styles' },
              { icon: 'camera-outline', step: '02', title: 'Virtual Try-On', desc: 'See how frames look on your face in real time' },
              { icon: 'bicycle-outline', step: '03', title: 'Doorstep Delivery', desc: 'Free home delivery within 3–5 business days' },
            ].map((s, i) => (
              <View key={i} style={styles.stepCard}>
                <View style={styles.stepIconWrap}>
                  <Ionicons name={s.icon as any} size={28} color={Colors.gold} />
                </View>
                <Text style={styles.stepNumber}>{s.step}</Text>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepDesc}>{s.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Promo Banner */}
        <TouchableOpacity style={styles.promoBanner} activeOpacity={0.9}>
          <View style={styles.promoBannerContent}>
            <Text style={styles.promoLabel}>LIMITED TIME</Text>
            <Text style={styles.promoHeadline}>BUY 1 GET 1{'\n'}FREE</Text>
            <Text style={styles.promoSub}>On all frames. No code needed.</Text>
            <View style={styles.promoBtn}>
              <Text style={styles.promoBtnText}>Shop Now</Text>
            </View>
          </View>
          <View style={styles.promoBannerDeco}>
            <Text style={{ fontSize: 80 }}>👓</Text>
          </View>
        </TouchableOpacity>

        {/* EMI Banner */}
        <View style={styles.emiBanner}>
          <Ionicons name="card-outline" size={20} color={Colors.gold} />
          <Text style={styles.emiText}>
            Easy EMI starting at <Text style={{ color: Colors.gold, fontFamily: 'DMSans_700Bold' }}>₹83/month</Text> — 0% interest on all major cards
          </Text>
        </View>

        {/* Trust Badges */}
        <View style={styles.trustSection}>
          <Text style={[styles.sectionTitle, { textAlign: 'center', marginBottom: 20 }]}>
            Why AllenEyeCare?
          </Text>
          <View style={styles.trustGrid}>
            {[
              { icon: 'shield-checkmark-outline', title: 'ISI Certified', desc: 'All lenses meet ISI quality standards' },
              { icon: 'car-outline', title: 'Free Shipping', desc: 'On orders above ₹999' },
              { icon: 'refresh-outline', title: '14-Day Returns', desc: 'Hassle-free returns & exchanges' },
              { icon: 'eye-outline', title: 'Eye Test', desc: 'Free online eye power check' },
              { icon: 'headset-outline', title: '24/7 Support', desc: 'Expert eyewear consultation' },
              { icon: 'star-outline', title: '5★ Rated', desc: '2M+ happy customers' },
            ].map((b, i) => (
              <View key={i} style={styles.trustBadge}>
                <View style={styles.trustIconWrap}>
                  <Ionicons name={b.icon as any} size={24} color={Colors.gold} />
                </View>
                <Text style={styles.trustTitle}>{b.title}</Text>
                <Text style={styles.trustDesc}>{b.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer Brand */}
        <View style={styles.footerBrand}>
          <Text style={styles.footerLogo}>AllenEyeCare</Text>
          <Text style={styles.footerTagline}>Precision Vision. Timeless Style.</Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  logo: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 22,
    letterSpacing: 1,
  },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerIcon: { padding: 4 },

  // Hero
  hero: { width: '100%', justifyContent: 'flex-end' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,27,42,0.58)',
  },
  heroContent: { padding: 28, paddingBottom: 40 },
  heroEyebrow: {
    color: Colors.gold,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 12,
  },
  heroTitle: {
    color: Colors.white,
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 52,
    lineHeight: 58,
    marginBottom: 12,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  heroCta: {
    backgroundColor: Colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 4,
    gap: 8,
    marginBottom: 16,
  },
  heroCtaText: {
    color: Colors.navy,
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  heroSecondaryLink: {
    color: Colors.white,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    opacity: 0.9,
  },

  // Promo strip
  promoStrip: {
    backgroundColor: Colors.navy,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  promoText: {
    color: Colors.gold,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // Sections
  section: { paddingVertical: 28, paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    marginTop: -4,
  },
  seeAll: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.gold,
  },

  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: (width - 52) / 2,
    height: 110,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  categoryEmoji: { fontSize: 34 },
  categoryLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  // Horizontal product list
  horizontalList: { paddingRight: 20 },

  // Product Card
  productCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  productImageWrap: { position: 'relative' },
  productImage: { width: '100%', height: 140, resizeMode: 'cover' },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: Colors.white,
    fontFamily: 'DMSans_700Bold',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  tryOnBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(13,27,42,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  tryOnText: {
    color: Colors.gold,
    fontFamily: 'DMSans_500Medium',
    fontSize: 9,
  },
  wishlistBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.white,
    borderRadius: 20,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productInfo: { padding: 12 },
  productBrand: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: Colors.gold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  productName: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  ratingText: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.navy },
  originalPrice: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textLight,
    textDecorationLine: 'line-through',
  },

  // Steps
  stepsRow: { flexDirection: 'row', gap: 12 },
  stepCard: { flex: 1, alignItems: 'center', gap: 6 },
  stepIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepNumber: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 22,
    color: Colors.gold,
  },
  stepTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  stepDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Promo Banner
  promoBanner: {
    marginHorizontal: 20,
    marginVertical: 8,
    backgroundColor: Colors.navy,
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 160,
  },
  promoBannerContent: { flex: 1, padding: 24, justifyContent: 'center' },
  promoLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 10,
    color: Colors.gold,
    letterSpacing: 2,
    marginBottom: 6,
  },
  promoHeadline: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 38,
    color: Colors.white,
    lineHeight: 42,
    marginBottom: 8,
  },
  promoSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },
  promoBtn: {
    backgroundColor: Colors.gold,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  promoBtnText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: Colors.navy,
  },
  promoBannerDeco: { width: 100, alignItems: 'center', justifyContent: 'center' },

  // EMI
  emiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginVertical: 8,
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emiText: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // Trust
  trustSection: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: Colors.white,
  },
  trustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  trustBadge: {
    width: (width - 56) / 2,
    alignItems: 'center',
    gap: 6,
  },
  trustIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  trustTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  trustDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
  },

  // Footer brand
  footerBrand: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: Colors.navy,
    gap: 6,
  },
  footerLogo: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 28,
    color: Colors.gold,
    letterSpacing: 1,
  },
  footerTagline: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
});

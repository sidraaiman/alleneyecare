import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Alert,
  FlatList,
  Animated,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { getProductById, products } from '../../data/products';
import { useCart, LensType } from '../../context/CartContext';

const { width } = Dimensions.get('window');

const LENS_OPTIONS: { type: LensType; label: string; desc: string; price: number }[] = [
  { type: 'non-powered', label: 'Non-Powered', desc: 'No lens power / 0 power', price: 0 },
  { type: 'single-vision', label: 'Single Vision', desc: 'For near or distance correction', price: 399 },
  { type: 'bifocal', label: 'Bifocal', desc: 'For near and distance both', price: 699 },
  { type: 'progressive', label: 'Progressive', desc: 'Advanced no-line bifocal', price: 999 },
];

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const product = getProductById(id);
  const { addItem, toggleWishlist, isInWishlist } = useCart();

  const [activeImage, setActiveImage] = useState(0);
  const [selectedLens, setSelectedLens] = useState<LensType>('non-powered');
  const [prescriptionModal, setPrescriptionModal] = useState(false);
  const [tryOnModal, setTryOnModal] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  if (!product) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Product not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const wishlisted = isInWishlist(product.id);
  const lensExtra = LENS_OPTIONS.find(l => l.type === selectedLens)?.price || 0;
  const totalPrice = product.price + lensExtra;
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const handleAddToCart = () => {
    if (selectedLens !== 'non-powered') {
      setPrescriptionModal(true);
      return;
    }
    addItem({ product, quantity: 1, lensType: selectedLens, hasPower: false });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleConfirmAdd = () => {
    addItem({ product, quantity: 1, lensType: selectedLens, hasPower: true });
    setPrescriptionModal(false);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const relatedProducts = products
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <View style={[styles.container]}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Image Gallery */}
        <View style={styles.galleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={e => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
            scrollEventThrottle={16}
          >
            {product.images.map((img, i) => (
              <Image key={i} source={{ uri: img }} style={styles.mainImage} resizeMode="cover" />
            ))}
          </ScrollView>

          {/* Dots */}
          <View style={styles.dots}>
            {product.images.map((_, i) => (
              <View key={i} style={[styles.dot, activeImage === i && styles.dotActive]} />
            ))}
          </View>

          {/* Wishlist floating button */}
          <TouchableOpacity style={styles.wishlistFab} onPress={() => toggleWishlist(product.id)}>
            <Ionicons
              name={wishlisted ? 'heart' : 'heart-outline'}
              size={22}
              color={wishlisted ? '#EF4444' : Colors.navy}
            />
          </TouchableOpacity>

          {/* 360° badge */}
          <TouchableOpacity style={styles.threeSixtyBadge}>
            <Ionicons name="refresh-circle-outline" size={16} color={Colors.white} />
            <Text style={styles.threeSixtyText}>360°</Text>
          </TouchableOpacity>
        </View>

        {/* Thumbnail strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbStrip}>
          {product.images.map((img, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.thumb, activeImage === i && styles.thumbActive]}
            >
              <Image source={{ uri: img }} style={styles.thumbImage} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.body}>
          {/* Brand & Name */}
          <View style={styles.productHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandName}>{product.brand}</Text>
              <Text style={styles.productName}>{product.name}</Text>
            </View>
            {product.isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond-outline" size={12} color={Colors.gold} />
                <Text style={styles.premiumText}>PREMIUM</Text>
              </View>
            )}
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map(s => (
              <Ionicons
                key={s}
                name={s <= Math.floor(product.rating) ? 'star' : 'star-outline'}
                size={16}
                color={Colors.gold}
              />
            ))}
            <Text style={styles.ratingScore}>{product.rating}</Text>
            <Text style={styles.reviewCount}>{product.reviews} reviews</Text>
          </View>

          {/* Price */}
          <View style={styles.priceBlock}>
            <Text style={styles.mainPrice}>₹{product.price.toLocaleString()}</Text>
            {product.originalPrice && (
              <>
                <Text style={styles.strikePrice}>₹{product.originalPrice.toLocaleString()}</Text>
                <View style={styles.discountPill}>
                  <Text style={styles.discountText}>{discount}% OFF</Text>
                </View>
              </>
            )}
          </View>

          {/* Virtual Try-On */}
          <TouchableOpacity style={styles.tryOnBtn} onPress={() => setTryOnModal(true)}>
            <Ionicons name="camera-outline" size={18} color={Colors.navy} />
            <Text style={styles.tryOnBtnText}>Virtual Try-On</Text>
            <View style={styles.tryOnBeta}>
              <Text style={styles.tryOnBetaText}>BETA</Text>
            </View>
          </TouchableOpacity>

          {/* Frame Specs */}
          <View style={styles.specsSection}>
            <Text style={styles.sectionTitle}>Frame Specifications</Text>
            <View style={styles.specsGrid}>
              {[
                { label: 'Size', value: product.specs.size },
                { label: 'Weight', value: product.specs.weight },
                { label: 'Lens Width', value: product.specs.lensWidth },
                { label: 'Bridge', value: product.specs.bridgeWidth },
                { label: 'Temple', value: product.specs.templeLength },
                { label: 'Material', value: product.material.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()) },
                { label: 'Shape', value: product.frameShape.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()) },
                { label: 'Color', value: product.color },
              ].map((spec, i) => (
                <View key={i} style={styles.specItem}>
                  <Text style={styles.specLabel}>{spec.label}</Text>
                  <Text style={styles.specValue}>{spec.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Color Options */}
          <View style={styles.colorSection}>
            <Text style={styles.sectionTitle}>Color Options</Text>
            <View style={styles.colorDots}>
              {product.colors.map((c, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.colorDot, { backgroundColor: c }, i === 0 && styles.colorDotSelected]}
                />
              ))}
            </View>
          </View>

          {/* Lens Customization */}
          <View style={styles.lensSection}>
            <Text style={styles.sectionTitle}>Select Lens Type</Text>
            <Text style={styles.sectionSub}>Customize your lenses to your prescription needs</Text>
            {LENS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.type}
                style={[styles.lensCard, selectedLens === opt.type && styles.lensCardActive]}
                onPress={() => setSelectedLens(opt.type)}
              >
                <View style={styles.lensCardLeft}>
                  <View style={[styles.radioCircle, selectedLens === opt.type && styles.radioActive]}>
                    {selectedLens === opt.type && <View style={styles.radioFill} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.lensLabel, selectedLens === opt.type && { color: Colors.navy }]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.lensDesc}>{opt.desc}</Text>
                  </View>
                </View>
                <Text style={styles.lensPrice}>
                  {opt.price === 0 ? 'Free' : `+₹${opt.price}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <View style={styles.descSection}>
            <Text style={styles.sectionTitle}>About This Frame</Text>
            <Text style={styles.description}>{product.description}</Text>
            <View style={styles.tagRow}>
              {product.tags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={styles.sectionTitle}>You May Also Like</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relatedScroll}>
                {relatedProducts.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.relatedCard}
                    onPress={() => router.push(`/product/${p.id}`)}
                  >
                    <Image source={{ uri: p.image }} style={styles.relatedImage} />
                    <Text style={styles.relatedName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.relatedPrice}>₹{p.price.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>₹{totalPrice.toLocaleString()}</Text>
        </View>
        <View style={styles.bottomBtns}>
          <TouchableOpacity
            style={styles.wishlistOutlineBtn}
            onPress={() => toggleWishlist(product.id)}
          >
            <Ionicons
              name={wishlisted ? 'heart' : 'heart-outline'}
              size={20}
              color={wishlisted ? '#EF4444' : Colors.navy}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addToCartBtn, addedToCart && { backgroundColor: '#10B981' }]}
            onPress={handleAddToCart}
          >
            <Ionicons
              name={addedToCart ? 'checkmark-circle-outline' : 'bag-add-outline'}
              size={18}
              color={Colors.white}
            />
            <Text style={styles.addToCartText}>
              {addedToCart ? 'Added to Bag!' : 'Add to Bag'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Prescription Modal */}
      <Modal visible={prescriptionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.prescriptionModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Prescription</Text>
              <TouchableOpacity onPress={() => setPrescriptionModal(false)}>
                <Ionicons name="close" size={22} color={Colors.navy} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.prescriptionBody}>
              <Text style={styles.prescriptionInfo}>
                Please provide your eye prescription to continue with powered lenses.
              </Text>
              <TouchableOpacity style={styles.uploadOption}>
                <Ionicons name="camera-outline" size={24} color={Colors.gold} />
                <Text style={styles.uploadOptionText}>Take Photo of Prescription</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadOption}>
                <Ionicons name="cloud-upload-outline" size={24} color={Colors.gold} />
                <Text style={styles.uploadOptionText}>Upload from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadOption}>
                <Ionicons name="create-outline" size={24} color={Colors.gold} />
                <Text style={styles.uploadOptionText}>Enter Prescription Manually</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.prescriptionFooter}>
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => { setPrescriptionModal(false); addItem({ product, quantity: 1, lensType: selectedLens, hasPower: true }); }}
              >
                <Text style={styles.skipBtnText}>Add Now, Upload Later</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmAdd}>
                <Text style={styles.confirmBtnText}>Confirm & Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Virtual Try-On Modal */}
      <Modal visible={tryOnModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.tryOnModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Virtual Try-On</Text>
              <TouchableOpacity onPress={() => setTryOnModal(false)}>
                <Ionicons name="close" size={22} color={Colors.white} />
              </TouchableOpacity>
            </View>
            <View style={styles.tryOnPlaceholder}>
              <Ionicons name="camera" size={64} color="rgba(255,255,255,0.4)" />
              <Text style={styles.tryOnPlaceholderTitle}>Face Camera Here</Text>
              <Text style={styles.tryOnPlaceholderSub}>AR Virtual Try-On{'\n'}Coming Soon</Text>
              <View style={styles.tryOnFrameOverlay}>
                <Image source={{ uri: product.image }} style={styles.tryOnFrameImage} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notFoundText: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 22, color: Colors.navy },
  backBtn: { backgroundColor: Colors.navy, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 8 },
  backBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.white },

  // Gallery
  galleryContainer: { position: 'relative', width, height: 340, backgroundColor: Colors.white },
  mainImage: { width, height: 340 },
  dots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: Colors.white, width: 18 },
  wishlistFab: {
    position: 'absolute',
    top: 12,
    right: 16,
    backgroundColor: Colors.white,
    borderRadius: 24,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  threeSixtyBadge: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    backgroundColor: 'rgba(13,27,42,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  threeSixtyText: { color: Colors.white, fontFamily: 'DMSans_700Bold', fontSize: 11 },

  // Thumbnail strip
  thumbStrip: { backgroundColor: Colors.white, paddingVertical: 10 },
  thumb: {
    width: 60,
    height: 50,
    marginLeft: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  thumbActive: { borderColor: Colors.gold, borderWidth: 2 },
  thumbImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  body: { padding: 20 },

  // Header
  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  brandName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    color: Colors.gold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  productName: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 30,
    color: Colors.navy,
    lineHeight: 36,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  premiumText: { fontFamily: 'DMSans_700Bold', fontSize: 9, color: Colors.gold, letterSpacing: 1 },

  // Rating
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  ratingScore: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary, marginLeft: 4 },
  reviewCount: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary },

  // Price
  priceBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  mainPrice: { fontFamily: 'DMSans_700Bold', fontSize: 28, color: Colors.navy },
  strikePrice: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.textLight,
    textDecorationLine: 'line-through',
  },
  discountPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: '#D97706' },

  // Try-On Button
  tryOnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.navy,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  tryOnBtnText: { flex: 1, fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.navy },
  tryOnBeta: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  tryOnBetaText: { fontFamily: 'DMSans_700Bold', fontSize: 9, color: Colors.gold },

  sectionTitle: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 22,
    color: Colors.navy,
    marginBottom: 14,
  },
  sectionSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: -10,
    marginBottom: 14,
  },

  // Specs
  specsSection: { marginBottom: 24 },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  specItem: {
    width: '50%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
  },
  specLabel: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textSecondary, marginBottom: 3 },
  specValue: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textPrimary },

  // Colors
  colorSection: { marginBottom: 24 },
  colorDots: { flexDirection: 'row', gap: 12 },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  colorDotSelected: {
    borderWidth: 2.5,
    borderColor: Colors.gold,
  },

  // Lens
  lensSection: { marginBottom: 24 },
  lensCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 10,
    backgroundColor: Colors.white,
  },
  lensCardActive: { borderColor: Colors.navy, backgroundColor: '#F0F4F9' },
  lensCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: Colors.navy },
  radioFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.navy },
  lensLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  lensDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textLight },
  lensPrice: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.gold },

  // Description
  descSection: { marginBottom: 24 },
  description: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 14,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: Colors.cream,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },

  // Related
  relatedSection: { marginBottom: 32 },
  relatedScroll: { marginHorizontal: -20 },
  relatedCard: {
    width: 130,
    marginLeft: 20,
    backgroundColor: Colors.white,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  relatedImage: { width: '100%', height: 90, resizeMode: 'cover' },
  relatedName: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.textPrimary,
    padding: 8,
    paddingBottom: 4,
  },
  relatedPrice: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: Colors.navy,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },

  // Bottom Bar
  bottomBar: {
    backgroundColor: Colors.white,
    paddingTop: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary },
  totalPrice: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.navy },
  bottomBtns: { flexDirection: 'row', gap: 12 },
  wishlistOutlineBtn: {
    width: 50,
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartBtn: {
    flex: 1,
    height: 50,
    backgroundColor: Colors.navy,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addToCartText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.white },

  // Prescription Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  prescriptionModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 22, color: Colors.navy },
  prescriptionBody: { padding: 20 },
  prescriptionInfo: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  uploadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    backgroundColor: Colors.cream,
  },
  uploadOptionText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary },
  prescriptionFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  skipBtnText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary },
  confirmBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: Colors.navy,
    alignItems: 'center',
  },
  confirmBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.white },

  // Try-On Modal
  tryOnModal: {
    backgroundColor: Colors.navy,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
  },
  tryOnPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  tryOnPlaceholderTitle: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 28,
    color: Colors.white,
    marginTop: 16,
  },
  tryOnPlaceholderSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 22,
  },
  tryOnFrameOverlay: { marginTop: 20, opacity: 0.6 },
  tryOnFrameImage: { width: 200, height: 120, resizeMode: 'contain' },
});

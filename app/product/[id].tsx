import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
import { type Product, products as localProducts } from '../../data/products';
import { useProducts } from '../../hooks/useProducts';
import { useCart, LensType } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { dbProductToApp } from '../../lib/database.types';
import { IS_DEMO } from '../../lib/config';
import ProductImage from '@/components/ProductImage';
import {
  VISION_TYPES,
  packagesForVision,
  lensPrice,
  lensRequiresPower,
  type VisionType,
} from '../../data/lenses';

const { width } = Dimensions.get('window');

const num = (s: string) => (s.trim() === '' ? null : Number(s));
const int = (s: string) => (s.trim() === '' ? null : parseInt(s, 10));

// Face-shape finder (no camera) — maps a face shape to recommended frame shapes.
const FACE_FINDER: Record<string, { advice: string; shapes: string[]; shop: string }> = {
  Oval: { advice: 'Lucky you — most frames suit an oval face.', shapes: ['Wayfarer', 'Aviator', 'Cat-Eye'], shop: 'Wayfarer' },
  Round: { advice: 'Angular frames add definition to a round face.', shapes: ['Rectangle', 'Square', 'Wayfarer'], shop: 'Rectangle' },
  Square: { advice: 'Soften a strong jaw with curved frames.', shapes: ['Round', 'Oval', 'Cat-Eye'], shop: 'Round' },
  Heart: { advice: 'Balance a wider forehead with rounded frames.', shapes: ['Round', 'Aviator'], shop: 'Round' },
  Diamond: { advice: 'Highlight your cheekbones with cat-eye or oval frames.', shapes: ['Cat-Eye', 'Oval'], shop: 'Cat-Eye' },
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { products } = useProducts();
  const product = products.find(p => p.id === id) ?? localProducts.find(p => p.id === id);
  const { addItem, toggleWishlist, isInWishlist } = useCart();

  const [activeImage, setActiveImage] = useState(0);
  const [selectedVision, setSelectedVision] = useState<VisionType>('non-powered');
  const [selectedLens, setSelectedLens] = useState<LensType>('non-powered');
  const [prescriptionModal, setPrescriptionModal] = useState(false);
  const [tryOnModal, setTryOnModal] = useState(false);
  const [faceShape, setFaceShape] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const [rx, setRx] = useState({ r_sph: '', r_cyl: '', r_axis: '', l_sph: '', l_cyl: '', l_axis: '', pd: '' });
  const [savedRx, setSavedRx] = useState<{ id: string; name: string }[]>([]);
  const [reviews, setReviews] = useState<{ id: string; rating: number; title: string | null; body: string | null; verified_purchase: boolean; created_at: string }[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myReview, setMyReview] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const galleryRef = useRef<ScrollView>(null);
  const { user } = useAuth();
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!product) return;
    const fallback = products
      .filter(p => p.category === product.category && p.id !== product.id)
      .slice(0, 4);
    if (IS_DEMO) {
      setRelatedProducts(fallback);
      setReviews([{ id: 'demo-r1', rating: 5, title: null, body: 'Great quality and a perfect fit!', verified_purchase: true, created_at: '2026-05-01T00:00:00Z' }]);
      return;
    }
    let active = true;
    (async () => {
      const { data, error } = await (supabase.rpc as any)('recommended_products', {
        p_product_id: product.id,
        p_limit: 4,
      });
      if (active) {
        setRelatedProducts(error || !data ? fallback : (data as unknown[]).map(r => dbProductToApp(r as never)));
      }
    })();
    supabase.from('reviews').select('id, rating, title, body, verified_purchase, created_at').eq('product_id', product.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (active && data) setReviews(data as { id: string; rating: number; title: string | null; body: string | null; verified_purchase: boolean; created_at: string }[]); }, () => {});
    // Best-effort behavioural event (RLS requires the signed-in user).
    if (user?.id) {
      supabase.from('events').insert({ user_id: user.id, type: 'view', product_id: product.id } as never)
        .then(() => {}, () => {});
      supabase.from('prescriptions').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false })
        .then(({ data }) => { if (active && data) setSavedRx(data as { id: string; name: string }[]); }, () => {});
    }
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, user?.id, products]);

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
  const outOfStock = product.stockCount !== undefined && product.stockCount <= 0;
  const lensExtra = lensPrice(selectedLens);
  const requiresPower = lensRequiresPower(selectedLens);
  const totalPrice = product.price + lensExtra;
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const handleAddToCart = () => {
    if (outOfStock) return;
    if (requiresPower) {
      setPrescriptionModal(true);
      return;
    }
    addItem({ product, quantity: 1, lensType: selectedLens, hasPower: false });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const addPowered = (prescription: string) => {
    addItem({ product, quantity: 1, lensType: selectedLens, hasPower: true, prescription });
    setPrescriptionModal(false);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleConfirmAdd = () => {
    const summary = `R ${rx.r_sph || '—'}/${rx.r_cyl || '—'}x${rx.r_axis || '—'} · L ${rx.l_sph || '—'}/${rx.l_cyl || '—'}x${rx.l_axis || '—'} · PD ${rx.pd || '—'}`;
    if (!IS_DEMO && user?.id) {
      supabase.from('prescriptions').insert({
        user_id: user.id,
        name: `${product.name} Rx`,
        r_sph: num(rx.r_sph), r_cyl: num(rx.r_cyl), r_axis: int(rx.r_axis),
        l_sph: num(rx.l_sph), l_cyl: num(rx.l_cyl), l_axis: int(rx.l_axis),
        pd: num(rx.pd),
      } as never).then(() => {}, () => {});
    }
    addPowered(summary);
  };

  const submitReview = () => {
    if (myRating < 1 || !product) return;
    const local = { id: `local-${Date.now()}`, rating: myRating, title: null, body: myReview.trim() || null, verified_purchase: false, created_at: new Date().toISOString() };
    if (!IS_DEMO && user?.id) {
      supabase.from('reviews')
        .upsert({ product_id: product.id, user_id: user.id, rating: myRating, body: myReview.trim() || null } as never, { onConflict: 'product_id,user_id' })
        .then(() => {}, () => {});
    }
    setReviews(prev => [local, ...prev.filter(r => !r.id.startsWith('local-'))]);
    setMyRating(0);
    setMyReview('');
  };

  return (
    <View style={[styles.container]}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Image Gallery */}
        <View style={styles.galleryContainer}>
          <ScrollView
            ref={galleryRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={e => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
            scrollEventThrottle={16}
          >
            {product.images.map((img, i) => (
              <ProductImage key={i} uri={img} style={styles.mainImage} />
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
          <TouchableOpacity style={styles.threeSixtyBadge} onPress={() => router.push(`/tryon/${product.id}`)}>
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
              onPress={() => { setActiveImage(i); galleryRef.current?.scrollTo({ x: i * width, animated: true }); }}
            >
              <ProductImage uri={img} style={styles.thumbImage} />
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

          {/* Virtual Try-On (live AR) + face-shape finder */}
          <TouchableOpacity style={styles.tryOnBtn} onPress={() => router.push(`/tryon/${product.id}`)}>
            <Ionicons name="camera-outline" size={18} color={Colors.navy} />
            <Text style={styles.tryOnBtnText}>Virtual Try-On · Live AR</Text>
            <View style={styles.tryOnBeta}>
              <Text style={styles.tryOnBetaText}>BETA</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.finderLink} onPress={() => setTryOnModal(true)}>
            <Ionicons name="sparkles-outline" size={14} color={Colors.gold} />
            <Text style={styles.finderLinkText}>Not sure? Find your face shape</Text>
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

          {/* Lens selection wizard */}
          <View style={styles.lensSection}>
            <Text style={styles.sectionTitle}>Choose Your Lens</Text>
            <Text style={styles.sectionSub}>Step 1 — Vision type</Text>
            <View style={styles.visionRow}>
              {VISION_TYPES.map(v => (
                <TouchableOpacity
                  key={v.key}
                  style={[styles.visionCard, selectedVision === v.key && styles.visionCardActive]}
                  onPress={() => { setSelectedVision(v.key); setSelectedLens(packagesForVision(v.key)[0].type); }}
                >
                  <Ionicons name={v.icon as any} size={20} color={selectedVision === v.key ? Colors.navy : Colors.textSecondary} />
                  <Text style={[styles.visionLabel, selectedVision === v.key && { color: Colors.navy }]} numberOfLines={1}>{v.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionSub, { marginTop: 10 }]}>Step 2 — Lens package</Text>
            {packagesForVision(selectedVision).map(opt => (
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
                    <Text style={[styles.lensLabel, selectedLens === opt.type && { color: Colors.navy }]}>{opt.label}</Text>
                    <Text style={styles.lensDesc}>{opt.description}</Text>
                  </View>
                </View>
                <Text style={styles.lensPrice}>{opt.price === 0 ? 'Free' : `+₹${opt.price}`}</Text>
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
                    <ProductImage uri={p.image} style={styles.relatedImage} />
                    <Text style={styles.relatedName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.relatedPrice}>₹{p.price.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Reviews */}
          <View style={styles.reviewsSection}>
            <Text style={styles.sectionTitle}>Reviews{reviews.length ? ` (${reviews.length})` : ''}</Text>
            <View style={styles.writeReview}>
              <Text style={styles.writeLabel}>Rate this product</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(s => (
                  <TouchableOpacity key={s} onPress={() => setMyRating(s)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Ionicons name={s <= myRating ? 'star' : 'star-outline'} size={26} color={Colors.gold} />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.reviewInput}
                value={myReview}
                onChangeText={setMyReview}
                placeholder="Share your thoughts (optional)"
                placeholderTextColor={Colors.textLight}
                multiline
              />
              <TouchableOpacity style={[styles.reviewSubmit, myRating < 1 && { opacity: 0.5 }]} disabled={myRating < 1} onPress={submitReview}>
                <Text style={styles.reviewSubmitText}>Submit review</Text>
              </TouchableOpacity>
            </View>
            {reviews.length === 0 ? (
              <Text style={styles.noReviews}>No reviews yet — be the first!</Text>
            ) : reviews.map(r => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHead}>
                  <View style={{ flexDirection: 'row' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Ionicons key={s} name={s <= r.rating ? 'star' : 'star-outline'} size={13} color={Colors.gold} />
                    ))}
                  </View>
                  {r.verified_purchase && <Text style={styles.verifiedTag}>✓ Verified purchase</Text>}
                </View>
                {!!r.body && <Text style={styles.reviewBody}>{r.body}</Text>}
                <Text style={styles.reviewDate}>{new Date(r.created_at).toLocaleDateString()}</Text>
              </View>
            ))}
          </View>
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
            style={[
              styles.addToCartBtn,
              addedToCart && { backgroundColor: '#10B981' },
              outOfStock && { backgroundColor: Colors.textMuted },
            ]}
            onPress={handleAddToCart}
            disabled={outOfStock}
          >
            <Ionicons
              name={outOfStock ? 'close-circle-outline' : addedToCart ? 'checkmark-circle-outline' : 'bag-add-outline'}
              size={18}
              color={Colors.white}
            />
            <Text style={styles.addToCartText}>
              {outOfStock ? 'Out of Stock' : addedToCart ? 'Added to Bag!' : 'Add to Bag'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Prescription Modal */}
      <Modal visible={prescriptionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.prescriptionModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Prescription</Text>
              <TouchableOpacity onPress={() => setPrescriptionModal(false)}>
                <Ionicons name="close" size={22} color={Colors.navy} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.prescriptionBody}>
              <Text style={styles.prescriptionInfo}>
                Enter your prescription for powered lenses — or add now and submit it later.
              </Text>

              {savedRx.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.rxGroupTitle}>Use a saved prescription</Text>
                  {savedRx.map(s => (
                    <TouchableOpacity key={s.id} style={styles.savedRxRow} onPress={() => addPowered(`Saved: ${s.name}`)}>
                      <Ionicons name="document-text-outline" size={18} color={Colors.gold} />
                      <Text style={styles.savedRxText} numberOfLines={1}>{s.name}</Text>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.rxGroupTitle}>Enter manually</Text>
              <View style={styles.rxHeaderRow}>
                <Text style={[styles.rxEyeLabel, { color: Colors.textSecondary }]}> </Text>
                <Text style={styles.rxCellHead}>SPH</Text>
                <Text style={styles.rxCellHead}>CYL</Text>
                <Text style={styles.rxCellHead}>AXIS</Text>
              </View>
              <View style={styles.rxRow}>
                <Text style={styles.rxEyeLabel}>R</Text>
                <TextInput style={styles.rxInput} value={rx.r_sph} onChangeText={t => setRx({ ...rx, r_sph: t })} keyboardType="numbers-and-punctuation" placeholder="0.00" placeholderTextColor={Colors.textLight} />
                <TextInput style={styles.rxInput} value={rx.r_cyl} onChangeText={t => setRx({ ...rx, r_cyl: t })} keyboardType="numbers-and-punctuation" placeholder="0.00" placeholderTextColor={Colors.textLight} />
                <TextInput style={styles.rxInput} value={rx.r_axis} onChangeText={t => setRx({ ...rx, r_axis: t })} keyboardType="number-pad" placeholder="0" placeholderTextColor={Colors.textLight} />
              </View>
              <View style={styles.rxRow}>
                <Text style={styles.rxEyeLabel}>L</Text>
                <TextInput style={styles.rxInput} value={rx.l_sph} onChangeText={t => setRx({ ...rx, l_sph: t })} keyboardType="numbers-and-punctuation" placeholder="0.00" placeholderTextColor={Colors.textLight} />
                <TextInput style={styles.rxInput} value={rx.l_cyl} onChangeText={t => setRx({ ...rx, l_cyl: t })} keyboardType="numbers-and-punctuation" placeholder="0.00" placeholderTextColor={Colors.textLight} />
                <TextInput style={styles.rxInput} value={rx.l_axis} onChangeText={t => setRx({ ...rx, l_axis: t })} keyboardType="number-pad" placeholder="0" placeholderTextColor={Colors.textLight} />
              </View>
              <View style={styles.rxPdRow}>
                <Text style={styles.rxPdLabel}>PD (mm)</Text>
                <TextInput style={[styles.rxInput, { flex: 0, width: 90 }]} value={rx.pd} onChangeText={t => setRx({ ...rx, pd: t })} keyboardType="number-pad" placeholder="63" placeholderTextColor={Colors.textLight} />
              </View>
            </ScrollView>
            <View style={styles.prescriptionFooter}>
              <TouchableOpacity style={styles.skipBtn} onPress={() => addPowered('Submit later')}>
                <Text style={styles.skipBtnText}>Add, submit later</Text>
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
              <Text style={[styles.modalTitle, { color: Colors.white }]}>Find Your Fit</Text>
              <TouchableOpacity onPress={() => setTryOnModal(false)}>
                <Ionicons name="close" size={22} color={Colors.white} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.finderBody}>
              <View style={styles.tryOnFrameOverlay}>
                <ProductImage uri={product.image} style={styles.tryOnFrameImage} contentFit="contain" />
              </View>
              <Text style={styles.finderTitle}>What's your face shape?</Text>
              <Text style={styles.finderSub}>Pick one for instant frame recommendations.</Text>
              <View style={styles.faceChips}>
                {Object.keys(FACE_FINDER).map(f => (
                  <TouchableOpacity key={f} style={[styles.faceChip, faceShape === f && styles.faceChipActive]} onPress={() => setFaceShape(f)}>
                    <Text style={[styles.faceChipText, faceShape === f && { color: Colors.navy }]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {faceShape && (
                <View style={styles.finderResult}>
                  <Text style={styles.finderAdvice}>{FACE_FINDER[faceShape].advice}</Text>
                  <Text style={styles.finderRec}>Recommended: {FACE_FINDER[faceShape].shapes.join(', ')}</Text>
                  <TouchableOpacity
                    style={styles.finderShopBtn}
                    onPress={() => { setTryOnModal(false); router.push({ pathname: '/products', params: { shape: FACE_FINDER[faceShape].shop } }); }}
                  >
                    <Ionicons name="grid-outline" size={16} color={Colors.navy} />
                    <Text style={styles.finderShopText}>Shop matching frames</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.tryOnNote}>Live camera AR try-on (3D) is coming next — it needs on-device face tracking plus per-frame 3D / transparent assets.</Text>
            </ScrollView>
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
  finderLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: -14, marginBottom: 22 },
  finderLinkText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.gold, textDecorationLine: 'underline' },

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

  // Vision-type wizard
  visionRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  visionCard: {
    flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 4,
    borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  visionCardActive: { borderColor: Colors.navy, backgroundColor: '#F0F4F9' },
  visionLabel: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },

  // Prescription form
  rxGroupTitle: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textPrimary, marginBottom: 8 },
  savedRxRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.cream, marginBottom: 8,
  },
  savedRxText: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary },
  rxHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  rxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  rxEyeLabel: { width: 24, fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.navy, textAlign: 'center' },
  rxCellHead: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  rxInput: {
    flex: 1, height: 42, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 8,
    textAlign: 'center', fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.white,
  },
  rxPdRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 },
  rxPdLabel: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textSecondary },

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

  // Reviews
  reviewsSection: { marginBottom: 32 },
  writeReview: { backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 14 },
  writeLabel: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  starsRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  reviewInput: { minHeight: 44, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.cream, marginBottom: 10 },
  reviewSubmit: { backgroundColor: Colors.navy, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  reviewSubmitText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.white },
  reviewCard: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  verifiedTag: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.success },
  reviewBody: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textPrimary, lineHeight: 20, marginBottom: 4 },
  reviewDate: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textLight },
  noReviews: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary },
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
  tryOnFrameOverlay: { alignItems: 'center', opacity: 0.85, marginBottom: 8 },
  tryOnFrameImage: { width: 200, height: 120, resizeMode: 'contain' },

  // Face-shape finder
  finderBody: { padding: 20, gap: 10 },
  finderTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 24, color: Colors.white, textAlign: 'center' },
  finderSub: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 6 },
  faceChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  faceChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5, borderColor: Colors.gold, backgroundColor: 'transparent' },
  faceChipActive: { backgroundColor: Colors.gold },
  faceChipText: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.gold },
  finderResult: { backgroundColor: Colors.navyLight, borderRadius: 12, padding: 16, gap: 8, marginTop: 6 },
  finderAdvice: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.white, lineHeight: 20 },
  finderRec: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.gold },
  finderShopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.gold, borderRadius: 10, paddingVertical: 12, marginTop: 4 },
  finderShopText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.navy },
  tryOnNote: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 17, marginTop: 8 },
});

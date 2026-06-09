import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';
import { Colors } from '../../constants/Colors';
import { useCart, cartLineKey } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../hooks/useOrders';
import { createPaymentOrder, verifyPayment } from '../../services/payments';
import { IS_DEMO } from '../../lib/config';
import { supabase } from '../../lib/supabase';
import { lensLabel, lensPrice } from '../../data/lenses';
import EmptyState from '../../components/EmptyState';
import ProductImage from '@/components/ProductImage';
import { Address, loadAddresses, addAddress, isComplete as addressComplete } from '../../lib/addresses';

const PAYMENT_METHODS = [
  { id: 'upi', icon: 'phone-portrait-outline', label: 'UPI / GPay / PhonePe' },
  { id: 'card', icon: 'card-outline', label: 'Credit / Debit Card' },
  { id: 'cod', icon: 'cash-outline', label: 'Cash on Delivery' },
];

const ADDRESS_FIELDS = [
  { label: 'Full Name', key: 'name', keyboard: 'default' as const },
  { label: 'Phone Number', key: 'phone', keyboard: 'phone-pad' as const },
  { label: 'Flat / House No.', key: 'flat', keyboard: 'default' as const },
  { label: 'Street / Area', key: 'street', keyboard: 'default' as const },
  { label: 'City', key: 'city', keyboard: 'default' as const },
  { label: 'State', key: 'state', keyboard: 'default' as const },
  { label: 'PIN Code', key: 'pin', keyboard: 'number-pad' as const },
];

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { items, removeItem, updateQuantity, totalItems, totalPrice, clearCart } = useCart();
  const { user, session } = useAuth();
  const { placeOrder, refresh } = useOrders(user?.id);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'address' | 'payment' | 'success'>('cart');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [address, setAddress] = useState({ name: '', phone: '', flat: '', street: '', city: '', state: '', pin: '' });
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [placedTotal, setPlacedTotal] = useState(0);

  const [coupon, setCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [usePoints, setUsePoints] = useState(false);

  const lensTotal = items.reduce((s, i) => s + lensPrice(i.lensType) * i.quantity, 0);
  const subtotal = totalPrice + lensTotal;
  const memberDiscount = isMember ? Math.floor(subtotal * 0.05) : 0;
  const couponDiscount = appliedCoupon?.discount ?? 0;
  // Points: 1 point = ₹1, capped at the balance and the post-member/coupon goods value.
  const maxRedeem = Math.min(pointsBalance, Math.max(0, subtotal - memberDiscount - couponDiscount));
  const pointsDiscount = usePoints ? maxRedeem : 0;
  const discount = memberDiscount + couponDiscount + pointsDiscount;
  const shipping = isMember || subtotal - discount >= 999 ? 0 : 99;
  const grandTotal = Math.max(0, subtotal - discount) + shipping;
  const earnEstimate = Math.floor(grandTotal / 100) * (isMember ? 2 : 1);

  // Load saved addresses; prefill the form from the default when it's still blank.
  useEffect(() => {
    let active = true;
    loadAddresses(user?.id).then(list => {
      if (!active) return;
      setSavedAddresses(list);
      const def = list.find(a => a.isDefault) ?? list[0];
      if (def) {
        setAddress(prev =>
          prev.name || prev.phone || prev.flat
            ? prev
            : { name: def.name, phone: def.phone, flat: def.flat, street: def.street, city: def.city, state: def.state, pin: def.pin }
        );
      }
    });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (IS_DEMO || !user?.id) { setIsMember(false); setPointsBalance(0); return; }
    let active = true;
    supabase.from('memberships').select('active, expires_at').eq('user_id', user.id).limit(1)
      .then(({ data }) => {
        if (!active) return;
        const m = (data?.[0] ?? null) as { active: boolean; expires_at: string | null } | null;
        setIsMember(!!m && m.active && (!m.expires_at || new Date(m.expires_at) > new Date()));
      }, () => {});
    supabase.from('profiles').select('points').eq('id', user.id).single()
      .then(({ data }) => { if (active && data) setPointsBalance((data as { points: number }).points ?? 0); }, () => {});
    return () => { active = false; };
  }, [user?.id]);

  async function applyCoupon() {
    const code = coupon.trim().toUpperCase();
    setCouponError('');
    if (!code) return;
    const base = subtotal - memberDiscount;
    if (IS_DEMO) {
      if (code === 'WELCOME10' && base >= 999) setAppliedCoupon({ code, discount: Math.floor(base * 0.1) });
      else if (code === 'FLAT200' && base >= 1999) setAppliedCoupon({ code, discount: 200 });
      else { setAppliedCoupon(null); setCouponError('Invalid code or minimum not met'); }
      return;
    }
    const { data } = await (supabase.rpc as any)('validate_coupon', { p_code: code, p_subtotal: base });
    if (data?.valid) setAppliedCoupon({ code, discount: data.discount });
    else { setAppliedCoupon(null); setCouponError(data?.message ?? 'Invalid code'); }
  }

  if (items.length === 0 && checkoutStep !== 'success') {
    return (
      <View style={[styles.emptyContainer, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Bag</Text>
        </View>
        <EmptyState
          icon="bag-outline"
          title="Your bag is empty"
          description="Browse our collection and add your favourite frames to the bag"
          ctaLabel="Explore Frames"
          ctaIcon="grid-outline"
          onCta={() => router.push('/(tabs)/products')}
          secondaryLabel="View Wishlist"
          onSecondary={() => router.push('/wishlist')}
        />
      </View>
    );
  }

  if (checkoutStep === 'success') {
    return (
      <View style={[styles.successContainer, { paddingTop: insets.top }]}>
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={48} color={Colors.white} />
          </View>
          <Text style={styles.successTitle}>Order Placed!</Text>
          <Text style={styles.successDesc}>
            Your order has been confirmed.{'\n'}Estimated delivery: 3–5 business days.
          </Text>
          <View style={styles.orderCard}>
            {placedOrderId && (
              <Text style={styles.orderLabel}>#{placedOrderId.slice(0, 8).toUpperCase()}</Text>
            )}
            <Text style={styles.orderLabel}>Order Total</Text>
            <Text style={styles.orderValue}>₹{placedTotal.toLocaleString()}</Text>
          </View>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => { clearCart(); setCheckoutStep('cart'); router.push('/'); }}
          >
            <Text style={styles.continueBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        {checkoutStep !== 'cart' ? (
          <TouchableOpacity onPress={() => setCheckoutStep('cart')}>
            <Ionicons name="arrow-back" size={22} color={Colors.navy} />
          </TouchableOpacity>
        ) : <View style={{ width: 22 }} />}
        <Text style={styles.headerTitle}>
          {checkoutStep === 'cart' ? `My Bag (${totalItems})` : checkoutStep === 'address' ? 'Delivery Address' : 'Payment'}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepBar}>
        {['cart', 'address', 'payment'].map((s, i) => (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.stepDot, (checkoutStep === s || (i < ['cart', 'address', 'payment'].indexOf(checkoutStep))) && styles.stepDotActive]}>
              <Text style={styles.stepDotText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepLabel}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
            {i < 2 && <View style={styles.stepLine} />}
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {checkoutStep === 'cart' && (
          <View>
            {/* Cart Items */}
            {items.map(item => (
              <View key={cartLineKey(item.product.id, item.lensType)} style={styles.cartItem}>
                <ProductImage uri={item.product.image} style={styles.cartImage} />
                <View style={styles.cartDetails}>
                  <Text style={styles.cartBrand}>{item.product.brand}</Text>
                  <Text style={styles.cartName} numberOfLines={1}>{item.product.name}</Text>
                  <Text style={styles.cartLens}>{lensLabel(item.lensType)}</Text>
                  {item.hasPower && (
                    <View style={styles.prescriptionPill}>
                      <Ionicons name="document-text-outline" size={10} color={Colors.gold} />
                      <Text style={styles.prescriptionPillText}>Prescription Added</Text>
                    </View>
                  )}
                  <View style={styles.cartPriceRow}>
                    <Text style={styles.cartPrice}>₹{item.product.price.toLocaleString()}</Text>
                    {lensPrice(item.lensType) > 0 && (
                      <Text style={styles.cartLensPrice}>+₹{lensPrice(item.lensType)} lens</Text>
                    )}
                  </View>
                </View>
                <View style={styles.cartActions}>
                  <TouchableOpacity onPress={() => removeItem(cartLineKey(item.product.id, item.lensType))} style={styles.removeBtn}>
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  </TouchableOpacity>
                  <View style={styles.qtyControl}>
                    <TouchableOpacity
                      onPress={() => item.quantity > 1
                        ? updateQuantity(cartLineKey(item.product.id, item.lensType), item.quantity - 1)
                        : removeItem(cartLineKey(item.product.id, item.lensType))}
                    >
                      <Ionicons name="remove-circle-outline" size={22} color={Colors.navy} />
                    </TouchableOpacity>
                    <Text style={styles.qty}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => updateQuantity(cartLineKey(item.product.id, item.lensType), item.quantity + 1)}>
                      <Ionicons name="add-circle-outline" size={22} color={Colors.navy} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {/* Promo Input */}
            <View style={styles.promoSection}>
              <Ionicons name="pricetag-outline" size={16} color={Colors.textSecondary} />
              <TextInput
                style={styles.promoInput}
                placeholder="Coupon code (e.g. WELCOME10)"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="characters"
                value={coupon}
                onChangeText={setCoupon}
              />
              <TouchableOpacity style={styles.applyPromo} onPress={applyCoupon}>
                <Text style={styles.applyPromoText}>{appliedCoupon ? 'Applied' : 'Apply'}</Text>
              </TouchableOpacity>
            </View>
            {couponError ? <Text style={styles.couponError}>{couponError}</Text> : null}

            {/* Loyalty points */}
            {pointsBalance > 0 && (
              <View style={styles.pointsCard}>
                <Ionicons name="star" size={18} color={Colors.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pointsTitle}>
                    {maxRedeem > 0 ? `Redeem ${maxRedeem} points` : 'Reward points'}
                  </Text>
                  <Text style={styles.pointsSub}>
                    {pointsBalance} pts available{maxRedeem > 0 ? ` · ₹${maxRedeem} off` : ''}
                  </Text>
                </View>
                <Switch
                  value={usePoints && maxRedeem > 0}
                  disabled={maxRedeem <= 0}
                  onValueChange={setUsePoints}
                  trackColor={{ false: Colors.border, true: Colors.gold }}
                  thumbColor={Colors.white}
                />
              </View>
            )}

            {/* Order Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Frames ({totalItems})</Text>
                <Text style={styles.summaryValue}>₹{totalPrice.toLocaleString()}</Text>
              </View>
              {lensTotal > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Lens Customization</Text>
                  <Text style={styles.summaryValue}>₹{lensTotal.toLocaleString()}</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                <Text style={[styles.summaryValue, shipping === 0 && { color: '#10B981' }]}>
                  {shipping === 0 ? 'FREE' : `₹${shipping}`}
                </Text>
              </View>
              {memberDiscount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: Colors.gold }]}>Gold member (5%)</Text>
                  <Text style={[styles.summaryValue, { color: '#10B981' }]}>−₹{memberDiscount.toLocaleString()}</Text>
                </View>
              )}
              {couponDiscount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: Colors.gold }]}>Coupon {appliedCoupon?.code}</Text>
                  <Text style={[styles.summaryValue, { color: '#10B981' }]}>−₹{couponDiscount.toLocaleString()}</Text>
                </View>
              )}
              {pointsDiscount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: Colors.gold }]}>Points redeemed</Text>
                  <Text style={[styles.summaryValue, { color: '#10B981' }]}>−₹{pointsDiscount.toLocaleString()}</Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.grandTotal}>₹{grandTotal.toLocaleString()}</Text>
              </View>
              {earnEstimate > 0 && (
                <View style={styles.earnRow}>
                  <Ionicons name="star-outline" size={13} color={Colors.gold} />
                  <Text style={styles.earnText}>You'll earn {earnEstimate} points on this order{isMember ? ' (2× Gold)' : ''}</Text>
                </View>
              )}
            </View>

            {/* Trust row */}
            <View style={styles.trustRow}>
              {[
                { icon: 'shield-checkmark-outline', text: 'Secure Payment' },
                { icon: 'car-outline', text: 'Free Shipping' },
                { icon: 'refresh-outline', text: '14-Day Return' },
              ].map((t, i) => (
                <View key={i} style={styles.trustItem}>
                  <Ionicons name={t.icon as any} size={16} color={Colors.gold} />
                  <Text style={styles.trustText}>{t.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {checkoutStep === 'address' && (
          <View style={styles.formSection}>
            {savedAddresses.length > 0 && (
              <View style={styles.savedWrap}>
                <Text style={styles.savedTitle}>Saved Addresses</Text>
                {savedAddresses.map(a => {
                  const selected = a.name === address.name && a.flat === address.flat && a.pin === address.pin;
                  return (
                    <TouchableOpacity
                      key={a.id}
                      style={[styles.savedCard, selected && styles.savedCardActive]}
                      onPress={() => setAddress({ name: a.name, phone: a.phone, flat: a.flat, street: a.street, city: a.city, state: a.state, pin: a.pin })}
                    >
                      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={18} color={selected ? Colors.navy : Colors.textLight} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.savedName}>{a.name} · {a.phone}</Text>
                        <Text style={styles.savedAddr} numberOfLines={1}>{[a.flat, a.street, a.city, a.state, a.pin].filter(Boolean).join(', ')}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <Text style={styles.savedHint}>Or enter a new address below</Text>
              </View>
            )}
            <Text style={styles.formIntro}>Where should we deliver your order?</Text>
            {ADDRESS_FIELDS.map(({ label, key, keyboard }) => (
              <View key={key} style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{label}</Text>
                <TextInput
                  style={styles.inputBox}
                  value={address[key as keyof typeof address]}
                  onChangeText={t => setAddress(prev => ({ ...prev, [key]: t }))}
                  placeholder={label}
                  placeholderTextColor={Colors.textLight}
                  keyboardType={keyboard}
                />
              </View>
            ))}
          </View>
        )}

        {checkoutStep === 'payment' && (
          <View style={styles.formSection}>
            <Text style={styles.formIntro}>Choose your payment method</Text>
            {PAYMENT_METHODS.map(pm => (
              <TouchableOpacity
                key={pm.id}
                style={[styles.paymentOption, paymentMethod === pm.id && styles.paymentOptionActive]}
                onPress={() => setPaymentMethod(pm.id)}
              >
                <Ionicons name={pm.icon as any} size={22} color={paymentMethod === pm.id ? Colors.navy : Colors.textSecondary} />
                <Text style={[styles.paymentLabel, paymentMethod === pm.id && { color: Colors.navy }]}>
                  {pm.label}
                </Text>
                <View style={[styles.radioCircle, paymentMethod === pm.id && styles.radioActive]}>
                  {paymentMethod === pm.id && <View style={styles.radioFill} />}
                </View>
              </TouchableOpacity>
            ))}
            <View style={styles.orderFinalCard}>
              <Text style={styles.summaryLabel}>Amount to Pay</Text>
              <Text style={styles.finalAmount}>₹{grandTotal.toLocaleString()}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.bottomSummary}>
          <Text style={styles.bottomTotal}>₹{grandTotal.toLocaleString()}</Text>
          <Text style={styles.bottomSub}>{totalItems} item{totalItems > 1 ? 's' : ''} · {shipping === 0 ? 'Free delivery' : `₹${shipping} delivery`}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutBtn, isPlacingOrder && { opacity: 0.7 }]}
          disabled={isPlacingOrder}
          onPress={async () => {
            if (checkoutStep === 'cart') { setCheckoutStep('address'); return; }
            if (checkoutStep === 'address') {
              if (!addressComplete(address)) {
                Alert.alert('Incomplete address', 'Please fill in all delivery details before continuing.');
                return;
              }
              setCheckoutStep('payment');
              return;
            }
            // Place order
            setIsPlacingOrder(true);
            const richItems = items.map(item => ({
              product_id: item.product.id,
              product_name: item.product.name,
              product_image: item.product.image,
              quantity: item.quantity,
              lens_type: item.lensType,
              price: item.product.price + lensPrice(item.lensType),
            }));
            const lineItems = items.map(item => ({
              product_id: item.product.id,
              lens_type: item.lensType,
              quantity: item.quantity,
            }));
            try {
              if (paymentMethod === 'cod' || IS_DEMO) {
                // COD (and demo) → server-authoritative place_order (mocked in demo).
                const order = await placeOrder({ items: richItems, total: grandTotal, paymentMethod, address, coupon: appliedCoupon?.code, redeemPoints: pointsDiscount });
                setPlacedOrderId(order.id);
              } else {
                // Online → Razorpay. The amount and the order are created and
                // verified server-side; the client never sends prices.
                const token = session?.access_token;
                if (!token) throw new Error('Please sign in again to pay.');
                let rzp;
                try {
                  rzp = await createPaymentOrder(lineItems, address, token, appliedCoupon?.code, pointsDiscount);
                } catch {
                  Alert.alert('Online payment unavailable', "Online payment isn't enabled yet. Please choose Cash on Delivery to place your order.");
                  setIsPlacingOrder(false);
                  return;
                }
                const result = (await RazorpayCheckout.open({
                  key: rzp.keyId,
                  order_id: rzp.razorpayOrderId,
                  amount: rzp.amount,
                  currency: rzp.currency,
                  name: 'AllenEyeCare',
                  description: 'Premium eyewear order',
                  prefill: { name: address.name, contact: address.phone },
                  theme: { color: Colors.navy },
                })) as { razorpay_payment_id: string; razorpay_signature: string };
                const verified = await verifyPayment(
                  {
                    razorpay_order_id: rzp.razorpayOrderId,
                    razorpay_payment_id: result.razorpay_payment_id,
                    razorpay_signature: result.razorpay_signature,
                    items: lineItems,
                    address,
                    payment_method: paymentMethod,
                    coupon: appliedCoupon?.code ?? null,
                    redeem_points: pointsDiscount,
                  },
                  token
                );
                setPlacedOrderId(verified.orderId);
                await refresh();
              }
              // Persist this address for next time (best-effort, dedup by key fields).
              const alreadySaved = savedAddresses.some(
                a => a.name === address.name && a.flat === address.flat && a.pin === address.pin
              );
              if (!alreadySaved && addressComplete(address)) {
                addAddress(user?.id, address).catch(() => {});
              }
              setPlacedTotal(grandTotal);
              clearCart();
              setCheckoutStep('success');
            } catch (e: any) {
              // Razorpay rejects (including user cancel) carry a `description`.
              const msg = e?.description || e?.error?.description || e?.message || 'Could not place your order. Please try again.';
              Alert.alert('Payment Failed', String(msg));
            } finally {
              setIsPlacingOrder(false);
            }
          }}
        >
          {isPlacingOrder ? (
            <ActivityIndicator color={Colors.navy} />
          ) : (
            <>
              <Text style={styles.checkoutBtnText}>
                {checkoutStep === 'cart' ? 'Proceed to Address' : checkoutStep === 'address' ? 'Continue to Payment' : 'Place Order'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.navy} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  emptyContainer: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 22,
    color: Colors.navy,
  },

  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: Colors.navy },
  stepDotText: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.white },
  stepLabel: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },
  stepLine: { flex: 1, height: 1, backgroundColor: Colors.border, width: 24 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 26, color: Colors.navy },
  emptyDesc: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  shopBtn: { backgroundColor: Colors.navy, paddingVertical: 14, paddingHorizontal: 36, borderRadius: 8, marginTop: 8 },
  shopBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.white },

  cartItem: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cartImage: { width: 110, height: 110, resizeMode: 'cover' },
  cartDetails: { flex: 1, padding: 12 },
  cartBrand: { fontFamily: 'DMSans_500Medium', fontSize: 10, color: Colors.gold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  cartName: { fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 16, color: Colors.textPrimary, marginBottom: 4 },
  cartLens: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  prescriptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  prescriptionPillText: { fontFamily: 'DMSans_500Medium', fontSize: 10, color: '#D97706' },
  cartPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cartPrice: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.navy },
  cartLensPrice: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textSecondary },
  cartActions: { padding: 10, alignItems: 'center', justifyContent: 'space-between' },
  removeBtn: { padding: 4 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qty: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary, minWidth: 20, textAlign: 'center' },

  promoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: 16,
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    gap: 10,
  },
  promoHint: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary },
  promoInput: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textPrimary },
  couponError: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.error, marginHorizontal: 18, marginTop: -8, marginBottom: 4 },
  applyPromo: { backgroundColor: Colors.cream, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  applyPromoText: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.navy },

  summaryCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 12,
    padding: 18,
  },
  summaryTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 20, color: Colors.navy, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary },
  summaryValue: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary },
  grandTotal: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: Colors.navy },
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  earnText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.gold },

  pointsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 4, marginBottom: 4,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  pointsTitle: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary },
  pointsSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 14,
  },
  trustItem: { alignItems: 'center', gap: 4 },
  trustText: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textSecondary },

  formSection: { padding: 20 },
  formIntro: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 18,
    color: Colors.navy,
    marginBottom: 20,
  },
  savedWrap: { marginBottom: 20 },
  savedTitle: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary, marginBottom: 10 },
  savedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 10, padding: 12, marginBottom: 8,
  },
  savedCardActive: { borderColor: Colors.navy, backgroundColor: '#F0F4F9' },
  savedName: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textPrimary, marginBottom: 2 },
  savedAddr: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },
  savedHint: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textLight, marginTop: 4 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  inputBox: {
    height: 48,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textPrimary,
  },

  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    marginBottom: 12,
  },
  paymentOptionActive: { borderColor: Colors.navy, backgroundColor: '#F0F4F9' },
  paymentLabel: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textSecondary },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: Colors.navy },
  radioFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.navy },
  orderFinalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.navy,
    borderRadius: 12,
    padding: 20,
    marginTop: 12,
  },
  finalAmount: { fontFamily: 'DMSans_700Bold', fontSize: 22, color: Colors.gold },

  bottomBar: {
    backgroundColor: Colors.white,
    paddingTop: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomSummary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bottomTotal: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: Colors.navy },
  bottomSub: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary },
  checkoutBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkoutBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.navy },

  // Success
  successContainer: { flex: 1, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successContent: { alignItems: 'center', gap: 16 },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 40, color: Colors.white },
  successDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  orderCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 4,
  },
  orderLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  orderValue: { fontFamily: 'DMSans_700Bold', fontSize: 26, color: Colors.gold },
  continueBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginTop: 8,
  },
  continueBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.navy },
});

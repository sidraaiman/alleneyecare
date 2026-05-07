import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useCart } from '../../context/CartContext';

const LENS_LABELS: Record<string, string> = {
  'non-powered': 'Non-Powered',
  'single-vision': 'Single Vision',
  bifocal: 'Bifocal',
  progressive: 'Progressive',
};

const LENS_PRICES: Record<string, number> = {
  'non-powered': 0,
  'single-vision': 399,
  bifocal: 699,
  progressive: 999,
};

const PAYMENT_METHODS = [
  { id: 'upi', icon: 'phone-portrait-outline', label: 'UPI / GPay / PhonePe' },
  { id: 'card', icon: 'card-outline', label: 'Credit / Debit Card' },
  { id: 'cod', icon: 'cash-outline', label: 'Cash on Delivery' },
];

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { items, removeItem, updateQuantity, totalItems, totalPrice, clearCart } = useCart();
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'address' | 'payment' | 'success'>('cart');
  const [paymentMethod, setPaymentMethod] = useState('upi');

  const lensTotal = items.reduce((s, i) => s + (LENS_PRICES[i.lensType] || 0) * i.quantity, 0);
  const subtotal = totalPrice + lensTotal;
  const shipping = subtotal >= 999 ? 0 : 99;
  const grandTotal = subtotal + shipping;

  if (items.length === 0 && checkoutStep !== 'success') {
    return (
      <View style={[styles.emptyContainer, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Bag</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 72 }}>🛍️</Text>
          <Text style={styles.emptyTitle}>Your bag is empty</Text>
          <Text style={styles.emptyDesc}>Add frames to your bag to see them here</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/products')}>
            <Text style={styles.shopBtnText}>Explore Frames</Text>
          </TouchableOpacity>
        </View>
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
            <Text style={styles.orderLabel}>Order Total</Text>
            <Text style={styles.orderValue}>₹{grandTotal.toLocaleString()}</Text>
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
              <View key={item.product.id} style={styles.cartItem}>
                <Image source={{ uri: item.product.image }} style={styles.cartImage} />
                <View style={styles.cartDetails}>
                  <Text style={styles.cartBrand}>{item.product.brand}</Text>
                  <Text style={styles.cartName} numberOfLines={1}>{item.product.name}</Text>
                  <Text style={styles.cartLens}>{LENS_LABELS[item.lensType]}</Text>
                  {item.hasPower && (
                    <View style={styles.prescriptionPill}>
                      <Ionicons name="document-text-outline" size={10} color={Colors.gold} />
                      <Text style={styles.prescriptionPillText}>Prescription Added</Text>
                    </View>
                  )}
                  <View style={styles.cartPriceRow}>
                    <Text style={styles.cartPrice}>₹{item.product.price.toLocaleString()}</Text>
                    {LENS_PRICES[item.lensType] > 0 && (
                      <Text style={styles.cartLensPrice}>+₹{LENS_PRICES[item.lensType]} lens</Text>
                    )}
                  </View>
                </View>
                <View style={styles.cartActions}>
                  <TouchableOpacity onPress={() => removeItem(item.product.id)} style={styles.removeBtn}>
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  </TouchableOpacity>
                  <View style={styles.qtyControl}>
                    <TouchableOpacity
                      onPress={() => item.quantity > 1 ? updateQuantity(item.product.id, item.quantity - 1) : removeItem(item.product.id)}
                    >
                      <Ionicons name="remove-circle-outline" size={22} color={Colors.navy} />
                    </TouchableOpacity>
                    <Text style={styles.qty}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => updateQuantity(item.product.id, item.quantity + 1)}>
                      <Ionicons name="add-circle-outline" size={22} color={Colors.navy} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {/* Promo Input */}
            <View style={styles.promoSection}>
              <Ionicons name="pricetag-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.promoHint}>Apply coupon code</Text>
              <TouchableOpacity style={styles.applyPromo}>
                <Text style={styles.applyPromoText}>Apply</Text>
              </TouchableOpacity>
            </View>

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
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.grandTotal}>₹{grandTotal.toLocaleString()}</Text>
              </View>
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
            <Text style={styles.formIntro}>Where should we deliver your order?</Text>
            {['Full Name', 'Phone Number', 'Flat / House No.', 'Street / Area', 'City', 'State', 'PIN Code'].map(field => (
              <View key={field} style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{field}</Text>
                <View style={styles.inputBox} />
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
          style={styles.checkoutBtn}
          onPress={() => {
            if (checkoutStep === 'cart') setCheckoutStep('address');
            else if (checkoutStep === 'address') setCheckoutStep('payment');
            else setCheckoutStep('success');
          }}
        >
          <Text style={styles.checkoutBtnText}>
            {checkoutStep === 'cart' ? 'Proceed to Address' : checkoutStep === 'address' ? 'Continue to Payment' : 'Place Order'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.navy} />
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
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  inputBox: {
    height: 48,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.white,
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

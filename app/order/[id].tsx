import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/hooks/useOrders';
import { Colors } from '@/constants/Colors';
import type { OrderStatus } from '@/lib/database.types';

const STEPS: { status: OrderStatus; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { status: 'pending',    label: 'Order Placed',       icon: 'receipt-outline',         desc: 'Your order has been received' },
  { status: 'confirmed',  label: 'Confirmed',           icon: 'checkmark-circle-outline', desc: 'Seller confirmed your order' },
  { status: 'processing', label: 'Being Prepared',      icon: 'construct-outline',        desc: 'Lenses being fitted & packed' },
  { status: 'shipped',    label: 'Shipped',             icon: 'car-outline',              desc: 'Out for delivery to you' },
  { status: 'delivered',  label: 'Delivered',           icon: 'home-outline',             desc: 'Enjoy your new eyewear!' },
];

const STATUS_ORDER: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

function getStepIndex(status: OrderStatus): number {
  if (status === 'cancelled') return -1;
  return STATUS_ORDER.indexOf(status);
}

const PAYMENT_LABELS: Record<string, string> = {
  upi: 'UPI / GPay / PhonePe',
  card: 'Credit / Debit Card',
  cod: 'Cash on Delivery',
};

const LENS_PRICES: Record<string, number> = {
  'non-powered': 0,
  'single-vision': 399,
  bifocal: 699,
  progressive: 999,
};

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { orders } = useOrders(user?.id);

  const order = orders.find(o => o.id === id);

  if (!order) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="cube-outline" size={48} color={Colors.textLight} />
        <Text style={styles.notFoundText}>Order not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const currentStep = getStepIndex(order.status);
  const shortId = `#${order.id.slice(0, 8).toUpperCase()}`;
  const dateStr = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const lensTotal = order.order_items.reduce((s, i) => s + (LENS_PRICES[i.lens_type ?? ''] ?? 0) * i.quantity, 0);
  const framesTotal = order.total - lensTotal;
  const shipping = order.total >= 999 ? 0 : 99;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.navy} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Order Details</Text>
          <Text style={styles.headerSub}>{shortId} · {dateStr}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Status banner */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={[styles.statusBanner, isCancelled && styles.statusBannerCancelled]}
        >
          <View style={styles.statusIconWrap}>
            <Ionicons
              name={isCancelled ? 'close-circle' : currentStep >= 4 ? 'checkmark-circle' : 'time'}
              size={32}
              color={isCancelled ? Colors.error : currentStep >= 4 ? Colors.success : Colors.gold}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>
              {isCancelled ? 'Order Cancelled' : STEPS[currentStep]?.label ?? 'In Progress'}
            </Text>
            <Text style={styles.statusDesc}>
              {isCancelled
                ? 'This order has been cancelled'
                : STEPS[currentStep]?.desc ?? ''}
            </Text>
          </View>
          <View style={[styles.statusPill, {
            backgroundColor: isCancelled ? '#FEE2E2' : currentStep >= 4 ? '#D1FAE5' : '#FEF3C7',
          }]}>
            <Text style={[styles.statusPillText, {
              color: isCancelled ? Colors.error : currentStep >= 4 ? Colors.success : '#B45309',
            }]}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Text>
          </View>
        </Animated.View>

        {/* Timeline */}
        {!isCancelled && (
          <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.card}>
            <Text style={styles.cardTitle}>Order Progress</Text>
            {STEPS.map((step, index) => {
              const done = index <= currentStep;
              const active = index === currentStep;
              const last = index === STEPS.length - 1;
              return (
                <View key={step.status} style={styles.timelineRow}>
                  {/* Line + dot column */}
                  <View style={styles.timelineTrack}>
                    <View style={[
                      styles.timelineDot,
                      done && styles.timelineDotDone,
                      active && styles.timelineDotActive,
                    ]}>
                      {done ? (
                        <Ionicons name={active ? step.icon : 'checkmark'} size={active ? 14 : 12} color={Colors.white} />
                      ) : (
                        <View style={styles.timelineDotEmpty} />
                      )}
                    </View>
                    {!last && (
                      <View style={[styles.timelineLine, done && index < currentStep && styles.timelineLineDone]} />
                    )}
                  </View>
                  {/* Content */}
                  <View style={[styles.timelineContent, !last && { marginBottom: 0 }]}>
                    <Text style={[styles.timelineLabel, done && styles.timelineLabelDone, active && styles.timelineLabelActive]}>
                      {step.label}
                    </Text>
                    {(done || active) && (
                      <Text style={styles.timelineDesc}>{step.desc}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* Order Items */}
        <Animated.View entering={FadeInDown.duration(400).delay(160)} style={styles.card}>
          <Text style={styles.cardTitle}>Items Ordered ({order.order_items.length})</Text>
          {order.order_items.map((item, i) => (
            <View key={item.id} style={[styles.itemRow, i < order.order_items.length - 1 && styles.itemRowBorder]}>
              {item.product_image ? (
                <Image source={{ uri: item.product_image }} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                  <Ionicons name="glasses-outline" size={24} color={Colors.textLight} />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product_name}</Text>
                {item.lens_type && item.lens_type !== 'non-powered' && (
                  <Text style={styles.itemLens}>{item.lens_type.replace('-', ' ')} lens</Text>
                )}
                <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>₹{item.price.toLocaleString()}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Price Breakdown */}
        <Animated.View entering={FadeInDown.duration(400).delay(240)} style={styles.card}>
          <Text style={styles.cardTitle}>Price Breakdown</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Frames</Text>
            <Text style={styles.priceValue}>₹{framesTotal.toLocaleString()}</Text>
          </View>
          {lensTotal > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Lens Customization</Text>
              <Text style={styles.priceValue}>₹{lensTotal.toLocaleString()}</Text>
            </View>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Shipping</Text>
            <Text style={[styles.priceValue, shipping === 0 && { color: Colors.success }]}>
              {shipping === 0 ? 'FREE' : `₹${shipping}`}
            </Text>
          </View>
          <View style={[styles.priceRow, styles.priceTotalRow]}>
            <Text style={styles.priceTotalLabel}>Total Paid</Text>
            <Text style={styles.priceTotalValue}>₹{order.total.toLocaleString()}</Text>
          </View>
          <View style={styles.paymentMethodRow}>
            <Ionicons name="card-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.paymentMethodText}>
              Paid via {PAYMENT_LABELS[order.payment_method ?? ''] ?? order.payment_method ?? 'Online'}
            </Text>
          </View>
        </Animated.View>

        {/* Help */}
        <Animated.View entering={FadeInDown.duration(400).delay(320)} style={styles.helpCard}>
          <Ionicons name="headset-outline" size={22} color={Colors.navy} />
          <View style={{ flex: 1 }}>
            <Text style={styles.helpTitle}>Need help with this order?</Text>
            <Text style={styles.helpSub}>Our support team is available 9am – 9pm</Text>
          </View>
          <TouchableOpacity style={styles.helpBtn}>
            <Text style={styles.helpBtnText}>Contact Us</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.pageBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.pageBg, gap: 12 },
  notFoundText: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: Colors.textSecondary },
  backLink: { paddingVertical: 8 },
  backLinkText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.navy, textDecorationLine: 'underline' },

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
  headerTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 20, color: Colors.navy, textAlign: 'center' },
  headerSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },

  scroll: { padding: 16, gap: 12 },

  // Status banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.gold,
    elevation: 2,
    shadowColor: Colors.navy,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  statusBannerCancelled: { borderLeftColor: Colors.error },
  statusIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.pageBg, alignItems: 'center', justifyContent: 'center' },
  statusLabel: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary, marginBottom: 2 },
  statusDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusPillText: { fontFamily: 'DMSans_700Bold', fontSize: 11 },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 18,
    elevation: 2,
    shadowColor: Colors.navy,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 20, color: Colors.navy, marginBottom: 16 },

  // Timeline
  timelineRow: { flexDirection: 'row', gap: 14 },
  timelineTrack: { alignItems: 'center', width: 28 },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineDotDone: { backgroundColor: Colors.success },
  timelineDotActive: { backgroundColor: Colors.navy, width: 32, height: 32, borderRadius: 16, marginHorizontal: -2 },
  timelineDotEmpty: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.textMuted },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.border, marginVertical: 2, minHeight: 24 },
  timelineLineDone: { backgroundColor: Colors.success },
  timelineContent: { flex: 1, paddingBottom: 20, paddingTop: 4 },
  timelineLabel: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textLight, marginBottom: 2 },
  timelineLabelDone: { color: Colors.textPrimary },
  timelineLabelActive: { fontFamily: 'DMSans_700Bold', color: Colors.navy },
  timelineDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },

  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  itemImage: { width: 64, height: 54, borderRadius: 8, resizeMode: 'cover' },
  itemImagePlaceholder: { backgroundColor: Colors.pageBg, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary, marginBottom: 3 },
  itemLens: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, textTransform: 'capitalize', marginBottom: 2 },
  itemQty: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },
  itemPrice: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.navy },

  // Price breakdown
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  priceLabel: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary },
  priceValue: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary },
  priceTotalRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12, marginTop: 4, marginBottom: 8 },
  priceTotalLabel: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary },
  priceTotalValue: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.navy },
  paymentMethodRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  paymentMethodText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },

  // Help
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  helpTitle: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary, marginBottom: 2 },
  helpSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },
  helpBtn: { backgroundColor: Colors.navy, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  helpBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.white },
});

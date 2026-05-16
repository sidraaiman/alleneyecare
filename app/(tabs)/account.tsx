import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../hooks/useOrders';
import { products } from '../../data/products';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  delivered: { bg: '#D1FAE5', text: '#065F46' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  default:   { bg: '#FEF3C7', text: '#92400E' },
};

const MENU_ITEMS = [
  { icon: 'cube-outline', label: 'My Orders', count: '3', route: null },
  { icon: 'heart-outline', label: 'Wishlist', count: null, route: null },
  { icon: 'document-text-outline', label: 'Saved Prescriptions', count: '2', route: null },
  { icon: 'eye-outline', label: 'Eye Test History', count: null, route: null },
  { icon: 'location-outline', label: 'Delivery Addresses', count: null, route: null },
  { icon: 'card-outline', label: 'Payment Methods', count: null, route: null },
  { icon: 'notifications-outline', label: 'Notifications', count: null, route: null },
  { icon: 'help-circle-outline', label: 'Help & Support', count: null, route: null },
];

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { wishlist } = useCart();
  const { user, signOut } = useAuth();
  const { orders } = useOrders(user?.id);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');

  const displayPhone = user?.phone ?? 'Guest';
  const displayName = user?.user_metadata?.full_name ?? displayPhone;
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const wishlistProducts = products.filter(p => wishlist.includes(p.id));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Account</Text>
        <TouchableOpacity style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color={Colors.navy} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Banner */}
        <View style={styles.profileBanner}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{avatarInitial}</Text>
            </View>
            <View style={styles.premiumBadge}>
              <Ionicons name="diamond" size={10} color={Colors.gold} />
              <Text style={styles.premiumText}>GOLD</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{displayPhone}</Text>
            <View style={styles.pointsRow}>
              <Ionicons name="star" size={14} color={Colors.gold} />
              <Text style={styles.pointsText}>AllenPoints Member</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editProfileBtn}>
            <Ionicons name="pencil-outline" size={16} color={Colors.gold} />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Orders', value: orders.length.toString() },
            { label: 'Wishlist', value: wishlist.length.toString() },
            { label: 'Prescriptions', value: '2' },
            { label: 'Points', value: '1.2K' },
          ].map((s, i) => (
            <View key={i} style={[styles.statItem, i < 3 && styles.statBorder]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>View All →</Text>
            </TouchableOpacity>
          </View>
          {orders.length === 0 ? (
            <Text style={[styles.orderId, { textAlign: 'center', paddingVertical: 12 }]}>No orders yet</Text>
          ) : orders.slice(0, 3).map(order => {
            const firstItem = order.order_items?.[0];
            const statusKey = order.status as keyof typeof STATUS_COLORS;
            const statusStyle = STATUS_COLORS[statusKey] ?? STATUS_COLORS.default;
            const shortId = `#${order.id.slice(0, 8).toUpperCase()}`;
            const dateStr = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            return (
              <TouchableOpacity key={order.id} style={styles.orderCard} onPress={() => router.push(`/order/${order.id}`)}>
                {firstItem?.product_image ? (
                  <Image source={{ uri: firstItem.product_image }} style={styles.orderImage} />
                ) : (
                  <View style={[styles.orderImage, { backgroundColor: Colors.cream }]} />
                )}
                <View style={styles.orderDetails}>
                  <Text style={styles.orderProduct} numberOfLines={1}>{firstItem?.product_name ?? 'Order'}</Text>
                  <Text style={styles.orderId}>{shortId} · {dateStr}</Text>
                  <Text style={styles.orderTotal}>₹{order.total.toLocaleString()}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusText, { color: statusStyle.text }]}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Wishlist Preview */}
        {wishlistProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Wishlist</Text>
              <TouchableOpacity onPress={() => router.push('/products')}>
                <Text style={styles.seeAll}>Shop Now →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.wishlistScroll}>
              {wishlistProducts.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.wishlistCard}
                  onPress={() => router.push(`/product/${p.id}`)}
                >
                  <Image source={{ uri: p.image }} style={styles.wishlistImage} />
                  <Text style={styles.wishlistName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.wishlistPrice}>₹{p.price.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Prescriptions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Prescriptions</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Add New +</Text>
            </TouchableOpacity>
          </View>
          {[
            { name: 'My Prescription', date: 'Jan 2026', doctor: 'Dr. Patel' },
            { name: 'Kids Prescription', date: 'Mar 2026', doctor: 'Dr. Sharma' },
          ].map((rx, i) => (
            <View key={i} style={styles.rxCard}>
              <View style={styles.rxIcon}>
                <Ionicons name="document-text" size={22} color={Colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rxName}>{rx.name}</Text>
                <Text style={styles.rxMeta}>{rx.doctor} · {rx.date}</Text>
              </View>
              <View style={styles.rxActions}>
                <TouchableOpacity style={styles.rxBtn}>
                  <Ionicons name="eye-outline" size={16} color={Colors.navy} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.rxBtn}>
                  <Ionicons name="share-outline" size={16} color={Colors.navy} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Eye Test History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Eye Test History</Text>
            <TouchableOpacity style={styles.bookTestBtn}>
              <Text style={styles.bookTestText}>Book Test</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.eyeTestBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyeTestTitle}>Free Online Eye Test</Text>
              <Text style={styles.eyeTestSub}>Get your eye power checked in 2 minutes</Text>
            </View>
            <Ionicons name="eye" size={32} color={Colors.gold} />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          {MENU_ITEMS.slice(4).map((item, i) => (
            <TouchableOpacity key={i} style={styles.menuItem}>
              <View style={styles.menuIconWrap}>
                <Ionicons name={item.icon as any} size={20} color={Colors.navy} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => signOut().catch(console.error)}>
          <Ionicons name="log-out-outline" size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>AllenEyeCare</Text>
          <Text style={styles.footerVersion}>v1.0.0 · © 2026 AllenEyeCare</Text>
        </View>
      </ScrollView>
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
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 26, color: Colors.navy },
  settingsBtn: { padding: 4 },

  profileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.navy,
    padding: 20,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.goldLight,
  },
  avatarInitial: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 28, color: Colors.navy },
  premiumBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.navy,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  premiumText: { fontFamily: 'DMSans_700Bold', fontSize: 8, color: Colors.gold },
  userName: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 22, color: Colors.white, marginBottom: 2 },
  userEmail: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pointsText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.gold },
  editProfileBtn: { padding: 8 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statBorder: { borderRightWidth: 1, borderRightColor: Colors.border },
  statValue: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: Colors.navy, marginBottom: 4 },
  statLabel: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textSecondary },

  section: { backgroundColor: Colors.white, marginTop: 10, paddingHorizontal: 20, paddingVertical: 18 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 22, color: Colors.navy },
  seeAll: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.gold },

  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  orderImage: { width: 60, height: 50, borderRadius: 8, resizeMode: 'cover', backgroundColor: Colors.cream },
  orderDetails: { flex: 1 },
  orderProduct: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary, marginBottom: 2 },
  orderId: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  orderTotal: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.navy },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontFamily: 'DMSans_700Bold', fontSize: 11 },

  wishlistScroll: { marginHorizontal: -20 },
  wishlistCard: {
    width: 120,
    marginLeft: 20,
    backgroundColor: Colors.cream,
    borderRadius: 10,
    overflow: 'hidden',
  },
  wishlistImage: { width: '100%', height: 80, resizeMode: 'cover' },
  wishlistName: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textPrimary, padding: 8, paddingBottom: 4 },
  wishlistPrice: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.navy, paddingHorizontal: 8, paddingBottom: 8 },

  rxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rxIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rxName: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary, marginBottom: 3 },
  rxMeta: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },
  rxActions: { flexDirection: 'row', gap: 8 },
  rxBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },

  eyeTestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.navy,
    borderRadius: 12,
    padding: 18,
  },
  eyeTestTitle: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.white, marginBottom: 4 },
  eyeTestSub: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  bookTestBtn: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bookTestText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.navy },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    marginTop: 10,
    paddingVertical: 18,
  },
  logoutText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.error },

  footer: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  footerLogo: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 20, color: Colors.navy },
  footerVersion: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textLight },
});

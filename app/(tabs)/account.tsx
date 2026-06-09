import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../hooks/useOrders';
import { supabase } from '../../lib/supabase';
import { IS_DEMO } from '../../lib/config';
import { products } from '../../data/products';
import EmptyState from '../../components/EmptyState';
import ProductImage from '@/components/ProductImage';

type Rx = {
  id: string;
  name: string;
  created_at: string;
  r_sph?: number | null; r_cyl?: number | null; r_axis?: number | null;
  l_sph?: number | null; l_cyl?: number | null; l_axis?: number | null;
  pd?: number | null;
};

const num = (s: string): number | null => (s.trim() === '' ? null : Number(s) || 0);
const intOrNull = (s: string): number | null => (s.trim() === '' ? null : parseInt(s, 10) || 0);
const fmt = (v: number | null | undefined): string => (v === null || v === undefined ? '—' : String(v));

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
  const { user, signOut, updateProfile } = useAuth();
  const { orders } = useOrders(user?.id);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');
  const [prescriptions, setPrescriptions] = useState<Rx[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [points, setPoints] = useState(0);
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [rxVisible, setRxVisible] = useState(false);
  const [savingRx, setSavingRx] = useState(false);
  const [rxForm, setRxForm] = useState({ name: '', r_sph: '', r_cyl: '', r_axis: '', l_sph: '', l_cyl: '', l_axis: '', pd: '' });

  function loadPrescriptions() {
    if (IS_DEMO) {
      setPrescriptions([{ id: 'demo-rx', name: 'My Prescription', created_at: '2026-01-10T00:00:00Z', r_sph: -1.25, r_cyl: -0.5, r_axis: 90, l_sph: -1.0, l_cyl: -0.25, l_axis: 85, pd: 62 }]);
      return;
    }
    if (!user?.id) { setPrescriptions([]); return; }
    supabase
      .from('prescriptions')
      .select('id, name, created_at, r_sph, r_cyl, r_axis, l_sph, l_cyl, l_axis, pd')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setPrescriptions(data as Rx[]); }, () => {});
  }

  useEffect(() => { loadPrescriptions(); }, [user?.id]);

  useEffect(() => {
    if (IS_DEMO || !user?.id) { setIsMember(false); setPoints(0); return; }
    let active = true;
    supabase.from('memberships').select('active, expires_at').eq('user_id', user.id).limit(1)
      .then(({ data }) => {
        if (!active) return;
        const m = (data?.[0] ?? null) as { active: boolean; expires_at: string | null } | null;
        setIsMember(!!m && m.active && (!m.expires_at || new Date(m.expires_at) > new Date()));
      }, () => {});
    supabase.from('profiles').select('points').eq('id', user.id).single()
      .then(({ data }) => { if (active && data) setPoints((data as { points: number }).points ?? 0); }, () => {});
    return () => { active = false; };
  }, [user?.id]);

  const metaName: string | undefined = user?.user_metadata?.full_name;
  const email = user?.email ?? undefined;
  const phone = user?.phone ?? (user?.user_metadata?.phone as string | undefined) ?? undefined;
  const displayName = metaName || (email ? email.split('@')[0] : '') || phone || 'Guest';
  const displayContact = email || phone || 'Tap edit to add your details';
  const avatarInitial = (displayName.charAt(0) || 'G').toUpperCase();

  const wishlistProducts = products.filter(p => wishlist.includes(p.id));

  const openSupport = () => {
    Linking.openURL('https://wa.me/919999999999?text=' + encodeURIComponent('Hi AllenEyeCare, I need help'))
      .catch(() => { Linking.openURL('tel:+919999999999').catch(() => {}); });
  };

  const openEditProfile = () => {
    setEditName(metaName ?? '');
    setEditPhone(phone ?? '');
    setEditVisible(true);
  };

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await updateProfile({ full_name: editName.trim(), phone: editPhone.trim() });
      setEditVisible(false);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Please try again.');
    } finally {
      setSavingProfile(false);
    }
  }

  const openAddRx = () => {
    setRxForm({ name: '', r_sph: '', r_cyl: '', r_axis: '', l_sph: '', l_cyl: '', l_axis: '', pd: '' });
    setRxVisible(true);
  };

  async function saveRx() {
    const name = rxForm.name.trim() || 'My Prescription';
    setSavingRx(true);
    try {
      if (IS_DEMO || !user?.id) {
        setPrescriptions(prev => [{
          id: `local-${Date.now()}`, name, created_at: new Date().toISOString(),
          r_sph: num(rxForm.r_sph), r_cyl: num(rxForm.r_cyl), r_axis: intOrNull(rxForm.r_axis),
          l_sph: num(rxForm.l_sph), l_cyl: num(rxForm.l_cyl), l_axis: intOrNull(rxForm.l_axis), pd: num(rxForm.pd),
        }, ...prev]);
      } else {
        const { error } = await supabase.from('prescriptions').insert({
          user_id: user.id, name,
          r_sph: num(rxForm.r_sph), r_cyl: num(rxForm.r_cyl), r_axis: intOrNull(rxForm.r_axis),
          l_sph: num(rxForm.l_sph), l_cyl: num(rxForm.l_cyl), l_axis: intOrNull(rxForm.l_axis), pd: num(rxForm.pd),
        } as never);
        if (error) throw error;
        loadPrescriptions();
      }
      setRxVisible(false);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Please try again.');
    } finally {
      setSavingRx(false);
    }
  }

  const viewRx = (rx: Rx) => {
    Alert.alert(
      rx.name,
      `Right (OD):  SPH ${fmt(rx.r_sph)}  CYL ${fmt(rx.r_cyl)}  AXIS ${fmt(rx.r_axis)}\n` +
      `Left (OS):   SPH ${fmt(rx.l_sph)}  CYL ${fmt(rx.l_cyl)}  AXIS ${fmt(rx.l_axis)}\n` +
      `PD: ${fmt(rx.pd)}`
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Account</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => Alert.alert('Settings', 'Account settings are coming soon.')}>
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
            {isMember && (
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond" size={10} color={Colors.gold} />
                <Text style={styles.premiumText}>GOLD</Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{displayContact}</Text>
            {isMember ? (
              <View style={styles.pointsRow}>
                <Ionicons name="diamond" size={14} color={Colors.gold} />
                <Text style={styles.pointsText}>Gold Member</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.pointsRow} onPress={() => router.push('/membership')}>
                <Ionicons name="diamond-outline" size={14} color={Colors.gold} />
                <Text style={styles.pointsText}>Join AllenEyeCare Gold →</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.editProfileBtn} onPress={openEditProfile}>
            <Ionicons name="pencil-outline" size={16} color={Colors.gold} />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Orders', value: orders.length.toString() },
            { label: 'Wishlist', value: wishlist.length.toString() },
            { label: 'Prescriptions', value: prescriptions.length.toString() },
            { label: 'Points', value: points.toLocaleString() },
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
            <TouchableOpacity onPress={() => router.push('/orders')}>
              <Text style={styles.seeAll}>View All →</Text>
            </TouchableOpacity>
          </View>
          {orders.length === 0 ? (
            <EmptyState
              icon="cube-outline"
              title="No orders yet"
              description="Your placed orders will appear here. Start shopping to place your first order!"
              ctaLabel="Shop Now"
              ctaIcon="grid-outline"
              onCta={() => router.push('/(tabs)/products')}
              compact
            />
          ) : orders.slice(0, 3).map(order => {
            const firstItem = order.order_items?.[0];
            const statusKey = order.status as keyof typeof STATUS_COLORS;
            const statusStyle = STATUS_COLORS[statusKey] ?? STATUS_COLORS.default;
            const shortId = `#${order.id.slice(0, 8).toUpperCase()}`;
            const dateStr = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            return (
              <TouchableOpacity key={order.id} style={styles.orderCard} onPress={() => router.push(`/order/${order.id}`)}>
                <ProductImage uri={firstItem?.product_image} style={styles.orderImage} />
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
              <TouchableOpacity onPress={() => router.push('/wishlist')}>
                <Text style={styles.seeAll}>View All →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.wishlistScroll}>
              {wishlistProducts.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.wishlistCard}
                  onPress={() => router.push(`/product/${p.id}`)}
                >
                  <ProductImage uri={p.image} style={styles.wishlistImage} />
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
            <TouchableOpacity onPress={openAddRx}>
              <Text style={styles.seeAll}>Add New +</Text>
            </TouchableOpacity>
          </View>
          {prescriptions.length === 0 ? (
            <Text style={styles.rxEmpty}>No saved prescriptions yet. Add one when choosing powered lenses at checkout.</Text>
          ) : prescriptions.map(rx => (
            <View key={rx.id} style={styles.rxCard}>
              <View style={styles.rxIcon}>
                <Ionicons name="document-text" size={22} color={Colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rxName}>{rx.name}</Text>
                <Text style={styles.rxMeta}>{new Date(rx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              </View>
              <View style={styles.rxActions}>
                <TouchableOpacity style={styles.rxBtn} onPress={() => viewRx(rx)}>
                  <Ionicons name="eye-outline" size={16} color={Colors.navy} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Eye Test History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Eye Test History</Text>
            <TouchableOpacity style={styles.bookTestBtn} onPress={openSupport}>
              <Text style={styles.bookTestText}>Book Test</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.eyeTestBanner} onPress={openSupport}>
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
            <TouchableOpacity
              key={i}
              style={styles.menuItem}
              onPress={() => {
                if (item.label === 'Help & Support') return openSupport();
                if (item.label === 'Delivery Addresses') return router.push('/addresses');
                if (item.label === 'Notifications') return router.push('/notifications');
                Alert.alert(item.label, 'Coming soon');
              }}
            >
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

      {/* Edit Profile Modal */}
      <Modal visible={editVisible} animationType="slide" transparent>
        <View style={styles.editOverlay}>
          <View style={styles.editModal}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.navy} />
              </TouchableOpacity>
            </View>
            {email && (
              <View style={styles.editInputGroup}>
                <Text style={styles.editLabel}>Email</Text>
                <Text style={styles.editReadonly}>{email}</Text>
              </View>
            )}
            <View style={styles.editInputGroup}>
              <Text style={styles.editLabel}>Full Name</Text>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <View style={styles.editInputGroup}>
              <Text style={styles.editLabel}>Phone Number</Text>
              <TextInput
                style={styles.editInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Contact number"
                placeholderTextColor={Colors.textLight}
                keyboardType="phone-pad"
              />
            </View>
            <TouchableOpacity style={[styles.editSaveBtn, savingProfile && { opacity: 0.7 }]} disabled={savingProfile} onPress={saveProfile}>
              {savingProfile ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.editSaveText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Prescription Modal */}
      <Modal visible={rxVisible} animationType="slide" transparent>
        <View style={styles.editOverlay}>
          <View style={styles.editModal}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Add Prescription</Text>
              <TouchableOpacity onPress={() => setRxVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.navy} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.editInputGroup}>
                <Text style={styles.editLabel}>Name (optional)</Text>
                <TextInput
                  style={styles.editInput}
                  value={rxForm.name}
                  onChangeText={t => setRxForm(p => ({ ...p, name: t }))}
                  placeholder="e.g. My Distance Rx"
                  placeholderTextColor={Colors.textLight}
                />
              </View>

              <View style={styles.rxTableHead}>
                <Text style={[styles.rxHeadCell, { flex: 0.6 }]} />
                <Text style={styles.rxHeadCell}>SPH</Text>
                <Text style={styles.rxHeadCell}>CYL</Text>
                <Text style={styles.rxHeadCell}>AXIS</Text>
              </View>
              {(['r', 'l'] as const).map(eye => (
                <View key={eye} style={styles.rxTableRow}>
                  <Text style={[styles.rxEyeLabel, { flex: 0.6 }]}>{eye === 'r' ? 'Right' : 'Left'}</Text>
                  <TextInput style={styles.rxCell} value={rxForm[`${eye}_sph`]} onChangeText={t => setRxForm(p => ({ ...p, [`${eye}_sph`]: t }))} keyboardType="numbers-and-punctuation" placeholder="0.00" placeholderTextColor={Colors.textLight} />
                  <TextInput style={styles.rxCell} value={rxForm[`${eye}_cyl`]} onChangeText={t => setRxForm(p => ({ ...p, [`${eye}_cyl`]: t }))} keyboardType="numbers-and-punctuation" placeholder="0.00" placeholderTextColor={Colors.textLight} />
                  <TextInput style={styles.rxCell} value={rxForm[`${eye}_axis`]} onChangeText={t => setRxForm(p => ({ ...p, [`${eye}_axis`]: t }))} keyboardType="number-pad" placeholder="0" placeholderTextColor={Colors.textLight} />
                </View>
              ))}
              <View style={styles.editInputGroup}>
                <Text style={styles.editLabel}>PD (Pupillary Distance)</Text>
                <TextInput
                  style={[styles.editInput, { width: 120 }]}
                  value={rxForm.pd}
                  onChangeText={t => setRxForm(p => ({ ...p, pd: t }))}
                  keyboardType="number-pad"
                  placeholder="63"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </ScrollView>
            <TouchableOpacity style={[styles.editSaveBtn, savingRx && { opacity: 0.7 }]} disabled={savingRx} onPress={saveRx}>
              {savingRx ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.editSaveText}>Save Prescription</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  rxEmpty: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
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

  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  editModal: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  editHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  editTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 22, color: Colors.navy },
  editInputGroup: { marginBottom: 14 },
  editLabel: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  editInput: {
    height: 48, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 8, backgroundColor: Colors.white,
    paddingHorizontal: 14, fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textPrimary,
  },
  editReadonly: {
    height: 48, borderWidth: 1.5, borderColor: Colors.borderLight, borderRadius: 8, backgroundColor: Colors.cream,
    paddingHorizontal: 14, fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, textAlignVertical: 'center',
    lineHeight: 48,
  },
  editSaveBtn: { backgroundColor: Colors.navy, borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 6, marginBottom: 8 },
  editSaveText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.white },

  rxTableHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingHorizontal: 2 },
  rxHeadCell: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },
  rxTableRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  rxEyeLabel: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textPrimary },
  rxCell: {
    flex: 1, height: 46, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 8, backgroundColor: Colors.white,
    paddingHorizontal: 10, fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textPrimary, textAlign: 'center',
  },
});

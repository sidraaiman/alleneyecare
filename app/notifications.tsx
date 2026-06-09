import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { getNotificationStatus, enableNotifications, sendTestNotification } from '../services/notifications';

const PREFS_KEY = 'aec:notif-prefs';
type Prefs = { orders: boolean; promotions: boolean; eyeTestReminders: boolean };
const DEFAULT_PREFS: Prefs = { orders: true, promotions: true, eyeTestReminders: false };

const TOGGLES: { key: keyof Prefs; label: string; desc: string; icon: any }[] = [
  { key: 'orders', label: 'Order Updates', desc: 'Confirmation, shipping and delivery alerts', icon: 'cube-outline' },
  { key: 'promotions', label: 'Offers & Promotions', desc: 'Sales, coupons and new arrivals', icon: 'pricetag-outline' },
  { key: 'eyeTestReminders', label: 'Eye Test Reminders', desc: 'Yearly check-up reminders', icon: 'eye-outline' },
];

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [status, setStatus] = useState<string>('undetermined');
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getNotificationStatus(), AsyncStorage.getItem(PREFS_KEY)]).then(([st, raw]) => {
      if (!active) return;
      setStatus(st);
      if (raw) { try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) }); } catch { /* keep defaults */ } }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const granted = status === 'granted';

  async function savePrefs(next: Prefs) {
    setPrefs(next);
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
  }

  async function handleEnable() {
    setWorking(true);
    try {
      const result = await enableNotifications(user?.id);
      setStatus(result);
      if (result !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Notifications are blocked. Enable them for AllenEyeCare in your device Settings to receive order updates.'
        );
      }
    } catch (e: any) {
      Alert.alert('Could not enable', e?.message ?? 'Please try again.');
    } finally {
      setWorking(false);
    }
  }

  async function handleTest() {
    if (!granted) { Alert.alert('Enable notifications first', 'Turn on notifications to send a test.'); return; }
    try {
      await sendTestNotification();
    } catch (e: any) {
      Alert.alert('Could not send', e?.message ?? 'Please try again.');
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.gold} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Permission banner */}
          <View style={[styles.banner, granted ? styles.bannerOn : styles.bannerOff]}>
            <Ionicons
              name={granted ? 'notifications' : 'notifications-off-outline'}
              size={28}
              color={granted ? Colors.gold : Colors.white}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{granted ? 'Notifications are on' : 'Notifications are off'}</Text>
              <Text style={styles.bannerDesc}>
                {granted
                  ? "You'll get order updates and the alerts you choose below."
                  : 'Enable notifications to get order updates and offers.'}
              </Text>
            </View>
            {!granted && (
              <TouchableOpacity style={styles.enableBtn} disabled={working} onPress={handleEnable}>
                {working ? <ActivityIndicator color={Colors.navy} /> : <Text style={styles.enableBtnText}>Enable</Text>}
              </TouchableOpacity>
            )}
          </View>

          {/* Preferences */}
          <Text style={styles.sectionLabel}>Preferences</Text>
          <View style={styles.card}>
            {TOGGLES.map((t, i) => (
              <View key={t.key} style={[styles.row, i < TOGGLES.length - 1 && styles.rowBorder]}>
                <View style={styles.rowIcon}>
                  <Ionicons name={t.icon} size={18} color={Colors.navy} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t.label}</Text>
                  <Text style={styles.rowDesc}>{t.desc}</Text>
                </View>
                <Switch
                  value={granted && prefs[t.key]}
                  disabled={!granted}
                  onValueChange={v => savePrefs({ ...prefs, [t.key]: v })}
                  trackColor={{ false: Colors.border, true: Colors.gold }}
                  thumbColor={Colors.white}
                />
              </View>
            ))}
          </View>

          <TouchableOpacity style={[styles.testBtn, !granted && { opacity: 0.5 }]} disabled={!granted} onPress={handleTest}>
            <Ionicons name="paper-plane-outline" size={18} color={Colors.navy} />
            <Text style={styles.testBtnText}>Send a test notification</Text>
          </TouchableOpacity>

          <Text style={styles.footNote}>
            {Platform.OS === 'android'
              ? 'Order updates use a high-priority channel so they arrive promptly.'
              : 'You can fine-tune these in your device Settings too.'}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 22, color: Colors.navy },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 32 },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, padding: 18, marginBottom: 24 },
  bannerOn: { backgroundColor: Colors.navy },
  bannerOff: { backgroundColor: Colors.navyLight },
  bannerTitle: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.white, marginBottom: 3 },
  bannerDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 17 },
  enableBtn: { backgroundColor: Colors.gold, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  enableBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.navy },

  sectionLabel: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10, marginLeft: 4 },
  card: { backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  rowIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary, marginBottom: 2 },
  rowDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary },

  testBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.navy,
    borderRadius: 10, paddingVertical: 14, marginTop: 20,
  },
  testBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.navy },
  footNote: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textLight, textAlign: 'center', marginTop: 16, lineHeight: 17 },
});

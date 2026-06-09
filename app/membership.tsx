import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { IS_DEMO } from '@/lib/config';

const BENEFITS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'pricetag-outline', text: '5% off every order, applied automatically' },
  { icon: 'car-outline', text: 'Free shipping on all orders' },
  { icon: 'refresh-outline', text: 'Extended 30-day hassle-free returns' },
  { icon: 'flash-outline', text: 'Priority support & early access to new drops' },
];

export default function MembershipScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [member, setMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (IS_DEMO || !user?.id) { setLoading(false); return; }
    let active = true;
    supabase.from('memberships').select('active, expires_at').eq('user_id', user.id).limit(1)
      .then(({ data }) => {
        if (!active) return;
        const m = (data?.[0] ?? null) as { active: boolean; expires_at: string | null } | null;
        setMember(!!m && m.active && (!m.expires_at || new Date(m.expires_at) > new Date()));
        setLoading(false);
      }, () => setLoading(false));
    return () => { active = false; };
  }, [user?.id]);

  async function join() {
    setBusy(true);
    if (IS_DEMO) {
      setMember(true);
      setBusy(false);
      Alert.alert('Welcome to Gold!', 'Demo membership activated (not saved).');
      return;
    }
    if (!user?.id) { setBusy(false); Alert.alert('Please sign in first'); return; }
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    const { error } = await supabase
      .from('memberships')
      .upsert({ user_id: user.id, tier: 'gold', active: true, expires_at: expires.toISOString() } as never, { onConflict: 'user_id' });
    setBusy(false);
    if (error) Alert.alert('Could not activate', error.message);
    else { setMember(true); Alert.alert('Welcome to Gold!', 'Your benefits are now active.'); }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AllenEyeCare Gold</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroIcon}>
          <Ionicons name="diamond" size={44} color={Colors.gold} />
        </View>
        <Text style={styles.heroTitle}>Gold Membership</Text>
        <Text style={styles.heroSub}>Save more on every order, all year round.</Text>

        <View style={styles.priceCard}>
          <Text style={styles.priceAmt}>₹999<Text style={styles.priceUnit}> / year</Text></Text>
          {member && (
            <View style={styles.activePill}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.navy} />
              <Text style={styles.activePillText}>Active</Text>
            </View>
          )}
        </View>

        <View style={styles.benefits}>
          {BENEFITS.map(b => (
            <View key={b.text} style={styles.benefitRow}>
              <View style={styles.benefitIcon}><Ionicons name={b.icon} size={18} color={Colors.gold} /></View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        {!IS_DEMO && (
          <Text style={styles.note}>Note: membership is activated directly for now — Razorpay billing for memberships is a planned follow-up.</Text>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {loading ? (
          <ActivityIndicator color={Colors.gold} />
        ) : member ? (
          <View style={styles.memberBanner}>
            <Ionicons name="diamond" size={18} color={Colors.gold} />
            <Text style={styles.memberBannerText}>You're a Gold member — benefits applied at checkout.</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.joinBtn} disabled={busy} onPress={join}>
            {busy ? <ActivityIndicator color={Colors.navy} /> : <Text style={styles.joinBtnText}>Become a Gold member</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.navyLight, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 20, color: Colors.gold },
  scroll: { alignItems: 'center', padding: 24, gap: 10 },
  heroIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.navyLight, borderWidth: 1.5, borderColor: Colors.gold, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  heroTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 32, color: Colors.white, marginTop: 8 },
  heroSub: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  priceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  priceAmt: { fontFamily: 'DMSans_700Bold', fontSize: 30, color: Colors.gold },
  priceUnit: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.gold, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activePillText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.navy },
  benefits: { width: '100%', backgroundColor: Colors.navyLight, borderRadius: 16, padding: 18, gap: 14, marginTop: 16 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(201,168,76,0.15)', alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.white },
  note: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 16, lineHeight: 17 },
  bottomBar: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: Colors.navyMid, borderTopWidth: 1, borderTopColor: Colors.navyLight },
  joinBtn: { backgroundColor: Colors.gold, borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center' },
  joinBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.navy },
  memberBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 8 },
  memberBannerText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.white },
});

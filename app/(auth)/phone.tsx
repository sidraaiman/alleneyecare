import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';

const BENEFITS = [
  { icon: 'car-outline' as const,       label: 'Free Shipping' },
  { icon: 'refresh-outline' as const,   label: '14-Day Returns' },
  { icon: 'ribbon-outline' as const,    label: 'ISI Certified' },
  { icon: 'card-outline' as const,      label: 'EMI Available' },
];

export default function PhoneScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithPhone } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const digits = phone.replace(/\D/g, '');
  const isValid = digits.length === 10;
  const fullPhone = `+91${digits}`;

  async function handleSendOTP() {
    if (!isValid) return;
    setLoading(true);
    try {
      await signInWithPhone(fullPhone);
      router.push({ pathname: '/(auth)/verify', params: { phone: fullPhone } });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.cream} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
          <View style={styles.illustrationBg}>
            <View style={styles.illustrationCircle}>
              <Ionicons name="glasses" size={72} color={Colors.navy} />
            </View>
            {/* Decorative dots */}
            <View style={[styles.dot, { top: 12, right: 20, width: 8, height: 8, backgroundColor: Colors.gold }]} />
            <View style={[styles.dot, { bottom: 16, left: 28, width: 12, height: 12, backgroundColor: Colors.goldLight }]} />
            <View style={[styles.dot, { top: 28, left: 16, width: 6, height: 6, backgroundColor: Colors.navyLight }]} />
          </View>

          <Text style={styles.brandName}>AllenEyeCare</Text>
          <Text style={styles.brandTag}>Premium Eyewear · Est. 2024</Text>
        </Animated.View>

        {/* Benefits strip */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.benefitsRow}>
          {BENEFITS.map(b => (
            <View key={b.label} style={styles.benefitChip}>
              <Ionicons name={b.icon} size={14} color={Colors.navy} />
              <Text style={styles.benefitText}>{b.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Login card */}
        <Animated.View entering={FadeInUp.duration(500).delay(150)} style={styles.card}>
          <Text style={styles.cardTitle}>Login / Sign Up</Text>
          <Text style={styles.cardSubtitle}>
            Enter your mobile number to continue with AllenEyeCare
          </Text>

          {/* Phone input */}
          <View style={styles.inputWrap}>
            <View style={styles.countryBox}>
              <Text style={styles.flag}>🇮🇳</Text>
              <Text style={styles.dialCode}>+91</Text>
              <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
            </View>
            <View style={styles.divider} />
            <TextInput
              style={styles.phoneInput}
              placeholder="Enter mobile number"
              placeholderTextColor={Colors.textLight}
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              autoFocus
            />
            {isValid && (
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} style={styles.validIcon} />
            )}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.btn, !isValid && styles.btnDisabled]}
            onPress={handleSendOTP}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Text style={styles.btnText}>Send OTP</Text>
                <Ionicons name="arrow-forward-circle" size={20} color={Colors.white} />
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>secure · private · fast</Text>
            <View style={styles.orLine} />
          </View>

          {/* Trust badges */}
          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Ionicons name="shield-checkmark-outline" size={16} color={Colors.success} />
              <Text style={styles.trustText}>OTP Verified</Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons name="lock-closed-outline" size={16} color={Colors.success} />
              <Text style={styles.trustText}>Encrypted</Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons name="eye-off-outline" size={16} color={Colors.success} />
              <Text style={styles.trustText}>No Password</Text>
            </View>
          </View>
        </Animated.View>

        {/* Terms */}
        <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.termsWrap}>
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },

  // Hero illustration
  hero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  illustrationBg: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: Colors.navy,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    position: 'relative',
    overflow: 'visible',
  },
  illustrationCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    borderRadius: 99,
  },
  brandName: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 30,
    color: Colors.navy,
    letterSpacing: 0.5,
  },
  brandTag: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // Benefits
  benefitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  benefitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 1,
    shadowColor: Colors.navy,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  benefitText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.navy,
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    elevation: 6,
    shadowColor: Colors.navy,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    gap: 16,
  },
  cardTitle: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 26,
    color: Colors.navy,
  },
  cardSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: -8,
  },

  // Input
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    height: 54,
    backgroundColor: Colors.pageBg,
    overflow: 'hidden',
  },
  countryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
  },
  flag: { fontSize: 18 },
  dialCode: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: 1.2,
  },
  validIcon: {
    marginRight: 12,
  },

  // Button
  btn: {
    backgroundColor: Colors.navy,
    borderRadius: 12,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.white,
    letterSpacing: 0.3,
  },

  // Divider
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: -4,
  },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
  orText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.textLight,
    letterSpacing: 0.8,
  },

  // Trust badges
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  trustText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.textSecondary,
  },

  // Terms
  termsWrap: {
    marginTop: 20,
    paddingHorizontal: 8,
  },
  termsText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 17,
  },
  termsLink: {
    color: Colors.navy,
    fontFamily: 'DMSans_500Medium',
    textDecorationLine: 'underline',
  },
});

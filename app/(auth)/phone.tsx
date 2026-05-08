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
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';

export default function PhoneScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithPhone } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const fullPhone = `+91${phone.replace(/\D/g, '')}`;
  const isValid = phone.replace(/\D/g, '').length === 10;

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
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        {/* Brand */}
        <View style={styles.brandWrap}>
          <Ionicons name="eye" size={40} color={Colors.gold} />
          <Text style={styles.brandName}>AllenEyeCare</Text>
          <Text style={styles.brandTagline}>Premium Eyewear · Est. 2024</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Enter your mobile number to receive a one-time password</Text>

          <View style={styles.inputRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryFlag}>🇮🇳</Text>
              <Text style={styles.countryDial}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="10-digit mobile number"
              placeholderTextColor="rgba(255,255,255,0.35)"
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, !isValid && styles.btnDisabled]}
            onPress={handleSendOTP}
            disabled={!isValid || loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.navy} />
            ) : (
              <>
                <Text style={styles.btnText}>Send OTP</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.navy} />
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.terms}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },

  brandWrap: { alignItems: 'center', marginBottom: 40, gap: 8 },
  brandName: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 34, color: Colors.white },
  brandTagline: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
    padding: 24,
    gap: 16,
  },
  title: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 28, color: Colors.white },
  subtitle: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 20 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(201,168,76,0.4)',
    borderRadius: 10,
    overflow: 'hidden',
    height: 52,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(201,168,76,0.3)',
    height: '100%',
  },
  countryFlag: { fontSize: 18 },
  countryDial: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.white },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.white,
    letterSpacing: 1.5,
  },

  btn: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.navy },

  terms: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 16 },
});

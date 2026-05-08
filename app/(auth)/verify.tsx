import React, { useState, useRef } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';

export default function VerifyScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOTP, signInWithPhone } = useAuth();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const maskedPhone = phone ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : '';

  async function handleVerify() {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      await verifyOTP(phone!, otp);
      // AuthContext listener will fire and root layout will redirect to tabs
    } catch (e: any) {
      Alert.alert('Invalid OTP', e?.message ?? 'The code you entered is incorrect. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!phone) return;
    setResending(true);
    try {
      await signInWithPhone(phone);
      Alert.alert('OTP Sent', 'A new code has been sent to your number.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.brandWrap}>
          <Ionicons name="shield-checkmark" size={48} color={Colors.gold} />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
          </Text>

          <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()}>
            <View style={styles.otpContainer}>
              {[...Array(6)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.otpCell,
                    otp.length === i && styles.otpCellActive,
                    otp.length > i && styles.otpCellFilled,
                  ]}
                >
                  <Text style={styles.otpChar}>{otp[i] ?? ''}</Text>
                </View>
              ))}
            </View>
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, otp.length !== 6 && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={otp.length !== 6 || loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.navy} />
            ) : (
              <>
                <Text style={styles.btnText}>Verify & Sign In</Text>
                <Ionicons name="checkmark" size={18} color={Colors.navy} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.resendRow} onPress={handleResend} disabled={resending}>
            {resending ? (
              <ActivityIndicator size="small" color={Colors.gold} />
            ) : (
              <Text style={styles.resendText}>Didn't receive a code? <Text style={styles.resendLink}>Resend OTP</Text></Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },

  backBtn: { position: 'absolute', top: 20, left: 24, padding: 8, zIndex: 10 },

  brandWrap: { alignItems: 'center', marginBottom: 32 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
    padding: 24,
    gap: 20,
  },
  title: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 28, color: Colors.white },
  subtitle: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 22 },
  phoneHighlight: { fontFamily: 'DMSans_700Bold', color: Colors.gold },

  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpCell: {
    flex: 1,
    height: 54,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  otpCellActive: { borderColor: Colors.gold },
  otpCellFilled: { borderColor: Colors.gold, backgroundColor: 'rgba(201,168,76,0.12)' },
  otpChar: { fontFamily: 'DMSans_700Bold', fontSize: 22, color: Colors.white },
  hiddenInput: { position: 'absolute', opacity: 0, width: 0, height: 0 },

  btn: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.navy },

  resendRow: { alignItems: 'center' },
  resendText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.45)' },
  resendLink: { fontFamily: 'DMSans_700Bold', color: Colors.gold },
});

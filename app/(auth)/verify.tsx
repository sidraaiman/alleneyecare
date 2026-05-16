import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  StatusBar,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';

const RESEND_COOLDOWN = 30;

export default function VerifyScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOTP, signInWithPhone } = useAuth();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const displayPhone = phone
    ? `+91 ${phone.replace('+91', '').replace(/(\d{5})(\d{5})/, '$1 $2')}`
    : '';
  const maskedPhone = displayPhone.replace(/\d(?=\d{4})/g, '·');

  const startCountdown = useCallback(() => {
    setCountdown(RESEND_COOLDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startCountdown();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  async function handleVerify() {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      await verifyOTP(phone!, otp);
    } catch (e: any) {
      Alert.alert('Invalid OTP', e?.message ?? 'The code is incorrect. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!phone || countdown > 0) return;
    setResending(true);
    try {
      await signInWithPhone(phone);
      Alert.alert('OTP Sent', 'A new code has been sent to your number.');
      startCountdown();
      setOtp('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.cream} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Ionicons name="arrow-back" size={22} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>OTP Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        {/* Icon */}
        <Animated.View entering={ZoomIn.duration(400)} style={styles.iconWrap}>
          <View style={styles.iconCircle}>
            <Ionicons name="chatbubble-ellipses" size={36} color={Colors.navy} />
          </View>
          <View style={styles.iconBadge}>
            <Ionicons name="lock-closed" size={12} color={Colors.white} />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.titleWrap}>
          <Text style={styles.title}>Enter Verification Code</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit OTP to{'\n'}
            <Text style={styles.phoneText}>{maskedPhone}</Text>
          </Text>
        </Animated.View>

        {/* OTP boxes */}
        <Animated.View entering={FadeInDown.duration(400).delay(160)} style={styles.otpSection}>
          <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} style={styles.otpContainer}>
            {[...Array(6)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.otpCell,
                  otp.length === i && styles.otpCellActive,
                  otp.length > i && styles.otpCellFilled,
                ]}
              >
                {otp.length > i ? (
                  <Text style={styles.otpChar}>{otp[i]}</Text>
                ) : otp.length === i ? (
                  <View style={styles.cursor} />
                ) : null}
              </View>
            ))}
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={otp}
            onChangeText={v => setOtp(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
        </Animated.View>

        {/* Verify button */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)} style={{ width: '100%' }}>
          <TouchableOpacity
            style={[styles.btn, otp.length !== 6 && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={otp.length !== 6 || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={18} color={Colors.white} />
                <Text style={styles.btnText}>Verify & Continue</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Resend */}
        <Animated.View entering={FadeInUp.duration(400).delay(250)} style={styles.resendWrap}>
          {countdown > 0 ? (
            <Text style={styles.resendCooldown}>
              Resend OTP in{' '}
              <Text style={styles.countdown}>{countdown}s</Text>
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              {resending ? (
                <ActivityIndicator size="small" color={Colors.navy} />
              ) : (
                <Text style={styles.resendText}>
                  Didn't receive?{' '}
                  <Text style={styles.resendLink}>Resend OTP</Text>
                </Text>
              )}
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Change number */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)}>
          <TouchableOpacity onPress={() => router.back()} style={styles.changeRow}>
            <Ionicons name="create-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.changeText}>Change mobile number</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.cream,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: Colors.navy,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  headerTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.navy,
  },

  // Body
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    gap: 24,
  },

  // Icon
  iconWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.gold,
  },
  iconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },

  // Title
  titleWrap: { alignItems: 'center', gap: 8 },
  title: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 26,
    color: Colors.navy,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  phoneText: {
    fontFamily: 'DMSans_700Bold',
    color: Colors.navy,
  },

  // OTP
  otpSection: { width: '100%', position: 'relative' },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  otpCell: {
    flex: 1,
    height: 58,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: Colors.navy,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  otpCellActive: {
    borderColor: Colors.navy,
    borderWidth: 2,
    backgroundColor: Colors.white,
    elevation: 3,
    shadowOpacity: 0.12,
  },
  otpCellFilled: {
    borderColor: Colors.gold,
    borderWidth: 2,
    backgroundColor: Colors.goldLight,
  },
  otpChar: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 24,
    color: Colors.navy,
  },
  cursor: {
    width: 2,
    height: 24,
    backgroundColor: Colors.navy,
    borderRadius: 1,
  },
  hiddenInput: { position: 'absolute', opacity: 0, width: 0, height: 0 },

  // Button
  btn: {
    width: '100%',
    backgroundColor: Colors.navy,
    borderRadius: 14,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 4,
    shadowColor: Colors.navy,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  btnDisabled: { opacity: 0.35, elevation: 0, shadowOpacity: 0 },
  btnText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.white,
    letterSpacing: 0.3,
  },

  // Resend
  resendWrap: { alignItems: 'center' },
  resendCooldown: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  countdown: {
    fontFamily: 'DMSans_700Bold',
    color: Colors.navy,
  },
  resendText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  resendLink: {
    fontFamily: 'DMSans_700Bold',
    color: Colors.navy,
    textDecorationLine: 'underline',
  },

  // Change number
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  changeText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
});

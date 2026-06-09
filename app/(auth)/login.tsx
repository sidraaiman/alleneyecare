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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const valid = emailValid && password.length >= 6;

  async function submit() {
    if (!valid) return;
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password);
        Alert.alert('Account created', 'If email confirmation is enabled, verify your inbox, then sign in.');
        setMode('signin');
      }
    } catch (e: any) {
      Alert.alert(mode === 'signin' ? 'Sign in failed' : 'Sign up failed', e?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.cream} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
          <View style={styles.logoCircle}>
            <Ionicons name="glasses" size={56} color={Colors.navy} />
          </View>
          <Text style={styles.brandName}>AllenEyeCare</Text>
          <Text style={styles.brandTag}>Premium Eyewear</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(500).delay(120)} style={styles.card}>
          <Text style={styles.cardTitle}>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</Text>
          <Text style={styles.cardSubtitle}>
            {mode === 'signin' ? 'Sign in with your email to continue' : 'Sign up with your email to get started'}
          </Text>

          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={Colors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
            {emailValid && <Ionicons name="checkmark-circle" size={18} color={Colors.success} />}
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 chars)"
              placeholderTextColor={Colors.textLight}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={[styles.btn, !valid && styles.btnDisabled]} disabled={!valid || loading} onPress={submit} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Text style={styles.btnText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
                <Ionicons name="arrow-forward-circle" size={20} color={Colors.white} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')} style={styles.toggle}>
            <Text style={styles.toggleText}>
              {mode === 'signin' ? "New here? " : 'Have an account? '}
              <Text style={styles.toggleLink}>{mode === 'signin' ? 'Create an account' : 'Sign in'}</Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>

          <TouchableOpacity style={styles.phoneBtn} onPress={() => router.push('/(auth)/phone')}>
            <Ionicons name="phone-portrait-outline" size={18} color={Colors.navy} />
            <Text style={styles.phoneBtnText}>Continue with phone OTP</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flexGrow: 1, paddingHorizontal: 20 },
  hero: { alignItems: 'center', marginBottom: 24 },
  logoCircle: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: Colors.goldLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    borderWidth: 2, borderColor: Colors.gold,
  },
  brandName: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 30, color: Colors.navy },
  brandTag: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 2 },
  card: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 24, gap: 14,
    shadowColor: Colors.navy, shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  cardTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 26, color: Colors.navy },
  cardSubtitle: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: -8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 12, height: 52, paddingHorizontal: 14, backgroundColor: Colors.pageBg,
  },
  input: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 15, color: Colors.textPrimary },
  btn: {
    backgroundColor: Colors.navy, borderRadius: 12, height: 52, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.white, letterSpacing: 0.3 },
  toggle: { alignItems: 'center', paddingVertical: 2 },
  toggleText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary },
  toggleLink: { fontFamily: 'DMSans_700Bold', color: Colors.navy },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
  orText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textLight },
  phoneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: Colors.navy, borderRadius: 12, height: 50,
  },
  phoneBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.navy },
});

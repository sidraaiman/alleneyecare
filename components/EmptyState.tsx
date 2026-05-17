import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaIcon?: keyof typeof Ionicons.glyphMap;
  onCta?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  compact?: boolean;
}

export default function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  ctaIcon = 'arrow-forward',
  onCta,
  secondaryLabel,
  onSecondary,
  compact = false,
}: EmptyStateProps) {
  return (
    <Animated.View entering={FadeInDown.duration(500)} style={[styles.container, compact && styles.compact]}>
      {/* Illustration */}
      <View style={styles.iconOuter}>
        <View style={styles.iconMiddle}>
          <View style={styles.iconInner}>
            <Ionicons name={icon} size={compact ? 36 : 48} color={Colors.navy} />
          </View>
        </View>
      </View>

      {/* Text */}
      <View style={styles.textWrap}>
        <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
        <Text style={[styles.desc, compact && styles.descCompact]}>{description}</Text>
      </View>

      {/* CTAs */}
      {ctaLabel && onCta && (
        <TouchableOpacity style={styles.cta} onPress={onCta} activeOpacity={0.85}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
          <Ionicons name={ctaIcon} size={16} color={Colors.white} />
        </TouchableOpacity>
      )}
      {secondaryLabel && onSecondary && (
        <TouchableOpacity onPress={onSecondary} style={styles.secondary}>
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 20,
  },
  compact: {
    padding: 24,
    gap: 12,
  },

  // Layered circles
  iconOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.goldLight,
    opacity: 0.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMiddle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.goldLight,
    opacity: 0.7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textWrap: { alignItems: 'center', gap: 8 },
  title: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 26,
    color: Colors.navy,
    textAlign: 'center',
  },
  titleCompact: { fontSize: 20 },
  desc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  descCompact: { fontSize: 13 },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.navy,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    elevation: 3,
    shadowColor: Colors.navy,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  ctaText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.white },

  secondary: { paddingVertical: 6 },
  secondaryText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.gold,
    textDecorationLine: 'underline',
  },
});

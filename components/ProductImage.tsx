import React, { useState } from 'react';
import { View, StyleSheet, StyleProp, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

type ContentFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

interface ProductImageProps {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: ContentFit;
}

/**
 * Product image with a graceful fallback. Uses expo-image (caching, fade-in) and
 * renders a neutral placeholder if the URL is missing or fails to load — so a
 * broken image never shows as a blank box. Ready for real Supabase Storage URLs.
 */
export default function ProductImage({ uri, style, contentFit = 'cover' }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[styles.fallback, style as any]}>
        <Ionicons name="glasses-outline" size={26} color={Colors.textLight} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style as any}
      contentFit={contentFit}
      transition={200}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' },
});

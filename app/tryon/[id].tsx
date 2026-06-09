import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useProducts } from '@/hooks/useProducts';
import { products as localProducts } from '@/data/products';

const { width } = Dimensions.get('window');

// Live-camera try-on: shows the front camera and overlays the frame image, which
// you drag to your eyes and resize with +/-. Reliable on real devices (the
// emulator's synthetic camera won't show a real face). True auto face-tracking is
// a future upgrade (needs a vision SDK + transparent frame PNGs).
export default function TryOnScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products } = useProducts();
  const product = products.find(p => p.id === id) ?? localProducts.find(p => p.id === id);
  const [permission, requestPermission] = useCameraPermissions();
  const [scale, setScale] = useState(1);

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => pan.extractOffset(),
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => pan.flattenOffset(),
    })
  ).current;

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission]);

  const Header = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={Colors.white} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Virtual Try-On</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (!product) {
    return <View style={styles.container}>{Header}<View style={styles.center}><Text style={styles.dim}>Product not found.</Text></View></View>;
  }
  if (!permission) {
    return <View style={styles.container}>{Header}<View style={styles.center}><ActivityIndicator color={Colors.gold} /></View></View>;
  }
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        {Header}
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={48} color={Colors.textLight} />
          <Text style={styles.dim}>Allow camera access to try frames on.</Text>
          <TouchableOpacity style={styles.allowBtn} onPress={() => requestPermission()}>
            <Text style={styles.allowBtnText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const frameW = width * 0.62 * scale;
  const frameH = frameW * 0.42;

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} facing="front" />

      <Animated.View
        style={[styles.frameWrap, { transform: pan.getTranslateTransform() }]}
        {...panResponder.panHandlers}
      >
        <Image source={{ uri: product.image }} style={{ width: frameW, height: frameH }} contentFit="contain" />
      </Animated.View>

      {Header}

      <View style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.hint}>Drag the frame onto your eyes · resize below</Text>
        <View style={styles.sizeRow}>
          <TouchableOpacity style={styles.sizeBtn} onPress={() => setScale(s => Math.max(0.4, s - 0.1))}>
            <Ionicons name="remove" size={22} color={Colors.navy} />
          </TouchableOpacity>
          <Text style={styles.frameName} numberOfLines={1}>{product.name}</Text>
          <TouchableOpacity style={styles.sizeBtn} onPress={() => setScale(s => Math.min(2.2, s + 0.1))}>
            <Ionicons name="add" size={22} color={Colors.navy} />
          </TouchableOpacity>
        </View>
        <Text style={styles.note}>Tip: a transparent frame PNG looks most realistic — the product photo is a stand-in.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 20, color: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  dim: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  allowBtn: { backgroundColor: Colors.gold, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  allowBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.navy },
  frameWrap: { position: 'absolute', top: '34%', alignSelf: 'center', zIndex: 5 },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 14, backgroundColor: 'rgba(13,27,42,0.85)' },
  hint: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.white, textAlign: 'center', marginBottom: 12 },
  sizeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sizeBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  frameName: { flex: 1, fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.white, textAlign: 'center' },
  note: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 10 },
});

import 'react-native-url-polyfill/auto';
import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
  CormorantGaramond_700Bold_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CartProvider, useCart, type CartItem, type LensType } from '../context/CartContext';
import { Colors } from '../constants/Colors';
import { supabase } from '../lib/supabase';
import { dbProductToApp } from '../lib/database.types';
import { registerForPushNotifications } from '../services/notifications';
import { IS_DEMO } from '../lib/config';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) {
      router.replace('/(auth)/phone');
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="product/[id]"
        options={{
          headerShown: true,
          headerTitle: '',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: Colors.cream },
          headerTintColor: Colors.navy,
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}

function CartSyncManager() {
  const { user } = useAuth();
  const { items, wishlist, setCart, clearCart } = useCart();
  const prevUserIdRef = useRef<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const syncTimerRef = useRef<any>(undefined);

  useEffect(() => {
    if (IS_DEMO) return;
    if (user && user.id !== prevUserIdRef.current) {
      prevUserIdRef.current = user.id;
      loadCartFromSupabase(user.id);
      registerForPushNotifications(user.id).catch(() => {});
    } else if (!user && prevUserIdRef.current) {
      prevUserIdRef.current = null;
      clearCart();
    }
  }, [user?.id]);

  // Debounced sync: 1.5s after last cart change (skipped in demo mode)
  useEffect(() => {
    if (IS_DEMO || !user) return;
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => syncCartToSupabase(user.id), 1500);
    return () => clearTimeout(syncTimerRef.current);
  }, [items, wishlist, user?.id]);

  async function loadCartFromSupabase(userId: string) {
    const [{ data: cartData }, { data: wishData }] = await Promise.all([
      supabase.from('cart_items').select('*, products(*)').eq('user_id', userId),
      supabase.from('wishlists').select('product_id').eq('user_id', userId),
    ]);

    const loadedItems: CartItem[] = (cartData ?? [])
      .filter((row: any) => row.products)
      .map((row: any) => ({
        product: dbProductToApp(row.products),
        quantity: row.quantity,
        lensType: row.lens_type as LensType,
        hasPower: row.has_power,
        prescription: row.prescription ?? undefined,
      }));

    const loadedWishlist = (wishData ?? []).map((w: any) => w.product_id as string);
    setCart({ items: loadedItems, wishlist: loadedWishlist });
  }

  async function syncCartToSupabase(userId: string) {
    await supabase.from('cart_items').delete().eq('user_id', userId);
    if (items.length > 0) {
      await supabase.from('cart_items').insert(
        items.map(item => ({
          user_id: userId,
          product_id: item.product.id,
          quantity: item.quantity,
          lens_type: item.lensType,
          has_power: item.hasPower,
          prescription: item.prescription ?? null,
        })) as any
      );
    }
    await supabase.from('wishlists').delete().eq('user_id', userId);
    if (wishlist.length > 0) {
      await supabase.from('wishlists').insert(
        wishlist.map(productId => ({ user_id: userId, product_id: productId })) as any
      );
    }
  }

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    CormorantGaramond_700Bold_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <CartProvider>
        <CartSyncManager />
        <StatusBar style="light" />
        <RootNavigator />
      </CartProvider>
    </AuthProvider>
  );
}

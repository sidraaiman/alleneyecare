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
import { ProductsProvider } from '../context/ProductsContext';
import { AIProvider } from '../context/AIContext';
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
      router.replace('/(auth)/login');
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
      <Stack.Screen
        name="order/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="wishlist"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}

function CartSyncManager() {
  const { user } = useAuth();
  const { items, wishlist, setCart, clearCart } = useCart();
  const prevUserIdRef = useRef<string | null>(null);
  // Becomes true only after the initial hydrate completes, so we never sync
  // (and risk wiping) the server cart before it has loaded.
  const cartReadyRef = useRef(false);
  // Suppresses the one sync that would otherwise echo freshly-loaded data back.
  const skipNextSyncRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const syncTimerRef = useRef<any>(undefined);

  useEffect(() => {
    if (IS_DEMO) return;
    if (user && user.id !== prevUserIdRef.current) {
      prevUserIdRef.current = user.id;
      cartReadyRef.current = false;
      loadCartFromSupabase(user.id);
      registerForPushNotifications(user.id).catch(() => {});
    } else if (!user && prevUserIdRef.current) {
      prevUserIdRef.current = null;
      cartReadyRef.current = false;
      clearCart();
    }
  }, [user?.id]);

  // Debounced sync: 1.5s after the last cart change. Skipped in demo mode,
  // before the initial hydrate, and on the hydrate's own state change.
  useEffect(() => {
    if (IS_DEMO || !user || !cartReadyRef.current) return;
    if (skipNextSyncRef.current) { skipNextSyncRef.current = false; return; }
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
    skipNextSyncRef.current = true;
    cartReadyRef.current = true;
    setCart({ items: loadedItems, wishlist: loadedWishlist });
  }

  async function syncCartToSupabase(userId: string) {
    // Upsert current state FIRST so a later failure can never wipe the cart,
    // then prune only the rows that are no longer present.
    const cartRows = items.map(item => ({
      user_id: userId,
      product_id: item.product.id,
      quantity: item.quantity,
      lens_type: item.lensType,
      has_power: item.hasPower,
      prescription: item.prescription ?? null,
    }));
    if (cartRows.length > 0) {
      await supabase
        .from('cart_items')
        .upsert(cartRows as any, { onConflict: 'user_id,product_id,lens_type' });
    }
    const { data: existingCart } = await supabase
      .from('cart_items')
      .select('id, product_id, lens_type')
      .eq('user_id', userId);
    const keepCart = new Set(items.map(i => `${i.product.id}::${i.lensType}`));
    const staleCartIds = (existingCart ?? [])
      .filter((r: any) => !keepCart.has(`${r.product_id}::${r.lens_type}`))
      .map((r: any) => r.id);
    if (staleCartIds.length > 0) {
      await supabase.from('cart_items').delete().in('id', staleCartIds);
    }

    if (wishlist.length > 0) {
      await supabase
        .from('wishlists')
        .upsert(
          wishlist.map(productId => ({ user_id: userId, product_id: productId })) as any,
          { onConflict: 'user_id,product_id' }
        );
    }
    const { data: existingWish } = await supabase
      .from('wishlists')
      .select('product_id')
      .eq('user_id', userId);
    const keepWish = new Set(wishlist);
    const staleWishIds = (existingWish ?? [])
      .map((r: any) => r.product_id as string)
      .filter(pid => !keepWish.has(pid));
    if (staleWishIds.length > 0) {
      await supabase.from('wishlists').delete().eq('user_id', userId).in('product_id', staleWishIds);
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
        <ProductsProvider>
          <AIProvider>
            <CartSyncManager />
            <StatusBar style="light" />
            <RootNavigator />
          </AIProvider>
        </ProductsProvider>
      </CartProvider>
    </AuthProvider>
  );
}

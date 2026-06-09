import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/hooks/useOrders';
import { Colors } from '@/constants/Colors';
import ProductImage from '@/components/ProductImage';
import EmptyState from '@/components/EmptyState';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  delivered: { bg: '#D1FAE5', text: '#065F46' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  default: { bg: '#FEF3C7', text: '#92400E' },
};

export default function OrdersListScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { orders, loading } = useOrders(user?.id);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      {!loading && orders.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="No orders yet"
          description="Your placed orders will appear here."
          ctaLabel="Shop Now"
          ctaIcon="grid-outline"
          onCta={() => router.push('/(tabs)/products')}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={o => o.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: order }) => {
            const first = order.order_items?.[0];
            const s = STATUS_COLORS[order.status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.default;
            const shortId = `#${order.id.slice(0, 8).toUpperCase()}`;
            const date = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            return (
              <TouchableOpacity style={styles.card} onPress={() => router.push(`/order/${order.id}`)}>
                <ProductImage uri={first?.product_image} style={styles.img} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{first?.product_name ?? 'Order'}</Text>
                  <Text style={styles.meta}>{shortId} · {date}</Text>
                  <Text style={styles.total}>₹{order.total.toLocaleString()}</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: s.bg }]}>
                  <Text style={[styles.pillText, { color: s.text }]}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.pageBg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.pageBg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 22, color: Colors.navy },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white,
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border,
  },
  img: { width: 64, height: 54, borderRadius: 8, backgroundColor: Colors.cream },
  name: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary, marginBottom: 2 },
  meta: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  total: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.navy },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  pillText: { fontFamily: 'DMSans_700Bold', fontSize: 11 },
});

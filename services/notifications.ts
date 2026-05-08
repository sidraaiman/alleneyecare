import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Order Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();

  await (supabase.from('profiles') as any)
    .update({ push_token: tokenData.data })
    .eq('id', userId);
}

const STATUS_MESSAGES: Record<string, string> = {
  confirmed: 'Your order has been confirmed!',
  processing: 'Your order is being processed',
  shipped: 'Your order is on its way!',
  delivered: 'Your order has been delivered',
  cancelled: 'Your order has been cancelled',
};

export async function showOrderNotification(status: string, orderId: string): Promise<void> {
  const body = STATUS_MESSAGES[status];
  if (!body) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'AllenEyeCare Order Update',
      body,
      data: { orderId },
    },
    trigger: null,
  });
}

import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { notificationsApi } from '../services/api';
import { useAuthStore } from '../context/authStore';

// ---------------------------------------------------------------------------
// Configure notification handler
// ---------------------------------------------------------------------------

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Register for push notifications
    registerForPush().then((token) => {
      if (token) {
        setExpoPushToken(token);
        // Register token with backend
        if (isAuthenticated) {
          notificationsApi
            .registerPushToken(token, Platform.OS)
            .catch(() => {}); // Non-critical
        }
      }
    });

    // Listen for incoming notifications
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notif) => {
        setNotification(notif);
      });

    // Listen for notification interactions (taps)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        // Handle navigation based on notification type
        handleNotificationTap(data);
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current,
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated]);

  return { expoPushToken, notification };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push notifications only work on physical devices
    return null;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Get the Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7c3aed',
    });

    await Notifications.setNotificationChannelAsync('shifts', {
      name: 'Shift Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      description: 'Notifications about shift assignments and reminders',
    });

    await Notifications.setNotificationChannelAsync('incidents', {
      name: 'Incidents',
      importance: Notifications.AndroidImportance.MAX,
      description: 'Critical incident alerts',
    });
  }

  return token;
}

function handleNotificationTap(data: Record<string, unknown>) {
  // Navigation will be handled by the root navigator
  // based on the notification type
  const type = data?.type as string;

  switch (type) {
    case 'shift_reminder':
    case 'shift_assignment':
      // Navigate to schedule
      break;
    case 'incident_update':
      // Navigate to incident details
      break;
    case 'leave_approved':
    case 'leave_rejected':
      // Navigate to leave screen
      break;
    default:
      // Navigate to notifications list
      break;
  }
}

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../context/authStore';
import { notificationsApi } from '../services/api';
import LoginScreen from '../screens/LoginScreen';
import AppNavigator from './AppNavigator';
import AdminNavigator from './AdminNavigator';

const Stack = createNativeStackNavigator();

// Management roles that see the admin dashboard
const MANAGEMENT_ROLES = ['admin', 'company_admin', 'finance', 'superadmin'];

// ---------------------------------------------------------------------------
// Push token registration — runs once when user authenticates
// ---------------------------------------------------------------------------

async function registerPushToken(): Promise<void> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const platform = Platform.OS; // 'ios' | 'android'

    await notificationsApi.registerPushToken(tokenData.data, platform);
  } catch {
    // Non-fatal — push notifications degrade gracefully if registration fails
  }
}

// ---------------------------------------------------------------------------
// Root Navigator
// ---------------------------------------------------------------------------

export default function RootNavigator() {
  const { isAuthenticated, isLoading, user, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, []);

  // Register push token whenever the user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      registerPushToken();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  const isManagement = user?.role && MANAGEMENT_ROLES.includes(user.role);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          isManagement ? (
            <Stack.Screen name="AdminMain" component={AdminNavigator} />
          ) : (
            <Stack.Screen name="GuardMain" component={AppNavigator} />
          )
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ animationTypeForReplace: 'pop' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

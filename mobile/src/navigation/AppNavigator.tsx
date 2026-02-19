import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import CheckInScreen from '../screens/CheckInScreen';
import IncidentReportScreen from '../screens/IncidentReportScreen';
import PatrolScreen from '../screens/PatrolScreen';
import LeaveScreen from '../screens/LeaveScreen';
import PayslipScreen from '../screens/PayslipScreen';
import { useAuthStore } from '../context/authStore';

// ---------------------------------------------------------------------------
// Role-based home screen — management sees org dashboard, guards see guard home
// ---------------------------------------------------------------------------

const MANAGEMENT_ROLES = ['admin', 'company_admin', 'scheduler', 'finance', 'superadmin'];

function HomeRouter() {
  const { user } = useAuthStore();
  if (user && MANAGEMENT_ROLES.includes(user.role)) {
    return <AdminDashboardScreen />;
  }
  return <HomeScreen />;
}

// ---------------------------------------------------------------------------
// Tab icon components (emoji-based — replace with @expo/vector-icons later)
// ---------------------------------------------------------------------------

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Schedule: '📅',
    Patrol: '🗺️',
    Alerts: '🔔',
    Profile: '👤',
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>
        {icons[name] || '•'}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Home Stack (role-based home + Check-in + Incident + Leave modals)
// ---------------------------------------------------------------------------

const HomeStack = createNativeStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeRouter} />
      <HomeStack.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{ presentation: 'modal' }}
      />
      <HomeStack.Screen
        name="IncidentReport"
        component={IncidentReportScreen}
        options={{ presentation: 'modal' }}
      />
      <HomeStack.Screen
        name="Leave"
        component={LeaveScreen}
        options={{ presentation: 'modal' }}
      />
      <HomeStack.Screen
        name="Payslip"
        component={PayslipScreen}
        options={{ presentation: 'modal' }}
      />
    </HomeStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Tab Navigator
// ---------------------------------------------------------------------------

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: '#a78bfa',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Patrol" component={PatrolScreen} />
      <Tab.Screen name="Alerts" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1e293b',
    borderTopColor: '#334155',
    borderTopWidth: 1,
    paddingTop: 4,
    height: 80,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
    opacity: 0.5,
  },
  iconFocused: {
    opacity: 1,
  },
});

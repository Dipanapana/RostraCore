import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { useNotificationsStore } from '../context/notificationsStore';
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
import MyIncidentsScreen from '../screens/MyIncidentsScreen';
import LeaveApprovalScreen from '../screens/LeaveApprovalScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
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
// Tab Navigator — five tabs, no nested stacks
// ---------------------------------------------------------------------------

const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { unreadCount, fetchUnreadCount } = useNotificationsStore();

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

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
      <Tab.Screen name="Home" component={HomeRouter} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Patrol" component={PatrolScreen} />
      <Tab.Screen
        name="Alerts"
        component={NotificationsScreen}
        options={{ tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Root Stack — TabNavigator + shared modals accessible from any tab
//
// By placing modal screens here (above the Tab.Navigator), every screen in
// every tab can call navigation.navigate('CheckIn' | 'IncidentReport' | ...)
// and React Navigation will find them in the parent stack.
// ---------------------------------------------------------------------------

const RootStack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Tabs" component={TabNavigator} />
      <RootStack.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{ presentation: 'modal' }}
      />
      <RootStack.Screen
        name="IncidentReport"
        component={IncidentReportScreen}
        options={{ presentation: 'modal' }}
      />
      <RootStack.Screen
        name="Leave"
        component={LeaveScreen}
        options={{ presentation: 'modal' }}
      />
      <RootStack.Screen
        name="Payslip"
        component={PayslipScreen}
        options={{ presentation: 'modal' }}
      />
      <RootStack.Screen
        name="MyIncidents"
        component={MyIncidentsScreen}
        options={{ presentation: 'modal' }}
      />
      <RootStack.Screen
        name="LeaveApproval"
        component={LeaveApprovalScreen}
        options={{ presentation: 'modal' }}
      />
      <RootStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ presentation: 'modal' }}
      />
    </RootStack.Navigator>
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

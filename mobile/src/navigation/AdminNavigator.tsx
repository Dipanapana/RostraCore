import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CheckInScreen from '../screens/CheckInScreen';
import IncidentReportScreen from '../screens/IncidentReportScreen';
import LeaveScreen from '../screens/LeaveScreen';
import PayslipScreen from '../screens/PayslipScreen';
import MyIncidentsScreen from '../screens/MyIncidentsScreen';
import LeaveApprovalScreen from '../screens/LeaveApprovalScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';

// ---------------------------------------------------------------------------
// Tab icons
// ---------------------------------------------------------------------------

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Overview: '📊',
    Schedule: '📅',
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
// Admin Tab Navigator
// ---------------------------------------------------------------------------

const Tab = createBottomTabNavigator();

function AdminTabNavigator() {
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
      <Tab.Screen name="Overview" component={AdminDashboardScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Alerts" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Admin Root Stack — tabs + shared modals accessible from any tab.
//
// Placing modal screens above AdminTabNavigator (same pattern as AppNavigator)
// allows any admin screen to call navigation.navigate('LeaveApproval' | ...)
// without being blocked by tab-boundary restrictions.
// ---------------------------------------------------------------------------

const AdminRootStack = createNativeStackNavigator();

export default function AdminNavigator() {
  return (
    <AdminRootStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminRootStack.Screen name="AdminTabs" component={AdminTabNavigator} />
      <AdminRootStack.Screen
        name="LeaveApproval"
        component={LeaveApprovalScreen}
        options={{ presentation: 'modal' }}
      />
      <AdminRootStack.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{ presentation: 'modal' }}
      />
      <AdminRootStack.Screen
        name="IncidentReport"
        component={IncidentReportScreen}
        options={{ presentation: 'modal' }}
      />
      <AdminRootStack.Screen
        name="Leave"
        component={LeaveScreen}
        options={{ presentation: 'modal' }}
      />
      <AdminRootStack.Screen
        name="Payslip"
        component={PayslipScreen}
        options={{ presentation: 'modal' }}
      />
      <AdminRootStack.Screen
        name="MyIncidents"
        component={MyIncidentsScreen}
        options={{ presentation: 'modal' }}
      />
      <AdminRootStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ presentation: 'modal' }}
      />
    </AdminRootStack.Navigator>
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

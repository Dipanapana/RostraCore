import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../context/authStore';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  const initials = (() => {
    if (user?.full_name) {
      const parts = user.full_name.trim().split(/\s+/);
      if (parts.length >= 2)
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return parts[0].substring(0, 2).toUpperCase();
    }
    return user?.username?.substring(0, 2).toUpperCase() ?? 'U';
  })();

  const roleLabel: Record<string, string> = {
    guard: 'Security Guard',
    admin: 'Administrator',
    company_admin: 'Company Admin',
    scheduler: 'Scheduler',
    finance: 'Finance',
    superadmin: 'Platform Admin',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{initials}</Text>
          </View>
          <Text style={styles.fullName}>
            {user?.full_name || user?.username}
          </Text>
          <Text style={styles.role}>
            {roleLabel[user?.role ?? ''] ?? user?.role}
          </Text>
          {user?.organization_name && (
            <Text style={styles.org}>{user.organization_name}</Text>
          )}
        </View>

        {/* Info cards */}
        <View style={styles.infoSection}>
          <InfoRow label="Email" value={user?.email ?? '–'} />
          <InfoRow label="Username" value={user?.username ?? '–'} />
          <InfoRow label="Employee ID" value={user?.employee_id?.toString() ?? '–'} />
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.changePasswordButton}
            onPress={() => navigation.navigate('ChangePassword')}
            activeOpacity={0.8}
          >
            <Text style={styles.changePasswordText}>🔑  Change Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>RostraCore Mobile v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 12,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarLargeText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
  },
  fullName: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  role: {
    color: '#a78bfa',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  org: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  infoSection: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  infoValue: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '500',
  },
  actionsSection: {
    marginBottom: 24,
    gap: 12,
  },
  changePasswordButton: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  changePasswordText: {
    color: '#a78bfa',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#450a0a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  logoutText: {
    color: '#fca5a5',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 12,
  },
});

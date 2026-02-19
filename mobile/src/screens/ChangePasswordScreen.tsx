import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { authApi } from '../services/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', pass: /[a-z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
  ];

  const passCount = checks.filter((c) => c.pass).length;
  const barColor =
    passCount <= 1 ? '#ef4444' : passCount <= 2 ? '#f59e0b' : passCount === 3 ? '#3b82f6' : '#22c55e';

  return (
    <View style={ps.container}>
      <View style={ps.barTrack}>
        <View style={[ps.barFill, { width: `${(passCount / 4) * 100}%`, backgroundColor: barColor }]} />
      </View>
      <View style={ps.checks}>
        {checks.map((c) => (
          <Text key={c.label} style={[ps.checkText, { color: c.pass ? '#4ade80' : '#475569' }]}>
            {c.pass ? '✓' : '·'} {c.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const ps = StyleSheet.create({
  container: { marginTop: 8, marginBottom: 4 },
  barTrack: {
    height: 4, backgroundColor: '#1e293b', borderRadius: 2, overflow: 'hidden', marginBottom: 8,
  },
  barFill: { height: 4, borderRadius: 2 },
  checks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  checkText: { fontSize: 11, fontWeight: '500' },
});

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ChangePasswordScreen() {
  const navigation = useNavigation<any>();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

  const handleSubmit = async () => {
    if (!isValid) return;
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      Alert.alert(
        'Password Changed',
        'Your password has been updated successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to change password. Check your current password.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>Update your account password</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Current password */}
        <Text style={styles.label}>Current Password</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showCurrent}
            placeholder="Enter current password"
            placeholderTextColor="#475569"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={() => setShowCurrent((v) => !v)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showCurrent ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        {/* New password */}
        <Text style={[styles.label, { marginTop: 20 }]}>New Password</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNew}
            placeholder="Enter new password"
            placeholderTextColor="#475569"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={() => setShowNew((v) => !v)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showNew ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>
        <PasswordStrength password={newPassword} />

        {/* Confirm password */}
        <Text style={[styles.label, { marginTop: 20 }]}>Confirm New Password</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              confirmPassword.length > 0 && newPassword !== confirmPassword
                ? styles.inputError
                : null,
            ]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
            placeholder="Re-enter new password"
            placeholderTextColor="#475569"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showConfirm ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>
        {confirmPassword.length > 0 && newPassword !== confirmPassword && (
          <Text style={styles.mismatchText}>Passwords do not match</Text>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (!isValid || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Update Password</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          Your new password must be at least 8 characters and include uppercase, lowercase, and a number.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { color: '#a78bfa', fontSize: 24, lineHeight: 28 },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#64748b', fontSize: 13, marginTop: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f1f5f9',
    fontSize: 15,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  eyeText: { fontSize: 18 },
  mismatchText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  errorBox: {
    marginTop: 16,
    backgroundColor: '#1c0000',
    borderWidth: 1,
    borderColor: '#ef444440',
    borderRadius: 10,
    padding: 14,
  },
  errorText: { color: '#f87171', fontSize: 14, lineHeight: 20 },
  submitBtn: {
    marginTop: 28,
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: {
    color: '#475569',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});

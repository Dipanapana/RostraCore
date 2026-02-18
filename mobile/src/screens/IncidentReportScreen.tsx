import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { incidentsApi } from '../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IncidentReportScreenProps {
  route: {
    params: {
      siteId: number;
      siteName: string;
      shiftId?: number;
    };
  };
  navigation: any;
}

const INCIDENT_TYPES = [
  'Trespassing',
  'Theft',
  'Vandalism',
  'Fire',
  'Medical Emergency',
  'Suspicious Activity',
  'Equipment Failure',
  'Access Violation',
  'Other',
];

const SEVERITY_LEVELS = [
  { key: 'low', label: 'Low', color: '#3b82f6', bg: '#172554' },
  { key: 'medium', label: 'Medium', color: '#f59e0b', bg: '#422006' },
  { key: 'high', label: 'High', color: '#ef4444', bg: '#450a0a' },
  { key: 'critical', label: 'Critical', color: '#dc2626', bg: '#7f1d1d' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IncidentReportScreen({
  route,
  navigation,
}: IncidentReportScreenProps) {
  const { siteId, siteName, shiftId } = route.params;

  const [incidentType, setIncidentType] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );

  // Get location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      }
    })();
  }, []);

  const pickPhoto = async () => {
    if (photos.length >= 3) {
      Alert.alert('Limit', 'Maximum 3 photos per incident report.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const handleSubmit = async () => {
    if (!incidentType) {
      Alert.alert('Required', 'Please select an incident type.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please provide a description.');
      return;
    }

    setSubmitting(true);
    try {
      await incidentsApi.report({
        site_id: siteId,
        shift_id: shiftId,
        incident_type: incidentType,
        description: description.trim(),
        severity,
        latitude: location?.coords.latitude,
        longitude: location?.coords.longitude,
        photo_urls: photos.length > 0 ? photos : undefined,
      });

      Alert.alert('Reported', 'Incident has been reported to your supervisor.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.detail || 'Failed to submit incident report.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{'← Back'}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Report Incident</Text>
        <Text style={styles.siteName}>{siteName}</Text>

        {/* Incident Type */}
        <Text style={styles.label}>Incident Type *</Text>
        <View style={styles.typeGrid}>
          {INCIDENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeChip,
                incidentType === type && styles.typeChipSelected,
              ]}
              onPress={() => setIncidentType(type)}
            >
              <Text
                style={[
                  styles.typeChipText,
                  incidentType === type && styles.typeChipTextSelected,
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Severity */}
        <Text style={styles.label}>Severity *</Text>
        <View style={styles.severityRow}>
          {SEVERITY_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.key}
              style={[
                styles.severityButton,
                { backgroundColor: level.bg },
                severity === level.key && {
                  borderColor: level.color,
                  borderWidth: 2,
                },
              ]}
              onPress={() => setSeverity(level.key)}
            >
              <Text style={[styles.severityText, { color: level.color }]}>
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what happened, when, and any people involved..."
          placeholderTextColor="#475569"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        {/* Photos */}
        <Text style={styles.label}>Photos (optional)</Text>
        <View style={styles.photoRow}>
          {photos.map((uri, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => {
                setPhotos(photos.filter((_, i) => i !== idx));
              }}
            >
              <Image source={{ uri }} style={styles.photoThumb} />
              <View style={styles.photoRemove}>
                <Text style={styles.photoRemoveText}>×</Text>
              </View>
            </TouchableOpacity>
          ))}
          {photos.length < 3 && (
            <TouchableOpacity style={styles.addPhotoButton} onPress={pickPhoto}>
              <Text style={styles.addPhotoIcon}>📷</Text>
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Location */}
        {location && (
          <View style={styles.locationNote}>
            <Text style={styles.locationNoteText}>
              📍 Location attached: {location.coords.latitude.toFixed(4)},{' '}
              {location.coords.longitude.toFixed(4)}
            </Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit Incident Report</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
  backButton: {
    marginBottom: 12,
  },
  backText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  title: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  siteName: {
    color: '#a78bfa',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 24,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 20,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeChipSelected: {
    backgroundColor: '#4c1d95',
    borderColor: '#7c3aed',
  },
  typeChipText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  typeChipTextSelected: {
    color: '#e9d5ff',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  severityText: {
    fontSize: 13,
    fontWeight: '700',
  },
  textArea: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    color: '#f8fafc',
    fontSize: 15,
    minHeight: 120,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  addPhotoText: {
    color: '#64748b',
    fontSize: 10,
  },
  locationNote: {
    marginTop: 16,
    padding: 10,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  locationNoteText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 28,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});

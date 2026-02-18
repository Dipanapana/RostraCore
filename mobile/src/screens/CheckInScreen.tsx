import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { attendanceApi } from '../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CheckInScreenProps {
  route: {
    params: {
      assignmentId: number;
      siteName: string;
      siteLatitude?: number;
      siteLongitude?: number;
      action: 'check-in' | 'check-out';
    };
  };
  navigation: any;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_DISTANCE_METERS = 500; // Geo-fence radius

function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CheckInScreen({ route, navigation }: CheckInScreenProps) {
  const { assignmentId, siteName, siteLatitude, siteLongitude, action } =
    route.params;

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const isCheckIn = action === 'check-in';

  // Get current location
  useEffect(() => {
    (async () => {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Enable it in Settings.');
        setLocationLoading(false);
        return;
      }

      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(loc);

        // Calculate distance to site
        if (siteLatitude && siteLongitude) {
          const dist = getDistanceMeters(
            loc.coords.latitude,
            loc.coords.longitude,
            siteLatitude,
            siteLongitude,
          );
          setDistance(dist);
        }
      } catch {
        setLocationError('Could not get your location. Try again.');
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  const isWithinGeofence =
    distance === null || distance <= MAX_DISTANCE_METERS;

  const handleSubmit = async () => {
    if (!location) return;

    setSubmitting(true);
    try {
      const data = {
        shift_assignment_id: assignmentId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      if (isCheckIn) {
        await attendanceApi.checkIn(data);
      } else {
        await attendanceApi.checkOut(data);
      }

      Alert.alert(
        'Success',
        `${isCheckIn ? 'Check-in' : 'Check-out'} recorded successfully!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        `${isCheckIn ? 'Check-in' : 'Check-out'} failed. Please try again.`;
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{'← Back'}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {isCheckIn ? 'Check In' : 'Check Out'}
        </Text>
        <Text style={styles.siteName}>{siteName}</Text>

        {/* Location status */}
        <View style={styles.locationCard}>
          {locationLoading ? (
            <View style={styles.locationLoading}>
              <ActivityIndicator color="#7c3aed" />
              <Text style={styles.locationLoadingText}>
                Getting your location...
              </Text>
            </View>
          ) : locationError ? (
            <View style={styles.locationError}>
              <Text style={styles.locationErrorIcon}>⚠️</Text>
              <Text style={styles.locationErrorText}>{locationError}</Text>
            </View>
          ) : (
            <>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Your Location</Text>
                <Text style={styles.locationCoords}>
                  {location?.coords.latitude.toFixed(6)},{' '}
                  {location?.coords.longitude.toFixed(6)}
                </Text>
              </View>

              {distance !== null && (
                <View style={styles.locationRow}>
                  <Text style={styles.locationLabel}>Distance to Site</Text>
                  <Text
                    style={[
                      styles.distanceValue,
                      isWithinGeofence
                        ? styles.distanceOk
                        : styles.distanceFar,
                    ]}
                  >
                    {distance < 1000
                      ? `${Math.round(distance)}m`
                      : `${(distance / 1000).toFixed(1)}km`}
                  </Text>
                </View>
              )}

              {/* Geofence status */}
              <View
                style={[
                  styles.geofenceStatus,
                  isWithinGeofence
                    ? styles.geofenceOk
                    : styles.geofenceWarning,
                ]}
              >
                <Text style={styles.geofenceIcon}>
                  {isWithinGeofence ? '✓' : '⚠'}
                </Text>
                <Text style={styles.geofenceText}>
                  {isWithinGeofence
                    ? 'You are within the site perimeter'
                    : `You are ${Math.round(distance! - MAX_DISTANCE_METERS)}m outside the perimeter`}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            isCheckIn ? styles.submitCheckIn : styles.submitCheckOut,
            (locationLoading || submitting || !!locationError) &&
              styles.submitDisabled,
          ]}
          onPress={handleSubmit}
          disabled={locationLoading || submitting || !!locationError}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              {isCheckIn ? 'Confirm Check-In' : 'Confirm Check-Out'}
            </Text>
          )}
        </TouchableOpacity>

        {!isWithinGeofence && !locationLoading && !locationError && (
          <Text style={styles.warningNote}>
            Warning: You are outside the site geo-fence. Your check-in will be
            flagged for supervisor review.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  siteName: {
    color: '#a78bfa',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
  },
  locationCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  locationLoadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  locationError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationErrorIcon: {
    fontSize: 20,
  },
  locationErrorText: {
    color: '#fca5a5',
    fontSize: 14,
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  locationLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  locationCoords: {
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  distanceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  distanceOk: {
    color: '#4ade80',
  },
  distanceFar: {
    color: '#fbbf24',
  },
  geofenceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
  },
  geofenceOk: {
    backgroundColor: '#14532d',
  },
  geofenceWarning: {
    backgroundColor: '#422006',
  },
  geofenceIcon: {
    fontSize: 16,
    color: '#fff',
  },
  geofenceText: {
    color: '#e2e8f0',
    fontSize: 13,
    flex: 1,
  },
  submitButton: {
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitCheckIn: {
    backgroundColor: '#16a34a',
  },
  submitCheckOut: {
    backgroundColor: '#dc2626',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  warningNote: {
    color: '#fbbf24',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLocationTracking() {
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(
    null,
  );
  const [tracking, setTracking] = useState(false);
  const [locationHistory, setLocationHistory] = useState<LocationPoint[]>([]);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  // Request permissions
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Location Required',
        'Location permission is needed for check-in verification and patrol tracking. Please enable it in Settings.',
      );
      return false;
    }
    return true;
  }, []);

  // Get current location (one-shot)
  const getCurrentLocation = useCallback(async (): Promise<LocationPoint | null> => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return null;

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const point: LocationPoint = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        timestamp: loc.timestamp,
      };
      setCurrentLocation(point);
      return point;
    } catch {
      return null;
    }
  }, [requestPermission]);

  // Start continuous tracking (for patrol mode)
  const startTracking = useCallback(async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    if (watchRef.current) return; // Already tracking

    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 20, // Update every 20 meters
        timeInterval: 30000, // Or every 30 seconds
      },
      (loc) => {
        const point: LocationPoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          timestamp: loc.timestamp,
        };
        setCurrentLocation(point);
        setLocationHistory((prev) => [...prev, point]);
      },
    );

    setTracking(true);
  }, [requestPermission]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
    setTracking(false);
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setLocationHistory([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchRef.current) {
        watchRef.current.remove();
      }
    };
  }, []);

  return {
    currentLocation,
    tracking,
    locationHistory,
    getCurrentLocation,
    startTracking,
    stopTracking,
    clearHistory,
  };
}

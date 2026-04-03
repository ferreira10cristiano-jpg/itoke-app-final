import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';

export default function EstablishmentLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  useEffect(() => {
    // Don't redirect while still loading auth state
    if (isLoading) return;

    // Allow access to register screen without auth
    const currentSegment = segments[segments.length - 1];
    if (currentSegment === 'register') return;

    // If not authenticated, redirect to root
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }

    // If authenticated but not as establishment, redirect to root
    if (user && user.role !== 'establishment' && user.role !== 'admin') {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, user, segments]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0F172A' },
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="register" />
      <Stack.Screen name="offers" />
      <Stack.Screen name="packages" />
      <Stack.Screen name="validate" />
      <Stack.Screen name="help" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="team" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
});

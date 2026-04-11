import React from 'react';
import { Stack } from 'expo-router';

export default function RepresentativeLayout() {
  // Representative dashboard uses its own token-based auth (X-Rep-Token)
  // No user auth required - access is controlled by the private link token
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0B0F1A' },
      }}
    >
      <Stack.Screen name="dashboard" />
    </Stack>
  );
}

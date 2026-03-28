import React, { useEffect } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';

export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuthStore();

  // Redirect to welcome screen when user logs out
  useEffect(() => {
    // Only redirect if auth check is done and user is NOT authenticated
    if (!isLoading && !isAuthenticated) {
      // For web, use direct location change for reliability
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      } else {
        // Use setTimeout to ensure state propagation is complete
        const timer = setTimeout(() => {
          try {
            // Dismiss all modals/screens first, then go to root
            while (router.canDismiss()) {
              router.dismiss();
            }
          } catch (e) {
            // ignore dismiss errors
          }
          router.replace('/');
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, isLoading]);

  // Don't render tabs content if user logged out
  if (!isLoading && !isAuthenticated) {
    return <View style={{ flex: 1, backgroundColor: '#0F172A' }} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#1E293B',
          borderTopWidth: 1,
          borderTopColor: '#334155',
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ofertas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pricetags" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="qr"
        options={{
          title: 'Meus QR',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="qr-code" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Carteira',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          title: 'Ajuda',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="help-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden old tabs - kept for backwards compatibility */}
      <Tabs.Screen name="network" options={{ href: null }} />
      <Tabs.Screen name="credits" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({});

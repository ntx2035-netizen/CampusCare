import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../src/AuthContext';
import { watchConnectivity } from '../src/queueRuntime';
import { startRealtime, stopRealtime } from '../src/realtime';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Navigator() {
  const { ready, user } = useAuth();
  useEffect(() => { if (ready) SplashScreen.hideAsync(); }, [ready]);
  useEffect(() => watchConnectivity(), []);
  useEffect(() => { if (user) void startRealtime(); else stopRealtime(); return stopRealtime; }, [user]);
  if (!ready) return null;
  return <><StatusBar style="light" /><Stack screenOptions={{ headerTintColor: '#22D3EE', headerStyle: { backgroundColor: '#070B14' }, headerTitleStyle: { fontWeight: '800', color: '#F8FAFC' }, headerShadowVisible: false, contentStyle: { backgroundColor: '#070B14' } }}>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen name="login" options={{ headerShown: false }} />
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    <Stack.Screen name="scan" options={{ title: 'Quét QR địa điểm', presentation: 'modal' }} />
    <Stack.Screen name="select-location" options={{ title: 'Chọn vị trí', presentation: 'modal' }} />
    <Stack.Screen name="incident" options={{ title: 'Chi tiết sự cố' }} />
    <Stack.Screen name="task" options={{ title: 'Cập nhật xử lý' }} />
  </Stack></>;
}

export default function RootLayout() { return <AuthProvider><Navigator /></AuthProvider>; }

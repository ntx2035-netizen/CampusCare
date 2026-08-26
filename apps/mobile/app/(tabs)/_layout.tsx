import { Redirect, Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useAuth } from '../../src/AuthContext';

const Icon = ({ value, color }: { value: string; color: ColorValue }) => <Text style={{ color, fontSize: 18 }}>{value}</Text>;
export default function TabsLayout() {
  const { user } = useAuth(); if (!user) return <Redirect href="/login" />;
  return <Tabs screenOptions={{ headerTitleStyle: { fontWeight: '800' }, headerTintColor: '#087f8c', tabBarActiveTintColor: '#087f8c', tabBarLabelStyle: { fontWeight: '700', fontSize: 10 }, tabBarStyle: { height: 62, paddingTop: 5, paddingBottom: 7 } }}>
    <Tabs.Screen name="home" options={{ title: 'Trang chủ', tabBarIcon: ({ color }) => <Icon value="⌂" color={color} /> }} />
    <Tabs.Screen name="report" options={{ title: 'Báo sự cố', href: user.role === 'STUDENT' ? '/report' : null, tabBarIcon: ({ color }) => <Icon value="＋" color={color} /> }} />
    <Tabs.Screen name="incidents" options={{ title: 'Của tôi', href: user.role === 'STUDENT' ? '/incidents' : null, tabBarIcon: ({ color }) => <Icon value="☷" color={color} /> }} />
    <Tabs.Screen name="tasks" options={{ title: user.role === 'STAFF' ? 'Nhiệm vụ' : 'Điều phối', href: ['STAFF', 'ADMIN', 'DISPATCHER'].includes(user.role) ? '/tasks' : null, tabBarIcon: ({ color }) => <Icon value="✓" color={color} /> }} />
    <Tabs.Screen name="users" options={{ title: 'Duyệt tài khoản', href: user.role === 'ADMIN' ? '/users' : null, tabBarIcon: ({ color }) => <Icon value="♟" color={color} /> }} />
    <Tabs.Screen name="notifications" options={{ title: 'Thông báo', tabBarIcon: ({ color }) => <Icon value="●" color={color} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'Hồ sơ', tabBarIcon: ({ color }) => <Icon value="♙" color={color} /> }} />
  </Tabs>;
}

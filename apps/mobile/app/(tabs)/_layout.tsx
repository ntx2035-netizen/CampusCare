import { Redirect, Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useAuth } from '../../src/AuthContext';
import { colors } from '../../src/theme';

const icons = { home: '⌂', support: '+', list: '≡', tasks: '✓', users: '◎', notifications: '•', profile: '◯' };
function TabIcon({ value, color }: { value: keyof typeof icons; color: ColorValue }) {
  return <Text style={{ color, fontSize: value === 'support' ? 24 : 20, fontWeight: '700', lineHeight: 22 }}>{icons[value]}</Text>;
}

export default function TabsLayout() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/login" />;

  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.subtle,
    tabBarLabelStyle: { fontWeight: '700', fontSize: 10, marginTop: 2 },
    tabBarStyle: {
      height: 66, paddingTop: 7, paddingBottom: 8,
      backgroundColor: colors.surface, borderTopColor: colors.border,
    },
    tabBarItemStyle: { borderRadius: 8 },
  }}>
    <Tabs.Screen name="home" options={{ title: 'Trang chủ', tabBarIcon: ({ color }) => <TabIcon value="home" color={color} /> }} />
    <Tabs.Screen name="report" options={{ title: 'Hỗ trợ', href: user.role === 'STUDENT' ? '/report' : null, tabBarIcon: ({ color }) => <TabIcon value="support" color={color} /> }} />
    <Tabs.Screen name="incidents" options={{ title: 'Yêu cầu', href: user.role === 'STUDENT' ? '/incidents' : null, tabBarIcon: ({ color }) => <TabIcon value="list" color={color} /> }} />
    <Tabs.Screen name="tasks" options={{ title: user.role === 'STAFF' ? 'Nhiệm vụ' : 'Điều phối', href: ['STAFF', 'ADMIN', 'DISPATCHER'].includes(user.role) ? '/tasks' : null, tabBarIcon: ({ color }) => <TabIcon value="tasks" color={color} /> }} />
    <Tabs.Screen name="users" options={{ title: 'Tài khoản', href: user.role === 'ADMIN' ? '/users' : null, tabBarIcon: ({ color }) => <TabIcon value="users" color={color} /> }} />
    <Tabs.Screen name="notifications" options={{ title: 'Thông báo', tabBarIcon: ({ color }) => <TabIcon value="notifications" color={color} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'Cá nhân', tabBarIcon: ({ color }) => <TabIcon value="profile" color={color} /> }} />
  </Tabs>;
}

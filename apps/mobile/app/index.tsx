import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../src/AuthContext';
import { colors } from '../src/theme';

export default function Index() {
  const { user, ready } = useAuth();
  if (!ready) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.teal} /></View>;
  return <Redirect href={user ? (user.role === 'STAFF' ? '/tasks' : '/home') : '/login'} />;
}


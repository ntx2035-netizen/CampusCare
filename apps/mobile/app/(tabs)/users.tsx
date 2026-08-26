import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../../src/api';
import { useAuth } from '../../src/AuthContext';
import { common } from '../../src/theme';
import type { User } from '../../src/types';

export default function UserApprovalScreen() {
  const { user } = useAuth(); const [rows, setRows] = useState<User[]>([]); const [loading, setLoading] = useState(true); const [message, setMessage] = useState('');
  const load = useCallback(() => { api<User[]>('/users?active=false').then((items) => setRows(items.filter((item) => ['STAFF', 'DISPATCHER'].includes(item.role) && !item.approved_at))).catch((error) => setMessage(error.message)).finally(() => setLoading(false)); }, []);
  useFocusEffect(load);
  async function approve(id: string) { setMessage(''); try { await api(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active: true }) }); setMessage('Đã duyệt tài khoản.'); load(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể duyệt tài khoản'); } }
  if (user?.role !== 'ADMIN') return <View style={[common.screen, common.empty]}><Text style={common.muted}>Màn hình chỉ dành cho quản trị viên.</Text></View>;
  return <ScrollView style={common.screen} contentContainerStyle={common.content}><Text style={common.h1}>Duyệt tài khoản</Text><Text style={common.muted}>Kỹ thuật viên và điều phối đã xác minh Gmail đang chờ phê duyệt.</Text>{message ? <Text style={message.startsWith('Đã') ? common.success : common.error}>{message}</Text> : null}{loading ? <ActivityIndicator /> : !rows.length ? <View style={common.empty}><Text style={common.h2}>Không có tài khoản chờ duyệt</Text></View> : rows.map((item) => <View key={item.id} style={common.card}><Text style={common.h2}>{item.full_name}</Text><Text style={common.muted}>{item.email}</Text><Text style={common.badge}>{item.role === 'STAFF' ? 'Kỹ thuật viên' : 'Điều phối viên'}</Text><TouchableOpacity style={common.button} onPress={() => approve(item.id)}><Text style={common.buttonText}>Duyệt tài khoản</Text></TouchableOpacity></View>)}</ScrollView>;
}

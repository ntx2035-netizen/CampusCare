import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../../src/api';
import { useAuth } from '../../src/AuthContext';
import { colors, common } from '../../src/theme';
import { subscribeRealtime } from '../../src/realtime';
import type { Notification } from '../../src/types';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Notification[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(() => {
    setError('');
    void api<Notification[]>('/notifications').then(setRows).catch((reason) => setError(reason instanceof Error ? reason.message : 'Không tải được thông báo')).finally(() => setLoading(false));
  }, []); useFocusEffect(load);
  useEffect(() => subscribeRealtime((event) => { if (event.event === 'notification.created') load(); }), [load]);
  async function open(item: Notification) { if (!item.is_read) await api(`/notifications/${item.id}/read`, { method: 'PATCH' }); const incidentId = typeof item.data.incident_id === 'string' ? item.data.incident_id : ''; if (incidentId) router.push({ pathname: user?.role === 'STAFF' ? '/task' : '/incident', params: { id: incidentId } }); else load(); }
  return <ScrollView style={common.screen} contentContainerStyle={common.content}><Text style={common.h1}>Thông báo</Text><Text style={common.muted}>Chạm vào nhiệm vụ để xem vị trí và mở chỉ đường.</Text>{error ? <Text style={common.error}>{error}</Text> : null}{loading ? <ActivityIndicator color={colors.teal} /> : !rows.length ? <View style={common.empty}><Text style={styles.bell}>●</Text><Text style={common.h2}>Chưa có thông báo</Text></View> : rows.map((item) => <TouchableOpacity key={item.id} style={[common.card, item.is_read && styles.read]} onPress={() => open(item)}><View style={styles.notificationRow}><View style={[styles.dot, item.is_read && styles.dotRead]} /><View style={styles.grow}><Text style={common.h2}>{item.title}</Text><Text style={common.body}>{item.message}</Text><Text style={styles.date}>{new Date(item.created_at).toLocaleString('vi-VN')}</Text></View></View></TouchableOpacity>)}</ScrollView>;
}
const styles = StyleSheet.create({ notificationRow: { flexDirection: 'row', gap: 11 }, dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.blue, marginTop: 6 }, dotRead: { backgroundColor: '#aab5c1' }, grow: { flex: 1, gap: 4 }, read: { opacity: .65 }, date: { color: colors.muted, fontSize: 11 }, bell: { color: colors.teal, fontSize: 34 } });

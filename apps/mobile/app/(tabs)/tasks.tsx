import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../../src/api';
import { useAuth } from '../../src/AuthContext';
import { colors, common } from '../../src/theme';
import { subscribeRealtime } from '../../src/realtime';
import type { Incident } from '../../src/types';
import { STATUS_LABEL } from '../../src/types';

export default function TasksScreen() {
  const { user } = useAuth(); const [rows, setRows] = useState<Incident[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(() => { api<Incident[]>('/incidents').then(setRows).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []); useFocusEffect(load);
  useEffect(() => subscribeRealtime((event) => { if (event.event.startsWith('incident.')) load(); }), [load]);
  if (!user || !['STAFF', 'ADMIN', 'DISPATCHER'].includes(user.role)) return <View style={[common.screen, common.empty]}><Text style={common.muted}>Bạn không có quyền xem màn hình này.</Text></View>;
  const operations = user.role === 'ADMIN' || user.role === 'DISPATCHER';
  return <ScrollView style={common.screen} contentContainerStyle={common.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setLoading(true); load(); }} />}><Text style={common.h1}>{operations ? 'Điều phối sự cố' : 'Nhiệm vụ của tôi'}</Text><Text style={common.muted}>{operations ? 'Tiếp nhận, phân công và theo dõi xử lý ngay trên ứng dụng.' : 'Xác nhận nhiệm vụ và cập nhật tiến độ ngay tại hiện trường.'}</Text>{error ? <Text style={common.error}>{error}</Text> : null}{loading && !rows.length ? <ActivityIndicator color={colors.teal} /> : !rows.length ? <View style={common.empty}><Text style={styles.check}>✓</Text><Text style={common.h2}>{operations ? 'Chưa có sự cố' : 'Chưa có nhiệm vụ được giao'}</Text></View> : rows.map((item) => <TouchableOpacity key={item.id} style={[common.card, item.priority === 'EMERGENCY' && styles.emergencyCard]} onPress={() => router.push({ pathname: operations ? '/incident' : '/task', params: { id: item.id } })}><View style={common.between}><Text style={styles.code}>{item.code}</Text><Text style={common.badge}>{STATUS_LABEL[item.status]}</Text></View><Text style={common.h2}>{item.title}</Text><Text style={common.muted}>⌖ {item.location?.name || item.location_note || (item.latitude != null && item.longitude != null ? `${item.latitude}, ${item.longitude}` : 'Chưa có địa điểm')}</Text><Text style={styles.date}>Được tạo {new Date(item.created_at).toLocaleString('vi-VN')}</Text></TouchableOpacity>)}</ScrollView>;
}
const styles = StyleSheet.create({ code: { color: colors.blue, fontWeight: '900', fontSize: 12 }, check: { color: colors.success, fontSize: 40 }, emergencyCard: { borderLeftWidth: 4, borderLeftColor: colors.danger }, date: { color: colors.muted, fontSize: 11 } });

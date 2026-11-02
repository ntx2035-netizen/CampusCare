import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../../src/api';
import { colors, common } from '../../src/theme';
import { subscribeRealtime } from '../../src/realtime';
import type { Incident } from '../../src/types';
import { STATUS_LABEL } from '../../src/types';

export default function IncidentsScreen() {
  const [rows, setRows] = useState<Incident[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(() => { setError(''); api<Incident[]>('/incidents').then(setRows).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);
  useFocusEffect(load);
  useEffect(() => subscribeRealtime((event) => { if (event.event.startsWith('incident.')) load(); }), [load]);
  return <ScrollView style={common.screen} contentContainerStyle={common.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setLoading(true); load(); }} />}><Text style={common.h1}>Sự cố của tôi</Text><Text style={common.muted}>Tiến độ được cập nhật theo thời gian thực từ bộ phận xử lý.</Text>{error ? <Text style={common.error}>{error}</Text> : null}{loading && !rows.length ? <ActivityIndicator color={colors.teal} /> : !rows.length ? <View style={common.empty}><Text style={styles.emptyIcon}>☷</Text><Text style={common.h2}>Chưa có báo cáo</Text><TouchableOpacity onPress={() => router.push('/report')}><Text style={styles.link}>Tạo báo cáo đầu tiên</Text></TouchableOpacity></View> : rows.map((item) => <TouchableOpacity key={item.id} style={common.card} onPress={() => router.push({ pathname: '/incident', params: { id: item.id } })}><View style={common.between}><Text style={styles.code}>{item.code}</Text><Text style={common.badge}>{STATUS_LABEL[item.status]}</Text></View><Text style={common.h2}>{item.title}</Text><Text style={common.muted}>{item.category.name} · {item.location?.name || item.location_note || (item.latitude != null && item.longitude != null ? 'Theo tọa độ' : 'Chưa có địa điểm')}</Text><View style={styles.footer}><Text style={[styles.priority, item.priority === 'EMERGENCY' && styles.danger]}>{item.priority}</Text><Text style={common.muted}>{new Date(item.created_at).toLocaleDateString('vi-VN')}</Text></View></TouchableOpacity>)}</ScrollView>;
}
const styles = StyleSheet.create({ code: { color: colors.blue, fontWeight: '900', fontSize: 12 }, footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }, priority: { color: colors.warning, fontSize: 11, fontWeight: '900' }, danger: { color: colors.danger }, emptyIcon: { color: colors.teal, fontSize: 38 }, link: { color: colors.blue, fontWeight: '800' } });

import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../src/AuthContext';
import { readQueue } from '../../src/offlineQueue';
import { offlineStorage, runSync } from '../../src/queueRuntime';
import { colors, common } from '../../src/theme';

export default function HomeScreen() {
  const { user } = useAuth(); const [pending, setPending] = useState(0); const [syncing, setSyncing] = useState(false);
  const load = useCallback(() => { readQueue(offlineStorage).then((items) => setPending(items.length)); }, []);
  useFocusEffect(load);
  async function sync() { setSyncing(true); await runSync(); load(); setSyncing(false); }
  return <ScrollView style={common.screen} contentContainerStyle={common.content} refreshControl={<RefreshControl refreshing={syncing} onRefresh={sync} />}>
    <View style={styles.hero}><Text style={styles.hello}>Xin chào, {user?.full_name.split(' ').slice(-1)[0]} 👋</Text><Text style={styles.heroTitle}>{user?.role === 'STAFF' ? 'Sẵn sàng xử lý nhiệm vụ hôm nay?' : user?.role === 'ADMIN' || user?.role === 'DISPATCHER' ? 'Điều phối sự cố mọi lúc, mọi nơi.' : 'Bạn cần hỗ trợ điều gì trong khuôn viên?'}</Text><Text style={styles.heroText}>CampusCare kết nối báo cáo với đúng bộ phận xử lý.</Text></View>
    {pending > 0 && <TouchableOpacity style={styles.offline} onPress={sync}><View><Text style={styles.offlineTitle}>{pending} báo cáo chờ đồng bộ</Text><Text style={styles.offlineText}>{syncing ? 'Đang đồng bộ…' : 'Dữ liệu và ảnh vẫn được lưu an toàn. Nhấn để thử lại.'}</Text></View><Text style={styles.arrow}>›</Text></TouchableOpacity>}
    {user?.role === 'STUDENT' ? <>
      <TouchableOpacity style={styles.reportButton} onPress={() => router.push('/report')}><Text style={styles.reportPlus}>＋</Text><View><Text style={styles.reportTitle}>Báo cáo sự cố</Text><Text style={styles.reportText}>Gửi ảnh, vị trí và thông tin chi tiết</Text></View></TouchableOpacity>
      <View style={styles.quickGrid}><TouchableOpacity style={common.card} onPress={() => router.push('/scan')}><Text style={styles.quickIcon}>▣</Text><Text style={common.h2}>Quét mã QR</Text><Text style={common.muted}>Xác định nhanh phòng học</Text></TouchableOpacity><TouchableOpacity style={common.card} onPress={() => router.push('/incidents')}><Text style={styles.quickIcon}>☷</Text><Text style={common.h2}>Sự cố của tôi</Text><Text style={common.muted}>Theo dõi tiến độ realtime</Text></TouchableOpacity></View>
    </> : <TouchableOpacity style={styles.reportButton} onPress={() => router.push('/tasks')}><Text style={styles.reportPlus}>✓</Text><View><Text style={styles.reportTitle}>Mở danh sách nhiệm vụ</Text><Text style={styles.reportText}>Xác nhận và cập nhật quá trình xử lý</Text></View></TouchableOpacity>}
    <View style={common.card}><Text style={common.h2}>Khi nào nên báo sự cố?</Text><Text style={common.body}>• Mất an toàn điện, nước hoặc an ninh.{`\n`}• Thiết bị học tập không hoạt động.{`\n`}• Hạ tầng ảnh hưởng đến việc học và làm việc.</Text><Text style={styles.emergency}>Tình huống đe dọa tính mạng: gọi ngay số khẩn cấp của nhà trường.</Text></View>
  </ScrollView>;
}
const styles = StyleSheet.create({ hero: { margin: -18, marginBottom: 4, padding: 24, paddingTop: 30, backgroundColor: '#073f53' }, hello: { color: '#78ddcf', fontWeight: '800', marginBottom: 12 }, heroTitle: { color: 'white', fontSize: 29, lineHeight: 35, fontWeight: '900', letterSpacing: -.7 }, heroText: { color: '#b7d1da', lineHeight: 21, marginTop: 10 }, offline: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff3dc', borderColor: '#f3d08c', borderWidth: 1, borderRadius: 12 }, offlineTitle: { color: '#86510d', fontWeight: '800' }, offlineText: { color: '#9a6b2f', fontSize: 12, marginTop: 4, maxWidth: 290 }, arrow: { color: '#9a6b2f', fontSize: 26 }, reportButton: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 18, backgroundColor: colors.teal, borderRadius: 14 }, reportPlus: { width: 42, height: 42, textAlign: 'center', textAlignVertical: 'center', paddingTop: 7, borderRadius: 21, overflow: 'hidden', color: 'white', backgroundColor: '#ffffff20', fontSize: 23 }, reportTitle: { color: 'white', fontWeight: '900', fontSize: 17 }, reportText: { color: '#c6eeea', fontSize: 12, marginTop: 3 }, quickGrid: { flexDirection: 'row', gap: 12 }, quickIcon: { color: colors.teal, fontSize: 28 }, emergency: { marginTop: 8, padding: 10, color: '#a42d40', backgroundColor: '#fdebee', borderRadius: 8, fontSize: 12, fontWeight: '700' } });

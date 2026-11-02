import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../../src/api';
import { useAuth } from '../../src/AuthContext';
import { readQueue } from '../../src/offlineQueue';
import { offlineStorage, runSync } from '../../src/queueRuntime';
import { colors, common } from '../../src/theme';
import type { Incident } from '../../src/types';
import { STATUS_LABEL } from '../../src/types';

function firstName(name?: string) {
  const parts = name?.trim().split(/\s+/) || [];
  return parts[parts.length - 1] || 'bạn';
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [pending, setPending] = useState(0);
  const [recent, setRecent] = useState<Incident[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');

  const load = useCallback(() => {
    void readQueue(offlineStorage).then((items) => {
      setPending(items.length);
      setSyncError(items.find((item) => item.error)?.error || '');
    });
    void api<Incident[]>('/incidents').then((items) => setRecent(items.slice(0, 3))).catch(() => setRecent([]));
  }, []);

  useFocusEffect(load);

  async function sync() {
    setSyncing(true);
    setSyncError('');
    try {
      const result = await runSync();
      if (result.lastError) setSyncError(result.lastError);
    } catch (reason) {
      setSyncError(reason instanceof Error ? reason.message : 'Chưa thể đồng bộ yêu cầu');
    } finally {
      load();
      setSyncing(false);
    }
  }

  const isStudent = user?.role === 'STUDENT';
  const isStaff = user?.role === 'STAFF';
  const operations = user?.role === 'ADMIN' || user?.role === 'DISPATCHER';

  return <ScrollView
    style={common.screen}
    contentContainerStyle={common.content}
    refreshControl={<RefreshControl refreshing={syncing} onRefresh={sync} tintColor={colors.primary} />}
  >
    <View style={styles.heading}>
      <Text style={styles.eyebrow}>CAMPUSCARE</Text>
      <Text style={common.h1}>Xin chào, {firstName(user?.full_name)}.</Text>
      <Text style={common.muted}>{isStaff ? 'Các nhiệm vụ cần xử lý đang chờ bạn.' : operations ? 'Theo dõi và điều phối sự cố trong khuôn viên.' : 'Bạn cần CampusCare hỗ trợ điều gì hôm nay?'}</Text>
    </View>

    {pending > 0 && <TouchableOpacity style={styles.offline} onPress={sync} accessibilityRole="button" accessibilityLabel="Đồng bộ các báo cáo đang chờ">
      <View style={styles.offlineMarker}><Text style={styles.offlineMarkerText}>!</Text></View>
      <View style={styles.offlineContent}>
        <Text style={styles.offlineTitle}>{pending} yêu cầu đang chờ đồng bộ</Text>
        <Text style={styles.offlineText}>{syncing ? 'Đang thử đồng bộ lại…' : syncError || 'Dữ liệu vẫn được lưu an toàn. Chạm để thử lại.'}</Text>
      </View>
    </TouchableOpacity>}

    {isStudent && <>
      <View style={styles.primaryPanel}>
        <Text style={styles.primaryPanelTitle}>Bạn đang cần hỗ trợ?</Text>
        <Text style={styles.primaryPanelText}>Gửi thông tin, địa điểm và hình ảnh để đúng bộ phận có thể tiếp nhận nhanh hơn.</Text>
        <TouchableOpacity style={styles.primaryAction} onPress={() => router.push('/report')} accessibilityRole="button">
          <Text style={styles.primaryActionText}>Gửi yêu cầu hỗ trợ</Text>
          <Text style={styles.primaryActionArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}><Text style={common.h2}>Tôi có thể giúp gì cho bạn?</Text></View>
      <View style={styles.quickGrid}>
        <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/report')} accessibilityRole="button">
          <Text style={styles.quickSymbol}>+</Text><Text style={styles.quickTitle}>Gửi yêu cầu</Text><Text style={styles.quickText}>Báo sự cố hoặc cần hỗ trợ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/scan')} accessibilityRole="button">
          <Text style={styles.quickSymbol}>⌖</Text><Text style={styles.quickTitle}>Xác định địa điểm</Text><Text style={styles.quickText}>Quét mã QR phòng hoặc khu vực</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/incidents')} accessibilityRole="button">
          <Text style={styles.quickSymbol}>≡</Text><Text style={styles.quickTitle}>Theo dõi yêu cầu</Text><Text style={styles.quickText}>Xem tiến độ xử lý mới nhất</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/notifications')} accessibilityRole="button">
          <Text style={styles.quickSymbol}>•</Text><Text style={styles.quickTitle}>Thông báo</Text><Text style={styles.quickText}>Cập nhật từ CampusCare</Text>
        </TouchableOpacity>
      </View>
    </>}

    {!isStudent && <View style={styles.primaryPanel}>
      <Text style={styles.primaryPanelTitle}>{isStaff ? 'Mở nhiệm vụ của tôi' : 'Mở bảng điều phối'}</Text>
      <Text style={styles.primaryPanelText}>{isStaff ? 'Xem địa điểm, cập nhật tiến độ và hoàn tất công việc tại hiện trường.' : 'Tiếp nhận, phân công và theo dõi các yêu cầu mới.'}</Text>
      <TouchableOpacity style={styles.primaryAction} onPress={() => router.push('/tasks')} accessibilityRole="button">
        <Text style={styles.primaryActionText}>{isStaff ? 'Xem nhiệm vụ' : 'Đi đến điều phối'}</Text><Text style={styles.primaryActionArrow}>→</Text>
      </TouchableOpacity>
    </View>}

    <View style={styles.sectionHeader}>
      <Text style={common.h2}>{isStudent ? 'Yêu cầu gần đây' : isStaff ? 'Nhiệm vụ gần đây' : 'Sự cố gần đây'}</Text>
      {recent.length > 0 && <TouchableOpacity onPress={() => router.push(isStudent ? '/incidents' : '/tasks')}><Text style={styles.link}>Xem tất cả</Text></TouchableOpacity>}
    </View>
    {recent.length ? <View style={styles.recentList}>{recent.map((item) => <TouchableOpacity
      key={item.id}
      style={styles.recentItem}
      onPress={() => router.push({ pathname: isStaff ? '/task' : '/incident', params: { id: item.id } })}
      accessibilityRole="button"
    >
      <View style={styles.recentMain}><Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.recentMeta} numberOfLines={1}>{item.location?.name || item.location_note || item.category.name}</Text></View>
      <View style={styles.recentStatus}><Text style={styles.recentStatusText}>{STATUS_LABEL[item.status]}</Text><Text style={styles.recentDate}>{new Date(item.created_at).toLocaleDateString('vi-VN')}</Text></View>
    </TouchableOpacity>)}</View> : <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{isStudent ? 'Bạn chưa có yêu cầu hỗ trợ nào.' : 'Chưa có dữ liệu cần xử lý.'}</Text>
      <Text style={styles.emptyText}>{isStudent ? 'Khi gặp vấn đề, CampusCare luôn sẵn sàng hỗ trợ bạn.' : 'Các yêu cầu mới sẽ xuất hiện tại đây.'}</Text>
      {isStudent && <TouchableOpacity onPress={() => router.push('/report')}><Text style={styles.link}>Gửi yêu cầu đầu tiên</Text></TouchableOpacity>}
    </View>}

    {isStudent && <View style={styles.helpNote}><Text style={styles.helpTitle}>Khi nào nên gửi yêu cầu?</Text><Text style={styles.helpText}>Khi an ninh, cơ sở vật chất, thiết bị học tập hoặc hạ tầng ảnh hưởng đến việc học và sinh hoạt.</Text></View>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  heading: { gap: 6, paddingTop: 4, paddingBottom: 4 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.1 },
  primaryPanel: { backgroundColor: colors.surfaceRaised, borderRadius: 16, padding: 20, gap: 10, borderWidth: 1, borderColor: colors.border },
  primaryPanelTitle: { color: colors.ink, fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.2 },
  primaryPanelText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  primaryAction: { minHeight: 46, marginTop: 4, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryActionText: { color: '#10203A', fontSize: 14, fontWeight: '800' },
  primaryActionArrow: { color: '#10203A', fontSize: 20, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  link: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: { width: '48.5%', minHeight: 142, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 7 },
  quickSymbol: { color: colors.primary, fontSize: 22, fontWeight: '800', height: 28 },
  quickTitle: { color: colors.ink, fontSize: 14, lineHeight: 19, fontWeight: '800' },
  quickText: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  offline: { padding: 14, flexDirection: 'row', gap: 11, alignItems: 'center', backgroundColor: colors.warningSoft, borderColor: 'rgba(216, 168, 78, 0.35)', borderWidth: 1, borderRadius: 12 },
  offlineMarker: { width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(216, 168, 78, 0.24)' },
  offlineMarkerText: { color: '#F6D17D', fontSize: 15, fontWeight: '900' },
  offlineContent: { flex: 1, gap: 2 },
  offlineTitle: { color: '#F4D28A', fontWeight: '800', fontSize: 13 },
  offlineText: { color: '#DDBF84', fontSize: 12, lineHeight: 17 },
  recentList: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden' },
  recentItem: { minHeight: 73, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  recentMain: { flex: 1, gap: 3 },
  recentTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  recentMeta: { color: colors.muted, fontSize: 12 },
  recentStatus: { alignItems: 'flex-end', gap: 4 },
  recentStatusText: { color: '#B8D2FF', backgroundColor: colors.primarySoft, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, fontSize: 10, fontWeight: '800' },
  recentDate: { color: colors.subtle, fontSize: 10 },
  emptyState: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, alignItems: 'center', padding: 26, gap: 7 },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  helpNote: { borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 13, paddingVertical: 3, gap: 4 },
  helpTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  helpText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});

import * as ExpoLocation from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '../../src/api';
import { useAuth } from '../../src/AuthContext';
import { ServerSettings } from '../../src/ServerSettings';
import { colors, common } from '../../src/theme';
import type { User } from '../../src/types';

const accountTypes = { STUDENT: 'Sinh viên ICTU', LECTURER: 'Giảng viên ICTU', STAFF: 'Nhân viên sửa chữa', DISPATCHER: 'Điều phối viên', ADMIN: 'Quản trị viên' };

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [name, setName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.date_of_birth || '');
  const [temporaryResidence, setTemporaryResidence] = useState(user?.temporary_residence || '');
  const [studentCohort, setStudentCohort] = useState(user?.student_cohort || '');
  const [message, setMessage] = useState('');
  const [locating, setLocating] = useState(false);

  async function save() {
    try { await api<User>('/auth/me', { method: 'PATCH', body: JSON.stringify({ full_name: name, phone, date_of_birth: dateOfBirth || null, temporary_residence: temporaryResidence || null, student_cohort: studentCohort || null }) }); await refreshUser(); setMessage('Đã cập nhật hồ sơ.'); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không thể cập nhật'); }
  }

  async function updateLocation() {
    setLocating(true); setMessage('');
    try {
      const permission = await ExpoLocation.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Bạn chưa cấp quyền vị trí cho CampusCare');
      const position = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });
      await api<User>('/users/me/location', {
        method: 'PATCH',
        body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }),
      });
      await refreshUser(); setMessage('Đã cập nhật vị trí thiết bị.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không thể lấy vị trí thiết bị'); }
    finally { setLocating(false); }
  }

  async function signOut() { await logout(); router.replace('/login'); }

  return <ScrollView style={common.screen} contentContainerStyle={common.content}>
    <View style={styles.identity}><View style={styles.avatar}><Text style={styles.avatarText}>{user?.full_name.slice(0, 1)}</Text></View><View style={styles.identityText}><Text style={common.h1}>{user?.full_name}</Text><Text style={common.muted}>{user ? accountTypes[user.account_type] : ''} · {user?.email}</Text></View></View>
    {message ? <Text style={message.startsWith('Đã') ? common.success : common.error}>{message}</Text> : null}
    <View style={common.card}><Text style={common.h2}>Vị trí thiết bị của tôi</Text><Text style={common.muted}>Chỉ cập nhật khi bạn bấm nút. ADMIN/điều phối dùng vị trí gần nhất để phối hợp; vị trí báo sự cố của sinh viên vẫn được lưu riêng.</Text>{user?.location_updated_at ? <Text style={styles.locationText}>Lần cuối: {new Date(user.location_updated_at).toLocaleString('vi-VN')}{user.location_accuracy != null ? ` · sai số khoảng ${Math.round(user.location_accuracy)} m` : ''}</Text> : <Text style={styles.locationText}>Chưa có vị trí thiết bị.</Text>}<TouchableOpacity style={common.secondaryButton} onPress={updateLocation} disabled={locating}><Text style={common.secondaryText}>{locating ? 'Đang lấy GPS…' : 'Cập nhật vị trí của tôi'}</Text></TouchableOpacity></View>
    <View style={common.card}><Text style={common.h2}>Thông tin cá nhân</Text><View><Text style={common.label}>Họ và tên</Text><TextInput style={common.input} value={name} onChangeText={setName} /></View><View><Text style={common.label}>Số điện thoại</Text><TextInput style={common.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" /></View>{user && ['STUDENT', 'LECTURER', 'STAFF'].includes(user.account_type) ? <><View><Text style={common.label}>Ngày sinh</Text><TextInput style={common.input} value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" /></View><View><Text style={common.label}>Nơi tạm trú/tạm vắng</Text><TextInput style={common.input} value={temporaryResidence} onChangeText={setTemporaryResidence} placeholder="Địa chỉ hiện tại" /></View>{['STUDENT', 'LECTURER'].includes(user.account_type) ? <View><Text style={common.label}>Khóa / niên khóa</Text><TextInput style={common.input} value={studentCohort} onChangeText={setStudentCohort} placeholder="Ví dụ: K22" /></View> : null}</> : null}<TouchableOpacity style={common.button} onPress={save}><Text style={common.buttonText}>Lưu thay đổi</Text></TouchableOpacity></View>
    <ServerSettings />
    <TouchableOpacity style={[common.secondaryButton, styles.logout]} onPress={signOut}><Text style={styles.logoutText}>Đăng xuất</Text></TouchableOpacity>
    <Text style={styles.version}>CampusCare 1.0.0 · Dữ liệu được bảo vệ theo quyền truy cập</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({ identity: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 8 }, identityText: { flex: 1, gap: 3 }, avatar: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 25, backgroundColor: colors.teal }, avatarText: { color: '#07111d', fontSize: 21, fontWeight: '900' }, locationText: { color: colors.teal, fontSize: 11, fontWeight: '700' }, logout: { borderColor: 'rgba(239,68,68,.35)' }, logoutText: { color: colors.danger, fontWeight: '800' }, version: { color: colors.muted, fontSize: 10, textAlign: 'center' } });

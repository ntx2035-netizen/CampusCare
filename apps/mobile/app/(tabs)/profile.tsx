import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '../../src/api';
import { useAuth } from '../../src/AuthContext';
import { colors, common } from '../../src/theme';
import type { User } from '../../src/types';

const accountTypes = { STUDENT: 'Sinh viên ICTU', LECTURER: 'Giảng viên ICTU', STAFF: 'Nhân viên sửa chữa', DISPATCHER: 'Điều phối viên', ADMIN: 'Quản trị viên' };
export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth(); const [name, setName] = useState(user?.full_name || ''); const [phone, setPhone] = useState(user?.phone || ''); const [message, setMessage] = useState('');
  async function save() { try { await api<User>('/auth/me', { method: 'PATCH', body: JSON.stringify({ full_name: name, phone }) }); await refreshUser(); setMessage('Đã cập nhật hồ sơ.'); } catch (e) { setMessage(e instanceof Error ? e.message : 'Không thể cập nhật'); } }
  async function signOut() { await logout(); router.replace('/login'); }
  return <ScrollView style={common.screen} contentContainerStyle={common.content}><View style={styles.identity}><View style={styles.avatar}><Text style={styles.avatarText}>{user?.full_name.slice(0, 1)}</Text></View><Text style={common.h1}>{user?.full_name}</Text><Text style={common.muted}>{user ? accountTypes[user.account_type] : ''} · {user?.email}</Text></View>{message ? <Text style={message.startsWith('Đã') ? common.success : common.error}>{message}</Text> : null}<View style={common.card}><Text style={common.h2}>Thông tin cá nhân</Text><View><Text style={common.label}>Họ và tên</Text><TextInput style={common.input} value={name} onChangeText={setName} /></View><View><Text style={common.label}>Số điện thoại</Text><TextInput style={common.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" /></View><TouchableOpacity style={common.button} onPress={save}><Text style={common.buttonText}>Lưu thay đổi</Text></TouchableOpacity></View><TouchableOpacity style={[common.secondaryButton, styles.logout]} onPress={signOut}><Text style={styles.logoutText}>Đăng xuất</Text></TouchableOpacity><Text style={styles.version}>CampusCare 1.0.0 · Dữ liệu được bảo vệ theo quyền truy cập</Text></ScrollView>;
}
const styles = StyleSheet.create({ identity: { alignItems: 'center', gap: 7, paddingVertical: 18 }, avatar: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', borderRadius: 38, backgroundColor: colors.teal }, avatarText: { color: '#fff', fontSize: 30, fontWeight: '900' }, logout: { borderColor: '#efb5bd' }, logoutText: { color: colors.danger, fontWeight: '800' }, version: { color: colors.muted, fontSize: 10, textAlign: 'center' } });

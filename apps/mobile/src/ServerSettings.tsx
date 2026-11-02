import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { checkApiHealth, getApiUrl, setApiUrl } from './api';
import { startRealtime, stopRealtime } from './realtime';
import { colors, common } from './theme';

export function ServerSettings() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { getApiUrl().then(setUrl); }, []);

  async function verifyAndSave() {
    setSaving(true); setMessage('');
    try {
      const healthyUrl = await checkApiHealth(url);
      await setApiUrl(healthyUrl);
      stopRealtime(); void startRealtime();
      setUrl(healthyUrl); setMessage('Đã kết nối và lưu máy chủ demo.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không thể kiểm tra máy chủ'); }
    finally { setSaving(false); }
  }

  return <View style={styles.wrapper}>
    <TouchableOpacity style={styles.toggle} onPress={() => setOpen((value) => !value)}>
      <Text style={styles.toggleText}>Máy chủ demo</Text><Text style={styles.chevron}>{open ? '⌃' : '⌄'}</Text>
    </TouchableOpacity>
    {open ? <View style={styles.content}>
      <Text style={common.muted}>LDPlayer/điện thoại dùng IP Wi-Fi của laptop, ví dụ http://192.168.1.214/api.</Text>
      <TextInput style={common.input} value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} placeholder="http://IP-LAPTOP/api" placeholderTextColor={colors.muted} />
      {message ? <Text style={message.startsWith('Đã') ? common.success : common.error}>{message}</Text> : null}
      <TouchableOpacity style={common.secondaryButton} onPress={verifyAndSave} disabled={saving}><Text style={common.secondaryText}>{saving ? 'Đang kiểm tra…' : 'Kiểm tra và lưu'}</Text></TouchableOpacity>
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({ wrapper: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: 'hidden' }, toggle: { minHeight: 40, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,.04)' }, toggleText: { color: colors.ink, fontWeight: '800', fontSize: 12 }, chevron: { color: colors.teal, fontSize: 17 }, content: { padding: 11, gap: 9, backgroundColor: colors.card } });

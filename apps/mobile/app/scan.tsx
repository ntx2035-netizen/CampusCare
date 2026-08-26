import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../src/api';
import { colors, common } from '../src/theme';
import type { Location } from '../src/types';

function tokenFromQr(data: string): string {
  try { const decoded = JSON.parse(data); if (decoded.type === 'campuscare-location' && decoded.token) return decoded.token; } catch { /* QR URI cũ vẫn được hỗ trợ. */ }
  if (data.startsWith('campuscare://location/')) return data.split('/').pop() || '';
  return data;
}

export default function ScanScreen() {
  const params = useLocalSearchParams<{ latitude?: string; longitude?: string }>();
  const [permission, requestPermission] = useCameraPermissions(); const [scanned, setScanned] = useState(false); const [error, setError] = useState('');
  async function handle(data: string) { if (scanned) return; setScanned(true); try { const location = await api<Location>(`/locations/resolve/${encodeURIComponent(tokenFromQr(data))}`); router.replace({ pathname: '/report', params: { locationId: location.id, ...(params.latitude && params.longitude ? { latitude: params.latitude, longitude: params.longitude } : {}) } }); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Mã QR không hợp lệ'); } }
  if (!permission) return <View style={[common.screen, common.empty]}><Text>Đang kiểm tra quyền camera…</Text></View>;
  if (!permission.granted) return <View style={[common.screen, common.empty]}><Text style={common.h2}>Cần quyền camera</Text><Text style={common.muted}>Camera chỉ dùng để đọc mã QR phòng học.</Text><TouchableOpacity style={common.button} onPress={requestPermission}><Text style={common.buttonText}>Cho phép camera</Text></TouchableOpacity></View>;
  return <View style={styles.page}><CameraView style={styles.camera} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => handle(data)}><View style={styles.overlay}><View style={styles.frame} /><Text style={styles.hint}>Đặt mã QR vào trong khung</Text></View></CameraView>{error ? <View style={styles.errorPanel}><Text style={common.error}>{error}</Text><TouchableOpacity style={common.secondaryButton} onPress={() => { setScanned(false); setError(''); }}><Text style={common.secondaryText}>Quét lại</Text></TouchableOpacity></View> : null}</View>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#071722' }, camera: { flex: 1 }, overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000035' }, frame: { width: 240, height: 240, borderWidth: 3, borderColor: '#65e2d4', borderRadius: 22 }, hint: { marginTop: 20, color: 'white', backgroundColor: '#071722cc', paddingHorizontal: 15, paddingVertical: 9, borderRadius: 20, fontWeight: '700' }, errorPanel: { position: 'absolute', bottom: 20, left: 18, right: 18, padding: 13, gap: 9, backgroundColor: '#fff', borderRadius: 13 } });

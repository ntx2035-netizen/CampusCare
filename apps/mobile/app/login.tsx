import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/AuthContext';
import { ServerSettings } from '../src/ServerSettings';
import { colors, common } from '../src/theme';
import type { AccountType } from '../src/types';

export default function LoginScreen() {
  const { login, requestRegistration, verifyRegistration } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState<'login' | 'register' | 'otp'>('login');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('STUDENT');
  const [otp, setOtp] = useState('');

  function changeMode(nextMode: 'login' | 'register') {
    setMode(nextMode);
    setError('');
    setSuccess('');
  }

  async function submit() {
    setLoading(true);
    setError('');
    try {
      if (mode === 'register') {
        const normalizedEmail = email.trim().toLowerCase();
        const privileged = accountType === 'DISPATCHER' || accountType === 'STAFF';
        if (fullName.trim().length < 2) throw new Error('Họ và tên phải có ít nhất 2 ký tự');
        if (!privileged && !normalizedEmail.endsWith('@ictu.edu.vn')) {
          throw new Error('Sinh viên và giảng viên phải dùng email @ictu.edu.vn');
        }
        if (privileged && !normalizedEmail.endsWith('@gmail.com')) {
          throw new Error('Điều phối viên và kỹ thuật viên phải dùng Gmail');
        }
        if (password.length < 12) throw new Error('Mật khẩu phải có tối thiểu 12 ký tự');
        if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
          throw new Error('Mật khẩu cần có chữ hoa, chữ thường, số và ký tự đặc biệt');
        }
        if (password !== confirmPassword) throw new Error('Mật khẩu xác nhận không khớp');
        await requestRegistration(fullName.trim(), normalizedEmail, password, accountType);
        setMode('otp');
        setSuccess('Đã gửi mã OTP đến địa chỉ email của bạn.');
      } else if (mode === 'otp') {
        if (otp.length !== 6) throw new Error('Mã OTP phải gồm đúng 6 chữ số');
        const result = await verifyRegistration(email.trim(), otp);
        if (result.session) router.replace('/home');
        else {
          setSuccess(result.message);
          setMode('login');
        }
      } else {
        await login(email.trim(), password);
        router.replace('/home');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể xác thực tài khoản');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logo}>
            <Image source={require('../assets/campuscare-ictu-logo.png')} style={styles.logoImage} resizeMode="contain" />
            <View>
              <Text style={styles.logoText}>CampusCare</Text>
              <Text style={styles.logoCaption}>HỖ TRỢ KHUÔN VIÊN ICTU</Text>
            </View>
          </View>

          <View>
            <Text style={styles.eyebrow}>KHUÔN VIÊN ICTU AN TOÀN</Text>
            <Text style={styles.title}>
              {mode === 'login' ? 'Chào mừng bạn' : mode === 'otp' ? 'Xác minh email' : 'Tạo tài khoản'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'register'
                ? 'Sinh viên/giảng viên dùng email ICTU; kỹ thuật viên/điều phối dùng Gmail rồi chờ ADMIN duyệt.'
                : 'Một cổng đăng nhập, giao diện tự đổi theo quyền tài khoản.'}
            </Text>
          </View>

          {mode === 'login' ? (
            <TouchableOpacity style={styles.registerAction} onPress={() => changeMode('register')}>
              <Text style={styles.registerPrompt}>Chưa có tài khoản?</Text>
              <Text style={styles.switchText}>Đăng ký ngay</Text>
            </TouchableOpacity>
          ) : null}

          {error ? <Text style={common.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          {mode === 'register' ? (
            <View>
              <Text style={common.label}>Loại tài khoản</Text>
              <View style={styles.typeRow}>
                {(['STUDENT', 'LECTURER', 'STAFF', 'DISPATCHER'] as AccountType[]).map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.typeButton, accountType === value && styles.typeActive]}
                    onPress={() => setAccountType(value)}
                  >
                    <Text style={accountType === value ? styles.typeActiveText : styles.typeText}>
                      {value === 'STUDENT' ? 'Sinh viên' : value === 'LECTURER' ? 'Giảng viên' : value === 'STAFF' ? 'Kỹ thuật' : 'Điều phối'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={common.label}>Họ và tên</Text>
              <TextInput accessibilityLabel="Họ và tên" style={common.input} value={fullName} onChangeText={setFullName} />
            </View>
          ) : null}

          <View>
            <Text style={common.label}>Email</Text>
            <TextInput
              accessibilityLabel="Email"
              style={common.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {mode !== 'otp' ? (
            <View>
              <Text style={common.label}>Mật khẩu</Text>
              <TextInput accessibilityLabel="Mật khẩu" style={common.input} value={password} onChangeText={setPassword} secureTextEntry />
            </View>
          ) : (
            <View>
              <Text style={common.label}>Mã OTP</Text>
              <TextInput
                accessibilityLabel="Mã OTP"
                style={common.input}
                value={otp}
                onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
              />
            </View>
          )}

          {mode === 'register' ? (
            <View>
              <Text style={common.label}>Xác nhận mật khẩu</Text>
              <TextInput
                accessibilityLabel="Xác nhận mật khẩu"
                style={common.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          ) : null}

          <TouchableOpacity style={common.button} onPress={submit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#10203A" />
            ) : (
              <Text style={common.buttonText}>{mode === 'login' ? 'Đăng nhập' : mode === 'otp' ? 'Xác minh OTP' : 'Gửi mã OTP'}</Text>
            )}
          </TouchableOpacity>

          {mode !== 'login' ? (
            <TouchableOpacity style={styles.backAction} onPress={() => changeMode('login')}>
              <Text style={styles.switchText}>Quay lại đăng nhập</Text>
            </TouchableOpacity>
          ) : null}

          <ServerSettings />

          <Text style={styles.note}>Báo cáo đúng nơi · Phản hồi đúng lúc</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  keyboard: { flex: 1 },
  page: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 40,
    gap: 16,
    backgroundColor: colors.bg,
  },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  logoImage: { width: 58, height: 58, borderRadius: 18 },
  logoText: { color: colors.ink, fontSize: 23, fontWeight: '900' },
  logoCaption: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.9, marginTop: 3 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, marginBottom: 9 },
  title: { color: colors.ink, fontSize: 34, lineHeight: 41, fontWeight: '900', letterSpacing: -1.1 },
  subtitle: { color: colors.muted, marginTop: 7, lineHeight: 21 },
  registerAction: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(117, 167, 248, 0.35)',
  },
  registerPrompt: { color: colors.muted, fontWeight: '700' },
  backAction: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  switchText: { color: colors.primary, textAlign: 'center', fontWeight: '900' },
  note: { color: colors.muted, textAlign: 'center', fontSize: 12, marginTop: 8 },
  success: {
    color: '#86EFAC',
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
    borderRadius: 10,
    padding: 12,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  typeButton: {
    flexGrow: 1,
    flexBasis: '47%',
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: colors.surface,
    borderRadius: 9,
    padding: 10,
  },
  typeActive: { backgroundColor: colors.tealDark, borderColor: colors.teal },
  typeText: { textAlign: 'center', color: '#E2E8F0', fontWeight: '700', fontSize: 12 },
  typeActiveText: { textAlign: 'center', color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
});

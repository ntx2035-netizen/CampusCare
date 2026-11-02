import { StyleSheet } from 'react-native';

// Token dùng chung cho toàn bộ mobile app. Giữ giao diện tối dịu, dễ đọc và
// tránh dùng màu neon/gradient làm màu chủ đạo.
export const colors = {
  ink: '#F7F9FC',
  muted: '#B4BFCE',
  subtle: '#7F8CA0',
  bg: '#101725',
  card: '#182233',
  surface: '#182233',
  surfaceRaised: '#202C3E',
  input: '#121C2A',
  border: '#2B3A4F',
  primary: '#75A7F8',
  primaryStrong: '#4E7FD0',
  primarySoft: 'rgba(117, 167, 248, 0.15)',
  success: '#55C486',
  successSoft: 'rgba(85, 196, 134, 0.14)',
  warning: '#D8A84E',
  warningSoft: 'rgba(216, 168, 78, 0.15)',
  danger: '#E4777D',
  dangerSoft: 'rgba(228, 119, 125, 0.14)',
  // Alias tương thích với các màn hình hiện có.
  teal: '#75A7F8',
  tealDark: '#4E7FD0',
  blue: '#A9C7FF',
};

export const common = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20,
    paddingTop: 20, paddingBottom: 36, gap: 16,
  },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 16, gap: 12,
  },
  h1: { fontSize: 27, lineHeight: 33, fontWeight: '800', letterSpacing: -0.45, color: colors.ink },
  h2: { fontSize: 17, lineHeight: 23, fontWeight: '700', letterSpacing: -0.15, color: colors.ink },
  body: { color: colors.ink, lineHeight: 21, fontSize: 14 },
  muted: { color: colors.muted, lineHeight: 20, fontSize: 13 },
  label: { color: colors.muted, fontWeight: '700', fontSize: 13, marginBottom: 6 },
  input: {
    minHeight: 48, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, color: colors.ink, fontSize: 15,
  },
  button: {
    minHeight: 48, borderRadius: 10, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  buttonText: { color: '#10203A', fontWeight: '800', fontSize: 15 },
  secondaryButton: {
    minHeight: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14,
  },
  secondaryText: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  error: {
    color: '#FFB0B4', backgroundColor: colors.dangerSoft, padding: 13, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(228, 119, 125, 0.35)', lineHeight: 20,
  },
  success: {
    color: '#8CE2AF', backgroundColor: colors.successSoft, padding: 13, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(85, 196, 134, 0.34)', lineHeight: 20,
  },
  empty: { paddingVertical: 44, paddingHorizontal: 24, alignItems: 'center', gap: 10 },
  badge: {
    alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8,
    backgroundColor: colors.primarySoft, color: '#B8D2FF', overflow: 'hidden', fontSize: 11,
    fontWeight: '800', borderWidth: 1, borderColor: 'rgba(117, 167, 248, 0.28)',
  },
}) as Record<string, any>;

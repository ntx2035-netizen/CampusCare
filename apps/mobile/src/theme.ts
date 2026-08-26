import { StyleSheet } from 'react-native';

export const colors = { ink: '#F8FAFC', muted: '#94A3B8', bg: '#070B14', card: '#111827', teal: '#22D3EE', tealDark: '#0891B2', blue: '#8B5CF6', border: 'rgba(148, 163, 184, 0.16)', danger: '#EF4444', warning: '#F59E0B', success: '#22C55E' };

export const common = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg }, content: { padding: 18, gap: 14 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, gap: 10 },
  h1: { fontSize: 27, lineHeight: 33, fontWeight: '800', color: colors.ink }, h2: { fontSize: 17, fontWeight: '800', color: colors.ink },
  body: { color: colors.ink, lineHeight: 21 }, muted: { color: colors.muted, lineHeight: 20 },
  label: { color: '#94A3B8', fontWeight: '700', fontSize: 12, marginBottom: 6 },
  input: { backgroundColor: '#0c1220', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.2)', borderRadius: 11, paddingHorizontal: 13, paddingVertical: 12, color: colors.ink },
  button: { minHeight: 47, borderRadius: 11, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonText: { color: '#070B14', fontWeight: '800' }, secondaryButton: { minHeight: 45, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  secondaryText: { color: colors.ink, fontWeight: '700' }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  error: { color: '#F87171', backgroundColor: 'rgba(239, 68, 68, 0.12)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.25)' }, success: { color: '#4ADE80', backgroundColor: 'rgba(34, 197, 94, 0.12)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.25)' },
  empty: { padding: 35, alignItems: 'center', gap: 8 }, badge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(34, 211, 238, 0.12)', color: '#38BDF8', overflow: 'hidden', fontSize: 11, fontWeight: '800', borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.25)' },
});


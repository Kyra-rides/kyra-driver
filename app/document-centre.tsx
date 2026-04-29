import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

type Status = 'done' | 'next' | 'locked';

const ITEMS: Array<{
  id: string;
  title: string;
  hint: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  status: Status;
}> = [
  {
    id: 'vehicle',
    title: 'Vehicle',
    hint: 'Auto-rickshaw selected',
    icon: 'electric-rickshaw',
    status: 'done',
  },
  {
    id: 'dl',
    title: 'Driving License',
    hint: 'Front + back uploaded',
    icon: 'badge',
    status: 'done',
  },
  {
    id: 'selfie',
    title: 'Live selfie',
    hint: 'Captured — matched to Aadhaar photo',
    icon: 'face',
    status: 'done',
  },
  {
    id: 'aadhaar',
    title: 'Aadhaar',
    hint: 'Verified via DigiLocker',
    icon: 'verified-user',
    status: 'done',
  },
  {
    id: 'rc',
    title: 'Vehicle RC',
    hint: 'Uploaded — registration confirmed',
    icon: 'description',
    status: 'done',
  },
  {
    id: 'psv',
    title: 'PSV badge',
    hint: 'Optional for auto — skipped',
    icon: 'card-membership',
    status: 'done',
  },
  {
    id: 'training',
    title: 'Kyra training certificate',
    hint: 'Course completed — passed',
    icon: 'school',
    status: 'done',
  },
  {
    id: 'perms',
    title: 'Permissions',
    hint: 'Location, notifications, camera granted',
    icon: 'tune',
    status: 'done',
  },
];

export default function DocumentCentreScreen() {
  const total = ITEMS.length;
  const done = ITEMS.filter((i) => i.status === 'done').length;
  const pct = Math.round((done / total) * 100);

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Document Centre" />

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.banner}>
          <View style={styles.bannerText}>
            <ThemedText type="defaultSemiBold" style={styles.bannerTitle}>
              Complete your verification
            </ThemedText>
            <ThemedText style={styles.bannerSub}>
              {done} of {total} steps done — {pct}%
            </ThemedText>
          </View>
          <View style={styles.progressOuter}>
            <View style={[styles.progressInner, { width: `${pct}%` }]} />
          </View>
        </View>

        <View style={styles.empower}>
          <MaterialIcons name="favorite" size={16} color={Brand.gold} />
          <ThemedText style={styles.empowerText}>
            Empower Women cohort — flagged in your driver record. Kyra prioritises matching
            and incentives for new women drivers.
          </ThemedText>
        </View>

        <View style={styles.list}>
          {ITEMS.map((item) => (
            <Row key={item.id} {...item} />
          ))}
        </View>

        <BrandButton
          title="Go online"
          disabled={done < total}
          onPress={() => router.push('/online')}
          style={styles.cta}
        />
      </ScrollView>
    </ThemedView>
  );
}

function Row({
  title,
  hint,
  icon,
  status,
}: {
  title: string;
  hint: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  status: Status;
}) {
  const isDone = status === 'done';
  const isLocked = status === 'locked';
  const isNext = status === 'next';

  return (
    <Pressable
      disabled={isLocked}
      style={[
        styles.row,
        isNext && styles.rowNext,
        isLocked && styles.rowLocked,
      ]}
    >
      <View
        style={[
          styles.rowIcon,
          isDone && styles.rowIconDone,
          isNext && styles.rowIconNext,
        ]}
      >
        <MaterialIcons
          name={icon}
          size={22}
          color={isDone ? '#5BD2A2' : isNext ? Brand.burgundy : Brand.beigeMuted}
        />
      </View>
      <View style={styles.rowText}>
        <ThemedText
          type="defaultSemiBold"
          style={[styles.rowTitle, isLocked && styles.rowTitleLocked]}
        >
          {title}
        </ThemedText>
        <ThemedText style={styles.rowHint}>{hint}</ThemedText>
      </View>
      {isDone ? (
        <MaterialIcons name="check-circle" size={20} color="#5BD2A2" />
      ) : isLocked ? (
        <MaterialIcons name="lock-outline" size={18} color={Brand.beigeMuted} />
      ) : (
        <MaterialIcons name="chevron-right" size={22} color={Brand.beige} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, gap: 14 },
  banner: {
    backgroundColor: Brand.burgundyLight,
    borderRadius: Brand.radius,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Brand.gold,
  },
  bannerText: { gap: 4 },
  bannerTitle: { color: Brand.beige, fontSize: 17 },
  bannerSub: { color: Brand.beigeMuted, fontSize: 13 },
  progressOuter: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Brand.burgundyDark,
    overflow: 'hidden',
  },
  progressInner: {
    height: '100%',
    backgroundColor: Brand.gold,
  },
  empower: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyDark,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.burgundyLight,
  },
  empowerText: { flex: 1, color: Brand.beigeMuted, fontSize: 12, lineHeight: 17 },
  list: { gap: 8, marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Brand.burgundyLight,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
  },
  rowNext: {
    borderColor: Brand.beige,
    backgroundColor: Brand.burgundyDark,
  },
  rowLocked: { opacity: 0.55 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.burgundyDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDone: { backgroundColor: '#1F3A2D' },
  rowIconNext: { backgroundColor: Brand.beige },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: Brand.beige, fontSize: 15 },
  rowTitleLocked: { color: Brand.beigeMuted },
  rowHint: { color: Brand.beigeMuted, fontSize: 12, lineHeight: 17 },
  cta: { marginTop: 16, alignSelf: 'stretch' },
});

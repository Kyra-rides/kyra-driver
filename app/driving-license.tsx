import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

export default function DrivingLicenseScreen() {
  const [front, setFront] = useState(false);
  const [back, setBack] = useState(false);
  const ready = front && back;

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Driving License" />

      <ScrollView contentContainerStyle={styles.body}>
        <ThemedText type="title" style={styles.heading}>
          Upload your DL
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Auto and bike-taxi both need a valid commercial DL (with PSV badge for bike-taxi).
          We&apos;ll OCR the details and you can correct anything that&apos;s off.
        </ThemedText>

        <UploadCard
          label="Front side"
          hint="Make sure your name and DL number are readable."
          done={front}
          onPress={() => setFront(true)}
        />
        <UploadCard
          label="Back side"
          hint="Upload even if it looks blank — RTO endorsements live there."
          done={back}
          onPress={() => setBack(true)}
        />

        <View style={styles.tips}>
          <View style={styles.tipsHead}>
            <MaterialIcons name="lightbulb-outline" size={16} color={Brand.gold} />
            <ThemedText style={styles.tipsHeadText}>Photo tips</ThemedText>
          </View>
          <Tip text="Hold your phone flat above the DL — no angle." />
          <Tip text="Use natural light, no flash glare." />
          <Tip text="Crop tight to the card edges." />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <BrandButton
          title="Submit"
          disabled={!ready}
          style={styles.cta}
          onPress={() => router.push('/document-centre')}
        />
      </View>
    </ThemedView>
  );
}

function UploadCard({
  label,
  hint,
  done,
  onPress,
}: {
  label: string;
  hint: string;
  done: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.upload, done && styles.uploadDone]}>
      <View style={styles.uploadIcon}>
        <MaterialIcons
          name={done ? 'check-circle' : 'add-photo-alternate'}
          size={28}
          color={done ? '#5BD2A2' : Brand.beige}
        />
      </View>
      <View style={styles.uploadText}>
        <ThemedText type="defaultSemiBold" style={styles.uploadLabel}>
          {label}
        </ThemedText>
        <ThemedText style={styles.uploadHint}>
          {done ? 'Uploaded' : hint}
        </ThemedText>
      </View>
      <MaterialIcons
        name={done ? 'check' : 'chevron-right'}
        size={22}
        color={Brand.beigeMuted}
      />
    </Pressable>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <View style={styles.tipRow}>
      <View style={styles.tipDot} />
      <ThemedText style={styles.tipText}>{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, gap: 14 },
  heading: { fontSize: 26, lineHeight: 32 },
  subtitle: {
    color: Brand.beigeMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  upload: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    marginTop: 4,
  },
  uploadDone: {
    borderStyle: 'solid',
    borderColor: '#5BD2A2',
  },
  uploadIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Brand.burgundyDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: { flex: 1, gap: 2 },
  uploadLabel: { color: Brand.beige, fontSize: 16 },
  uploadHint: { color: Brand.beigeMuted, fontSize: 12, lineHeight: 17 },
  tips: {
    padding: 14,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyDark,
    gap: 8,
    marginTop: 8,
  },
  tipsHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipsHeadText: { color: Brand.gold, fontSize: 13, fontWeight: '600' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Brand.beigeMuted,
    marginTop: 8,
  },
  tipText: { color: Brand.beigeMuted, fontSize: 13, lineHeight: 18, flex: 1 },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.burgundyLight,
  },
  cta: { width: '100%' },
});

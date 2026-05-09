/**
 * Document Centre — live KYC status for the signed-in driver.
 *
 * Reads kyra.kyc_documents + kyra.drivers + kyra.vehicles to render one tile
 * per required doc plus the vehicle row. Each tile shows: not-uploaded /
 * pending review / approved / rejected (with reason). Tap a tile to upload
 * (or re-upload after rejection).
 *
 * Once all 6 required docs are approved AND a vehicle is registered, the
 * approve API in kyra-admin flips drivers.status to 'approved' and the
 * "Go online" CTA unlocks.
 */

import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DOC_LABELS,
  REQUIRED_DRIVER_DOCS,
  currentUserId,
  fetchKycSnapshot,
  type KycSnapshot,
} from '@/services/kyc';
import { supabase } from '@/services/supabase';
import type { KycDocType } from '@/types/database';

const PERMISSIONS_SHOWN_KEY = 'kyra_permissions_shown';

type RowStatus = 'not_uploaded' | 'pending' | 'approved' | 'rejected';

interface DocRow {
  id: string;
  href: string;
  title: string;
  hint: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  status: RowStatus;
  rejectionReason: string | null;
}

const DOC_ICONS: Record<KycDocType, keyof typeof MaterialIcons.glyphMap> = {
  aadhaar_front:      'verified-user',
  aadhaar_back:       'verified-user',
  license_front:      'badge',
  license_back:       'badge',
  rc:                 'description',
  driver_selfie:      'face',
  psv_license:        'card-membership',
  insurance:          'security',
  pan:                'credit-card',
  vehicle_photo:      'two-wheeler',
  rider_woman_selfie: 'face',
};

export default function DocumentCentreScreen() {
  const { t } = useTranslation();
  const [snap, setSnap]     = useState<KycSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchKycSnapshot();
      setSnap(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Live-update the screen the moment the admin flips drivers.status or
  // approves any kyc_documents row. Without this the user has to pull-refresh.
  useEffect(() => {
    let cancelled = false;
    let unsubDrivers: (() => void) | null = null;
    let unsubDocs:    (() => void) | null = null;
    let pollTimer:    ReturnType<typeof setInterval> | null = null;

    void (async () => {
      try {
        const id = await currentUserId();
        if (cancelled) return;

        const driversChan = supabase
          .channel(`driver-${id}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'kyra', table: 'drivers', filter: `profile_id=eq.${id}` },
            () => { void load(); },
          )
          .subscribe();
        unsubDrivers = () => { void supabase.removeChannel(driversChan); };

        const docsChan = supabase
          .channel(`kyc-${id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'kyra', table: 'kyc_documents', filter: `owner_profile_id=eq.${id}` },
            () => { void load(); },
          )
          .subscribe();
        unsubDocs = () => { void supabase.removeChannel(docsChan); };

        // Realtime fallback: poll every 8s in case the WS drops.
        pollTimer = setInterval(() => { void load(); }, 8000);
      } catch {
        // No session yet — let useFocusEffect handle re-load on focus.
      }
    })();

    return () => {
      cancelled = true;
      if (pollTimer)    clearInterval(pollTimer);
      if (unsubDrivers) unsubDrivers();
      if (unsubDocs)    unsubDocs();
    };
  }, [load]);

  // Auto-redirect when admin approves the driver.
  // First approval → permissions screen; returning driver → online directly.
  useEffect(() => {
    if (snap?.driver.status !== 'approved') return;
    void (async () => {
      const shown = await AsyncStorage.getItem(PERMISSIONS_SHOWN_KEY);
      router.replace(shown ? '/online' : '/permissions');
    })();
  }, [snap?.driver.status]);

  const docRows: DocRow[] = (snap ? REQUIRED_DRIVER_DOCS : []).map((dt) => ({
    id:   dt,
    href: `/upload-doc/${dt}`,
    title: DOC_LABELS[dt].title,
    hint:  DOC_LABELS[dt].hint,
    icon:  DOC_ICONS[dt],
    status: snap!.docs[dt].status === 'not_uploaded' ? 'not_uploaded' : (snap!.docs[dt].status as RowStatus),
    rejectionReason: snap!.docs[dt].rejection_reason,
  }));

  const vehicleRow: DocRow | null = snap
    ? {
        id:    'vehicle',
        href:  '/vehicle',
        title: 'Vehicle',
        hint:  snap.vehicle
          ? `${snap.vehicle.make_model} · ${snap.vehicle.registration_number}`
          : 'Add your vehicle (RC number, type)',
        icon:  'two-wheeler',
        status: snap.vehicle ? 'approved' : 'not_uploaded',
        rejectionReason: null,
      }
    : null;

  const allRows: DocRow[] = vehicleRow ? [vehicleRow, ...docRows] : docRows;
  const approved = allRows.filter((r) => r.status === 'approved').length;
  const total    = allRows.length || 1;
  const pct      = Math.round((approved / total) * 100);

  const driverApproved = snap?.driver.status === 'approved';

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={t('kyc.title')} />

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Brand.beige} />}
      >
        <View style={styles.banner}>
          <View style={styles.bannerText}>
            <ThemedText type="defaultSemiBold" style={styles.bannerTitle}>
              {driverApproved ? t('kyc.banner_approved') : t('kyc.banner_pending')}
            </ThemedText>
            <ThemedText style={styles.bannerSub}>
              {t('kyc.progress', { approved, total, pct })}
            </ThemedText>
          </View>
          <View style={styles.progressOuter}>
            <View style={[styles.progressInner, { width: `${pct}%` }]} />
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : null}

        <View style={styles.list}>
          {allRows.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </View>

        {driverApproved ? (
          <BrandButton
            title={t('kyc.go_online')}
            onPress={() => {
              void (async () => {
                const shown = await AsyncStorage.getItem(PERMISSIONS_SHOWN_KEY);
                router.replace(shown ? '/online' : '/permissions');
              })();
            }}
            style={styles.cta}
          />
        ) : (
          <View style={styles.waitingBox}>
            <MaterialIcons name="hourglass-bottom" size={20} color={Brand.gold} />
            <ThemedText style={styles.waitingText}>
              Waiting for admin approval
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function Row({ row }: { row: DocRow }) {
  const { t } = useTranslation();
  const onPress = () => router.push(row.href as Parameters<typeof router.push>[0]);
  const tone = STATUS_TONE[row.status];

  return (
    <Pressable onPress={onPress} style={[styles.row, tone.row]}>
      <View style={[styles.rowIcon, tone.iconBg]}>
        <MaterialIcons name={row.icon} size={22} color={tone.iconColor} />
      </View>

      <View style={styles.rowText}>
        <ThemedText type="defaultSemiBold" style={styles.rowTitle}>
          {row.title}
        </ThemedText>
        <ThemedText style={styles.rowHint}>{row.hint}</ThemedText>
        {row.status === 'rejected' ? (
          <View style={styles.rejectBlock}>
            <ThemedText style={styles.rowRejection}>
              ✗ {t('document_centre.rejected_label')}
              {row.rejectionReason
                ? ` — ${t('document_centre.reject_reason_prefix')} ${row.rejectionReason}`
                : ''}
            </ThemedText>
            <ThemedText style={styles.reuploadHint}>{t('document_centre.reupload')}</ThemedText>
          </View>
        ) : null}
      </View>

      {row.status === 'approved' || row.status === 'pending' ? (
        <MaterialIcons name="check-circle" size={20} color="#5BD2A2" />
      ) : row.status === 'rejected' ? (
        <MaterialIcons name="error-outline" size={20} color="#E07B7B" />
      ) : (
        <MaterialIcons name="chevron-right" size={22} color={Brand.beige} />
      )}
    </Pressable>
  );
}

const STATUS_TONE: Record<RowStatus, { row: object; iconBg: object; iconColor: string }> = {
  not_uploaded: { row: {}, iconBg: { backgroundColor: Brand.burgundyDark }, iconColor: Brand.beigeMuted },
  pending:      { row: { borderColor: '#5BD2A2' }, iconBg: { backgroundColor: '#1F3A2D' }, iconColor: '#5BD2A2' },
  approved:     { row: { borderColor: '#5BD2A2' }, iconBg: { backgroundColor: '#1F3A2D' }, iconColor: '#5BD2A2' },
  rejected:     { row: { borderColor: '#E07B7B' }, iconBg: { backgroundColor: '#3a1c1c' }, iconColor: '#E07B7B' },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body:      { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, gap: 14 },
  banner: {
    backgroundColor: Brand.burgundyLight,
    borderRadius: Brand.radius,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Brand.gold,
  },
  bannerText:    { gap: 4 },
  bannerTitle:   { color: Brand.beige, fontSize: 17 },
  bannerSub:     { color: Brand.beigeMuted, fontSize: 13 },
  progressOuter: { height: 6, borderRadius: 3, backgroundColor: Brand.burgundyDark, overflow: 'hidden' },
  progressInner: { height: '100%', backgroundColor: Brand.gold },
  errorBox: {
    padding: 12,
    borderRadius: Brand.radius,
    backgroundColor: '#3a1c1c',
    borderWidth: 1,
    borderColor: '#E07B7B',
  },
  errorText: { color: '#E07B7B', fontSize: 13 },
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
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText:      { flex: 1, gap: 2 },
  rowTitle:     { color: Brand.beige, fontSize: 15 },
  rowHint:      { color: Brand.beigeMuted, fontSize: 12, lineHeight: 17 },
  rowPending:   { color: Brand.gold, fontSize: 11, marginTop: 2 },
  rejectBlock:  { marginTop: 4, gap: 2 },
  rowRejection: { color: '#E07B7B', fontSize: 11 },
  reuploadHint: { color: '#E07B7B', fontSize: 11, fontWeight: '600' },
  cta:          { marginTop: 16, alignSelf: 'stretch' },
  waitingBox: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Brand.radius,
    borderWidth: 1,
    borderColor: Brand.gold,
    backgroundColor: '#3a2e1a',
  },
  waitingText: { color: Brand.gold, fontSize: 15, fontWeight: '600' },
});

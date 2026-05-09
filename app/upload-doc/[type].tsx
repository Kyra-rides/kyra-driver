/**
 * Generic KYC document capture + upload screen.
 *
 * Path: /upload-doc/{doc_type}
 * Where doc_type is one of REQUIRED_DRIVER_DOCS (aadhaar_front, aadhaar_back,
 * license_front, license_back, rc, driver_selfie).
 *
 *   capture  — open camera, take photo, preview
 *   re-take  — discard, re-open camera
 *   submit   — upload to Supabase Storage + upsert kyc_documents row
 *   done     — pop back to /document-centre
 *
 * For the selfie (`driver_selfie`) we open the front camera; everything else
 * uses the rear camera.
 */

import { useRef, useState } from 'react';
import { Image, Modal, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { DOC_LABELS, REQUIRED_DRIVER_DOCS, uploadKycDoc } from '@/services/kyc';
import type { KycDocType } from '@/types/database';

function isRequiredDocType(s: string): s is KycDocType {
  return (REQUIRED_DRIVER_DOCS as readonly string[]).includes(s);
}

export default function UploadDocScreen() {
  const { t } = useTranslation();
  const { type } = useLocalSearchParams<{ type: string }>();
  const docType  = type && isRequiredDocType(type) ? type : null;

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [photoUri, setPhotoUri]   = useState<string | null>(null);
  const [busy, setBusy]           = useState<'capturing' | 'uploading' | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!docType) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader title={t('upload_doc.submit')} />
        <View style={styles.body}>
          <ThemedText style={styles.error}>{t('upload_doc.unknown_type', { type: String(type) })}</ThemedText>
          <BrandButton title={t('common.back')} onPress={() => router.back()} />
        </View>
      </ThemedView>
    );
  }

  const docTitle = t(`kyc.doc_${docType}` as const, { defaultValue: DOC_LABELS[docType].title });
  const docHint  = t(`kyc.hint_${docType}` as const, { defaultValue: DOC_LABELS[docType].hint });
  const isSelfie = docType === 'driver_selfie';
  const facing: CameraType = isSelfie ? 'front' : 'back';

  if (!permission) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader title={docTitle} />
        <View style={styles.body}>
          <ThemedText style={styles.subtitle}>{t('upload_doc.loading_camera')}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader title={docTitle} />
        <View style={styles.body}>
          <ThemedText type="title">{t('upload_doc.permission_title')}</ThemedText>
          <ThemedText style={styles.subtitle}>{t('upload_doc.permission_body')}</ThemedText>
          <BrandButton title={t('upload_doc.grant')} onPress={requestPermission} />
        </View>
      </ThemedView>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || busy) return;
    setBusy('capturing');
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: true,
      });
      if (!photo?.uri) throw new Error(t('upload_doc.could_not_capture'));
      setPhotoUri(photo.uri);
    } catch (err) {
      Alert.alert(t('upload_doc.could_not_capture'), err instanceof Error ? err.message : t('signup.try_again'));
    } finally {
      setBusy(null);
    }
  };

  const handleSubmit = async () => {
    if (!photoUri || busy) return;
    setBusy('uploading');
    try {
      await uploadKycDoc(docType, photoUri);
      setSubmitted(true);
    } catch (err) {
      Alert.alert(t('upload_doc.upload_failed'), err instanceof Error ? err.message : t('signup.try_again'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Modal visible={submitted} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.iconRing}>
              <ThemedText style={styles.tick}>✓</ThemedText>
            </View>
            <ThemedText type="title" style={styles.cardTitle}>{t('upload_doc.submitted_title')}</ThemedText>
            <ThemedText style={styles.cardBody}>{t('upload_doc.submitted_body', { title: docTitle })}</ThemedText>
            <BrandButton
              title={t('upload_doc.continue')}
              onPress={() => {
                setSubmitted(false);
                router.back();
              }}
            />
          </View>
        </View>
      </Modal>

      <ScreenHeader title={docTitle} />
      <View style={styles.body}>
        <ThemedText style={styles.subtitle}>{docHint}</ThemedText>

        <View style={[styles.frame, isSelfie && styles.frameRound]}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <CameraView ref={cameraRef} facing={facing} style={styles.camera} />
          )}
        </View>

        {photoUri ? (
          <View style={styles.row}>
            <BrandButton
              title={t('upload_doc.retake')}
              onPress={() => setPhotoUri(null)}
              disabled={busy !== null}
              style={styles.btnHalf}
            />
            <BrandButton
              title={busy === 'uploading' ? t('upload_doc.uploading') : t('upload_doc.submit')}
              onPress={handleSubmit}
              disabled={busy !== null}
              style={styles.btnHalf}
            />
          </View>
        ) : (
          <BrandButton
            title={busy === 'capturing' ? t('upload_doc.capturing') : t('upload_doc.capture')}
            onPress={handleCapture}
            disabled={busy !== null}
          />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body:      { flex: 1, padding: 24, gap: 14, alignItems: 'center', justifyContent: 'center' },
  subtitle:  { color: Brand.beigeMuted, textAlign: 'center', paddingHorizontal: 8 },
  error:     { color: '#E07B7B', textAlign: 'center' },
  frame: {
    width: 320,
    height: 240,
    borderRadius: Brand.radius,
    overflow: 'hidden',
    backgroundColor: Brand.burgundyDark,
    borderWidth: 2,
    borderColor: Brand.gold,
  },
  frameRound: { width: 240, height: 240, borderRadius: 120 },
  camera:  { flex: 1 },
  preview: { width: '100%', height: '100%' },
  row:     { flexDirection: 'row', gap: 10, width: '100%' },
  btnHalf: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: Brand.burgundyLight,
    borderRadius: 16,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Brand.burgundyDark,
    borderWidth: 2,
    borderColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tick:      { color: Brand.gold, fontSize: 28, fontWeight: '700' },
  cardTitle: { textAlign: 'center', color: Brand.beige },
  cardBody:  { textAlign: 'center', color: Brand.beigeMuted, lineHeight: 22 },
});

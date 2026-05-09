/**
 * Vehicle registration. Driver enters:
 *   - vehicle type (auto / car / bike)
 *   - registration number (RTO format, e.g. KA01AB1234)
 *   - make + model (free text)
 *
 * On submit, upserts a row into kyra.vehicles via services/kyc.upsertVehicle().
 * Existing vehicle for this driver is deactivated; the new one becomes the
 * active vehicle (one active per driver enforced at DB level).
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { fetchKycSnapshot, isValidRegistration, upsertVehicle } from '@/services/kyc';
import type { VehicleType } from '@/types/database';

export default function VehicleScreen() {
  const { t } = useTranslation();
  const TYPES: Array<{ id: VehicleType; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = [
    { id: 'auto', label: t('driver_vehicle.auto'), icon: 'electric-rickshaw' },
    { id: 'car',  label: t('driver_vehicle.car'),  icon: 'directions-car' },
    { id: 'bike', label: t('driver_vehicle.bike'), icon: 'two-wheeler' },
  ];
  const [type, setType]               = useState<VehicleType>('auto');
  const [registration, setReg]        = useState('');
  const [makeModel, setMakeModel]     = useState('');
  const [busy, setBusy]               = useState(false);
  const [saved, setSaved]             = useState(false);

  // Pre-fill if a vehicle already exists.
  useEffect(() => {
    void (async () => {
      try {
        const snap = await fetchKycSnapshot();
        if (snap.vehicle) {
          setType(snap.vehicle.vehicle_type);
          setReg(snap.vehicle.registration_number);
          setMakeModel(snap.vehicle.make_model);
        }
      } catch {
        // Silent fail — show empty form, user can re-enter.
      }
    })();
  }, []);

  const regClean = registration.toUpperCase().replace(/\s|-/g, '');
  const valid = isValidRegistration(regClean) && makeModel.trim().length > 0;

  const onSubmit = async () => {
    Keyboard.dismiss();
    if (!valid) {
      Alert.alert(t('driver_vehicle.title'), t('driver_vehicle.reg_help'));
      return;
    }
    setBusy(true);
    try {
      await upsertVehicle({
        registration_number: regClean,
        vehicle_type:        type,
        make_model:          makeModel.trim(),
      });
      setSaved(true);
    } catch (err) {
      Alert.alert(t('driver_vehicle.could_not_save'), err instanceof Error ? err.message : t('signup.try_again'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ThemedView style={styles.container}>
        <Modal visible={saved} transparent animationType="fade" statusBarTranslucent>
          <View style={styles.overlay}>
            <View style={styles.card}>
              <View style={styles.iconRing}>
                <MaterialIcons name="check" size={28} color={Brand.gold} />
              </View>
              <ThemedText type="title" style={styles.cardTitle}>
                {t('driver_vehicle.saved', { defaultValue: 'Vehicle Saved!' })}
              </ThemedText>
              <ThemedText style={styles.cardBody}>
                {t('driver_vehicle.saved_body', {
                  defaultValue: 'Your vehicle details have been saved successfully.',
                })}
              </ThemedText>
              <BrandButton
                title={t('common.continue', { defaultValue: 'Continue' })}
                onPress={() => { setSaved(false); router.back(); }}
              />
            </View>
          </View>
        </Modal>

        <ScreenHeader title={t('driver_vehicle.title')} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <ThemedText type="defaultSemiBold" style={styles.section}>{t('driver_vehicle.type_label')}</ThemedText>
            <View style={styles.typeRow}>
              {TYPES.map((vt) => (
                <Pressable
                  key={vt.id}
                  onPress={() => setType(vt.id)}
                  style={[styles.typeChip, vt.id === type && styles.typeChipOn]}
                >
                  <MaterialIcons
                    name={vt.icon}
                    size={22}
                    color={vt.id === type ? Brand.burgundy : Brand.beige}
                  />
                  <ThemedText style={[styles.typeLabel, vt.id === type && styles.typeLabelOn]}>
                    {vt.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText type="defaultSemiBold" style={styles.section}>{t('driver_vehicle.reg_label')}</ThemedText>
            <TextInput
              style={styles.input}
              placeholder={t('driver_vehicle.reg_placeholder')}
              placeholderTextColor={Brand.beigeMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={11}
              value={registration}
              onChangeText={setReg}
            />
            <ThemedText style={styles.hint}>{t('driver_vehicle.reg_help')}</ThemedText>

            <ThemedText type="defaultSemiBold" style={styles.section}>{t('driver_vehicle.make_label')}</ThemedText>
            <TextInput
              style={styles.input}
              placeholder={t('driver_vehicle.make_placeholder')}
              placeholderTextColor={Brand.beigeMuted}
              value={makeModel}
              onChangeText={setMakeModel}
            />

            <BrandButton
              title={busy ? t('driver_vehicle.saving') : t('driver_vehicle.save')}
              onPress={onSubmit}
              disabled={!valid || busy}
              style={styles.cta}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </ThemedView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  flex:      { flex: 1 },
  body:      { padding: 24, gap: 8, flexGrow: 1, paddingBottom: 32 },
  section:   { color: Brand.beige, fontSize: 14, marginTop: 12 },
  typeRow:   { flexDirection: 'row', gap: 8, marginTop: 4 },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
  },
  typeChipOn:   { backgroundColor: Brand.beige, borderColor: Brand.beige },
  typeLabel:    { color: Brand.beige, fontSize: 13 },
  typeLabelOn:  { color: Brand.burgundy, fontWeight: '600' },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    padding: 14,
    fontSize: 16,
    backgroundColor: Brand.burgundyLight,
    color: Brand.beige,
    letterSpacing: 1,
  },
  hint: { color: Brand.beigeMuted, fontSize: 12 },
  cta:  { marginTop: 24, alignSelf: 'stretch' },
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
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Brand.burgundyDark,
    borderWidth: 2, borderColor: Brand.gold,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  cardTitle: { textAlign: 'center', color: Brand.beige },
  cardBody:  { textAlign: 'center', color: Brand.beigeMuted, lineHeight: 22 },
});

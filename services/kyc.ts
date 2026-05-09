/**
 * KYC + vehicle data layer for the driver app. All operations are scoped to
 * the currently signed-in driver; if no session, every call throws
 * `not_authenticated`.
 *
 * Single source of truth for the required-doc list — the admin KYC approve
 * route in kyra-admin uses the same set, so a driver becomes `approved`
 * the instant *all* of these are admin-approved.
 */

import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from './supabase';
import type {
  Driver,
  KycDocType,
  KycStatus,
  KycDocument,
  Vehicle,
  VehicleType,
} from '@/types/database';

export const REQUIRED_DRIVER_DOCS: ReadonlyArray<KycDocType> = [
  'aadhaar_front',
  'aadhaar_back',
  'license_front',
  'license_back',
  'rc',
  'driver_selfie',
] as const;

export const DOC_LABELS: Record<KycDocType, { title: string; hint: string }> = {
  aadhaar_front:      { title: 'Aadhaar (front)',      hint: 'Photo / address side' },
  aadhaar_back:       { title: 'Aadhaar (back)',       hint: 'Address-detail side' },
  license_front:      { title: 'Driving License (front)', hint: 'Front of your DL card' },
  license_back:       { title: 'Driving License (back)',  hint: 'Back of your DL card' },
  rc:                 { title: 'Vehicle RC',           hint: 'Registration certificate' },
  driver_selfie:      { title: 'Live selfie',          hint: 'Clear face photo' },
  psv_license:        { title: 'PSV badge',            hint: 'Optional — required in some states' },
  insurance:          { title: 'Vehicle insurance',    hint: 'Current insurance certificate' },
  pan:                { title: 'PAN card',             hint: 'For payouts and tax records' },
  vehicle_photo:      { title: 'Vehicle photo',        hint: 'Front view, plate visible' },
  rider_woman_selfie: { title: 'Selfie',               hint: '(Rider — not used by drivers)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Identity
// ─────────────────────────────────────────────────────────────────────────────

export async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.user.id) throw new Error('not_authenticated');
  return data.session.user.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read state
// ─────────────────────────────────────────────────────────────────────────────

export interface KycSnapshot {
  driver: Pick<Driver, 'status' | 'rejection_reason'>;
  docs:   Record<KycDocType, { status: KycStatus | 'not_uploaded'; rejection_reason: string | null }>;
  vehicle: Vehicle | null;
}

export async function fetchKycSnapshot(): Promise<KycSnapshot> {
  const id = await currentUserId();

  const [driverRes, docsRes, vehicleRes] = await Promise.all([
    supabase
      .from('drivers')
      .select('status, rejection_reason')
      .eq('profile_id', id)
      .maybeSingle(),
    supabase
      .from('kyc_documents')
      .select('doc_type, status, rejection_reason')
      .eq('owner_profile_id', id),
    supabase
      .from('vehicles')
      .select('*')
      .eq('driver_id', id)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  if (driverRes.error)  throw driverRes.error;
  if (docsRes.error)    throw docsRes.error;
  if (vehicleRes.error) throw vehicleRes.error;

  const docMap = {} as KycSnapshot['docs'];
  for (const t of Object.keys(DOC_LABELS) as KycDocType[]) {
    docMap[t] = { status: 'not_uploaded', rejection_reason: null };
  }
  for (const d of (docsRes.data ?? []) as Pick<KycDocument, 'doc_type' | 'status' | 'rejection_reason'>[]) {
    docMap[d.doc_type] = {
      status: d.status,
      rejection_reason: d.rejection_reason,
    };
  }

  return {
    driver: {
      status:           driverRes.data?.status ?? 'pending',
      rejection_reason: driverRes.data?.rejection_reason ?? null,
    },
    docs:    docMap,
    vehicle: vehicleRes.data ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload a captured photo as a KYC doc
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadKycDoc(
  docType: KycDocType,
  fileUri: string,
): Promise<{ docId: string; storagePath: string }> {
  const userId = await currentUserId();

  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: 'base64' as const,
  });
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const isSelfie = docType === 'driver_selfie' || docType === 'rider_woman_selfie';
  const bucket   = isSelfie ? 'selfies' : 'kyc-docs';
  const path     = `${userId}/${docType}.jpg`;

  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
  if (upErr) throw upErr;

  // Upsert the document row (if a previous version was rejected, this resets
  // status to 'pending' and clears rejection_reason).
  const { data: doc, error: docErr } = await supabase
    .from('kyc_documents')
    .upsert(
      {
        owner_profile_id: userId,
        doc_type:         docType,
        storage_path:     path,
        status:           'pending',
        reviewed_by:      null,
        reviewed_at:      null,
        rejection_reason: null,
      },
      { onConflict: 'owner_profile_id,doc_type' },
    )
    .select('id')
    .single();
  if (docErr) throw docErr;

  return { docId: doc.id as string, storagePath: path };
}

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle
// ─────────────────────────────────────────────────────────────────────────────

const RC_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/;
export function isValidRegistration(s: string): boolean {
  return RC_REGEX.test(s.toUpperCase().replace(/\s|-/g, ''));
}

export async function upsertVehicle(input: {
  registration_number: string;
  vehicle_type: VehicleType;
  make_model: string;
}): Promise<Vehicle> {
  const id = await currentUserId();
  const reg = input.registration_number.toUpperCase().replace(/\s|-/g, '');

  if (!isValidRegistration(reg)) {
    throw new Error(
      'Invalid registration number. Use the format STATE-RTO-LETTERS-NUMBERS (e.g. KA01AB1234).',
    );
  }

  // Deactivate any existing active vehicle for this driver, then insert/upsert
  // the new one as active.
  await supabase.from('vehicles').update({ is_active: false }).eq('driver_id', id).eq('is_active', true);

  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      driver_id:           id,
      registration_number: reg,
      vehicle_type:        input.vehicle_type,
      make_model:          input.make_model,
      is_active:           true,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Vehicle;
}

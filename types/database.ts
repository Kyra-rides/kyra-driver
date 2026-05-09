// Kyra database types — manually authored to match the migrations in
// supabase/migrations/. After running `supabase gen types typescript --linked`
// this file should be regenerated and committed; manual authorship is a stop-gap
// so the apps compile before the database is reachable.

export type UserRole = 'rider' | 'driver' | 'admin';

export type DriverStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type RiderStatus  = 'pending' | 'approved' | 'rejected' | 'suspended';

export type KycDocType =
  | 'aadhaar_front'
  | 'aadhaar_back'
  | 'license_front'
  | 'license_back'
  | 'psv_license'
  | 'rc'
  | 'insurance'
  | 'pan'
  | 'driver_selfie'
  | 'rider_woman_selfie'
  | 'vehicle_photo';

export type KycStatus = 'pending' | 'approved' | 'rejected';

export type VehicleType = 'auto' | 'car' | 'bike';

export type RideStatus =
  | 'requested'
  | 'matched'
  | 'driver_arriving'
  | 'pickup_verified'
  | 'in_trip'
  | 'completed'
  | 'cancelled_by_rider'
  | 'cancelled_by_driver'
  | 'cancelled_gender_check_failed'
  | 'cancelled_no_driver';

export type GenderCheckResponse = 'yes' | 'no';
export type DeviationResponse   = 'pending' | 'all_good' | 'unsafe';
export type SosStatus           = 'open' | 'acknowledged' | 'resolved' | 'false_alarm';
export type GoalType            = 'first_5_rides';
export type GoalStatus          = 'active' | 'completed' | 'paid';

export type LanguagePref = 'en' | 'hi' | 'kn';

export interface Profile {
  id:             string;
  role:           UserRole;
  phone:          string | null;
  email:          string | null;
  first_name:     string;
  last_name:      string;
  language_pref:  LanguagePref;
  created_at:     string;
  updated_at:     string;
}

export interface Rider {
  profile_id:           string;
  status:               RiderStatus;
  woman_selfie_doc_id:  string | null;
  woman_verified:       boolean;
  woman_verified_by:    string | null;
  woman_verified_at:    string | null;
  emergency_contacts:   Array<{ name: string; phone: string }>;
  suspended_reason:     string | null;
  created_at:           string;
  updated_at:           string;
}

export interface Driver {
  profile_id:             string;
  status:                 DriverStatus;
  approved_by:            string | null;
  approved_at:            string | null;
  rejection_reason:       string | null;
  suspended_reason:       string | null;
  is_online:              boolean;
  is_on_trip:             boolean;
  current_location:       { type: 'Point'; coordinates: [number, number] } | null;
  last_location_at:       string | null;
  current_heading_deg:    number | null;
  bank_upi_id:            string | null;
  total_completed_rides:  number;
  lifetime_earnings_inr:  number;
  created_at:             string;
  updated_at:             string;
}

export interface AdminUser {
  profile_id:    string;
  totp_enrolled: boolean;
  last_login_at: string | null;
  last_login_ip: string | null;
  is_active:     boolean;
  created_at:    string;
  updated_at:    string;
}

export interface KycDocument {
  id:                string;
  owner_profile_id:  string;
  doc_type:          KycDocType;
  storage_path:      string;
  status:            KycStatus;
  reviewed_by:       string | null;
  reviewed_at:       string | null;
  rejection_reason:  string | null;
  uploaded_at:       string;
  updated_at:        string;
}

export interface Vehicle {
  id:                  string;
  driver_id:           string;
  vehicle_type:        VehicleType;
  make_model:          string;
  registration_number: string;
  rc_doc_id:           string | null;
  insurance_doc_id:    string | null;
  vehicle_photo_id:    string | null;
  is_active:           boolean;
  created_at:          string;
  updated_at:          string;
}

export interface Ride {
  id:                       string;
  rider_id:                 string;
  driver_id:                string | null;
  vehicle_id:               string | null;
  status:                   RideStatus;
  pickup_location:          { type: 'Point'; coordinates: [number, number] };
  pickup_address:           string;
  drop_location:            { type: 'Point'; coordinates: [number, number] };
  drop_address:             string;
  planned_polyline:         string | null;
  planned_distance_m:       number | null;
  planned_duration_s:       number | null;
  fare_inr:                 number;
  fare_inr_final:           number | null;
  ride_otp:                 string;
  driver_woman_check:       GenderCheckResponse | null;
  driver_woman_check_at:    string | null;
  rider_driver_check:       GenderCheckResponse | null;
  rider_driver_check_at:    string | null;
  cancelled_reason:         string | null;
  requested_at:             string;
  matched_at:               string | null;
  driver_arriving_at:       string | null;
  pickup_verified_at:       string | null;
  trip_started_at:          string | null;
  completed_at:             string | null;
  cancelled_at:             string | null;
}

export interface RideLocation {
  id:           number;
  ride_id:      string;
  driver_id:    string;
  location:     { type: 'Point'; coordinates: [number, number] };
  speed_kmh:    number | null;
  heading_deg:  number | null;
  accuracy_m:   number | null;
  recorded_at:  string;
}

export interface DeviationEvent {
  id:                    string;
  ride_id:               string;
  detected_at:           string;
  driver_location:       { type: 'Point'; coordinates: [number, number] };
  distance_off_route_m:  number;
  rider_response:        DeviationResponse;
  rider_responded_at:    string | null;
  sos_event_id:          string | null;
}

export interface Rating {
  id:          string;
  ride_id:     string;
  rater_id:    string;
  ratee_id:    string;
  stars:       number;
  review:      string | null;
  created_at:  string;
  updated_at:  string;
}

export interface SosEvent {
  id:                 string;
  ride_id:            string | null;
  triggered_by:       string;
  triggered_at:       string;
  trigger_location:   { type: 'Point'; coordinates: [number, number] };
  status:             SosStatus;
  acknowledged_by:    string | null;
  acknowledged_at:    string | null;
  resolved_by:        string | null;
  resolved_at:        string | null;
  resolution_notes:   string | null;
}

export interface Goal {
  id:              string;
  driver_id:       string;
  goal_type:       GoalType;
  target_count:    number;
  progress_count:  number;
  bonus_inr:       number;
  status:          GoalStatus;
  completed_at:    string | null;
  paid_at:         string | null;
  paid_by:         string | null;
  created_at:      string;
  updated_at:      string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Database type wrapped for supabase-js generics. Mirror what
// `supabase gen types typescript` produces so swapping later is painless.
// ─────────────────────────────────────────────────────────────────────────────
export interface Database {
  kyra: {
    Tables: {
      profiles:         { Row: Profile;        Insert: Partial<Profile>;        Update: Partial<Profile> };
      riders:           { Row: Rider;          Insert: Partial<Rider>;          Update: Partial<Rider> };
      drivers:          { Row: Driver;         Insert: Partial<Driver>;         Update: Partial<Driver> };
      admin_users:      { Row: AdminUser;      Insert: Partial<AdminUser>;      Update: Partial<AdminUser> };
      kyc_documents:    { Row: KycDocument;    Insert: Partial<KycDocument>;    Update: Partial<KycDocument> };
      vehicles:         { Row: Vehicle;        Insert: Partial<Vehicle>;        Update: Partial<Vehicle> };
      rides:            { Row: Ride;           Insert: Partial<Ride>;           Update: Partial<Ride> };
      ride_locations:   { Row: RideLocation;   Insert: Partial<RideLocation>;   Update: Partial<RideLocation> };
      deviation_events: { Row: DeviationEvent; Insert: Partial<DeviationEvent>; Update: Partial<DeviationEvent> };
      ratings:          { Row: Rating;         Insert: Partial<Rating>;         Update: Partial<Rating> };
      sos_events:       { Row: SosEvent;       Insert: Partial<SosEvent>;       Update: Partial<SosEvent> };
      goals:            { Row: Goal;           Insert: Partial<Goal>;           Update: Partial<Goal> };
    };
    Functions: {
      driver_heartbeat: {
        Args: { p_lat: number; p_lng: number; p_heading_deg?: number | null };
        Returns: void;
      };
      driver_go_offline: { Args: Record<string, never>; Returns: void };
      submit_pickup_gender_check: {
        Args: { p_ride_id: string; p_answer: GenderCheckResponse };
        Returns: Ride;
      };
      trigger_sos: {
        Args: { p_lat: number; p_lng: number; p_ride_id?: string | null };
        Returns: SosEvent;
      };
      find_nearest_drivers: {
        Args: { p_pickup: unknown; p_radius_m?: number; p_limit?: number };
        Returns: Array<{ driver_id: string; distance_m: number; vehicle_type: VehicleType }>;
      };
    };
  };
}

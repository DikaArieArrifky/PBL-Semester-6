// ─── Auth & User ─────────────────────────────────────────────────────────────
// Schema: profiles(id, email, name, role, avatar_url, cross_id, created_at, updated_at)
// NOTE: tidak ada kolom 'username'

export type UserRole = 'Admin' | 'admin' | 'Staff' | 'staff' | 'super_admin';

export interface Profile {
  id: string;
  email: string;
  username?: string | null;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  cross_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Core Domain ─────────────────────────────────────────────────────────────
// Schema: crossings(cross_id, code, name, location, latitude, longitude, status, created_at)

export interface Crossing {
  cross_id: string;
  code: string;
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'active' | 'maintenance' | 'inactive';
  created_at: string;
}

// Schema: devices(device_id, cross_id, mqtt_client_id, type, mac_address, status,
//                 ip_address, last_seen_at, registered_at)
// NOTE: tidak ada kolom 'model', 'firmware_version'

export interface Device {
  device_id: string;
  cross_id: string;
  mqtt_client_id: string;
  type: string;
  mac_address: string | null;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  ip_address: string | null;
  last_seen_at: string | null;
  registered_at: string;
}

// Schema: device_components(component_id, device_id, component_code, component_type,
//                            component_name, pin_number, status, last_reading_at, created_at)

export type ComponentStatus = 'healthy' | 'warning' | 'offline' | 'faulty';

export interface DeviceComponent {
  component_id: string;
  device_id: string;
  component_code: string; // 'IR_A' | 'IR_B' | 'ULTRASONIC'
  component_type: string; // 'IR_SENSOR' | 'ULTRASONIC_SENSOR'
  component_name: string;
  pin_number: number | null;
  status: ComponentStatus;
  last_reading_at: string | null;
  created_at: string;
}

// Schema: latest_component_state(component_id, last_bool_value, last_numeric_value,
//                                 last_text_value, updated_at)

export interface LatestComponentState {
  component_id: string;
  last_bool_value: boolean | null;
  last_numeric_value: number | null;
  last_text_value: string | null;
  updated_at: string;
}

// ─── Gate Events ─────────────────────────────────────────────────────────────
// Schema: gate_events(event_id, cross_id, event_type, trigger_source,
//                     previous_state, new_state, occurred_at, synced_at)
// NOTE: tidak ada trigger_distance_cm, servo_angle_deg, offline_buffered

export const GATE_EVENT_TYPES = [
  'GATE_WARNING',
  'GATE_CLOSING',
  'GATE_CLOSED',
  'GATE_OPENING',
  'GATE_OPEN',
  'GATE_CANCELLED',
] as const;

export type GateEventType = typeof GATE_EVENT_TYPES[number];

export const GATE_STATES = [
  'OPEN',
  'WAITING',
  'CLOSING',
  'CLOSED',
  'OPENING',
] as const;

export type GateStateDB = typeof GATE_STATES[number];

export interface GateEvent {
  event_id: string;
  cross_id: string;
  event_type: GateEventType;
  trigger_source: string | null;
  previous_state: GateStateDB | null;
  new_state: GateStateDB | null;
  occurred_at: string;
  synced_at: string;
}

// ─── Sensor Events ───────────────────────────────────────────────────────────
// Schema: sensor_events(event_id, component_id, cross_id, event_type,
//                        bool_value, numeric_value, text_value, unit, recorded_at, ingested_at)

export type SensorEventType = 'OBJECT_DETECTED' | 'CLEAR' | 'DISTANCE_READING';

export interface SensorEvent {
  event_id: string;
  component_id: string;
  cross_id: string;
  event_type: SensorEventType;
  bool_value: boolean | null;
  numeric_value: number | null;
  text_value: string | null;
  unit: string | null;
  recorded_at: string;
  ingested_at: string;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────
// Schema: alerts(alert_id, cross_id, component_id, alert_type, severity,
//                message, resolved, triggered_at, resolved_at)

export interface Alert {
  alert_id: string;
  cross_id: string;
  component_id: string | null;
  alert_type: string; // 'SENSOR_TIMEOUT' | 'WATCHDOG_RESTART' | 'BLIND_SPOT' | dll
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  resolved: boolean;
  triggered_at: string;
  resolved_at: string | null;
}

// ─── Analytics ───────────────────────────────────────────────────────────────
// Dari endpoint GET /api/crossings/:id/analytics
// Backend menghitung dari gate_events (GATE_CLOSED events)

export interface AnalyticsRow {
  tanggal: string;
  total_kereta: number;   // jumlah GATE_CLOSED events
  rata_durasi: number;    // rata-rata durasi palang tutup (detik)
  durasi_terlama: number; // durasi terlama palang tutup (detik)
}

// ─── Realtime Socket Events ───────────────────────────────────────────────────
// Dari backend socket.io emit

export interface GateStatusSocketEvent {
  crossing_name: string;
  event_type: GateEventType;
  new_state: GateStateDB | null;
  occurred_at: string;
}

export interface SensorUpdateSocketEvent {
  crossing_name: string;
  sensor_type: 'IR_A' | 'IR_B' | 'ULTRASONIC';
  object_detected: boolean;
  distance_cm: number | null;
  recorded_at: string;
}
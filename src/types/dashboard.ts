export type TrainLogRow = {
  train_id: string;
  cross_id: string | null;
  close_event_id?: string | null;
  open_event_id?: string | null;
  status: 'passing' | 'completed' | 'anomaly' | string | null;
  detected_at: string | null;
  cleared_at: string | null;
  duration_seconds?: number | null;
  max_proximity_cm?: number | null;
}

export type CrossingRow = {
  cross_id: string;
  name: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: string | null;
  created_at?: Date | string;
};

export type GateEventRow = {
  event_id: string;
  cross_id: string | null;
  event_type?: string | null;
  trigger_source?: string | null;
  trigger_distance_cm?: number | null;
  servo_angle_deg?: number | null;
  previous_state?: string | null;
  new_state: string | null;
  offline_buffered?: boolean | null;
  occurred_at?: Date | string | null;
  synced_at?: Date | string | null;
};

export type DeviceRow = {
  device_id: string;
  cross_id: string | null;
  type: string;
  model?: string | null;
  firmware_version?: string | null;
  mac_address?: string | null;
  mqtt_client_id?: string | null;
  status: string | null;
  last_seen_at?: string | null;
  registered_at?: string | null;
};

export type SensorReadingRow = {
  sensor_id: string;
  device_id?: string | null;
  cross_id: string | null;
  sensor_type: string;
  raw_value?: number | null;
  unit?: string | null;
  object_detected?: boolean | null;
  distance_cm: number | null;
  recorded_at: Date | null;
  ingested_at?: Date | null;
};

export type AlertRow = {
  alert_id: string;
  device_id?: string;
  cross_id: string;
  alert_type: string | null;
  severity: 'low' | 'medium' | 'critical' | string | null;
  message: string | null;
  resolved: boolean | false;
  triggered_at: Date | null;
  resolved_at?: Date | null;
  resolved_by?: string | null;
};


export type DashboardData = {
  // 1. Status Global
  loading: boolean;
  error: string | null;
  lastUpdatedAt: string | null;

  // 2. Navigasi & Filter
  crossings: CrossingRow[];
  crossingHint: string | null;
  selectedCrossId: string;
  setSelectedCrossId: (value: string) => void;
  selectedCrossingName: string;

  // 3. Data Real-time (Untuk Dashboard/Status Cards)
  latestTrain: TrainLogRow | null;      // Kereta terakhir/sedang melintas
  latestGateEvent: GateEventRow | null; // Status palang pintu terakhir
  devices: DeviceRow[];                 // Daftar perangkat untuk cek status online
  sensorReadings: SensorReadingRow[];    // Data sensor terbaru untuk telemetry

  // 4. Data Alert & Notifikasi
  alerts: AlertRow[];                   // List 5 alert terbaru yang belum resolved
  activeAlertsCount: number;            // Angka untuk badge di navbar/card

  // 5. Data Kolektif (Untuk Halaman History & Analytics)
  trainHistory: TrainLogRow[];          
};

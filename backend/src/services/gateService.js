const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const {
  crossingCache,
  deviceCache
} = require('../cache/deviceCache');

// ---------------------------------------------------------------------------
// Schema acuan: gate_events hanya punya kolom:
//   event_id, cross_id, event_type, trigger_source,
//   previous_state, new_state, occurred_at, synced_at
//
// TIDAK ada: trigger_distance_cm, servo_angle_deg, offline_buffered
// ---------------------------------------------------------------------------

async function getCrossId(client, crossingName) {
  if (crossingCache.has(crossingName)) {
    return crossingCache.get(crossingName);
  }

  const { rows } = await client.query(
    'SELECT cross_id FROM crossings WHERE name = $1',
    [crossingName]
  );

  if (!rows.length) {
    throw new Error(`Crossing '${crossingName}' tidak ditemukan`);
  }

  crossingCache.set(crossingName, rows[0].cross_id);
  return rows[0].cross_id;
}

// ---------------------------------------------------------------------------
// getDeviceId — mengembalikan { deviceId, status, isNew }
//   isNew = true  → device baru saja di-auto-register dengan status 'pending'
//   isNew = false → device sudah ada di DB
// ---------------------------------------------------------------------------
async function getDeviceId(client, mqttClientId, crossId) {
  // Cek cache dulu
  if (deviceCache.has(mqttClientId)) {
    const cached = deviceCache.get(mqttClientId);
    return { deviceId: cached.deviceId, status: cached.status, isNew: false };
  }

  // Cek database
  const { rows } = await client.query(
    'SELECT device_id, status FROM devices WHERE mqtt_client_id = $1',
    [mqttClientId]
  );

  if (rows.length) {
    deviceCache.set(mqttClientId, { deviceId: rows[0].device_id, status: rows[0].status });
    return { deviceId: rows[0].device_id, status: rows[0].status, isNew: false };
  }

  // Auto-register device baru dengan status 'pending'
  const deviceId = uuidv4();
  await client.query(
    `INSERT INTO devices
       (device_id, cross_id, type, mqtt_client_id, status)
     VALUES
       ($1, $2, 'ESP32', $3, 'pending')`,
    [deviceId, crossId, mqttClientId]
  );

  deviceCache.set(mqttClientId, { deviceId, status: 'pending' });
  return { deviceId, status: 'pending', isNew: true };
}

// ---------------------------------------------------------------------------
// Event types dari firmware yang di-handle:
//   GATE_WARNING   → hanya log ke gate_events
//   GATE_CLOSING   → log ke gate_events
//   GATE_CLOSED    → log ke gate_events
//   GATE_OPENING   → log ke gate_events
//   GATE_OPEN      → log ke gate_events
//   GATE_CANCELLED → log ke gate_events
//
// Tidak ada tabel train di schema → logika tracking durasi dihapus.
// ---------------------------------------------------------------------------
async function prosesGateEvent(io, data) {
  if (!data.crossing_name || !data.device_id || !data.event_type) {
    return console.warn('[prosesGateEvent] payload tidak lengkap:', data);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const crossId = await getCrossId(client, data.crossing_name);
    const { deviceId, status, isNew } = await getDeviceId(client, data.device_id, crossId);

    // Jika device baru saja terdaftar, kirim notifikasi ke admin
    if (isNew) {
      await client.query(
        `INSERT INTO alerts (alert_id, cross_id, alert_type, severity, message, triggered_at)
         VALUES ($1, $2, 'DEVICE_APPROVAL', 'medium', $3, NOW())`,
        [uuidv4(), crossId, `Device baru mencoba terhubung (MQTT: ${data.device_id}). Menunggu persetujuan Admin.`]
      );

      await client.query('COMMIT');
      console.log(`[DEVICE_PENDING] Device baru terdeteksi: ${data.device_id} | crossing: ${data.crossing_name}`);
      io.emit('device_pending', {
        device_id: deviceId,
        mqtt_client_id: data.device_id,
        crossing_name: data.crossing_name,
        cross_id: crossId,
        registered_at: new Date().toISOString()
      });
      return;
    }

    // Tolak data dari device yang masih pending atau denied
    if (status === 'pending' || status === 'denied') {
      await client.query('COMMIT');
      console.log(`[BLOCKED] Device ${data.device_id} status=${status}, gate event ditolak`);
      return;
    }

    const now = data.ts ? new Date(data.ts) : new Date();

    // INSERT ke gate_events — hanya kolom yang ada di schema
    await client.query(
      `INSERT INTO gate_events
         (event_id, cross_id, event_type, trigger_source,
          previous_state, new_state, occurred_at)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7)`,
      [
        uuidv4(),
        crossId,
        data.event_type,
        data.trigger_source  ?? 'SYSTEM',
        data.previous_state  ?? null,
        data.new_state       ?? null,
        now
      ]
    );

    // Update last_seen_at device — hanya jika bukan pending/denied
    await client.query(
      `UPDATE devices
       SET last_seen_at = NOW(), status = 'online'
       WHERE device_id = $1
         AND status NOT IN ('pending', 'denied')`,
      [deviceId]
    );

    await client.query('COMMIT');

    console.log(`[gate_event] ${data.event_type} | ${data.crossing_name}`);

    io.emit('gate_status', {
      crossing_name: data.crossing_name,
      event_type:    data.event_type,
      new_state:     data.new_state,
      occurred_at:   now.toISOString()
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[prosesGateEvent] error:', err.message);
  } finally {
    client.release();
  }
}

module.exports = {
  prosesGateEvent,
  getCrossId,
  getDeviceId
};

const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// ---------------------------------------------------------------------------
// Schema acuan: gate_events hanya punya kolom:
//   event_id, cross_id, event_type, trigger_source,
//   previous_state, new_state, occurred_at, synced_at
//
// TIDAK ada: trigger_distance_cm, servo_angle_deg, offline_buffered
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// getDeviceId — mengembalikan { deviceId, status, crossId, isNew }
//   isNew = true  → device baru saja di-auto-register dengan status 'pending'
//   isNew = false → device sudah ada di DB
// ---------------------------------------------------------------------------
async function getDeviceId(client, mqttClientId) {
  if (!mqttClientId) {
    throw new Error('Payload tidak memiliki device_id');
  }

  const { rows } = await client.query(
    `
    SELECT device_id, status, cross_id
    FROM devices
    WHERE mqtt_client_id = $1
    `,
    [mqttClientId]
  );

  if (rows.length) {
    return {
      deviceId: rows[0].device_id,
      status: rows[0].status,
      crossId: rows[0].cross_id,
      isNew: false
    };
  }

  // Auto-register device baru dengan status pending
  const deviceId = uuidv4();

  await client.query(
    `
    INSERT INTO devices
      (device_id, cross_id, type, mqtt_client_id, status)
    VALUES
      ($1, NULL, 'ESP32', $2, 'pending')
    `,
    [deviceId, mqttClientId]
  );

  return {
    deviceId,
    status: 'pending',
    crossId: null,
    isNew: true
  };
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
  if (!data.device_id || !data.event_type) {
    return console.warn('[prosesGateEvent] payload tidak lengkap:', data);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { deviceId, status, crossId, isNew } = await getDeviceId(client, data.device_id);

    // Jika device baru saja terdaftar, kirim notifikasi ke admin
    if (isNew) {
      await client.query(
        `INSERT INTO alerts (alert_id, cross_id, alert_type, severity, message, triggered_at)
         VALUES ($1, NULL, 'DEVICE_APPROVAL', 'medium', $2, NOW())`,
        [uuidv4(), `Device baru mencoba terhubung (MQTT: ${data.device_id}). Menunggu persetujuan Admin.`]
      );

      await client.query('COMMIT');
      console.log(`[DEVICE_PENDING] Device baru terdeteksi: ${data.device_id}`);
      io.emit('device_pending', {
        device_id: deviceId,
        mqtt_client_id: data.device_id,
        cross_id: null,
        registered_at: new Date().toISOString()
      });
      return;
    }

    // Tolak data dari device yang masih pending atau denied atau belum punya crossId
    if (status === 'pending' || status === 'denied' || !crossId) {
      await client.query('COMMIT');
      console.log(`[BLOCKED] Device ${data.device_id} status=${status}, crossId=${crossId}, gate event ditolak`);
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
        data.trigger_source ?? 'SYSTEM',
        data.previous_state ?? null,
        data.new_state ?? null,
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

    console.log(`[gate_event] ${data.event_type} | MQTT: ${data.device_id}`);

    const gatePayload = {
      cross_id: crossId,
      device_id: data.device_id,
      event_type: data.event_type,
      new_state: data.new_state,
      occurred_at: now.toISOString()
    };

    io.emit('gate_status', gatePayload);
    io.emit('gate_status_update', gatePayload);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[prosesGateEvent] error:', err.message);
  } finally {
    client.release();
  }
}

module.exports = {
  prosesGateEvent,
  getDeviceId
};

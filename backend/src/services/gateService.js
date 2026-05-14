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

async function getDeviceId(client, mqttClientId, crossId) {
  if (deviceCache.has(mqttClientId)) {
    return deviceCache.get(mqttClientId);
  }

  const { rows } = await client.query(
    'SELECT device_id FROM devices WHERE mqtt_client_id = $1',
    [mqttClientId]
  );

  if (rows.length) {
    deviceCache.set(mqttClientId, rows[0].device_id);
    return rows[0].device_id;
  }

  // Auto-register device baru
  const deviceId = uuidv4();
  await client.query(
    `INSERT INTO devices
       (device_id, cross_id, type, mqtt_client_id, status)
     VALUES
       ($1, $2, 'ESP32', $3, 'online')`,
    [deviceId, crossId, mqttClientId]
  );

  deviceCache.set(mqttClientId, deviceId);
  return deviceId;
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

    const crossId  = await getCrossId(client, data.crossing_name);
    const deviceId = await getDeviceId(client, data.device_id, crossId);

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

    // Update last_seen_at device
    await client.query(
      `UPDATE devices
       SET last_seen_at = NOW(), status = 'online'
       WHERE device_id = $1`,
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

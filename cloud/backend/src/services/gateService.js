const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// ---------------------------------------------------------------------------
// Gate event sekarang tidak mengambil crossing dari Arduino.
// Arduino cukup kirim device_id, misalnya SIM-001.
// Backend akan mencari cross_id dari tabel devices berdasarkan mqtt_client_id.
// ---------------------------------------------------------------------------

async function getDeviceByMqttClientId(client, mqttClientId) {
  if (!mqttClientId) {
    throw new Error('Payload tidak memiliki device_id');
  }

  const { rows } = await client.query(
    `
    SELECT
      device_id,
      cross_id,
      mqtt_client_id
    FROM devices
    WHERE mqtt_client_id = $1
    `,
    [mqttClientId]
  );

  if (!rows.length) {
    throw new Error(`Device dengan mqtt_client_id '${mqttClientId}' tidak ditemukan di tabel devices`);
  }

  return {
    device_id: rows[0].device_id,
    cross_id: rows[0].cross_id,
    mqtt_client_id: rows[0].mqtt_client_id
  };
}
async function getCrossingById(client, crossId) {
  const { rows } = await client.query(
    `
    SELECT
      cross_id,
      code,
      name
    FROM crossings
    WHERE cross_id = $1
    `,
    [crossId]
  );

  if (!rows.length) {
    throw new Error(`Crossing dengan cross_id '${crossId}' tidak ditemukan`);
  }

  return rows[0];
}

// ---------------------------------------------------------------------------
// Event types dari firmware:
//   GATE_WARNING
//   GATE_CLOSING
//   GATE_CLOSED
//   GATE_OPENING
//   GATE_OPEN
//   GATE_CANCELLED
// ---------------------------------------------------------------------------

async function prosesGateEvent(io, data) {
  if (!data.device_id || !data.event_type) {
    return console.warn('[prosesGateEvent] payload tidak lengkap:', data);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Ambil device dan cross_id dari database, bukan dari crossing_name Arduino
    const device = await getDeviceByMqttClientId(client, data.device_id);

    const deviceId = device.device_id;
    const crossId = device.cross_id;

    const crossing = await getCrossingById(client, crossId);

    const now = data.ts ? new Date(data.ts) : new Date();

    await client.query(
      `
      INSERT INTO gate_events
        (
          event_id,
          cross_id,
          event_type,
          trigger_source,
          previous_state,
          new_state,
          occurred_at
        )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        uuidv4(),
        crossId,
        data.event_type,
        data.trigger_source ?? 'DEVICE',
        data.previous_state ?? null,
        data.new_state ?? null,
        now
      ]
    );

    await client.query(
      `
      UPDATE devices
      SET
        last_seen_at = NOW(),
        status = 'online'
      WHERE device_id = $1
      `,
      [deviceId]
    );

    await client.query('COMMIT');

    console.log(`[gate_event] ${data.event_type} | ${data.device_id} | ${crossing.name}`);

    io.emit('gate_status_update', {
      cross_id: crossId,
      crossing_name: crossing.name,
      event_type: data.event_type,
      new_state: data.new_state,
      occurred_at: now.toISOString()
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
  getDeviceByMqttClientId,
  getCrossingById
};
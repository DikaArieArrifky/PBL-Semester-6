const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const {
  getCrossId,
  getDeviceId
} = require('./gateService');


// Auto create / ambil component_id
async function getComponentId(client, deviceId, componentCode) {
  const { rows } = await client.query(
    `SELECT component_id
     FROM device_components
     WHERE device_id = $1
       AND component_code = $2`,
    [deviceId, componentCode]
  );

  if (rows.length) {
    return rows[0].component_id;
  }

  const componentId = uuidv4();
  await client.query(
    `INSERT INTO device_components
       (
         component_id,
         device_id,
         component_code,
         component_type,
         component_name,
         status
       )
     VALUES
       ($1, $2, $3, $4, $5, 'healthy')`,
    [
      componentId,
      deviceId,
      componentCode,
      componentCode.startsWith('IR')
        ? 'IR_SENSOR'
        : 'ULTRASONIC_SENSOR',
      componentCode
    ]
  );

  return componentId;
}


// Proses data sensor dari MQTT
async function prosesSensorReading(io, data) {

  console.log('[SENSOR PAYLOAD]', data);

  // Validasi payload
  if (!data.crossing_name || !data.device_id || !data.sensor_type) {
    return console.warn('[prosesSensorReading] payload tidak lengkap:', data);
  }

  const client = await pool.connect();

  try {

    await client.query('BEGIN');

    const crossId = await getCrossId(client, data.crossing_name);
    const deviceId = await getDeviceId(client, data.device_id, crossId);
    const componentId = await getComponentId(client, deviceId, data.sensor_type);

    const now = data.ts ? new Date(data.ts) : new Date();

    const isBoolSensor =
      data.sensor_type === 'IR_A' ||
      data.sensor_type === 'IR_B';

    const boolValue = isBoolSensor
      ? (data.bool_value ?? false)
      : null;

    const numericValue =
      data.sensor_type === 'ULTRASONIC'
        ? (data.numeric_value ?? null)
        : null;

    const unit =
      data.unit ??
      (data.sensor_type === 'ULTRASONIC' ? 'cm' : 'bool');

    const eventType =
      data.event_type ??
      (
        isBoolSensor
          ? (boolValue ? 'OBJECT_DETECTED' : 'CLEAR')
          : 'DISTANCE_READING'
      );

    console.log(`[SENSOR] ${data.sensor_type} | bool=${boolValue} | num=${numericValue}`);

    // Simpan sensor event
    await client.query(
      `INSERT INTO sensor_events
         (event_id, component_id, cross_id, event_type,
          bool_value, numeric_value, unit, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [uuidv4(), componentId, crossId, eventType,
       boolValue, numericValue, unit, now]
    );

    // Update latest state sensor
    await client.query(
      `INSERT INTO latest_component_state
         (component_id, last_bool_value, last_numeric_value, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (component_id)
       DO UPDATE SET
         last_bool_value    = EXCLUDED.last_bool_value,
         last_numeric_value = EXCLUDED.last_numeric_value,
         updated_at         = EXCLUDED.updated_at`,
      [componentId, boolValue, numericValue, now]
    );

    // Update device online
    await client.query(
      `UPDATE devices
       SET last_seen_at = NOW(), status = 'online'
       WHERE device_id = $1`,
      [deviceId]
    );

    // Update waktu baca komponen
    await client.query(
      `UPDATE device_components
       SET last_reading_at = NOW()
       WHERE component_id = $1`,
      [componentId]
    );

    // ─────────────────────────────────────────────────────────────────────
    // FIX: SENSOR_TIMEOUT — window dinaikkan 5s → 10s
    //
    // Kenapa false alert sebelumnya:
    //   - ESP32 publish IR_A dan IR_B dalam satu loop (jeda < 1ms di loop)
    //   - Tapi network latency + DB insert tidak selesai bersamaan
    //   - Window 5s terlalu sempit: IR_A sudah insert, IR_B belum commit
    //     saat check window → alert palsu
    //
    // Dengan 10s: cukup toleran terhadap latency publish 2s + DB latency
    //
    // FIX tambahan: hanya trigger alert jika boolValue = true DAN
    //   isBoolSensor = true (sebelumnya sudah benar, tapi dipertegas)
    // ─────────────────────────────────────────────────────────────────────
    if (isBoolSensor && boolValue === true) {

      const otherCode =
        data.sensor_type === 'IR_A' ? 'IR_B' : 'IR_A';

      // [FIX] Window dinaikkan dari 5s → 10s
      const { rows: otherRows } = await client.query(
        `SELECT 1
         FROM sensor_events se
         JOIN device_components dc
           ON dc.component_id = se.component_id
         WHERE se.cross_id = $1
           AND dc.component_code = $2
           AND se.bool_value = true
           AND se.recorded_at > NOW() - INTERVAL '10 seconds'
         LIMIT 1`,
        [crossId, otherCode]
      );

      if (!otherRows.length) {

        // [FIX] Alert cooldown dinaikkan dari 30s → 60s
        const { rows: activeAlert } = await client.query(
          `SELECT 1
           FROM alerts
           WHERE cross_id = $1
             AND component_id = $2
             AND alert_type = 'SENSOR_TIMEOUT'
             AND resolved = false
             AND triggered_at > NOW() - INTERVAL '60 seconds'
           LIMIT 1`,
          [crossId, componentId]
        );

        if (!activeAlert.length) {

          await client.query(
            `INSERT INTO alerts
               (alert_id, cross_id, component_id, alert_type,
                severity, message, triggered_at)
             VALUES ($1, $2, $3, 'SENSOR_TIMEOUT', 'medium', $4, NOW())`,
            [
              uuidv4(),
              crossId,
              componentId,
              `${otherCode} tidak merespons dalam 10 detik terakhir`
            ]
          );

          console.warn(`[ALERT] SENSOR_TIMEOUT | ${otherCode} | ${data.crossing_name}`);
        }
      }
    }

    await client.query('COMMIT');

    // Kirim realtime ke frontend
    io.emit('sensor_update', {
      crossing_name:   data.crossing_name,
      sensor_type:     data.sensor_type,
      object_detected: data.object_detected ?? boolValue ?? false,
      distance_cm:     numericValue,
      recorded_at:     now.toISOString()
    });

    console.log(`[sensor_event] ${data.sensor_type} | ${data.crossing_name}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[prosesSensorReading] error:', err.message);
    console.error(err);
  } finally {
    client.release();
  }
}

module.exports = { prosesSensorReading };

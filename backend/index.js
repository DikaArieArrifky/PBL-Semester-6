require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const mqtt = require('mqtt');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws'); // buat node nya yang versi 20

// Setup
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.use(cors());
app.use(express.json());

// DB Pool (Supabase Postgres direct)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
pool.query('SELECT NOW()').then(r => console.log('DB connected:', r.rows[0].now)).catch(console.error);

// Supabase Admin Client (untuk User Management)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: WebSocket } } // tambahkan opsi transport untuk node v20
);

// MQTT
const mqttClient = mqtt.connect(
  `mqtts://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`,
  {
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASSWORD,
    reconnectPeriod: 5000,
  }
);

mqttClient.on('connect', () => {
  console.log('MQTT connected');
  mqttClient.subscribe('kereta/+/event', { qos: 1 });
  mqttClient.subscribe('kereta/+/sensor', { qos: 1 });
});
mqttClient.on('error', err => console.error('MQTT error:', err));

// Cache
const crossingCache = {};
const deviceCache = {};

async function getCrossId(client, crossingName) {
  if (crossingCache[crossingName]) return crossingCache[crossingName];
  const r = await client.query('SELECT cross_id FROM crossings WHERE name = $1', [crossingName]);
  if (!r.rows.length) throw new Error(`Crossing '${crossingName}' tidak ditemukan`);
  return (crossingCache[crossingName] = r.rows[0].cross_id);
}

async function getDeviceId(client, mqttClientId, crossId) {
  if (deviceCache[mqttClientId]) return deviceCache[mqttClientId];
  const r = await client.query('SELECT device_id FROM devices WHERE mqtt_client_id = $1', [mqttClientId]);
  if (r.rows.length) return (deviceCache[mqttClientId] = r.rows[0].device_id);
  const ins = await client.query(
    `INSERT INTO devices (device_id, cross_id, type, mqtt_client_id, status)
     VALUES ($1,$2,$3,$4,'online') RETURNING device_id`,
    [uuidv4(), crossId, 'ESP32', mqttClientId]
  );
  return (deviceCache[mqttClientId] = ins.rows[0].device_id);
}

// MQTT Message Handler
mqttClient.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log(`[MQTT] ${topic}:`, data);
    if (topic.includes('/event')) await prosesGateEvent(data);
    else if (topic.includes('/sensor')) await prosesSensorReading(data);
  } catch (err) {
    console.error('MQTT parse error:', err);
  }
});

// Gate Event Handler
async function prosesGateEvent(data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const crossId = await getCrossId(client, data.crossing_name);
    const deviceId = await getDeviceId(client, data.device_id, crossId);

    const eventResult = await client.query(
      `INSERT INTO gate_events
         (event_id, cross_id, event_type, trigger_source,
          trigger_distance_cm, servo_angle_deg,
          previous_state, new_state, offline_buffered, occurred_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING event_id`,
      [
        uuidv4(), crossId, data.event_type,
        data.trigger_source || 'SYSTEM',
        data.trigger_distance_cm ?? null,
        data.servo_angle_deg ?? null,
        data.previous_state ?? null,
        data.new_state ?? null,
        data.offline_buffered ?? false,
        data.ts ? new Date(data.ts) : new Date(),
      ]
    );
    const eventId = eventResult.rows[0].event_id;

    await client.query(
      `UPDATE devices SET last_seen_at = NOW(), status = 'online' WHERE device_id = $1`,
      [deviceId]
    );

    // Business Logic: tabel train
    if (data.event_type === 'GATE_CLOSING') {
      await client.query(
        `INSERT INTO train (train_id, cross_id, close_event_id, detected_at)
         VALUES ($1,$2,$3,$4)`,
        [uuidv4(), crossId, eventId, data.ts ? new Date(data.ts) : new Date()]
      );
    } else if (data.event_type === 'GATE_OPENING') {
      const trainResult = await client.query(
        `SELECT train_id, detected_at FROM train
         WHERE cross_id = $1 AND open_event_id IS NULL
         ORDER BY detected_at DESC LIMIT 1`,
        [crossId]
      );

      if (trainResult.rows.length > 0) {
        const { train_id, detected_at } = trainResult.rows[0];
        const clearedAt = data.ts ? new Date(data.ts) : new Date();
        const durationSec = Math.round((clearedAt - new Date(detected_at)) / 1000);

        const proximityResult = await client.query(
          `SELECT MIN(distance_cm) as max_proximity
           FROM sensor_readings
           WHERE cross_id = $1
             AND sensor_type = 'ULTRASONIC'
             AND recorded_at BETWEEN $2 AND $3
             AND distance_cm IS NOT NULL`,
          [crossId, detected_at, clearedAt]
        );
        const maxProximity = proximityResult.rows[0]?.max_proximity ?? null;

        await client.query(
          `UPDATE train
           SET open_event_id = $1, cleared_at = $2,
               duration_seconds = $3, max_proximity_cm = $4,
               resolved_at = NOW()
           WHERE train_id = $5`,
          [eventId, clearedAt, durationSec, maxProximity, train_id]
        );
      }
    }

    await client.query('COMMIT');
    console.log('gate_event saved:', eventId);

    io.emit('gate_status', {
      crossing_name: data.crossing_name,
      event: data.event_type,
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('prosesGateEvent error:', err);
  } finally {
    client.release();
  }
}

// Sensor Reading Handler
async function prosesSensorReading(data) {
  const client = await pool.connect();
  try {
    const crossId = await getCrossId(client, data.crossing_name);
    const deviceId = await getDeviceId(client, data.device_id, crossId);

    await client.query(
      `INSERT INTO sensor_readings
         (sensor_id, device_id, cross_id, sensor_type,
          raw_value, unit, object_detected, distance_cm, recorded_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        uuidv4(), deviceId, crossId,
        data.sensor_type, data.raw_value ?? null,
        data.unit ?? null, data.object_detected,
        data.distance_cm ?? null,
        data.ts ? new Date(data.ts) : new Date(),
      ]
    );

    await client.query(
      `UPDATE devices SET last_seen_at = NOW(), status = 'online' WHERE device_id = $1`,
      [deviceId]
    );

    if (
      data.sensor_type === 'ULTRASONIC' &&
      data.object_detected &&
      data.distance_cm !== null &&
      data.distance_cm < 50
    ) {
      const irCheck = await client.query(
        `SELECT object_detected FROM sensor_readings
         WHERE cross_id = $1 AND sensor_type = 'IR'
           AND recorded_at > NOW() - INTERVAL '5 seconds'
         ORDER BY recorded_at DESC LIMIT 1`,
        [crossId]
      );
      if (irCheck.rows.length > 0 && !irCheck.rows[0].object_detected) {
        await client.query(
          `INSERT INTO alerts (alert_id, device_id, cross_id, alert_type, severity, message)
           VALUES ($1,$2,$3,'BLIND_SPOT','warning','Ultrasonik mendeteksi objek dekat tapi IR tidak merespons')`,
          [uuidv4(), deviceId, crossId]
        );
      }
    }

    io.emit('sensor_update', data);
  } catch (err) {
    console.error('prosesSensorReading error:', err);
  } finally {
    client.release();
  }
}

// REST API

app.get('/api/crossings', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM crossings ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/crossings/:id/analytics', async (req, res) => {
  const { id } = req.params;
  const period = req.query.period || 'daily';

  let groupBy, dateLabel;
  switch (period) {
    case 'monthly':
      groupBy = `DATE_TRUNC('month', t.detected_at AT TIME ZONE 'Asia/Jakarta')`;
      dateLabel = groupBy;
      break;
    case 'yearly':
      groupBy = `DATE_TRUNC('year', t.detected_at AT TIME ZONE 'Asia/Jakarta')`;
      dateLabel = groupBy;
      break;
    default:
      groupBy = `DATE_TRUNC('day', t.detected_at AT TIME ZONE 'Asia/Jakarta')`;
      dateLabel = groupBy;
  }

  try {
    const r = await pool.query(
      `SELECT
         ${dateLabel}                          AS tanggal,
         COUNT(*)                              AS total_kereta,
         COALESCE(AVG(t.duration_seconds), 0) AS rata_durasi,
         COALESCE(MAX(t.duration_seconds), 0) AS durasi_terlama
       FROM train t
       WHERE t.cross_id = $1
         AND t.resolved_at IS NOT NULL
       GROUP BY ${groupBy}
       ORDER BY tanggal ASC
       LIMIT 60`,
      [id]
    );
    res.json(r.rows.map(row => ({
      tanggal: row.tanggal,
      total_kereta: parseInt(row.total_kereta),
      rata_durasi: parseFloat(parseFloat(row.rata_durasi).toFixed(1)),
      durasi_terlama: parseInt(row.durasi_terlama),
    })));
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin User Management API

app.post('/api/admin/users', async (req, res) => {
  const { email, name, password, role, cross_id } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'email, name, password wajib diisi.' });
  }

  try {
    const normalizedRole = role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : 'Staff';

    // 1. TAMBAHKAN user_metadata DI SINI AGAR TRIGGER BERHASIL
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        role: normalizedRole,
        cross_id: cross_id || null
      }
    });

    if (authError) return res.status(400).json({ error: authError.message });

    const userId = authData.user.id;

    // 2. KARENA TRIGGER PROKFIL OTOMATIS SUDAH BERHASIL, KITA TIDAK PERLU INSERT LAGI!
    // KITA BISA LANGSUNG UPDATE (Jaga-jaga jika trigger tidak memasukkan field tertentu secara sempurna) ATAU LANGSUNG RESPONS SUKSES.

    // Opsional Update untuk Memastikan Data Sesuai
    await supabaseAdmin.from('profiles')
      .update({ name: name.trim(), role: normalizedRole, cross_id: cross_id || null })
      .eq('id', userId);

    res.status(201).json({ id: userId, email, name, role: normalizedRole });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await supabaseAdmin.from('profiles').delete().eq('id', id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, role, cross_id } = req.body;
  try {
    const normalizedRole = role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : 'Staff';

    await supabaseAdmin.from('profiles')
      .update({ name: name?.trim(), role: normalizedRole, cross_id: cross_id || null })
      .eq('id', id);

    await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: {
        name: name?.trim(),
        role: normalizedRole,
        cross_id: cross_id || null
      }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Socket.IO
io.on('connection', socket => {
  console.log('Dashboard connected:', socket.id);
});

// Device Status Watchdog
setInterval(async () => {
  try {
    const res = await pool.query(`
      UPDATE devices 
      SET status = 'offline' 
      WHERE status = 'online' 
        AND last_seen_at < NOW() - INTERVAL '5 minutes'
      RETURNING device_id, mqtt_client_id
    `);
    
    if (res.rows.length > 0) {
      console.log(`[WATCHDOG] ${res.rows.length} device(s) went offline:`, res.rows.map(r => r.mqtt_client_id).join(', '));
      io.emit('device_status_change', { count: res.rows.length });
    }
  } catch (err) {
    console.error('[WATCHDOG] Error updating offline devices:', err.message);
  }
}, 30000); // Check every 30 seconds

// Start
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));


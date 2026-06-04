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
const { prosesGateEvent: serviceProsesGateEvent } = require('./src/services/gateService');
const { prosesSensorReading: serviceProsesSensorReading } = require('./src/services/sensorService');

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
  `mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`,
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
    if (topic.includes('/event')) await serviceProsesGateEvent(io, data);
    else if (topic.includes('/sensor')) await serviceProsesSensorReading(io, data);
  } catch (err) {
    console.error('MQTT parse error:', err);
  }
});

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

  const periodTrunc = period === 'monthly'
    ? 'month'
    : period === 'yearly'
      ? 'year'
      : 'day';

  try {
    const r = await pool.query(
      `WITH ordered_events AS (
         SELECT
           cross_id,
           event_type,
           occurred_at,
           LEAD(event_type) OVER (PARTITION BY cross_id ORDER BY occurred_at) AS next_event_type,
           LEAD(occurred_at) OVER (PARTITION BY cross_id ORDER BY occurred_at) AS next_occurred_at
         FROM gate_events
         WHERE cross_id = $1
       ),
       closed_pairs AS (
         SELECT
           DATE_TRUNC('${periodTrunc}', occurred_at AT TIME ZONE 'Asia/Jakarta') AS tanggal,
           EXTRACT(EPOCH FROM (next_occurred_at - occurred_at)) AS duration_seconds
         FROM ordered_events
         WHERE event_type = 'GATE_CLOSED'
           AND next_event_type IN ('GATE_OPENING', 'GATE_OPEN')
           AND next_occurred_at IS NOT NULL
       )
       SELECT
         tanggal,
         COUNT(*) AS total_kereta,
         COALESCE(AVG(duration_seconds), 0) AS rata_durasi,
         COALESCE(MAX(duration_seconds), 0) AS durasi_terlama
       FROM closed_pairs
       GROUP BY tanggal
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

// Health Check Endpoint (untuk Docker & Kubernetes health probes)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'railsafe-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Readiness Check (semua service siap?)
app.get('/ready', async (req, res) => {
  try {
    // Check database
    await pool.query('SELECT 1');

    // Check MQTT connection
    const mqttReady = mqttClient.connected;

    if (!mqttReady) {
      return res.status(503).json({
        status: 'NOT_READY',
        reason: 'MQTT not connected'
      });
    }

    res.status(200).json({
      status: 'READY',
      services: {
        database: 'OK',
        mqtt: 'OK'
      }
    });
  } catch (err) {
    res.status(503).json({
      status: 'NOT_READY',
      error: err.message
    });
  }
});

// Start
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));


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

const { prosesGateEvent } = require('./src/services/gateService');
const { prosesSensorReading } = require('./src/services/sensorService');

// Setup
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.use(cors());
app.use(express.json());

app.post('/api/gate/manual', async (req, res) => {
  const { cross_id, action } = req.body;

  if (!cross_id || !action) {
    return res.status(400).json({
      success: false,
      message: 'cross_id dan action wajib diisi'
    });
  }

  const allowedActions = ['EMERGENCY_CLOSE', 'EMERGENCY_OPEN'];

  if (!allowedActions.includes(action)) {
    return res.status(400).json({
      success: false,
      message: 'Action tidak valid'
    });
  }

  try {
    const { rows } = await pool.query(
      `
      SELECT mqtt_client_id
      FROM devices
      WHERE cross_id = $1
      ORDER BY last_seen_at DESC NULLS LAST
      LIMIT 1
      `,
      [cross_id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Device untuk perlintasan ini tidak ditemukan'
      });
    }

    const mqttClientId = rows[0].mqtt_client_id;
    const topic = `kereta/${mqttClientId}/command`;

    mqttClient.publish(topic, action, { qos: 1 });

    console.log(`[manual_gate] ${action} dikirim ke ${topic}`);

    return res.json({
      success: true,
      message: 'Command berhasil dikirim',
      topic,
      action
    });
  } catch (err) {
    console.error('[manual_gate] error:', err.message);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

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
const protocol = process.env.MQTT_PORT === '8883' ? 'mqtts' : 'mqtt';
const mqttClient = mqtt.connect(
  `${protocol}://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`,
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



// MQTT Message Handler
mqttClient.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log(`[MQTT] ${topic}:`, data);
    if (topic.includes('/event')) await prosesGateEvent(io, data);
    else if (topic.includes('/sensor')) await prosesSensorReading(io, data);
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
      `WITH closings AS (
         SELECT
           occurred_at AS closing_time,
           LEAD(occurred_at) OVER (ORDER BY occurred_at) AS next_opening_time,
           LEAD(event_type) OVER (ORDER BY occurred_at) AS next_event
         FROM gate_events
         WHERE cross_id = $1
           AND event_type IN ('GATE_CLOSING', 'GATE_OPEN')
       )
       SELECT
         DATE_TRUNC('${period === 'monthly' ? 'month' : period === 'yearly' ? 'year' : 'day'}', closing_time AT TIME ZONE 'Asia/Jakarta') AS tanggal,
         COUNT(*) AS total_kereta,
         COALESCE(AVG(EXTRACT(EPOCH FROM (next_opening_time - closing_time))), 0) AS rata_durasi,
         COALESCE(MAX(EXTRACT(EPOCH FROM (next_opening_time - closing_time))), 0) AS durasi_terlama
       FROM closings
       WHERE next_event = 'GATE_OPEN'
         AND EXTRACT(EPOCH FROM (next_opening_time - closing_time)) < 3600
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


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

// Analytics (Membaca dari hasil agregasi Spark)
app.get('/api/crossings/:id/analytics', async (req, res) => {
  const { id } = req.params;
  const period = req.query.period || 'daily';

  let groupBy;
  switch (period) {
    case 'monthly':
      groupBy = `DATE_TRUNC('month', ts.tanggal)`;
      break;
    case 'yearly':
      groupBy = `DATE_TRUNC('year', ts.tanggal)`;
      break;
    default:
      groupBy = `ts.tanggal`;
  }

  try {
    const r = await pool.query(
      `SELECT
         ${groupBy} AS tanggal,
         SUM(ts.total_kereta_lewat) AS total_kereta,
         COALESCE(gd.rata2_durasi_detik, 0) AS rata_durasi,
         COALESCE(gd.max_durasi_detik, 0) AS durasi_terlama
       FROM traffic_summary ts
       LEFT JOIN gate_duration_summary gd
         ON gd.cross_id = ts.cross_id
       WHERE ts.cross_id = $1
       GROUP BY
         ${groupBy},
         gd.rata2_durasi_detik,
         gd.max_durasi_detik
       ORDER BY tanggal ASC
       LIMIT 60`,
      [id]
    );

    res.json(
      r.rows.map(row => ({
        tanggal: row.tanggal,
        total_kereta: parseInt(row.total_kereta),
        rata_durasi: parseFloat(parseFloat(row.rata_durasi).toFixed(1)),
        durasi_terlama: parseInt(row.durasi_terlama),
      }))
    );
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// JAM SIBUK (GLOBAL DARI HASIL SPARK)
app.get('/api/crossings/:id/peakhours', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT jam, frekuensi
       FROM peak_hours_summary
       ORDER BY frekuensi DESC
       LIMIT 5`
    );

    res.json(
      r.rows.map(row => ({
        jam: parseInt(row.jam),
        frekuensi: parseInt(row.frekuensi),
      }))
    );
  } catch (err) {
    console.error('Peak hours error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Duration

app.get('/api/crossings/:id/duration', async (req, res) => {
  const { id } = req.params;

  try {
    const r = await pool.query(
      `SELECT
          rata2_durasi_detik,
          rata2_durasi_menit,
          std_durasi_detik,
          max_durasi_detik,
          min_durasi_detik
       FROM gate_duration_summary
       WHERE cross_id = $1`,
      [id]
    );

    if (!r.rows.length) {
      return res.json(null);
    }

    const row = r.rows[0];

    res.json({
      rata2_detik: parseFloat(row.rata2_durasi_detik),
      rata2_menit: parseFloat(row.rata2_durasi_menit),
      std_detik: parseFloat(row.std_durasi_detik),
      max_detik: parseInt(row.max_durasi_detik),
      min_detik: parseInt(row.min_durasi_detik),
    });
  } catch (err) {
    console.error('Duration error:', err);
    res.status(500).json({ error: err.message });
  }
});

//Anomaly

app.get('/api/crossings/:id/anomaly', async (req, res) => {
  const { id } = req.params;

  try {
    const r = await pool.query(
      `SELECT
          jumlah_anomali,
          total_event,
          persen_anomali
       FROM anomaly_summary
       WHERE cross_id = $1`,
      [id]
    );

    if (!r.rows.length) {
      return res.json({
        jumlah_anomali: 0,
        total_event: 0,
        persen_anomali: 0,
      });
    }

    const row = r.rows[0];

    res.json({
      jumlah_anomali: parseInt(row.jumlah_anomali),
      total_event: parseInt(row.total_event),
      persen_anomali: parseFloat(row.persen_anomali),
    });
  } catch (err) {
    console.error('Anomaly error:', err);
    res.status(500).json({ error: err.message });
  }
});

//Weekday Weekend

app.get('/api/crossings/:id/weekday-weekend', async (req, res) => {
  const { id } = req.params;

  try {
    const r = await pool.query(
      `SELECT
          tipe_hari,
          rata2_kereta_per_hari,
          jumlah_hari
       FROM weekday_weekend_summary
       WHERE cross_id = $1
       ORDER BY tipe_hari`,
      [id]
    );

    res.json(
      r.rows.map(row => ({
        tipe_hari: row.tipe_hari,
        rata2_kereta_per_hari: parseFloat(row.rata2_kereta_per_hari),
        jumlah_hari: parseInt(row.jumlah_hari),
      }))
    );
  } catch (err) {
    console.error('WeekdayWeekend error:', err);
    res.status(500).json({ error: err.message });
  }
});

//Heatmap

app.get('/api/crossings/:id/heatmap', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT
          hari,
          jam,
          frekuensi
       FROM heatmap_jam_hari
       ORDER BY hari, jam`
    );

    res.json(
      r.rows.map(row => ({
        hari: parseInt(row.hari),
        jam: parseInt(row.jam),
        frekuensi: parseInt(row.frekuensi),
      }))
    );
  } catch (err) {
    console.error('Heatmap error:', err);
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

// Admin Device Management API
app.delete('/api/admin/devices/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Cascade delete
      const { rows: comps } = await client.query('SELECT component_id FROM device_components WHERE device_id = $1', [id]);
      if (comps.length > 0) {
        const compIds = comps.map(c => c.component_id);
        const placeholders = compIds.map((_, i) => `$${i + 1}`).join(',');
        await client.query(`DELETE FROM latest_component_state WHERE component_id IN (${placeholders})`, compIds);
        await client.query(`DELETE FROM sensor_events WHERE component_id IN (${placeholders})`, compIds);
        await client.query(`DELETE FROM sensor_readings WHERE component_id IN (${placeholders})`, compIds);
        await client.query('DELETE FROM device_components WHERE device_id = $1', [id]);
      }
      
      const { rowCount } = await client.query('DELETE FROM devices WHERE device_id = $1', [id]);
      if (rowCount === 0) {
        throw new Error('Device tidak ditemukan');
      }
      
      await client.query('COMMIT');
      res.json({ success: true, message: 'Device berhasil dihapus' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Delete device error:', err);
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


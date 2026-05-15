const mqttClient = require('../config/mqtt');

const { prosesGateEvent }    = require('../services/gateService');
const { prosesSensorReading } = require('../services/sensorService');

// ─────────────────────────────────────────────────────────────────────────────
// FIX: Listener 'message' hanya didaftarkan SEKALI di level module, bukan di
// dalam callback 'connect'. Sebelumnya setiap MQTT reconnect mendaftarkan
// listener baru → satu pesan diproses 2x, 4x, dst (duplicate processing).
// ─────────────────────────────────────────────────────────────────────────────

function setupMQTT(io) {

  // Subscribe ulang setiap kali (re)connect — ini benar
  mqttClient.on('connect', () => {
    console.log('[MQTT] Connected');

    mqttClient.subscribe([
      'kereta/+/event',
      'kereta/+/sensor'
    ], { qos: 1 }, (err) => {
      if (err) {
        console.error('[MQTT] Subscribe error:', err.message);
      } else {
        console.log('[MQTT] Subscribed to kereta/+/event & kereta/+/sensor');
      }
    });
  });

  mqttClient.on('error', (err) => {
    console.error('[MQTT] Client error:', err.message);
  });

  mqttClient.on('offline', () => {
    console.warn('[MQTT] Client offline');
  });

  mqttClient.on('reconnect', () => {
    console.log('[MQTT] Reconnecting...');
  });

  // ── Message handler — didaftar SEKALI, tidak di dalam 'connect' ──────────
  mqttClient.on('message', async (topic, message) => {

    const payload = message.toString().trim();

    console.log('[MQTT]', topic, payload.substring(0, 100) + (payload.length > 100 ? '...' : ''));

    if (!payload || payload === 'undefined') {
      return;
    }

    // FIX: Tangkap JSON corrupt/truncated sebelum crash proses lain
    let data;
    try {
      data = JSON.parse(payload);
    } catch (err) {
      console.error('[MQTT] JSON parse error:', err.message, '| raw length:', payload.length);
      return; // buang pesan rusak, jangan crash
    }

    // Pastikan data adalah object (bukan array/string)
    if (typeof data !== 'object' || data === null) {
      console.error('[MQTT] Payload bukan object:', typeof data);
      return;
    }

    try {
      if (topic.endsWith('/event')) {
        await prosesGateEvent(io, data);
        return;
      }

      if (topic.endsWith('/sensor')) {
        await prosesSensorReading(io, data);
        return;
      }

      console.warn('[MQTT] Topic tidak dikenali:', topic);

    } catch (err) {
      // Tangkap error tak terduga dari service agar MQTT handler tidak crash
      console.error('[MQTT] Handler error pada topic', topic, ':', err.message);
      console.error(err);
    }
  });
}

module.exports = setupMQTT;

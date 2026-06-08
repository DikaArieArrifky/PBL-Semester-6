const crossingCache = new Map();

// deviceCache sekarang menyimpan object { deviceId, status }
// agar backend bisa langsung menolak device pending/denied tanpa query DB
const deviceCache = new Map();

/**
 * Invalidate cache untuk mqtt_client_id tertentu
 * Dipanggil saat admin Accept/Deny agar status terbaru dibaca ulang dari DB
 */
function invalidateDevice(mqttClientId) {
  deviceCache.delete(mqttClientId);
}

/**
 * Invalidate SEMUA device cache — fallback jika tidak tahu mqtt_client_id
 */
function invalidateAllDevices() {
  deviceCache.clear();
}

module.exports = {
  crossingCache,
  deviceCache,
  invalidateDevice,
  invalidateAllDevices
};
#include 
#include <WiFi.h>
#include <PubSubClient.h>
#include <NewPing.h>
#include <ESP32Servo.h>
#include <time.h>

// ===================================================
// KONFIGURASI WIFI
// ===================================================

const char* WIFI_SSID = "OuiCoffee_5G";
const char* WIFI_PASS = "bonnehumeur";

// ===================================================
// KONFIGURASI MQTT AZURE
// ===================================================

const char* MQTT_HOST = "20.189.119.23";
const int MQTT_PORT = 1883;

const char* MQTT_USER = "railsafe_esp32";
const char* MQTT_PASS = "railsafe_smt6";

const char* DEVICE_ID = "SIM-001"; // unique device identifier
const char* CROSSING_NAME = "Perlintasan 1";

const char* MQTT_TOPIC_SENSOR_TEMPLATE = "kereta/%s/sensor";
const char* MQTT_TOPIC_EVENT_TEMPLATE  = "kereta/%s/event";

// ===================================================
// PIN ESP32
// ===================================================

// Sensor infrared
#define PIN_IR_1          34
#define PIN_IR_2          35

// Sensor ultrasonik
#define PIN_TRIG          18
#define PIN_ECHO          19
#define MAX_DISTANCE      200

// Servo
#define PIN_SERVO_1       25
#define PIN_SERVO_2       26

// Buzzer active
#define PIN_BUZZER        27

// LED RGB 1
#define LED1_R            16
#define LED1_G            17
#define LED1_B            21

// LED RGB 2
#define LED2_R            22
#define LED2_G            23
#define LED2_B            33

// ===================================================
// KONFIGURASI SISTEM
// ===================================================

// false = LED RGB common cathode, common ke GND
// true  = LED RGB common anode, common ke 3V3
#define RGB_COMMON_ANODE false

// Banyak sensor IR obstacle:
// LOW  = objek terdeteksi
// HIGH = tidak ada objek
#define IR_ACTIVE_LOW true

// Sudut servo, sesuaikan jika arah terbalik
#define SERVO_BUKA        10
#define SERVO_TUTUP       100

// Jika jarak ultrasonik lebih dari ini, lintasan dianggap aman
#define JARAK_AMAN_CM     30

// Delay sebelum palang dibuka setelah aman
#define DELAY_BUKA_MS     3000

// LED hijau menyala setelah palang terbuka
#define LED_HIJAU_MS      3000

// Interval kirim data MQTT
#define MQTT_INTERVAL_MS  2000

// Debounce IR agar buzzer tidak cuma "tek" karena sensor berkedip
#define DEBOUNCE_IR_MS    200

// ===================================================
// OBJEK
// ===================================================

WiFiClient espClient;
PubSubClient mqttClient(espClient);

NewPing sonar(PIN_TRIG, PIN_ECHO, MAX_DISTANCE);

Servo servo1;
Servo servo2;

// ===================================================
// VARIABEL STATUS
// ===================================================

bool palangTertutup = false;
bool prosesMenungguBuka = false;

bool statusKeretaStabil = false;
bool statusKeretaTerakhir = false;

unsigned long waktuPerubahanIR = 0;
unsigned long waktuMulaiAman = 0;
unsigned long waktuLedHijau = 0;
unsigned long lastMqttSend = 0;

String statusPalang = "TERBUKA";
String statusLed = "MATI";
String statusBuzzer = "OFF";

// ===================================================
// FUNGSI LED RGB
// ===================================================

void setLedPin(int pin, bool nyala) {
  if (RGB_COMMON_ANODE) {
    digitalWrite(pin, nyala ? LOW : HIGH);
  } else {
    digitalWrite(pin, nyala ? HIGH : LOW);
  }
}

void ledMati() {
  setLedPin(LED1_R, false);
  setLedPin(LED1_G, false);
  setLedPin(LED1_B, false);

  setLedPin(LED2_R, false);
  setLedPin(LED2_G, false);
  setLedPin(LED2_B, false);

  statusLed = "MATI";
}

void ledMerah() {
  setLedPin(LED1_R, true);
  setLedPin(LED1_G, false);
  setLedPin(LED1_B, false);

  setLedPin(LED2_R, true);
  setLedPin(LED2_G, false);
  setLedPin(LED2_B, false);

  statusLed = "MERAH";
}

void ledHijau() {
  setLedPin(LED1_R, false);
  setLedPin(LED1_G, true);
  setLedPin(LED1_B, false);

  setLedPin(LED2_R, false);
  setLedPin(LED2_G, true);
  setLedPin(LED2_B, false);

  statusLed = "HIJAU";
}

// ===================================================
// FUNGSI BUZZER DAN SERVO
// ===================================================

void buzzerOn() {
  // Untuk active buzzer
  digitalWrite(PIN_BUZZER, HIGH);
  statusBuzzer = "ON";
}

void buzzerOff() {
  digitalWrite(PIN_BUZZER, LOW);
  statusBuzzer = "OFF";
}

void tutupPalang() {
  servo1.write(SERVO_TUTUP);
  servo2.write(SERVO_TUTUP);

  palangTertutup = true;
  prosesMenungguBuka = false;

  statusPalang = "TERTUTUP";

  buzzerOn();
  ledMerah();

  Serial.println("Palang ditutup karena infrared mendeteksi kereta");
}

void bukaPalang() {
  servo1.write(SERVO_BUKA);
  servo2.write(SERVO_BUKA);

  palangTertutup = false;
  prosesMenungguBuka = false;

  statusPalang = "TERBUKA";

  buzzerOff();
  ledHijau();

  waktuLedHijau = millis();

  Serial.println("Palang dibuka karena lintasan sudah aman");
}

// ===================================================
// FUNGSI SENSOR
// ===================================================

bool bacaIR(int pin) {
  int nilai = digitalRead(pin);

  if (IR_ACTIVE_LOW) {
    return nilai == LOW;
  } else {
    return nilai == HIGH;
  }
}

int bacaJarakCm() {
  delay(30);

  int jarak = sonar.ping_cm();

  // Jika 0, biasanya tidak terbaca atau terlalu jauh
  // Untuk sistem ini dianggap aman
  if (jarak == 0) {
    return MAX_DISTANCE;
  }

  return jarak;
}

// ===================================================
// WIFI
// ===================================================

void connectWiFi() {
  Serial.print("Menghubungkan ke WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int percobaan = 0;

  while (WiFi.status() != WL_CONNECTED && percobaan < 30) {
    delay(500);
    Serial.print(".");
    percobaan++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi terhubung");
    Serial.print("IP ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi gagal terhubung. Sistem tetap berjalan tanpa MQTT.");
  }
}

// ===================================================
// MQTT
// ===================================================

void connectMQTT() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  if (mqttClient.connected()) {
    return;
  }

  Serial.print("Menghubungkan ke MQTT broker: ");
  Serial.print(MQTT_HOST);
  Serial.print(":");
  Serial.println(MQTT_PORT);

  String clientId = "ESP32-RailSafe-";
  clientId += String(random(0xffff), HEX);

  if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
    Serial.println("MQTT berhasil terhubung");
  } else {
    Serial.print("MQTT gagal, rc=");
    Serial.println(mqttClient.state());

    Serial.println("Keterangan rc:");
    Serial.println("-2 = broker/IP/port tidak bisa dijangkau");
    Serial.println(" 4 = username/password salah");
    Serial.println(" 5 = tidak diizinkan oleh broker");
  }
}

// ---------- Time helper (ISO-8601 UTC) ----------
void getIsoTimestamp(char* buf, size_t len) {
  time_t now = time(nullptr);
  struct tm tm;
  gmtime_r(&now, &tm);
  strftime(buf, len, "%Y-%m-%dT%H:%M:%SZ", &tm);
}

// ---------- Publish helpers ----------
void publishToTopic(const char* topic, const char* payload) {
  if (WiFi.status() != WL_CONNECTED) return;
  if (!mqttClient.connected()) connectMQTT();
  if (!mqttClient.connected()) return;
  mqttClient.publish(topic, payload);
}

void kirimSensorNumeric(const char* sensorType, int value, const char* unit) {
  char topic[80], payload[256], ts[32];
  getIsoTimestamp(ts, sizeof(ts));
  snprintf(topic, sizeof(topic), MQTT_TOPIC_SENSOR_TEMPLATE, DEVICE_ID);
  snprintf(payload, sizeof(payload),
    "{\"crossing_name\":\"%s\",\"device_id\":\"%s\",\"sensor_type\":\"%s\",\"numeric_value\":%d,\"unit\":\"%s\",\"ts\":\"%s\"}",
    CROSSING_NAME, DEVICE_ID, sensorType, value, unit, ts);
  publishToTopic(topic, payload);
  Serial.print("Publish sensor to "); Serial.print(topic); Serial.print(": "); Serial.println(payload);
}

void kirimSensorBool(const char* sensorType, bool value) {
  char topic[80], payload[256], ts[32];
  getIsoTimestamp(ts, sizeof(ts));
  snprintf(topic, sizeof(topic), MQTT_TOPIC_SENSOR_TEMPLATE, DEVICE_ID);
  snprintf(payload, sizeof(payload),
    "{\"crossing_name\":\"%s\",\"device_id\":\"%s\",\"sensor_type\":\"%s\",\"bool_value\":%s,\"ts\":\"%s\"}",
    CROSSING_NAME, DEVICE_ID, sensorType, value ? "true" : "false", ts);
  publishToTopic(topic, payload);
  Serial.print("Publish sensor to "); Serial.print(topic); Serial.print(": "); Serial.println(payload);
}

void kirimGateEvent(const char* eventType, const char* previousState, const char* newState) {
  char topic[80], payload[300], ts[32];
  getIsoTimestamp(ts, sizeof(ts));
  snprintf(topic, sizeof(topic), MQTT_TOPIC_EVENT_TEMPLATE, DEVICE_ID);
  snprintf(payload, sizeof(payload),
    "{\"crossing_name\":\"%s\",\"device_id\":\"%s\",\"event_type\":\"%s\",\"trigger_source\":\"DEVICE\",\"previous_state\":\"%s\",\"new_state\":\"%s\",\"ts\":\"%s\"}",
    CROSSING_NAME, DEVICE_ID, eventType, previousState, newState, ts);
  publishToTopic(topic, payload);
  Serial.print("Publish event to "); Serial.print(topic); Serial.print(": "); Serial.println(payload);
}

// ===================================================
// SETUP
// ===================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("Memulai sistem palang kereta otomatis RailSafe...");

  pinMode(PIN_IR_1, INPUT);
  pinMode(PIN_IR_2, INPUT);

  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  pinMode(LED1_R, OUTPUT);
  pinMode(LED1_G, OUTPUT);
  pinMode(LED1_B, OUTPUT);

  pinMode(LED2_R, OUTPUT);
  pinMode(LED2_G, OUTPUT);
  pinMode(LED2_B, OUTPUT);

  buzzerOff();
  ledMati();

  servo1.attach(PIN_SERVO_1);
  servo2.attach(PIN_SERVO_2);

  // Kondisi awal palang terbuka
  servo1.write(SERVO_BUKA);
  servo2.write(SERVO_BUKA);

  palangTertutup = false;
  statusPalang = "TERBUKA";

  connectWiFi();

  // Initialize time via NTP for ISO-8601 timestamps (UTC)
  configTime(0, 0, "pool.ntp.org");
  Serial.println("Inisialisasi waktu NTP...");

  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  connectMQTT();

  Serial.println("Sistem siap digunakan");
}

// ===================================================
// LOOP UTAMA
// ===================================================

void loop() {
  bool ir1Aktif = bacaIR(PIN_IR_1);
  bool ir2Aktif = bacaIR(PIN_IR_2);

  int jarak = bacaJarakCm();

  // Baca IR mentah
  bool adaKeretaRaw = ir1Aktif || ir2Aktif;

  // Debounce IR agar pembacaan lebih stabil
  if (adaKeretaRaw != statusKeretaTerakhir) {
    statusKeretaTerakhir = adaKeretaRaw;
    waktuPerubahanIR = millis();
  }

  if (millis() - waktuPerubahanIR >= DEBOUNCE_IR_MS) {
    statusKeretaStabil = adaKeretaRaw;
  }

  bool adaKereta = statusKeretaStabil;
  bool lintasanAman = jarak > JARAK_AMAN_CM;

  // =================================================
  // LOGIKA PALANG
  // =================================================

  // Jika salah satu infrared mendeteksi kereta,
  // kedua palang langsung turun.
  // Ultrasonik bukan syarat awal palang turun.
  if (adaKereta) {
    // Paksa buzzer dan LED tetap aktif selama IR mendeteksi kereta
    buzzerOn();
    ledMerah();

    if (!palangTertutup) {
      tutupPalang();
      kirimGateEvent("TRAIN_DETECTED", "TERBUKA", "TERTUTUP");
    }

    prosesMenungguBuka = false;
  }

  // Jika kedua infrared sudah tidak mendeteksi,
  // ultrasonik digunakan sebagai validasi sebelum palang dibuka.
  if (!adaKereta && palangTertutup) {
    if (lintasanAman) {
      if (!prosesMenungguBuka) {
        prosesMenungguBuka = true;
        waktuMulaiAman = millis();
        Serial.println("IR aman dan ultrasonik aman, menunggu sebelum membuka palang...");
      }

      if (millis() - waktuMulaiAman >= DELAY_BUKA_MS) {
        bukaPalang();
      }
    } else {
      prosesMenungguBuka = false;

      // Palang tetap tertutup karena ultrasonik masih membaca objek
      buzzerOn();
      ledMerah();

      Serial.println("IR aman tetapi ultrasonik masih mendeteksi objek, palang tetap tertutup");
    }
  }

  // Setelah palang terbuka, LED hijau menyala beberapa detik lalu mati
  if (!palangTertutup && statusLed == "HIJAU") {
    if (millis() - waktuLedHijau >= LED_HIJAU_MS) {
      ledMati();
    }
  }

  // =================================================
  // KIRIM DATA SENSOR KE MQTT
  // =================================================

  if (millis() - lastMqttSend >= MQTT_INTERVAL_MS) {
    lastMqttSend = millis();

    kirimSensorBool("ir_1", ir1Aktif);
    kirimSensorBool("ir_2", ir2Aktif);
    kirimSensorNumeric("ultrasonic_1", jarak, "cm");
    kirimSensorBool("gate_status", palangTertutup);
    kirimSensorBool("buzzer_status", statusBuzzer == "ON");

    if (statusLed == "MERAH") {
      kirimSensorNumeric("led_status", 1, "level");
    } else if (statusLed == "HIJAU") {
      kirimSensorNumeric("led_status", 2, "level");
    } else {
      kirimSensorNumeric("led_status", 0, "level");
    }
  }

  if (mqttClient.connected()) {
    mqttClient.loop();
  }

  // =================================================
  // DEBUG SERIAL MONITOR
  // =================================================

  Serial.print(" | IR1: ");
  Serial.print(ir1Aktif ? "TERDETEKSI" : "TIDAK");

  Serial.print(" | IR2: ");
  Serial.print(ir2Aktif ? "TERDETEKSI" : "TIDAK");

  Serial.print(" | Kereta stabil: ");
  Serial.print(adaKereta ? "YA" : "TIDAK");

  Serial.print(" | Jarak: ");
  Serial.print(jarak);
  Serial.print(" cm");

  Serial.print(" | Palang: ");
  Serial.print(statusPalang);

  Serial.print(" | Buzzer: ");
  Serial.print(statusBuzzer);

  Serial.print(" | LED: ");
  Serial.println(statusLed);

  delay(300);
}
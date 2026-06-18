from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("Analisis_Kompleks_Perlintasan") \
    .getOrCreate()

spark.sparkContext.setLogLevel("WARN")
print("--- Memulai Proses Analisis Big Data Kompleks ---")

try:
    df_gate = spark.read.csv("/datalake/raw/gate_events/*.csv", header=True, inferSchema=True)
    df_cross = spark.read.csv("/datalake/raw/crossings/*.csv", header=True, inferSchema=True)
    
    df_gate.createOrReplaceTempView("gate_events")
    df_cross.createOrReplaceTempView("crossings")

    # ====================================================================
    # PERBAIKAN 1: DURASI PALANG PINTU (Dari CLOSING ke OPEN)
    # Kita saring dulu event transisi (CLOSED dan OPENING) agar LEAD() 
    # bisa langsung mempertemukan CLOSING dengan OPEN.
    # ====================================================================
    print("\n[1] MENGHITUNG STATISTIK DURASI PALANG PINTU...")
    gate_duration = spark.sql("""
        WITH FilteredEvents AS (
            SELECT cross_id, new_state, occurred_at
            FROM gate_events
            WHERE new_state IN ('CLOSING', 'OPEN')
        ),
        OrderedEvents AS (
            SELECT 
                cross_id, 
                new_state, 
                occurred_at,
                LEAD(new_state) OVER (PARTITION BY cross_id ORDER BY occurred_at) as next_state,
                LEAD(occurred_at) OVER (PARTITION BY cross_id ORDER BY occurred_at) as next_time
            FROM FilteredEvents
        ),
        Durations AS (
            SELECT 
                cross_id,
                (UNIX_TIMESTAMP(next_time) - UNIX_TIMESTAMP(occurred_at)) as durasi_detik
            FROM OrderedEvents
            WHERE new_state = 'CLOSING' AND next_state = 'OPEN'
        )
        SELECT 
            c.name as nama_perlintasan,
            ROUND(AVG(d.durasi_detik), 2) as rata2_durasi_detik,
            ROUND(AVG(d.durasi_detik)/60, 2) as rata2_durasi_menit,
            ROUND(STDDEV(d.durasi_detik), 2) as std_durasi_detik,
            MAX(d.durasi_detik) as max_durasi_detik,
            MIN(d.durasi_detik) as min_durasi_detik
        FROM Durations d
        JOIN crossings c ON d.cross_id = c.cross_id
        GROUP BY c.name
    """)
    gate_duration.show(truncate=False)

    # ====================================================================
    # PERBAIKAN 2: HEATMAP JAM (Menghitung saat palang 'CLOSING')
    # Mengubah angka hari menjadi nama hari dalam Bahasa Indonesia
    # ====================================================================
    print("\n[2] MENGHITUNG JAM SIBUK / HEATMAP (Berdasarkan hari & jam)...")
    heatmap_jam = spark.sql("""
        SELECT 
            CASE DAYOFWEEK(occurred_at)
                WHEN 1 THEN 'Minggu'
                WHEN 2 THEN 'Senin'
                WHEN 3 THEN 'Selasa'
                WHEN 4 THEN 'Rabu'
                WHEN 5 THEN 'Kamis'
                WHEN 6 THEN 'Jumat'
                WHEN 7 THEN 'Sabtu'
            END as nama_hari, 
            HOUR(occurred_at) as jam,
            COUNT(event_id) as frekuensi_kereta
        FROM gate_events
        WHERE new_state = 'CLOSING'
        GROUP BY nama_hari, jam
        ORDER BY frekuensi_kereta DESC
        LIMIT 10
    """)
    heatmap_jam.show()


    # ====================================================================
    # PERBAIKAN 3: TOTAL LALU LINTAS HARIAN (Menghitung saat palang 'CLOSING')
    # ====================================================================
    print("\n[3] MENGHITUNG TOTAL LALU LINTAS HARIAN PER PERLINTASAN...")
    traffic_summary = spark.sql("""
        SELECT 
            c.name as nama_perlintasan,
            TO_DATE(g.occurred_at) as tanggal,
            COUNT(g.event_id) as total_kereta_lewat
        FROM gate_events g
        JOIN crossings c ON g.cross_id = c.cross_id
        WHERE g.new_state = 'CLOSING'
        GROUP BY c.name, tanggal
        ORDER BY tanggal DESC, total_kereta_lewat DESC
    """)
    traffic_summary.show()

except Exception as e:
    print(f"\n[Error] Terjadi kesalahan: {e}")

finally:
    spark.stop()
    print("--- Analisis Kompleks Selesai ---")

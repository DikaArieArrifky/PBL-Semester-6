const { Pool } = require('pg');
const fs = require('fs');
const { execSync } = require('child_process');

const pool = new Pool({
  connectionString: 'postgresql://postgres.vvbcysbmjybvhbgyfbsy:SijNCm%40w-TUua4%21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function exportTableToHDFS(tableName, query, hdfsFolder, isFullLoad) {
    console.log(`\n--- Memproses tabel: ${tableName} ---`);
    const res = await pool.query(query);
    console.log(`Berhasil menarik ${res.rows.length} baris data.`);

    if (res.rows.length === 0) {
      console.log(`Tidak ada data baru.`);
      return;
    }

    const columns = Object.keys(res.rows[0]);
    let csvContent = columns.join(",") + "\n";
    
    res.rows.forEach(row => {
      const rowValues = columns.map(col => {
        let val = row[col];
        if (val === null || val === undefined) return '';
        if (val instanceof Date) return val.toISOString();
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return val;
      });
      csvContent += rowValues.join(",") + "\n";
    });

    const fileName = `${tableName}_${Date.now()}.csv`;
    fs.writeFileSync(fileName, csvContent);

    try { execSync(`hdfs dfs -mkdir -p ${hdfsFolder}`); } catch (e) {}

    if (isFullLoad) {
        console.log("Menghapus data lama (Full Load)...");
        try { execSync(`hdfs dfs -rm -f ${hdfsFolder}/*.csv`); } catch (e) {}
    }

    const hdfsPath = `${hdfsFolder}/${fileName}`;
    console.log(`Mengunggah ke HDFS di: ${hdfsPath}`);
    execSync(`hdfs dfs -put -f ${fileName} ${hdfsPath}`);
    
    fs.unlinkSync(fileName);
    console.log(`Berhasil memproses ${tableName}.`);
}

async function startExport() {
  try {
    console.log("Memulai sinkronisasi...");

    // MENGAMBIL DATA 7 HARI TERAKHIR (1 MINGGU) & Di-set "True" agar mereplace data lama
    await exportTableToHDFS('sensor_events', `SELECT * FROM public.sensor_events WHERE recorded_at >= NOW() - INTERVAL '7 days'`, '/datalake/raw/sensor_events', true);
    await exportTableToHDFS('gate_events', `SELECT * FROM public.gate_events WHERE occurred_at >= NOW() - INTERVAL '7 days'`, '/datalake/raw/gate_events', true);
    await exportTableToHDFS('alerts', `SELECT * FROM public.alerts WHERE triggered_at >= NOW() - INTERVAL '7 days'`, '/datalake/raw/alerts', true);

    await exportTableToHDFS('crossings', `SELECT * FROM public.crossings`, '/datalake/raw/crossings', true);
    await exportTableToHDFS('devices', `SELECT * FROM public.devices`, '/datalake/raw/devices', true);
    await exportTableToHDFS('device_components', `SELECT * FROM public.device_components`, '/datalake/raw/device_components', true);

    console.log("\nSemua proses ekspor ke Hadoop selesai!");
  } catch (err) {
    console.error("Terjadi Error:", err);
  } finally {
    pool.end();
  }
}

startExport();

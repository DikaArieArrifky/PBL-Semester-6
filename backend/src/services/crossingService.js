const pool = require('../config/database');

const PERIOD_TRUNC = {
  monthly:
    "DATE_TRUNC('month', t.detected_at AT TIME ZONE 'Asia/Jakarta')",

  yearly:
    "DATE_TRUNC('year', t.detected_at AT TIME ZONE 'Asia/Jakarta')",

  daily:
    "DATE_TRUNC('day', t.detected_at AT TIME ZONE 'Asia/Jakarta')",
};

async function getCrossings(req, res) {

  try {

    const { rows } = await pool.query(
      'SELECT * FROM crossings ORDER BY created_at DESC'
    );

    res.json(rows);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
}

async function getAnalytics(req, res) {

  const { id } = req.params;

  const period = req.query.period;

  const groupBy =
    PERIOD_TRUNC[period] ??
    PERIOD_TRUNC.daily;

  try {

    const { rows } = await pool.query(
      `SELECT
          ${groupBy} AS tanggal,
          COUNT(*) AS total_kereta,
          COALESCE(
            AVG(t.duration_seconds),
            0
          ) AS rata_durasi,
          COALESCE(
            MAX(t.duration_seconds),
            0
          ) AS durasi_terlama
       FROM train t
       WHERE t.cross_id = $1
         AND t.resolved_at IS NOT NULL
       GROUP BY ${groupBy}
       ORDER BY tanggal ASC
       LIMIT 60`,
      [id]
    );

    res.json(
      rows.map(r => ({
        tanggal: r.tanggal,
        total_kereta:
          parseInt(r.total_kereta),

        rata_durasi:
          parseFloat(
            parseFloat(
              r.rata_durasi
            ).toFixed(1)
          ),

        durasi_terlama:
          parseInt(r.durasi_terlama)
      }))
    );

  } catch (err) {

    console.error(
      '[analytics] error:',
      err.message
    );

    res.status(500).json({
      error: err.message
    });
  }
}

module.exports = {
  getCrossings,
  getAnalytics
};
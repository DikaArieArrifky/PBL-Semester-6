const pool = require('../config/database');

const PERIOD_TRUNC = {
  monthly:
    "DATE_TRUNC('month', occurred_at AT TIME ZONE 'Asia/Jakarta')",

  yearly:
    "DATE_TRUNC('year', occurred_at AT TIME ZONE 'Asia/Jakarta')",

  daily:
    "DATE_TRUNC('day', occurred_at AT TIME ZONE 'Asia/Jakarta')",
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
      `WITH ordered_events AS (
         SELECT
           e.cross_id,
           e.event_type,
           e.occurred_at,
           LEAD(e.event_type) OVER (
             PARTITION BY e.cross_id
             ORDER BY e.occurred_at
           ) AS next_event_type,
           LEAD(e.occurred_at) OVER (
             PARTITION BY e.cross_id
             ORDER BY e.occurred_at
           ) AS next_occurred_at
         FROM gate_events e
         WHERE e.cross_id = $1
       ),
       closed_pairs AS (
         SELECT
           ${groupBy} AS tanggal,
           EXTRACT(EPOCH FROM (next_occurred_at - occurred_at)) AS duration_seconds
         FROM ordered_events
         WHERE event_type IN ('GATE_CLOSED', 'GATE_CLOSING')
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
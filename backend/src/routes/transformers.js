const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all transformers (optional filter by type)
router.get('/', async (req, res) => {
  try {
    const { type } = req.query; // ?type=L1 or L2 or SM
    let query = 'SELECT * FROM transformers';
    const params = [];
    if (type) {
      query += ' WHERE trf_type = ?';
      params.push(type);
    }
    query += ' ORDER BY trf_type, trf_id';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single transformer
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM transformers WHERE trf_id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Transformer not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ⭐ KEY API: GET connections of a transformer (upstream + downstream)
// This is used for the "onclick" popup on the map
router.get('/:id/connections', async (req, res) => {
  try {
    const id = req.params.id;

    // Get the transformer itself
    const [self] = await db.query('SELECT * FROM transformers WHERE trf_id = ?', [id]);
    if (!self.length) return res.status(404).json({ error: 'Not found' });

    const trf = self[0];
    let upstream = [];
    let downstream = [];
    let feeders = [];
    let peers = [];

    if (trf.trf_type === 'L1') {
      // Upstream: feeders connected to this L1
      const [f] = await db.query(`
        SELECT f.*, fl.is_primary FROM feeders f
        JOIN feeder_trf_links fl ON fl.feeder_id = f.feeder_id
        WHERE fl.trf_id = ?`, [id]);
      feeders = f;

      // Downstream: L2 transformers this L1 feeds
      const [d] = await db.query(`
        SELECT t.*, l.is_primary FROM transformers t
        JOIN trf_trf_links l ON l.target_trf_id = t.trf_id
        WHERE l.source_trf_id = ? AND l.link_type = 'upstream'`, [id]);
      downstream = d;

      // Peers: other L1 it can share power with
      const [p] = await db.query(`
        SELECT t.* FROM transformers t
        JOIN trf_trf_links l ON l.target_trf_id = t.trf_id
        WHERE l.source_trf_id = ? AND l.link_type = 'peer'`, [id]);
      peers = p;
    }

    if (trf.trf_type === 'L2') {
      // Upstream: L1 transformers feeding this L2
      const [u] = await db.query(`
        SELECT t.*, l.is_primary FROM transformers t
        JOIN trf_trf_links l ON l.source_trf_id = t.trf_id
        WHERE l.target_trf_id = ? AND l.link_type = 'upstream'`, [id]);
      upstream = u;

      // Downstream: Smart Meters under this L2
      const [d] = await db.query(`
        SELECT t.* FROM transformers t
        JOIN trf_trf_links l ON l.target_trf_id = t.trf_id
        WHERE l.source_trf_id = ? AND l.link_type = 'upstream'`, [id]);
      downstream = d;
    }

    if (trf.trf_type === 'SM') {
      // Upstream: L2 that feeds this SM
      const [u] = await db.query(`
        SELECT t.* FROM transformers t
        JOIN trf_trf_links l ON l.source_trf_id = t.trf_id
        WHERE l.target_trf_id = ? AND l.link_type = 'upstream'`, [id]);
      upstream = u;
      // No downstream for SM
    }

    res.json({ transformer: trf, feeders, upstream, downstream, peers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all links (for drawing lines on map)
router.get('/links/all', async (req, res) => {
  try {
    const [feederLinks] = await db.query(`
      SELECT fl.feeder_id as source, fl.trf_id as target, 'feeder-l1' as type, fl.is_primary,
             f.lat as source_lat, f.lng as source_lng, t.lat as target_lat, t.lng as target_lng
      FROM feeder_trf_links fl
      JOIN feeders f ON f.feeder_id = fl.feeder_id
      JOIN transformers t ON t.trf_id = fl.trf_id`);

    const [trfLinks] = await db.query(`
      SELECT l.source_trf_id as source, l.target_trf_id as target, l.link_type as type, l.is_primary,
             s.lat as source_lat, s.lng as source_lng, t.lat as target_lat, t.lng as target_lng,
             s.trf_type as source_type, t.trf_type as target_type
      FROM trf_trf_links l
      JOIN transformers s ON s.trf_id = l.source_trf_id
      JOIN transformers t ON t.trf_id = l.target_trf_id`);

    res.json({ feederLinks, trfLinks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create transformer
router.post('/', async (req, res) => {
  const { trf_id, trf_name, city, lat, lng, capacity_kva, voltage, trf_type } = req.body;
  try {
    await db.query(
      'INSERT INTO transformers (trf_id,trf_name,city,lat,lng,capacity_kva,voltage,trf_type) VALUES (?,?,?,?,?,?,?,?)',
      [trf_id, trf_name, city, lat, lng, capacity_kva, voltage, trf_type]
    );
    res.status(201).json({ message: 'Transformer created', trf_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all feeders
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM feeders ORDER BY feeder_id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single feeder
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM feeders WHERE feeder_id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Feeder not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET transformers connected to this feeder
router.get('/:id/transformers', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, fl.is_primary
      FROM transformers t
      JOIN feeder_trf_links fl ON fl.trf_id = t.trf_id
      WHERE fl.feeder_id = ?
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create feeder
router.post('/', async (req, res) => {
  const { feeder_id, feeder_name, state, city, lat, lng, capacity_mw, feeder_type } = req.body;
  try {
    await db.query(
      'INSERT INTO feeders (feeder_id,feeder_name,state,city,lat,lng,capacity_mw,feeder_type) VALUES (?,?,?,?,?,?,?,?)',
      [feeder_id, feeder_name, state, city, lat, lng, capacity_mw, feeder_type]
    );
    res.status(201).json({ message: 'Feeder created', feeder_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update feeder
router.put('/:id', async (req, res) => {
  const { feeder_name, state, city, lat, lng, capacity_mw, feeder_type, status } = req.body;
  try {
    await db.query(
      'UPDATE feeders SET feeder_name=?,state=?,city=?,lat=?,lng=?,capacity_mw=?,feeder_type=?,status=? WHERE feeder_id=?',
      [feeder_name, state, city, lat, lng, capacity_mw, feeder_type, status, req.params.id]
    );
    res.json({ message: 'Feeder updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

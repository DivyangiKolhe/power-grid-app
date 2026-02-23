const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/feeders',      require('./routes/feeders'));
app.use('/api/transformers', require('./routes/transformers'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', time: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

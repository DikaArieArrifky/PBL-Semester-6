const express = require('express');
const router = express.Router();

const {
  getCrossings,
  getAnalytics
} = require('../services/crossingService');

router.get('/crossings', getCrossings);

router.get('/crossings/:id/analytics', getAnalytics);

module.exports = router;
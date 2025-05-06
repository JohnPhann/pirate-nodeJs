const express = require('express');
const { getApiDocs } = require('../utils/apiDocs');

const router = express.Router();

/**
 * @route   GET /api/docs
 * @desc    Get API documentation
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json(getApiDocs());
});

module.exports = router; 
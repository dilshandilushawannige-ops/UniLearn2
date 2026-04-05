const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createAdminHostedSession } = require('../controllers/kuppiRequestController');

router.post('/sessions', protect, createAdminHostedSession);

module.exports = router;

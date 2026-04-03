const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const { getDashboardStats } = require('../controllers/adminController');

// All admin routes are protected by auth and admin role check
router.use(protect, adminAuth);

router.get('/dashboard-stats', getDashboardStats);

module.exports = router;
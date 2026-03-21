const express = require('express');
const router = express.Router();
const { getModules, createModule } = require('../controllers/moduleController');
const { protect } = require('../middleware/auth');

router.get('/', getModules);
router.post('/', protect, createModule);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  createResource,
  getResources,
  getResourceById,
  rateResource,
} = require('../controllers/resourceController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// POST /api/resources — auth required + file upload
router.post('/', protect, upload.single('file'), createResource);

// GET /api/resources?year=&semester=&moduleCode=&resourceType=
router.get('/', protect, getResources);

// GET /api/resources/:id
router.get('/:id', protect, getResourceById);

// POST /api/resources/:id/rate
router.post('/:id/rate', protect, rateResource);

module.exports = router;

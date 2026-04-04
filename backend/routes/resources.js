const express = require('express');
const router = express.Router();
const {
  createResource,
  getResources,
  getResourceById,
  rateResource,
  generateSummary,
  recordDownload,
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

// POST /api/resources/:id/download
router.post('/:id/download', recordDownload);

// POST /api/resources/:id/generate-summary
router.post('/:id/generate-summary', protect, generateSummary);

module.exports = router;

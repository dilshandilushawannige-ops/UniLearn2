// controllers/resourceController.js
const Resource = require('../models/Resource');
const { uploadToCloudinary } = require('../services/cloudinaryService');
const { extractTextFromPDF } = require('../services/pdfService');

// @desc  Upload / create a learning resource
// @route POST /api/resources
// @access Private
const createResource = async (req, res) => {
  try {
    const {
      title,
      year,
      semester,
      moduleCode,
      resourceType,
      lectureNo,
      lectureTitle,
      ytLink,
    } = req.body;

    if (!title || !year || !semester || !moduleCode || !resourceType) {
      return res.status(400).json({ message: 'title, year, semester, moduleCode and resourceType are required' });
    }

    if (resourceType === 'lecture_pdf' && !lectureNo) {
      return res.status(400).json({ message: 'lectureNo is required for lecture_pdf' });
    }

    let fileUrl = '';
    let filePublicId = '';
    let extractedText = '';

    // Handle file upload
    if (req.file) {
      const isPDF =
        req.file.mimetype === 'application/pdf' || req.file.originalname.endsWith('.pdf');

      const { url, publicId } = await uploadToCloudinary(
        req.file.buffer,
        'studyplan/resources',
        'raw'
      );
      fileUrl = url;
      filePublicId = publicId;

      if (isPDF) {
        extractedText = await extractTextFromPDF(req.file.buffer);
      }
    }

    const resource = await Resource.create({
      uploader: req.user._id,
      title,
      year: Number(year),
      semester: Number(semester),
      moduleCode: moduleCode.toUpperCase(),
      resourceType,
      lectureNo: lectureNo ? Number(lectureNo) : null,
      lectureTitle: lectureTitle || '',
      fileUrl,
      filePublicId,
      extractedText,
      ytLink: ytLink || '',
    });

    res.status(201).json(resource);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get resources (filterable)
// @route GET /api/resources?year=&semester=&moduleCode=&resourceType=
// @access Public (auth optional)
const getResources = async (req, res) => {
  try {
    const { year, semester, moduleCode, resourceType } = req.query;
    const filter = {};
    if (year) filter.year = Number(year);
    if (semester) filter.semester = Number(semester);
    if (moduleCode) filter.moduleCode = moduleCode.toUpperCase();
    if (resourceType) filter.resourceType = resourceType;

    const resources = await Resource.find(filter)
      .populate('uploader', 'username email')
      .sort({ moduleCode: 1, lectureNo: 1, createdAt: -1 });

    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get a single resource
// @route GET /api/resources/:id
// @access Public
const getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id).populate('uploader', 'username email');
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    res.json(resource);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createResource, getResources, getResourceById };

// controllers/resourceController.js
const Resource = require('../models/Resource');
const { uploadToCloudinary } = require('../services/cloudinaryService');
const { extractTextFromPDF } = require('../services/pdfService');
const { generateResourceSummary } = require('../services/geminiService');

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

    // Check for duplicate resource
    const existingResource = await Resource.findOne({
      title: title.trim(),
      moduleCode: moduleCode.toUpperCase(),
      resourceType: resourceType,
    });

    if (existingResource) {
      return res.status(409).json({
        message: 'Duplication detected: A resource with the same Title, Module Code, and Resource Type already exists.',
        isDuplicate: true
      });
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

    let summary = '';
    if (extractedText && extractedText.trim().length > 50) {
      try {
        // Truncate to avoid massive token costs/limits (e.g. first 15000 chars)
        const textForSummary = extractedText.substring(0, 15000);
        summary = await generateResourceSummary(textForSummary);
      } catch (err) {
        console.error('Failed to generate summary:', err);
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
      summary,
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

// @desc  Rate a resource
// @route POST /api/resources/:id/rate
// @access Private
const rateResource = async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Please provide a valid rating between 1 and 5' });
    }

    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    // Check if user already rated
    const existingRatingIndex = resource.ratings.findIndex(
      (r) => r.user && r.user.toString() === req.user._id.toString()
    );

    if (existingRatingIndex >= 0) {
      // Update existing rating
      resource.ratings[existingRatingIndex].rating = Number(rating);
    } else {
      // Add new rating
      resource.ratings.push({
        user: req.user._id,
        rating: Number(rating)
      });
    }

    // Recalculate average
    resource.ratingCount = resource.ratings.length;
    const sum = resource.ratings.reduce((acc, curr) => acc + curr.rating, 0);
    resource.averageRating = sum / resource.ratingCount;

    await resource.save();
    res.json({
      averageRating: resource.averageRating,
      ratingCount: resource.ratingCount,
      message: 'Rating submitted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Generate AI Summary on demand
// @route POST /api/resources/:id/generate-summary
// @access Private
const generateSummary = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    if (resource.summary) {
      return res.json({ summary: resource.summary });
    }

    if (!resource.extractedText || resource.extractedText.trim().length < 20) {
      return res.status(400).json({ message: 'Not enough text extracted from this PDF to generate a summary.' });
    }

    const { generateResourceSummary } = require('../services/geminiService');
    const textForSummary = resource.extractedText.substring(0, 15000);
    const summary = await generateResourceSummary(textForSummary);

    if (summary) {
      resource.summary = summary;
      await resource.save();
    }

    res.json({ summary: resource.summary });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ message: 'Failed to generate summary' });
  }
};

module.exports = { createResource, getResources, getResourceById, rateResource, generateSummary };

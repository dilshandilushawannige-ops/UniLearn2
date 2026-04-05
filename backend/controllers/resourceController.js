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

    if (resourceType !== 'yt_link' && !req.file) {
      return res.status(400).json({ message: 'A file document is required for this resource type.' });
    }

    if (resourceType === 'yt_link' && !ytLink) {
      return res.status(400).json({ message: 'A valid YouTube link is required.' });
    }

    // Check for duplicate resource based on module code, lecture number, and lecture title
    if (resourceType === 'lecture_pdf' && lectureNo && lectureTitle) {
      const existingResource = await Resource.findOne({
        moduleCode: moduleCode.toUpperCase(),
        lectureNo: Number(lectureNo),
        lectureTitle: lectureTitle.trim(),
      });

      if (existingResource) {
        return res.status(409).json({
          message: `Duplication detected: A lecture PDF with module code (${moduleCode.toUpperCase()}), lecture number (${lectureNo}), and lecture title (${lectureTitle}) already exists.`,
          isDuplicate: true
        });
      }
    } else if (resourceType === 'past_paper' || resourceType === 'short_note') {
      const existingResource = await Resource.findOne({
        moduleCode: moduleCode.toUpperCase(),
        title: title.trim(),
        resourceType: resourceType,
      });

      if (existingResource) {
        const typeLabel = resourceType === 'past_paper' ? 'Past Paper' : 'Short Note';
        return res.status(409).json({
          message: `Duplication detected: A ${typeLabel} with module code (${moduleCode.toUpperCase()}) and title (${title.trim()}) already exists.`,
          isDuplicate: true
        });
      }
    } else if (resourceType === 'yt_link' && ytLink) {
      const existingResource = await Resource.findOne({
        ytLink: ytLink.trim(),
      });

      if (existingResource) {
        return res.status(409).json({
          message: 'Duplication detected: A YouTube resource with this exact link already exists.',
          isDuplicate: true
        });
      }
    } else {
      // Fallback for other resources that don't have lectureNo/Title
      const existingFallback = await Resource.findOne({
        title: title.trim(),
        moduleCode: moduleCode.toUpperCase(),
        resourceType: resourceType,
      });

      if (existingFallback) {
        return res.status(409).json({
          message: 'Duplication detected: A resource with the same Title, Module Code, and Resource Type already exists.',
          isDuplicate: true
        });
      }
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
    const { year, semester, moduleCode, resourceType, uploader } = req.query;
    const filter = {};
    if (year) filter.year = Number(year);
    if (semester) filter.semester = Number(semester);
    if (moduleCode) filter.moduleCode = moduleCode.toUpperCase();
    if (resourceType) filter.resourceType = resourceType;
    if (uploader) filter.uploader = uploader;

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
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).populate('uploader', 'username email');

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

// @desc  Record a download for a resource
// @route POST /api/resources/:id/download
// @access Public (or Private)
const recordDownload = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloadCount: 1 } },
      { new: true }
    );
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    res.json({ downloadCount: resource.downloadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Delete a resource
// @route DELETE /api/resources/:id
// @access Private
const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    // Only uploader or admin can delete
    if (resource.uploader.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to delete this resource' });
    }

    await resource.deleteOne();
    res.json({ message: 'Resource removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Update a resource
// @route PUT /api/resources/:id
// @access Private
const updateResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    // Only uploader or admin can update
    if (resource.uploader.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to update this resource' });
    }

    const { title, year, semester, moduleCode, resourceType, lectureNo, lectureTitle, ytLink } = req.body;

    if (title) resource.title = title;
    if (year) resource.year = Number(year);
    if (semester) resource.semester = Number(semester);
    if (moduleCode) resource.moduleCode = moduleCode.toUpperCase();
    if (resourceType) resource.resourceType = resourceType;
    if (lectureNo !== undefined) resource.lectureNo = lectureNo ? Number(lectureNo) : null;
    if (lectureTitle !== undefined) resource.lectureTitle = lectureTitle;
    if (ytLink !== undefined) resource.ytLink = ytLink;

    const updatedResource = await resource.save();
    res.json(updatedResource);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createResource, getResources, getResourceById, rateResource, generateSummary, recordDownload, deleteResource, updateResource };

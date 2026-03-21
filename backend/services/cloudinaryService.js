// services/cloudinaryService.js
// Uploads a buffer to Cloudinary using a stream
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

/**
 * Upload a buffer to Cloudinary
 * @param {Buffer} buffer - file buffer
 * @param {string} folder - Cloudinary folder
 * @param {string} resourceType - 'raw' for PDF, 'image' for images
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadToCloudinary = (buffer, folder = 'studyplan', resourceType = 'raw') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Delete a file from Cloudinary by publicId
 * @param {string} publicId
 * @param {string} resourceType
 */
const deleteFromCloudinary = async (publicId, resourceType = 'raw') => {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };

// services/pdfService.js
// Extracts plain text from a PDF buffer using pdf-parse
const pdfParse = require('pdf-parse');

/**
 * @param {Buffer} buffer - The PDF file buffer
 * @returns {Promise<string>} extracted text
 */
const extractTextFromPDF = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (err) {
    console.error('PDF parsing error:', err.message);
    return '';
  }
};

module.exports = { extractTextFromPDF };

const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true, min: 1, max: 4 },
    semester: { type: Number, required: true, min: 1, max: 2 },
    moduleCode: { type: String, required: true, uppercase: true, trim: true },
    moduleName: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

moduleSchema.index({ year: 1, semester: 1 });
moduleSchema.index({ moduleCode: 1 }, { unique: true });

module.exports = mongoose.model('Module', moduleSchema);

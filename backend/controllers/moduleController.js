// controllers/moduleController.js
const Module = require('../models/Module');

// @desc  Get modules, optionally filtered by year/semester
// @route GET /api/modules?year=&semester=
// @access Public
const getModules = async (req, res) => {
  try {
    const filter = {};
    if (req.query.year) filter.year = Number(req.query.year);
    if (req.query.semester) filter.semester = Number(req.query.semester);

    const modules = await Module.find(filter).sort({ year: 1, semester: 1, moduleCode: 1 });
    res.json(modules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Create a module (admin-level, not guarded for demo)
// @route POST /api/modules
// @access Private
const createModule = async (req, res) => {
  try {
    const { year, semester, moduleCode, moduleName } = req.body;
    if (!year || !semester || !moduleCode || !moduleName) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const mod = await Module.create({ year, semester, moduleCode: moduleCode.toUpperCase(), moduleName });
    res.status(201).json(mod);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Module code already exists' });
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getModules, createModule };

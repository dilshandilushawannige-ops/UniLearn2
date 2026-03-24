// scripts/seedModules.js
// Run: npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const Module = require('../models/Module');

const modules = [
  // ── Year 1, Semester 1 ──────────────────────────────────────────────────────
  { year: 1, semester: 1, moduleCode: 'IT1010', moduleName: 'Introduction to Programming' },
  { year: 1, semester: 1, moduleCode: 'IT1020', moduleName: 'Introduction to Computer Systems' },
  { year: 1, semester: 1, moduleCode: 'IT1030', moduleName: 'Mathematics for Computing' },
  { year: 1, semester: 1, moduleCode: 'IT1040', moduleName: 'Communication Skills' },

  // ── Year 1, Semester 2 ──────────────────────────────────────────────────────
  { year: 1, semester: 2, moduleCode: 'IT1050', moduleName: 'Object Oriented Concepts' },
  { year: 1, semester: 2, moduleCode: 'IT1060', moduleName: 'Software Process Modeling' },
  { year: 1, semester: 2, moduleCode: 'IT1080', moduleName: 'English for Academic Purposes' },
  { year: 1, semester: 2, moduleCode: 'IT1090', moduleName: 'Information Systems & Data Modeling' },
  { year: 1, semester: 2, moduleCode: 'IT1100', moduleName: 'Internet & Web Technologies' },

  // ── Year 2, Semester 1 ──────────────────────────────────────────────────────
  { year: 2, semester: 1, moduleCode: 'IT2010', moduleName: 'Data Structures & Algorithms' },
  { year: 2, semester: 1, moduleCode: 'IT2020', moduleName: 'Database Management Systems' },
  { year: 2, semester: 1, moduleCode: 'IT2030', moduleName: 'Operating Systems' },
  { year: 2, semester: 1, moduleCode: 'IT2040', moduleName: 'Statistics & Probability' },

  // ── Year 2, Semester 2 ──────────────────────────────────────────────────────
  { year: 2, semester: 2, moduleCode: 'IT2050', moduleName: 'Computer Networks' },
  { year: 2, semester: 2, moduleCode: 'IT2060', moduleName: 'Software Engineering' },
  { year: 2, semester: 2, moduleCode: 'IT2070', moduleName: 'Human-Computer Interaction' },

  // ── Year 3, Semester 1 ──────────────────────────────────────────────────────
  { year: 3, semester: 1, moduleCode: 'IT3010', moduleName: 'Machine Learning' },
  { year: 3, semester: 1, moduleCode: 'IT3020', moduleName: 'Advanced Database Systems' },
  { year: 3, semester: 1, moduleCode: 'IT3030', moduleName: 'Cloud Computing' },
  { year: 3, semester: 1, moduleCode: 'IT3040', moduleName: 'Information Security' },

  // ── Year 3, Semester 2 ──────────────────────────────────────────────────────
  { year: 3, semester: 2, moduleCode: 'IT3050', moduleName: 'Artificial Intelligence' },
  { year: 3, semester: 2, moduleCode: 'IT3060', moduleName: 'Mobile Application Development' },
  { year: 3, semester: 2, moduleCode: 'IT3070', moduleName: 'Distributed Systems' },

  // ── Year 4, Semester 1 ──────────────────────────────────────────────────────
  { year: 4, semester: 1, moduleCode: 'IT4010', moduleName: 'Research Methods in IT' },
  { year: 4, semester: 1, moduleCode: 'IT4020', moduleName: 'Advanced Software Architecture' },
  { year: 4, semester: 1, moduleCode: 'IT4030', moduleName: 'Big Data Analytics' },

  // ── Year 4, Semester 2 ──────────────────────────────────────────────────────
  { year: 4, semester: 2, moduleCode: 'IT4040', moduleName: 'Final Year Project' },
  { year: 4, semester: 2, moduleCode: 'IT4050', moduleName: 'IT Project Management' },
  { year: 4, semester: 2, moduleCode: 'IT4060', moduleName: 'Emerging Technologies' },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    await Module.deleteMany({});
    console.log('Cleared existing modules');

    await Module.insertMany(modules);
    console.log(`Inserted ${modules.length} modules successfully`);

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

seed();

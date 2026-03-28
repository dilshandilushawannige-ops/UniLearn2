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

  { year: 2, semester: 1, moduleCode: 'IT2020', moduleName: 'Software Engineering' },
  { year: 2, semester: 1, moduleCode: 'IT2030', moduleName: '	Object Oriented Programming ' },
  { year: 2, semester: 1, moduleCode: 'IT2040', moduleName: 'Database Management Systems' },
  { year: 2, semester: 1, moduleCode: 'IT2050', moduleName: 'Computer Networks' },
  { year: 2, semester: 1, moduleCode: 'IT2060', moduleName: 'Operating Systems and System Administration' },

  // ── Year 2, Semester 2 ──────────────────────────────────────────────────────
  { year: 2, semester: 2, moduleCode: 'IT2010', moduleName: 'Mobile Application Development' },
  { year: 2, semester: 2, moduleCode: 'IT2070', moduleName: 'Data Structures & Algorithms' },
  { year: 2, semester: 2, moduleCode: 'IT2080', moduleName: 'IT Project' },
  { year: 2, semester: 2, moduleCode: 'IT2090', moduleName: 'Professional Skills' },
  { year: 2, semester: 2, moduleCode: 'IT2100', moduleName: 'Employability Skills Development - Seminar' },
  { year: 2, semester: 2, moduleCode: 'IT2110', moduleName: 'Probability & Statistics' },


  // ── Year 3, Semester 1 ──────────────────────────────────────────────────────
  { year: 3, semester: 1, moduleCode: 'IT3010', moduleName: 'Network Design and Management' },
  { year: 3, semester: 1, moduleCode: 'IT3020', moduleName: 'Database Systems' },
  { year: 3, semester: 1, moduleCode: 'IT3030', moduleName: 'Programming Applications and Frameworks' },
  { year: 3, semester: 1, moduleCode: 'IT3040', moduleName: 'IT Project Management' },
  { year: 3, semester: 1, moduleCode: 'IT3050', moduleName: 'Employability Skills Development - Seminar' },


  // ── Year 3, Semester 2 ──────────────────────────────────────────────────────
  { year: 3, semester: 2, moduleCode: 'IT3060', moduleName: 'Human Computer Interaction' },
  { year: 3, semester: 2, moduleCode: 'IT3070', moduleName: 'Information Assurance & Security' },
  { year: 3, semester: 2, moduleCode: 'IT3080', moduleName: 'Data Science & Analytics ' },
  { year: 3, semester: 2, moduleCode: 'IT3090', moduleName: 'Business Management for IT' },


  // ── Year 4, Semester 1 ──────────────────────────────────────────────────────
  { year: 4, semester: 1, moduleCode: 'IT4010', moduleName: 'Research Methods in IT' },
  { year: 4, semester: 1, moduleCode: 'IT4030', moduleName: 'Internet of Things' },
  { year: 4, semester: 1, moduleCode: 'IT4040', moduleName: 'Database Administration' },
  { year: 4, semester: 1, moduleCode: 'IT4050', moduleName: 'Innovation Management & Entrepreneurship ' },
  { year: 4, semester: 1, moduleCode: 'IT4060', moduleName: 'Robotics & Intelligent Systems' },

  // ── Year 4, Semester 2 ──────────────────────────────────────────────────────
  { year: 4, semester: 2, moduleCode: 'IT4100', moduleName: 'Software Quality Assurance' },
  { year: 4, semester: 2, moduleCode: 'IT4110', moduleName: 'Computer Systems and Network Administration' },
  { year: 4, semester: 2, moduleCode: 'IT4130', moduleName: 'Image Understanding & Processing' },
  { year: 4, semester: 2, moduleCode: 'IT4140', moduleName: 'Industry Placement' },
  { year: 4, semester: 2, moduleCode: 'IT4120', moduleName: 'Machine Learning' },
  { year: 4, semester: 2, moduleCode: 'IT4070', moduleName: 'Preparation for the Professional World' },
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

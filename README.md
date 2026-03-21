# UniLearn2# StudyPlan AI — Full-Stack MERN Project

> AI-powered study plan and MCQ generator for university students.  
> Built with MongoDB + Express + React + Node, Gemini AI, Cloudinary, Multer, and JWT auth.

---

## Project Structure

```
studyPlan2/
├── backend/
│   ├── config/
│   │   ├── db.js                  # MongoDB connection
│   │   └── cloudinary.js          # Cloudinary config
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── moduleController.js
│   │   ├── resourceController.js
│   │   ├── studyPlanController.js
│   │   └── mcqController.js
│   ├── middleware/
│   │   ├── auth.js                # JWT protect middleware
│   │   └── upload.js              # Multer memory storage
│   ├── models/
│   │   ├── User.js
│   │   ├── Module.js
│   │   ├── Resource.js
│   │   ├── StudyPlan.js
│   │   └── MCQSet.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── modules.js
│   │   ├── resources.js
│   │   ├── studyPlans.js
│   │   └── mcqs.js
│   ├── scripts/
│   │   └── seedModules.js         # Sample module seeder
│   ├── services/
│   │   ├── cloudinaryService.js   # Stream-upload to Cloudinary
│   │   ├── pdfService.js          # pdf-parse text extraction
│   │   └── geminiService.js       # Gemini AI (study plan + MCQ)
│   ├── server.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/
    │   │   ├── axios.js            # Axios instance + interceptors
    │   │   ├── auth.js
    │   │   ├── modules.js
    │   │   ├── resources.js
    │   │   ├── studyPlans.js
    │   │   └── mcqs.js
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Register.jsx
    │   │   ├── Login.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Resources.jsx
    │   │   ├── StudyPlan.jsx
    │   │   └── MCQ.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── .env.example
    └── package.json
```

---

## Prerequisites

- Node.js 18+
- MongoDB (Atlas or local)
- Cloudinary account
- Google Gemini API key

---

## Step 1 — Clone / Open the Project

```bash
cd "d:\3rd year project\studyPlan2"
```

---

## Step 2 — Configure Backend Environment Variables

```bash
cd backend
copy .env.example .env
```

Open `backend/.env` and fill in:

```env
PORT=5000
CLIENT_URL=http://localhost:5173

# MongoDB Atlas URI (replace <username>, <password>, cluster URL)
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/studyplan?retryWrites=true&w=majority

# JWT — use any long random string
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Gemini
GEMINI_API_KEY=your_gemini_api_key
```

---

## Step 3 — Configure Cloudinary

1. Sign up at https://cloudinary.com (free tier is enough)
2. In your Cloudinary dashboard, find:
   - **Cloud Name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`
3. Paste these into `backend/.env`

PDFs are stored under the `studyplan/resources` folder in Cloudinary automatically.

---

## Step 4 — Configure Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key
3. Copy it into `GEMINI_API_KEY` in `backend/.env`

The project uses the `gemini-1.5-flash` model via `@google/generative-ai`.

---

## Step 5 — Install Dependencies

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd ../frontend
npm install
```

---

## Step 6 — Seed Sample Modules

```bash
cd backend
npm run seed
```

This inserts 26 sample modules (Year 1–4, Semester 1–2) including **IT3020 – Advanced Database Systems** (Year 3, Sem 1).

---

## Step 7 — Run the Servers

Open **two terminals**:

### Terminal 1 — Backend
```bash
cd backend
npm run dev        # uses nodemon for auto-reload
# OR:
npm start          # without nodemon
```

Server runs at: http://localhost:5000

### Terminal 2 — Frontend
```bash
cd frontend
npm run dev
```

App runs at: http://localhost:5173

---

## API Endpoints Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | ✅ | Get logged-in profile |

### Modules
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/modules?year=&semester=` | — | List modules |
| POST | `/api/modules` | ✅ | Create module |

### Resources
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/resources` | ✅ | Upload resource (multipart) |
| GET | `/api/resources?year=&semester=&moduleCode=&resourceType=` | — | List resources |
| GET | `/api/resources/:id` | — | Get single resource |

### Study Plans
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/studyplans/generate` | ✅ | Generate AI study plan |
| GET | `/api/studyplans?moduleCode=` | ✅ | List user plans |
| GET | `/api/studyplans/:id` | ✅ | Get single plan |
| PATCH | `/api/studyplans/:id/progress` | ✅ | Update day completion |

### MCQs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/mcqs/generate` | ✅ | Generate MCQ set |
| GET | `/api/mcqs?moduleCode=` | ✅ | List user MCQ sets |
| GET | `/api/mcqs/:id` | ✅ | Get MCQ set |
| POST | `/api/mcqs/:id/submit` | ✅ | Submit answers |

---

## Gemini Prompt Templates

### A) Study Plan (`geminiService.js > generateStudyPlan`)

```
You are a study plan generator. Your task is to create a detailed, structured study plan
EXCLUSIVELY from the lecture content provided below. Do NOT use any knowledge outside the provided text.

MODULE: {moduleCode}
EXAM DATE: {examDate}
TODAY: {today}
DAYS AVAILABLE: {daysAvailable}

LECTURE CONTENT (use ONLY this):
---
{concatenated extracted lecture text}
---

Respond with ONLY valid JSON:
{
  "moduleCode": "...",
  "examDate": "...",
  "totalDays": N,
  "days": [{ "day": 1, "date": "...", "focus": "...", "topics": [...], "activities": [...], "estimatedHours": N }],
  "summary": "..."
}
```

### B) MCQ Generation (`geminiService.js > generateMCQs`)

```
You are an MCQ generator. Create {N} multiple-choice questions EXCLUSIVELY from the lecture content.
Do NOT use any outside knowledge.

MODULE: {moduleCode}
LECTURE CONTENT:
---
{concatenated extracted lecture text}
---

Respond with ONLY valid JSON:
{
  "moduleCode": "...",
  "questions": [{ "q": "...", "options": ["A","B","C","D"], "answerIndex": 0, "explanation": "..." }]
}
```

Both prompts include a retry mechanism: if Gemini returns non-JSON, the service retries with an explicit instruction for raw JSON output.

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| `MongooseServerSelectionError` | Check `MONGO_URI` is correct and IP is whitelisted in Atlas |
| `Cloudinary Error` | Verify `CLOUD_NAME`, `API_KEY`, `API_SECRET` in `.env` |
| `Gemini API error` | Check `GEMINI_API_KEY` is valid and has quota |
| PDF text empty | Some scanned PDFs have no text layer. Use text-based PDFs |
| CORS error | Ensure `CLIENT_URL=http://localhost:5173` in backend `.env` |
| `npm run seed` fails | Make sure `.env` with `MONGO_URI` is in `backend/` |

---

## Features Summary

- ✅ JWT Auth (register/login/protected routes)
- ✅ Module catalog with Year/Semester filter + seed script
- ✅ Resource upload (PDF → Cloudinary → pdf-parse text extraction → MongoDB)
- ✅ AI Study Plan generation (Gemini, JSON-only, extracted text only)
- ✅ Day-by-day checklist with progress % tracking
- ✅ AI MCQ generation (Gemini, 4-option, with explanations)
- ✅ MCQ attempt submission with score + best score tracking
- ✅ Clean responsive React frontend (no heavy UI framework)

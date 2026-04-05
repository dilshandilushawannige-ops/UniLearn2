# Admin CLI Login System - Complete Setup Guide

## ✅ System Components Already in Place

- ✓ `User` model with `role` field (enum: 'student' | 'admin')
- ✓ `adminAuth` middleware - protects admin routes
- ✓ `/api/admin` routes - registered in server
- ✓ `adminController` - serves admin dashboard stats
- ✓ `createAdmin.js` CLI script - creates admins via terminal
- ✓ Login returns user `role` in response
- ✓ Login.jsx redirects based on role

---

## 📋 Step-by-Step Setup

### Step 1: Create Admin Account (Terminal)

```bash
# Navigate to backend folder
cd backend

# Run the admin creation script
node scripts/createAdmin.js
```

**Expected prompts:**
```
✓ Connected to MongoDB

Enter admin email: admin@my.sliit.lk
Enter admin password (min 6 characters): password123
Confirm password: password123

✓ Admin account created successfully!
📧 Email: admin@my.sliit.lk
👤 Username: admin
🔑 Role: admin
```

**Requirements:**
- Email must end with `@my.sliit.lk`
- Password minimum 6 characters
- Cannot duplicate existing emails
- Password is auto-hashed via bcrypt pre-save hook
- Year/Semester auto-set to 1, 1 (default admin values)

---

### Step 2: Start Backend Server

```bash
# From backend folder (if not already there)
cd backend

# Start the development server
npm run dev
```

**Expected output:**
```
> backend@1.0.0 dev
> nodemon server.js

Server running on port: 5001
MongoDB Connected: mongodb+srv://...
Socket.IO initialized for localhost:5173
```

**Verification:**
```bash
# In new terminal, check health endpoint
curl http://localhost:5001/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2026-03-27T12:00:00.000Z"
}
```

---

### Step 3: Start Frontend Server

```bash
# Navigate to frontend folder
cd frontend

# Start Vite dev server
npm run dev
```

**Expected output:**
```
  VITE v5.3.1  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  Press q to quit
```

---

## 🧪 Testing the Admin Login Workflow

### Test 1: Admin Login Redirect

1. Open browser: `http://localhost:5173/login`
2. Enter credentials:
   - Email: `admin@my.sliit.lk` (your created admin email)
   - Password: `password123` (your created admin password)
3. Click "Login"

**Expected behavior:**
- Form submits successfully
- Page redirects to `/admin-dashboard`
- Token stored in localStorage
- User role is 'admin'

### Test 2: Admin API Access

```bash
# Get admin JWT token from browser localStorage (login first, then check DevTools → Application → localStorage)
# Copy the token value

# Then test protected endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5001/api/admin/dashboard-stats
```

**Expected response (200 OK):**
```json
{
  "totalLiveClasses": 0,
  "totalKuppiRequests": 0,
  "flaggedContentCount": 0,
  "suspendedUsersCount": 0
}
```

### Test 3: Student Login Still Works

1. Open browser: `http://localhost:5173/signup`
2. Create student account: `student123@my.sliit.lk`
3. Click Signup
4. Login with student credentials
5. Should redirect to `/user-dashboard` (NOT `/admin-dashboard`)

### Test 4: Admin Route Protection

```bash
# Without token (should fail with 401)
curl http://localhost:5001/api/admin/dashboard-stats
# Expected: {"message": "Not authenticated", "status": 401}

# Without admin role (should fail with 403)
# Use a student's JWT token from browser
curl -H "Authorization: Bearer STUDENT_TOKEN" http://localhost:5001/api/admin/dashboard-stats
# Expected: {"message": "Admin access required", "status": 403}
```

---

## 🔐 Authentication Flow

### Administrator Login
```
1. User enters email (must end @my.sliit.lk) + password
2. Frontend POST /auth/login
3. Backend validates credentials via bcrypt
4. Returns JWT token + user object with role='admin'
5. Frontend checks user.role
6. Redirects to /admin-dashboard
7. Admin routes protected by @protect + @adminAuth middleware
```

### Student Login
```
1. User enters email + password
2. Frontend POST /auth/login
3. Backend validates credentials
4. Returns JWT token + user object with role='student'
5. Frontend checks user.role (not admin)
6. Redirects to /user-dashboard
7. Student routes use only @protect middleware
```

---

## 📁 Key Files Modified/Created

| File | Purpose | Status |
|------|---------|--------|
| `backend/scripts/createAdmin.js` | CLI admin creation script | ✅ Updated (year/sem: 1,1) |
| `frontend/src/pages/Login.jsx` | Login page with role-based redirect | ✅ Updated |
| `backend/middleware/adminAuth.js` | Role verification middleware | ✅ Existing |
| `backend/routes/admin.js` | Admin API routes | ✅ Existing |
| `backend/controllers/adminController.js` | Admin dashboard logic | ✅ Existing |
| `backend/models/User.js` | User schema with role field | ✅ Existing |

---

## 🚀 Quick Reference - Common Commands

```bash
# Create new admin
node backend/scripts/createAdmin.js

# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm run dev

# Check backend health
curl http://localhost:5001/health

# Get admin stats (after login in browser)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5001/api/admin/dashboard-stats

# Kill all node processes if port stuck
taskkill /IM node.exe /F

# Check if port 5001 is in use
Get-NetTCPConnection -LocalPort 5001 | Where-Object State -eq "Listen"
```

---

## 🐛 Troubleshooting

### "Port 5001 already in use"
```bash
taskkill /IM node.exe /F
# Then restart: cd backend && npm run dev
```

### "Admin email must end with @my.sliit.lk"
```
✅ Working as intended. Use admin@my.sliit.lk or similar
```

### "Email already registered"
```
Admin with this email already exists. Use different email or delete user from MongoDB:
db.users.deleteOne({ email: 'admin@my.sliit.lk' })
```

### "Redirects to /user-dashboard instead of /admin-dashboard"
```
❌ Issue: User.role not 'admin'
✅ Solution: Verify admin account created with role: 'admin' in MongoDB:
db.users.findOne({ email: 'admin@my.sliit.lk' })
```

### "Token not working for admin routes"
```
❌ Issue: JWT token missing or invalid
✅ Solution:
1. Verify token in browser: DevTools → Application → localStorage → token
2. Include in curl: Authorization: Bearer <token>
3. Re-login if token is old
```

---

## 📝 Database Verification

After creating admin, verify in MongoDB:

```bash
# Connect to MongoDB Atlas
# Then run queries:

# Check admin exists
db.users.findOne({ email: 'admin@my.sliit.lk' })

# Expected output (password will be hashed):
{
  "_id": ObjectId("..."),
  "username": "admin",
  "email": "admin@my.sliit.lk",
  "role": "admin",
  "currentYear": 1,
  "currentSemester": 1,
  "password": "$2a$10$...", // bcrypt hashed
  "createdAt": ISODate("2026-03-27T12:00:00Z")
}

# Count total admins
db.users.countDocuments({ role: 'admin' })
```

---

## ✨ Admin Dashboard Route

After login as admin, you can access:
- Frontend: `http://localhost:5173/admin-dashboard`
- API: `GET /api/admin/dashboard-stats` (returns stats JSON)

Extend with more admin endpoints by adding routes to `backend/routes/admin.js`:
```javascript
router.post('/suspend-user/:userId', suspendUser);
router.get('/flagged-content', getFlaggedContent);
router.put('/content/:contentId/approve', approveContent);
```

---

## 🎯 Summary

✅ Admin creation: `node backend/scripts/createAdmin.js`
✅ Backend running: `npm run dev` (from backend folder)
✅ Frontend running: `npm run dev` (from frontend folder)
✅ Admin login redirects to `/admin-dashboard`
✅ Student login redirects to `/user-dashboard`
✅ Admin routes protected by `@protect` + `@adminAuth`
✅ Both roles use same login API
✅ Passwords hashed via bcrypt

You're ready to deploy! 🚀

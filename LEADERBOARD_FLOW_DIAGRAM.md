# Leaderboard System - Flow Diagrams

## 🎮 Battle → Stats Update → Leaderboard Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     QUIZ BATTLE SYSTEM                          │
└─────────────────────────────────────────────────────────────────┘

1. BATTLE STARTS
   ┌──────────────┐
   │ Player 1 vs  │
   │ Player 2     │
   └──────┬───────┘
          │
          ▼
2. BATTLE FINISHES
   ┌──────────────────────────────┐
   │ Socket: battle:finished      │
   │ - Determine winner           │
   │ - Calculate scores           │
   └──────────┬───────────────────┘
              │
              ▼
3. UPDATE STATS (gameSocket.js)
   ┌──────────────────────────────────────┐
   │ For each player:                     │
   │ ┌────────────────────────────────┐   │
   │ │ user.updateGameStats()         │   │
   │ │ - Update rating                │   │
   │ │ - Update wins/losses/draws     │   │
   │ │ - Update win streak            │   │
   │ │ - Save to database             │   │
   │ └────────────────────────────────┘   │
   └──────────┬───────────────────────────┘
              │
              ▼
4. DATABASE UPDATED
   ┌──────────────────────────────┐
   │ User.gameStats {             │
   │   rating: 1025,              │
   │   wins: 11,                  │
   │   losses: 4,                 │
   │   draws: 1,                  │
   │   totalMatches: 16,          │
   │   winStreak: 3               │
   │ }                            │
   └──────────┬───────────────────┘
              │
              ▼
5. USER VIEWS LEADERBOARD
   ┌──────────────────────────────┐
   │ GET /api/games/leaderboard   │
   └──────────┬───────────────────┘
              │
              ▼
6. LEADERBOARD SERVICE
   ┌────────────────────────────────────┐
   │ getGlobalLeaderboard()             │
   │ - Query users with matches         │
   │ - Sort by rating → wins → matches  │
   │ - Calculate ranks                  │
   │ - Return paginated results         │
   └──────────┬─────────────────────────┘
              │
              ▼
7. DISPLAY LEADERBOARD
   ┌──────────────────────────────┐
   │ ┌──────────────────────────┐ │
   │ │   TOP 3 PODIUM           │ │
   │ │  🥈  👑  🥉              │ │
   │ └──────────────────────────┘ │
   │ ┌──────────────────────────┐ │
   │ │   FULL RANKINGS TABLE    │ │
   │ │  #4  Player D  1050      │ │
   │ │  #5  Player E  1040      │ │
   │ │  ...                     │ │
   │ └──────────────────────────┘ │
   │ ┌──────────────────────────┐ │
   │ │   YOUR RANK: #12         │ │
   │ │   Rating: 1025           │ │
   │ └──────────────────────────┘ │
   └──────────────────────────────┘
```

## 📊 Rating Calculation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   RATING SYSTEM                             │
└─────────────────────────────────────────────────────────────┘

NEW USER
   │
   ├─→ Initial Rating: 1000
   │
   ▼
BATTLE RESULT
   │
   ├─→ WIN?
   │   ├─→ YES: rating += 25
   │   │        winStreak += 1
   │   │        wins += 1
   │   │
   │   ├─→ NO: DRAW?
   │   │   ├─→ YES: rating += 5
   │   │   │        winStreak = 0
   │   │   │        draws += 1
   │   │   │
   │   │   └─→ NO: rating -= 15 (min 0)
   │   │            winStreak = 0
   │   │            losses += 1
   │   │
   │   └─→ totalMatches += 1
   │
   ▼
UPDATE BEST STREAK
   │
   ├─→ IF winStreak > bestWinStreak
   │   └─→ bestWinStreak = winStreak
   │
   ▼
SAVE TO DATABASE
   │
   └─→ User.save()

EXAMPLES:
┌──────────────────────────────────────────────────┐
│ Starting: 1000                                   │
│ Win:      1000 + 25 = 1025                       │
│ Win:      1025 + 25 = 1050                       │
│ Loss:     1050 - 15 = 1035                       │
│ Draw:     1035 + 5  = 1040                       │
└──────────────────────────────────────────────────┘
```

## 🏆 Ranking Algorithm

```
┌─────────────────────────────────────────────────────────────┐
│                   RANKING LOGIC                             │
└─────────────────────────────────────────────────────────────┘

SORT USERS BY:
   │
   ├─→ 1. Rating (DESC)
   │   │
   │   ├─→ IF EQUAL
   │   │   │
   │   │   ├─→ 2. Wins (DESC)
   │   │   │   │
   │   │   │   ├─→ IF EQUAL
   │   │   │   │   │
   │   │   │   │   └─→ 3. Total Matches (DESC)
   │   │   │   │
   │   │   │   └─→ ASSIGN RANK
   │   │   │
   │   │   └─→ ASSIGN RANK
   │   │
   │   └─→ ASSIGN RANK
   │
   ▼
CALCULATE USER RANK
   │
   ├─→ Count users with better stats
   │   │
   │   └─→ rank = count + 1
   │
   ▼
RETURN RESULTS

EXAMPLE:
┌────────────────────────────────────────────────┐
│ User A: 1100 rating, 10 wins → Rank #5        │
│ User B: 1100 rating, 12 wins → Rank #4        │
│ User C: 1150 rating, 8 wins  → Rank #3        │
│                                                │
│ User C ranks higher (better rating)            │
│ User B ranks higher than A (more wins)         │
└────────────────────────────────────────────────┘
```

## 🔄 API Request Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   API REQUEST FLOW                          │
└─────────────────────────────────────────────────────────────┘

FRONTEND
   │
   ├─→ User clicks "View Leaderboard"
   │
   ▼
REACT COMPONENT (Leaderboard.jsx)
   │
   ├─→ useEffect() → fetchLeaderboard()
   │
   ▼
API SERVICE (leaderboard.js)
   │
   ├─→ axios.get('/games/leaderboard', { params })
   │
   ▼
BACKEND ROUTE (games.js)
   │
   ├─→ router.get('/leaderboard', getLeaderboard)
   │
   ▼
CONTROLLER (leaderboardController.js)
   │
   ├─→ Validate params
   ├─→ Call service
   │
   ▼
SERVICE (leaderboardService.js)
   │
   ├─→ Query database
   ├─→ Sort users
   ├─→ Calculate ranks
   ├─→ Get user's rank
   ├─→ Format response
   │
   ▼
DATABASE (MongoDB)
   │
   ├─→ Find users with gameStats.totalMatches > 0
   ├─→ Sort by rating, wins, totalMatches
   ├─→ Apply pagination
   │
   ▼
RESPONSE
   │
   ├─→ {
   │     items: [...],
   │     pagination: {...},
   │     me: {...}
   │   }
   │
   ▼
FRONTEND DISPLAY
   │
   ├─→ Render podium (top 3)
   ├─→ Render table (all users)
   ├─→ Render user rank card
   │
   └─→ User sees leaderboard
```

## 🗄️ Database Query Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE QUERIES                          │
└─────────────────────────────────────────────────────────────┘

GET LEADERBOARD
   │
   ▼
┌────────────────────────────────────────┐
│ User.find({                            │
│   'gameStats.totalMatches': { $gt: 0 }│
│ })                                     │
│ .select('username gameStats ...')     │
│ .sort({                                │
│   'gameStats.rating': -1,              │
│   'gameStats.wins': -1,                │
│   'gameStats.totalMatches': -1         │
│ })                                     │
│ .skip((page - 1) * limit)              │
│ .limit(limit)                          │
│ .lean()                                │
└────────────────────────────────────────┘
   │
   ▼
USES INDEX
   │
   └─→ { 'gameStats.rating': -1, 'gameStats.wins': -1 }
   │
   ▼
FAST QUERY (~50-100ms)

GET USER RANK
   │
   ▼
┌────────────────────────────────────────┐
│ User.countDocuments({                  │
│   'gameStats.totalMatches': { $gt: 0 },│
│   $or: [                               │
│     { 'gameStats.rating': { $gt: X }}, │
│     {                                  │
│       'gameStats.rating': X,           │
│       'gameStats.wins': { $gt: Y }     │
│     },                                 │
│     ...                                │
│   ]                                    │
│ })                                     │
└────────────────────────────────────────┘
   │
   ▼
COUNT + 1 = RANK
```

## 🎨 Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                   COMPONENT TREE                            │
└─────────────────────────────────────────────────────────────┘

App.jsx
 │
 └─→ DashboardLayout
      │
      ├─→ GameDashboard
      │    │
      │    ├─→ Hero Section
      │    │    ├─→ Stats Cards (with rank)
      │    │    └─→ Leaderboard Button
      │    │
      │    ├─→ Online Peers
      │    └─→ Recent Matches
      │
      └─→ Leaderboard
           │
           ├─→ Header
           │    ├─→ Breadcrumb
           │    └─→ Title
           │
           ├─→ Main Content
           │    │
           │    ├─→ Podium Section
           │    │    ├─→ 2nd Place Card
           │    │    ├─→ 1st Place Card
           │    │    └─→ 3rd Place Card
           │    │
           │    └─→ Table Section
           │         ├─→ Table Header
           │         ├─→ Table Rows
           │         │    ├─→ Rank Badge
           │         │    ├─→ Player Info
           │         │    ├─→ Rating
           │         │    ├─→ Stats
           │         │    └─→ Win Rate Bar
           │         │
           │         └─→ Pagination
           │
           └─→ Sidebar
                ├─→ User Rank Card
                │    ├─→ Rank Display
                │    ├─→ Stats Grid
                │    └─→ Streak Badge
                │
                └─→ Info Card
```

## 🔐 Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   AUTH FLOW                                 │
└─────────────────────────────────────────────────────────────┘

USER REQUEST
   │
   ├─→ GET /api/games/leaderboard
   │   Headers: { Authorization: 'Bearer TOKEN' }
   │
   ▼
MIDDLEWARE (auth.js)
   │
   ├─→ protect()
   │   ├─→ Extract token
   │   ├─→ Verify JWT
   │   ├─→ Get user from DB
   │   └─→ Attach to req.user
   │
   ▼
CONTROLLER
   │
   ├─→ Access req.user._id
   ├─→ Process request
   │
   ▼
RESPONSE
   │
   └─→ Return data (only public stats)

PROTECTED ROUTES:
✅ /api/games/leaderboard
✅ /api/games/leaderboard/me
✅ /api/games/leaderboard/top
```

## 📱 Responsive Layout

```
┌─────────────────────────────────────────────────────────────┐
│                   RESPONSIVE DESIGN                         │
└─────────────────────────────────────────────────────────────┘

DESKTOP (> 1200px)
┌────────────────────────────────────────────────┐
│  Header                                        │
├────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌───────────────┐  │
│  │                      │  │               │  │
│  │   Podium (Top 3)     │  │  User Rank    │  │
│  │                      │  │  Card         │  │
│  └──────────────────────┘  │               │  │
│  ┌──────────────────────┐  ├───────────────┤  │
│  │                      │  │               │  │
│  │   Leaderboard        │  │  Info Card    │  │
│  │   Table              │  │               │  │
│  │                      │  │               │  │
│  └──────────────────────┘  └───────────────┘  │
└────────────────────────────────────────────────┘

TABLET (768px - 1200px)
┌────────────────────────────────────────────────┐
│  Header                                        │
├────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  │
│  │   Podium (Top 3)                         │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │   Leaderboard Table                      │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │   User Rank Card                         │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │   Info Card                              │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘

MOBILE (< 768px)
┌──────────────────────────┐
│  Header                  │
├──────────────────────────┤
│  ┌────────────────────┐  │
│  │  1st Place         │  │
│  ├────────────────────┤  │
│  │  2nd Place         │  │
│  ├────────────────────┤  │
│  │  3rd Place         │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │  Simplified Table  │  │
│  │  (fewer columns)   │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │  Your Rank         │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

---

These diagrams illustrate the complete flow of the leaderboard system from battle completion to display!

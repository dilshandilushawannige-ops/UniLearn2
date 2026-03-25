# Quiz Battle - Quick Reference Card

## 🚀 Quick Start

```bash
# Install dependencies
cd backend && npm install socket.io
cd frontend && npm install socket.io-client

# Start servers
cd backend && npm run dev
cd frontend && npm run dev
```

## 📍 Key URLs

- Game Dashboard: `/user-dashboard/games`
- Challenge Page: `/user-dashboard/games/invite/:studentId`
- Battle Room: `/user-dashboard/games/battle/:battleId`

## 🔌 API Endpoints

```javascript
GET    /api/games/online-students      // Get online students
POST   /api/games/invite                // Create invitation
GET    /api/games/invites               // Get active invites
POST   /api/games/invites/:id/respond   // Accept/reject invite
GET    /api/games/battles/:id           // Get battle details
GET    /api/games/history               // Get battle history
GET    /api/games/stats                 // Get user stats
```

## 📡 Socket Events

### Emit (Client → Server)
```javascript
socket.emit('user:status', status)
socket.emit('invite:send', { inviteId })
socket.emit('invite:accepted', { inviteId, battleId })
socket.emit('invite:rejected', { inviteId })
socket.emit('battle:join', { battleId })
socket.emit('battle:answer', { battleId, questionIndex, selectedAnswer, timeSpent })
socket.emit('battle:timeout', { battleId, questionIndex })
```

### Listen (Server → Client)
```javascript
socket.on('users:online', (data) => {})
socket.on('invite:received', (data) => {})
socket.on('invite:accepted', (data) => {})
socket.on('invite:rejected', (data) => {})
socket.on('battle:waiting', (data) => {})
socket.on('battle:started', (data) => {})
socket.on('battle:reconnected', (data) => {})
socket.on('battle:answer_submitted', (data) => {})
socket.on('battle:next_question', (data) => {})
socket.on('battle:finished', (data) => {})
socket.on('battle:error', (data) => {})
```

## 🗄️ Database Collections

### GameInvite
```javascript
{
  fromUser, toUser, year, semester, moduleCode,
  lectureStart, lectureEnd, questionCount, timePerQuestion,
  status, expiresAt, respondedAt
}
```

### QuizBattle
```javascript
{
  player1, player2, year, semester, moduleCode,
  lectureStart, lectureEnd, questionCount, timePerQuestion,
  questions[], currentQuestionIndex,
  player1Answers[], player2Answers[],
  player1Score, player2Score,
  status, winner, startedAt, finishedAt
}
```

## 🎮 Game Flow

```
Login → Games Dashboard → See Online Students → Click Invite
  ↓
Challenge Page → Configure (Module, Lectures, Questions, Time) → Send
  ↓
Receive Invite → Accept → Battle Room → Both Join
  ↓
Questions Load → Answer → Timer → Next Question → Repeat
  ↓
Last Question → Calculate Winner → Show Results → History
```

## 🔐 Authentication

```javascript
// Socket connection with JWT
const socket = io(API_URL, {
  auth: { token: jwtToken }
});

// API calls with JWT
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

## 📊 Status Values

### Invite Status
- `pending` - Waiting for response
- `accepted` - Invite accepted
- `rejected` - Invite rejected
- `expired` - Timed out (30s)
- `cancelled` - Cancelled by sender

### Battle Status
- `waiting` - Waiting for players
- `active` - Battle in progress
- `finished` - Battle completed
- `abandoned` - Player disconnected

### User Status
- `online` - Available
- `idle` - Inactive
- `in_game` - Currently in battle

## 🎯 Key Business Rules

1. Same year/semester only
2. One battle per user
3. 30-second invite expiry
4. Identical questions for both
5. Answer locking after submit
6. Timeout = incorrect
7. +1 correct, 0 incorrect
8. Higher score wins, equal = draw

## 🛠️ Common Tasks

### Create Invite
```javascript
const { invite } = await gamesAPI.createInvite({
  toUserId: student._id,
  moduleCode: 'CS101',
  lectureStart: 1,
  lectureEnd: 5,
  questionCount: 10,
  timePerQuestion: 15
});
```

### Accept Invite
```javascript
const { battle } = await gamesAPI.respondToInvite(inviteId, 'accept');
navigate(`/user-dashboard/games/battle/${battle._id}`);
```

### Join Battle
```javascript
socket.emit('battle:join', { battleId });
```

### Submit Answer
```javascript
socket.emit('battle:answer', {
  battleId,
  questionIndex,
  selectedAnswer,
  timeSpent
});
```

## 🐛 Debug Checklist

- [ ] Backend server running?
- [ ] Frontend server running?
- [ ] Socket.io initialized? (check console)
- [ ] JWT token valid?
- [ ] Users same year/semester?
- [ ] MCQ sets exist for module?
- [ ] Socket connected? (check Network tab)
- [ ] Battle status correct?
- [ ] Questions loaded?
- [ ] Event listeners registered?

## 📝 File Locations

### Backend
```
models/GameInvite.js
models/QuizBattle.js
controllers/gameController.js
services/gameService.js
routes/games.js
socket/gameSocket.js
server.js (updated)
```

### Frontend
```
pages/GameDashboard.jsx
pages/GameInvite.jsx
pages/QuizBattle.jsx
components/InviteNotification.jsx
context/SocketContext.jsx
api/games.js
styles/GameDashboard.css
styles/GameInvite.css
styles/QuizBattle.css
styles/InviteNotification.css
App.jsx (updated)
```

## 🔍 Useful Queries

```javascript
// Find user's battles
db.quizbattles.find({
  $or: [{ player1: userId }, { player2: userId }]
})

// Find active invites
db.gameinvites.find({
  status: 'pending',
  expiresAt: { $gt: new Date() }
})

// Count user wins
db.quizbattles.countDocuments({
  winner: userId,
  status: 'finished'
})
```

## 💡 Tips

- Test with two browsers/incognito
- Create MCQ sets before testing
- Check socket connection first
- Monitor server logs for errors
- Use React DevTools for state
- Use MongoDB Compass for data
- Test timeout scenarios
- Test reconnection cases

## 📚 Documentation

- `GAME_FEATURE_IMPLEMENTATION.md` - Full docs
- `GAME_INSTALLATION.md` - Setup guide
- `GAME_FEATURE_SUMMARY.md` - Overview

---

**Quick Reference v1.0** | Last Updated: 2026-03-25

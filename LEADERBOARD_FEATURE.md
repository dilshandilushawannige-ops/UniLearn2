# Leaderboard Feature Documentation

## Overview

The Leaderboard feature adds competitive ranking to the quiz battle system, allowing students to track their performance and compete for top positions globally.

## Features Implemented

### ✅ Global Leaderboard
- Displays all players ranked by rating
- Shows top 3 players in a special podium display
- Paginated table view for all rankings
- Real-time rank updates after each battle

### ✅ User Rank Display
- Shows current user's global rank
- Displays personal stats (rating, wins, losses, draws, win rate)
- Shows current win streak
- Visible even when not in top rankings

### ✅ Rating System
- Starting rating: 1000
- Win: +25 rating
- Draw: +5 rating
- Loss: -15 rating (minimum 0)
- Rating determines leaderboard position

### ✅ Statistics Tracked
- Total matches played
- Wins, losses, draws
- Win rate percentage
- Current win streak
- Best win streak (all-time)
- Global rank

## Architecture

### Backend Structure

```
backend/
├── models/
│   └── User.js                    # Added gameStats schema
├── services/
│   └── leaderboardService.js      # Leaderboard business logic
├── controllers/
│   └── leaderboardController.js   # API request handlers
├── routes/
│   └── games.js                   # Added leaderboard routes
├── socket/
│   └── gameSocket.js              # Updated to track stats after battles
└── scripts/
    └── initializeGameStats.js     # Migration script for existing users
```

### Frontend Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Leaderboard.jsx        # Main leaderboard page
│   │   └── GameDashboard.jsx      # Updated with rank display
│   ├── api/
│   │   └── leaderboard.js         # API service
│   ├── styles/
│   │   ├── Leaderboard.css        # Leaderboard styles
│   │   └── GameDashboard.css      # Updated with button styles
│   └── App.jsx                    # Added leaderboard route
```

## API Endpoints

### GET /api/games/leaderboard
Get paginated global leaderboard

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50, max: 100) - Items per page
- `includeMe` (boolean, default: true) - Include current user's rank

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "rank": 1,
        "userId": "...",
        "username": "john_doe",
        "avatar": "...",
        "currentYear": 3,
        "currentSemester": 1,
        "rating": 1240,
        "totalMatches": 30,
        "wins": 21,
        "losses": 8,
        "draws": 1,
        "winRate": 70,
        "winStreak": 5,
        "bestWinStreak": 8
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalItems": 120,
      "totalPages": 3
    },
    "me": {
      "rank": 18,
      "rating": 1092,
      "wins": 12,
      "losses": 7,
      "draws": 1,
      "totalMatches": 20,
      "winRate": 60
    }
  }
}
```

### GET /api/games/leaderboard/me
Get current user's rank and stats

**Response:**
```json
{
  "success": true,
  "data": {
    "rank": 18,
    "userId": "...",
    "username": "john_doe",
    "rating": 1092,
    "wins": 12,
    "losses": 7,
    "draws": 1,
    "totalMatches": 20,
    "winRate": 60,
    "winStreak": 2,
    "bestWinStreak": 5
  }
}
```

### GET /api/games/leaderboard/top
Get top N players (for dashboard widgets)

**Query Parameters:**
- `limit` (number, default: 10, max: 50) - Number of top players

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "userId": "...",
      "username": "top_player",
      "rating": 1450,
      "wins": 35,
      "losses": 5,
      "draws": 2,
      "totalMatches": 42,
      "winRate": 83
    }
  ]
}
```

## Database Schema

### User Model - gameStats Field

```javascript
gameStats: {
  rating: { type: Number, default: 1000, min: 0 },
  totalMatches: { type: Number, default: 0, min: 0 },
  wins: { type: Number, default: 0, min: 0 },
  losses: { type: Number, default: 0, min: 0 },
  draws: { type: Number, default: 0, min: 0 },
  winStreak: { type: Number, default: 0, min: 0 },
  bestWinStreak: { type: Number, default: 0, min: 0 },
}
```

### Indexes Added

```javascript
// For efficient leaderboard queries
userSchema.index({ 'gameStats.rating': -1, 'gameStats.wins': -1 });
userSchema.index({ currentYear: 1, currentSemester: 1, 'gameStats.rating': -1 });
```

## Ranking Logic

### Tie-Breaking Rules

When multiple users have the same rating, rank is determined by:

1. **Rating** (descending) - Higher rating ranks first
2. **Wins** (descending) - More wins ranks higher
3. **Total Matches** (descending) - More experience ranks higher

### Rank Calculation

Rank is calculated by counting how many users have better stats according to the tie-breaking rules:

```javascript
const rank = await User.countDocuments({
  'gameStats.totalMatches': { $gt: 0 },
  $or: [
    { 'gameStats.rating': { $gt: userRating } },
    {
      'gameStats.rating': userRating,
      'gameStats.wins': { $gt: userWins },
    },
    {
      'gameStats.rating': userRating,
      'gameStats.wins': userWins,
      'gameStats.totalMatches': { $gt: userMatches },
    },
  ],
}) + 1;
```

## Stats Update Flow

### When Battle Finishes

1. **Socket Event**: `battle:finished` emitted
2. **Stats Update**: Both players' gameStats updated
3. **Rating Calculation**:
   - Winner: +25 rating
   - Loser: -15 rating (min 0)
   - Draw: +5 rating for both
4. **Win Streak Update**:
   - Win: increment streak, update best if needed
   - Loss/Draw: reset streak to 0
5. **Database Save**: User documents saved with new stats

### When User Surrenders

Same logic applies - the player who didn't surrender is marked as winner.

## Installation & Setup

### 1. Install Dependencies

No new dependencies required - uses existing packages.

### 2. Run Migration Script

Initialize gameStats for existing users:

```bash
node backend/scripts/initializeGameStats.js
```

This script:
- Adds gameStats field to all existing users
- Calculates stats from historical battle data
- Assigns initial ratings based on win/loss record
- Shows top 10 leaderboard after completion

### 3. Restart Server

```bash
cd backend
npm start
```

### 4. Access Leaderboard

Navigate to: `/user-dashboard/games/leaderboard`

Or click "View Leaderboard" button on Game Dashboard.

## UI Components

### Leaderboard Page

**Top Section:**
- Breadcrumb navigation
- Page title and description

**Podium Display:**
- Top 3 players highlighted
- Gold, silver, bronze styling
- Player avatars and stats

**Leaderboard Table:**
- Rank, player name, rating, matches, W/L/D record, win rate
- Current user row highlighted in gold
- Pagination controls

**Sidebar:**
- User's current rank card
- Personal stats display
- Win streak indicator
- Info card explaining ranking system

### Game Dashboard Updates

**Hero Section:**
- Real rank display (replaces hardcoded #12)
- "View Leaderboard" button added
- Fetches rank on page load

## Performance Considerations

### Database Indexes

Indexes added for efficient queries:
- `gameStats.rating` (descending)
- `gameStats.wins` (descending)
- Compound index for year/semester filtering

### Query Optimization

- Uses `.lean()` for read-only queries
- Selects only required fields
- Pagination limits result size
- Rank calculation uses efficient counting

### Caching Opportunities (Future)

Consider caching for:
- Top 10 leaderboard (5-minute cache)
- User rank (1-minute cache)
- Total player count

## Testing

### Manual Testing Checklist

- [ ] New user starts with 1000 rating
- [ ] Win increases rating by 25
- [ ] Loss decreases rating by 15
- [ ] Draw increases rating by 5
- [ ] Rating never goes below 0
- [ ] Win streak increments on consecutive wins
- [ ] Win streak resets on loss/draw
- [ ] Best win streak tracks all-time high
- [ ] Leaderboard shows correct rankings
- [ ] Pagination works correctly
- [ ] User's rank displays correctly
- [ ] Rank updates after battle
- [ ] Top 3 podium displays correctly
- [ ] Current user row highlighted
- [ ] Mobile responsive design works

### Test Battle Scenarios

1. **New User First Battle:**
   - Win: 1000 → 1025
   - Loss: 1000 → 985
   - Draw: 1000 → 1005

2. **Win Streak:**
   - 3 consecutive wins: streak = 3
   - Then loss: streak = 0
   - Best streak remains 3

3. **Ranking:**
   - User A: 1100 rating, 10 wins
   - User B: 1100 rating, 8 wins
   - User A ranks higher

## Future Enhancements (Not Implemented)

### Module-Based Leaderboard
- Separate rankings per module
- Requires `moduleStats` array in User model
- Track rating per module

### Friends Leaderboard
- Show rankings among friends only
- Requires friend system implementation

### Seasonal Rankings
- Reset rankings each semester
- Archive historical seasons
- Season-specific rewards

### Achievements & Badges
- Milestone achievements (10 wins, 50 wins, etc.)
- Special badges for top ranks
- Display on profile

### Daily Challenges
- Special daily leaderboard
- Time-limited competitions
- Bonus rewards

## Troubleshooting

### Users Not Showing on Leaderboard

**Issue:** User has played battles but doesn't appear on leaderboard

**Solution:**
1. Check if `gameStats` exists: `db.users.findOne({ _id: userId })`
2. Run migration script: `node backend/scripts/initializeGameStats.js`
3. Verify `totalMatches > 0`

### Rank Not Updating

**Issue:** Rank doesn't change after battle

**Solution:**
1. Check socket connection in browser console
2. Verify `updateGameStats()` is called in `gameSocket.js`
3. Check for errors in server logs
4. Refresh leaderboard page

### Rating Calculation Issues

**Issue:** Rating seems incorrect

**Solution:**
1. Verify rating formula in `User.updateGameStats()`
2. Check battle result (win/loss/draw) is correct
3. Ensure rating doesn't go below 0
4. Review battle history for user

## Code Maintenance

### Adding New Stats

To track additional statistics:

1. Update `gameStatsSchema` in `User.js`
2. Update `updateGameStats()` method
3. Update `mapLeaderboardUser()` in service
4. Update frontend display components

### Modifying Rating Formula

To change rating calculation:

1. Edit `updateGameStats()` in `User.js`
2. Consider running migration to recalculate existing ratings
3. Update documentation

### Adding Filters

To add year/semester filtering:

1. Add query params to controller
2. Update service query builder
3. Add filter UI components
4. Update API documentation

## Support

For issues or questions:
1. Check server logs: `backend/logs/`
2. Check browser console for frontend errors
3. Review this documentation
4. Check existing battle data in database

## Summary

The Leaderboard feature successfully adds competitive ranking to the quiz battle system with:
- ✅ Global rankings
- ✅ Personal rank tracking
- ✅ Rating system
- ✅ Win/loss/draw statistics
- ✅ Win streak tracking
- ✅ Beautiful UI with podium display
- ✅ Real-time updates
- ✅ Efficient database queries
- ✅ Mobile responsive design

The implementation is production-ready, scalable, and follows the existing project architecture.

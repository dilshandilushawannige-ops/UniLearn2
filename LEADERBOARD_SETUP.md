# Leaderboard Feature - Quick Setup Guide

## 🚀 Quick Start (3 Steps)

### Step 1: Initialize Database

Run the migration script to add gameStats to existing users:

```bash
node backend/scripts/initializeGameStats.js
```

**What this does:**
- Adds `gameStats` field to all users
- Calculates stats from existing battle history
- Assigns initial ratings based on win/loss records
- Shows top 10 leaderboard preview

**Expected Output:**
```
Connecting to MongoDB...
Connected to MongoDB
Found 25 users without gameStats
Processing user: john_doe (...)
  ✓ Updated john_doe: 15 matches, 10W/4L/1D, Rating: 1095
...
✅ Migration completed successfully!
Updated 25 users

📊 Top 10 Leaderboard:
1. alice - Rating: 1450, 35W/5L/2D
2. bob - Rating: 1200, 20W/10L/0D
...
```

### Step 2: Restart Backend Server

```bash
cd backend
npm start
```

The server will now:
- Update user stats after each battle
- Serve leaderboard API endpoints
- Track win streaks and ratings

### Step 3: Test the Feature

1. **Open Game Dashboard:**
   - Navigate to `/user-dashboard/games`
   - Your rank should display in the hero section
   - Click "View Leaderboard" button

2. **View Leaderboard:**
   - See top 3 players in podium
   - Browse full rankings table
   - Check your rank in sidebar

3. **Play a Battle:**
   - Complete a quiz battle
   - Return to leaderboard
   - See updated rank and rating

## ✅ Verification Checklist

After setup, verify:

- [ ] Migration script completed successfully
- [ ] Backend server starts without errors
- [ ] Game Dashboard shows real rank (not "Unranked")
- [ ] Leaderboard page loads without errors
- [ ] Top 3 podium displays correctly
- [ ] Your rank shows in sidebar
- [ ] After battle, stats update correctly

## 🔧 Configuration

### Rating System (Optional)

To modify rating changes, edit `backend/models/User.js`:

```javascript
// Current values:
Win:  +25 rating
Loss: -15 rating
Draw: +5 rating
```

Change these in the `updateGameStats()` method.

### Leaderboard Page Size (Optional)

To change items per page, edit `frontend/src/pages/Leaderboard.jsx`:

```javascript
// Current: 50 items per page
const data = await getLeaderboard({ page, limit: 50, includeMe: true });
```

## 📊 Database Indexes

The following indexes are automatically created:

```javascript
// For leaderboard queries
{ 'gameStats.rating': -1, 'gameStats.wins': -1 }

// For year/semester filtering (future use)
{ currentYear: 1, currentSemester: 1, 'gameStats.rating': -1 }
```

To manually create indexes:

```javascript
db.users.createIndex({ 'gameStats.rating': -1, 'gameStats.wins': -1 })
```

## 🐛 Troubleshooting

### Issue: "Unranked" shows on Game Dashboard

**Cause:** User has no battles yet or gameStats not initialized

**Solution:**
```bash
# Re-run migration
node backend/scripts/initializeGameStats.js

# Or play a battle to initialize stats
```

### Issue: Leaderboard page shows empty

**Cause:** No users have played battles yet

**Solution:**
- Play some battles to populate leaderboard
- Check MongoDB: `db.users.find({ 'gameStats.totalMatches': { $gt: 0 } })`

### Issue: Stats not updating after battle

**Cause:** Socket not calling updateGameStats

**Solution:**
1. Check browser console for socket errors
2. Verify backend logs show battle completion
3. Check `gameSocket.js` has updated code
4. Restart backend server

### Issue: Migration script fails

**Cause:** MongoDB connection or environment variables

**Solution:**
```bash
# Check .env file exists
ls backend/.env

# Verify MONGO_URI is set
cat backend/.env | grep MONGO_URI

# Test MongoDB connection
mongosh "your-connection-string"
```

## 🎯 Testing Scenarios

### Test 1: New User
1. Create new user account
2. Check initial rating = 1000
3. Play first battle
4. Verify rating changes correctly

### Test 2: Win Streak
1. Win 3 battles in a row
2. Check winStreak = 3
3. Lose 1 battle
4. Verify winStreak = 0, bestWinStreak = 3

### Test 3: Ranking
1. Have 2 users with same rating
2. User with more wins should rank higher
3. Verify on leaderboard page

### Test 4: Pagination
1. Ensure 50+ users have played
2. Navigate through pages
3. Verify rank numbers continue correctly

## 📱 Mobile Testing

Test on mobile devices:
- Leaderboard table responsive
- Podium displays correctly
- Sidebar moves below main content
- Touch interactions work

## 🔐 Security Notes

- All endpoints require authentication
- Users can only see public stats
- No sensitive data exposed
- Rate limiting recommended for production

## 📈 Performance Tips

For large user bases (1000+ users):

1. **Add Caching:**
```javascript
// Cache top 10 for 5 minutes
const cachedTop10 = await redis.get('leaderboard:top10');
```

2. **Limit Rank Calculation:**
```javascript
// Only calculate rank when viewing leaderboard
// Don't calculate on every page load
```

3. **Background Jobs:**
```javascript
// Update rankings in background
// Use cron job for periodic updates
```

## 🎨 Customization

### Change Colors

Edit `frontend/src/styles/Leaderboard.css`:

```css
/* Gold color for rank 1 */
.rank-badge.gold {
  background: linear-gradient(135deg, #ffd700, #ffed4e);
}

/* Podium gradient */
.leaderboard-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### Add More Stats

1. Update User model schema
2. Update leaderboard service mapping
3. Update frontend table columns
4. Update CSS grid columns

## 📚 API Usage Examples

### Get Leaderboard
```javascript
// Frontend
import { getLeaderboard } from '../api/leaderboard';

const data = await getLeaderboard({ 
  page: 1, 
  limit: 50, 
  includeMe: true 
});
```

### Get User Rank
```javascript
import { getMyRank } from '../api/leaderboard';

const myRank = await getMyRank();
console.log(`I'm rank #${myRank.rank}`);
```

### Get Top Players
```javascript
import { getTopPlayers } from '../api/leaderboard';

const top10 = await getTopPlayers(10);
```

## 🚦 Production Deployment

Before deploying to production:

1. **Run Migration:**
   ```bash
   NODE_ENV=production node backend/scripts/initializeGameStats.js
   ```

2. **Create Indexes:**
   ```bash
   # Connect to production MongoDB
   db.users.createIndex({ 'gameStats.rating': -1, 'gameStats.wins': -1 })
   ```

3. **Test Endpoints:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-api.com/api/games/leaderboard
   ```

4. **Monitor Performance:**
   - Check query execution times
   - Monitor database load
   - Set up alerts for slow queries

## 📞 Support

If you encounter issues:

1. Check `LEADERBOARD_FEATURE.md` for detailed documentation
2. Review server logs: `backend/logs/`
3. Check browser console for frontend errors
4. Verify MongoDB connection and data

## ✨ What's Next?

Future enhancements you can add:
- Module-based leaderboards
- Friends leaderboard
- Seasonal rankings
- Achievements system
- Daily challenges
- Leaderboard widgets on dashboard

---

**Setup Complete!** 🎉

Your leaderboard feature is now ready. Users can compete, track rankings, and climb the leaderboard!

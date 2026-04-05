/**
 * Migration script to initialize gameStats for existing users
 * Run this once after deploying the leaderboard feature
 * 
 * Usage: node backend/scripts/initializeGameStats.js
 */

require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const QuizBattle = require('../models/QuizBattle');

const initializeGameStats = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all users without gameStats
    const usersWithoutStats = await User.find({
      $or: [
        { gameStats: { $exists: false } },
        { gameStats: null },
      ],
    });

    console.log(`Found ${usersWithoutStats.length} users without gameStats`);

    for (const user of usersWithoutStats) {
      console.log(`Processing user: ${user.username} (${user._id})`);

      // Initialize default gameStats
      user.gameStats = {
        rating: 1000,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winStreak: 0,
        bestWinStreak: 0,
      };

      // Calculate stats from existing battles
      const totalBattles = await QuizBattle.countDocuments({
        $or: [{ player1: user._id }, { player2: user._id }],
        status: 'finished',
      });

      const wins = await QuizBattle.countDocuments({
        winner: user._id,
        status: 'finished',
      });

      const draws = await QuizBattle.countDocuments({
        $or: [{ player1: user._id }, { player2: user._id }],
        status: 'finished',
        winner: null,
      });

      const losses = totalBattles - wins - draws;

      // Update stats
      user.gameStats.totalMatches = totalBattles;
      user.gameStats.wins = wins;
      user.gameStats.losses = losses;
      user.gameStats.draws = draws;

      // Calculate rating based on win/loss record
      // Simple formula: 1000 + (wins * 25) - (losses * 15) + (draws * 5)
      const calculatedRating = Math.max(0, 1000 + (wins * 25) - (losses * 15) + (draws * 5));
      user.gameStats.rating = calculatedRating;

      // Calculate win streak (we can't determine historical streak, so set to 0)
      user.gameStats.winStreak = 0;
      user.gameStats.bestWinStreak = 0;

      await user.save();
      console.log(`  ✓ Updated ${user.username}: ${totalBattles} matches, ${wins}W/${losses}L/${draws}D, Rating: ${calculatedRating}`);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log(`Updated ${usersWithoutStats.length} users`);

    // Show top 10 leaderboard
    console.log('\n📊 Top 10 Leaderboard:');
    const topPlayers = await User.find({ 'gameStats.totalMatches': { $gt: 0 } })
      .select('username gameStats')
      .sort({ 'gameStats.rating': -1, 'gameStats.wins': -1 })
      .limit(10);

    topPlayers.forEach((player, index) => {
      console.log(
        `${index + 1}. ${player.username} - Rating: ${player.gameStats.rating}, ` +
        `${player.gameStats.wins}W/${player.gameStats.losses}L/${player.gameStats.draws}D`
      );
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
initializeGameStats();

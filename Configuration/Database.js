import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const { MONGODB_URL } = process.env;

export const connect = () => {
  mongoose
    .connect(MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(async () => {
      console.log(`DB Connection Successfully`);
      
      // Print all levels on startup
      try {
        const Level = mongoose.model('Level');
        const allLevels = await Level.find({}).sort({ level: 1 }).lean();
        console.log('\n========== AVAILABLE LEVELS IN DATABASE ==========');
        if (allLevels.length === 0) {
          console.log('⚠️  No levels found in database!');
        } else {
          console.log(`✓ Found ${allLevels.length} level(s):`);
          allLevels.forEach(level => {
            console.log(`  - Level ${level.level}: ${level._id || 'N/A'} (ID: ${level._id})`);
          });
        }
        console.log('==================================================\n');

        // Print GameDetails leaderboard status
        const GameDetails = mongoose.model('GameDetails');
        const gameDetails = await GameDetails.findOne({}).lean();
        console.log('\n========== GAME DETAILS & LEADERBOARD STATUS ==========');
        if (!gameDetails) {
          console.log('⚠️  No GameDetails document found in database!');
          console.log('   → Run /admin/startGame to initialize the game');
        } else {
          console.log(`✓ GameDetails found (ID: ${gameDetails._id})`);
          console.log(`  - Game Started: ${gameDetails.hasGameStarted || false}`);
          console.log(`  - Game Finished: ${gameDetails.hasGameFinished || false}`);
          console.log(`  - Game Start Time: ${gameDetails.gameStartTime || 'N/A'}`);
          
          if (!gameDetails.leaderboard || gameDetails.leaderboard.length === 0) {
            console.log('  ⚠️  Leaderboard: NOT INITIALIZED (empty or missing)');
            console.log('     → Expected: array of length', allLevels.length + 1, '(totalLevels + 1 completion level)');
            console.log('     → Actual: length', gameDetails.leaderboard?.length || 0);
            console.log('     → Run /admin/startGame to initialize leaderboard');
          } else {
            console.log(`  ✓ Leaderboard: INITIALIZED with ${gameDetails.leaderboard.length} levels`);
            console.log(`     → Expected size: ${allLevels.length + 1} (${allLevels.length} levels + 1 completion level)`);
            console.log(`     → Actual size: ${gameDetails.leaderboard.length}`);
            
            if (gameDetails.leaderboard.length !== allLevels.length + 1) {
              console.log('     ⚠️  WARNING: Leaderboard size mismatch!');
              console.log('        This may cause "Next level not found" errors');
              console.log('        → Run /admin/resetGame and /admin/startGame to reinitialize');
            }
            
            // Show structure of first few and last level
            console.log('     → Structure:');
            gameDetails.leaderboard.slice(0, 3).forEach((entry, i) => {
              console.log(`        [${i}] Level ${entry.level}: ${entry.teams?.length || 0} team(s)`);
            });
            if (gameDetails.leaderboard.length > 3) {
              console.log(`        ... (${gameDetails.leaderboard.length - 4} more levels) ...`);
              const lastEntry = gameDetails.leaderboard[gameDetails.leaderboard.length - 1];
              console.log(`        [${gameDetails.leaderboard.length - 1}] Level ${lastEntry.level}: ${lastEntry.teams?.length || 0} team(s) (completion level)`);
            }
          }
        }
        console.log('======================================================\n');
      } catch (error) {
        console.log('⚠️  Could not fetch levels/gameDetails:', error.message);
      }
    })
    .catch((err) => {
      console.log(`DB Connection Failed`);
      console.log(err);
      process.exit(1);
    });
};

import Level from "../Model/Level.js";
import Team from "../Model/Team.js";
import GameDetails from "../Model/GameDetails.js";
import Question from "../Model/Question.js";
import mongoose from "mongoose";


const createGameDetails = async (req, res) => {
    try{
        const gameDetails = await GameDetails.create({
            hasGameStarted: false,
            gameStartTime: null,
            gameEndTime: null,
            hasGameFinished: false,
            finishedTeams: []
        })
        return res.status(200).json({message: "Game details created successfully", gameDetails: gameDetails})
    }
    catch(error){
        return res.status(500).json({message: "Failed to create game details", error: error.message, completeError: error})
    }
}

const startGame = async (req, res) => {
    try {
        let gameDetails = await GameDetails.findOne({});
        if (!gameDetails) {
            await createGameDetails();
            gameDetails = await GameDetails.findOne({});
        }

        if (!gameDetails) {
            return res.status(500).json({ message: "Failed to initialize game details", success: false });
        }

        gameDetails.hasGameStarted = true;
        gameDetails.gameStartTime = new Date();
        
        // Get total number of levels to create fixed-size leaderboard
        // No need to sort - we only need the count
        const totalLevels = await Level.countDocuments({});
        
        // Initialize leaderboard as fixed-size array (one entry per level + 1 completion level)
        // Index 0 = Level 1, Index 1 = Level 2, ..., Index N = Level N+1 (completion level)
        // The extra level is where teams go after completing all actual levels
        gameDetails.leaderboard = Array.from({ length: totalLevels + 1 }, (_, i) => ({
            level: i + 1,
            teams: []
        }));
        
        await gameDetails.save();

        const allTeams = await Team.find({});
        const firstLevel = await Level.findOne({ level: 1 });

        if (!firstLevel) {
            return res.status(500).json({ message: "No level 1 found", success: false });
        }

        await Promise.all(allTeams.map(async (team) => {
            try {
                team.currentLevel = firstLevel._id;
                team.currentQuestion = await allotNewRandomQuestionFromLevel(firstLevel._id);
                team.levelStartedAt = new Date();
                await team.save();
                
                // Add team to level 1 in leaderboard (index 0)
                await addTeamToLeaderboardLevel(team._id, 1);
            } catch (teamError) {
                console.error(`Failed to update team ${team._id}:`, teamError);
            }
        }));

        return res.status(200).json({ message: "Game started successfully", success: true });
    } catch (error) {
        return res.status(500).json({ message: "Failed to start the game", error: error.message, success: false });
    }
};


const fetchGameStatus = async (req, res) => {
    try{
        const gameDetails = await GameDetails.findOne({});
        return res.status(200).json({message: "Game status fetched successfully", gameDetails: gameDetails,success:true});
    }
    catch(error){
        return res.status(500).json({message: "Failed to fetch game status", error: error.message, completeError: error, success: false});
    }
}

const allotNewRandomQuestionFromLevel = async (levelId) => {
    try{
        const level = await Level.findById(levelId);
        const allQuestions = await Question.find({level: levelId});
        const allTeams = await Team.find({currentLevel: levelId});

        
        console.log("ALL QUESTIONS: ", allQuestions);
        const randomQuestion = allQuestions[Math.floor(Math.random() * allQuestions.length)];
        console.log("RANDOM QUESTION: ", randomQuestion);
        return randomQuestion;
    }
    catch(error){
        console.log(error);
        throw error;
    }
}

// Helper function to move team from one level to another in the leaderboard
// Uses direct array index access - no sorting needed (array is pre-sorted)
const moveTeamInLeaderboard = async (teamId, currentLevelNum, nextLevelNum) => {
    try {
        const gameDetails = await GameDetails.findOne({});
        if (!gameDetails || !gameDetails.leaderboard) {
            console.error("GameDetails or leaderboard not found");
            return;
        }

        // Direct array index access: Level N is at index N-1
        const currentLevelIndex = currentLevelNum - 1;
        const nextLevelIndex = nextLevelNum - 1;

        // Remove team from current level (simple filter, no search needed)
        if (gameDetails.leaderboard[currentLevelIndex]) {
            gameDetails.leaderboard[currentLevelIndex].teams = 
                gameDetails.leaderboard[currentLevelIndex].teams.filter(
                    id => id.toString() !== teamId.toString()
                );
        }

        // Add team to next level (direct push to array at index)
        if (gameDetails.leaderboard[nextLevelIndex]) {
            if (!gameDetails.leaderboard[nextLevelIndex].teams.some(id => id.toString() === teamId.toString())) {
                gameDetails.leaderboard[nextLevelIndex].teams.push(teamId);
            }
        }

        await gameDetails.save();
        console.log(`Team ${teamId} moved from level ${currentLevelNum} to level ${nextLevelNum}`);
    } catch (error) {
        console.error("Error moving team in leaderboard:", error);
        throw error;
    }
}

// Helper function to add team to a specific level in leaderboard (used on game start)
// Uses direct array index access - no sorting needed
const addTeamToLeaderboardLevel = async (teamId, levelNum) => {
    try {
        const gameDetails = await GameDetails.findOne({});
        if (!gameDetails || !gameDetails.leaderboard) {
            console.error("GameDetails or leaderboard not found");
            return;
        }

        // Direct array index access: Level N is at index N-1
        const levelIndex = levelNum - 1;

        if (gameDetails.leaderboard[levelIndex]) {
            // Add team if not already there (direct array access)
            if (!gameDetails.leaderboard[levelIndex].teams.some(id => id.toString() === teamId.toString())) {
                gameDetails.leaderboard[levelIndex].teams.push(teamId);
                await gameDetails.save();
            }
        }
    } catch (error) {
        console.error("Error adding team to leaderboard level:", error);
        throw error;
    }
}


const updateTeamScore = async (teamId) => {
    try{
        const team = await Team.findById(teamId);
        const timeCompletedAt = new Date();
        
        // Check for spam submissions
        if(team.completedQuestions.length > 0){
            const lastCompletedQuestion = team.completedQuestions[team.completedQuestions.length - 1];
            const timeDelay = timeCompletedAt.getTime() - lastCompletedQuestion.completedAt.getTime();
            if(timeDelay < 60000){
                return {message: "You cannot submit new question so quickly. Please wait.", success: false};
            }
        }

        const currQuestion = team.currentQuestion;
        const levelId = team.currentLevel;
        console.log("LEVEL ID: ", levelId);
        const currLevel = await Level.findById(levelId);
        console.log("FETCHED CURRRENT LEVEL: ", currLevel);
        const levelNum = currLevel.level;

        // Get total levels from leaderboard (leaderboard size - 1 completion level)
        const gameDetails = await GameDetails.findOne({});
        
        const totalLevels = gameDetails.leaderboard.length - 1; // Subtract 1 for completion level
        const lastLevel = totalLevels;

        const timeTakenToCompleteTheCurrLevelInMinutes = (timeCompletedAt.getTime() - team.levelStartedAt.getTime()) / (1000 * 60);

        // Check if team completed last level
        if(levelNum === lastLevel){
            console.log("TEAM HAS REACHED THE LAST LEVEL");
            if(!team.hasCompletedAllLevels){
                console.log("TEAM IS SUBMITTING THE QUESTION OF THE LAST LEVEL");
                
                // Mark completion
                team.currentQuestion = null;
                team.completedQuestions.push({ 
                    currentQuestion: currQuestion, 
                    level: levelId, 
                    startedAt: team.levelStartedAt, 
                    completedAt: timeCompletedAt, 
                    timeTaken: timeTakenToCompleteTheCurrLevelInMinutes 
                });
                team.hasCompletedAllLevels = true;
                team.levelStartedAt = null;
                await team.save();
                
                // Move team to completion level (lastLevel + 1)
                const completionLevelNum = lastLevel + 1;
                await moveTeamInLeaderboard(teamId, levelNum, completionLevelNum);
                console.log(`TEAM MOVED TO COMPLETION LEVEL ${completionLevelNum}`);
                
                return {message: "Team has completed all levels", success: true};
            }
            else{
                console.log("TEAM HAS ALREADY COMPLETED AND SUBMITTED THE QUESTION OF THE LAST LEVEL");
                return {message: "Team has already completed and submitted the last level", success: false};
            }
        }
        else{
            // Move to next level
            const nextLevelNum = levelNum + 1;
            console.log("NEXT LEVEL NUMBER: ", nextLevelNum);
            
            // Validate next level exists (should be less than or equal to totalLevels)
            if (nextLevelNum > totalLevels) {
                console.log("Next level not found!");
                return { message: "Error: Next level not found", success: false };
            }
            
            // Find the Level document for the next level
            const nextLevel = await Level.findOne({ level: nextLevelNum });
            console.log("NEXT LEVEL DOCUMENT: ", nextLevel);
            if (!nextLevel) {
                console.log("Next level document not found in database!");
                return { message: "Error: Next level not found", success: false };
            }
            
            const nextLevelId = nextLevel._id;

            team.currentLevel = nextLevelId;
            team.currentQuestion = await allotNewRandomQuestionFromLevel(nextLevelId);

            team.completedQuestions.push({ 
                currentQuestion: currQuestion, 
                level: levelId, 
                startedAt: team.levelStartedAt, 
                completedAt: timeCompletedAt, 
                timeTaken: timeTakenToCompleteTheCurrLevelInMinutes 
            });
            
            // Update the time when team moved to next level
            team.levelStartedAt = timeCompletedAt;
            await team.save();
            
            // Move team in leaderboard from current level to next level (direct index access)
            await moveTeamInLeaderboard(teamId, levelNum, nextLevelNum);
            
            console.log("TEAM HAS MOVED TO THE NEXT LEVEL");
            return {message: "Team has moved to the next level", success: true};
        }
    }
    catch(error){
        console.log(error);
        throw error;
    }
}
const resetGame = async (req, res) => {
    try {
        // Reset all teams in a single bulk update
        await Team.updateMany({}, {
            $set: {
                currentLevel: null,
                currentQuestion: null,
                completedQuestions: [],
                hasCompletedAllLevels: false,
                levelStartedAt: null
            }
        });
        console.log("All teams reset to default values");

        // Reset all hints in questions in a single bulk update
        await Question.updateMany({}, { $set: { "hints.$[].flag": false } });
        console.log("All hints reset");
        // Reset game details and clear leaderboard in a single operation
        await GameDetails.updateOne({}, {
            $set: {
                hasGameStarted: false,
                gameStartTime: null,
                gameEndTime: null,
                hasGameFinished: false,
                leaderboard: []
            }
        });
        console.log("Game details reset");

        return res.status(200).json({ message: "Game reset successfully", success: true });
    } catch (error) {
        console.error("Error resetting game:", error);
        return res.status(500).json({ message: "Error resetting the game", error: error.message, success: false });
    }
};


const finishGame =async(req,res)=>{
    try{
        const gameDetails = await GameDetails.findOne({});
        gameDetails.hasGameFinished = true;
        gameDetails.gameEndTime = new Date();
        await gameDetails.save();
        return res.status(200).json({message: "Game finished successfully", success: true});
    }
    catch(error){
        return res.status(500).json({message: "Error finishing the game", error: error.message, completeError: error, success: false});
    }
}

// Get level-wise leaderboard with team details populated
// Returns top 10 teams from highest levels (traverse from back)
const getLevelWiseLeaderboard = async (req, res) => {
    try {
        const gameDetails = await GameDetails.findOne({});
        if (!gameDetails) {
            return res.status(404).json({ message: "Game details not found", success: false });
        }

        // Populate team details for each level (leaderboard is already sorted by index)
        const leaderboardWithDetails = await Promise.all(
            (gameDetails.leaderboard || []).map(async (levelEntry) => {
                const teams = await Team.find({ _id: { $in: levelEntry.teams } })
                    .select('teamName currentLevel hasCompletedAllLevels members teamLead')
                    .populate('currentLevel', 'level')
                    .populate('teamLead', 'name email')
                    .populate('members', 'name email')
                    .lean();
                
                return {
                    level: levelEntry.level,
                    teams: teams
                };
            })
        );

        // Get top 10 teams by traversing from LAST level (highest) to first
        // No sorting needed - array is already sorted by level
        const allTeamsFlat = [];
        for (let i = leaderboardWithDetails.length - 1; i >= 0; i--) {
            allTeamsFlat.push(...leaderboardWithDetails[i].teams);
        }
        
        const top10Teams = allTeamsFlat.slice(0, 10);

        return res.status(200).json({
            message: "Leaderboard fetched successfully",
            leaderboard: leaderboardWithDetails,  // Full level-wise structure (already sorted)
            top10: top10Teams,                    // Top 10 teams from highest levels
            success: true
        });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return res.status(500).json({
            message: "Error fetching leaderboard",
            error: error.message,
            success: false
        });
    }
}


export {startGame, allotNewRandomQuestionFromLevel, updateTeamScore, resetGame,fetchGameStatus,finishGame, getLevelWiseLeaderboard, moveTeamInLeaderboard};


import mongoose from "mongoose";


const gameDetailsSchema = new mongoose.Schema(
    {
        hasGameStarted: {
            type: Boolean,
            default: false
        },
        gameStartTime: {
            type: Date
        },
        gameEndTime: {
            type: Date
        },
        hasGameFinished: {
            type: Boolean,
            default: false
        },
        finishedTeams: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'Team'
        },
        // Level-wise leaderboard: array of levels with teams
        // Structure: [{ level: 1, teams: [teamId1, teamId2] }, { level: 2, teams: [teamId3] }, ...]
        // Ordered by level number, easy to traverse from back for top teams
        leaderboard: [{
            level: {
                type: Number,
                required: true
            },
            teams: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Team'
            }]
        }]
    },
    {timestamps: true}
)

export default mongoose.model('GameDetails', gameDetailsSchema)
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
        }
    },
    {timestamps: true}
)

export default mongoose.model('GameDetails', gameDetailsSchema)
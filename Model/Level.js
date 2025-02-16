import mongoose from "mongoose";

const levelSchema = new mongoose.Schema({
    level: {
        type: Number,
        required: true,
    },
    questions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
    }]
});

const Level = mongoose.model("Level", levelSchema);

export default Level;

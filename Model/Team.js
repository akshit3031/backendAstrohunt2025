import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
    teamName: {
      type: String,
      required: [true, 'Team name is required'],
      unique: true,
      trim: true
    },
    teamLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    currentLevel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Level'
    },

    score: {
      type: Number,
      default: 0
    },
    currentQuestion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    levelStartedAt: Date,
    completedQuestions: [{
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
      },
      level: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Level'
      },
      startedAt: Date,
      completedAt: Date,
      timeTaken: Number
    }],
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active'
    },
    //To determine weather the team is blocked or not
    blocked: {
      type: Boolean,
      default: false
    },
    //To uniquely identify a team through a code and allow users to join an existing team
    team_code: {
      type: String,
      default: '',
      unique: true
    },
    hasCompletedAllLevels: {
      type: Boolean,
      default: false
    }
  }, {
    timestamps: true
  });

export default mongoose.model('Team', teamSchema);
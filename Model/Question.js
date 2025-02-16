import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    level: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Level",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Description is required"],
    },
    image: {
      url: String,
      alt: String,
      public_id: String,
    },
    hints: [
      {
        text: {
          type: String,
          required: true,
        },
        unlockTime: {
          type: Number,
          required: true, // 5, 10, or 15 minutes
        },
        flag: {
          type: Boolean,
          default: false,
        },
      },
    ],

    correctCode: {
      type: String,
      required: [true, "Correct code is required"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Question", questionSchema);

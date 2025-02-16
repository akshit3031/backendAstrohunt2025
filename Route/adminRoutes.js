import express from "express";
import multer from "multer";
import { auth, protectedAdminRoutes } from "../Middleware/Token.middleware.js";
import { addQuestion, addLevel, modifyQuestion, deleteQuestion, getAllLevels, getAllQuestionsByLevel, deleteLevel, releaseHintsByQuestionId, fetchLevelTeamStatus, fetchLevelStats, fetchLevelQuestionStats, blockTeam, unblockTeam, fetchAllTeams } from "../Controller/admin.controller.js";
import { upload } from "../config/multer.js";
import { startGame, resetGame, finishGame, fetchGameStatus } from "../Controller/Game.controller.js";
const router = express.Router();

// Use upload.single('image') middleware for image upload
router.post(
  "/addQuestion",
  auth, protectedAdminRoutes,
  (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading.
        return res.status(400).json({
          message: "File upload error",
          error: err.message,
        });
      } else if (err) {
        // An unknown error occurred when uploading.
        return res.status(500).json({
          message: "Unknown error",
          error: err.message,
        });
      }
      // Everything went fine.
      next();
    });
  },
  addQuestion
);
router.post("/addLevel", auth,protectedAdminRoutes, addLevel);
router.post("/modifyQuestion/:questionId", auth, protectedAdminRoutes, modifyQuestion);
router.delete("/deleteQuestion/:questionId", auth, protectedAdminRoutes, deleteQuestion);
router.get("/getAllLevels", auth, protectedAdminRoutes, getAllLevels);
router.get("/getAllQuestionsByLevel/:levelId", auth, protectedAdminRoutes, getAllQuestionsByLevel);
router.get("/fetchLevelTeamStatus", auth, protectedAdminRoutes, fetchLevelTeamStatus);
router.post("/releaseHintsByQuestionId/:questionId/:hintId", auth, protectedAdminRoutes, releaseHintsByQuestionId);
router.delete("/deleteLevel/:levelId", auth, protectedAdminRoutes, deleteLevel);

router.post("/startGame", auth, protectedAdminRoutes, startGame);
router.post("/resetGame", auth, protectedAdminRoutes, resetGame);
router.post("/blockTeam/:teamId", auth, protectedAdminRoutes, blockTeam);
router.post("/finishGame", auth, protectedAdminRoutes, finishGame);
router.post("/unblockTeam/:teamId", auth, protectedAdminRoutes, unblockTeam);
router.get("/fetchGameStatus", auth, protectedAdminRoutes, fetchGameStatus);

router.get('/level-stats', fetchLevelStats);
router.get('/level/:levelId/questions', fetchLevelQuestionStats);
router.get("/fetchAllTeams", auth, protectedAdminRoutes, fetchAllTeams);

export default router;

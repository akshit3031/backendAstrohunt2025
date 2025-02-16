import express from "express";
import { auth } from "../Middleware/Token.middleware.js";
import { createTeam, getTeamCodeToTeamLeader, joinTeam, getCurrentQuestion, submitQuestionCode,getPlayerLeaderBoard,getTeamDetails, fetchGameDetails, fetchLeaderBoard} from "../Controller/Player.controller.js";
import { protectedTeamRoutes } from '../Middleware/Token.middleware.js'

const router = express.Router();

router.post("/createTeam", auth, createTeam);
router.get("/getTeamCodeToTeamLeader", auth, getTeamCodeToTeamLeader);
router.post("/joinTeam", auth, joinTeam);
router.get("/getCurrentQuestion", auth, getCurrentQuestion);
router.post("/submitQuestionCode", auth, protectedTeamRoutes, submitQuestionCode);
router.get("/getPlayerLeaderBoard", auth, getPlayerLeaderBoard);
router.get("/getTeamDetails/:teamId", auth, getTeamDetails);
router.get("/fetchGameDetails", auth, fetchGameDetails);
router.get("/fetchLeaderBoard", auth, fetchLeaderBoard);
export default router;
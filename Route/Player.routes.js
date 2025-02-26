import express from "express";
import { auth } from "../Middleware/Token.middleware.js";
import { createTeam, leaveTeam,getTeamCodeToTeamLeader, joinTeam, getCurrentQuestion, submitQuestionCode,getPlayerLeaderBoard,getTeamDetails, fetchGameDetails, fetchLeaderBoard,forgotPasswordIntitation,setNewPassword} from "../Controller/Player.controller.js";
import { protectedTeamRoutes,gameStartedProtection } from '../Middleware/Token.middleware.js'

const router = express.Router();

router.post("/createTeam", auth, createTeam);
router.post("/leaveTeam", auth, gameStartedProtection, leaveTeam);
router.get("/getTeamCodeToTeamLeader", auth, getTeamCodeToTeamLeader);
router.post("/joinTeam", auth, joinTeam);
router.get("/getCurrentQuestion", auth, getCurrentQuestion);
router.post("/submitQuestionCode", auth, protectedTeamRoutes, submitQuestionCode);
router.get("/getPlayerLeaderBoard", auth, getPlayerLeaderBoard);
router.get("/getTeamDetails/:teamId", auth, getTeamDetails);
router.get("/fetchGameDetails", auth, fetchGameDetails);
router.get("/fetchLeaderBoard", auth, fetchLeaderBoard);
router.post("/intiateForgotPassword", forgotPasswordIntitation);
router.post("/setNewPassword", setNewPassword);
export default router;
import Team from "../Model/Team.js";
import User from "../Model/User.js"
import  { updateTeamScore } from './Game.controller.js'
import GameDetails from "../Model/GameDetails.js";
import Question from "../Model/Question.js";
import { sendEmail } from "../utils/emailService.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
const maxNumberOfTeamMembers = 3;


//Create Team
const createTeam = async (req, res) => {
    try{
        const { teamName } = req.body;
        console.log("BODY: ", req.body);
        console.log("USER: ", req.user);

        const tempUser = await User.findById(req.user._id);

        if(tempUser.team != null){
            return res.status(400).json({message: "You are already in a team",success:false});
        }
        const teamCode = Math.random().toString(36).substring(2, 15);

        const team = await Team.create({
            teamName,
            teamLead: req.user._id,
            members: [req.user._id],
            currentLevel: null,
            score: 0,
            currentQkxuestion: null,
            completedQuestions: [],
            status: "active",
            blocked: false,
            team_code: teamCode
        });

        const user = await User.findByIdAndUpdate(req.user._id, {role: "team_leader", team: team._id});

        
        return res.status(200).json({message: "Team created successfully", team,success:true});
    }
    catch(error){
        return res.status(500).json({message: "Failed to create team", error: error.message,success:false});
    }

}

// leave team 
const leaveTeam = async (req, res) => {
    try{
      const user = req.user;
      const teamId = req.user.team;
      if(!teamId){
        return res.status(400).json({message: "You are not in any team", success: false});
      }
      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(400).json({ message: "Team not found", success: false });
      }
  
      //if the user is a team leader
      if (team.teamLead.toString() === user._id.toString()) {
        console.log("USER IS TEAM LEADER")
        //delete the team entirely and set the alloted team of all users to null and set the player role of team leader to player
        await Team.findByIdAndDelete(teamId);
        await User.updateMany({ team: teamId }, { team: null, role: "player" });
      }
      else{ //if user is not team leader
        console.log("USER IS NOT TEAM LEADER")
        //remove user from team
        await Team.findByIdAndUpdate(teamId, { $pull: { members: user._id } });
        await User.updateOne({ _id: user._id }, { team: null, role: "player" });
      }
  
  
      return res.status(200).json({ message: "Left team successfully", success: true});
    }
    catch(error){
      console.log(error);
      return res.status(500).json({ message: "Failed to leave team", error: error.message, success: false });
    }
  }

const getTeamCodeToTeamLeader = async (req, res) => {
    try{
        const user = req.user;
        const team = await Team.findOne({teamLead: user._id});
        if(!team){
            return res.status(400).json({message: "You are not a team leader of any team"});
        }
        return res.status(200).json({message: "Team code", team_code: team.team_code});
    }
    catch(error){
        return res.status(500).json({message: "Failed to get team code to team leader", error: error.message});
    }
}
const getTeamDetails = async (req, res) => {
    try{
        const teamId = req.params.teamId;
        const team = await Team.findById(teamId).populate("members");
        return res.status(200).json({message: "Team details", team, success: true});
    }

    catch(error){
        return res.status(500).json({message: "Failed to get team details", error: error.message, success: false});
    }
}
const joinTeam = async (req, res) => {
    try{
        const {teamCode} = req.body;


        if(!teamCode){
            return res.status(400).json({message: "Team code is required",success:false});
        }

        const team = await Team.findOne({team_code: teamCode});
        if(!team){
            return res.status(400).json({message: "Invalid team code",success:false});
        }

        if(team.members.length >= maxNumberOfTeamMembers){
            return res.status(400).json({message: "Team is full",success:false});
        }

        const user = await User.findById(req.user._id);

        if(user.team != null){
            return res.status(400).json({message: "You are already in a team",success:true});
        }

        await User.findByIdAndUpdate(req.user._id, {team: team._id});
        await Team.findByIdAndUpdate(team._id, {$push: {members: req.user._id}});

        return res.status(200).json({message: "Joined team successfully",team,success:true});
    }
    catch(error){
        return res.status(500).json({message: "Failed to join team", error: error.message,success:false});
    }

        
}


const getCurrentQuestion = async (req, res) => {
    try{
        const user = req.user;
        const team = await Team.findById(user.team);
        if(!team){
            return res.status(400).json({message: "You are not in any team"});
        }

        if(team.hasCompletedAllLevels){
            return res.status(400).json({message: "Your team has already completed all levels", success: false});
        }

        if(team.currentLevel == null){
            return res.status(400).json({message: "Your team has not been alloted a question. The game might not have been started yet by the admin."})
        }

        const currQuestion = await Question.findById(team.currentQuestion).select("-correctCode -createdBy").populate("level");


        //filitering the hints
        currQuestion.hints = currQuestion.hints.filter(hint => hint.flag === true);

        if(!currQuestion){
            return res.status(400).json({message: "The question you requested for does not exist"});
        }

        return res.status(200).json({message: "Current question", currQuestion: currQuestion, success: true});
    }
    catch(error){
        return res.status(500).json({message: "Failed to get current question", error: error.message, success: false});
    }
}

const submitQuestionCode = async (req, res) => {
    try{
        const { questionCode, questionId } = req.body;
        const user = req.user;

        //checking if alloted question is the same as question fetched
        const team = await Team.findById(user.team);
        if(team.currentQuestion.toString() !== questionId){
          return res.status(400).json({message: "You are trying to submit code for a question that is not alloted to you"});
        }

        console.log("RECEIVED QUESTION CODE: ", questionCode);
        console.log("RECEIVED QUESTION ID: ", questionId);

        if(user.role !== "team_leader"){
            return res.status(400).json({message: "Only Team Leaders can submit the question code"});
        }

        const question = await Question.findById(questionId);

        


        if(!question){
            return res.status(400).json({message: "Question not found"});
        }

        if(question.correctCode.trim().toLowerCase() !== questionCode.trim().toLowerCase()){
            return res.status(400).json({message: "Incorrect question code"});
        }

        //The team leader has entered the correct code for the question
        //Updating the team's score
        const response = await updateTeamScore(user.team);
        if(response.success===true){
          return res.status(200).json({message: response.message, success: response.success});
        }
        return res.status(400).json({message: response.message, success: response.success});
    }
    catch(error){
        return res.status(500).json({message: "Failed to submit question code", error: error.message, success: false});
    }
}


const getPlayerLeaderBoard = async (req, res) => {
    try{
        const allTeams = await Team.find({}).select("teamName currLevel score completedQuestions")
        if(allTeams.length === 0){
            return res.status(400).json({message: "No teams have been created in the game yet"});
        }
        const teamsSortedByScore = allTeams.sort((a, b) => a.score - b.score);
        return res.status(200).json({message: "Player Leaderboard", leaderboard: teamsSortedByScore});
    }
    catch(error){
        return res.status(500).json({message: "Error fetching player leaderboard", error: error.message, completeError: error});
    }
}

const fetchGameDetails = async (req, res) => {
    try{
        const gameDetails = await GameDetails({});
        if(!gameDetails){
            return res.status(404).json({ success: true, message: "Game Details not found"});
        }
        return res.status(200).json({success: true, message: "Game Details Fetched", gameDetails});
    }
    catch(error){
        return res.status(500).json({success: false, error: error.message, message: 
            "Unable to fetch game details"
        })
    }
}


const fetchLeaderBoard = async (req, res) => {
    try{
        const gameDetails = await GameDetails.findOne({});
        if (!gameDetails || !gameDetails.leaderboard) {
            return res.status(404).json({ message: "Game not started or leaderboard not found", success: false });
        }

        // Populate team details for each level (leaderboard is already sorted by index)
        const leaderboardWithDetails = await Promise.all(
            (gameDetails.leaderboard || []).map(async (levelEntry) => {
                // Preserve the order of teams as they appear in levelEntry.teams array
                // This maintains the queue order (first to solve = first in array)
                const teams = [];
                for (const teamId of levelEntry.teams) {
                    const team = await Team.findById(teamId)
                        .select('teamName currentLevel hasCompletedAllLevels')
                        .populate('currentLevel', 'level')
                        .lean();
                    if (team) teams.push(team);
                }
                
                return {
                    level: levelEntry.level,
                    teams: teams  // Teams are in queue order (first solved = first in array)
                };
            })
        );

        // Get top 10 teams by starting from HIGHEST level and taking teams from the START of each level's queue
        const top10Teams = [];
        for (let i = leaderboardWithDetails.length - 1; i >= 0 && top10Teams.length < 10; i--) {
            const levelTeams = leaderboardWithDetails[i].teams;
            // Take teams from the beginning of this level (first to solve)
            for (let j = 0; j < levelTeams.length && top10Teams.length < 10; j++) {
                top10Teams.push(levelTeams[j]);
            }
        }

        return res.status(200).json({
            message: "Leaderboard fetched successfully",
            leaderboard: top10Teams,  // Top 10 teams for players
            success: true
        });
    }
    catch(error){
        return res.status(500).json({message: "Error fetching leaderboard", error: error.message, completeError: error, success: false});
    }
}
const tempUserStore = new Map();
const forgotPasswordIntitation = async (req, res) => {
    try {
      const { email } = req.body;
  
      if (!email) {
        return res
          .status(400)
          .json({ message: "Email is required", success: false });
      }
      const user = await User.findOne({ email });
  
      if (!user) {
        return res
          .status(400)
          .json({ message: "User not found", success: false });
      }
  
      const otp = Math.random().toString().substring(2, 8);
      const forgotPasswordToken = crypto.randomBytes(32).toString("hex");
  
      const tempUserObject = {
        email: email,
        otp: otp,
      };
      tempUserStore.set(forgotPasswordToken, tempUserObject);
  
      const IntervalID = setTimeout(() => {
        if (!res.headersSent) {
          tempUserStore.delete(forgotPasswordToken);
          res.clearCookie("forgotPasswordToken");
        }
      }, 10 * 60 * 1000);
  
      await sendEmail(email, otp, "Your OTP for forgot password");
  
      res.cookie("forgotPasswordToken", forgotPasswordToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none", // Allow cross-origin cookies
        maxAge: 10 * 60 * 1000, // 10 minutes
        path: "/", // Accessible everywhere
      });
  
    //   console.log("COOKIES ARE SET: ", res.cookie.forgotPasswordToken);
  
      return res
        .status(200)
        .json({ message: "OTP sent to your email", success: true });
    } catch (error) {
      console.log("ERROR: ", error.message);
      return res.status(500).json({
        message: "Failed to send OTP",
        error: error.message,
        completeError: error,
        success: false,
      });
    }
  };    

  const setNewPassword = async (req, res) => {
    try {
      const { otp, newPassword } = req.body;
      console.log("OTP SENT: ", otp);
      console.log("NEW PASSWORD", newPassword);
      const forgotPasswordToken = req.cookies.forgotPasswordToken;
      console.log("COOKIES", req.cookies);
      console.log("FORGOT PASSWORD TOKEN: ", forgotPasswordToken);
      if (!forgotPasswordToken) {
        return res
          .status(400)
          .json({ message: "Forgot Password Token is required", success: false });
      }
  
      const emailUser = tempUserStore.get(forgotPasswordToken);
      console.log("EMAIL USER: ", emailUser);
      if (!emailUser) {
        return res.status(400).json({
          message:
            "Invalid forgot password token or forgot password token expired",
          success: false,
        });
      }
  
      console.log("EMAIL USER OTP:", emailUser.otp);
      console.log("SENT OTP: ", otp);
      if (emailUser.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP", success: false });
      }
  
      const newPasswordHashed = await bcrypt.hash(newPassword, 10);
  
      await User.findOneAndUpdate(
        { email: emailUser.email },
        { password: newPasswordHashed }
      );
  
      return res
        .status(200)
        .json({ message: "Password updated successfully", success: true });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        message: "Failed to update password",
        error: error.message,
        sucess: false,
      });
    }
  };

export {createTeam, leaveTeam,getTeamCodeToTeamLeader, joinTeam, getCurrentQuestion, submitQuestionCode, getPlayerLeaderBoard,getTeamDetails, fetchGameDetails, fetchLeaderBoard,forgotPasswordIntitation,
  setNewPassword};





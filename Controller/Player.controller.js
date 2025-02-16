import Team from "../Model/Team.js";
import User from "../Model/User.js"
import  { updateTeamScore } from './Game.controller.js'
import GameDetails from "../Model/GameDetails.js";
import Question from "../Model/Question.js";

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

        console.log("RECEIVED QUESTION CODE: ", questionCode);
        console.log("RECEIVED QUESTION ID: ", questionId);

        if(user.role !== "team_leader"){
            return res.status(400).json({message: "Only Team Leaders can submit the question code"});
        }

        const question = await Question.findById(questionId);
        if(!question){
            return res.status(400).json({message: "Question not found"});
        }

        if(question.correctCode !== questionCode){
            return res.status(400).json({message: "Incorrect question code"});
        }

        //The team leader has entered the correct code for the question
        //Updating the team's score
        const message = await updateTeamScore(user.team);

        return res.status(200).json({message: message, success: true});
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

        const allTeams = await Team.find({}).select("teamName currentLevel currentQuestion score");
        if(!allTeams){
            return res.status(404).json({message: "No teams found", success: false});
        }
        const teamsSortedByScore = allTeams.sort((a, b) => b.score - a.score).slice(0, 10);
        return res.status(200).json({message: "Leaderboard", leaderboard: teamsSortedByScore, success: true});
    }
    catch(error){
        return res.status(500).json({message: "Error fetching leaderboard", error: error.message, completeError: error, success: false});
    }
}





export {createTeam, getTeamCodeToTeamLeader, joinTeam, getCurrentQuestion, submitQuestionCode, getPlayerLeaderBoard,getTeamDetails, fetchGameDetails, fetchLeaderBoard};





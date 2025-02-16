import Level from "../Model/Level.js";
import Question from "../Model/Question.js";
import cloudinary from "../config/cloudinary.js";
import GameDetails from "../Model/GameDetails.js";
import Team from "../Model/Team.js";
// add level
const addLevel = async (req, res) => {
  try {
    const { level } = req.body;

    //check if level already exists
    const existingLevel = await Level.findOne({ level });
    if (existingLevel) {
      return res.status(400).json({ message: "Level already exists" });
    }

    const newLevel = await Level.create({ level });
    await newLevel.save();
    res.status(201).json({ message: "Level created successfully", newLevel });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create Level", error: error.message });
  }
};

// add question
const addQuestion = async (req, res) => {
  // Declare imageData at the top level of the function
  console.log("ADD QUESTION REQUEST RECIVED FROM: ", req.user.email)
  let imageData = {};

  try {
    const { levelNum, title, description, correctCode } = req.body;
    const hints = JSON.parse(req.body.hints);
    console.log(req.body);
    console.log(req.user);
    console.log("CREATED BY: ", req.user._id);

    let newHints = []; //to store the hints in the correct format
    hints.map((hint) => {
      newHints.push({
        text: hint,
        flag: false,
        unlockTime: 5,
      });
    });
    console.log("New Hint: ", newHints);

    //coveting levelNum to number
    const levelNumber = Number(req.body.levelNum);
    // Check if level exists
    const level = await Level.findOne({ level: levelNumber });

    if (!level) {
      return res.status(404).json({ message: "Level not found" });
    }

    // Validate hints

    if (!Array.isArray(hints) || hints.length === 0) {
      return res.status(400).json({
        message: "At least one hint is required",
      });
    }

    // Handle image upload
    if (req.file) {
      try {
        // Upload to cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "astrohunt/questions",
          use_filename: true,
          unique_filename: true,
        });

        imageData = {
          url: result.secure_url,
          public_id: result.public_id,
          alt: title,
        };
      } catch (error) {
        return res.status(400).json({
          message: "Image upload failed",
          error: error.message,
        });
      }
    }

    // Create new question
    const newQuestion = new Question({
      level: level._id,
      title,
      description,
      hints: newHints,
      correctCode,
      image: Object.keys(imageData).length > 0 ? imageData : undefined,
      createdBy: req.user._id, // Assuming you have user info from auth middleware
    });

    await newQuestion.save();

    //link level to the question
    level.questions.push(newQuestion._id);
    await level.save();

    return res.status(201).json({
      message: "Question created successfully",
      question: {
        id: newQuestion._id,
        title: newQuestion.title,
        level: newQuestion.level,
        image: newQuestion.image,
        createdAt: newQuestion.createdAt,
      },
    });
  } catch (error) {
    // If image was uploaded but question creation failed, delete from cloudinary
    if (imageData && imageData.public_id) {
      await cloudinary.uploader.destroy(imageData.public_id);
    }

    return res.status(500).json({
      message: "Failed to create question",
      error: error.message,
    });
  }
};

//modify question
const modifyQuestion = async (req, res) => {
  let imageData = {};

  try {
    const { questionId } = req.params;
    const {
      title,
      description,
      hints,
      correctCode,
      levelNum,
      isImageUpdated // In case level needs to be changed
    } = req.body;
    console.log("QUESTION ID: ", questionId);
    console.log("MODIFIED QUESTION BODY: ", req.body);
    console.log("ENTIRE REQUEST: ", req);
  

    // Format hints if provide

    // Handle image upload if new image is provided
    if (isImageUpdated==='true' && req.file) {
      try {
        // Delete old image from cloudinary if exists
        if (question.image && question.image.public_id) {
          await cloudinary.uploader.destroy(question.image.public_id);
        }

        // Upload new image
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "astrohunt/questions",
          use_filename: true,
          unique_filename: true,
        });

        imageData = {
          url: result.secure_url,
          public_id: result.public_id,
          alt: title || question.title,
        };
      } catch (error) {
        return res.status(400).json({
          message: "Image upload failed",
          error: error.message,
        });
      }
    }

    // Prepare update object with only provided fields
    const updateData = { title, description, hints, correctCode, levelNum };

    if(isImageUpdated === 'true'){
        console.log("UPDATED IMAGE");
        updateData.image = imageData;
    }

    // Update question
    console.log("UPDATING QUESTION")
    const updatedQuestion = await Question.findByIdAndUpdate(
      questionId,
      updateData,
      { new: true }
    ).populate("level");
    console.log("UPDATED QUESTION: ", updatedQuestion);

    return res.status(200).json({
      message: "Question updated successfully",
      question: {
        id: updatedQuestion._id,
        title: updatedQuestion.title,
        level: updatedQuestion.level,
        description: updatedQuestion.description,
        hints: updatedQuestion.hints,
        image: updatedQuestion.image,
        updatedAt: updatedQuestion.updatedAt,
      },
    });
  } catch (error) {
    // If new image was uploaded but update failed, delete it
    if (imageData && imageData.public_id) {
      await cloudinary.uploader.destroy(imageData.public_id);
    }

    return res.status(500).json({
      message: "Failed to update question",
      error: error.message,
    });
  }
};

//delete question
const deleteQuestion = async (req, res) => {
  try {
    console.log("DELETING QUESTION REQUEST RECIEVED FROM: ", req.user.email);
    const { questionId } = req.params;
    console.log("DELETING QUESTION WITH ID: ", questionId);
    const question = await Question.findById(questionId);
    console.log("Question Found: ", question)
    if(!question){
      return res.status(404).json({message: "Question not found", success: false});
    }

    //delete image from cloudinary if exists
    try{
    if(question.image && question.image.public_id){
      await cloudinary.uploader.destroy(question.image.public_id);
    } 
  }
  catch(error){
    return res.status(500).json({message: "Error deleting image from cloudinary", error: error.message, success: false});
  }

    //delete question from level
    const level = await Level.findById(question.level);
    level.questions = level.questions.filter(
      (id) => id.toString() !== questionId
    );
    await level.save();

    await Question.findByIdAndDelete(questionId);

    return res.status(200).json({message: "Question deleted successfully", success: true});
  } catch (error) {
    return res.status(500).json({message: "Failed to delete question", error: error.message, success: false});
  }
};


//get all levels
const getAllLevels = async (req, res) => {
  try {
    console.log("GETTTING ALL LEVELS");
    const levels = await Level.find();
    return res.status(200).json({levels});
  } catch (error) {
    return res.status(500).json({message: "Failed to get all levels", error: error.message});
  }
};


//get all questions within a level
const getAllQuestionsByLevel = async (req, res) => {
  try {
    console.log("GETTING ALL QUESTIONS BY LEVE level ID: ", req.params);
    const { levelId } = req.params;
    console.log("LEVEL ID: ", levelId);
    const questions = await Question.find({level: levelId});
    console.log("QUESTIONS: ", questions);
    return res.status(200).json({questions});
  } catch (error) {
    return res.status(500).json({message: "Failed to get all questions", error: error.message});
  }
};

//delete a level
const deleteLevel = async (req, res) => {
  try {
    const  { levelId }  = req.params;
    const level = await Level.findById(levelId);
    if(!level){
      return res.status(404).json({message: "Level not found"});
    }

    //delete all questions within the level
    await Question.deleteMany({level: levelId});

    //delete the level
    await Level.findByIdAndDelete(levelId);

    return res.status(200).json({message: "Level deleted successfully"});
    
  } catch (error) {
    return res.status(500).json({message: "Failed to delete level", error: error.message});
  }
};


const getQuestionWithHints = async (req, res) => {
  try{
    const {questionId} = req.params;
    const question = await Question.findById(questionId);
    if(!question){
      return res.status(404).json({message: "Question not found"});
    }
    return res.status(200).json({question, success: true});
  }
  catch(error){
    return res.status(500).json({message: "Failed to get question with hints", error: error.message});
  }
}


const fetchLevelTeamStatus = async (req, res) => {
  try{

    const gameDetails = await GameDetails.findOne({});
    if(gameDetails.hasGameStarted === false){
      return res.status(400).json({message: "Game has not started yet", success: false});
    }

    const allTeams = await Team.find().populate("currentLevel currentQuestion");
    const allLevels = await Level.find().populate("questions");


    const levelTeamStatus = allLevels.map( (level) => {

      return {
        levelId: level._id,
        levelName: level.level,
        questions: level.questions.map( (question) => {
          const allTeamsAllotedTheQuestion = allTeams.filter(team => team.currentQuestion._id.toString() === question._id.toString());
          console.log("ALL TEAMS ALLOTED THE QUESTION: ", allTeamsAllotedTheQuestion);
          return {
            questionId: question._id,
            questionTitle: question.title,
            allotedTo: allTeamsAllotedTheQuestion.map(team => team.teamName)
          }

        } )
      }

    })
    return res.status(200).json({levelTeamStatus, success: true});


  }
  catch(error){
    return res.status(500).json({message: "Failed to fetch level team status", error: error.message, success: false});
  }
}


const releaseHintsByQuestionId = async (req, res) => {
  try{
    const {questionId, hintId} = req.params;
    const question = await Question.findById(questionId);

    console.log("QUESTION: ", question);
    console.log("HINT ID: ", hintId);
    if(!question){
      return res.status(404).json({message: "Question not found", success: false});
    }

    //check if question exists
    question.hints = question.hints.map((hint) => {
      if(hint._id.toString() === hintId){
        hint.flag = true;
      }
      return hint;
    })

    await question.save();
    return res.status(200).json({message: "Hints released successfully", success: true});
  }
  catch(error){
    return res.status(500).json({message: "Failed to release hints", error: error.message, success: false});
  }
}

const fetchLevelStats = async (req, res) => {
  try {
    const gameDetails = await GameDetails.findOne({});
    if (!gameDetails || gameDetails.hasGameStarted === false) {
      return res.status(400).json({ message: "Game has not started yet", success: false });
    }

    // Fetch teams with populated currentLevel
    const allTeams = await Team.find().populate('currentLevel');
    
    // Fetch all levels
    const allLevels = await Level.find().sort({ level: 1 }); // Sort by level number

    const levelStats = allLevels.map(level => {
      // Get teams in this level
      const teamsInLevel = allTeams.filter(team => 
        team.currentLevel && team.currentLevel._id.toString() === level._id.toString()
      );

      return {
        levelId: level._id,
        levelNumber: level.level,
        totalTeams: teamsInLevel.length,
        teamNames: teamsInLevel.map(team => ({
          teamName: team.teamName,
          teamId: team._id
        })),
        totalQuestions: level.questions ? level.questions.length : 0
      };
    });

    return res.status(200).json({ levelStats, success: true });

  } catch (error) {
    console.error('Error in fetchLevelStats:', error);
    return res.status(500).json({
      message: "Failed to fetch level statistics", 
      error: error.message, 
      success: false
    });
  }
};

const fetchLevelQuestionStats = async (req, res) => {
  try {
    const { levelId } = req.params;

    const level = await Level.findById(levelId).populate('questions');
    if (!level) {
      return res.status(404).json({ message: "Level not found", success: false });
    }

    const allTeams = await Team.find().populate('currentQuestion currentLevel');

    const questionStats = level.questions.map(question => {
      // Get teams currently on this question
      const teamsOnQuestion = allTeams.filter(team => 
        team.currentLevel && 
        team.currentQuestion &&
        team.currentLevel._id.toString() === levelId &&
        team.currentQuestion._id.toString() === question._id.toString()
      );

      return {
        questionId: question._id,
        title: question.title,
        hints: question.hints,
        correctCode: question.correctCode,
        currentlyAttempting: teamsOnQuestion.length,
        attemptingTeams: teamsOnQuestion.map(team => ({
          teamName: team.teamName,
          teamId: team._id
        }))
      };
    });

    return res.status(200).json({
      levelNumber: level.level,
      questionStats,
      success: true
    });

  } catch (error) {
    console.error('Error in fetchLevelQuestionStats:', error);
    return res.status(500).json({
      message: "Failed to fetch level question statistics", 
      error: error.message, 
      success: false
    });
  }
};


const blockTeam = async (req, res) => {
  try{
    const {teamId} = req.params;
    console.log("BLOCKING TEAM: ", teamId);
    const team = await Team.findById(teamId);
    if(!team){
      return res.status(404).json({message: "Team not found", success: false});
    }
    team.blocked = true;
    await team.save();
    return res.status(200).json({message: "Team blocked successfully", success: true});
  }
  catch(error){
    return res.status(500).json({message: "Failed to block team", error: error.message, success: false});
  }
}

const unblockTeam = async (req, res) => {
  try{
    const {teamId} = req.params;
    const team = await Team.findById(teamId);
    if(!team){
      return res.status(404).json({message: "Team not found", success: false});
    }
    team.blocked = false;
    await team.save();
    return res.status(200).json({message: "Team blocked successfully", success: true});
  }
  catch(error){
    return res.status(500).json({message: "Failed to unblock team", error: error.message, success: false});
  }
}

const fetchAllTeams = async (req, res) => {
  try{
    const allTeams = await Team.find().populate('currentLevel teamLead members');
    return res.status(200).json({allTeams, success: true});
  }
  catch(error){
    return res.status(500).json({message: "Failed to fetch all teams", error: error.message, success: false});
  }
}


export { addLevel, addQuestion, modifyQuestion, deleteQuestion, getAllLevels, getAllQuestionsByLevel, deleteLevel, releaseHintsByQuestionId, fetchLevelTeamStatus, fetchLevelStats, fetchLevelQuestionStats, blockTeam, unblockTeam, fetchAllTeams };
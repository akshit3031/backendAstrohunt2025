import jwt from "jsonwebtoken";
import User from "../Model/User.js";
import Team from "../Model/Team.js";
import GameDetails from "../Model/GameDetails.js";

const generateRefreshToken = (userId) => {
  const refreshToken = jwt.sign(
    { userId: userId },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
    }
  );
  return refreshToken;
};

const generateAccessToken = (userId) => {
  const accessToken = jwt.sign(
    { userId: userId },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "1h",
    }
  );
  return accessToken;
};

const auth = async (req, res, next) => {
  console.log("AUTH MIDDLEWARE CALLED");
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;
  console.log("ACCESS TOKEN: ", accessToken);
  console.log("REFRESH TOKEN: ", refreshToken);


  if (!accessToken) {
    console.log("NO ACCESS TOKEN FOUND");
    if (!refreshToken) {
      console.log("NO REFRESH TOKEN FOUND");
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      console.log("DECODING TOKEN: ");
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      console.log("Decoded JWT: 1 ", decoded);
      req.user = await User.findById(decoded.userId);
      console.log("Found user:  ", req.user);

      console.log("GENERATING NEW ACCESS TOKEN: ");
      const newAccessToken = generateAccessToken(req.user._id);
      req.newAccessToken = newAccessToken;
      console.log("NEW ACCESS TOKEN: ", newAccessToken);


      next();
    } catch (error) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  } else {
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
      console.log("decoded object: ", decoded);
      req.user = await User.findById(decoded.userId);
      console.log("FOUND USER: ", req.user);
      console.log("Decoded JWT: 3", decoded);
      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid access token" });
    }
  }
};


const protectedAdminRoutes = async (req, res, next) => {
  try{

    const user = req.user;
    console.log("USER IS ", req.user.role)
    if(user.role !== "admin"){
      console.log(req.user.email, "IS NOT AN ADMIN", req.user.role);
      return res.status(401).json({message: "This is a protected route. Only admins are authorized"})
    }
    next();
  }
  catch(error){
    return res.status(500).json({message: "Error in protectedAdminRoutes", error: error.message,
      completeError: error})
  }
}

const protectedTeamRoutes = async (req, res, next) => {
  try{
    const user = req.user;
    console.log("USER DETAILS: ", user);
    console.log("USER TEAM: ", user.team);

    const gameDetails = await GameDetails.findOne({});
    if(!gameDetails){
      return res.status(400).json({message: "Game cannot be found", success: false})
    }
    if(gameDetails.hasGameStarted === false){
      return res.status(400).json({message: "Game is not started yet", success: false})
    }

    if(gameDetails.hasGameFinished === true){
      return res.status(400).json({message: "Game has finished", success: false})
    }
    if(!user.team){
      return res.status(400).json({message: "User does not belong to any team", success: false})
    }
    console.log("USER TEAM ID: ", user.team);
    const teamOfUser = await Team.findById(user.team);
    console.log("TEAM OF USER: ", teamOfUser);
    if(!teamOfUser){
      return res.status(400).json({message: "User's team cannot be found", success: false})
    }
    console.log("TEAM OF THE USER BLOCKED: ", teamOfUser.blocked);
    if(teamOfUser.blocked){
      return res.status(400).json({message: "Your team has been blocked by the admin, please contact admin for furthur queries.", success: false})
    }

    next();
  }
  catch(error){
    console.log("ERROR IN PROTECTED TEAM ROUTE: ", error);
    return res.status(500).json({message: "Error in protectedTeamRoute", error: error.message,
      completeError: error});
  }
}

export { auth, generateAccessToken, generateRefreshToken, protectedAdminRoutes, protectedTeamRoutes };

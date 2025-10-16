import jwt from "jsonwebtoken";
import User from "../Model/User.js";
import Team from "../Model/Team.js";
import GameDetails from "../Model/GameDetails.js";

const generateAccessToken = (userId) => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    // Fail fast with a clear error so the caller/logs can indicate missing config
    throw new Error('JWT_ACCESS_SECRET is not defined in environment variables');
  }
  const accessToken = jwt.sign({ userId: userId }, secret, { expiresIn: '24h' });
  return accessToken;
};

// Helper to set auth cookies consistently and optionally expose tokens to the response body
const setAuthCookies = (res, { accessToken } = {}) => {
  try {
    // Access token (server-side cookie setting commented out so frontend sets cookies explicitly)
    if (accessToken) {
      // res.cookie("accessToken", accessToken, {
      //   httpOnly: true,
      //   secure: process.env.NODE_ENV === "production",
      //   sameSite: "None",
      //   maxAge: 60 * 60 * 1000, // 1 hour
      //   path: "/",
      // });
    }
    // Also attach token to res.locals for route handlers to include in JSON responses if desired
    if (!res.locals) res.locals = {};
    if (accessToken) res.locals.token = accessToken;
  } catch (err) {
    console.log("Error while setting auth cookies:", err);
  }
};

const auth = async (req, res, next) => {
  console.log("AUTH MIDDLEWARE CALLED (header-based)");
  // Expect Authorization: Bearer <token>
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: missing Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: malformed token' });
  }

  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      console.error('JWT_ACCESS_SECRET is not defined - cannot verify token');
      return res.status(500).json({ message: 'Server misconfiguration: missing JWT secret' });
    }
    const decoded = jwt.verify(token, secret);
    req.user = await User.findById(decoded.userId);
    if (!req.user) return res.status(401).json({ message: 'Unauthorized: user not found' });
    next();
  } catch (err) {
    console.log('Token verification failed:', err.message);
    return res.status(401).json({ message: 'Invalid token' });
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

const gameStartedProtection = async (req, res, next) => {
  try{
    const gameDetails = await GameDetails.findOne({});

    if(!gameDetails){
      next();
    }

    if(gameDetails.hasGameStarted === true){
      return res.status(400).json({message: "Game is not started hence you cannot perform this operation", success: false})
    }
    //else if the game has not yet started then allow this operation to occur
    next()
  }
  catch(error){
    console.log("ERROR IN GAME STARTED PROTECTION: ", error);
    return res.status(500).json({message: "Error in gameStartedProtection", error: error.message,
      completeError: error});
  }
}


export { auth, generateAccessToken, protectedAdminRoutes, protectedTeamRoutes,gameStartedProtection };

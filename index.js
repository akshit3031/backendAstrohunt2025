import express from "express";
import dotenv from "dotenv";
import { connect } from "./Configuration/Database.js";
import routes from "./Route/index.js";
import cookieParser from "cookie-parser";
import cors from "cors";

// Load environment variables before any other imports
dotenv.config();
const app = express();

// CORS configuration
app.use(
  cors({
    origin: "https://frontend-astrohunt2025.vercel.app", // Specify the exact frontend URL (no trailing slash)
    credentials: true, // Allow cookies and credentials
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers for preflight requests
  })
);



// Middleware
app.use(express.json());
app.use(cookieParser());

// Database connection
connect();

// Routes
app.use("/api", routes);

app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Hello World",
  });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

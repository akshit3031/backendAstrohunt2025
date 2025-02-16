import express from "express";
import userRoutes from "./userroutes.js";
import adminRoutes from "./adminRoutes.js";
import PlayerRoutes from "./Player.routes.js";

const router = express.Router();
router.use("/user", userRoutes);
router.use("/admin", adminRoutes);
router.use("/player", PlayerRoutes);
export default router;

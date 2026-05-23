import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import shipmentsRouter from "./shipments";
import investmentsRouter from "./investments";
import walletRouter from "./wallet";
import trackerRouter from "./tracker";
import guildRouter from "./guild";
import profileRouter from "./profile";
import marketRouter from "./market";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/shipments", shipmentsRouter);
router.use("/investments", investmentsRouter);
router.use("/wallet", walletRouter);
router.use("/tracker", trackerRouter);
router.use("/guild", guildRouter);
router.use("/profile", profileRouter);
router.use("/market", marketRouter);
router.use("/admin", adminRouter);

export default router;

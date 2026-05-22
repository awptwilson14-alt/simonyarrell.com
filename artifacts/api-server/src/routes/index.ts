import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stylistRouter from "./stylist";
import usageRouter from "./usage";
import subscriptionsRouter from "./subscriptions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stylistRouter);
router.use(usageRouter);
router.use(subscriptionsRouter);

export default router;

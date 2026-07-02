import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stylistRouter from "./stylist";
import tryonRouter from "./tryon";
import usageRouter from "./usage";
import subscriptionsRouter from "./subscriptions";
import promoRouter from "./promo";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stylistRouter);
router.use(tryonRouter);
router.use(usageRouter);
router.use(subscriptionsRouter);
router.use(promoRouter);

export default router;

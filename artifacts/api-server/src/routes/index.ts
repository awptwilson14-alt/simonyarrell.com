import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stylistRouter from "./stylist";
import tryonRouter from "./tryon";
import usageRouter from "./usage";
import subscriptionsRouter from "./subscriptions";
import promoRouter from "./promo";
import looksRouter from "./looks";
import newsletterRouter from "./newsletter";
import affiliateRouter from "./affiliate";
import itemImageRouter from "./itemImage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stylistRouter);
router.use(tryonRouter);
router.use(usageRouter);
router.use(subscriptionsRouter);
router.use(promoRouter);
router.use(looksRouter);
router.use(newsletterRouter);
router.use(affiliateRouter);
router.use(itemImageRouter);

export default router;

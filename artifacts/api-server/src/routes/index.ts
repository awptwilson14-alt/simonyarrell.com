import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stylistRouter from "./stylist";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stylistRouter);

export default router;

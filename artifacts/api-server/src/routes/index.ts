import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import placesRouter from "./places";
import eventsRouter from "./events";
import dealsRouter from "./deals";
import favoritesRouter from "./favorites";
import itinerariesRouter from "./itineraries";
import collectionsRouter from "./collections";
import exploreRouter from "./explore";
import citiesRouter from "./cities";
import moviesRouter from "./movies";
import hotelsRouter from "./hotels";
import activitiesRouter from "./activities";
import transitRouter from "./transit";
import aiRouter from "./ai";
import recommendationsRouter from "./recommendations";
import searchRouter from "./search";
import pulseRouter from "./pulse";
import newsRouter from "./news";
import reportsRouter from "./reports";
import cityGuideRouter from "./cityGuide";
import adminRouter from "./admin";
import moderationRouter from "./moderation";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(citiesRouter);
router.use(placesRouter);
router.use(eventsRouter);
router.use(dealsRouter);
router.use(favoritesRouter);
router.use(itinerariesRouter);
router.use(collectionsRouter);
router.use(exploreRouter);
router.use(moviesRouter);
router.use(hotelsRouter);
router.use(activitiesRouter);
router.use(transitRouter);
router.use(searchRouter);
router.use(pulseRouter);
router.use(newsRouter);
router.use(reportsRouter);
router.use(cityGuideRouter);
// The moderation router owns the `/admin/moderation`, `/admin/reports` and
// `/admin/content-health` paths, so it is mounted ahead of the generic `/admin/:collection`
// CRUD router — which passes anything that is not a known collection straight through.
router.use(moderationRouter);
router.use(adminRouter);
router.use(recommendationsRouter);
router.use(aiRouter);

export default router;

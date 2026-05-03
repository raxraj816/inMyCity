import { Router, type IRouter } from "express";
import healthRouter from "./health";
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

const router: IRouter = Router();

router.use(healthRouter);
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
router.use(aiRouter);

export default router;

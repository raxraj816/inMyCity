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

export default router;

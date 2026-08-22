import { Router } from "express";
import { SUPPORTED_CITIES } from "@workspace/city-config";

const router = Router();

router.get("/cities", (_req, res) => {
  res.json(SUPPORTED_CITIES.filter((city) => city.status !== "demo"));
});

export default router;

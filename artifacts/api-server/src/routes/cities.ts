import { Router } from "express";

const router = Router();

const SUPPORTED_CITIES = [
  { id: "mumbai", name: "Mumbai", displayName: "Mumbai, Maharashtra", country: "India", state: "Maharashtra", lat: 19.076, lng: 72.8777, status: "live", tagline: "The City of Dreams" },
  { id: "bangalore", name: "Bangalore", displayName: "Bangalore, Karnataka", country: "India", state: "Karnataka", lat: 12.9716, lng: 77.5946, status: "live", tagline: "Silicon Valley of India" },
  { id: "new-york", name: "New York", displayName: "New York, USA", country: "USA", state: "New York", lat: 40.7128, lng: -74.006, status: "live", tagline: "The City That Never Sleeps" },
  { id: "san-francisco", name: "San Francisco", displayName: "San Francisco, USA", country: "USA", state: "California", lat: 37.7749, lng: -122.4194, status: "live", tagline: "By the Golden Gate" },
  { id: "delhi", name: "Delhi", displayName: "Delhi, India", country: "India", state: "Delhi", lat: 28.7041, lng: 77.1025, status: "soon", tagline: "Heart of India" },
  { id: "hyderabad", name: "Hyderabad", displayName: "Hyderabad, Telangana", country: "India", state: "Telangana", lat: 17.385, lng: 78.4867, status: "soon", tagline: "City of Pearls" },
  { id: "pune", name: "Pune", displayName: "Pune, Maharashtra", country: "India", state: "Maharashtra", lat: 18.5204, lng: 73.8567, status: "soon", tagline: "Oxford of the East" },
  { id: "chennai", name: "Chennai", displayName: "Chennai, Tamil Nadu", country: "India", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, status: "soon", tagline: "Gateway to South India" },
];

router.get("/cities", (_req, res) => {
  res.json(SUPPORTED_CITIES);
});

export default router;

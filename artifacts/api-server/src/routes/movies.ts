import { Router } from "express";
import { db, moviesTable } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";

const router = Router();

router.get("/movies", async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    const status = req.query.status as string | undefined;
    const genre = req.query.genre as string | undefined;
    const language = req.query.language as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const conditions = [];
    if (city) conditions.push(ilike(moviesTable.city, `%${city}%`));
    if (status) conditions.push(eq(moviesTable.status, status));
    if (genre) conditions.push(eq(moviesTable.genre, genre));
    if (language) conditions.push(eq(moviesTable.language, language));

    const movies = await db
      .select()
      .from(moviesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(moviesTable.releaseDate)
      .limit(limit)
      .offset(offset);

    res.json(movies.map(m => ({
      ...m,
      rating: m.rating ?? null,
      reviewCount: m.reviewCount ?? null,
      posterUrl: m.posterUrl ?? null,
      synopsis: m.synopsis ?? null,
      director: m.director ?? null,
      venue: m.venue ?? null,
      price: m.price ?? null,
      bookingUrl: m.bookingUrl ?? null,
      durationMinutes: m.durationMinutes ?? null,
      releaseDate: m.releaseDate ?? null,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get movies");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/movies/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [movie] = await db.select().from(moviesTable).where(eq(moviesTable.id, id));
    if (!movie) return res.status(404).json({ error: "Movie not found" });
    res.json({
      ...movie,
      rating: movie.rating ?? null,
      reviewCount: movie.reviewCount ?? null,
      posterUrl: movie.posterUrl ?? null,
      synopsis: movie.synopsis ?? null,
      director: movie.director ?? null,
      venue: movie.venue ?? null,
      price: movie.price ?? null,
      bookingUrl: movie.bookingUrl ?? null,
      durationMinutes: movie.durationMinutes ?? null,
      releaseDate: movie.releaseDate ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get movie");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

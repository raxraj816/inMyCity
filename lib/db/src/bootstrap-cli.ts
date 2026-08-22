import { ensureSearchObjects } from "./bootstrap";
import { pool } from "./index";

ensureSearchObjects()
  .then(async () => {
    console.log("Search extension and trigram indexes are in place.");
    await pool.end();
  })
  .catch(async (err) => {
    console.error("Failed to apply search database objects:", err);
    await pool.end();
    process.exit(1);
  });

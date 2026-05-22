/**
 * Story Diary — Express backend entry point.
 * Listens on port 3001. JWT authentication.
 */
import "dotenv/config";
import express, { type Express } from "express";

import cors from "cors";

// Import routes
import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import { chaptersRouter, videoClipsRouter, eBooksRouter } from "./routes/chapters";
import habitsRouter from "./routes/habits";
import minigameRouter from "./routes/minigame";

// Import error handler (must be last middleware)
import { errorHandler } from "./middleware/errorHandler";

import { initializeDatabase } from "./db";

const app: Express = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// ──────────────────────────────────────────────────────────────────────────
// Core middleware
// ──────────────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ──────────────────────────────────────────────────────────────────────────
// Session
// ──────────────────────────────────────────────────────────────────────────


// No session middleware — JWT only

// ──────────────────────────────────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────────────────────────────────

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/chapters", chaptersRouter);
app.use("/api/video-clips", videoClipsRouter);
app.use("/api/e-books", eBooksRouter);
app.use("/api/habits", habitsRouter);
app.use("/api/minigame", minigameRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true, ts: new Date().toISOString() });
});

// 404 for unmatched routes
app.use((_req, res) => {
  res.status(404).json({
    error: { code: "VALIDATION_ERROR", message: "Route not found" },
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Global error handler (must be registered last)
// ──────────────────────────────────────────────────────────────────────────

app.use(errorHandler);

// ──────────────────────────────────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`[story-diary] API server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("[story-diary] Failed to initialize database", error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  void bootstrap();
}

export default app;

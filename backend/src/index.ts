/**
 * Story Diary — Express backend entry point.
 * Listens on port 3001. Session-cookie auth; no JWT.
 */
import express from "express";
import session from "express-session";
import cors from "cors";
import "./lib/session"; // session type augmentation (must be early)

// Import routes
import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import { chaptersRouter, videoClipsRouter } from "./routes/chapters";
import habitsRouter from "./routes/habits";
import minigameRouter from "./routes/minigame";

// Import error handler (must be last middleware)
import { errorHandler } from "./middleware/errorHandler";

// Initialise DB (runs migrations + seed on first boot)
import "./db";

const app = express();
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

app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "story-diary-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// ──────────────────────────────────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────────────────────────────────

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/chapters", chaptersRouter);
app.use("/api/video-clips", videoClipsRouter);
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

app.listen(PORT, () => {
  console.log(`[story-diary] API server listening on http://localhost:${PORT}`);
});

export default app;

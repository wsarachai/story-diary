/**
 * Creates a test Express app — same middleware and routers as index.ts
 * but WITHOUT app.listen() so supertest can manage the server lifecycle.
 *
 * The db module is replaced by the in-memory testDb via moduleNameMapper
 * in jest.config.ts; no explicit jest.mock() calls are needed here.
 */
import express from "express";

import authRouter from "../../src/routes/auth";
import usersRouter from "../../src/routes/users";
import { chaptersRouter, videoClipsRouter } from "../../src/routes/chapters";
import habitsRouter from "../../src/routes/habits";
import minigameRouter from "../../src/routes/minigame";
import { errorHandler } from "../../src/middleware/errorHandler";

export function createTestApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/chapters", chaptersRouter);
  app.use("/api/video-clips", videoClipsRouter);
  app.use("/api/habits", habitsRouter);
  app.use("/api/minigame", minigameRouter);

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: { code: "VALIDATION_ERROR", message: "Route not found" } });
  });

  app.use(errorHandler);

  return app;
}

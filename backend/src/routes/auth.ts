/**
 * Auth routes: /api/auth/*
 * POST /register, POST /login, POST /logout, GET /me
 */
import { Router, type Router as ExpressRouter } from "express";
import "../lib/session"; // session type augmentation
import { validate } from "../lib/validate";
import { LoginSchema, RegisterSchema } from "../lib/schemas";
import { registerUser, loginUser, getUserById } from "../services/authService";
import { requireAuth } from "../middleware/auth";

const router: ExpressRouter = Router();

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const body = validate(RegisterSchema, req.body);
    const user = await registerUser(body);

    // Create session
    req.session.userId = user.id;

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const body = validate(LoginSchema, req.body);
    const user = await loginUser(body.username, body.password);

    // Regenerate session to prevent fixation
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = user.id;
      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        res.status(200).json({ user });
      });
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("connect.sid");
    res.status(200).json({ ok: true });
  });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res, next) => {
  try {
    const user = getUserById(req.session.userId!);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;

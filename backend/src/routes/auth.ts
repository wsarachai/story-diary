import { Router, type Router as ExpressRouter } from "express";
import jwt from "jsonwebtoken";
import { validate } from "../lib/validate";
import { LoginSchema, RegisterSchema } from "../lib/schemas";
import { registerUser, loginUser, getUserById } from "../services/authService";
import { requireAuth } from "../middleware/auth";

const router: ExpressRouter = Router();


router.post("/register", async (req, res, next) => {
    try {
        const body = validate(RegisterSchema, req.body);
        const user = await registerUser(body);
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET ?? "story-diary-dev-secret", { expiresIn: "7d" });
        res.status(201).json({ user, token });
    } catch (err) {
        next(err);
    }
});


router.post("/login", async (req, res, next) => {
    try {
        const body = validate(LoginSchema, req.body);
        const user = await loginUser(body.username, body.password);
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET ?? "story-diary-dev-secret", { expiresIn: "7d" });
        res.status(200).json({ user, token });
    } catch (err) {
        next(err);
    }
});


router.post("/logout", (_req, res) => {
    // No-op for JWT; client should just discard token
    res.status(200).json({ ok: true });
});


router.get("/me", requireAuth, async (req, res, next) => {
    try {
        // userId is attached by JWT middleware
        const user = await getUserById((req as any).userId!);
        res.status(200).json({ user });
    } catch (err) {
        next(err);
    }
});

export default router;

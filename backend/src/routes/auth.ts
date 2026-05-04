import { Router, type Router as ExpressRouter } from "express";
import "../lib/session";
import { validate } from "../lib/validate";
import { LoginSchema, RegisterSchema } from "../lib/schemas";
import { registerUser, loginUser, getUserById } from "../services/authService";
import { requireAuth } from "../middleware/auth";

const router: ExpressRouter = Router();

router.post("/register", async (req, res, next) => {
    try {
        const body = validate(RegisterSchema, req.body);
        const user = await registerUser(body);

        req.session.userId = user.id;
        res.status(201).json({ user });
    } catch (err) {
        next(err);
    }
});

router.post("/login", async (req, res, next) => {
    try {
        const body = validate(LoginSchema, req.body);
        const user = await loginUser(body.username, body.password);

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

router.post("/logout", (req, res, next) => {
    req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie("connect.sid");
        res.status(200).json({ ok: true });
    });
});

router.get("/me", requireAuth, async (req, res, next) => {
    try {
        const user = await getUserById(req.session.userId!);
        res.status(200).json({ user });
    } catch (err) {
        next(err);
    }
});

export default router;

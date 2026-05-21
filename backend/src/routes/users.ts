import { Router, type Router as ExpressRouter } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../lib/validate";
import { UpdateUserSchema } from "../lib/schemas";
import { getUserById, updateUser } from "../services/authService";
import { Errors } from "../lib/errors";

const router: ExpressRouter = Router();

function resolveId(paramId: string, sessionUserId: string): string {
    return paramId === "me" ? sessionUserId : paramId;
}

router.get("/:id", requireAuth, async (req, res, next) => {
    try {
        const userId = (req as any).userId!;
        const targetId = resolveId(String(req.params.id), userId);
        if (targetId !== userId) {
            return next(Errors.forbidden());
        }
        const user = await getUserById(targetId);
        res.status(200).json(user);
    } catch (err) {
        next(err);
    }
});

router.patch("/:id", requireAuth, async (req, res, next) => {
    try {
        const userId = (req as any).userId!;
        const targetId = resolveId(String(req.params.id), userId);
        if (targetId !== userId) {
            return next(Errors.forbidden());
        }
        const body = validate(UpdateUserSchema, req.body);
        if (Object.keys(body).length === 0) {
            return next(Errors.validation("Request body must include at least one updatable field"));
        }
        const user = await updateUser(targetId, body);
        res.status(200).json(user);
    } catch (err) {
        next(err);
    }
});

export default router;

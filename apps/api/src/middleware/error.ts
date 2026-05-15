import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("[API Error]", err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: "Validation error",
      details: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  if (err instanceof Error) {
    const status = (err as Error & { status?: number }).status ?? 500;
    return res.status(status).json({
      success: false,
      error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    });
  }

  return res.status(500).json({ success: false, error: "Internal server error" });
}

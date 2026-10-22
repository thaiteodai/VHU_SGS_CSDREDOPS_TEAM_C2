import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "That endpoint does not exist." });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Some of those details are not right.",
      fields: err.flatten().fieldErrors,
    });
  }

  const status = (err as { status?: number })?.status ?? 500;
  const message = (err as { message?: string })?.message ?? "Something broke on our side.";

  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

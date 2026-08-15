import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 60;

// The SDK's own /authorize, /token and /register handlers rate-limit themselves. This covers the
// endpoints we add on top: the Facebook login hops and the consent POST, which are the remaining
// unauthenticated ways to make this server do work.
export function authRateLimit(): RequestHandler {
  return rateLimit({
    windowMs: WINDOW_MS,
    max: MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "too_many_requests",
      error_description:
        "Too many authorization requests from this address. Wait for the window to reset and retry.",
    },
  });
}

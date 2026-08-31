import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 3, // limit each ip to 3 requests per window
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    status: 429,
    error: "Too Many Requests",
    message: "Too many login attempts. Please try again later",
  },
});

import { type User } from "../db/schema.js";

declare global {
  namespace Express {
    interface Request {
      user?: Partial<User>;
    }
  }
}

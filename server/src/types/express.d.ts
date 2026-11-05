import { UserTokenPayload } from '../utils/token.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserTokenPayload;
    }
  }
}

import { createAuthClient } from "better-auth/react";

// Browser side of Better Auth: same-origin /api/auth routes.
export const authClient = createAuthClient();

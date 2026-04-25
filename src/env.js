import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const LANDING_ONLY = process.env.LANDING_ONLY === "true";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    LANDING_ONLY: z.enum(["true", "false"]).optional(),
    CLERK_SECRET_KEY: LANDING_ONLY ? z.string().optional() : z.string().min(1),
    UPLOADTHING_TOKEN: z.string().min(1).optional(),
  },

  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: LANDING_ONLY
      ? z.string().optional()
      : z.string().min(1),
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    LANDING_ONLY: process.env.LANDING_ONLY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

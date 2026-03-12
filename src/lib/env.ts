import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((v) => v.startsWith("postgresql://") || v.startsWith("postgres://"), {
      message: "DATABASE_URL must be a valid PostgreSQL connection string",
    }),
  ANTHROPIC_API_KEY: z
    .string()
    .min(1)
    .refine((v) => v.startsWith("sk-ant-"), {
      message: "ANTHROPIC_API_KEY must start with 'sk-ant-'",
    }),
  AUTH_SECRET: z.string().min(32, {
    message: "AUTH_SECRET must be at least 32 characters",
  }),
});

function validateEnv() {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Missing or invalid environment variables:\n${issues}\n\nCopy .env.example to .env.local and set the required values.`
    );
  }

  return result.data;
}

export const env = validateEnv();

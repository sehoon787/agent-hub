import { z } from "zod"

// Platform-model compatibility map
const PLATFORM_COMPATIBLE_MODELS: Record<string, string[]> = {
  claude: ['opus', 'sonnet', 'haiku'],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash'],
  codex: ['gpt-5.4', 'gpt-5.4-mini'],
  cursor: ['opus', 'sonnet', 'haiku', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gpt-5.4', 'gpt-5.4-mini', 'custom'],
  windsurf: ['opus', 'sonnet', 'haiku', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gpt-5.4', 'gpt-5.4-mini', 'custom'],
  aider: ['opus', 'sonnet', 'haiku', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gpt-5.4', 'gpt-5.4-mini', 'custom'],
  universal: ['opus', 'sonnet', 'haiku', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gpt-5.4', 'gpt-5.4-mini', 'custom'],
};

export { PLATFORM_COMPATIBLE_MODELS };

export const agentSubmissionSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
      "Name must be lowercase alphanumeric with hyphens, cannot start or end with hyphen"
    ),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(100, "Display name must be at most 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be at most 500 characters"),
  longDescription: z.string().max(2000).optional(),
  category: z.enum(["orchestrator", "specialist", "worker", "analyst"], {
    message: "Please select a category",
  }),
  model: z.enum(["opus", "sonnet", "haiku", "gemini-2.5-pro", "gemini-2.5-flash", "gpt-5.4", "gpt-5.4-mini", "custom"], {
    message: "Please select a model",
  }),
  platform: z.enum(["claude", "gemini", "codex", "cursor", "windsurf", "aider", "universal"], {
    message: "Please select a platform",
  }),
  author: z
    .string()
    .min(1, "Author is required")
    .max(100, "Author must be at most 100 characters")
    .regex(
      /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/,
      "Author must be a valid username format"
    ),
  githubUrl: z
    .string()
    .url("Must be a valid URL")
    .regex(
      /^https:\/\/github\.com\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+/,
      "Must be a GitHub repository URL (https://github.com/owner/repo)"
    )
    .optional()
    .or(z.literal("")),
  capabilities: z.string().max(1000).optional(),
  tools: z.string().max(1000).optional(),
  tags: z.string().max(500).optional(),
}).superRefine((data, ctx) => {
  const compatible = PLATFORM_COMPATIBLE_MODELS[data.platform];
  if (compatible && !compatible.includes(data.model)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['model'],
      message: `Model "${data.model}" is not compatible with platform "${data.platform}". Compatible models: ${compatible.join(', ')}`,
    });
  }
});

export type AgentSubmission = z.infer<typeof agentSubmissionSchema>

import { z } from "zod"

export const agentSubmissionSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .regex(
      /^[a-zA-Z0-9\-_ ]+$/,
      "Only letters, numbers, hyphens, underscores, and spaces"
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
    message: "Please select a valid category",
  }),
  model: z.enum(["opus", "sonnet", "haiku"], {
    message: "Please select a valid model",
  }),
  author: z
    .string()
    .min(1, "Author is required")
    .max(100, "Author must be at most 100 characters"),
  githubUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  capabilities: z.string().max(1000).optional(),
  tools: z.string().max(1000).optional(),
  tags: z.string().max(500).optional(),
})

export type AgentSubmission = z.infer<typeof agentSubmissionSchema>

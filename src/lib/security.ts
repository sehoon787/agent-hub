const MALICIOUS_PATTERNS = [
  /eval\s*\(/i,
  /exec\s*\(/i,
  /child_process/i,
  /require\s*\(\s*['"]fs['"]\s*\)/i,
  /import\s+.*from\s+['"]child_process['"]/i,
  /process\.env/i,
  /\bsudo\b/i,
  /rm\s+-rf/i,
  /curl\s+.*\|\s*sh/i,
  /wget\s+.*\|\s*sh/i,
  /<script\b/i,
  /javascript:/i,
  /on(error|load|click)\s*=/i,
  /dangerouslySetInnerHTML/i,
  /\.exec\s*\(/i,
  /spawn\s*\(/i,
  /\bFetch\s*\(\s*['"]file:/i,
  /data:/i,
  /vbscript:/i,
  /<svg\b/i,
  /<iframe\b/i,
  /expression\s*\(/i,
  /\$\{/,
  /\{\{/,
]

function extractStrings(data: unknown): string[] {
  if (typeof data === "string") return [data];
  if (Array.isArray(data)) return data.flatMap(extractStrings);
  if (data && typeof data === "object")
    return Object.values(data).flatMap(extractStrings);
  return [];
}

export function checkMaliciousContent(data: Record<string, unknown>): {
  safe: boolean
  issues: string[]
} {
  const issues: string[] = []
  const textToCheck = extractStrings(data).join(" ")

  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(textToCheck)) {
      issues.push(`Suspicious pattern detected: ${pattern.source}`)
    }
  }

  return { safe: issues.length === 0, issues }
}

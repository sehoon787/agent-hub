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
]

export function checkMaliciousContent(data: Record<string, unknown>): {
  safe: boolean
  issues: string[]
} {
  const issues: string[] = []
  const textToCheck = Object.values(data)
    .filter((v) => typeof v === "string")
    .join(" ")

  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(textToCheck)) {
      issues.push(`Suspicious pattern detected: ${pattern.source}`)
    }
  }

  return { safe: issues.length === 0, issues }
}

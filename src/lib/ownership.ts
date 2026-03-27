export function isSubmissionOwner(
  issueBody: string,
  user: { login?: string }
): boolean {
  const { login } = user;
  if (!login) return false;
  const escaped = login.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\*\\*submittedBy:\\*\\* ${escaped}\\s*$`, 'm').test(issueBody);
}

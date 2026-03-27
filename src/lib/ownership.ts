export function isSubmissionOwner(
  issueBody: string,
  user: { login?: string }
): boolean {
  const { login } = user;
  if (!login) return false;
  return issueBody.includes(`**submittedBy:** ${login}`);
}

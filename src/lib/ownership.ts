export function isSubmissionOwner(
  issueBody: string,
  user: { login?: string; email?: string | null; name?: string | null }
): boolean {
  const { login, email, name } = user;
  if (login && issueBody.includes(`**submittedBy:** ${login}`)) return true;
  if (email && issueBody.includes(`**submittedBy:** ${email}`)) return true;
  if (name && issueBody.includes(`**submittedBy:** ${name}`)) return true;
  return false;
}

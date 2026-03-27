/**
 * Validates that a user has access to the GitHub repository they're submitting.
 * 1. Parses owner/repo from URL (normalizes trailing slash, /tree/... paths, .git suffix)
 * 2. Checks repo exists and is public
 * 3. Verifies user is owner, collaborator, or org member
 */

interface OwnershipResult {
  valid: boolean;
  reason?: string;
}

function parseOwnerRepo(githubUrl: string): { owner: string; repo: string } | null {
  // Normalize: remove trailing slash, .git suffix, /tree/... or /blob/... paths
  const cleaned = githubUrl
    .replace(/\/+$/, '')
    .replace(/\.git$/, '')
    .replace(/\/(tree|blob|commits|pulls|issues|actions)\/.*$/, '');

  const match = cleaned.match(/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

export async function validateGithubUrlOwnership(
  githubUrl: string,
  userLogin: string,
  accessToken: string
): Promise<OwnershipResult> {
  const parsed = parseOwnerRepo(githubUrl);
  if (!parsed) {
    return { valid: false, reason: 'Invalid GitHub repository URL' };
  }

  const { owner, repo } = parsed;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github.v3+json',
  };

  // 1. Check repo exists and is public
  let repoRes: Response;
  try {
    repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      cache: 'no-store',
    });
  } catch {
    return { valid: false, reason: 'Failed to verify repository. Please try again.' };
  }

  if (repoRes.status === 404) {
    return { valid: false, reason: 'Repository not found. Please check the URL.' };
  }
  if (repoRes.status === 401 || repoRes.status === 403) {
    return { valid: false, reason: 'GitHub authentication failed. Please sign out and sign back in.' };
  }
  if (!repoRes.ok) {
    return { valid: false, reason: 'Failed to verify repository.' };
  }

  const repoData = await repoRes.json() as { private: boolean };
  if (repoData.private) {
    return { valid: false, reason: 'Only public repositories are allowed.' };
  }

  // 2. Check if user is the owner (case-insensitive)
  if (owner.toLowerCase() === userLogin.toLowerCase()) {
    return { valid: true };
  }

  // 3. Check if user is a collaborator
  try {
    const collabRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/collaborators/${userLogin}`,
      { headers, cache: 'no-store' }
    );
    if (collabRes.status === 204) {
      return { valid: true };
    }
  } catch {
    // Continue to org check
  }

  // 4. Check if owner is an org and user is a member
  try {
    const orgRes = await fetch(
      `https://api.github.com/orgs/${owner}/members/${userLogin}`,
      { headers, cache: 'no-store' }
    );
    if (orgRes.status === 204) {
      return { valid: true };
    }
  } catch {
    // Fall through to denial
  }

  return { valid: false, reason: "You don't have access to this repository. You must be the owner, a collaborator, or an organization member." };
}

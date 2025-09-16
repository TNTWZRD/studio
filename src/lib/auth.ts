import type { User } from 'firebase/auth';

// IMPORTANT: Replace this with the actual Discord Role ID for your 'Captain' role.
export const ADMIN_ROLE_IDS = ['1139347875478917170'];

/**
 * Checks if a user has one of the admin roles.
 * @param user The Firebase user object.
 * @returns True if the user is an admin, false otherwise.
 */
export function isAdmin(user: User | null): boolean {
  if (!user) {
    return false;
  }
  
  // The custom claims are attached to the user's ID token.
  // The 'claims' property is a custom property added by onAuthStateChanged.
  const claims = (user as any).claims;

  if (!claims || !claims.roles || !Array.isArray(claims.roles)) {
    return false;
  }

  const userRoles: string[] = claims.roles;
  return userRoles.some(roleId => ADMIN_ROLE_IDS.includes(roleId));
}

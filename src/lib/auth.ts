import type { User } from 'firebase/auth';

// Add any Discord Role ID here that you want to have admin access.
export const ADMIN_ROLE_IDS = [
    '1091908798953836557', // Overlord
    '1092165075558744144', // Queen
    '1139347875478917170', // Captain
    // You can add more role IDs here, for example:
    // 'YOUR_OTHER_ROLE_ID',
    // 'ANOTHER_ADMIN_ROLE_ID',
];

export const POST_PERMISSION_ROLE_ID = '1417686047516786698'

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

/**
 * Checks if a user has permission to post content.
 * @param user The Firebase user object.
 * @returns True if the user can post, false otherwise.
 */
export function canPost(user: User | null): boolean {
    if (!user) return false;
    if (isAdmin(user)) return true;

    const claims = (user as any).claims;
    if (!claims || !claims.roles || !Array.isArray(claims.roles)) {
        return false;
    }
    
    const userRoles: string[] = claims.roles;
    return userRoles.includes(POST_PERMISSION_ROLE_ID);
}

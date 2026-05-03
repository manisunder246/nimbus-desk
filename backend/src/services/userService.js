// services/userService.js — workspace user lookup via Cognito ListUsersInGroup.
// Returns { userId (Cognito sub), email, name, role } shape used by both the
// admin assignee dropdown and the modal's name resolution. Dedup by userId
// keeps a user with multiple groups from appearing twice.
import { ListUsersInGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognito } from '../config/aws.js';
import env from '../config/env.js';

// Map raw Cognito group name -> friendly app role
const GROUP_TO_ROLE = { Admins: 'Admin', Analysts: 'Analyst', Users: 'User' };

function attr(user, name) {
  return user.Attributes?.find((a) => a.Name === name)?.Value || null;
}

export async function listUsersInGroup(groupName) {
  const out = await cognito.send(new ListUsersInGroupCommand({
    UserPoolId: env.COGNITO_USER_POOL_ID,
    GroupName: groupName,
  }));
  return (out.Users || []).map((u) => {
    const email = attr(u, 'email');
    const name = attr(u, 'name') || email;
    const sub = attr(u, 'sub') || u.Username;
    return {
      userId: sub,
      email,
      name,
      role: GROUP_TO_ROLE[groupName] || groupName,
    };
  });
}

export async function listAllAppUsers() {
  const [admins, analysts, users] = await Promise.all([
    listUsersInGroup('Admins'),
    listUsersInGroup('Analysts'),
    listUsersInGroup('Users'),
  ]);
  // Dedup by userId in case a user is in multiple groups; keep highest role.
  const seen = new Map();
  for (const u of [...admins, ...analysts, ...users]) {
    if (!seen.has(u.userId)) seen.set(u.userId, u);
  }
  return [...seen.values()];
}

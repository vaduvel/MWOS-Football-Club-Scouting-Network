import { pathToFileURL } from 'node:url';
import { runReleaseReadinessSmoke } from './release-readiness-smoke.mjs';
import { runRoleSurfaceSmoke } from './role-surface-smoke.mjs';

export async function runFinalLaunchSmoke({
  adminEmail,
  adminPassword,
  rolePassword = 'RoleQa123!',
}) {
  const [release, roles] = await Promise.all([
    runReleaseReadinessSmoke({ email: adminEmail, password: adminPassword }),
    runRoleSurfaceSmoke({ password: rolePassword }),
  ]);

  return {
    ok: Boolean(release.ok && roles.ok),
    generatedAt: new Date().toISOString(),
    release,
    roles,
  };
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const [adminEmail, adminPassword, rolePassword] = process.argv.slice(2);

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'Usage: tsx scripts/final-launch-smoke.mjs <admin-email> <admin-password> [role-password]',
    );
  }

  const payload = await runFinalLaunchSmoke({
    adminEmail,
    adminPassword,
    rolePassword: rolePassword || 'RoleQa123!',
  });

  console.log(JSON.stringify(payload, null, 2));

  if (!payload.ok) {
    process.exitCode = 1;
  }
}

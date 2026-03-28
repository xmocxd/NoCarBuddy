import bcrypt from 'bcryptjs';

let cachedAdminHash = null;

async function waitForAdminPassword(timeoutMs = 5000) {
  const start = Date.now();
  while (!process.env.ADMIN_PASSWORD) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('ADMIN_PASSWORD environment variable is not set');
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return process.env.ADMIN_PASSWORD;
}

export async function getAdminPasswordHash() {
  if (!cachedAdminHash) {
    const adminPasswordPlain = await waitForAdminPassword();
    cachedAdminHash = await bcrypt.hash(adminPasswordPlain, 10);
  }
  return cachedAdminHash;
}

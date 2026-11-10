import crypto from 'crypto';

/**
 * The installation id is generated once and then stored in the panel database (PostgreSQL), so it survives restarts,
 * moves to another machine together with the database, and never lives in a loose file.
 * MONOPANEL_INSTALLATION_ID can pin it explicitly.
 */
let cachedId: string | null = null;

function generateInstallationId(): string {
  // Format: aep_ + timestamp in base36 + 16 random hex characters
  return `aep_${Date.now().toString(36)}${crypto.randomBytes(8).toString('hex')}`;
}

/** Id for a NEW installation. The database layer saves it and, on every later start, uses the stored one instead. */
export function getInstallationId(): string {
  if (!cachedId) cachedId = process.env.MONOPANEL_INSTALLATION_ID?.trim() || generateInstallationId();
  return cachedId;
}

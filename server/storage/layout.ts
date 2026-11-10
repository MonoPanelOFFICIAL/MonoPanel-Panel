// Which top-level keys of the panel database are stored one row per item (docs) or per key (maps). Everything else lives in kv.
/** Array collections stored one row per object (every item must have a string `id`). */
export const DOC_COLLECTIONS = [
  'users', 'products', 'plans', 'orders', 'coupons', 'tickets', 'announcements', 'mail', 'auditLogs', 'ads', 'adEvents',
  'discordAuditLogs', 'apiKeys', 'apiAuditLogs', 'webhooks', 'legalPages', 'statusComponents', 'incidents', 'scheduledMaintenances', 'provisions',
  'nodes', 'images', 'servers', 'backups', 'hostingPlans', 'storeItems', 'entitlements', 'coinTx', 'earnSessions', 'media',
  'subusers', 'schedules', 'sftpCreds', 'addons', 'addonInstalls',
  // native VPS hosting (server/vps/*)
  'vpsNodes', 'vpsPlans', 'vpsImages', 'vpsServers', 'vpsOrders', 'vpsEvents',
];
/** Record collections stored one row per key. */
export const MAP_COLLECTIONS = ['passwords', 'discordLinks'];

import type { HostImage } from '../../src/hostingTypes';
import type { Plan, Product } from '../../src/types';
import { NODE_DOCKER_IMAGES, NODE_INSTALL, NODE_STARTUP, NODE_VARIABLES } from './seed';

/**
 * Starter software, products and plans for the kinds beyond bot / VPS. They are added ONCE per database (tracked in
 * settings.seededDefaults), so an admin who edits or deletes them never sees them come back. They are only shown to
 * customers while their hosting kind is switched on in Admin > Hosting Types.
 */
export const KIND_SEED_KEY = 'hosting-kinds-v1';

const base = { iconUrl: '', isActive: true, minRamMB: 128 };
const GIT_VARS = (): HostImage['variables'] => [
  { name: 'Git Repo Address', env: 'GIT_ADDRESS', default: '', description: 'Public or private https git URL to clone, e.g. https://github.com/user/site', userEditable: true, rules: '/^(https:\\/\\/[^\\s]{3,200})?$/' },
  { name: 'Branch', env: 'BRANCH', default: '', description: 'Branch to clone (empty = default branch).', userEditable: true, rules: '/^[A-Za-z0-9_.\\/-]{0,100}$/' },
  { name: 'Git Username', env: 'USERNAME', default: '', description: 'Only for private repositories.', userEditable: true, rules: '/^[A-Za-z0-9_.@-]{0,100}$/' },
  { name: 'Git Access Token', env: 'ACCESS_TOKEN', default: '', description: 'Personal access token for private repositories.', userEditable: true, rules: '/^[A-Za-z0-9_.-]{0,200}$/' },
  { name: 'Auto Update', env: 'AUTO_UPDATE', default: '0', description: 'Pull the latest code every time the server starts.', userEditable: true, rules: 'boolean' },
];

const CMD_RULE = '/^[A-Za-z0-9_@.\\/ :=+,-]{0,200}$/';

const WEBSITE_INSTALL = `#!/bin/bash
cd /mnt/server
if [ -n "$GIT_ADDRESS" ] && [ "$USER_UPLOAD" != "1" ]; then
  apt-get update -qq >/dev/null 2>&1 && apt-get install -y -qq git >/dev/null 2>&1
  URL="$GIT_ADDRESS"
  if [ -n "$USERNAME" ] && [ -n "$ACCESS_TOKEN" ]; then URL="https://\${USERNAME}:\${ACCESS_TOKEN}@\${GIT_ADDRESS#https://}"; fi
  BR=""; [ -n "$BRANCH" ] && BR="--branch $BRANCH"
  [ -d .git ] && git pull || git clone $BR "$URL" .
fi
if [ ! -f package.json ]; then
  mkdir -p public
  echo '{"name":"site","version":"1.0.0","scripts":{"start":"node server.js"}}' > package.json
  echo '<h1>Your website is live on MonoPanel</h1><p>Upload your project or set a Git repository in the Startup tab.</p>' > public/index.html
  cat > server.js <<'JS'
const http = require('http'), fs = require('fs'), path = require('path');
http.createServer((req, res) => {
  const f = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url.split('?')[0].replace(/\\.\\./g, ''));
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; return res.end('Not found'); } res.end(d); });
}).listen(process.env.PORT || 3000);
JS
fi
echo "Install complete"`;

const WEBSITE_STARTUP = [
  'export PORT={{SERVER_PORT}} HOST=0.0.0.0 HOSTNAME=0.0.0.0;',
  'if [ "${USER_UPLOAD}" != "1" ] && [ -n "${GIT_ADDRESS}" ]; then',
  '  if [ -n "${USERNAME}" ] && [ -n "${ACCESS_TOKEN}" ]; then GIT_URL="https://${USERNAME}:${ACCESS_TOKEN}@${GIT_ADDRESS#https://}"; else GIT_URL="${GIT_ADDRESS}"; fi;',
  '  BR=""; [ -n "${BRANCH}" ] && BR="--branch ${BRANCH}";',
  '  if [ ! -d .git ]; then git clone ${BR} "${GIT_URL}" .panel_clone && cp -a .panel_clone/. . && rm -rf .panel_clone;',
  '  elif [ "${AUTO_UPDATE}" = "1" ]; then git pull; fi;',
  'fi;',
  '[ -f ./package.json ] && npm install --no-audit --no-fund;',
  '[ -n "${BUILD_COMMAND}" ] && sh -c "${BUILD_COMMAND}";',
  'exec sh -c "${START_COMMAND}"',
].join(' ');

const LAVALINK_INSTALL = `#!/bin/bash
cd /mnt/server
mkdir -p plugins
V="\${LAVALINK_VERSION:-latest}"
if [ "$V" = "latest" ]; then URL="https://github.com/lavalink-devs/Lavalink/releases/latest/download/Lavalink.jar"; else URL="https://github.com/lavalink-devs/Lavalink/releases/download/$V/Lavalink.jar"; fi
echo "Downloading Lavalink ($V)"
curl -fsSL -o Lavalink.jar "$URL" || { echo "Could not download Lavalink from $URL"; exit 1; }
echo "Install complete"`;

export function defaultKindImages(now: string): HostImage[] {
  return [
    {
      ...base, createdAt: now, id: 'img_host_nodejs', kind: 'nodejs', name: 'Node.js', software: 'Node.js', category: 'Node.js',
      description: 'Any Node.js app, API or worker. Pick the Node version, deploy from Git or upload, run npm tasks from the panel.',
      dockerImages: { ...NODE_DOCKER_IMAGES }, defaultImage: 'Node.js 22',
      startup: NODE_STARTUP, stopCommand: '^C',
      ports: [{ label: 'App', container: 3000, proto: 'tcp' }],
      variables: NODE_VARIABLES(),
      install: { image: 'ghcr.io/pterodactyl/installers:debian', entrypoint: 'bash', script: NODE_INSTALL, files: [] }, runtime: 'any',
    },
    {
      ...base, createdAt: now, id: 'img_host_website', kind: 'website', name: 'Full-stack Website', software: 'Full-stack website (Node.js)', category: 'Websites', minRamMB: 256,
      description: 'Next.js, Nuxt, Express, Vite and more: front end and back end together, built and served by one process. Gets a free subdomain and supports custom domains.',
      dockerImages: { 'Node.js 24': NODE_DOCKER_IMAGES['Node.js 24'], 'Node.js 22': NODE_DOCKER_IMAGES['Node.js 22'], 'Node.js 20': NODE_DOCKER_IMAGES['Node.js 20'] }, defaultImage: 'Node.js 22',
      startup: WEBSITE_STARTUP, stopCommand: '^C',
      ports: [{ label: 'Web', container: 3000, proto: 'tcp' }],
      variables: [
        ...GIT_VARS(),
        { name: 'Build command', env: 'BUILD_COMMAND', default: 'npm run build --if-present', description: 'Runs before every start, e.g. "npm run build".', userEditable: true, rules: CMD_RULE },
        { name: 'Start command', env: 'START_COMMAND', default: 'npm start', description: 'Must listen on the PORT environment variable.', userEditable: true, rules: CMD_RULE },
        { name: 'User Uploaded Files', env: 'USER_UPLOAD', default: '0', description: '1 = you upload the files yourself, skip git.', userEditable: true, rules: 'boolean' },
      ],
      install: { image: 'ghcr.io/pterodactyl/installers:debian', entrypoint: 'bash', script: WEBSITE_INSTALL, files: [] }, runtime: 'any',
    },
    {
      ...base, createdAt: now, id: 'img_host_lavalink', kind: 'lavalink', name: 'Lavalink', software: 'Lavalink v4', category: 'Lavalink', minRamMB: 384,
      description: 'Lavalink v4 audio node for Discord music bots. The config file is managed from the Lavalink tab.',
      dockerImages: { 'Java 21': 'ghcr.io/pterodactyl/yolks:java_21', 'Java 17': 'ghcr.io/pterodactyl/yolks:java_17' }, defaultImage: 'Java 21',
      startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar Lavalink.jar', stopCommand: '^C',
      ports: [{ label: 'Lavalink', container: 2333, proto: 'tcp' }],
      variables: [
        { name: 'Lavalink version', env: 'LAVALINK_VERSION', default: 'latest', description: 'A release tag such as 4.0.8, or "latest". Applied on reinstall.', userEditable: true, rules: '/^(latest|[0-9]+\\.[0-9]+\\.[0-9]+(-[A-Za-z0-9.]+)?)$/' },
        { name: 'Password', env: 'LAVALINK_PASSWORD', default: '', description: 'The password your bot uses to connect. A random one is generated when the server is created.', userEditable: true, rules: '/^[A-Za-z0-9_.-]{8,64}$/', generate: 'password' },
      ],
      install: { image: 'ghcr.io/pterodactyl/installers:debian', entrypoint: 'bash', script: LAVALINK_INSTALL, files: [] }, runtime: 'any',
    },
  ];
}

export function defaultKindProducts(): Product[] {
  return [
    { id: 'prod_nodejs', slug: 'nodejs', name: 'Node.js Hosting', description: 'Run any Node.js app, API or worker with Git deploys, npm tasks and a live console.', category: 'nodejs', icon: 'Hexagon', isActive: true, sortOrder: 3 },
    { id: 'prod_website', slug: 'website', name: 'Website Hosting', description: 'Full-stack websites with a free subdomain, custom domains, HTTPS and Git deploys.', category: 'website', icon: 'Globe', isActive: true, sortOrder: 4 },
    { id: 'prod_lavalink', slug: 'lavalink', name: 'Lavalink Hosting', description: 'Low-latency Lavalink v4 nodes for Discord music bots with a managed config and plugins.', category: 'lavalink', icon: 'Music', isActive: true, sortOrder: 5 },
  ];
}

export function defaultKindPlans(): Plan[] {
  const p = (id: string, productId: string, name: string, description: string, priceMonthly: number, ramMB: number, cpuCores: number, diskGB: number, serverLimit: number, features: string[], extra: Partial<Plan> = {}): Plan => ({
    id, productId, name, description, priceMonthly, priceYearly: priceMonthly * 10, ramMB, cpuCores, diskGB, backupLimit: 1, databaseLimit: 0, serverLimit, networkMbps: 1000, features, locations: ['local'], isActive: true, ...extra,
  });
  return [
    p('plan_nodejs_starter', 'prod_nodejs', 'Node Starter', 'For small APIs and workers.', 3, 512, 0.5, 5, 1, ['512MB RAM', '0.5 vCPU', '5GB Storage', 'Node 20 / 22 / 24', 'Git deploy']),
    p('plan_nodejs_plus', 'prod_nodejs', 'Node Plus', 'For production apps with a database.', 8, 1536, 1, 15, 2, ['1.5GB RAM', '1 vCPU', '15GB Storage', 'npm / pnpm / yarn tasks', '2 Backups'], { isPopular: true, backupLimit: 2, databaseLimit: 1 }),
    p('plan_nodejs_pro', 'prod_nodejs', 'Node Pro', 'High-traffic services.', 18, 4096, 2, 40, 4, ['4GB RAM', '2 vCPU', '40GB Storage', '4 Servers', '5 Backups'], { backupLimit: 5, databaseLimit: 2 }),
    p('plan_website_starter', 'prod_website', 'Site Starter', 'A portfolio or small business site.', 3, 512, 0.5, 5, 1, ['512MB RAM', '5GB Storage', 'Free subdomain', '1 custom domain', 'Automatic HTTPS']),
    p('plan_website_business', 'prod_website', 'Site Business', 'Full-stack apps with a build step.', 9, 1536, 1, 20, 2, ['1.5GB RAM', '20GB Storage', 'Free subdomain', 'Custom domains', 'Git deploy + build'], { isPopular: true, backupLimit: 2, databaseLimit: 1 }),
    p('plan_website_pro', 'prod_website', 'Site Pro', 'Busy sites and web apps.', 20, 4096, 2, 50, 4, ['4GB RAM', '50GB Storage', 'Up to 12 domains', '4 Sites', '5 Backups'], { backupLimit: 5, databaseLimit: 2 }),
    p('plan_lavalink_starter', 'prod_lavalink', 'Lavalink Starter', 'One node for a small bot.', 3, 512, 0.5, 3, 1, ['512MB RAM', 'Lavalink v4', 'Plugin manager', 'Live player stats']),
    p('plan_lavalink_standard', 'prod_lavalink', 'Lavalink Standard', 'For bots in a few hundred servers.', 6, 1024, 1, 5, 1, ['1GB RAM', '1 vCPU', 'Lavalink v4', 'Plugin manager'], { isPopular: true }),
    p('plan_lavalink_pro', 'prod_lavalink', 'Lavalink Pro', 'Big bots and multiple nodes.', 14, 2048, 2, 10, 3, ['2GB RAM', '2 vCPU', '3 Nodes', 'Priority support'], { backupLimit: 2 }),
  ];
}

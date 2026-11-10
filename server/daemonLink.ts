import { encryptSecret, decryptSecret } from './hosting/crypto';

/**
 * One MonoPanel daemon serves BOTH game/app servers (Admin > Nodes) and VPSes (Admin > VPS Nodes).
 * A daemon only has one DAEMON_SECRET, so a hosting node and a VPS node that point at the same
 * host:port are treated as the same daemon and always share one secret.
 */
interface DaemonNodeLike { id: string; name: string; daemonHost: string; daemonPort: number; secretEnc: string }
interface DbLike { nodes: DaemonNodeLike[]; vpsNodes: DaemonNodeLike[] }

const sameAddress = (a: { daemonHost: string; daemonPort: number }, host: string, port: number) =>
  a.daemonHost.trim().toLowerCase() === host.trim().toLowerCase() && a.daemonPort === port;

/** The node (hosting or VPS) that already talks to this host:port, if any. */
export function findDaemonPeer(db: DbLike, host: string, port: number, exceptId?: string): DaemonNodeLike | undefined {
  return [...db.nodes, ...db.vpsNodes].find(n => n.id !== exceptId && sameAddress(n, host, port));
}

/** Secret for a new node: reuse the peer's secret when the daemon is already registered, otherwise generate. */
export function secretForNewNode(db: DbLike, host: string, port: number, generate: () => string): { secret: string; secretEnc: string; peer?: DaemonNodeLike } {
  const peer = findDaemonPeer(db, host, port);
  if (peer) return { secret: decryptSecret(peer.secretEnc), secretEnc: peer.secretEnc, peer };
  const secret = generate();
  return { secret, secretEnc: encryptSecret(secret) };
}

/** After rotating a node's secret, give the same secret to every node that shares its daemon. Returns their names. */
export function shareSecretWithPeers(db: DbLike, node: DaemonNodeLike): string[] {
  const names: string[] = [];
  for (const n of [...db.nodes, ...db.vpsNodes]) {
    if (n.id !== node.id && sameAddress(n, node.daemonHost, node.daemonPort)) { n.secretEnc = node.secretEnc; names.push(n.name); }
  }
  return names;
}

export const linkedNote = (peerName: string, kind: 'hosting node' | 'VPS node') =>
  `This address is already registered as the ${kind} "${peerName}", so both use the same daemon and the same secret. If that daemon is already running, you do not need to run the command again.`;

import React from 'react';
import { Bot, Server, Globe, Hexagon, Music } from 'lucide-react';
import { HostingKind, kindInfo } from '../../hostingKinds';

const ICONS = { Bot, Server, Globe, Hexagon, Music } as const;

/** The icon of a hosting type (from the shared registry in src/hostingKinds.ts). */
export const KindIcon: React.FC<{ kind: HostingKind; className?: string }> = ({ kind, className }) => {
  const I = ICONS[kindInfo(kind)?.icon || 'Server'];
  return <I className={className} aria-hidden="true" />;
};

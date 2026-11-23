import React, { useEffect, useSyncExternalStore } from 'react';

/**
 * A page can hand its own navigation to the site sidebar (the server pages do this with their Console / Files / Backups ... tabs),
 * so the sidebar is the one and only main navigation everywhere. The page keeps owning the state; the sidebar just renders it.
 */
export interface ScopedNavItem { id: string; label: string; icon?: React.ComponentType<{ className?: string; width?: number; height?: number }> }
export interface ScopedNavGroup { title: string; items: ScopedNavItem[] }
export interface ScopedNav {
  key: string;
  title: string;
  subtitle?: string;
  /** Where the "back" link at the top of the section goes, e.g. the server list. */
  backLabel: string;
  backPage: string;
  groups: ScopedNavGroup[];
  active: string;
  onSelect: (id: string) => void;
}

let current: ScopedNav | null = null;
let signature = '';
const listeners = new Set<() => void>();
const sigOf = (n: ScopedNav | null) => n ? [n.key, n.title, n.subtitle, n.active, n.backLabel, n.backPage, n.groups.map(g => g.title + ':' + g.items.map(i => i.id + '=' + i.label).join(',')).join('|')].join('~') : '';

/** Stores the latest nav. Subscribers are only notified when something visible changed; callbacks are always kept fresh. */
function setScopedNav(n: ScopedNav | null) {
  const s = sigOf(n);
  // Same visible content: keep the same object (stable snapshot for React) and only refresh the callback.
  if (s === signature && current && n) { current.onSelect = n.onSelect; return; }
  current = n;
  signature = s;
  listeners.forEach(l => l());
}

export function useScopedNav(): ScopedNav | null {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => current,
    () => null
  );
}

/** Render this inside a page to publish its navigation to the sidebar for as long as the page is mounted. */
export const ScopedNavRegister: React.FC<{ nav: ScopedNav }> = ({ nav }) => {
  // Runs after every render so the sidebar always calls the newest onSelect; it only re-renders the sidebar when the visible parts differ.
  useEffect(() => { setScopedNav(nav); });
  useEffect(() => () => setScopedNav(null), []);
  return null;
};

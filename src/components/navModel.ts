import type React from 'react';
import {
  Users, Package, ShoppingBag, Tag, Megaphone, LifeBuoy, FileText, Sliders, Sparkles, MessageSquare, Bot, Scale, Key, Link2, Mail,
  Network, Server, Boxes, Crown, CreditCard, Timer, Layers, UserCog, Palette, ScrollText, Receipt, Cloud, HardDrive, Disc3,
  SlidersHorizontal, History, ShoppingCart, Shapes
} from 'lucide-react';

/** One entry of the admin menu. The admin area uses the same sidebar as the rest of the site, in "admin" mode. */
export interface AdminNavItem { page: string; label: string; icon: React.ComponentType<{ className?: string }> }
export interface AdminNavGroup { title: string; items: AdminNavItem[] }

export const ADMIN_GROUPS: AdminNavGroup[] = [
  { title: 'Overview', items: [{ page: 'admin-dashboard', label: 'System Overview', icon: Sliders }, { page: 'admin-hosting', label: 'Hosting Overview', icon: Layers }] },
  { title: 'Hosting', items: [
    { page: 'admin-hosting-types', label: 'Hosting Types', icon: Shapes },
    { page: 'admin-nodes', label: 'Nodes', icon: Network },
    { page: 'admin-servers', label: 'Server Management', icon: Server },
    { page: 'admin-accounts', label: 'Account Management', icon: UserCog },
    { page: 'admin-images', label: 'Software Images', icon: Boxes },
    { page: 'admin-addons', label: 'Addon Store', icon: Package },
  ] },
  { title: 'VPS Hosting', items: [
    { page: 'admin-vps', label: 'VPS Overview', icon: Cloud },
    { page: 'admin-vps-servers', label: 'VPS Servers', icon: HardDrive },
    { page: 'admin-vps-nodes', label: 'VPS Nodes', icon: Network },
    { page: 'admin-vps-plans', label: 'VPS Plans', icon: Layers },
    { page: 'admin-vps-orders', label: 'VPS Orders', icon: ShoppingCart },
    { page: 'admin-vps-images', label: 'OS Images', icon: Disc3 },
    { page: 'admin-vps-settings', label: 'VPS Settings', icon: SlidersHorizontal },
    { page: 'admin-vps-activity', label: 'VPS Activity', icon: History },
  ] },
  { title: 'Plans & Revenue', items: [
    { page: 'admin-hosting-plans', label: 'Plans & Limits', icon: Crown },
    { page: 'admin-hosting-settings', label: 'Expiry & Renewals', icon: Timer },
    { page: 'admin-store', label: 'Store & Economy', icon: ShoppingBag },
    { page: 'admin-stripe', label: 'Stripe Setup', icon: CreditCard },
    { page: 'admin-billing', label: 'Orders & Payments', icon: Receipt },
    { page: 'admin-coupons', label: 'Coupons', icon: Tag },
    { page: 'admin-products', label: 'Legacy Products', icon: Package },
  ] },
  { title: 'Growth', items: [
    { page: 'admin-ads', label: 'Ad Center', icon: Sparkles },
    { page: 'admin-announcements', label: 'Announcements', icon: Megaphone },
  ] },
  { title: 'Community', items: [
    { page: 'admin-users', label: 'User Accounts', icon: Users },
    { page: 'admin-support', label: 'Support Desk', icon: LifeBuoy },
    { page: 'admin-mail', label: 'Mail', icon: Mail },
    { page: 'admin-discord', label: 'Discord Bot', icon: MessageSquare },
    { page: 'admin-manager-bot', label: 'Discord Manager Bot', icon: Bot },
  ] },
  { title: 'System', items: [
    { page: 'admin-panel-link', label: 'External Panel Link', icon: Link2 },
    { page: 'admin-appearance', label: 'Appearance', icon: Palette },
    { page: 'admin-legal', label: 'Legal Pages', icon: Scale },
    { page: 'admin-audit-logs', label: 'Audit Logs', icon: ScrollText },
    { page: 'admin-api-keys', label: 'API Keys', icon: Key },
    { page: 'admin-settings', label: 'Platform Settings', icon: FileText },
  ] },
];

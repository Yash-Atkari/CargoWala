'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Truck,
  Package,
  Ship,
  Users,
  MapPin,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  Navigation,
  X,
  Box,
  QrCode,
  Sparkles,
} from 'lucide-react';
import AppLogo from './ui/AppLogo';
import { useAuth } from '@/lib/authContext';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import AlertsNotificationModal from './AlertsNotificationModal';
import { generateLiveExceptions, LogisticsAlert } from '@/lib/alertsEngine';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  badge?: number;
  group?: string;
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Admin Dashboard', href: '/admin-dashboard', icon: LayoutDashboard, group: 'Management' },
  { label: '3D Load Planner', href: '/load-planner', icon: Box, group: 'Operations' },
  { label: '3D Digital Twin', href: '/digital-twin', icon: Sparkles, group: 'Operations' },
  { label: 'Driver Route Hub', href: '/driver-dashboard', icon: Navigation, group: 'Operations' },
  { label: 'Loader Bay Station', href: '/loader-dashboard', icon: QrCode, group: 'Operations' },
];

const LOADER_NAV: NavItem[] = [
  { label: 'Loader Bay Station', href: '/loader-dashboard', icon: QrCode, group: 'Operations' },
  { label: '3D Load Planner', href: '/load-planner', icon: Box, group: 'Operations' },
  { label: '3D Digital Twin', href: '/digital-twin', icon: Sparkles, group: 'Operations' },
  { label: 'Driver Route Hub', href: '/driver-dashboard', icon: Navigation, group: 'Operations' },
];

interface SidebarProps {
  role: 'ADMIN' | 'LOADER';
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onMobileClose: () => void;
  userName: string;
  userEmail: string;
}

export default function Sidebar({
  role,
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onMobileClose,
  userName,
  userEmail,
}: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [alerts, setAlerts] = useState<LogisticsAlert[]>([]);

  const navItems = role === 'ADMIN' ? ADMIN_NAV : LOADER_NAV;
  const groups = Array.from(new Set(navItems.map((i) => i.group)));

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    router.push('/');
  };

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-40
          flex flex-col bg-card border-r border-border
          sidebar-transition
          ${collapsed ? 'w-16' : 'w-60'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div
          className={`flex items-center border-b border-border h-14 px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <AppLogo size={28} />
              <span className="font-semibold text-foreground text-sm tracking-tight truncate">
                CargoWala
              </span>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 gradient-primary rounded-md flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">CW</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            <button
              onClick={onMobileClose}
              className="lg:hidden p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Role badge */}
        {!collapsed && (
          <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {role === 'ADMIN' ? 'Fleet Administrator' : 'Loading Station'}
            </span>
            <button
              onClick={() => setShowAlertsModal(true)}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative"
              title="Open Exception & Alerts Center (Feature 11)"
            >
              <Bell size={13} />
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </button>
          </div>
        )}

        {/* Nav list */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-4">
          {groups.map((group) => (
            <div key={group} className="space-y-1">
              {!collapsed && (
                <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-2 py-1">
                  {group}
                </p>
              )}
              {navItems
                .filter((i) => i.group === group)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onMobileClose}
                      className={`
                        flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold
                        transition-all group relative
                        ${
                          isActive
                            ? 'bg-primary/10 text-primary border border-primary/20 font-bold shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                        }
                        ${collapsed ? 'justify-center px-2' : ''}
                      `}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon
                        size={16}
                        className={`flex-shrink-0 ${
                          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && item.badge !== undefined && (
                        <span className="ml-auto text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-bold">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-border bg-muted/20">
          <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">{userName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{userEmail}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-negative transition-colors"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Alerts & Exception Management Modal */}
      {showAlertsModal && (
        <AlertsNotificationModal
          alerts={[
            {
              id: 'a1',
              severity: 'CRITICAL',
              category: 'INSTABILITY',
              title: 'Rollover SRT Warning',
              message: 'Static Rollover Threshold is at 0.38g. Ensure heavy containers remain on floor level (Y=0).',
              truckReg: 'MH-12-AB-4521',
              timestamp: '3:15 PM',
            },
            {
              id: 'a2',
              severity: 'WARNING',
              category: 'ROUTE_BLOCKAGE',
              title: 'LIFO Route Extraction Check',
              message: 'Verify Stop #1 parcels are staged within 150cm of rear loading doors.',
              truckReg: 'MH-12-AB-4521',
              timestamp: '3:10 PM',
            },
            {
              id: 'a3',
              severity: 'INFO',
              category: 'LOADING_VIOLATION',
              title: '3D AI Optimizer Active',
              message: 'Multi-constraint bin packing and route sequencing engine running.',
              timestamp: '3:05 PM',
            },
          ]}
          onClose={() => setShowAlertsModal(false)}
        />
      )}
    </>
  );
}

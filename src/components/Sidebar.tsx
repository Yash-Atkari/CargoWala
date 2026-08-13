'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Truck, Package, Ship, Users, MapPin,
  BarChart3, Bell, Settings, LogOut, ChevronLeft, ChevronRight,
  PackageCheck, Navigation, X, Box,
} from 'lucide-react';
import AppLogo from './ui/AppLogo';
import { useAuth } from '@/lib/authContext';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';


interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  group?: string;
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin-dashboard', icon: LayoutDashboard, group: 'Overview' },
  { label: 'Trucks', href: '/admin-dashboard', icon: Truck, group: 'Fleet' },
  { label: 'Packages', href: '/admin-dashboard', icon: Package, group: 'Fleet' },
  { label: 'Shipments', href: '/admin-dashboard', icon: Ship, group: 'Fleet' },
  { label: 'Loaders', href: '/admin-dashboard', icon: Users, group: 'Fleet' },
  { label: '3D Load Planner', href: '/load-planner', icon: Box, group: 'Operations' },
  { label: 'Tracking', href: '/admin-dashboard', icon: MapPin, group: 'Operations' },
  { label: 'Analytics', href: '/admin-dashboard', icon: BarChart3, group: 'Operations' },
  { label: 'Notifications', href: '/admin-dashboard', icon: Bell, badge: 3, group: 'Operations' },
  { label: 'Settings', href: '/admin-dashboard', icon: Settings, group: 'System' },
];

const LOADER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/loader-dashboard', icon: LayoutDashboard, group: 'Overview' },
  { label: '3D Load Planner', href: '/load-planner', icon: Box, group: 'Work' },
  { label: 'Loading Session', href: '/loader-dashboard', icon: PackageCheck, group: 'Work' },
  { label: 'My Packages', href: '/loader-dashboard', icon: Package, group: 'Work' },
  { label: 'Tracking', href: '/loader-dashboard', icon: Navigation, group: 'Work' },
  { label: 'Notifications', href: '/loader-dashboard', icon: Bell, badge: 2, group: 'Work' },
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
  role, collapsed, mobileOpen, onToggleCollapse, onMobileClose, userName, userEmail,
}: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();
  const navItems = role === 'ADMIN' ? ADMIN_NAV : LOADER_NAV;

  const groups = Array.from(new Set(navItems.map((i) => i.group)));

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    router.push('/');
  };

  const initials = userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
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
      <div className={`flex items-center border-b border-border h-14 px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <AppLogo size={28} />
            <span className="font-semibold text-foreground text-sm tracking-tight truncate">CargoWala</span>
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
        <div className="px-3 pt-3 pb-1">
          <span className={`status-badge text-xs ${role === 'ADMIN' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
            {role === 'ADMIN' ? 'Fleet Manager' : 'Cargo Loader'}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-4">
        {groups.map((group) => (
          <div key={`group-${group}`}>
            {!collapsed && (
              <p className="px-2 mb-1 text-[10px] font-600 uppercase tracking-widest text-muted-foreground">
                {group}
              </p>
            )}
            <div className="space-y-0.5">
              {navItems
                .filter((i) => i.group === group)
                .map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={`nav-${item.label}`}
                      href={item.href}
                      onClick={onMobileClose}
                      title={collapsed ? item.label : undefined}
                      className={`
                        flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium
                        transition-all duration-150 group relative
                        ${isActive
                          ? 'bg-primary/10 text-primary' :'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }
                        ${collapsed ? 'justify-center' : ''}
                      `}
                    >
                      <Icon size={16} className="flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span className="ml-auto bg-negative text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && item.badge && (
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-negative rounded-full" />
                      )}
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-border p-2 space-y-1">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-negative/10 hover:text-negative transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>

        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-muted/50">
            <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-600 text-foreground truncate">{userName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{userEmail}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
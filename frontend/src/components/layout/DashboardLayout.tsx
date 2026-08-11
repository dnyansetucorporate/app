import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Grid2X2,
  LayoutDashboard,
  Plus,
  BookOpen,
  FileText,
  Award,
  ChevronDown,
  Calendar,
  Users,
  UserPlus,
  ClipboardList,
  Inbox,
  ArrowLeft,
  Menu,
  LogOut,
  Settings,
  Wallet,
} from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { cn } from '@/utils/helpers';
import { parseYMD, formatYMD, formatDisplayDate } from '@/utils/date';
import { dayPickerClassNames, dayPickerPanelClassName } from '@/components/dayPickerTheme';
import { PageHeaderProvider, usePageHeader } from '@/contexts/PageHeaderContext';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/contexts/AuthContext';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  matchSegment: string;
}

const getNavItems = (role: UserRole): NavItem[] => {
  if (role === 'SUPER_ADMIN') {
    return [
      { to: '/super-admin/branches', icon: Grid2X2, label: 'All Branches', matchSegment: 'branches' },
      { to: '/super-admin/dashboard', icon: LayoutDashboard, label: 'Branch Dashboard', matchSegment: 'dashboard' },
      { to: '/super-admin/add-branch', icon: Plus, label: 'Add New Branch', matchSegment: 'add-branch' },
      { to: '/super-admin/courses', icon: BookOpen, label: 'Courses', matchSegment: 'courses' },
      { to: '/super-admin/exams', icon: FileText, label: 'Exams', matchSegment: 'exams' },
      { to: '/super-admin/certificates', icon: Award, label: 'Certificates', matchSegment: 'certificates' },
      { to: '/super-admin/expenses', icon: Wallet, label: 'Expenses', matchSegment: 'expenses' },
    ];
  }
  
  if (role === 'BRANCH_ADMIN') {
    return [
      { to: '/branch-admin/dashboard', icon: LayoutDashboard, label: 'Branch Dashboard', matchSegment: 'dashboard' },
      { to: '/branch-admin/students', icon: Users, label: 'All Students', matchSegment: 'students' },
      { to: '/branch-admin/add-student', icon: UserPlus, label: 'Add New Students', matchSegment: 'add-student' },
      { to: '/branch-admin/enquiries', icon: Inbox, label: 'Enquiry', matchSegment: 'enquiries' },
      { to: '/branch-admin/schedule-exam', icon: Calendar, label: 'Schedule Exams', matchSegment: 'schedule-exam' },
      { to: '/branch-admin/exam-results', icon: ClipboardList, label: 'Exam Results', matchSegment: 'exam-results' },
    ];
  }

  return [];
};

const SidebarLink = ({ item, active }: { item: NavItem; active: boolean }) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 text-sm font-medium group',
        active
          ? 'bg-white/15 text-white'
          : 'text-white/65 hover:text-white hover:bg-white/10'
      )}
    >
      <Icon
        size={18}
        className={cn(
          'flex-shrink-0 transition-colors',
          active ? 'text-white' : 'text-white/60 group-hover:text-white'
        )}
      />
      <span>{item.label}</span>
    </Link>
  );
};

const SORT_OPTIONS = ['Last Period', 'Last Year'];

const SortByDropdown: React.FC = () => {
  const { sortBy, dateFrom: ctxFrom, dateTo: ctxTo, setFilters } = usePageHeader();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (opt: string) => {
    // Only update comparison mode; keep current date range unchanged
    setFilters(opt, ctxFrom, ctxTo);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-dark transition-colors"
      >
        <span>Sort by <ChevronDown size={12} className="inline ml-1" /></span>
        <br />
        <span className="text-text-dark font-semibold text-sm">{sortBy}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white border border-border rounded-xl shadow-lg z-50 py-1 min-w-40">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              className={cn(
                'w-full text-left px-4 py-2 text-xs hover:bg-gray-50 transition-colors',
                opt === sortBy ? 'text-secondary font-semibold' : 'text-text-dark'
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const DateRangeDropdown: React.FC = () => {
  const { dateFrom: ctxFrom, dateTo: ctxTo, sortBy: ctxSortBy, setFilters } = usePageHeader();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(ctxFrom);
  const [to, setTo] = useState(ctxTo);
  const ref = useRef<HTMLDivElement>(null);

  // Sync local state when context changes (e.g. via SortBy)
  useEffect(() => { setFrom(ctxFrom); }, [ctxFrom]);
  useEffect(() => { setTo(ctxTo); }, [ctxTo]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleApply = () => {
    setFilters(ctxSortBy, from, to);
    setOpen(false);
  };

  const handleReset = () => {
    setFrom('');
    setTo('');
  };

  // Whichever end isn't set yet is what the next click will fill in — surfacing
  // that (rather than a bare calendar) is what tells the user where they are in
  // the two-click start/end flow.
  const pickingFrom = !from;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-dark transition-colors"
      >
        <span>Date range <ChevronDown size={12} className="inline ml-1" /></span>
        <br />
        <span className="text-text-dark font-semibold text-sm">{formatDisplayDate(ctxFrom)} - {formatDisplayDate(ctxTo)}</span>
      </button>
      {open && (
        <div className={cn('absolute right-0 top-full mt-2 z-50', dayPickerPanelClassName)}>
          <div className="flex items-center gap-2 mb-3">
            <div className={cn('flex-1 rounded-lg border px-3 py-1.5', pickingFrom ? 'border-[#4DB8CA] bg-[#4DB8CA]/5' : 'border-[#E2E8F0]')}>
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Start</p>
              <p className="text-xs font-semibold text-text-dark">{from ? formatDisplayDate(from) : 'Select a date'}</p>
            </div>
            <div className={cn('flex-1 rounded-lg border px-3 py-1.5', !pickingFrom && !to ? 'border-[#4DB8CA] bg-[#4DB8CA]/5' : 'border-[#E2E8F0]')}>
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">End</p>
              <p className="text-xs font-semibold text-text-dark">{to ? formatDisplayDate(to) : 'Select a date'}</p>
            </div>
          </div>
          <DayPicker
            mode="range"
            navLayout="around"
            selected={{ from: parseYMD(from), to: parseYMD(to) }}
            onSelect={(range) => {
              setFrom(range?.from ? formatYMD(range.from) : '');
              setTo(range?.to ? formatYMD(range.to) : '');
            }}
            classNames={dayPickerClassNames}
            showOutsideDays
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleReset}
              disabled={!from && !to}
              className="px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              disabled={!from || !to}
              className="btn-primary flex-1 py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const isActive = (segment: string) => location.pathname.includes(segment);

  return (
    <PageHeaderProvider>
      <DashboardLayoutInner isActive={isActive} />
    </PageHeaderProvider>
  );
};

const DashboardLayoutInner: React.FC<{ isActive: (s: string) => boolean }> = ({ isActive }) => {
  const { title, subtitle, headerAction, showFilters, onBack } = usePageHeader();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = user ? getNavItems(user.role) : [];

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <div className="flex h-screen bg-[#F4F6F8] overflow-hidden">
      {/* Sidebar - hidden on small screens, shown as drawer when `mobileOpen` */}
      <aside className="hidden md:flex md:w-52 bg-[#0A3D4D] text-white flex-col flex-shrink-0 z-30 shadow-xl">
        {/* Logo - White Container */}
        <div className="bg-white h-auto sm:h-20 flex items-center px-4 sm:px-6 border-b border-border">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Dnyansetu" className="h-10 w-auto" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-0 py-6 space-y-0.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <SidebarLink key={item.to} item={item} active={isActive(item.matchSegment)} />
          ))}
        </nav>

        {/* Profile footer with dropdown */}
        <div className="p-4 border-t border-white/5 relative" ref={userMenuRef}>
          <div
            onClick={() => setUserMenuOpen(o => !o)}
            className="flex flex-col gap-1 px-3 py-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer group active:scale-95"
          >
            <p className="text-sm font-bold text-white truncate leading-tight tracking-tight flex items-center justify-between w-full">
              {user?.name || 'User Name'}
              <ChevronDown size={14} className={`text-white/30 group-hover:text-white transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </p>
            <p className="text-[10px] font-medium text-white/70 truncate tracking-widest">
              {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Branch Admin'}
            </p>
          </div>

          {userMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-white rounded-xl shadow-xl border border-border overflow-hidden z-50">
              {user?.role === 'SUPER_ADMIN' && (
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/super-admin/settings'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings size={15} className="text-gray-400" />
                  Settings
                </button>
              )}
              <button
                onClick={() => { setUserMenuOpen(false); setLogoutConfirm(true); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          )}
        </div>

        <ConfirmDialog
          isOpen={logoutConfirm}
          title="Logout?"
          message="Are you sure you want to log out of your account?"
          confirmText="Logout"
          cancelText="Cancel"
          isDangerous={false}
          onConfirm={handleLogout}
          onCancel={() => setLogoutConfirm(false)}
        />
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#0A3D4D] text-white p-4 overflow-y-auto">
            <div className="bg-white h-20 flex items-center px-4 border-b border-border">
              <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Dnyansetu" className="h-10 w-auto" />
            </div>
            <nav className="mt-4 space-y-1">
              {navItems.map((item) => (
                <SidebarLink key={item.to} item={item} active={isActive(item.matchSegment)} />
              ))}
            </nav>
            <div className="mt-6 p-2 border-t border-white/5">
              <div onClick={() => { setMobileOpen(false); setLogoutConfirm(true); }} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-white/5 cursor-pointer">
                <div className="flex-1">
                  <p className="text-sm font-bold text-white truncate">{user?.name || 'User Name'}</p>
                  <p className="text-[10px] text-white/70">{user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Branch Admin'}</p>
                </div>
                <ChevronDown size={14} className="text-white/30" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header — title/subtitle on left, controls on right */}
        <header className="bg-white border-b border-border flex items-center justify-between px-4 sm:px-8 h-auto sm:h-20 flex-shrink-0 z-20 shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="text-[#64748B] hover:text-[#1A2332] transition-colors mt-0.5">
                 <ArrowLeft size={24} />
              </button>
            )}
            {/* Mobile menu button */}
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-md text-[#64748B] hover:text-[#1A2332]">
              <Menu size={22} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-[22px] font-bold text-[#1A2332] tracking-tight">{title}</h1>
              {subtitle && <p className="text-[14px] font-medium text-[#64748B] mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-8">
            {headerAction && <div className="animate-in fade-in slide-in-from-right duration-500">{headerAction}</div>}
            {showFilters && (
              <div className="flex items-center gap-6 pl-8 border-l border-border h-12 animate-in fade-in duration-700">
                <SortByDropdown />
                <div className="w-px h-8 bg-border" />
                <DateRangeDropdown />
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-[#F4F6F8] custom-scrollbar">
          <div className="p-4 sm:p-8 max-w-screen-xl mx-auto animate-in fade-in duration-500">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;

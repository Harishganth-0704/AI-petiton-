import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, LogOut, FileText, Map, LayoutDashboard,
  PlusCircle, Search, Briefcase, Menu, User
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { NotificationCenter } from './NotificationCenter';
import GrievanceChatbot from './GrievanceChatbot';
import logo from '@/assets/logo.png';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const role = user?.role ?? 'citizen';

  // Role-based navigation: each role only sees what they can access
  const navItems = (() => {
    if (role === 'admin') return [
      { to: '/admin', label: t('admin_panel'), icon: Shield },
      { to: '/track', label: t('track_issue'), icon: Search },
      { to: '/map', label: t('map_view'), icon: Map },
    ];
    if (role === 'officer') return [
      { to: '/officer', label: t('my_department'), icon: Briefcase },
      { to: '/track', label: t('track_issue'), icon: Search },
      { to: '/map', label: t('map_view'), icon: Map },
    ];
    // citizen
    return [
      { to: '/', label: t('dashboard'), icon: LayoutDashboard },
      { to: '/submit', label: t('submit_petition'), icon: PlusCircle },
      { to: '/track', label: t('track_issue'), icon: Search },
      { to: '/map', label: t('map_view'), icon: Map },
    ];
  })();

  const ROLE_CONFIG: Record<string, { color: string, icon: any }> = {
    admin: { color: 'bg-destructive/20 text-destructive', icon: Shield },
    officer: { color: 'bg-blue-100 text-blue-700', icon: Briefcase },
    citizen: { color: 'bg-green-100 text-green-700', icon: User },
  };

  const config = ROLE_CONFIG[role] || ROLE_CONFIG.citizen;
  const RoleIcon = config.icon;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="gov-gradient sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2 lg:gap-8">
            <Link to="/" className="flex items-center gap-2 shrink-0 group">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center p-0.5 shadow-sm group-hover:scale-105 transition-transform">
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-heading font-bold text-primary-foreground leading-tight">{t('app_title')}</h1>
                <p className="text-[10px] text-primary-foreground/70">{t('dashboard_subtitle')}</p>
              </div>
            </Link>

            <div className="flex items-center lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-[350px] p-0">
                  <SheetHeader className="p-6 border-b text-left">
                    <SheetTitle className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg gov-gradient flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <span>{t('app_title')}</span>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="py-4">
                    <div className="px-3 mb-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}>
                        <RoleIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{user?.name}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{role}</p>
                      </div>
                    </div>
                    <nav className="flex flex-col gap-1 px-2">
                      {navItems.map(item => (
                        <NavLink key={item.to} item={item} mobile />
                      ))}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-0.5 mx-4">
            {navItems.map(item => (
              <NavLink key={item.to} item={item} />
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}>
              <RoleIcon className="w-4 h-4" />
            </div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs text-primary-foreground/90 font-medium">{user?.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${config.color}`}>
                {role}
              </span>
            </div>
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationCenter />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              title={t('logout')}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-card py-4">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          {t('footer_text')}
        </div>
      </footer>

      {/* AI Grievance Chatbot - Citizens Only */}
      <GrievanceChatbot />
    </div>
  );
}

function NavLink({ item, mobile }: { item: any, mobile?: boolean }) {
  const Icon = item.icon;
  const location = useLocation();
  const active = location.pathname === item.to;

  if (mobile) {
    return (
      <Link
        to={item.to}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active
            ? 'bg-primary/10 text-primary shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
      >
        <Icon className={`w-5 h-5 ${active ? 'text-primary' : ''}`} />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <Link
      to={item.to}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${active
          ? 'bg-primary-foreground/20 text-primary-foreground'
          : 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10'
        }`}
    >
      <Icon className="w-4 h-4" />
      <span className="inline">{item.label}</span>
    </Link>
  );
}

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from "sonner";
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
import PageTransition from './PageTransition';
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
      {/* 1. Mandatory GIGW Accessibility Top Bar */}
      <div className="bg-slate-900 border-b border-white/10 text-slate-200 text-[10px] sm:text-xs py-1.5 px-4 flex items-center justify-between z-[60] relative shadow-sm">
        <div className="container mx-auto flex items-center justify-between h-full">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 pr-4 border-r border-white/10">
              <span className="font-bold tracking-widest text-slate-300 uppercase">Government of Tamil Nadu</span>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <a href="#main-content" className="hover:text-primary transition-all hover:underline underline-offset-4">Skip to Main Content</a>
              <span className="text-white/20">|</span>
              <button className="hover:text-primary cursor-pointer transition-all flex items-center gap-1">
                <User className="w-3 h-3" /> Screen Reader Access
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center bg-slate-800 rounded px-1 border border-white/10 mr-2">
              <button 
                onClick={() => document.documentElement.style.fontSize = '14px'} 
                className="px-2 py-0.5 hover:bg-slate-700 hover:text-primary border-r border-white/10 transition-colors" 
                title="Decrease Font Size"
              >A-</button>
              <button 
                onClick={() => document.documentElement.style.fontSize = '16px'} 
                className="px-2 py-0.5 hover:bg-slate-700 hover:text-primary border-r border-white/10 font-bold transition-colors" 
                title="Normal Font Size"
              >A</button>
              <button 
                onClick={() => document.documentElement.style.fontSize = '18px'} 
                className="px-2 py-0.5 hover:bg-slate-700 hover:text-primary transition-colors" 
                title="Increase Font Size"
              >A+</button>
            </div>
            
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <div className="h-4 w-px bg-white/20 mx-1 hidden sm:block"></div>
              <LanguageSwitcher />
            </div>

            <div className="flex items-center gap-1 sm:hidden ml-2 border-l border-white/10 pl-2">
              <button onClick={() => document.documentElement.style.fontSize = '14px'} className="px-1 text-slate-300 hover:text-primary">-</button>
              <button onClick={() => document.documentElement.style.fontSize = '16px'} className="px-1 font-bold text-white hover:text-primary">A</button>
              <button onClick={() => document.documentElement.style.fontSize = '18px'} className="px-1 text-slate-300 hover:text-primary">+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="gov-gradient sticky top-0 z-50 shadow-lg border-b border-primary/20">
        <div className="container mx-auto flex items-center justify-between h-20 px-4">
          <div className="flex items-center gap-2 lg:gap-8">
            <Link to="/" className="flex items-center gap-4 shrink-0 group">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-1 shadow-inner group-hover:scale-105 transition-transform duration-300">
                <img src={logo} alt="Government Emblem" className="w-full h-full object-contain" />
              </div>
              <div className="hidden sm:block border-l border-white/20 pl-4 py-1">
                <h1 className="text-lg font-heading font-bold text-white leading-tight tracking-tight uppercase">
                  {t('app_title')}
                </h1>
                <p className="text-[11px] text-blue-100/80 font-medium tracking-wide">
                  Department of Public Grievances • Government of Tamil Nadu
                </p>
              </div>
            </Link>

            <div className="flex items-center lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-white/10">
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-[350px] p-0 border-r-4 border-primary">
                  <SheetHeader className="p-6 border-b text-left bg-slate-50 dark:bg-slate-900">
                    <SheetTitle className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg gov-gradient flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{t('app_title')}</span>
                        <span className="text-[10px] text-muted-foreground">Portal v3.1</span>
                      </div>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="py-4">
                    <div className="px-4 mb-6 flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${config.color}`}>
                        <RoleIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{user?.name}</p>
                        <p className="text-[10px] uppercase tracking-widest text-primary font-bold">{role}</p>
                      </div>
                    </div>
                    <nav className="flex flex-col gap-1 px-3">
                      <div className="text-[10px] uppercase tracking-tighter text-muted-foreground font-semibold px-4 mb-2">Main Navigation</div>
                      {navItems.map(item => (
                        <NavLink key={item.to} item={item} mobile />
                      ))}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 mx-4">
            {navItems.map(item => (
              <NavLink key={item.to} item={item} />
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex flex-col items-end border-r border-white/20 pr-3 mr-1">
              <span className="text-sm text-white font-semibold">{user?.name}</span>
              <Badge variant="outline" className="text-[10px] h-5 bg-white/10 text-white border-white/20 uppercase tracking-tighter px-2">
                {role}
              </Badge>
            </div>
            
            <NotificationCenter />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-white/80 hover:text-white hover:bg-white/10 transition-all rounded-full h-10 w-10"
              title={t('logout')}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1 bg-slate-50/50 dark:bg-slate-950/20">
        <PageTransition key={location.pathname}>
          {children}
        </PageTransition>
      </main>

      {/* 3. Official GIGW Standard Footer */}
      <footer className="bg-slate-900 border-t-8 border-primary text-slate-300 pt-12 pb-6">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-white rounded p-1">
                   <img src={logo} alt="TN Emblem" className="w-full h-full object-contain" />
                 </div>
                 <h4 className="text-white font-bold uppercase tracking-widest text-xs leading-tight">
                   AI Petition Hub<br />Government of TN
                 </h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Centralized Public Grievance Redress and Monitoring System. Using AI to transform governance and ensure citizen satisfaction through timely resolution of petitions.
              </p>
              <div className="pt-2 flex gap-3">
                 <div className="px-3 py-1 bg-slate-800 rounded border border-white/5 text-[10px] text-slate-400">GIGW 3.0</div>
                 <div className="px-3 py-1 bg-slate-800 rounded border border-white/5 text-[10px] text-slate-400">W3C WCAG 2.1</div>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs border-b border-primary/30 pb-2 inline-block">Direct Links</h4>
              <ul className="space-y-3 text-xs flex flex-col">
                 <Link to="/" className="hover:text-primary transition-colors flex items-center gap-2 group">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary" /> Home
                 </Link>
                 {role === 'citizen' && (
                   <Link to="/submit" className="hover:text-primary transition-colors flex items-center gap-2 group">
                     <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary" /> Lodge Grievance
                   </Link>
                 )}
                 <Link to="/track" className="hover:text-primary transition-colors flex items-center gap-2 group">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary" /> Track Status
                 </Link>
                 <button 
                   onClick={() => toast.info(t('feature_coming_soon') || 'This feature will be available soon.')} 
                   className="hover:text-primary transition-colors flex items-center gap-2 group text-left"
                 >
                   <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary" /> Appellate Authority
                 </button>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs border-b border-primary/30 pb-2 inline-block">Help & Policies</h4>
              <ul className="space-y-3 text-xs flex flex-col items-start">
                 <button onClick={() => toast.info('Privacy Policy will be updated soon.')} className="hover:text-primary transition-all hover:translate-x-1 duration-200">Privacy Policy</button>
                 <button onClick={() => toast.info('Terms & Conditions will be updated soon.')} className="hover:text-primary transition-all hover:translate-x-1 duration-200">Terms & Conditions</button>
                 <button onClick={() => toast.info('Copyright Policy will be updated soon.')} className="hover:text-primary transition-all hover:translate-x-1 duration-200">Copyright Policy</button>
                 <button onClick={() => toast.info('Hyperlinking Policy will be updated soon.')} className="hover:text-primary transition-all hover:translate-x-1 duration-200">Hyperlinking Policy</button>
                 <button onClick={() => toast.info('Accessibility Statement will be updated soon.')} className="hover:text-primary transition-all hover:translate-x-1 duration-200">Accessibility Statement</button>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs border-b border-primary/30 pb-2 inline-block">Contact Support</h4>
              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-slate-300 font-medium">Nodal Officer</p>
                    <p className="text-slate-500 text-[10px]">support.grievance@tn.gov.in</p>
                  </div>
                </div>
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/10 mt-4">
                  <p className="text-[10px] text-slate-400 mb-1 italic">Toll Free Helpline</p>
                  <p className="text-lg font-bold text-white tracking-widest">1800-425-1000</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-500 gap-6">
             <div className="flex flex-col items-center md:items-start max-w-md">
               <span className="text-slate-400 font-medium pb-1">© 2024 AI Petition Hub • Government of Tamil Nadu</span>
               <span>Content owned, maintained and updated by the Department of Public Grievances. Portal designed & developed by AI Research Cell in collaboration with NIC.</span>
             </div>
             <div className="flex flex-col items-center md:items-end gap-2">
               <div className="flex gap-4 mb-2">
                 <img src="https://www.nic.in/wp-content/uploads/2021/08/NIC_Logo_White.png" alt="NIC Logo" className="h-8 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer" />
                 <img src="https://www.digitalindia.gov.in/writereaddata/files/digital-india-logo.png" alt="Digital India" className="h-8 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer" />
               </div>
               <div className="flex items-center gap-3">
                 <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px]">Ver 3.1.4</span>
                 <span className="text-slate-600">|</span>
                 <span>Last Updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
               </div>
             </div>
          </div>
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

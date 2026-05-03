
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { DEPARTMENT_ICONS } from '@/lib/mock-data';
import { apiFetch } from '@/lib/api';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FileText, CheckCircle, Clock, AlertTriangle, Star, Award, Trophy, TrendingUp, Eye, MessageSquare, ThumbsUp, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts';
import { AnimatedCounter } from '@/components/ui/animated-counter';

const CHART_COLORS = ['#2563eb', '#0891b2', '#f59e0b', '#10b981', '#ef4444'];

const STATUS_LABEL_MAP: Record<string, string> = {
  submitted: 'Submitted',
  ai_processing: 'AI Processing',
  verification: 'Under Verification',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  escalated: 'Escalated',
};

const DEPT_ICONS: Record<string, string> = {
  healthcare: '🏥',
  corruption: '⚖️',
  delay_in_service: '⏳',
  harassment: '🛑',
  service_standards: '📜',
  road: '🛣️',
  water: '💧',
  electricity: '⚡',
  sanitation: '🧹',
};

const calculateSLADays = (createdAt: string) => {
  const created = new Date(createdAt);
  const target = new Date(created);
  target.setDate(target.getDate() + 30);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();

  const [stats, setStats] = useState({
    totalPetitions: 0, resolved: 0, pending: 0, escalated: 0,
    departmentBreakdown: {} as Record<string, number>,
  });
  const [dashboardStats, setDashboardStats] = useState({
    total_petitions: 0, resolved_petitions: 0, resolution_rate: 0, avg_sla_days: 0, trend: [] as any[]
  });
  const [recentPetitions, setRecentPetitions] = useState<any[]>([]);
  const [trendingPetitions, setTrendingPetitions] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [ageingStats, setAgeingStats] = useState({ days0_30: 0, days30_60: 0, days60_plus: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [stats, all, dbStats, trending, topUsers] = await Promise.all([
          apiFetch('/api/petitions/stats'),
          apiFetch('/api/petitions'),
          apiFetch('/api/dashboard/stats'),
          apiFetch('/api/petitions/trending?category=all'),
          apiFetch('/api/users/leaderboard'),
        ]);
        setStats(stats);
        setDashboardStats(dbStats);
        setRecentPetitions(all.slice(0, 5));
        setTrendingPetitions(trending);
        setLeaderboard(topUsers || []);

        // Calculate Ageing Analysis
        const now = new Date();
        const ageing = { days0_30: 0, days30_60: 0, days60_plus: 0 };
        all.forEach((p: any) => {
          if (p.status === 'resolved' || p.status === 'rejected') return;
          const created = new Date(p.created_at);
          const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 30) ageing.days0_30++;
          else if (diffDays <= 60) ageing.days30_60++;
          else ageing.days60_plus++;
        });
        setAgeingStats(ageing);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    if (user?.role === 'citizen') {
      refreshUser();
    }
  }, []);

  const getBadgeInfo = (points: number) => {
    if (points >= 1000) return { label: t('badge_diamond'), color: 'bg-blue-500', icon: Trophy };
    if (points >= 500) return { label: t('badge_gold'), color: 'bg-yellow-500', icon: Award };
    if (points >= 100) return { label: t('badge_silver'), color: 'bg-slate-400', icon: Star };
    return { label: t('badge_bronze'), color: 'bg-orange-600', icon: Star };
  };

  const badge = getBadgeInfo(user?.points || 0);
  const BadgeIcon = badge.icon;

  // Citizens see their own petitions only — label accordingly
  const isCitizen = user?.role === 'citizen' || !user?.role;
  const statCards = [
    { label: t('total_petitions') || 'Total Petitions', value: dashboardStats.total_petitions, icon: FileText, color: 'text-primary' },
    { label: t('resolved_petitions') || 'Resolved Petitions', value: dashboardStats.resolved_petitions, icon: CheckCircle, color: 'text-success' },
    { label: t('resolution_rate') || 'Resolution Rate', value: `${dashboardStats.resolution_rate}%`, icon: FileText, color: 'text-warning' },
    { label: t('avg_sla') || 'Average SLA (days)', value: dashboardStats.avg_sla_days, icon: Clock, color: 'text-destructive' },
  ];

  const deptData = stats?.departmentBreakdown ? Object.entries(stats.departmentBreakdown).map(([key, val], i) => ({
    name: t('dept_' + key),
    value: val,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  })) : [];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">{t('welcome', { name: user?.name })}</h1>
          <p className="text-sm text-muted-foreground">{t('dashboard_subtitle')}</p>
        </div>

        {user?.role === 'citizen' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="glass-card bg-primary/5 border-primary/20 shadow-none">
              <CardContent className="p-3 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${badge.color} flex items-center justify-center text-white shadow-lg animate-float`}>
                  <BadgeIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">{badge.label}</span>
                  </div>
                  <p className="text-xl font-heading font-black text-foreground leading-none">
                    <AnimatedCounter value={user?.points || 0} /> <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{t('citizen_points_lbl')}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="glass-card hover:scale-105 transition-transform duration-300">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center ${s.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-heading font-bold">
                      <AnimatedCounter value={typeof s.value === 'number' ? s.value : parseInt(String(s.value)) || 0} />
                      {String(s.value).includes('%') && '%'}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Existing Pie Chart */}
        {deptData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-heading">{t('dept_distribution')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={deptData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                    {deptData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {deptData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                    {d.name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* New Area Chart for Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> {t('petition_trends') || 'Petition Submission Trends'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dashboardStats.trend.length > 0 ? dashboardStats.trend : [{ date: 'No Data', count: 0 }]}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  tickFormatter={(str) => {
                    if (str === 'No Data') return str;
                    const date = new Date(str);
                    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart Moved below */}
      {deptData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-heading">{t('petitions_by_dept')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {deptData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
      )}

      {/* Ageing Analysis - Professional Accountability */}
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> {t('ageing_analysis')}
            </div>
            <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary">Live Transparency</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 py-2">
            {[
              { label: t('days_0_30'), count: ageingStats.days0_30, color: 'bg-green-500', percent: (ageingStats.days0_30 / Math.max(1, ageingStats.days0_30 + ageingStats.days30_60 + ageingStats.days60_plus)) * 100 },
              { label: t('days_30_60'), count: ageingStats.days30_60, color: 'bg-orange-500', percent: (ageingStats.days30_60 / Math.max(1, ageingStats.days0_30 + ageingStats.days30_60 + ageingStats.days60_plus)) * 100 },
              { label: t('days_60_plus'), count: ageingStats.days60_plus, color: 'bg-red-600', percent: (ageingStats.days60_plus / Math.max(1, ageingStats.days0_30 + ageingStats.days30_60 + ageingStats.days60_plus)) * 100 },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{item.label}</span>
                  <span className="text-muted-foreground">{item.count} {t('total_petitions')}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                   <motion.div 
                     initial={{ width: 0 }} 
                     animate={{ width: `${item.percent}%` }}
                     className={`h-full ${item.color}`}
                   />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-4 italic">
            * These statistics represent the current pending workload of government departments.
          </p>
        </CardContent>
      </Card>

      {/* Recently Submitted and Leaderboard */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent petitions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-heading">{t('recent_petitions')}</CardTitle>
            <Link to="/track" className="text-[10px] text-primary hover:underline uppercase tracking-widest font-bold font-heading">{t('nav_track')} →</Link>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4 p-2 bg-primary/5 rounded-lg border border-primary/10">
               <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary" />
               </div>
               <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">{t('public_accountability')}</p>
                  <p className="text-[10px] text-muted-foreground">Official redressal goal: 30 days per petition</p>
               </div>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('loading')}</p>
            ) : !recentPetitions || recentPetitions.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-2xl">📋</p>
                <p className="text-sm font-medium">{t('no_petitions_yet')}</p>
                <p className="text-xs text-muted-foreground">{t('no_petitions_yet_desc')}</p>
                <Link to="/submit" className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
                  {t('submit_first_petition')}
                </Link>
              </div>
            ) : (
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { 
                    opacity: 1,
                    transition: { staggerChildren: 0.1 }
                  }
                }}
                className="space-y-3"
              >
                {recentPetitions.map(pet => (
                  <motion.div 
                    key={pet.id}
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: { opacity: 1, x: 0 }
                    }}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors border border-transparent hover:border-muted-foreground/10 group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform">
                        {pet.category ? (DEPT_ICONS[pet.category] || '📋') : '📋'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">{t('dept_' + pet.category)}</span>
                          <span className="text-[10px] text-muted-foreground/30">•</span>
                          <span className="text-[10px] text-muted-foreground font-medium">{new Date(pet.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{pet.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 px-2 sm:px-0">
                        <Badge className="font-bold text-[10px] uppercase tracking-tighter" variant={pet.status === 'resolved' ? 'default' : pet.status === 'escalated' ? 'destructive' : 'secondary'}>
                          {t('status_' + pet.status) || pet.status}
                        </Badge>
                        {pet.status !== 'resolved' && (
                          <div className="flex items-center gap-1.5 ml-1">
                            {(() => {
                              const days = calculateSLADays(pet.created_at);
                              const isBreached = days <= 0;
                              return (
                                <Badge variant="outline" className={`text-[9px] font-black border-none px-1.5 py-0.5 ${
                                  isBreached ? 'bg-red-500/10 text-red-600' : 
                                  days < 7 ? 'bg-orange-500/10 text-orange-600' : 
                                  'bg-green-500/10 text-green-600'
                                }`}>
                                  {isBreached ? t('sla_breached') : t('days_left', { days })}
                                </Badge>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="border-primary/10 bg-primary/[0.01]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> {t('leaderboard_title') || 'Civic Hero Leaderboard'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('loading')}</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Be the first to join the leaderboard!</p>
            ) : (
              <div className="space-y-4">
                {leaderboard.map((hero, idx) => {
                  const hBadge = getBadgeInfo(hero.points);
                  const HBadgeIcon = hBadge.icon;
                  return (
                    <motion.div
                      key={hero.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-muted-foreground/5 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`w-8 h-8 rounded-full ${hBadge.color} flex items-center justify-center text-white text-[10px] font-bold`}>
                            {idx + 1}
                          </div>
                          {idx < 3 && (
                            <div className="absolute -top-1 -right-1">
                              <span className="text-xs">
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold leading-none mb-1">{hero.name}</p>
                          <div className="flex items-center gap-1">
                            <HBadgeIcon className={`w-3 h-3 ${hBadge.color.replace('bg-', 'text-')}`} />
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{hBadge.label}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-primary leading-none">{hero.points}</p>
                        <p className="text-[8px] uppercase font-bold text-muted-foreground">Pts</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Trending Petitions */}
      <Card className="border-orange-500/20 shadow-orange-500/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-orange-500/10 to-transparent rounded-t-xl">
          <CardTitle className="text-lg font-heading flex items-center gap-2 text-orange-600">
            <TrendingUp className="w-5 h-5" /> 🔥 Trending Now
          </CardTitle>
          <Badge variant="outline" className="border-orange-500/30 text-orange-600">Top 10</Badge>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
             <p className="text-sm text-muted-foreground text-center py-4">{t('loading')}</p>
          ) : trendingPetitions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No trending petitions yet. Be the first to start a movement!</p>
          ) : (
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
               {trendingPetitions.slice(0, 6).map((pet, idx) => (
                 <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    transition={{ delay: idx * 0.1 }}
                    key={pet.id} 
                    className="flex flex-col h-full"
                  >
                   <Link 
                     to={`/track?id=${String(pet.id).slice(0, 8)}`} 
                     className="flex flex-col h-full gap-3 p-4 rounded-xl bg-background border hover:shadow-md transition-all group cursor-pointer"
                   >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{pet.category ? (DEPT_ICONS[pet.category] || '📋') : '📋'}</span>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60">{t('dept_' + pet.category)}</span>
                          <h4 className="text-sm font-bold line-clamp-2 group-hover:text-primary transition-colors">{pet.title}</h4>
                        </div>
                      </div>
                      <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none px-2 shadow-none shrink-0 text-[10px]">
                        Sc: {pet.trending_score}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{pet.description}</p>
                    
                    <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
                       <div className="flex items-center gap-1.5" title="Views">
                         <Eye className="w-3.5 h-3.5" /> <span>{pet.view_count || 0}</span>
                       </div>
                       <div className={`flex items-center gap-1.5 font-medium ${pet.has_upvoted ? 'text-primary' : ''}`} title="Supports">
                         <ThumbsUp className={`w-3.5 h-3.5 ${pet.has_upvoted ? 'fill-primary' : ''}`} /> 
                         <span>{pet.upvotes_count || 0}</span>
                       </div>
                       <div className={`flex items-center gap-1.5 font-medium ${pet.has_commented ? 'text-blue-600' : ''}`} title="Comments">
                         <MessageSquare className={`w-3.5 h-3.5 ${pet.has_commented ? 'fill-blue-600' : ''}`} /> 
                         <span>{pet.comments_count || 0}</span>
                       </div>
                    </div>
                   </Link>
                 </motion.div>
               ))}
             </div>
          )}
        </CardContent>
      </Card>
      
    </div>
  );
}

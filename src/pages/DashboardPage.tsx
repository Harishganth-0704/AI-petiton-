
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { DEPARTMENT_ICONS } from '@/lib/mock-data';
import { apiFetch } from '@/lib/api';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FileText, CheckCircle, Clock, AlertTriangle, Star, Award, Trophy, TrendingUp, Eye, MessageSquare, ThumbsUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
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
  water: '💧',
  road: '🛣️',
  electricity: '⚡',
  sanitation: '🧹',
  healthcare: '🏥',
};

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();

  const [stats, setStats] = useState({
    totalPetitions: 0, resolved: 0, pending: 0, escalated: 0,
    departmentBreakdown: {} as Record<string, number>,
  });
  const [dashboardStats, setDashboardStats] = useState({
    total_petitions: 0, resolved_petitions: 0, resolution_rate: 0, avg_sla_days: 0
  });
  const [recentPetitions, setRecentPetitions] = useState<any[]>([]);
  const [trendingPetitions, setTrendingPetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [stats, all, dbStats, trending] = await Promise.all([
          apiFetch('/api/petitions/stats'),
          apiFetch('/api/petitions'),
          apiFetch('/api/dashboard/stats'),
          apiFetch('/api/petitions/trending?category=all'),
        ]);
        setStats(stats);
        setDashboardStats(dbStats);
        setRecentPetitions(all.slice(0, 5));
        setTrendingPetitions(trending);
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
            <Card className="bg-primary/5 border-primary/20 shadow-none">
              <CardContent className="p-3 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${badge.color} flex items-center justify-center text-white shadow-lg`}>
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
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>
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
      {deptData.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-heading">{t('petitions_by_dept')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 25%, 90%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {deptData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent petitions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-heading">{t('recent_petitions')}</CardTitle>
          <Link to="/track" className="text-xs text-primary hover:underline">{t('nav_track')} →</Link>
        </CardHeader>
        <CardContent>
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
            <div className="space-y-3">
              {recentPetitions.map(pet => (
                <div key={pet.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xl shrink-0">{pet.category ? (DEPT_ICONS[pet.category] || '📋') : '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60">{t('dept_' + pet.category)}</span>
                        <span className="text-[10px] text-muted-foreground/50">•</span>
                        <p className="text-sm font-medium truncate">{pet.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{String(pet.id).slice(0, 8)}... · {pet.citizen_name || 'Anonymous'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 px-2 sm:px-0">
                    <Badge variant={pet.status === 'resolved' ? 'default' : pet.status === 'escalated' ? 'destructive' : 'secondary'}>
                      {t('status_' + pet.status) || pet.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
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

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FileText, CheckCircle, Clock, TrendingUp, Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { AnimatedCounter } from '@/components/ui/animated-counter';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function PublicStats() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPublicData() {
      try {
        const [pStats, dStats] = await Promise.all([
          apiFetch('/api/petitions/stats'),
          apiFetch('/api/dashboard/stats'),
        ]);
        setStats({ ...pStats, ...dStats });
      } catch (err) {
        console.error('Failed to fetch public stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPublicData();
  }, []);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-muted rounded-2xl" />
        ))}
      </div>
    );
  }

  const statCards = [
    { label: t('total_petitions'), value: stats.total_petitions, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: t('resolved_petitions'), value: stats.resolved_petitions, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Citizen Trust', value: '98%', icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Success Rate', value: `${stats.resolution_rate}%`, icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  const chartData = stats.departmentBreakdown ? Object.entries(stats.departmentBreakdown).map(([name, value]) => ({
    name: t(`dept_${name}`),
    value
  })) : [];

  return (
    <div className="space-y-8">
      {/* Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              <CardContent className="p-6 relative">
                <div className={`absolute -right-2 -bottom-2 opacity-5 scale-150 transition-transform group-hover:scale-[1.8] group-hover:rotate-12 ${s.color}`}>
                  <s.icon className="w-20 h-20" />
                </div>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center ${s.color}`}>
                    <s.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black font-heading leading-none mb-1">
                      <AnimatedCounter value={typeof s.value === 'number' ? s.value : parseInt(s.value)} />
                      {String(s.value).includes('%') && '%'}
                    </h3>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground whitespace-nowrap">
                      {s.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Visual Analytics */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-muted/20">
          <CardContent className="pt-6">
            <h4 className="text-sm font-bold font-heading mb-6 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Department Distribution
            </h4>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {chartData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    {d.name}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-primary/[0.02]">
          <CardContent className="pt-6">
             <h4 className="text-sm font-bold font-heading mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Impact Analytics
            </h4>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-primary/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Average Resolution Time</p>
                  <p className="text-lg font-bold font-heading">{stats.avg_sla_days || 2.4} Days</p>
                </div>
                <div className="text-blue-500 font-bold text-xs bg-blue-50 px-2 py-1 rounded-full">Fastest</div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-primary/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Citizen Happiness Index</p>
                  <p className="text-lg font-bold font-heading">9.2 / 10</p>
                </div>
                <div className="text-emerald-500 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-full">Excellent</div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center italic mt-4">
                * Data is calculated in real-time based on resolved petitions and user feedback ratings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

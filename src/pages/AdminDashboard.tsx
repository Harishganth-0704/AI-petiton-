import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { STATUS_LABELS } from '@/lib/mock-data';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import {
  Users, FileText, CheckCircle, Clock, AlertTriangle,
  Search, Filter, ChevronRight, MapPin, Calendar,
  Mail, Phone, Info, Brain, ShieldAlert, Shield,
  TrendingUp, User, Star
} from 'lucide-react';
import { getMediaUrl } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { AIAnalysisReport } from '@/components/AIAnalysisReport';
import { formatDistanceToNow, format } from 'date-fns';
import { enUS, ta } from 'date-fns/locale';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    const heat = (L as any).heatLayer(points, { 
      radius: 25, 
      blur: 15, 
      maxZoom: 17,
      gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
    }).addTo(map);
    return () => { map.removeLayer(heat); };
  }, [map, points]);
  return null;
}

const CHART_COLORS = ['#2563eb', '#0891b2', '#f59e0b', '#10b981', '#ef4444'];

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const [petitions, setPetitions] = useState<any[]>([]);
  const [allPetitions, setAllPetitions] = useState<any[]>([]); // for heatmap — all petitions
  const [stats, setStats] = useState({
    totalPetitions: 0,
    resolved: 0,
    avgResolutionDays: 0,
    totalOfficers: 0,
    departmentBreakdown: {} as Record<string, number>
  });
  const [dashboardStats, setDashboardStats] = useState({
    total_petitions: 0,
    resolved_petitions: 0,
    resolution_rate: 0,
    avg_sla_days: 0
  });
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed'>('pending');
  const [departments, setDepartments] = useState<any[]>([]);

  // Fetch ALL petitions for heatmap (live, auto-refreshes every 30s)
  useEffect(() => {
    const fetchAll = () => apiFetch('/api/petitions').then(setAllPetitions).catch(console.error);
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    apiFetch(`/api/petitions?reviewed=${activeTab === 'reviewed'}`).then(setPetitions).catch(console.error);
    apiFetch('/api/petitions/stats').then(setStats).catch(console.error);
    apiFetch('/api/dashboard/stats').then(setDashboardStats).catch(console.error);
    apiFetch('/api/feedbacks').then(setFeedbacks).catch(console.error);
    apiFetch('/api/officers/departments').then(setDepartments).catch(console.error);
  }, [activeTab]);

  const [isReanalyzing, setIsReanalyzing] = useState<string | null>(null);

  const handleReanalyze = async (id: string) => {
    setIsReanalyzing(id);
    try {
      const res = await apiFetch(`/api/petitions/${id}/reanalyze`, { method: 'POST' });
      setPetitions(prev => prev.map(p => p.id === id ? { ...p, officer_remark: `AI RE-ANALYSIS:\n${res.reason}`, ai_analysis_report: res.steps } : p));
      toast.success("AI Re-analysis complete! ✨");
    } catch (err: any) {
      toast.error(err.message || "Re-analysis failed");
    } finally {
      setIsReanalyzing(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      // For Admin, we might need a default remark if none provided, 
      // but the backend requires a remark. Let's add a prompt or default.
      const remark = window.prompt("Enter a remark for this status change:", "Admin update");
      if (remark === null) return; // cancelled

      await apiFetch(`/api/petitions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, remark }),
      });

      setPetitions(prev => prev.map(p => p.id === id ? { ...p, status: newStatus, officer_remark: remark } : p));
      toast.success(t('status_updated_toast', { status: t(`status_${newStatus}`) }));
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleApprove = async (id: string, category: string) => {
    try {
      console.log('Available departments:', departments);
      console.log('Requested category:', category);
      
      const dept = departments.find(d => d.name.toLowerCase() === category.toLowerCase());
      
      // Fallback: If department list didn't load properly, we can still try to let the backend find it
      // if we omit department_id entirely and let the backend do it (though the current backend route expects it).
      // We will send a fallback if `departments` array is empty.
      if (!dept && departments.length > 0) {
        return toast.error("Invalid department selected: " + category);
      }

      await apiFetch(`/api/petitions/${id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          category, 
          department_id: dept ? dept.id : null // Backend will need to handle null if we send it
        })
      });

      setPetitions(prev => prev.filter(p => p.id !== id));
      toast.success("Petition approved and forwarded to officer! 🚀");
    } catch (err: any) {
      toast.error(err.message || "Failed to approve petition");
    }
  };

  const workloadData = stats?.departmentBreakdown ? Object.entries(stats.departmentBreakdown).map(([k, v], i) => ({
    name: t('dept_' + k),
    complaints: v,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  })) : [];

  const adminStats = [
    { label: t('total_petitions') || 'Total Petitions', value: dashboardStats.total_petitions, icon: FileText },
    { label: t('resolved_petitions') || 'Resolved Petitions', value: dashboardStats.resolved_petitions, icon: CheckCircle },
    { label: t('resolution_rate') || 'Resolution Rate (%)', value: `${dashboardStats.resolution_rate}%`, icon: TrendingUp },
    { label: t('avg_sla') || 'Average SLA (days)', value: dashboardStats.avg_sla_days, icon: Clock },
  ];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">{t('admin_dashboard_title')}</h1>
        <p className="text-sm text-muted-foreground">{t('admin_dashboard_subtitle')}</p>
      </div>

      {/* Admin stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {adminStats.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-heading font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* NEW: Hotspot Heatmap Section */}
      <Card className="overflow-hidden border-primary/20 shadow-lg">
        <CardHeader className="bg-primary/5 border-b py-3 px-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-heading font-bold">{t('petition_hotspots') || 'Live Petition Hotspots'}</CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Identifying high-complaint areas</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-background/50 border-primary/20 text-primary animate-pulse">LIVE ANALYSIS</Badge>
        </CardHeader>
        <CardContent className="p-0 h-[300px] relative">
          <MapContainer 
            center={[13.0827, 80.2707]} 
            zoom={12} 
            className="w-full h-full z-10"
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; ESRI World Street Map'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            />
            <HeatmapLayer 
              points={allPetitions
                .filter(p => p.location_lat && p.location_lng)
                .map(p => [parseFloat(p.location_lat), parseFloat(p.location_lng), 1.0])} 
            />
          </MapContainer>
          <div className="absolute bottom-4 left-4 z-[20] bg-background/95 p-2 rounded-lg border shadow-xl flex flex-col gap-1 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
             <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Critical Zone</div>
             <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-lime-500"></span> Active Issues</div>
          </div>
        </CardContent>
      </Card>

      {/* Workload chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">{t('dept_workload')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={workloadData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 25%, 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="complaints" radius={[6, 6, 0, 0]}>
                {workloadData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Petition management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-heading">{t('manage_petitions')}</CardTitle>
          <div className="flex bg-muted p-1 rounded-lg">
            <Button 
              variant={activeTab === 'pending' ? 'default' : 'ghost'} 
              size="sm" 
              className="h-7 text-xs px-3"
              onClick={() => setActiveTab('pending')}
            >
              {t('pending_review') || 'New Petitions'}
            </Button>
            <Button 
              variant={activeTab === 'reviewed' ? 'default' : 'ghost'} 
              size="sm" 
              className="h-7 text-xs px-3"
              onClick={() => setActiveTab('reviewed')}
            >
              {t('reviewed') || 'Verified'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {petitions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('no_petitions_found')}</p>
          ) : [...petitions].sort((a, b) => {
            const aBreached = a.status !== 'resolved' && (new Date().getTime() - new Date(a.created_at).getTime()) > 48 * 60 * 60 * 1000;
            const bBreached = b.status !== 'resolved' && (new Date().getTime() - new Date(b.created_at).getTime()) > 48 * 60 * 60 * 1000;
            if (aBreached && !bBreached) return -1;
            if (!aBreached && bBreached) return 1;
            return 0;
          }).map(pet => {
            const isSlaBreached = pet.status !== 'resolved' && (new Date().getTime() - new Date(pet.created_at).getTime()) > 48 * 60 * 60 * 1000;
            return (
              <div key={pet.id} className={`p-4 rounded-xl border space-y-3 ${isSlaBreached ? 'bg-destructive/5 border-destructive/50 shadow-sm shadow-destructive/20 relative' : 'bg-muted/30'}`}>

                {isSlaBreached && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="destructive" className="animate-pulse shadow-md border-white border text-xs font-bold tracking-wider">
                      🚨 RED ALERT - SLA BREACH
                    </Badge>
                  </div>
                )}

                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <span>{{ 'water': '💧', 'road': '🛣️', 'electricity': '⚡', 'sanitation': '🧹', 'healthcare': '🏥' }[pet.category] || '📋'}</span>
                          <span className="text-xs font-bold uppercase tracking-wider text-primary/60">{t('dept_' + pet.category)}</span>
                          <h3 className="text-base font-heading font-semibold ml-1">{pet.title}</h3>
                        </div>
                        {pet.ai_summary && (
                          <p className="text-sm text-primary italic font-medium mt-1 pl-6">
                            " {pet.ai_summary} "
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                          <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{String(pet.id).slice(0, 8)}...</span>
                          <span>·</span>
                          <span className="font-medium">{pet.citizen_name || 'Anonymous'}</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5 text-primary/70">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDistanceToNow(new Date(pet.created_at), { 
                              addSuffix: true,
                              locale: i18n.language === 'ta' ? ta : enUS 
                            })}
                          </span>
                          <span>·</span>
                          <span className="text-xs font-semibold text-muted-foreground/60 uppercase">
                            {format(new Date(pet.created_at), 'EEEE, dd MMM', { 
                              locale: i18n.language === 'ta' ? ta : enUS 
                            })}
                          </span>
                        </p>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <span>{{ 'water': '💧', 'road': '🛣️', 'electricity': '⚡', 'sanitation': '🧹', 'healthcare': '🏥' }[pet.category] || '📋'}</span>
                          {pet.title}
                        </DialogTitle>
                        <DialogDescription>
                          Full details for petition {pet.id}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid gap-4 py-4">
                        <div className="flex flex-wrap gap-4">
                          <Badge variant={pet.status === 'resolved' ? 'default' : pet.status === 'escalated' ? 'destructive' : 'secondary'}>
                            {t('status_' + pet.status) || pet.status}
                          </Badge>
                          <Badge variant="outline">{t('dept_' + pet.category)}</Badge>
                        </div>

                        <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="w-4 h-4 text-primary" />
                              <span className="font-semibold">{t('citizen_name_label') || 'Name'}:</span>
                              <span>{pet.citizen_name || 'Anonymous'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-primary underline">
                              <Mail className="w-4 h-4" />
                              <span className="font-semibold text-foreground">{t('citizen_email_label') || 'Email'}:</span>
                              <a href={`mailto:${pet.citizen_email}`}>{pet.citizen_email || 'N/A'}</a>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="font-semibold">{t('submission_date_label') || 'Submitted'}:</span>
                              <span>{new Date(pet.created_at).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-destructive" />
                              <span className="font-semibold">{t('location_label') || 'Location'}:</span>
                              <span>{pet.location_address || 'Not specified'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-sm font-bold flex items-center gap-1.5"><Info className="w-4 h-4" /> {t('description_label') || 'Description'}</h4>
                          {pet.ai_summary && (
                            <div className="text-xs bg-primary/5 p-2 rounded border border-primary/10 italic text-primary font-medium">
                              AI Summary: {pet.ai_summary}
                            </div>
                          )}
                          <div className="text-sm bg-muted/30 p-3 rounded-md whitespace-pre-wrap min-h-[100px] border">
                            {pet.description}
                          </div>
                        </div>

                        {/* AI Insights Section */}
                        <div className="p-4 rounded-xl border-2 border-primary/10 bg-primary/5">
                          <AIAnalysisReport
                            steps={pet.ai_analysis_report}
                            urgency={pet.ai_urgency}
                            fakeProb={pet.ai_fake_prob}
                            confidence={pet.ai_confidence}
                            keywords={pet.ai_keywords}
                            onReanalyze={() => handleReanalyze(pet.id)}
                            isReanalyzing={isReanalyzing === pet.id}
                          />
                        </div>


                        {pet.officer_remark && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-bold text-primary">{t('officer_remark_label') || 'Officer Remarks'}</h4>
                            <div className="text-sm bg-primary/5 p-3 rounded-md border border-primary/20 italic">
                              "{pet.officer_remark}"
                            </div>
                          </div>
                        )}

                        {pet.media_url && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-bold">{t('uploaded_media_label') || 'Uploaded Media'}</h4>
                            <div className="rounded-xl overflow-hidden border bg-muted/20">
                              {pet.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <img
                                  src={getMediaUrl(pet.media_url)}
                                  alt="Petition Media"
                                  className="w-full h-auto max-h-[400px] object-contain"
                                />
                              ) : (
                                <video
                                  src={getMediaUrl(pet.media_url)}
                                  controls
                                  className="w-full h-auto max-h-[400px]"
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="flex items-center gap-2">
                    {activeTab === 'pending' ? (
                      <Button 
                        size="sm" 
                        className="h-10 text-base font-semibold bg-green-600 hover:bg-green-700 px-4"
                        onClick={() => handleApprove(pet.id, pet.category)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        {t('approve_btn') || 'Approve & Forward'}
                      </Button>
                    ) : (
                      <>
                        <Badge variant={pet.status === 'resolved' ? 'default' : pet.status === 'escalated' ? 'destructive' : 'secondary'}>
                          {t('status_' + pet.status) || pet.status}
                        </Badge>
                        <Select value={pet.status} onValueChange={(val) => handleStatusChange(pet.id, val)} disabled={pet.status === 'resolved'}>
                          <SelectTrigger className="w-[150px] h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(STATUS_LABELS).map((k) => (
                              <SelectItem key={k} value={k}>{t('status_' + k)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Citizen Feedbacks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            Citizen Feedbacks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedbacks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No feedback received yet</p>
          ) : feedbacks.map(fb => (
            <div key={fb.id} className="p-3 rounded-xl border bg-yellow-50/30 border-yellow-200/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-3 h-3 ${s <= fb.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/20'}`} />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-tight">Rating: {fb.rating}/5</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(fb.created_at).toLocaleDateString()}</span>
              </div>
              <div>
                <p className="text-xs font-semibold">{fb.petition_title}</p>
                <p className="text-[10px] text-muted-foreground">Submitted by {fb.citizen_name}</p>
              </div>
              {fb.comment && (
                <p className="text-xs italic text-foreground/80 bg-white/50 p-2 rounded-lg border border-yellow-100">
                  "{fb.comment}"
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}


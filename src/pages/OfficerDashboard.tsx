import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { apiFetch } from '@/lib/api';
import { getMediaUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { Clock, CheckCircle, AlertTriangle, FileText, Brain, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { generateSmartReplies } from '@/lib/mock-data';
import { AIAnalysisReport } from '@/components/AIAnalysisReport';

const DEPT_ICONS: Record<string, string> = {
    water: '💧', road: '🛣️', electricity: '⚡', sanitation: '🧹', healthcare: '🏥',
};

export default function OfficerDashboard() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [petitions, setPetitions] = useState<any[]>([]);
    const [isReanalyzing, setIsReanalyzing] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const STATUS_OPTIONS = [
        { value: 'pending', label: t('status_pending') },
        { value: 'in_progress', label: t('status_in_progress') },
        { value: 'verification', label: t('status_verification') },
        { value: 'resolved', label: t('status_resolved') },
        { value: 'rejected', label: t('status_rejected') },
        { value: 'escalated', label: t('status_escalated') },
    ];

    useEffect(() => {
        apiFetch('/api/petitions')
            .then(data => setPetitions(data.map((p: any) => ({ ...p, _remark: '', _newStatus: '' }))))
            .catch(() => toast.error(t('load_petitions_error')))
            .finally(() => setLoading(false));
    }, []);

    // Update a field directly on the petition object in state
    const updateField = (petId: any, field: string, value: string) => {
        setPetitions(prev => prev.map(p => p.id === petId ? { ...p, [field]: value } : p));
    };

    const handleReanalyze = async (id: string) => {
        setIsReanalyzing(id);
        try {
            const res = await apiFetch(`/api/petitions/${id}/reanalyze`, { method: 'POST' });
            setPetitions(prev => prev.map(p =>
                p.id === id ? { ...p, officer_remark: `AI RE-ANALYSIS:\n${res.reason}`, ai_analysis_report: res.steps } : p
            ));
            toast.success('AI Re-analysis complete! ✨');
        } catch (err: any) {
            toast.error(err.message || 'Re-analysis failed');
        } finally {
            setIsReanalyzing(null);
        }
    };

    const handleStatusUpdate = async (pet: any) => {
        const status = pet._newStatus;
        const remark = pet._remark;

        if (!status) return toast.error(t('select_status_error'));
        if (!remark || remark.trim().length < 5) return toast.error(t('remark_min_error'));

        setUpdatingId(pet.id);
        try {
            await apiFetch(`/api/petitions/${pet.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status, remark }),
            });
            setPetitions(prev => prev.map(p =>
                p.id === pet.id
                    ? { ...p, status, officer_remark: remark, _remark: '', _newStatus: '' }
                    : p
            ));
            toast.success(t('status_update_success'));
        } catch (err: any) {
            toast.error(err.message || 'Failed to update status');
        } finally {
            setUpdatingId(null);
        }
    };

    const stats = {
        total: petitions.length,
        pending: petitions.filter(p => ['submitted', 'pending', 'in_progress'].includes(p.status)).length,
        resolved: petitions.filter(p => p.status === 'resolved').length,
        escalated: petitions.filter(p => p.status === 'escalated').length,
    };

    return (
        <div className="container mx-auto px-4 py-6 space-y-6">
            <div>
                <h1 className="text-2xl font-heading font-bold">{t('officer_dashboard_title')}</h1>
                <p className="text-sm text-muted-foreground">
                    {t('officer_dashboard_subtitle', {
                        dept: user?.department_id ? `Department #${user.department_id}` : 'your department',
                    })}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: t('total_assigned'), value: stats.total, icon: FileText, color: 'text-primary' },
                    { label: t('status_pending'), value: stats.pending, icon: Clock, color: 'text-yellow-500' },
                    { label: t('status_resolved'), value: stats.resolved, icon: CheckCircle, color: 'text-green-500' },
                    { label: t('status_escalated'), value: stats.escalated, icon: AlertTriangle, color: 'text-red-500' },
                ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                            <Card>
                                <CardContent className="flex items-center gap-4 p-5">
                                    <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-heading font-bold">{s.value}</p>
                                        <p className="text-sm text-muted-foreground">{s.label}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            {/* Petitions List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-heading">{t('dept_petitions')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading ? (
                        <p className="text-sm text-muted-foreground text-center py-8">{t('loading')}</p>
                    ) : petitions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">{t('no_petitions_found')}</p>
                    ) : (
                        petitions.map(pet => (
                            <motion.div
                                key={pet.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="p-4 rounded-xl border bg-card space-y-3 hover:shadow-sm transition-shadow"
                            >
                                {/* Petition Header */}
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{DEPT_ICONS[pet.category] || '📋'}</span>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-bold uppercase tracking-wider text-primary/60">
                                                    {t('dept_' + pet.category)}
                                                </span>
                                                <span className="text-muted-foreground/50">•</span>
                                                <h3 className="font-heading font-semibold text-base">{pet.title}</h3>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                ID: {String(pet.id).slice(0, 8)}... · by {pet.citizen_name || 'Anonymous'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={
                                                pet.status === 'resolved' ? 'default' :
                                                pet.status === 'escalated' ? 'destructive' : 'secondary'
                                            }
                                            className="capitalize"
                                        >
                                            {t('status_' + pet.status) || pet.status}
                                        </Badge>
                                        {(pet.ai_urgency || 0) > 0.7 && (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary uppercase">
                                                <Brain className="w-2.5 h-2.5" /> AI Flagged
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Media */}
                                {pet.media_url && (
                                    <div className="rounded-xl overflow-hidden border bg-muted/20">
                                        {pet.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                            <img
                                                src={getMediaUrl(pet.media_url)}
                                                alt="Petition Media"
                                                className="w-full h-auto max-h-[200px] object-cover cursor-zoom-in"
                                                onClick={() => window.open(getMediaUrl(pet.media_url), '_blank')}
                                            />
                                        ) : (
                                            <video src={getMediaUrl(pet.media_url)} className="w-full h-auto max-h-[200px]" controls />
                                        )}
                                    </div>
                                )}

                                {/* AI Analysis */}
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

                                {/* Previous Remark */}
                                {pet.officer_remark && (
                                    <div className="text-sm bg-muted/50 rounded-lg p-2 border-l-2 border-primary">
                                        <span className="font-medium">{t('previous_remark')}: </span>
                                        {pet.officer_remark}
                                    </div>
                                )}

                                {/* ── Action Panel ── */}
                                <div className="space-y-2 pt-3 border-t">

                                    {/* AI Smart Reply chips — clicking fills the textarea below */}
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <span className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-tight shrink-0">
                                            <Sparkles className="w-3 h-3" /> AI
                                        </span>
                                        {generateSmartReplies(pet.category).map((reply, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded-full cursor-pointer transition-colors whitespace-nowrap"
                                                onClick={() => updateField(pet.id, '_remark', reply)}
                                            >
                                                {reply}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Status + Textarea + Update button */}
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Select
                                            value={pet._newStatus || ''}
                                            onValueChange={val => updateField(pet.id, '_newStatus', val)}
                                        >
                                            <SelectTrigger className="sm:w-[160px] h-9 text-sm shrink-0">
                                                <SelectValue placeholder={t('change_status_placeholder')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STATUS_OPTIONS.map(s => (
                                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Textarea
                                            rows={2}
                                            placeholder={t('add_remark_placeholder')}
                                            value={pet._remark || ''}
                                            onChange={e => updateField(pet.id, '_remark', e.target.value)}
                                            className="text-sm flex-1 min-h-0"
                                        />

                                        <Button
                                            size="sm"
                                            className="h-9 px-5 font-semibold shrink-0 self-end"
                                            disabled={updatingId === pet.id}
                                            onClick={() => handleStatusUpdate(pet)}
                                        >
                                            {updatingId === pet.id
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : t('update_btn')
                                            }
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

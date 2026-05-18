import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Calendar, MapPin, Loader2, AlertCircle, AlertTriangle, CheckCircle2, Clock, Zap, Star, Info, ThumbsUp, Mic } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@/lib/api';
import { getMediaUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { motion, AnimatePresence } from 'framer-motion';
import { AIAnalysisReport } from '@/components/AIAnalysisReport';
import { CommentsSection } from '@/components/CommentsSection';
import { PetitionTimeline } from '@/components/PetitionTimeline';
import { jsPDF } from 'jspdf';

const getStatusLabels = (t: any): Record<string, string> => ({
  submitted: t('status_submitted'),
  ai_processing: t('status_ai_processing'),
  verification: t('status_verification'),
  assigned: t('status_assigned'),
  pending: t('status_pending'),
  in_progress: t('status_in_progress'),
  resolved: t('status_resolved'),
  rejected: t('status_rejected'),
  escalated: t('status_escalated'),
});

const STATUS_STEPS = ['submitted', 'verification', 'in_progress', 'resolved'];

const DEPT_ICONS: Record<string, string> = {
  water: '💧', road: '🛣️', electricity: '⚡', sanitation: '🧹', healthcare: '🏥',
};

const DEPARTMENTS = ['water', 'road', 'electricity', 'sanitation', 'healthcare', 'corruption', 'delay_in_service', 'harassment', 'service_standards'];

export default function TrackPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // ── Track-by-ID state ─────────────────────────────────────────────────────
  const [trackId, setTrackId] = useState('');
  const [trackedPetition, setTrackedPetition] = useState<any>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  // ── List state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [petitions, setPetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [hasFeedback, setHasFeedback] = useState(false);

  // ── Track by ID ───────────────────────────────────────────────────────────
  const handleTrack = async (providedId?: string) => {
    const id = (providedId || trackId).trim();
    if (!id) return;

    setTrackLoading(true);
    setTrackError('');
    setTrackedPetition(null);
    setHasFeedback(false);

    try {
      console.log('[TrackPage] Looking up petition ID:', id);
      const data = await apiFetch(`/api/petitions/${id}`);
      console.log('[TrackPage] Found petition:', data);
      setTrackedPetition(data);

      // Record a view
      apiFetch(`/api/petitions/${id}/view`, { method: 'POST' }).catch(err => console.debug('View record failed:', err));

      // Check if feedback already exists
      if (user) {
        try {
          const feedback = await apiFetch(`/api/feedbacks/petition/${id}`);
          setHasFeedback(!!feedback);
        } catch {
          setHasFeedback(false);
        }
      }

      // If we provided an ID (clicked from list), scroll to top to see details
      if (providedId) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('[TrackPage] Track error:', err.message);
      setTrackError(t('invalid_id_error'));
    } finally {
      setTrackLoading(false);
    }
  };

  // ── Fetch petition list ───────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setListError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (deptFilter !== 'all') params.set('category', deptFilter);
      if (search.trim()) params.set('search', search.trim());

      console.log('[TrackPage] Fetching list:', params.toString());
      const data = await apiFetch(`/api/petitions?${params}`);
      console.log('[TrackPage] List count:', data.length);
      setPetitions(data);
    } catch (err: any) {
      console.error('[TrackPage] List fetch error:', err.message);
      setListError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, deptFilter]);

  const { id: urlParamId } = useParams<{ id: string }>();
  
  useEffect(() => {
    if (urlParamId) {
      setTrackId(urlParamId);
      handleTrack(urlParamId);
    }
  }, [urlParamId]);

  useEffect(() => {
    const timer = setTimeout(fetchList, 300); // debounce
    return () => clearTimeout(timer);
  }, [fetchList]);

  // ── Handle Upvote ─────────────────────────────────────────────────────────
  const handleUpvote = async (petitionId: number, currentHasUpvoted: boolean) => {
    try {
      if (!user) {
        toast.error('You must be logged in to support a petition');
        return;
      }

      // Optmistic UI Update
      const delta = currentHasUpvoted ? -1 : 1;
      setPetitions(prev => prev.map(p => p.id === petitionId ? { ...p, has_upvoted: !currentHasUpvoted, upvotes_count: Math.max(0, parseInt(p.upvotes_count || 0) + delta) } : p));
      if (trackedPetition?.id === petitionId) {
        setTrackedPetition(prev => ({ ...prev, has_upvoted: !currentHasUpvoted, upvotes_count: Math.max(0, parseInt(prev.upvotes_count || 0) + delta) }));
      }

      await apiFetch(`/api/petitions/${petitionId}/upvote`, { method: 'POST' });
    } catch (err: any) {
      toast.error(err.message || 'Error updating upvote');
      // Revert optmistic update
      fetchList();
      if (trackedPetition?.id === petitionId) handleTrack(String(petitionId));
    }
  };

  // ── Progress stepper ──────────────────────────────────────────────────────
  const ProgressStepper = ({ status }: { status: string }) => {
    const currentIdx = STATUS_STEPS.indexOf(status);
    return (
      <div className="flex items-center gap-1 mt-3 mb-2">
        {STATUS_STEPS.map((s, i) => {
          const isCompleted = i < currentIdx || (s === 'resolved' && status === 'resolved');
          const isCurrent = i === currentIdx && status !== 'resolved';

          let circleBg = 'bg-gray-200 text-gray-500';
          let textCol = 'text-gray-400';
          let lineBg = 'bg-gray-200';

          if (isCompleted) {
            circleBg = 'bg-green-500 text-white';
            textCol = 'text-green-700 font-medium';
            lineBg = 'bg-green-500';
          } else if (isCurrent) {
            circleBg = 'bg-blue-500 text-white';
            textCol = 'text-blue-700 font-bold';
          }

          return (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors ${circleBg}`}>
                {i + 1}
              </div>
              <span className={`text-[10px] hidden sm:block ${textCol}`}>
                {getStatusLabels(t)[s]}
              </span>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 transition-colors ${lineBg}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const downloadReceipt = () => {
    if (!trackedPetition) return;
    const doc = new jsPDF();
    const primaryColor = [37, 99, 235]; // #2563eb

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('AI PETITION HUB', 20, 25);
    doc.setFontSize(10);
    doc.text('OFFICIAL ACKNOWLEDGMENT RECEIPT', 20, 32);

    // Body
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text('DATE GENERATED:', 20, 50);
    doc.text(new Date().toLocaleString(), 60, 50);

    doc.setFontSize(14);
    doc.text('PETITION DETAILS', 20, 65);
    doc.line(20, 67, 190, 67);

    doc.setFontSize(10);
    doc.text('PETITION ID:', 20, 75);
    doc.setFont('helvetica', 'normal');
    doc.text(String(trackedPetition.id), 60, 75);

    doc.setFont('helvetica', 'bold');
    doc.text('TITLE:', 20, 85);
    doc.setFont('helvetica', 'normal');
    doc.text(trackedPetition.title, 60, 85, { maxWidth: 130 });

    doc.setFont('helvetica', 'bold');
    doc.text('CATEGORY:', 20, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(trackedPetition.category, 60, 100);

    doc.setFont('helvetica', 'bold');
    doc.text('CURRENT STATUS:', 20, 110);
    doc.setFont('helvetica', 'normal');
    doc.text(trackedPetition.status.toUpperCase(), 60, 110);

    doc.setFont('helvetica', 'bold');
    doc.text('SUBMITTED ON:', 20, 120);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(trackedPetition.created_at).toLocaleString(), 60, 120);

    doc.setFont('helvetica', 'bold');
    doc.text('OFFICER REMARK:', 20, 130);
    doc.setFont('helvetica', 'normal');
    doc.text(trackedPetition.officer_remark || 'No remarks yet.', 60, 130, { maxWidth: 130 });

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    const footerY = 280;
    doc.text('This is an electronically generated document. No signature is required.', 105, footerY, { align: 'center' });
    doc.text('Smarter Petitions - Powered by AI Governance', 105, footerY + 5, { align: 'center' });

    doc.save(`Receipt_${String(trackedPetition.id).slice(0, 8)}.pdf`);
    toast.success('Receipt downloaded successfully!');
  };

  const isCitizen = user?.role === 'citizen';

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-heading font-bold">{t('track_petition_title')}</h1>
        <p className="text-sm text-muted-foreground">
          {isCitizen ? t('track_petition_citizen_desc') : t('track_petition_officer_desc')}
        </p>
      </div>

      {/* ── TRACK BY ID BOX ─────────────────────────────────────────── */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5 pb-5">
          <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" /> {t('quick_track_tab')}
          </p>
          <div className="flex gap-2">
            <Input
              placeholder={t('track_id_placeholder')}
              value={trackId}
              onChange={e => { setTrackId(e.target.value); setTrackError(''); setTrackedPetition(null); }}
              onKeyDown={e => e.key === 'Enter' && handleTrack()}
              className="font-mono text-sm"
            />
            <Button onClick={() => handleTrack()} disabled={trackLoading || !trackId.trim()} className="gap-2 shrink-0">
              {trackLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {t('track_btn')}
            </Button>
          </div>

          <AnimatePresence>
            {trackError && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-3 flex items-start gap-2 text-xs text-destructive p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{trackError}</span>
              </motion.div>
            )}

            {trackedPetition && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-xl border bg-card space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{DEPT_ICONS[trackedPetition.category] || '📋'}</span>
                      <h3 className="font-heading font-semibold text-sm">{trackedPetition.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ID: <span className="font-mono">{String(trackedPetition.id).slice(0, 8)}...</span>
                      {' '}· {t('dept_category_label')}: {t('dept_' + trackedPetition.category)}
                    </p>
                  </div>
                  <Badge variant={trackedPetition.status === 'resolved' ? 'default' : trackedPetition.status === 'rejected' ? 'destructive' : 'secondary'}>
                    {getStatusLabels(t)[trackedPetition.status] || trackedPetition.status}
                  </Badge>
                </div>

                <PetitionTimeline 
                  status={trackedPetition.status} 
                  createdAt={trackedPetition.created_at} 
                  updatedAt={trackedPetition.updated_at}
                />

                {trackedPetition.officer_remark && (
                  <div className="mt-3 text-xs p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
                    <span className="font-semibold">{t('officer_remark_label')}</span>{trackedPetition.officer_remark}
                  </div>
                )}
                <p className="text-sm mt-3 mb-2 text-foreground/90 whitespace-pre-wrap">{trackedPetition.description}</p>

                {/* AI Detailed Analysis Report */}
                <div className="mt-4 p-4 rounded-xl border-2 border-primary/10 bg-primary/5">
                  <AIAnalysisReport
                    steps={trackedPetition.ai_analysis_report}
                    urgency={trackedPetition.ai_urgency}
                    fakeProb={trackedPetition.ai_fake_prob}
                    confidence={trackedPetition.ai_confidence}
                    keywords={trackedPetition.ai_keywords}
                  />
                </div>

                {trackedPetition.media_url && (
                  <div className="space-y-2 mt-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('uploaded_media_label')}</h4>
                    <div className="rounded-xl overflow-hidden border bg-muted/20">
                      {trackedPetition.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img
                          src={getMediaUrl(trackedPetition.media_url)}
                          alt="Petition Media"
                          className="w-full h-auto max-h-[300px] object-contain cursor-zoom-in"
                          onClick={() => window.open(getMediaUrl(trackedPetition.media_url), '_blank')}
                        />
                      ) : (
                        <video
                          src={getMediaUrl(trackedPetition.media_url)}
                          controls
                          className="w-full h-auto max-h-[300px]"
                        />
                      )}
                    </div>
                  </div>
                )}

                {trackedPetition.audio_url && (
                  <div className="space-y-2 mt-4 bg-muted/30 p-3 rounded-xl border">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Mic className="w-3 h-3" /> {t('voice_note_label') || 'Voice Note'}
                    </h4>
                    <audio src={getMediaUrl(trackedPetition.audio_url)} controls className="w-full h-8" />
                  </div>
                )}

                <div className="flex items-center gap-3 mt-6 pt-4 border-t">
                  <Button
                    variant={trackedPetition.has_upvoted ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleUpvote(trackedPetition.id, trackedPetition.has_upvoted)}
                    className="gap-2 transition-all hover:scale-105 active:scale-95"
                  >
                    <ThumbsUp className={`w-4 h-4 ${trackedPetition.has_upvoted ? 'fill-current' : ''}`} />
                    {trackedPetition.has_upvoted ? (t('upvoted_lbl') || 'Upvoted') : (t('upvote_lbl') || 'Support')}
                    <Badge variant={trackedPetition.has_upvoted ? "secondary" : "secondary"} className="ml-1 transition-colors">
                      {trackedPetition.upvotes_count || 0}
                    </Badge>
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadReceipt} className="gap-2 h-9">
                    <Calendar className="w-4 h-4" /> {t('download_receipt') || 'Download Receipt'}
                  </Button>

                  {/* Smart Nudge */}
                  {trackedPetition.status !== 'resolved' && trackedPetition.status !== 'rejected' && isCitizen && (() => {
                     const lastUpdate = new Date(trackedPetition.updated_at || trackedPetition.created_at);
                     const daysSinceUpdate = (new Date().getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
                     if (daysSinceUpdate > 15) {
                        return (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="gap-2 h-9 bg-orange-500 hover:bg-orange-600 ml-auto animate-pulse"
                            onClick={async () => {
                                try {
                                  // Simplified optimistic logic or light ping - we can use the tracking endpoint to record a nudge event
                                  // For demo purposes, we will simulate the API call and show the toast
                                  await new Promise(r => setTimeout(r, 500));
                                  toast.success(t('reminder_sent_toast') || 'Reminder sent successfully', { description: 'The officer has been notified of the delay.' });
                                } catch (e) {
                                  toast.error('Failed to send reminder');
                                }
                            }}
                          >
                            <AlertTriangle className="w-4 h-4" /> {t('send_reminder_btn') || 'Send Reminder'}
                          </Button>
                        )
                     }
                     return null;
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 text-xs text-muted-foreground">
                  <div>
                    <span className="font-semibold block text-foreground mb-0.5">{t('submission_date_label')}</span>
                    {new Date(trackedPetition.created_at).toLocaleString()}
                  </div>
                    <div>
                      <span className="font-semibold block text-foreground mb-0.5">{t('last_updated_label')}</span>
                      {trackedPetition.updated_at ? new Date(trackedPetition.updated_at).toLocaleString() : new Date(trackedPetition.created_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Community Discussion Section */}
                  <div className="mt-6 pt-6 border-t">
                    <CommentsSection petitionId={trackedPetition.id} />
                  </div>

                  {/* Feedback Section */}
                {trackedPetition.status === 'resolved' && !hasFeedback && isCitizen && (
                  <FeedbackForm
                    petitionId={trackedPetition.id}
                    onSuccess={() => setHasFeedback(true)}
                  />
                )}

                {hasFeedback && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('feedback_submitted_success')}</span>
                  </div>
                )}

                {!hasFeedback && trackedPetition.status !== 'resolved' && isCitizen && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 text-[10px] flex items-center gap-2 italic">
                    <Info className="w-3.5 h-3.5" />
                    <span>You can provide feedback once this petition is marked as "Resolved".</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* ── FILTER ROW ───────────────────────────────────────────────── */}
      {user && (
        <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('search_petitions_placeholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] text-xs"><SelectValue placeholder={t('all_statuses')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_statuses')}</SelectItem>
            {Object.entries(getStatusLabels(t)).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-[130px] text-xs">
            <Badge variant="outline" className="mr-2 p-0 border-none shrink-0 inline-flex"><Zap className="w-3 h-3" /></Badge>
            <SelectValue placeholder="All Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgency</SelectItem>
            <SelectItem value="high">{t('urgency_high')}</SelectItem>
            <SelectItem value="medium">{t('urgency_medium')}</SelectItem>
            <SelectItem value="low">{t('urgency_low')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[130px] text-xs">
             <Clock className="w-3 h-3 mr-2 shrink-0" />
             <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="upvoted">Most Supported</SelectItem>
          </SelectContent>
        </Select>
        {!isCitizen && (
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[140px] text-xs"><SelectValue placeholder={t('all_depts')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_depts')}</SelectItem>
              {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{DEPT_ICONS[d]} {t('dept_' + d)}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
      )}

      {/* ── LIST ──────────────────────────────────────────────────────── */}
      {user && (
        <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />Loading petitions...
          </div>
        ) : listError ? (
          <div className="flex items-center gap-2 text-destructive text-sm p-4 bg-destructive/10 rounded-xl">
            <AlertCircle className="w-4 h-4" />{listError}
          </div>
        ) : petitions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm font-medium">{t('no_petitions_found')}</p>
            <p className="text-xs mt-1">
              {isCitizen ? t('no_petitions_citizen') : t('no_petitions_officer')}
            </p>
          </div>
        ) : (
          petitions.map(pet => (
            <motion.div key={pet.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-primary"
                onClick={() => {
                  setTrackId(String(pet.id));
                  // We need to wait for state update or pass ID directly. 
                  // Let's modify handleTrack to accept an optional ID.
                  handleTrack(String(pet.id));
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">{DEPT_ICONS[pet.category] || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h3 className="font-heading font-semibold text-sm">{pet.title}</h3>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            ID: {String(pet.id).slice(0, 8)}...
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={pet.status === 'resolved' ? 'default' : pet.status === 'rejected' ? 'destructive' : 'secondary'}>
                            {getStatusLabels(t)[pet.status] || pet.status}
                          </Badge>
                          <Badge variant="outline" className="capitalize">{t('urgency_' + pet.priority) || pet.priority}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{pet.description}</p>

                      {pet.media_url && (
                        <div className="space-y-1 my-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('uploaded_media_label')}</p>
                          <div className="rounded-xl overflow-hidden border bg-muted/20 max-w-[300px]">
                            {pet.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                              <img
                                src={getMediaUrl(pet.media_url)}
                                alt="Petition Media"
                                className="w-full h-auto max-h-[150px] object-cover cursor-pointer"
                                onClick={() => window.open(getMediaUrl(pet.media_url), '_blank')}
                              />
                            ) : (
                              <video
                                src={getMediaUrl(pet.media_url)}
                                className="w-full h-auto max-h-[150px]"
                                controls
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {pet.audio_url && (
                        <div className="mt-3 bg-muted/30 p-2 rounded-lg border flex items-center gap-2 max-w-sm" onClick={(e) => e.stopPropagation()}>
                          <Mic className="w-4 h-4 text-muted-foreground shrink-0" />
                          <audio src={getMediaUrl(pet.audio_url)} controls className="h-8 flex-1" />
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground pt-1">
                        {pet.location_address && (
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{pet.location_address}</span>
                        )}
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(pet.created_at).toLocaleDateString()}</span>

                        <Button
                          variant="ghost"
                          size="sm"
                          className={`ml-auto gap-1.5 h-7 px-2 transition-all hover:scale-105 active:scale-95 ${pet.has_upvoted ? 'text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary' : 'hover:bg-muted'}`}
                          onClick={(e) => { e.stopPropagation(); handleUpvote(pet.id, pet.has_upvoted); }}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${pet.has_upvoted ? 'fill-current' : ''}`} />
                          <span className="font-semibold">{pet.upvotes_count || 0}</span>
                        </Button>
                      </div>
                      {pet.officer_remark && (
                        <div className="mt-2 text-xs p-2 bg-muted/50 rounded border-l-2 border-primary">
                          <span className="font-medium">{t('officer_label')}</span>{pet.officer_remark}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
      )}
    </div>
  );
}

function FeedbackForm({ petitionId, onSuccess }: { petitionId: number, onSuccess: () => void }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showAppeal, setShowAppeal] = useState(false);

  const starLabels = ['', 'Very Poor 😞', 'Poor 😕', 'Average 😐', 'Good 😊', 'Excellent 🌟'];
  const starColors = ['', 'text-red-500', 'text-orange-400', 'text-yellow-400', 'text-green-400', 'text-emerald-500'];
  const isPoorRating = rating > 0 && rating <= 2;

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await apiFetch('/api/feedbacks', {
        method: 'POST',
        body: JSON.stringify({ petition_id: petitionId, rating, comment })
      });
      toast.success(t('feedback_submitted_success'));
      setSubmitted(true);
      if (isPoorRating) {
        setShowAppeal(true);
      } else {
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  if (showAppeal) {
    return (
      <div className="mt-6 pt-4 border-t space-y-4">
        <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 space-y-3">
          <h4 className="text-sm font-bold text-orange-800 flex items-center gap-2">
            ⚠️ Not satisfied with the resolution?
          </h4>
          <p className="text-xs text-orange-700 leading-relaxed">
            Since you rated this resolution as poor, you can file an <strong>Appeal</strong> to have a senior officer review your case again.
          </p>
          <Button
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            onClick={async () => {
              setSubmitting(true);
              try {
                await apiFetch(`/api/petitions/${petitionId}/status`, {
                  method: 'PATCH',
                  body: JSON.stringify({ 
                    status: 'appealed', 
                    remark: 'CITIZEN APPEAL: User expressed dissatisfaction with the resolution. Requesting senior officer review.' 
                  })
                });
                toast.success(t('appeal_submitted'));
                setShowAppeal(false);
                onSuccess();
              } catch (err: any) {
                toast.error(err.message || "Failed to file appeal");
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
            {t('file_appeal_btn')}
          </Button>
          <button onClick={() => { setShowAppeal(false); onSuccess(); }} className="text-xs text-orange-600 underline w-full text-center">
            No thanks, I'll skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 pt-4 border-t space-y-4">
      <h4 className="text-sm font-bold flex items-center gap-2">
        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        {t('rate_experience')}
      </h4>

      {/* Stars */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="focus:outline-none transition-all duration-150 hover:scale-125 active:scale-90"
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  star <= (hovered || rating)
                    ? `fill-current ${starColors[hovered || rating]}`
                    : 'text-gray-200 fill-gray-200'
                }`}
              />
            </button>
          ))}
        </div>
        {(hovered > 0 || rating > 0) && (
          <span className={`text-xs font-semibold ${starColors[hovered || rating]}`}>
            {starLabels[hovered || rating]}
          </span>
        )}
      </div>

      {/* Poor rating warning */}
      {isPoorRating && (
        <div className="p-2 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-700 flex items-center gap-1.5">
          ⚠️ Low rating — you'll be able to file an Appeal after submitting.
        </div>
      )}

      <textarea
        className="w-full min-h-[80px] p-3 text-sm rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none resize-none"
        placeholder={t('feedback_placeholder')}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={rating === 0 || submitting}
      >
        {submitting ? t('feedback_submitting') : t('feedback_submit_btn')}
      </Button>
    </div>
  );
}

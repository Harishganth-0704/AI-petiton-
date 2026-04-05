import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Brain, Target, ShieldAlert, Zap, AlertTriangle, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';

interface AIStep {
    name: string;
    passed: boolean;
    detail: string;
}

interface AIAnalysisReportProps {
    steps: AIStep[] | string | null;
    urgency?: number;
    fakeProb?: number;
    confidence?: number;
    keywords?: string[];
    onReanalyze?: () => Promise<void>;
    isReanalyzing?: boolean;
}

export const AIAnalysisReport: React.FC<AIAnalysisReportProps> = ({
    steps, urgency, fakeProb, confidence, keywords, onReanalyze, isReanalyzing
}) => {
    let parsedSteps: AIStep[] = [];

    if (Array.isArray(steps)) {
        parsedSteps = steps;
    } else if (typeof steps === 'string') {
        try {
            parsedSteps = JSON.parse(steps);
        } catch {
            parsedSteps = [];
        }
    }

    const getUrgencyColor = (score: number) => {
        if (score > 0.8) return 'text-destructive';
        if (score > 0.4) return 'text-warning';
        return 'text-primary';
    };

    const getUrgencyBg = (score: number) => {
        if (score > 0.8) return 'bg-destructive/10';
        if (score > 0.4) return 'bg-warning/10';
        return 'bg-primary/10';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="text-sm font-bold flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    AI Verification Report
                </h4>
                {onReanalyze && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] gap-1.5 hover:bg-primary/5 hover:text-primary transition-all"
                        onClick={onReanalyze}
                        disabled={isReanalyzing}
                    >
                        {isReanalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Re-analyze
                    </Button>
                )}
            </div>

            {/* High-level metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {urgency !== undefined && (
                    <div className={`p-3 rounded-xl border ${getUrgencyBg(urgency)} space-y-1`}>
                        <p className="text-[9px] uppercase font-bold tracking-wider opacity-60">Urgency</p>
                        <div className="flex items-end justify-between">
                            <p className={`text-lg font-bold leading-none ${getUrgencyColor(urgency)}`}>
                                {(urgency * 100).toFixed(0)}%
                            </p>
                            <Zap className={`w-4 h-4 ${getUrgencyColor(urgency)}`} />
                        </div>
                    </div>
                )}
                {fakeProb !== undefined && (
                    <div className={`p-3 rounded-xl border ${fakeProb > 0.5 ? 'bg-destructive/10 border-destructive/20' : 'bg-green-50/50 border-green-200/50'} space-y-1`}>
                        <p className="text-[9px] uppercase font-bold tracking-wider opacity-60">Fake Prob.</p>
                        <div className="flex items-end justify-between">
                            <p className={`text-lg font-bold leading-none ${fakeProb > 0.5 ? 'text-destructive' : 'text-green-600'}`}>
                                {(fakeProb * 100).toFixed(0)}%
                            </p>
                            {fakeProb > 0.5 ? <ShieldAlert className="w-4 h-4 text-destructive" /> : <Target className="w-4 h-4 text-green-600" />}
                        </div>
                    </div>
                )}
                {confidence !== undefined && (
                    <div className="p-3 rounded-xl border bg-muted/30 space-y-1">
                        <p className="text-[9px] uppercase font-bold tracking-wider opacity-60">Confidence</p>
                        <p className="text-lg font-bold leading-none">{(confidence * 100).toFixed(0)}%</p>
                    </div>
                )}
                <div className="p-3 rounded-xl border bg-muted/10 space-y-1 hidden sm:block">
                    <p className="text-[9px] uppercase font-bold tracking-wider opacity-60">Verified</p>
                    <p className="text-lg font-bold leading-none">{parsedSteps.filter(s => s.passed).length}/4</p>
                </div>
            </div>

            {/* Step-by-step list */}
            {parsedSteps.length > 0 ? (
                <div className="space-y-2">
                    {parsedSteps.map((step, idx) => (
                        <motion.div
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            key={step.name}
                            className={`flex items-start gap-3 p-3 rounded-xl border-l-4 transition-colors ${step.passed ? 'bg-green-50/30 border-l-green-500 border-green-100/50' : 'bg-destructive/5 border-l-destructive border-destructive/10'}`}
                        >
                            <div className="mt-0.5 shrink-0">
                                {step.passed ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-destructive" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold leading-none">{step.name}</p>
                                    <p className={`text-[9px] font-bold uppercase tracking-tight py-0.5 px-1.5 rounded-full ${step.passed ? 'bg-green-100 text-green-700' : 'bg-destructive/20 text-destructive'}`}>
                                        {step.passed ? 'PASSED' : 'FAILED'}
                                    </p>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 group-hover:line-clamp-none transition-all">
                                    {step.detail}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center border-2 border-dashed rounded-2xl bg-muted/10">
                    <AlertTriangle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">No detailed analysis report available.</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Submit a new petition or use Re-analyze to generate insights.</p>
                </div>
            )}

            {keywords && keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                    {keywords.map(kw => (
                        <Badge key={kw} variant="secondary" className="text-[9px] font-bold bg-primary/5 text-primary hover:bg-primary/10 border-primary/20">
                            #{kw}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
};

import React from 'react';
import { CheckCircle2, Circle, Clock, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface TimelineStep {
  id: string;
  label: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  date?: string;
}

export function PetitionTimeline({ status, createdAt, updatedAt }: { status: string, createdAt: string, updatedAt?: string }) {
  const { t } = useTranslation();

  const getSteps = (): TimelineStep[] => {
    const steps: TimelineStep[] = [
      {
        id: 'submitted',
        label: t('status_submitted'),
        description: 'Successfully received by the system.',
        status: 'completed',
        date: createdAt
      },
      {
        id: 'verification',
        label: t('status_verification'),
        description: 'AI and Administration are verifying the details.',
        status: status === 'submitted' ? 'current' : 'completed',
        date: status !== 'submitted' ? updatedAt : undefined
      },
      {
        id: 'assigned',
        label: t('status_assigned'),
        description: 'Assigned to the relevant department for action.',
        status: ['submitted', 'verification', 'ai_processing'].includes(status) ? 'upcoming' : 
                ['assigned', 'pending'].includes(status) ? 'current' : 'completed',
        date: !['submitted', 'verification', 'ai_processing', 'assigned', 'pending'].includes(status) ? updatedAt : undefined
      },
      {
        id: 'in_progress',
        label: t('status_in_progress'),
        description: 'Officers are actively working on the resolution.',
        status: ['resolved', 'rejected'].includes(status) ? 'completed' : 
                status === 'in_progress' ? 'current' : 'upcoming',
        date: ['resolved', 'rejected'].includes(status) ? updatedAt : undefined
      },
      {
        id: 'resolved',
        label: status === 'rejected' ? t('status_rejected') : t('status_resolved'),
        description: status === 'rejected' ? 'This petition could not be fulfilled.' : 'The issue has been successfully addressed.',
        status: ['resolved', 'rejected'].includes(status) ? 'completed' : 'upcoming',
        date: ['resolved', 'rejected'].includes(status) ? updatedAt : undefined
      }
    ];

    return steps;
  };

  const steps = getSteps();

  return (
    <div className="py-6 px-2">
      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/20 before:via-primary/50 before:to-primary/20">
        {steps.map((step, idx) => (
          <motion.div 
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
          >
            {/* Dot */}
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 
              ${step.status === 'completed' ? 'bg-primary text-white' : 
                step.status === 'current' ? 'bg-background border-primary text-primary animate-pulse' : 
                'bg-muted text-muted-foreground'}`}
            >
              {step.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : 
               step.status === 'current' ? <Loader2 className="w-5 h-5 animate-spin" /> : 
               <Circle className="w-4 h-4 fill-current" />}
            </div>

            {/* Content Card */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-card shadow-sm group-hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between space-x-2 mb-1">
                <div className="font-bold text-foreground text-sm">{step.label}</div>
                {step.date && (
                  <time className="font-mono text-[10px] text-muted-foreground">
                    {new Date(step.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </time>
                )}
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed italic">
                {step.description}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

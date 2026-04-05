import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import PublicStats from '@/components/PublicStats';
import { ArrowRight, ShieldCheck, Sparkles, Globe, Heart } from 'lucide-react';

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-primary/5">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-primary to-blue-400 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-xl font-black font-heading tracking-tight">
              Civic<span className="text-primary">Harmony</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="font-bold">{t('login_btn')}</Button>
            </Link>
            <Link to="/register">
              <Button className="font-bold px-6 rounded-full shadow-lg shadow-primary/10 transition-all hover:scale-105 active:scale-95">
                {t('register_btn')}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
         {/* Background Orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px] -z-10" />
        <div className="absolute top-1/2 -right-20 w-96 h-96 bg-blue-400/10 rounded-full blur-[120px] -z-10" />

        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-8"
          >
            <Sparkles className="w-4 h-4" />
            Empowering Citizens with AI Technology
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black font-heading tracking-tight mb-8 leading-[1.1]"
          >
            Your Voice for a <br />
            <span className="bg-gradient-to-r from-primary via-blue-500 to-emerald-500 bg-clip-text text-transparent">
              Better Community
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Submit grievances, track resolutions in real-time, and witness the growth of your neighborhood through our transparent, AI-driven platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link to="/register">
              <Button size="lg" className="h-14 px-10 rounded-full text-lg font-bold gap-3 shadow-2xl shadow-primary/20 group">
                Join the Movement
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/map">
              <Button size="lg" variant="outline" className="h-14 px-10 rounded-full text-lg font-bold border-2 transition-all hover:bg-muted/50">
                Explore Issue Map
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Dashboard Section */}
      <section className="bg-white/50 py-24 border-y border-primary/5">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
             <div className="flex flex-col items-center text-center mb-16 space-y-4">
              <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20 px-4 py-1">
                LIVE TRANSPARENCY
              </Badge>
              <h2 className="text-3xl md:text-5xl font-black font-heading tracking-tight">
                Real-Time Impact Tracker
              </h2>
              <p className="text-muted-foreground">
                Witness clearly as our departments work towards a resolved and balanced community.
              </p>
            </div>

            <PublicStats />
          </div>
        </div>
      </section>

      {/* Feature Tiles */}
      <section className="py-24 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Globe}
              title="Multi-Language Support"
              desc="Communicate in 5 local languages including Tamil, Hindi, and Kannada for effortless submission."
            />
             <FeatureCard
              icon={Sparkles}
              title="AI-Powered Routing"
              desc="Our intelligent systems automatically categorize and route your grievances to the correct officials instantly."
            />
             <FeatureCard
              icon={Heart}
              title="Resolved with Smile"
              desc="Stay updated with real-time tracking from 'Submitted' to 'Resolved' with photo-proof documentation."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t text-center">
        <div className="container mx-auto px-6">
           <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-lg font-black font-heading tracking-tight">
              Civic<span className="text-primary">Harmony</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Civic Harmony Portal. Built for the citizens, by the people.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: any) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="p-8 rounded-[2rem] bg-white border border-primary/5 shadow-sm space-y-4 text-center hover:shadow-xl transition-all duration-300"
    >
      <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold font-heading">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {desc}
      </p>
    </motion.div>
  );
}

function Badge({ children, className }: any) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest rounded-full border ${className}`}>
      {children}
    </span>
  );
}

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo.png';
import PublicStats from '@/components/PublicStats';
import PageTransition from '@/components/PageTransition';
import { ArrowRight, ShieldCheck, Sparkles, Globe, Heart, Brain, Trophy, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <PageTransition className="min-h-screen bg-background selection:bg-primary/20">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-primary/5">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 shadow-md border border-muted/20">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-black font-heading tracking-tight">
              AI <span className="text-primary">Petition Hub</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="font-bold">{t('login_btn')}</Button>
            </Link>
            <Link to="/register">
              <Button className="font-bold px-6 rounded-full shadow-lg shadow-primary/10 transition-all hover:scale-105 active:scale-95 bg-[#0D3B40] hover:bg-[#072427]">
                {t('register_btn')}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden bg-[#fafdfd]">
         {/* Background Orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px] -z-10" />
        <div className="absolute top-1/2 -right-20 w-96 h-96 bg-blue-400/10 rounded-full blur-[120px] -z-10" />

        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-8"
          >
            <Sparkles className="w-4 h-4" />
            AI-Driven Public Grievance Intelligence
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-6xl md:text-8xl font-black font-heading tracking-tight mb-8 leading-[1.0] text-[#0D3B40]"
          >
            Empowering Your <br />
            <span className="bg-gradient-to-r from-orange-500 via-primary to-blue-500 bg-clip-text text-transparent">
              Civic Voice
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg text-muted-foreground/80 max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
          >
            Welcome to the Hub. Submit grievances with AI Vision, track resolutions in real-time, and earn rewards as a community hero.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link to="/register">
              <Button size="lg" className="h-16 px-12 rounded-full text-lg font-black gap-3 shadow-2xl shadow-primary/20 group bg-primary">
                Get Started
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/map">
              <Button size="lg" variant="outline" className="h-16 px-12 rounded-full text-lg font-black border-2 transition-all hover:bg-white hover:shadow-xl">
                Explore The Map
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Dashboard Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="bg-white py-24 border-y border-primary/5"
      >
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
             <div className="flex flex-col items-center text-center mb-16 space-y-4">
              <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/10 border-blue-500/20 px-4 py-1">
                LIVE TRANSPARENCY
              </Badge>
              <h2 className="text-3xl md:text-5xl font-black font-heading tracking-tighter text-[#0D3B40]">
                Real-Time Impact Tracker
              </h2>
              <p className="text-muted-foreground font-medium">
                Transparently monitoring every resolution across the city.
              </p>
            </div>

            <PublicStats />
          </div>
        </div>
      </motion.section>

      {/* Feature Tiles */}
      <section className="py-24 overflow-hidden bg-[#fafdfd]">
        <div className="container mx-auto px-6">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.2 }
              }
            }}
            className="grid md:grid-cols-3 gap-8"
          >
            <FeatureCard
              icon={Brain}
              title="AI Vision Analysis"
              desc="Our advanced AI reads your photos to verify evidence automatically, ensuring zero spam and high authenticity."
            />
             <FeatureCard
              icon={Trophy}
              title="Community Hero System"
              desc="Earn points and badges like Gold Volunteer or Civic Hero as you help solve real problems in your neighborhood."
            />
             <FeatureCard
              icon={CheckCircle}
              title="Official AI Responses"
              desc="Officials use AI-assisted tools to respond faster and more professionally to every concern you submit."
            />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t bg-[#0D3B40] text-white">
        <div className="container mx-auto px-6">
           <div className="flex flex-col items-center text-center space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-xl">
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-2xl font-black font-heading tracking-tight">
                AI <span className="text-primary">Petition Hub</span>
              </span>
            </div>
            
            <p className="text-white/60 max-w-sm text-sm font-medium">
              Transforming citizen-government engagement through intelligent, transparent technology.
            </p>
            
            <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-white/40">
              <Link to="/login" className="hover:text-white transition-colors">Login</Link>
              <Link to="/register" className="hover:text-white transition-colors">Register</Link>
              <Link to="/map" className="hover:text-white transition-colors">Live Map</Link>
            </div>

            <p className="text-[10px] text-white/20 font-bold uppercase tracking-[0.2em] pt-8 border-t border-white/5 w-full">
              © {new Date().getFullYear()} AI Petition Hub. Built for the future of governance.
            </p>
          </div>
        </div>
      </footer>
    </PageTransition>
  );
}

function FeatureCard({ icon: Icon, title, desc }: any) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
      }}
      whileHover={{ y: -10, scale: 1.02 }}
      className="p-8 rounded-[2rem] glass-card space-y-4 text-center transition-all duration-300"
    >
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6 shadow-inner">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-black font-heading text-[#0D3B40] uppercase tracking-tighter">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed font-medium">
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

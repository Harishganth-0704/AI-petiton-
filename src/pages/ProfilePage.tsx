import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, Globe, Shield, Trophy, Settings, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-8">
      <div className="flex flex-col items-center text-center space-y-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-24 h-24 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center p-1"
        >
          <div className="w-full h-full rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl font-heading font-bold shadow-lg">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <motion.div 
            initial={{ rotate: -20, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border-2 border-background shadow-sm"
          >
            Level {Math.floor((user.points || 0) / 100) + 1}
          </motion.div>
        </motion.div>
        
        <div className="space-y-1">
          <h1 className="text-2xl font-black font-heading tracking-tight">{user.name}</h1>
          <Badge variant="outline" className="uppercase font-bold tracking-widest text-[10px] bg-primary/5">
            {t('role_' + user.role)}
          </Badge>
        </div>
      </div>

      {/* Stats Table */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-none shadow-none">
          <CardContent className="pt-6 text-center space-y-2">
            <Trophy className="w-6 h-6 text-primary mx-auto" />
            <div className="text-2xl font-heading font-black">{user.points || 0}</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Citizen Points</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-none shadow-none">
          <CardContent className="pt-6 text-center space-y-2">
            <Shield className="w-6 h-6 text-primary mx-auto" />
            <div className="text-2xl font-heading font-black">{user.role === 'citizen' ? 'Verified' : 'Active'}</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Account Status</p>
          </CardContent>
        </Card>
      </div>

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest font-heading flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> {t('profile_details_label') || 'Account Details'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all group">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Internal Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase">{t('edit')}</Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all group">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('phone_label')}</p>
                <p className="text-sm font-medium">{user.phone || 'Not provided'}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase">{t('edit')}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest font-heading flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" /> {t('preferences_label') || 'Preferences'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-bold leading-none">{t('language_label')}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Change your interface language</p>
              </div>
            </div>
            <div className="flex gap-2">
              {['en', 'ta', 'hi'].map((l) => (
                <Button
                  key={l}
                  variant={i18n.language === l ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLanguageChange(l)}
                  className="w-10 h-7 p-0 text-[10px] font-bold uppercase"
                >
                  {l}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full border-dashed text-muted-foreground hover:text-destructive hover:border-destructive hover:bg-destructive/5 transition-all h-12 text-sm font-bold uppercase tracking-widest">
        Deactivate Account
      </Button>
    </div>
  );
}

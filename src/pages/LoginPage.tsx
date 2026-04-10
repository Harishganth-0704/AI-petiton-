import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Loader2, AlertCircle, UserX, Eye, EyeOff, Mail, Phone, Shield, Briefcase, User, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import logo from '@/assets/logo.png';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isNotFound, setIsNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'email' | 'phone'>('email');
  const [selectedRole, setSelectedRole] = useState<'citizen' | 'officer' | 'admin'>('citizen');

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'email' | 'phone');
    setEmail(''); // Clear input when switching tabs
    setError('');
    setIsNotFound(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsNotFound(false);
    setIsSubmitting(true);

    // Basic identifier validation (email or phone)
    if (!email && !password) {
      setError(t('login_error_empty'));
      setIsSubmitting(false);
      return;
    }

    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.ok) {
      toast.success(t('login_success'));
      // Redirect based on role (login stores user before returning)
      const role = result.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'officer') navigate('/officer');
      else navigate('/');
    } else {
      // Check for "account not found" to show redirect CTA
      if (result.notFound) {
        setIsNotFound(true);
        setError(t('login_error_not_found'));
        toast.error(t('login_error_not_found'));
      } else {
        setError(result.message || t('login_error_invalid_credentials'));
        toast.error(t('login_failed'), { description: result.message });
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gov-gradient-light relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="dark" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-white mx-auto flex items-center justify-center shadow-lg mb-4 p-1 overflow-hidden border border-muted/20">
            <img src={logo} alt="Smarter Petitions Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">{t('app_name')}</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1.5">{t('app_tagline')}</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-heading font-bold">
              {selectedRole === 'citizen' ? t('login_title') : t('login_to_role', { role: t(`role_${selectedRole}`) })}
            </CardTitle>
            <CardDescription className="text-base">{t('login_subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Premium Role Selection Cards */}
            <div className="grid grid-cols-3 gap-3 mb-8 pt-4">
              {[
                {
                  id: 'citizen' as const,
                  icon: User,
                  label: t('role_citizen'),
                  desc: t('role_citizen_desc'),
                  color: 'bg-blue-50 text-blue-600',
                  activeColor: 'border-blue-500 bg-blue-50/50'
                },
                {
                  id: 'admin' as const,
                  icon: Shield,
                  label: t('role_admin'),
                  desc: t('role_admin_desc'),
                  color: 'bg-orange-50 text-orange-600',
                  activeColor: 'border-orange-500 bg-orange-50/50'
                },
                {
                  id: 'officer' as const,
                  icon: Briefcase,
                  label: t('role_officer'),
                  desc: t('role_officer_desc'),
                  color: 'bg-green-50 text-green-600',
                  activeColor: 'border-green-500 bg-green-50/50'
                },
              ].map((roleType) => (
                <button
                  key={roleType.id}
                  type="button"
                  onClick={() => {
                    setSelectedRole(roleType.id);
                    setEmail('');
                    setPassword('');
                    toast.info(t('switched_to_login', { role: roleType.label }));
                  }}
                  className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 text-center group ${selectedRole === roleType.id
                    ? `${roleType.activeColor} shadow-md scale-[1.02]`
                    : 'border-muted bg-card hover:border-muted-foreground/20 hover:shadow-sm'
                    }`}
                >
                  {selectedRole === roleType.id && (
                    <motion.div
                      layoutId="role-check"
                      className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full shadow-lg p-0.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </motion.div>
                  )}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${roleType.color}`}>
                    <roleType.icon className="w-6 h-6" />
                  </div>
                  <h3 className={`text-sm font-black mb-1 ${selectedRole === roleType.id ? 'text-primary' : 'text-foreground'}`}>
                    {roleType.label}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-tight px-1 font-medium">
                    {roleType.desc}
                  </p>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="email" className="gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    {t('email_tab', 'Email')}
                  </TabsTrigger>
                  <TabsTrigger value="phone" className="gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    {t('phone_tab', 'Phone')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="m-0 border-0 p-0 shadow-none">
                  <div>
                    <label className="text-sm font-bold text-muted-foreground mb-1.5 block">{t('email_label', 'Email Address')}</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); setIsNotFound(false); }}
                      placeholder="you@example.com"
                      autoComplete="username"
                      required={activeTab === 'email'}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="phone" className="m-0 border-0 p-0 shadow-none">
                  <div>
                    <label className="text-sm font-bold text-muted-foreground mb-1.5 block">{t('phone_label', 'Phone Number')}</label>
                    <Input
                      type="tel"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); setIsNotFound(false); }}
                      placeholder="+91 9876543210"
                      autoComplete="tel"
                      required={activeTab === 'phone'}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              <div>
                <label className="text-sm font-bold text-muted-foreground mb-1.5 block">{t('password')}</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder={t('password_placeholder')}
                    autoComplete="current-password"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end mt-1">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    {t('forgot_password_link')}
                  </Link>
                </div>
              </div>

              {/* Error display */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`flex items-start gap-2 p-3 rounded-lg text-xs ${isNotFound
                      ? 'bg-orange-50 border border-orange-200 text-orange-800'
                      : 'bg-destructive/10 border border-destructive/20 text-destructive'
                      }`}
                  >
                    {isNotFound ? <UserX className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('login_signing_in')}
                  </>
                ) : t('login_btn')}
              </Button>
            </form>

            {/* Register redirect CTA — shown prominently when account not found */}
            <AnimatePresence>
              {isNotFound && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4"
                >
                  <Link
                    to="/register"
                    className="block w-full text-center py-2.5 px-4 rounded-lg border-2 border-primary text-primary text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {t('create_new_account')}
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-5 text-center text-sm">
              <span className="text-muted-foreground">{t('login_no_account')}</span>
              <Link to="/register" className="text-primary hover:underline font-medium">
                {t('register_now')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div >
  );
}

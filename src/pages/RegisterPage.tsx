import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Globe, Eye, EyeOff, Mail, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import PageTransition from '@/components/PageTransition';

const registerSchema = z.object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    languagePref: z.enum(['en', 'ta', 'te', 'ml', 'hi', 'kn']),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
}).refine((data) => data.email || data.phone, {
    message: "Please provide either an email or a phone number",
    path: ['email'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverError, setServerError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // OTP verification fields
    const [step, setStep] = useState<1 | 2>(1);
    const [registeredIdentifier, setRegisteredIdentifier] = useState<{ email?: string, phone?: string }>({});
    const [otp, setOtp] = useState('');
    const [countdown, setCountdown] = useState(180); // 180 seconds (3 minutes)
    const [canResend, setCanResend] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            languagePref: 'en',
            email: '',
            phone: '',
        },
    });

    const [activeTab, setActiveTab] = useState<'email' | 'phone'>('email');

    const handleTabChange = (value: string) => {
        const tab = value as 'email' | 'phone';
        setActiveTab(tab);
        // Clear the other field to ensure only one is submitted
        if (tab === 'email') {
            setValue('phone', '');
        } else {
            setValue('email', '');
        }
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (step === 2 && countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        setCanResend(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [step, countdown]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const password = watch('password', '');

    const calculatePasswordStrength = (pass: string) => {
        if (!pass) return 0;
        let score = 0;
        if (pass.length >= 8) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[a-z]/.test(pass)) score++;
        if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;
        return score;
    };

    const strength = calculatePasswordStrength(password);
    const strengthLabels = [
        '',
        t('strength_weak'),
        t('strength_fair'),
        t('strength_good'),
        t('strength_strong')
    ];
    const strengthColors = [
        'bg-muted',
        'bg-destructive',
        'bg-orange-500',
        'bg-yellow-500',
        'bg-green-500'
    ];

    const onSubmit = async (data: RegisterFormValues) => {
        setIsSubmitting(true);
        setServerError('');
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
            const url = baseUrl ? `${baseUrl}/api/register` : '/api/register';
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: data.fullName,
                    email: data.email || null,
                    phone: data.phone || null,
                    password: data.password,
                    languagePref: data.languagePref,
                }),
            });
            const isJson = response.headers.get('content-type')?.includes('application/json');
            const result = isJson ? await response.json() : null;
            toast.success(result.message || t('registration_success'));
            setRegisteredIdentifier({ email: data.email, phone: data.phone });
            setStep(2);
        } catch (err: any) {
            setServerError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) {
            setServerError(t('invalid_otp', 'Please enter a valid 6-digit OTP'));
            return;
        }
        setIsSubmitting(true);
        setServerError('');
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
            const url = baseUrl ? `${baseUrl}/api/verify-registration` : '/api/verify-registration';
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: registeredIdentifier.email,
                    phone: registeredIdentifier.phone,
                    otp
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to verify OTP');
            toast.success(t('verification_success', 'Account verified successfully! Please login.'));
            navigate('/login');
        } catch (err: any) {
            setServerError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendOtp = async () => {
        setIsSubmitting(true);
        setServerError('');
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
            const url = baseUrl ? `${baseUrl}/api/resend-registration-otp` : '/api/resend-registration-otp';
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identifier: registeredIdentifier.email || registeredIdentifier.phone
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to resend OTP');
            }

            toast.success(t('otp_resent_success', 'A new OTP has been sent.'));
            setCountdown(180);
            setCanResend(false);
            setOtp('');
        } catch (err: any) {
            setServerError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 gov-gradient-light relative">
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                <ThemeToggle variant="dark" />
                <LanguageSwitcher variant="dark" />
            </div>
            <PageTransition className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl gov-gradient mx-auto flex items-center justify-center shadow-lg mb-4">
                        <FileText className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-heading font-bold text-foreground">{t('app_name')}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{t('app_tagline')}</p>
                </div>

                <Card className="shadow-xl border-0">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-lg font-heading">
                            {step === 1 ? t('register_title') : t('verify_account_title', 'Verify Your Account')}
                        </CardTitle>
                        <CardDescription>
                            {step === 1 ? t('register_subtitle') : t('verify_account_subtitle', 'Enter the OTP sent to your contact device')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {step === 1 ? (
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                        {t('full_name')}
                                    </label>
                                    <Input type="text" {...register('fullName')} placeholder="John Doe" />
                                    {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>}
                                </div>

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

                                    <TabsContent value="email" className="space-y-4 m-0 border-0 p-0 shadow-none">
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                                {t('email_label', 'Email Address')}
                                            </label>
                                            <Input type="email" {...register('email')} placeholder="you@example.com" />
                                            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="phone" className="space-y-4 m-0 border-0 p-0 shadow-none">
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                                {t('phone_label', 'Phone Number')}
                                            </label>
                                            <Input type="tel" {...register('phone')} placeholder="+91 9876543210" />
                                            {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                        {t('password')}
                                    </label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            {...register('password')}
                                            placeholder="••••••••"
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {password && (
                                        <div className="mt-2 space-y-1">
                                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                                                <span className="text-muted-foreground">{t('password_strength')}</span>
                                                <span className={strength === 1 ? 'text-destructive' : strength === 2 ? 'text-orange-500' : strength === 3 ? 'text-yellow-600' : 'text-green-600'}>
                                                    {strengthLabels[strength]}
                                                </span>
                                            </div>
                                            <div className="flex gap-1 h-1">
                                                {[1, 2, 3, 4].map((i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-full flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColors[strength] : 'bg-muted'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                        {t('confirm_password')}
                                    </label>
                                    <div className="relative">
                                        <Input
                                            type={showConfirmPassword ? "text" : "password"}
                                            {...register('confirmPassword')}
                                            placeholder="••••••••"
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>}
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                        {t('language_preference')}
                                    </label>
                                    <div className="p-3 rounded-md border border-input bg-muted/30 flex items-center justify-between">
                                        <span className="text-sm font-medium">{t('language_preference_info', 'Selection will apply globally')}</span>
                                        <LanguageSwitcher variant="dark" />
                                    </div>
                                    {errors.languagePref && <p className="text-xs text-destructive mt-1">{errors.languagePref.message}</p>}
                                </div>

                                {serverError && <p className="text-xs text-destructive text-center">{serverError}</p>}

                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? t('registering_loader') : t('register_btn')}
                                </Button>
                            </form>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center text-sm text-muted-foreground mb-4">
                                    <p>{t('otp_sent_to', 'An OTP has been sent to')}</p>
                                    <p className="font-medium text-foreground mt-1">
                                        {registeredIdentifier.email || registeredIdentifier.phone}
                                    </p>
                                </div>
                                <div>
                                    <Input
                                        type="text"
                                        placeholder="000000"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                        className="text-center text-2xl tracking-widest h-14"
                                    />
                                    <div className="text-center mt-3 text-sm flex flex-col items-center gap-2">
                                        {countdown > 0 ? (
                                            <span className="text-muted-foreground">
                                                {t('otp_expires_in', 'Code expires in')} <span className="font-semibold text-primary">{formatTime(countdown)}</span>
                                            </span>
                                        ) : (
                                            <span className="text-destructive font-medium">
                                                {t('otp_expired', 'Code expired')}
                                            </span>
                                        )}
                                        {canResend && (
                                            <Button
                                                variant="link"
                                                size="sm"
                                                onClick={handleResendOtp}
                                                disabled={isSubmitting}
                                                className="text-primary h-auto p-0"
                                            >
                                                {isSubmitting ? t('resending_loader', 'Resending...') : t('resend_otp_btn', 'Resend Code')}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                {serverError && <p className="text-xs text-destructive text-center">{serverError}</p>}
                                <Button onClick={handleVerifyOtp} className="w-full h-12" disabled={isSubmitting || otp.length !== 6 || countdown === 0}>
                                    {isSubmitting ? t('verifying_loader', 'Verifying...') : t('verify_email_btn', 'Verify Account')}
                                </Button>
                                
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setStep(1)} 
                                    className="w-full text-muted-foreground hover:text-foreground"
                                    disabled={isSubmitting}
                                >
                                    {t('back_to_register', '← Back to Registration')}
                                </Button>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="mt-6 text-center text-sm">
                                <span className="text-muted-foreground">{t('already_account')}</span>
                                <Link to="/login" className="text-primary hover:underline font-medium ml-1">
                                    {t('login_btn')}
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </PageTransition>
        </div>
    );
}

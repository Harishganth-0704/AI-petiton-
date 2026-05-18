import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Loader2, AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { apiFetch } from '@/lib/api';

export default function ForgotPasswordPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(180);
    const [canResend, setCanResend] = useState(false);

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

    const handleSendOtp = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await apiFetch('/api/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ identifier }),
            });
            toast.success(t('otp_sent_success', 'OTP sent to your registered contact'));
            setStep(2);
            setCountdown(180);
            setCanResend(false);
        } catch (err: any) {
            const msg = err.message || 'Failed to send OTP';
            setError(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await apiFetch('/api/verify-otp', {
                method: 'POST',
                body: JSON.stringify({ identifier, otp }),
            });
            toast.success(t('otp_verified_success', 'OTP verified successfully'));
            setStep(3);
        } catch (err: any) {
            setError(err.message || 'Invalid or expired OTP');
            toast.error(t('otp_verify_failed', 'Invalid or expired OTP'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await apiFetch('/api/reset-password', {
                method: 'POST',
                body: JSON.stringify({ identifier, otp, newPassword }),
            });
            toast.success(t('password_reset_success'));
            navigate('/login');
        } catch (err: any) {
            setError(err.message || 'Failed to reset password');
            toast.error(t('password_reset_failed', 'Failed to reset password'));
        } finally {
            setIsLoading(false);
        }
    };

    const calculatePasswordStrength = (pass: string) => {
        if (!pass) return 0;
        let score = 0;
        if (pass.length >= 8) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[a-z]/.test(pass)) score++;
        if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;
        return score;
    };

    const strength = calculatePasswordStrength(newPassword);
    const strengthLabels = ['', t('strength_weak'), t('strength_fair'), t('strength_good'), t('strength_strong')];
    const strengthColors = ['bg-muted', 'bg-destructive', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 gov-gradient-light relative text-foreground">
            <div className="absolute top-4 right-4 z-10">
                <LanguageSwitcher variant="dark" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl gov-gradient mx-auto flex items-center justify-center shadow-lg mb-4">
                        <FileText className="w-8 h-8 text-primary-foreground" />
                    </div>
                </div>

                <Card className="shadow-xl border-0">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-xl font-heading font-bold">{t('forgot_password_title')}</CardTitle>
                        <CardDescription>{t('forgot_password_subtitle')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.form
                                    key="step1"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onSubmit={handleSendOtp}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wider">{t('email_or_phone', 'Email or Phone Number')}</label>
                                        <Input
                                            type="text"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            placeholder="you@example.com or 9876543210"
                                            required
                                        />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        {t('send_otp_btn')}
                                    </Button>
                                </motion.form>
                            )}

                            {step === 2 && (
                                <motion.form
                                    key="step2"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onSubmit={handleVerifyOtp}
                                    className="space-y-4"
                                >
                                    <div className="bg-primary/5 p-3 rounded-lg flex items-center gap-3 border border-primary/10">
                                        <CheckCircle2 className="w-5 h-5 text-primary" />
                                        <div className="text-xs">
                                            <p className="font-medium">{t('otp_sent_to', 'OTP Sent To')}</p>
                                            <p className="text-muted-foreground">{identifier}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wider">{t('otp_label', 'Verification Code')}</label>
                                        <Input
                                            type="text"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                            placeholder={t('otp_placeholder')}
                                            maxLength={6}
                                            required
                                            className="text-center text-xl tracking-[0.5em] font-bold"
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
                                                    type="button"
                                                    variant="link"
                                                    size="sm"
                                                    onClick={handleSendOtp}
                                                    disabled={isLoading}
                                                    className="text-primary h-auto p-0"
                                                >
                                                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                                    {t('resend_otp_btn', 'Resend Code')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6 || countdown === 0}>
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        {t('verify_otp_btn')}
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="w-full text-center text-xs text-muted-foreground hover:text-primary underline"
                                    >
                                        {t('change_identifier', 'Change Email/Phone')}
                                    </button>
                                </motion.form>
                            )}

                            {step === 3 && (
                                <motion.form
                                    key="step3"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onSubmit={handleResetPassword}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wider">{t('new_password', 'New Password')}</label>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder={t('new_password_placeholder')}
                                                required
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
                                        {newPassword && (
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
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        {t('reset_password_btn')}
                                    </Button>
                                </motion.form>
                            )}
                        </AnimatePresence>

                        {error && (
                            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="mt-6 text-center">
                            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                                <ArrowLeft className="w-4 h-4" />
                                {t('back_to_login')}
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}

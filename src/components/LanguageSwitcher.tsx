import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
    variant?: 'light' | 'dark';
}

export function LanguageSwitcher({ variant = 'light' }: LanguageSwitcherProps) {
    const { i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const isLight = variant === 'light';

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors border group cursor-pointer ${isLight
                ? 'bg-white/10 hover:bg-white/20 border-white/20'
                : 'bg-primary/5 hover:bg-primary/10 border-primary/10'
            }`}>
            <Globe className={`w-4 h-4 transition-transform group-hover:scale-110 ${isLight ? 'text-white' : 'text-primary'
                }`} />
            <select
                value={i18n.resolvedLanguage || 'en'}
                onChange={(e) => changeLanguage(e.target.value)}
                className={`bg-transparent border-none font-medium text-xs focus:ring-0 focus:outline-none cursor-pointer appearance-none pr-1 ${isLight ? 'text-white' : 'text-primary'
                    }`}
                style={{ WebkitAppearance: 'none' }}
            >
                <option value="en" className="text-foreground">English</option>
                <option value="ta" className="text-foreground">தமிழ்</option>
                <option value="te" className="text-foreground">తెలుగు</option>
                <option value="ml" className="text-foreground">മലയാളം</option>
                <option value="kn" className="text-foreground">ಕನ್ನಡ</option>
                <option value="hi" className="text-foreground">हिंदी</option>
            </select>
        </div>
    );
}

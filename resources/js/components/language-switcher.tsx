import { router } from '@inertiajs/react';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Locale = 'fr' | 'en';

// SVG Flag components for better compatibility
const FlagFR = () => (
    <svg className="h-5 w-5 rounded-sm" viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
        <g fillRule="evenodd" strokeWidth="1pt">
            <path fill="#fff" d="M0 0h640v480H0z" />
            <path fill="#002654" d="M0 0h213.3v480H0z" />
            <path fill="#ce1126" d="M426.7 0H640v480H426.7z" />
        </g>
    </svg>
);

const FlagEN = () => (
    <svg className="h-5 w-5 rounded-sm" viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
        <path fill="#012169" d="M0 0h640v480H0z" />
        <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0h75z" />
        <path fill="#C8102E" d="m424 281 216 159v40L369 281h55zm-184 20 6 35L54 480H0l240-179zM640 0v3L391 191l2-44L590 0h50zM0 0l239 176h-60L0 42V0z" />
        <path fill="#FFF" d="M241 0v480h160V0H241zM0 160v160h640V160H0z" />
        <path fill="#C8102E" d="M0 193v96h640v-96H0zM273 0v480h96V0h-96z" />
    </svg>
);

const FlagComponent = ({ code }: { code: string }) => {
    if (code === 'en') {
        return <FlagEN />;
    }

    return <FlagFR />;
};

const LOCALES: { code: Locale; label: string }[] = [
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
];

export function LanguageSwitcher() {
    const { t, i18n } = useTranslation();

    const handleChange = (locale: Locale) => {
        void i18n.changeLanguage(locale);

        // Persist on the backend (updates user.locale + cookie)
        router.patch('/settings/locale', { locale }, { preserveScroll: true });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    aria-label={t('language_switcher.label')}
                >
                    <Languages className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-32.5">
                {LOCALES.map(({ code, label }) => (
                    <DropdownMenuItem
                        key={code}
                        onClick={() => handleChange(code)}
                        className={i18n.resolvedLanguage === code ? 'font-semibold' : ''}
                    >
                        <FlagComponent code={code} />
                        {label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

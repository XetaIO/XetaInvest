import { useState, useRef, useEffect, useId } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

interface Language {
    code: 'fr' | 'en';
    name: string;
    flag: string;
}

const languages: Language[] = [
    { code: 'fr', name: 'Français', flag: 'fr' },
    { code: 'en', name: 'English', flag: 'gb' },
];

// SVG Flag components for better compatibility
const FlagFR = () => (
    <svg
        aria-hidden="true"
        className="h-5 w-5 shrink-0 rounded-sm"
        viewBox="0 0 640 480"
        xmlns="http://www.w3.org/2000/svg"
    >
        <g fillRule="evenodd" strokeWidth="1pt">
            <path fill="#fff" d="M0 0h640v480H0z" />
            <path fill="#002654" d="M0 0h213.3v480H0z" />
            <path fill="#ce1126" d="M426.7 0H640v480H426.7z" />
        </g>
    </svg>
);

const FlagGB = () => (
    <svg
        aria-hidden="true"
        className="h-5 w-5 shrink-0 rounded-sm"
        viewBox="0 0 640 480"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path fill="#012169" d="M0 0h640v480H0z" />
        <path
            fill="#FFF"
            d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0h75z"
        />
        <path
            fill="#C8102E"
            d="m424 281 216 159v40L369 281h55zm-184 20 6 35L54 480H0l240-179zM640 0v3L391 191l2-44L590 0h50zM0 0l239 176h-60L0 42V0z"
        />
        <path fill="#FFF" d="M241 0v480h160V0H241zM0 160v160h640V160H0z" />
        <path fill="#C8102E" d="M0 193v96h640v-96H0zM273 0v480h96V0h-96z" />
    </svg>
);

const FlagComponent = ({ code }: { code: string }) => {
    if (code === 'fr') return <FlagFR />;
    if (code === 'gb') return <FlagGB />;
    return null;
};

interface LanguageSwitcherProps {
    /** Compact mode for mobile - shows only flag */
    compact?: boolean;
    /** Direction of the dropdown menu */
    dropdownDirection?: 'up' | 'down';
}

export function LanguageSwitcher({
    compact = false,
    dropdownDirection = 'down',
}: LanguageSwitcherProps) {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isChanging, setIsChanging] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const listboxId = useId();

    const languageCode = (i18n.resolvedLanguage || i18n.language || 'en').split(
        '-',
    )[0];
    const currentLanguage =
        languages.find((lang) => lang.code === languageCode) || languages[1];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: PointerEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('pointerdown', handleClickOutside);
        return () =>
            document.removeEventListener('pointerdown', handleClickOutside);
    }, []);

    // Focus the selected option when opening, including from the keyboard.
    useEffect(() => {
        if (isOpen)
            optionRefs.current[languages.indexOf(currentLanguage)]?.focus();
    }, [isOpen, currentLanguage]);

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape' && isOpen) {
            event.preventDefault();
            event.stopPropagation();
            setIsOpen(false);
            triggerRef.current?.focus();
        }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key))
            return;
        event.preventDefault();
        if (!isOpen) {
            if (!isChanging) setIsOpen(true);
            return;
        }
        const focusedIndex = optionRefs.current.findIndex(
            (option) => option === document.activeElement,
        );
        const index =
            event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? languages.length - 1
                  : (focusedIndex +
                        (event.key === 'ArrowDown' ? 1 : -1) +
                        languages.length) %
                    languages.length;
        optionRefs.current[index]?.focus();
    };

    const handleLanguageChange = async (lang: Language) => {
        if (isChanging) return;
        setIsOpen(false);
        triggerRef.current?.focus();
        if (lang.code === currentLanguage.code) return;

        setIsChanging(true);

        try {
            // The configured detector persists the preference in localStorage.
            await i18n.changeLanguage(lang.code);
        } catch {
            toast.error(t('common.languageChangeError'));
        } finally {
            setIsChanging(false);
        }
    };

    return (
        <div
            className="relative"
            ref={dropdownRef}
            onKeyDown={handleKeyDown}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                    setIsOpen(false);
            }}
        >
            {/* Trigger Button */}
            <button
                type="button"
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                disabled={isChanging}
                className={`flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:cursor-pointer hover:bg-gray-50 hover:text-gray-700 disabled:cursor-wait disabled:opacity-50 dark:border-white/5 dark:bg-white/3 dark:text-white/90 dark:hover:bg-white/3 dark:hover:text-gray-200 ${
                    compact ? 'h-10 w-10 p-0' : 'h-11 gap-2 px-3'
                }`}
                aria-label={t('common.changeLanguage')}
                title={currentLanguage.name}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-controls={isOpen ? listboxId : undefined}
                aria-busy={isChanging}
            >
                <FlagComponent code={currentLanguage.flag} />
                {!compact && (
                    <>
                        <span className="hidden text-sm font-medium sm:inline">
                            {currentLanguage.code.toUpperCase()}
                        </span>
                        <svg
                            aria-hidden="true"
                            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    id={listboxId}
                    className={`absolute left-0 z-1000 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-white/5 dark:bg-mist-950 dark:text-white/90 ${
                        dropdownDirection === 'up'
                            ? 'bottom-full mb-2 origin-bottom-right'
                            : 'top-full mt-2 origin-top-right'
                    }`}
                    role="listbox"
                    aria-label={t('common.selectLanguage')}
                >
                    {languages.map((lang, index) => (
                        <button
                            type="button"
                            key={lang.code}
                            ref={(element) => {
                                optionRefs.current[index] = element;
                            }}
                            tabIndex={-1}
                            onClick={() => handleLanguageChange(lang)}
                            disabled={isChanging}
                            className={`flex w-full items-center gap-3 rounded-none border-0 px-4 py-2 text-left text-sm transition-colors ${
                                lang.code === currentLanguage.code
                                    ? 'bg-brand-50 text-brand-500 dark:bg-mist-900 dark:text-brand-400'
                                    : 'bg-white text-gray-700 hover:cursor-pointer hover:bg-brand-100 dark:bg-mist-950 dark:text-white/90 dark:hover:bg-white/5'
                            }`}
                            role="option"
                            aria-selected={lang.code === currentLanguage.code}
                            lang={lang.code}
                        >
                            <FlagComponent code={lang.flag} />
                            <span className="font-medium">{lang.name}</span>
                            {lang.code === currentLanguage.code && (
                                <svg
                                    aria-hidden="true"
                                    className="ml-auto h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default LanguageSwitcher;

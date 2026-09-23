import { LogIn } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { ApiClientError } from '../../../shared/api/client';
import { Input } from '../../../shared/components/form/input/InputField';
import { Label } from '../../../shared/components/form/Label';
import { Button } from '../../../shared/components/ui/button/Button';
import { safeRedirectPath } from '../../../shared/utils/safeRedirectPath';
import { useAuth } from '../hooks/useAuth';

export function Login() {
    const { login, isLoggingIn } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isLoggingIn) return;
        setError(null);
        try {
            await login({ email, password });
            void navigate(safeRedirectPath(location.state?.from), {
                replace: true,
            });
            toast.success('You are now logged in.');
        } catch (error) {
            setError(
                error instanceof ApiClientError && error.status === 401
                    ? 'Invalid email or password.'
                    : 'Unable to log in. Please try again.',
            );
        }
    }

    return (
        <section className="flex flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h1 className="mt-4 mb-2 text-center text-4xl font-semibold text-white">
                    {t('auth.login_button')}
                </h1>
            </div>
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="rounded-xl border border-white/5 bg-white/3 px-6 py-8 shadow-lg sm:px-10">
                    <h2 className="mb-2 text-center text-xl font-semibold text-white">
                        {t('auth.sign_in_to_account')}
                    </h2>
                    <form
                        onSubmit={handleSubmit}
                        aria-busy={isLoggingIn}
                        className="space-y-5"
                    >
                        <div>
                            <Label htmlFor="email">
                                {t('auth.email')}{' '}
                                <span className="text-error-500">*</span>{' '}
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                placeholder={t('auth.email_placeholder')}
                                required
                                autoComplete="email"
                                autoFocus
                            />
                        </div>
                        <div>
                            <Label htmlFor="password">
                                {t('auth.password')}{' '}
                                <span className="text-error-500">*</span>{' '}
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                placeholder={t('auth.password_placeholder')}
                                required
                                autoComplete="current-password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <Link
                                to="/forgot-password"
                                className="text-sm font-medium text-brand-600 hover:text-brand-500"
                            >
                                {t('auth.forgot_password')}
                            </Link>
                            <Link
                                to="/register"
                                className="text-sm font-medium text-brand-600 hover:text-brand-500"
                            >
                                {t('auth.no_account_yet')}
                            </Link>
                        </div>
                        {error && <p role="alert">{error}</p>}
                        <Button
                            type="submit"
                            fullWidth
                            isLoading={isLoggingIn}
                            disabled={isLoggingIn}
                            endIcon={<LogIn />}
                        >
                            {isLoggingIn
                                ? t('auth.signing_in')
                                : t('auth.login_button')}
                        </Button>
                    </form>
                </div>
            </div>
        </section>
    );
}

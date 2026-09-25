import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { locoErrorMessage } from '../../../shared/api/client';
import { Input } from '../../../shared/components/form/input/InputField';
import { Label } from '../../../shared/components/form/Label';
import { Button } from '../../../shared/components/ui/button/Button';
import { register } from '../api/session';

export function Signup() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isSubmitting) return;
        setError(null);
        if (password !== passwordConfirm) {
            setError(t('auth.password_mismatch'));
            return;
        }
        setIsSubmitting(true);
        try {
            await register({ name, email, password });
            toast.success(t('auth.signup_success'));
            void navigate('/login', { replace: true });
        } catch (err) {
            setError(locoErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="flex flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h1 className="mt-4 mb-2 text-center text-4xl font-semibold text-white">
                    {t('auth.signup_button')}
                </h1>
            </div>
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="rounded-xl border border-white/5 bg-white/3 px-6 py-8 shadow-lg sm:px-10">
                    <h2 className="mb-2 text-center text-xl font-semibold text-white">
                        {t('auth.sign_up_to_account')}
                    </h2>
                    <form
                        onSubmit={handleSubmit}
                        aria-busy={isSubmitting}
                        className="space-y-5"
                    >
                        <div>
                            <Label htmlFor="name">
                                {t('auth.name')}{' '}
                                <span className="text-error-500">*</span>{' '}
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                name="name"
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                placeholder={t('auth.name_placeholder')}
                                required
                                minLength={2}
                                maxLength={255}
                                autoComplete="name"
                                autoFocus
                            />
                        </div>
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
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                placeholder={t('auth.password_placeholder')}
                                required
                                minLength={8}
                                autoComplete="new-password"
                            />
                        </div>
                        <div>
                            <Label htmlFor="passwordConfirm">
                                {t('auth.password_confirm')}{' '}
                                <span className="text-error-500">*</span>{' '}
                            </Label>
                            <Input
                                id="passwordConfirm"
                                type="password"
                                name="passwordConfirm"
                                value={passwordConfirm}
                                onChange={(event) =>
                                    setPasswordConfirm(event.target.value)
                                }
                                placeholder={t(
                                    'auth.password_confirm_placeholder',
                                )}
                                required
                                minLength={8}
                                autoComplete="new-password"
                            />
                        </div>
                        {error && <p role="alert">{error}</p>}
                        <Button
                            type="submit"
                            fullWidth
                            isLoading={isSubmitting}
                            disabled={isSubmitting}
                            endIcon={<UserPlus />}
                        >
                            {isSubmitting
                                ? t('auth.signing_up')
                                : t('auth.signup_button')}
                        </Button>
                        <p className="text-center text-sm text-white/70">
                            <Link
                                to="/login"
                                className="font-medium text-brand-600 hover:text-brand-500"
                            >
                                {t('auth.already_have_account')}
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </section>
    );
}

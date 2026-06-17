import { useTranslation } from 'react-i18next';
import AuthLayoutTemplate from '@/layouts/auth/auth-simple-layout';

export default function AuthLayout({
    title = '',
    description = '',
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    const { t } = useTranslation();
    const translatedTitle = title ? t(title, { defaultValue: title }) : '';
    const translatedDescription = description
        ? t(description, { defaultValue: description })
        : '';

    return (
        <AuthLayoutTemplate
            title={translatedTitle}
            description={translatedDescription}
        >
            {children}
        </AuthLayoutTemplate>
    );
}

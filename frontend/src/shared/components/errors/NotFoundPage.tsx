import { useTranslation } from 'react-i18next';
import { PageMeta } from '../common/PageMeta';
import { NotFoundContent } from './NotFoundContent';

/**
 * 404 page for use within the authenticated layout
 * Displays the NotFoundContent component within the app layout
 */
export default function NotFoundPage() {
    const { t } = useTranslation();

    return (
        <>
            <PageMeta
                title={`${t('errors.not_found')} | XetaInvest`}
                description={t('errors.page_not_found')}
            />
            <NotFoundContent />
        </>
    );
}

import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import i18n from '@/lib/i18n';
import { AiReportCard } from './ai-report-card';

function renderCard(report: Parameters<typeof AiReportCard>[0]['report']) {
    return render(
        <I18nextProvider i18n={i18n}>
            <AiReportCard report={report} />
        </I18nextProvider>,
    );
}

describe('AiReportCard', () => {
    it('renders the localized empty state', () => {
        renderCard(null);

        expect(screen.getByText(i18n.t('ai.no_report'))).toBeInTheDocument();
    });

    it('renders a generic failed report message', () => {
        renderCard({
            id: 1,
            type: 'global',
            scope_type: null,
            scope_id: null,
            status: 'failed',
            generated_for_date: '2026-06-09',
            content: null,
            error_message: 'reference-123',
            created_at: '2026-06-09T00:00:00Z',
        });

        expect(screen.getByText(/reference-123/)).toBeInTheDocument();
    });
});

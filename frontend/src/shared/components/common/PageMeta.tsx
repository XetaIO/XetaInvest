import { useEffect } from 'react';
import type { FC } from 'react';
import { Helmet } from 'react-helmet-async';

interface PageMetaProps {
    title: string;
    description: string;
}

export const PageMeta: FC<PageMetaProps> = ({ title, description }) => {
    // Ensure document title is always updated
    useEffect(() => {
        document.title = title;
    }, [title]);

    return (
        <Helmet>
            <title>{title}</title>
            <meta name="description" content={description} />
        </Helmet>
    );
};

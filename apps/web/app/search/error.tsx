'use client';

import { useEffect } from 'react';
import { clientLogger } from '@/lib/logger/client';

interface SearchErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SearchErrorPage({ error }: SearchErrorPageProps): null {
  useEffect(() => {
    clientLogger.error('search.error_boundary_triggered', {
      route: '/search',
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return null;
}


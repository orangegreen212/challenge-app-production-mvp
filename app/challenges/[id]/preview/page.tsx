'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Legacy route: real challenges no longer have a separate "preview" step
// (AI output is validated and saved directly). Redirect straight to the
// persisted challenge's real detail page.
export default function LegacyChallengePreviewRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/challenges/${params.id}`);
  }, [params.id, router]);

  return null;
}

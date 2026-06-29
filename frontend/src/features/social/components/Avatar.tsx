import { useEffect, useState } from 'react';
import { assetUrl } from '@/api';

interface AvatarProps {
  label: string;
  src?: string | null;
  compact?: boolean;
}

export function Avatar({ label, src, compact = false }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const resolvedSrc = assetUrl(src ?? undefined);
  const shouldShowImage = Boolean(resolvedSrc && resolvedSrc !== failedSrc);

  useEffect(() => {
    setFailedSrc(null);
  }, [resolvedSrc]);

  return (
    <span className={`social-avatar ${compact ? 'social-avatar-compact' : ''}`}>
      {shouldShowImage ? (
        <img src={resolvedSrc} alt='' onError={() => setFailedSrc(resolvedSrc ?? null)} />
      ) : (
        <span>{label.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
}

interface AvatarProps {
  label: string;
  src?: string | null;
  compact?: boolean;
}

export function Avatar({ label, src, compact = false }: AvatarProps) {
  return (
    <span className={`social-avatar ${compact ? 'social-avatar-compact' : ''}`}>
      {src ? (
        <img src={src} alt='' />
      ) : (
        <span>{label.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
}

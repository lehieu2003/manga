import { Loader2 } from 'lucide-react';

export function LoadingRow({ label }: { label: string }) {
  return (
    <div className='social-loading-row'>
      <Loader2 className='reader-spin' size={16} />
      <span>{label}</span>
    </div>
  );
}

export function EmptyPanel({ label }: { label: string }) {
  return <div className='social-empty-panel'>{label}</div>;
}

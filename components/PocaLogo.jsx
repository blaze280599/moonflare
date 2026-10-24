import { LOGO_PATH, LOGO_VIEWBOX } from '@/lib/logo';
import { cn } from '@/lib/utils';

// The Poca mark, sized and colored like a lucide icon (className, currentColor).
export default function PocaLogo({ className, ...props }) {
  return (
    <svg
      viewBox={`0 0 ${LOGO_VIEWBOX} ${LOGO_VIEWBOX}`}
      fill="currentColor"
      aria-hidden="true"
      className={cn('size-5 shrink-0', className)}
      {...props}
    >
      <path fillRule="evenodd" d={LOGO_PATH} />
    </svg>
  );
}

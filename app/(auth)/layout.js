import { MoonStar } from 'lucide-react';

export default function AuthLayout({ children }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex items-center gap-2">
        <MoonStar className="size-6 text-primary" />
        <span className="font-heading text-xl font-semibold tracking-tight">Moonflare Photocard Club</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}

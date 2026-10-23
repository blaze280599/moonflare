import Link from 'next/link';
import { MoonStar } from 'lucide-react';
import { GROUPS } from '@/lib/cards';

export default function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-muted-foreground sm:grid-cols-[1fr_auto]">
        <div className="max-w-xl space-y-2">
          <div className="flex items-center gap-2 text-foreground">
            <MoonStar className="size-4 text-primary" />
            <span className="font-heading font-semibold">Moonflare Photocard Club</span>
          </div>
          <p>
            MOONFLARE is a made-up group. LE SSERAFIM photos load from the K-pop Fandom wiki; this is a fan project, not affiliated
            with Source Music or HYBE. Your collection saves in this browser only.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 sm:flex-col">
          {GROUPS.map(g => (
            <Link key={g.code} href={`/groups/${g.slug}`} className="hover:text-foreground">
              {g.name}
            </Link>
          ))}
          <Link href="/collection" className="hover:text-foreground">
            Collection
          </Link>
        </nav>
      </div>
    </footer>
  );
}

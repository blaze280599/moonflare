import Link from 'next/link';
import { MoonStar } from 'lucide-react';
import { GROUPS } from '@/lib/cards';
import { Button } from '@/components/ui/button';

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
            Group photos load from the K-pop Fandom wiki; this is a fan project, not affiliated with any
            group or their labels. Your collection is saved to your account.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 sm:flex-col sm:items-start">
          {[...GROUPS.map(g => [`/groups/${g.slug}`, g.name]), ['/collection', 'Collection'], ['/trade', 'Trade']].map(([href, label]) => (
            <Button key={href} asChild variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground">
              <Link href={href}>{label}</Link>
            </Button>
          ))}
        </nav>
      </div>
    </footer>
  );
}

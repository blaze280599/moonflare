'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useGameContext } from '@/components/GameProvider';
import { ERAS } from '@/lib/cards';
import { BIAS_BOOST, memberRates } from '@/lib/gacha';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NONE = 'none';
const pct = n => `${n.toFixed(1)}%`;

// Pick your bias for one group. The choice is saved on the server (setBias) and rollPack reads it there.
export default function BiasPicker({ group }) {
  const { state, loaded, setBias } = useGameContext();
  const [saving, setSaving] = useState(false);
  const bias = state.bias?.[group.code] ?? null;
  const member = group.members.find(m => m.code === bias);
  // Every era of a group has the same layout, so any of them gives the same odds.
  const era = ERAS.find(e => e.group === group);
  const boosted = memberRates(era, bias).find(r => r.isBias)?.pct;
  const plain = memberRates(era, null)[0].pct;

  const choose = async value => {
    setSaving(true);
    const res = await setBias(group, group.members.find(m => m.code === value) ?? null);
    setSaving(false);
    if (res.error) toast.error('Couldn’t save your bias', { description: res.error });
  };

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Heart className="size-4 text-primary" />
          Your bias
        </CardTitle>
        <CardDescription className="text-xs">
          {member
            ? `${member.name} turns up in ${pct(boosted)} of cards instead of ${pct(plain)}.`
            : `Pick a favourite and their cards turn up ${BIAS_BOOST} points more often.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select value={bias ?? NONE} onValueChange={choose} disabled={!loaded || saving}>
          <SelectTrigger className="w-full" aria-label={`Your ${group.name} bias`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No bias</SelectItem>
            {group.members.map(m => (
              <SelectItem key={m.code} value={m.code}>
                {/* Member colors are data, so they're set inline rather than as theme tokens. */}
                <span className="size-2 rounded-full" style={{ background: m.color }} />
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}

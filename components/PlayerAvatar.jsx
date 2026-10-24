'use client';

import { cn } from '@/lib/utils';
import { initials } from '@/lib/profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// A player's profile picture, or their initials when they have none (or its signed link has expired).
export default function PlayerAvatar({ username, src, className, fallbackClassName, ...props }) {
  return (
    <Avatar className={className} {...props}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className={cn('font-heading font-semibold', fallbackClassName)}>{initials(username)}</AvatarFallback>
    </Avatar>
  );
}

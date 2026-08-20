import type { ReactNode } from 'react';
import {
  Bell,
  CalendarClock,
  Clock,
  Film,
  Hourglass,
  Mail,
  Shuffle,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';

export function notifIcon(type: string, size = 17): ReactNode {
  switch (type) {
    case 'newfollower':
      return <UserPlus size={size} aria-hidden />;
    case 'participantjoined':
      return <Users size={size} aria-hidden />;
    case 'movieadded':
      return <Film size={size} aria-hidden />;
    case 'moviepicked':
      return <Shuffle size={size} aria-hidden />;
    case 'eventdeleted':
      return <XCircle size={size} aria-hidden />;
    case 'eventreminder1h':
      return <Clock size={size} aria-hidden />;
    case 'eventreminder24h':
      return <CalendarClock size={size} aria-hidden />;
    case 'eventinvitation':
      return <Mail size={size} aria-hidden />;
    case 'eventpending':
      return <Hourglass size={size} aria-hidden />;
    default:
      return <Bell size={size} aria-hidden />;
  }
}

import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ROUTES } from '@/app/routes';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import {
  useDismissCreateEvent,
  useOpenCreateEvent,
} from '@/features/events/components/create-event/createEventDialogContext';
import MyEventsPage from './MyEventsPage';

type ReuseState = { reuseEventSlug?: string; reuseEventTitle?: string } | null;

export default function CreateEvent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const signedIn = !!useAuth().user;
  const openCreateEvent = useOpenCreateEvent();
  const dismissCreateEvent = useDismissCreateEvent();
  const reuseState = location.state as ReuseState;
  const reuseSlug = reuseState?.reuseEventSlug;
  const reuseTitle = reuseState?.reuseEventTitle ?? '';
  const opened = useRef(false);

  useEffect(() => {
    if (!signedIn || opened.current) return;
    opened.current = true;
    openCreateEvent({
      reuse: reuseSlug ? { slug: reuseSlug, title: reuseTitle } : null,
      onClosed: () => navigate(ROUTES.myEvents, { replace: true }),
    });
  }, [signedIn, openCreateEvent, navigate, reuseSlug, reuseTitle]);

  useEffect(
    () => () => {
      opened.current = false;
      dismissCreateEvent();
    },
    [dismissCreateEvent]
  );

  useNoindexPage(pageTitle(t('nav.createEvent')), ROUTES.createEvent);

  return <MyEventsPage />;
}

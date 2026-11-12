import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronUp, Play } from 'lucide-react';
import type {
  MovieCastMember,
  MovieCrewJob,
  MovieCrewMember,
  MovieVideo,
} from '@/features/movies/api/moviesApi';
import Avatar from '@/shared/components/Avatar';
import LinkButton from '@/shared/components/LinkButton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation, type Translate, type TranslationKey } from '@/shared/i18n';
import { crewGroups } from '@/app/pages/movie/moviePageFacts';
import styles from './MovieSections.module.css';

const CAST_PREVIEW_COUNT = 8;

const CREW_LABEL: Record<MovieCrewJob, TranslationKey> = {
  director: 'moviePage.crewDirector',
  creator: 'moviePage.crewCreator',
  writer: 'moviePage.crewWriter',
  composer: 'moviePage.crewComposer',
  photography: 'moviePage.crewPhotography',
};

const VIDEO_TYPE_LABEL: Record<string, TranslationKey> = {
  Trailer: 'moviePage.videoTrailer',
  Teaser: 'moviePage.videoTeaser',
  Clip: 'moviePage.videoClip',
  Featurette: 'moviePage.videoFeaturette',
};

function Section({
  title,
  action,
  children,
}: Readonly<{ title: string; action?: ReactNode; children: ReactNode }>) {
  const headingId = useId();
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <div className={styles.sectionHead}>
        <h2 id={headingId} className={styles.sectionTitle}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MovieSynopsis({
  overview,
  tagline,
}: Readonly<{ overview: string | null; tagline: string | null }>) {
  const { t } = useTranslation();
  const textRef = useRef<HTMLParagraphElement>(null);
  const textId = useId();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const node = textRef.current;
    if (!node || expanded) return;
    const measure = () => setOverflows(node.scrollHeight > node.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [overview, expanded]);

  return (
    <Section title={t('moviePage.synopsis')}>
      {tagline ? <p className={styles.tagline}>« {tagline} »</p> : null}
      {overview ? (
        <>
          <p
            id={textId}
            ref={textRef}
            className={clsx(styles.overview, !expanded && styles.overviewClamped)}
          >
            {overview}
          </p>
          {overflows || expanded ? (
            <LinkButton
              size="sm"
              className={styles.readMore}
              aria-expanded={expanded}
              aria-controls={textId}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? t('moviePage.readLess') : t('moviePage.readMore')}
              {expanded ? (
                <ChevronUp aria-hidden size={ICON_SIZE.sm} />
              ) : (
                <ChevronDown aria-hidden size={ICON_SIZE.sm} />
              )}
            </LinkButton>
          ) : null}
        </>
      ) : (
        <p className={styles.muted}>{t('moviePage.synopsisEmpty')}</p>
      )}
    </Section>
  );
}

function videoSubtitle(video: MovieVideo, t: Translate): string {
  const typeKey = VIDEO_TYPE_LABEL[video.type];
  const type = typeKey ? t(typeKey) : video.type;
  const language =
    video.language === 'fr' ? t('moviePage.videoFrench') : t('moviePage.videoOriginal');
  return `${type}, ${language}`;
}

export function MovieVideos({
  videos,
  onPlay,
}: Readonly<{ videos: MovieVideo[]; onPlay: (video: MovieVideo) => void }>) {
  const { t } = useTranslation();
  if (videos.length === 0) return null;
  return (
    <Section title={t(videos.length === 1 ? 'moviePage.videosOne' : 'moviePage.videosMany')}>
      <ul className={styles.videos}>
        {videos.map((video) => (
          <li key={video.key}>
            <button
              type="button"
              className={styles.video}
              onClick={() => onPlay(video)}
              aria-label={t('moviePage.playVideoAria', { name: video.name })}
            >
              <span className={styles.videoThumb}>
                <img
                  src={`https://i.ytimg.com/vi/${encodeURIComponent(video.key)}/hqdefault.jpg`}
                  alt=""
                  loading="lazy"
                  className={styles.videoImg}
                />
                <span className={styles.videoPlay} aria-hidden>
                  <Play size={ICON_SIZE.lg} />
                </span>
              </span>
              <span className={styles.videoName}>{video.name}</span>
              <span className={styles.videoMeta}>{videoSubtitle(video, t)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function CastFace({ member }: Readonly<{ member: MovieCastMember }>) {
  if (member.profilePath) {
    return <img src={member.profilePath} alt="" loading="lazy" className={styles.face} />;
  }
  return <Avatar avatarId={null} pseudo={member.name} size="lg" />;
}

export function MovieCast({ cast }: Readonly<{ cast: MovieCastMember[] }>) {
  const { t } = useTranslation();
  const listId = useId();
  const [showAll, setShowAll] = useState(false);
  if (cast.length === 0) return null;
  const visible = showAll ? cast : cast.slice(0, CAST_PREVIEW_COUNT);
  const canToggle = cast.length > CAST_PREVIEW_COUNT;
  return (
    <Section
      title={t('moviePage.cast')}
      action={
        canToggle ? (
          <LinkButton
            size="sm"
            aria-expanded={showAll}
            aria-controls={listId}
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll ? t('moviePage.castShowLess') : t('moviePage.castShowAll')}
          </LinkButton>
        ) : undefined
      }
    >
      <ul id={listId} className={styles.cast}>
        {visible.map((member, index) => (
          <li key={`${member.name}-${member.character ?? index}`} className={styles.person}>
            <CastFace member={member} />
            <span className={styles.personText}>
              <span className={styles.personName}>{member.name}</span>
              {member.character ? (
                <span className={styles.personRole}>{member.character}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function MovieCrew({ crew }: Readonly<{ crew: MovieCrewMember[] }>) {
  const { t } = useTranslation();
  const groups = crewGroups(crew);
  if (groups.length === 0) return null;
  return (
    <Section title={t('moviePage.crew')}>
      <dl className={styles.crew}>
        {groups.map((group) => (
          <div key={group.job} className={styles.crewRow}>
            <dt className={styles.crewJob}>{t(CREW_LABEL[group.job])}</dt>
            <dd className={styles.crewNames}>{group.names.join(', ')}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

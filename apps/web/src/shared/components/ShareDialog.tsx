import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import clsx from 'clsx';
import { Check, ChevronLeft, Copy, Download, Maximize2, RefreshCw, Share2, X } from 'lucide-react';
import QrCode from '@/shared/components/QrCode';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useShareAction, type ShareSurface } from '@/shared/hooks/useShareAction';
import { downloadBlob } from '@/shared/utils/downloadBlob';
import { useTranslation } from '@/shared/i18n';
import Button from './Button';
import IconButton from './IconButton';
import Avatar from './Avatar';
import Modal, { ModalActions } from './Modal';
import PersonRow from './PersonRow';
import ResponsiveDialog from './ResponsiveDialog';
import styles from './ShareDialog.module.css';
import { ICON_SIZE } from './iconSize';

export type ShareView = 'main' | 'qr' | 'extra';

export interface ShareQrImage {
  status: 'pending' | 'ready' | 'error';
  blob: Blob | null;
  retry: () => void;
}

export interface ShareCard {
  name: string;
  detail: string;
}

export interface ShareIdentity {
  avatarId: string | null;
  name: string;
  detail: string;
}

export interface ShareExtraView {
  triggerLabel: string;
  triggerIcon: ReactNode;
  title: string;
  body: ReactNode;
  footer?: ReactNode;
}

export interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
  qrTitle: string;
  card: ShareCard;
  qrImage: ShareQrImage;
  imageFileName: string;
  shareText?: string;
  analyticsSurface: ShareSurface;
  identity?: ShareIdentity;
  extraView?: ShareExtraView;
  onViewChange?: (view: ShareView) => void;
  fixedHeight?: boolean;
  children?: ReactNode;
}

export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '');
}

function saveImageAction(qrImage: ShareQrImage, fileName: string) {
  return () => {
    if (qrImage.status === 'error') {
      qrImage.retry();
      return;
    }
    if (qrImage.blob) downloadBlob(qrImage.blob, fileName);
  };
}

function ImageError({ qrImage }: Readonly<{ qrImage: ShareQrImage }>) {
  const { t } = useTranslation();
  if (qrImage.status !== 'error') return null;
  return (
    <p className={styles.imageError} role="alert">
      {t('share.imageError')}
    </p>
  );
}

function SaveImageButton({
  qrImage,
  onSave,
  fullWidth = false,
}: Readonly<{ qrImage: ShareQrImage; onSave: () => void; fullWidth?: boolean }>) {
  const { t } = useTranslation();
  const failed = qrImage.status === 'error';
  const Icon = failed ? RefreshCw : Download;
  return (
    <Button
      type="button"
      variant="primary"
      fullWidth={fullWidth}
      disabled={qrImage.status === 'pending'}
      onClick={onSave}
    >
      <Icon size={ICON_SIZE.md} aria-hidden />
      {failed ? t('common.retry') : t('share.saveImage')}
    </Button>
  );
}

function QrCardView({
  url,
  qrTitle,
  card,
  qrImage,
  className,
}: Readonly<{
  url: string;
  qrTitle: string;
  card: ShareCard;
  qrImage: ShareQrImage;
  className?: string;
}>) {
  return (
    <div className={clsx(styles.cardView, className)}>
      <QrCode value={url} title={qrTitle} className={styles.qrLarge} />
      <p className={styles.cardName}>{card.name}</p>
      <p className={styles.cardDetail}>{card.detail}</p>
      <ImageError qrImage={qrImage} />
    </div>
  );
}

function QrFullscreen({
  open,
  onClose,
  url,
  qrTitle,
  card,
  qrImage,
  onSave,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  url: string;
  qrTitle: string;
  card: ShareCard;
  qrImage: ShareQrImage;
  onSave: () => void;
}>) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel={t('share.qrView')}
      className={styles.fullscreen}
    >
      <div className={styles.fullscreenTop}>
        <IconButton size="lg" ariaLabel={t('common.close')} onClick={onClose}>
          <X aria-hidden size={ICON_SIZE.lg} />
        </IconButton>
      </div>
      <QrCardView
        url={url}
        qrTitle={qrTitle}
        card={card}
        qrImage={qrImage}
        className={styles.fullscreenMiddle}
      />
      <div className={styles.fullscreenBottom}>
        <SaveImageButton qrImage={qrImage} onSave={onSave} fullWidth />
      </div>
    </Modal>
  );
}

function LinkBlock({
  url,
  title,
  qrTitle,
  shareText,
  analyticsSurface,
  qrImage,
  onSave,
  onEnlarge,
  extraView,
  onOpenExtra,
  enlargeRef,
  extraTriggerRef,
}: Readonly<{
  url: string;
  title: string;
  qrTitle: string;
  shareText: string | undefined;
  analyticsSurface: ShareSurface;
  qrImage: ShareQrImage;
  onSave: () => void;
  onEnlarge: () => void;
  extraView: ShareExtraView | undefined;
  onOpenExtra: () => void;
  enlargeRef: RefObject<HTMLButtonElement | null>;
  extraTriggerRef: RefObject<HTMLButtonElement | null>;
}>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const imageFailed = qrImage.status === 'error';
  const SaveIcon = imageFailed ? RefreshCw : Download;
  const { copied, copyLink, nativeShare, canNativeShare } = useShareAction(
    url,
    title,
    shareText,
    analyticsSurface
  );
  const shareFirst = isMobile && canNativeShare;
  const copyLabel = copied ? t('share.copied') : t('share.copy');
  const CopyIcon = copied ? Check : Copy;

  return (
    <div className={styles.top}>
      <button
        ref={enlargeRef}
        type="button"
        className={styles.qrButton}
        aria-label={t('share.enlargeQr')}
        onClick={onEnlarge}
      >
        <QrCode value={url} title={qrTitle} className={styles.qrSmall} />
        <span className={styles.qrZoom} aria-hidden="true">
          <Maximize2 size={ICON_SIZE.sm} />
        </span>
      </button>
      <div className={styles.side}>
        <div className={styles.linkField}>
          <span className={styles.linkText}>{displayUrl(url)}</span>
          {shareFirst ? (
            <IconButton ariaLabel={copyLabel} onClick={() => void copyLink()}>
              <CopyIcon size={ICON_SIZE.md} aria-hidden />
            </IconButton>
          ) : null}
        </div>
        {shareFirst ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            fullWidth
            onClick={() => void nativeShare()}
          >
            <Share2 size={ICON_SIZE.md} aria-hidden />
            {t('share.trigger')}
          </Button>
        ) : (
          <Button
            type="button"
            variant={copied ? 'secondary' : 'primary'}
            size="sm"
            fullWidth
            className={clsx(copied && styles.copied)}
            onClick={() => void copyLink()}
          >
            <CopyIcon size={ICON_SIZE.md} aria-hidden />
            {copyLabel}
          </Button>
        )}
        <div className={styles.secondary}>
          {extraView ? (
            <Button ref={extraTriggerRef} type="button" size="sm" onClick={onOpenExtra}>
              {extraView.triggerIcon}
              {extraView.triggerLabel}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={qrImage.status === 'pending'}
            onClick={onSave}
          >
            <SaveIcon size={ICON_SIZE.md} aria-hidden />
            {imageFailed ? t('common.retry') : t('share.downloadQr')}
          </Button>
        </div>
        <ImageError qrImage={qrImage} />
      </div>
      <span className="visually-hidden" role="status" aria-live="polite">
        {copied ? t('share.copied') : ''}
      </span>
    </div>
  );
}

export default function ShareDialog({
  open,
  onClose,
  title,
  url,
  qrTitle,
  card,
  qrImage,
  imageFileName,
  shareText,
  analyticsSurface,
  identity,
  extraView,
  onViewChange,
  fixedHeight = false,
  children,
}: Readonly<ShareDialogProps>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [view, setView] = useState<ShareView>('main');
  const save = saveImageAction(qrImage, imageFileName);
  const backRef = useRef<HTMLButtonElement>(null);
  const enlargeRef = useRef<HTMLButtonElement>(null);
  const extraTriggerRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<RefObject<HTMLButtonElement | null> | null>(null);

  if (!open && view !== 'main') setView('main');

  useEffect(() => {
    onViewChange?.(view);
  }, [view, onViewChange]);

  const qrInSheet = isMobile && view === 'qr';
  const shown: ShareView = qrInSheet ? 'main' : view;

  useEffect(() => {
    if (shown !== 'main') {
      backRef.current?.focus();
      return;
    }
    returnFocusRef.current?.current?.focus();
    returnFocusRef.current = null;
  }, [shown]);

  const openView = (next: ShareView) => {
    returnFocusRef.current = next === 'qr' ? enlargeRef : extraTriggerRef;
    setView(next);
  };
  const back = () => setView('main');
  const backOnEscape = () => {
    if (shown === 'main') return false;
    back();
    return true;
  };

  const titles: Record<ShareView, string> = {
    main: title,
    qr: t('share.qrView'),
    extra: extraView?.title ?? title,
  };

  const footers: Record<ShareView, ReactNode> = {
    main: null,
    qr: (
      <ModalActions>
        <SaveImageButton qrImage={qrImage} onSave={save} />
      </ModalActions>
    ),
    extra: extraView?.footer ? <ModalActions>{extraView.footer}</ModalActions> : null,
  };

  const bodies: Record<ShareView, ReactNode> = {
    main: (
      <div className={clsx(styles.main, fixedHeight && styles.mainFill)}>
        {identity ? (
          <ul className={styles.identity}>
            <PersonRow
              avatar={<Avatar avatarId={identity.avatarId} pseudo={identity.name} size="md" />}
              name={identity.name}
              detail={identity.detail}
            />
          </ul>
        ) : null}
        <LinkBlock
          url={url}
          title={title}
          qrTitle={qrTitle}
          shareText={shareText}
          analyticsSurface={analyticsSurface}
          qrImage={qrImage}
          onSave={save}
          onEnlarge={() => openView('qr')}
          extraView={extraView}
          onOpenExtra={() => openView('extra')}
          enlargeRef={enlargeRef}
          extraTriggerRef={extraTriggerRef}
        />
        {children ? <div className={styles.more}>{children}</div> : null}
      </div>
    ),
    qr: <QrCardView url={url} qrTitle={qrTitle} card={card} qrImage={qrImage} />,
    extra: <div className={styles.extra}>{extraView?.body}</div>,
  };

  return (
    <>
      <ResponsiveDialog
        open={open}
        onClose={onClose}
        onEscape={backOnEscape}
        title={titles[shown]}
        size="sm"
        sheetSize="lg"
        fixedHeight={fixedHeight ? 'lg' : undefined}
        leading={
          shown === 'main' ? undefined : (
            <IconButton ref={backRef} size="lg" ariaLabel={t('share.back')} onClick={back}>
              <ChevronLeft aria-hidden size={ICON_SIZE.xl} />
            </IconButton>
          )
        }
        footer={footers[shown]}
        bodyClassName={styles.body}
      >
        {open ? bodies[shown] : null}
      </ResponsiveDialog>
      {isMobile && open ? (
        <QrFullscreen
          open={qrInSheet}
          onClose={back}
          url={url}
          qrTitle={qrTitle}
          card={card}
          qrImage={qrImage}
          onSave={save}
        />
      ) : null}
    </>
  );
}

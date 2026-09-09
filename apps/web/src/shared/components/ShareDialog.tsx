import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Check, Download, Link2, Share2, X } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import QrCode from '@/shared/components/QrCode';
import Sheet from '@/shared/components/Sheet';
import { Tabs, TabPanel, type TabDef } from '@/shared/components/Tabs';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useShareAction } from '@/shared/hooks/useShareAction';
import { downloadQrPng } from '@/shared/utils/downloadQrPng';
import { useTranslation } from '@/shared/i18n';
import Modal from './Modal';
import styles from './ShareDialog.module.css';
import Button from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';

type ShareSurface = 'event' | 'profile';

export interface ShareDialogTab {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: number;
  content: ReactNode;
}

export interface ShareDialogPreview {
  icon?: ReactNode;
  avatarId?: string | null;
  name: string;
  meta: string[];
}

interface ShareLinkPanelProps {
  url: string;
  title: string;
  shareText: string | undefined;
  qrHint: string;
  fileSlug: string;
  preview: ShareDialogPreview;
  surface: ShareSurface;
}

function ShareLinkPanel({
  url,
  title,
  shareText,
  qrHint,
  fileSlug,
  preview,
  surface,
}: Readonly<ShareLinkPanelProps>) {
  const { t } = useTranslation();
  const { copied, copyLink, nativeShare, canNativeShare } = useShareAction(
    url,
    title,
    shareText,
    surface
  );
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    downloadQrPng(qrRef.current, `movie-picker-qr-${fileSlug}.png`);
  };

  const copyButton = (
    <Button
      type="button"
      size="sm"
      variant={!copied && !canNativeShare ? 'primary' : 'secondary'}
      className={clsx(styles.actionBtn, copied && styles.actionCopied)}
      onClick={() => void copyLink()}
    >
      {copied ? <Check size={15} aria-hidden /> : <Link2 size={15} aria-hidden />}
      <span className={styles.btnLabel}>{copied ? t('share.copied') : t('share.copy')}</span>
    </Button>
  );

  const downloadButton = (
    <Button type="button" size="sm" className={styles.actionBtn} onClick={handleDownload}>
      <Download size={15} aria-hidden />
      <span className={styles.btnLabel}>
        {canNativeShare ? t('share.downloadQr') : t('share.download')}
      </span>
    </Button>
  );

  return (
    <div className={styles.linkPanel}>
      <div className={styles.preview}>
        {preview.icon ? (
          <span className={styles.previewIcon}>{preview.icon}</span>
        ) : (
          <Avatar avatarId={preview.avatarId} pseudo={preview.name} size="md" />
        )}
        <span className={styles.previewText}>
          <span className={styles.previewName}>{preview.name}</span>
          <span className={styles.previewMeta}>
            {preview.meta.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </span>
        </span>
      </div>

      <div className={styles.qrCanvas} ref={qrRef}>
        <QrCode value={url} title={title} />
      </div>
      <p className={styles.hint}>{qrHint}</p>
      <div className={styles.urlField}>
        <code>{url}</code>
      </div>

      {canNativeShare ? (
        <div className={styles.actionsStack}>
          <Button
            type="button"
            variant="primary"
            className={styles.actionBlock}
            onClick={() => void nativeShare()}
          >
            <Share2 size={16} aria-hidden />
            <span className={styles.btnLabel}>{t('share.trigger')}</span>
          </Button>
          <div className={styles.actions}>
            {copyButton}
            {downloadButton}
          </div>
        </div>
      ) : (
        <div className={styles.actions}>
          {copyButton}
          {downloadButton}
        </div>
      )}

      <span className="visually-hidden" role="status" aria-live="polite">
        {copied ? t('share.copied') : ''}
      </span>
    </div>
  );
}

export interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
  qrHint: string;
  fileSlug: string;
  preview: ShareDialogPreview;
  shareText?: string;
  surface: ShareSurface;
  initialTab?: string;
  extraTab?: ShareDialogTab;
}

export default function ShareDialog({
  open,
  onClose,
  title,
  url,
  qrHint,
  fileSlug,
  preview,
  shareText,
  surface,
  initialTab,
  extraTab,
}: Readonly<ShareDialogProps>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const titleId = useId();
  const tabsIdBase = useId();
  const [tab, setTab] = useState<string>('link');

  useEffect(() => {
    if (open) setTab(initialTab ?? 'link');
  }, [open, initialTab]);

  const linkPanel = (
    <ShareLinkPanel
      url={url}
      title={title}
      shareText={shareText}
      qrHint={qrHint}
      fileSlug={fileSlug}
      preview={preview}
      surface={surface}
    />
  );

  const tabDefs: TabDef<string>[] = extraTab
    ? [
        { key: 'link', label: t('share.tabLink') },
        { key: extraTab.id, label: extraTab.label, icon: extraTab.icon, badge: extraTab.badge },
      ]
    : [];

  const tabsBar = extraTab ? (
    <Tabs
      idBase={tabsIdBase}
      tabs={tabDefs}
      active={tab}
      onChange={setTab}
      ariaLabel={title}
      variant="pill"
      className={styles.tabs}
    />
  ) : null;

  const panels = extraTab ? (
    <>
      <TabPanel idBase={tabsIdBase} tabKey="link" active={tab === 'link'}>
        {linkPanel}
      </TabPanel>
      <TabPanel idBase={tabsIdBase} tabKey={extraTab.id} active={tab === extraTab.id}>
        {extraTab.content}
      </TabPanel>
    </>
  ) : (
    linkPanel
  );

  if (isMobile) {
    return (
      <Sheet open={open} title={title} onClose={onClose} size={extraTab ? 'tall' : 'default'}>
        {tabsBar}
        {panels}
      </Sheet>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      column
      labelledBy={titleId}
      className={clsx(extraTab && styles.dialogWithTabs)}
    >
      {open && (
        <>
          <div className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <IconButton className={styles.closeBtn} label={t('common.close')} onClick={onClose}>
              <X size={20} aria-hidden />
            </IconButton>
          </div>
          {tabsBar}
          <div className={styles.body}>{panels}</div>
        </>
      )}
    </Modal>
  );
}

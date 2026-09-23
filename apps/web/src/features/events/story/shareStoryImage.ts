import { downloadBlob } from '@/shared/utils/downloadBlob';
import { STORY_MIME } from './renderStoryImage';

export type ShareStoryOutcome = 'shared' | 'downloaded' | 'cancelled';

export type ShareStoryInput = {
  blob: Blob;
  fileName: string;
  title: string;
  text: string;
  url: string;
};

function storyFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: blob.type || STORY_MIME });
}

function canShareFile(file: File): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  try {
    return navigator.canShare?.({ files: [file] }) === true;
  } catch {
    return false;
  }
}

export function canShareStoryFile(blob: Blob, fileName: string): boolean {
  return canShareFile(storyFile(blob, fileName));
}

export async function shareStoryImage({
  blob,
  fileName,
  title,
  text,
  url,
}: ShareStoryInput): Promise<ShareStoryOutcome> {
  const file = storyFile(blob, fileName);
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title, text, url });
      return 'shared';
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') return 'cancelled';
    }
  }
  downloadBlob(blob, fileName);
  return 'downloaded';
}

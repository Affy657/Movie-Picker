import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/shared/api/apiError';
import {
  AvatarPhotoFileRejection,
  checkAvatarPhotoFile,
  type AvatarPhotoFileError,
  type LoadedAvatarPhoto,
} from '@/features/auth/utils/avatarPhotoFile';

type Options = {
  open: boolean;
  load: (file: File) => Promise<LoadedAvatarPhoto>;
  fileErrorMessage: (reason: AvatarPhotoFileError) => string;
  onDeletePhoto: () => Promise<void>;
  deleteFailedMessage: string;
};

export function apiReasonMessage(error: unknown): string | null {
  return ApiError.is(error) && error.reason ? error.message : null;
}

function keepDroppedFilesInTheApp(event: DragEvent) {
  event.preventDefault();
}

export function usePhotoUpload({
  open,
  load,
  fileErrorMessage,
  onDeletePhoto,
  deleteFailedMessage,
}: Options) {
  const [cropPhoto, setCropPhoto] = useState<LoadedAvatarPhoto | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRequest = useRef(0);

  useEffect(() => {
    if (!open) return;
    globalThis.addEventListener('dragover', keepDroppedFilesInTheApp);
    globalThis.addEventListener('drop', keepDroppedFilesInTheApp);
    return () => {
      globalThis.removeEventListener('dragover', keepDroppedFilesInTheApp);
      globalThis.removeEventListener('drop', keepDroppedFilesInTheApp);
    };
  }, [open]);

  function closeCrop() {
    if (cropPhoto) URL.revokeObjectURL(cropPhoto.url);
    setCropPhoto(null);
  }

  async function handleFile(file: File) {
    const request = ++fileRequest.current;
    const fileError = checkAvatarPhotoFile(file);
    if (fileError) {
      setPanelError(fileErrorMessage(fileError));
      return;
    }
    setPanelError(null);
    try {
      const photo = await load(file);
      if (request === fileRequest.current) setCropPhoto(photo);
      else URL.revokeObjectURL(photo.url);
    } catch (error) {
      if (request !== fileRequest.current) return;
      const reason = error instanceof AvatarPhotoFileRejection ? error.reason : 'unsupported';
      setPanelError(fileErrorMessage(reason));
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDeletePhoto();
      setPanelError(null);
    } catch {
      setPanelError(deleteFailedMessage);
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return {
    cropPhoto,
    panelError,
    confirmingDelete,
    deleting,
    closeCrop,
    handleFile,
    handleDelete,
    askToDelete: () => setConfirmingDelete(true),
    cancelDelete: () => setConfirmingDelete(false),
  };
}

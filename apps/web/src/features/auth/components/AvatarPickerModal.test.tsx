import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AvatarPickerModal from '@/features/auth/components/AvatarPickerModal';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { ApiError } from '@/shared/api/apiError';
import {
  AvatarPhotoFileRejection,
  loadAvatarPhoto,
  renderAvatarPhoto,
} from '@/features/auth/utils/avatarPhotoFile';

vi.mock('@/features/auth/utils/avatarPhotoFile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/auth/utils/avatarPhotoFile')>();
  return { ...actual, loadAvatarPhoto: vi.fn(), renderAvatarPhoto: vi.fn() };
});

const PHOTO_ID = 'photo:0123456789abcdef0123456789abcdef';

beforeEach(() => {
  vi.mocked(loadAvatarPhoto).mockReset();
  vi.mocked(renderAvatarPhoto).mockReset();
  vi.mocked(loadAvatarPhoto).mockImplementation(async () => ({
    image: document.createElement('img'),
    url: 'blob:photo',
    width: 800,
    height: 600,
  }));
  vi.mocked(renderAvatarPhoto).mockResolvedValue(new Blob(['webp'], { type: 'image/webp' }));
});

type Overrides = Partial<React.ComponentProps<typeof AvatarPickerModal>>;

function renderPicker(overrides: Overrides = {}) {
  const props = {
    open: true,
    currentAvatarId: '',
    photoAvatarId: null,
    generatedAvatarId: '',
    onSelect: vi.fn().mockResolvedValue(undefined),
    onUploadPhoto: vi.fn().mockResolvedValue(undefined),
    onDeletePhoto: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
    ...overrides,
  };
  render(
    <AppTestProviders>
      <AvatarPickerModal {...props} />
    </AppTestProviders>
  );
  return props;
}

function jpeg(name = 'photo.jpg', bytes = 2048, type = 'image/jpeg') {
  return new File([new Uint8Array(bytes)], name, { type });
}

async function choose(file: File) {
  fireEvent.change(screen.getByTestId('avatar-photo-input'), { target: { files: [file] } });
  await waitFor(() => expect(loadAvatarPhoto).toHaveBeenCalled());
}

describe('AvatarPickerModal, photo tab', () => {
  it('puts the photo tab first, before the robots and the emojis', () => {
    renderPicker();

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      '📷 Ma photo',
      '🤖 Robots',
      '😄 Emoji',
    ]);
  });

  it('opens on the photo tab when there is no avatar yet', () => {
    renderPicker();

    expect(screen.getByRole('tab', { name: '📷 Ma photo' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByText('Ajoutez votre photo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choisir une photo' })).toBeInTheDocument();
  });

  it('opens on the robots when a robot is the avatar', () => {
    renderPicker({ currentAvatarId: 'bolt' });

    expect(screen.getByRole('tab', { name: '🤖 Robots' })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens the crop step once a photo is chosen', async () => {
    renderPicker();

    await choose(jpeg());

    expect(await screen.findByRole('heading', { name: 'Recadrer la photo' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(
      screen.getByText('Faites glisser la photo pour la placer dans le cercle.')
    ).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Zoom' })).toBeInTheDocument();
  });

  it('refuses a file over 10 MB before reading it', async () => {
    renderPicker();

    fireEvent.change(screen.getByTestId('avatar-photo-input'), {
      target: { files: [jpeg('big.jpg', 10 * 1024 * 1024 + 1)] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cette image dépasse 10 Mo. Choisissez-en une plus légère.'
    );
    expect(loadAvatarPhoto).not.toHaveBeenCalled();
  });

  it('refuses an unsupported format', async () => {
    renderPicker();

    fireEvent.change(screen.getByTestId('avatar-photo-input'), {
      target: { files: [jpeg('anim.gif', 2048, 'image/gif')] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ce format n’est pas pris en charge. Choisissez une image JPEG, PNG ou WebP.'
    );
  });

  it('refuses a photo that is too small', async () => {
    vi.mocked(loadAvatarPhoto).mockRejectedValue(new AvatarPhotoFileRejection('tooSmall'));
    renderPicker();

    await choose(jpeg());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cette image est trop petite. Choisissez-en une d’au moins 128 pixels de côté.'
    );
  });

  it('accepts a dropped image', async () => {
    renderPicker();

    fireEvent.drop(screen.getByTestId('avatar-photo-dropzone'), {
      dataTransfer: { files: [jpeg()] },
    });

    expect(await screen.findByRole('heading', { name: 'Recadrer la photo' })).toBeInTheDocument();
  });

  it('cancelling the crop changes nothing', async () => {
    const props = renderPicker();
    await choose(jpeg());

    await userEvent.click(await screen.findByRole('button', { name: 'Annuler' }));

    expect(screen.getByRole('tab', { name: '📷 Ma photo' })).toBeInTheDocument();
    expect(props.onUploadPhoto).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('uploads the cropped photo and closes', async () => {
    const props = renderPicker();
    await choose(jpeg());

    await userEvent.click(await screen.findByRole('button', { name: 'Utiliser cette photo' }));

    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
    expect(props.onUploadPhoto).toHaveBeenCalledWith(expect.any(Blob));
    expect(vi.mocked(renderAvatarPhoto).mock.calls[0]![1].size).toBeGreaterThan(0);
  });

  it('keeps the crop open with a message when the upload fails, and lets the user retry', async () => {
    const onUploadPhoto = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('down', { code: 503 }))
      .mockResolvedValueOnce(undefined);
    const props = renderPicker({ onUploadPhoto });
    await choose(jpeg());

    await userEvent.click(await screen.findByRole('button', { name: 'Utiliser cette photo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La photo n’a pas pu être enregistrée. Vérifiez votre connexion, puis réessayez.'
    );
    expect(props.onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Utiliser cette photo' }));

    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
  });

  it('says why the server refused the photo', async () => {
    renderPicker({
      onUploadPhoto: vi.fn().mockRejectedValue(
        new ApiError('Cette image ne peut pas servir de photo de profil.', {
          code: 400,
          reason: 'avatar_photo_invalid',
        })
      ),
    });
    await choose(jpeg());

    await userEvent.click(await screen.findByRole('button', { name: 'Utiliser cette photo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cette image ne peut pas servir de photo de profil.'
    );
  });

  it('crops the last photo chosen when an earlier one is still being read', async () => {
    let finishFirst: (photo: Awaited<ReturnType<typeof loadAvatarPhoto>>) => void = () => {};
    vi.mocked(loadAvatarPhoto)
      .mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)))
      .mockImplementationOnce(async () => ({
        image: document.createElement('img'),
        url: 'blob:second',
        width: 800,
        height: 600,
      }));
    renderPicker();

    await choose(jpeg('first.jpg'));
    fireEvent.change(screen.getByTestId('avatar-photo-input'), {
      target: { files: [jpeg('second.jpg')] },
    });
    const image = await screen.findByTestId('avatar-photo-crop-image');
    await act(async () =>
      finishFirst({
        image: document.createElement('img'),
        url: 'blob:first',
        width: 800,
        height: 600,
      })
    );

    expect(image).toHaveAttribute('src', 'blob:second');
  });

  it('asks to wait after too many uploads', async () => {
    renderPicker({
      onUploadPhoto: vi.fn().mockRejectedValue(new ApiError('slow down', { code: 429 })),
    });
    await choose(jpeg());

    await userEvent.click(await screen.findByRole('button', { name: 'Utiliser cette photo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Vous avez changé de photo plusieurs fois de suite. Réessayez dans quelques minutes.'
    );
  });

  describe('when the crop frame changes size', () => {
    let frameWidth = 320;
    let notifyResize: () => void = () => {};

    beforeEach(() => {
      frameWidth = 320;
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: HTMLElement
      ) {
        const side = this.closest('[role="group"]') ? frameWidth : 0;
        return { width: side, height: side, top: 0, left: 0, right: side, bottom: side } as DOMRect;
      });
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(callback: () => void) {
            notifyResize = callback;
          }
          observe() {}
          disconnect() {}
        }
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('scales the photo with the frame, so the circle keeps the same part of it', async () => {
      renderPicker();
      await choose(jpeg());
      const image = await screen.findByTestId('avatar-photo-crop-image');
      expect(image.style.height).toBe('320px');

      frameWidth = 160;
      act(() => notifyResize());

      expect(image.style.height).toBe('160px');
    });
  });

  it('moves the photo with the arrow keys', async () => {
    renderPicker();
    await choose(jpeg());
    const area = await screen.findByRole('group', { name: 'Position de la photo dans le cercle' });
    const image = within(area).getByTestId('avatar-photo-crop-image');
    const before = image.style.transform;

    fireEvent.keyDown(area, { key: 'ArrowLeft' });

    expect(image.style.transform).not.toBe(before);
  });

  it('follows a drag even when the browser refuses to capture the pointer', async () => {
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: () => {
        throw new DOMException('The object can not be found here.', 'NotFoundError');
      },
    });
    renderPicker();
    await choose(jpeg());
    const area = await screen.findByRole('group', { name: 'Position de la photo dans le cercle' });
    const image = within(area).getByTestId('avatar-photo-crop-image');
    const before = image.style.transform;

    fireEvent.pointerDown(area, { pointerId: 3, buttons: 1, clientX: 160, clientY: 160 });
    fireEvent.pointerMove(area, { pointerId: 3, buttons: 1, clientX: 100, clientY: 160 });

    expect(image.style.transform).not.toBe(before);
    Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture');
  });

  it('stops following the pointer once the button is released outside the frame', async () => {
    Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture');
    renderPicker();
    await choose(jpeg());
    const area = await screen.findByRole('group', { name: 'Position de la photo dans le cercle' });
    const image = within(area).getByTestId('avatar-photo-crop-image');
    fireEvent.pointerDown(area, {
      pointerId: 4,
      pointerType: 'mouse',
      buttons: 1,
      clientX: 160,
      clientY: 160,
    });
    fireEvent.pointerMove(area, {
      pointerId: 4,
      pointerType: 'mouse',
      buttons: 1,
      clientX: 140,
      clientY: 160,
    });
    const afterDrag = image.style.transform;

    fireEvent.pointerMove(area, {
      pointerId: 4,
      pointerType: 'mouse',
      buttons: 0,
      clientX: 60,
      clientY: 160,
    });

    expect(image.style.transform).toBe(afterDrag);
  });

  it('shows the active photo as selected, with who can see it', () => {
    renderPicker({ currentAvatarId: PHOTO_ID, photoAvatarId: PHOTO_ID, generatedAvatarId: 'bolt' });

    expect(screen.getByRole('radio', { name: 'Utiliser ma photo' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByText('Visible sur votre profil et dans vos soirées.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remplacer' })).toBeInTheDocument();
  });

  it('keeps a photo set aside while a robot is the avatar, and selecting it brings it back', async () => {
    const props = renderPicker({
      currentAvatarId: 'bolt',
      photoAvatarId: PHOTO_ID,
      generatedAvatarId: 'bolt',
    });
    await userEvent.click(screen.getByRole('tab', { name: '📷 Ma photo' }));

    const tile = screen.getByRole('radio', { name: 'Utiliser ma photo' });
    expect(tile).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Sélectionnez-la pour l’utiliser comme avatar.')).toBeInTheDocument();

    await userEvent.click(tile);

    expect(props.onSelect).toHaveBeenCalledWith(PHOTO_ID);
    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
  });

  it('stays open and says why when the chosen avatar could not be saved', async () => {
    const props = renderPicker({
      currentAvatarId: 'bolt',
      photoAvatarId: PHOTO_ID,
      generatedAvatarId: 'bolt',
      onSelect: vi.fn().mockRejectedValue(
        new ApiError('Cette photo n’existe plus. Ajoutez-en une nouvelle.', {
          code: 404,
          reason: 'avatar_photo_not_found',
        })
      ),
    });
    await userEvent.click(screen.getByRole('tab', { name: '📷 Ma photo' }));

    await userEvent.click(screen.getByRole('radio', { name: 'Utiliser ma photo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cette photo n’existe plus. Ajoutez-en une nouvelle.'
    );
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('stays open with a generic message when a robot could not be saved', async () => {
    const props = renderPicker({
      currentAvatarId: 'bolt',
      onSelect: vi.fn().mockRejectedValue(new ApiError('down', { code: 503 })),
    });

    await userEvent.click(screen.getByRole('radio', { name: 'Choisir l’avatar alpha' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'L’avatar n’a pas pu être enregistré. Vérifiez votre connexion, puis réessayez.'
    );
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('replacing the photo goes through the crop step again', async () => {
    renderPicker({ currentAvatarId: PHOTO_ID, photoAvatarId: PHOTO_ID, generatedAvatarId: 'bolt' });

    await choose(jpeg());

    expect(await screen.findByRole('heading', { name: 'Recadrer la photo' })).toBeInTheDocument();
  });

  it.each([
    [PHOTO_ID, 'bolt', 'Votre avatar précédent reprend sa place.'],
    [PHOTO_ID, '', 'Vos initiales reprennent leur place.'],
    ['bolt', 'bolt', 'Elle disparaît de vos avatars.'],
  ])(
    'confirms before deleting (current %s, generated %s)',
    async (currentAvatarId, generatedAvatarId, message) => {
      const props = renderPicker({ currentAvatarId, photoAvatarId: PHOTO_ID, generatedAvatarId });
      await userEvent.click(screen.getByRole('tab', { name: '📷 Ma photo' }));

      await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
      const dialog = await screen.findByTestId('avatar-photo-delete');
      expect(within(dialog).getByText('Supprimer votre photo ?')).toBeInTheDocument();
      expect(within(dialog).getByText(message)).toBeInTheDocument();

      await userEvent.click(within(dialog).getByRole('button', { name: 'Supprimer la photo' }));

      await waitFor(() => expect(props.onDeletePhoto).toHaveBeenCalled());
    }
  );

  it('says so when the deletion fails', async () => {
    renderPicker({
      currentAvatarId: PHOTO_ID,
      photoAvatarId: PHOTO_ID,
      generatedAvatarId: 'bolt',
      onDeletePhoto: vi.fn().mockRejectedValue(new ApiError('down', { code: 503 })),
    });

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    const dialog = await screen.findByTestId('avatar-photo-delete');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Supprimer la photo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La photo n’a pas pu être supprimée. Vérifiez votre connexion, puis réessayez.'
    );
  });
});

describe('AvatarPickerModal, robots and emojis', () => {
  const avatarRadio = (id: string) => screen.getByRole('radio', { name: `Choisir l’avatar ${id}` });

  it('moves the selection with the arrows without saving or closing', async () => {
    const user = userEvent.setup();
    const props = renderPicker({ currentAvatarId: 'alpha' });

    avatarRadio('alpha').focus();
    await user.keyboard('{ArrowRight}');

    expect(avatarRadio('beta')).toHaveFocus();
    expect(avatarRadio('beta')).toHaveAttribute('aria-checked', 'true');
    expect(props.onSelect).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('saves the avatar reached with the arrows once it is activated', async () => {
    const user = userEvent.setup();
    const props = renderPicker({ currentAvatarId: 'alpha' });

    avatarRadio('alpha').focus();
    await user.keyboard('{ArrowRight}{ArrowRight}{Enter}');

    expect(props.onSelect).toHaveBeenCalledExactlyOnceWith('bolt');
  });

  it('saves the clicked avatar', async () => {
    const user = userEvent.setup();
    const props = renderPicker({ currentAvatarId: 'alpha' });

    await user.click(avatarRadio('gamma'));

    expect(props.onSelect).toHaveBeenCalledExactlyOnceWith('gamma');
  });

  it('drops the browsed avatar when the dialog is closed without saving', async () => {
    const user = userEvent.setup();
    const props = renderPicker({ currentAvatarId: 'alpha' });

    avatarRadio('alpha').focus();
    await user.keyboard('{ArrowRight}');
    await user.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onSelect).not.toHaveBeenCalled();
    expect(avatarRadio('alpha')).toHaveAttribute('aria-checked', 'true');
  });
});

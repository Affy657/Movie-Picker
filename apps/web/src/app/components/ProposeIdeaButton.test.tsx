import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { LocaleProvider } from '@/shared/i18n';
import { TEST_API_V1 } from '@/mocks/handlers';
import ProposeIdeaButton from '@/app/components/ProposeIdeaButton';
import styles from '@/app/components/ProposeIdeaButton.module.css';

function renderButton(path = '/e/soiree-cine') {
  return render(
    <LocaleProvider>
      <MemoryRouter initialEntries={[path]}>
        <ProposeIdeaButton />
      </MemoryRouter>
    </LocaleProvider>
  );
}

async function openDialog() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /proposer une idée/i }));
  return user;
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(/titre/i), 'Ajouter un mode battle');
  await user.type(screen.getByLabelText(/description/i), 'Ce serait top !');
}

function pngFile(name = 'screenshot.png', sizeBytes = 100): File {
  return new File([new Uint8Array(sizeBytes)], name, { type: 'image/png' });
}

describe('ProposeIdeaButton', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeAll(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
  });

  beforeEach(() => {
    globalThis.URL.createObjectURL = () => 'blob:mock';
    globalThis.URL.revokeObjectURL = () => {};
  });

  it('la boîte de dialogue est fermée au départ', () => {
    const { container } = renderButton();
    expect(container.querySelector('dialog')).toBeNull();
  });

  it('ouvre la boîte de dialogue au clic et affiche le formulaire', async () => {
    const { container } = renderButton();
    await openDialog();

    await waitFor(() => {
      expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(true);
    });
    expect(screen.getByLabelText(/catégorie/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/titre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('envoie la suggestion et affiche la confirmation', async () => {
    let receivedBody: unknown = null;
    server.use(
      http.post(`${TEST_API_V1}/idea-suggestions`, async ({ request }) => {
        receivedBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderButton('/e/soiree-cine');
    const user = await openDialog();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /envoyer/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/merci/i);
    });
    expect(receivedBody).toMatchObject({
      category: 'idea',
      title: 'Ajouter un mode battle',
      description: 'Ce serait top !',
      pagePath: '/e/soiree-cine',
    });
  });

  it('envoie la catégorie sélectionnée (Bug) plutôt que la valeur par défaut', async () => {
    let receivedBody: unknown = null;
    server.use(
      http.post(`${TEST_API_V1}/idea-suggestions`, async ({ request }) => {
        receivedBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderButton();
    const user = await openDialog();
    await user.click(screen.getByLabelText(/catégorie/i));
    await user.click(await screen.findByRole('option', { name: /^bug$/i }));
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /envoyer/i }));

    await waitFor(() => {
      expect(receivedBody).toMatchObject({ category: 'bug' });
    });
  });

  it("affiche une erreur explicite et garde le texte saisi si l'envoi échoue", async () => {
    server.use(
      http.post(`${TEST_API_V1}/idea-suggestions`, () =>
        HttpResponse.json(
          { error: 'Impossible de créer la suggestion pour le moment.' },
          { status: 503 }
        )
      )
    );

    renderButton();
    const user = await openDialog();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /envoyer/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/impossible de créer la suggestion/i);
    });
    expect(screen.getByLabelText(/titre/i)).toHaveValue('Ajouter un mode battle');
  });

  it('ajoute une image via le sélecteur de fichier puis peut la retirer', async () => {
    renderButton();
    const user = await openDialog();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, pngFile());

    expect(await screen.findByRole('button', { name: /retirer cette image/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retirer cette image/i }));

    expect(screen.queryByRole('button', { name: /retirer cette image/i })).not.toBeInTheDocument();
  });

  it("garde le bouton d'envoi hors de la zone défilante quand une image est ajoutée", async () => {
    renderButton();
    const user = await openDialog();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, pngFile());
    await screen.findByRole('button', { name: /retirer cette image/i });

    const scrollArea = document.querySelector(`.${styles.body}`);
    expect(scrollArea).not.toBeNull();
    expect(scrollArea).toContainElement(screen.getByLabelText(/description/i));

    const submit = screen.getByRole('button', { name: /envoyer/i });
    expect(scrollArea).not.toContainElement(submit);
    expect(submit.closest(`.${styles.actions}`)).not.toBeNull();
  });

  it("refuse un fichier d'un format non supporté", async () => {
    renderButton();
    const user = await openDialog();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const textFile = new File(['x'], 'note.txt', { type: 'text/plain' });
    await user.upload(input, textFile);

    expect(screen.queryByRole('button', { name: /retirer cette image/i })).not.toBeInTheDocument();
  });

  it('refuse au-delà de 4 images et affiche un message explicite', async () => {
    renderButton();
    const user = await openDialog();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [
      pngFile('a.png'),
      pngFile('b.png'),
      pngFile('c.png'),
      pngFile('d.png'),
      pngFile('e.png'),
    ];
    await user.upload(input, files);

    expect(await screen.findByRole('alert')).toHaveTextContent(/4 images maximum/i);
    expect(screen.getAllByRole('button', { name: /retirer cette image/i })).toHaveLength(4);
  });

  it('envoie les pièces jointes en base64 avec la suggestion', async () => {
    type ReceivedBody = {
      attachments?: { fileName: string; contentType: string; base64Content: string }[];
    };
    let resolveReceived: (body: ReceivedBody) => void;
    const receivedBody = new Promise<ReceivedBody>((resolve) => {
      resolveReceived = resolve;
    });
    server.use(
      http.post(`${TEST_API_V1}/idea-suggestions`, async ({ request }) => {
        resolveReceived((await request.json()) as ReceivedBody);
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderButton();
    const user = await openDialog();
    await fillForm(user);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, pngFile('capture.png'));
    await screen.findByRole('button', { name: /retirer cette image/i });

    await user.click(screen.getByRole('button', { name: /envoyer/i }));

    const body = await receivedBody;
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments?.[0]).toMatchObject({
      fileName: 'capture.png',
      contentType: 'image/png',
    });
    expect(body.attachments?.[0]?.base64Content.length).toBeGreaterThan(0);
  });

  it('se ferme via le bouton de fermeture', async () => {
    const { container } = renderButton();
    const user = await openDialog();

    await waitFor(() => {
      expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(true);
    });

    await user.click(screen.getByRole('button', { name: /^fermer$/i }));

    await waitFor(() => {
      expect(container.querySelector('dialog')).toBeNull();
    });
  });
});

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { LocaleProvider } from '@/shared/i18n';
import { TEST_API_V1 } from '@/mocks/handlers';
import ProposeIdeaButton from '@/app/components/ProposeIdeaButton';
import modalStyles from '@/shared/components/Modal.module.css';
import sheetStyles from '@/shared/components/Sheet.module.css';
import { stubMatchMedia } from '@/test-utils/matchMedia';

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

describe('ProposeIdeaButton', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
  });
  afterAll(() => server.close());

  beforeAll(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
  });

  it('opens as a sheet on a phone and still sends from its footer button', async () => {
    stubMatchMedia((query) => query.includes('max-width'));
    let received: unknown = null;
    server.use(
      http.post(`${TEST_API_V1}/idea-suggestions`, async ({ request }) => {
        received = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );
    renderButton();
    const user = await openDialog();

    expect(await screen.findByRole('dialog', { name: /proposer une idée/i })).toHaveClass(
      sheetStyles.dialog!
    );
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /envoyer/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/merci/i);
    });
    expect(received).toMatchObject({ title: 'Ajouter un mode battle' });
  });

  it('the dialog is closed at first', () => {
    const { container } = renderButton();
    expect(container.querySelector('dialog')).toBeNull();
  });

  it('opens the dialog on click and shows the form', async () => {
    const { container } = renderButton();
    await openDialog();

    await waitFor(() => {
      expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(true);
    });
    expect(screen.getByLabelText(/catégorie/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/titre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('warns before sending that the suggestion becomes a public GitHub issue', async () => {
    renderButton();
    await openDialog();

    const notice = await screen.findByText(/ticket public sur GitHub/i);
    expect(notice).not.toHaveTextContent(/captures/i);
  });

  it('offers no screenshot and sends none with the suggestion', async () => {
    let receivedBody: Record<string, unknown> | null = null;
    server.use(
      http.post(`${TEST_API_V1}/idea-suggestions`, async ({ request }) => {
        receivedBody = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      })
    );
    renderButton();
    const user = await openDialog();

    expect(screen.queryByText(/captures d’écran/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ajouter une image/i })).not.toBeInTheDocument();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /envoyer/i }));

    await waitFor(() => expect(receivedBody).not.toBeNull());
    expect(receivedBody).not.toHaveProperty('attachments');
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

  it('lines up the close button of the confirmation like every other dialog footer', async () => {
    server.use(
      http.post(`${TEST_API_V1}/idea-suggestions`, () => new HttpResponse(null, { status: 204 }))
    );

    renderButton();
    const user = await openDialog();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /envoyer/i }));

    const confirmation = await screen.findByRole('status');
    expect(confirmation.closest(`.${modalStyles.body}`)).not.toBeNull();
    const closeButtons = screen.getAllByRole('button', { name: /^fermer$/i });
    const footerClose = closeButtons.at(-1)!;
    expect(footerClose.closest(`.${modalStyles.actions}`)?.parentElement).toHaveClass(
      modalStyles.footer!
    );
  });

  it('cuts the page path to the 300 characters the API accepts', async () => {
    let receivedBody: unknown = null;
    server.use(
      http.post(`${TEST_API_V1}/idea-suggestions`, async ({ request }) => {
        receivedBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );
    const longPath = `/films/collection/${'a'.repeat(400)}`;

    renderButton(longPath);
    const user = await openDialog();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /envoyer/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/merci/i);
    });
    expect(receivedBody).toMatchObject({ pagePath: longPath.slice(0, 300) });
  });

  it('sends the selected category (Bug) rather than the default value', async () => {
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

  it('shows an explicit error and keeps the typed text when sending fails', async () => {
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

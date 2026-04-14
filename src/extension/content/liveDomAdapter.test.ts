import { ALBUM_CACHE_KEY, LiveDomAdapter } from './liveDomAdapter';

function mountFixture() {
  document.body.innerHTML = `
    <button data-ezg-create-album type="button">Create album</button>
    <div data-ezg-current-photo>
      <img src="https://example.com/newer.jpg" alt="newer.jpg" />
    </div>
    <span data-ezg-photo-timestamp>2024-02-01</span>
    <button data-ezg-prev type="button">Prev</button>
    <button data-ezg-next type="button">Next</button>
    <nav>
      <div data-ezg-album-row data-ezg-album-id="family" data-ezg-album-title="Family">
        <button data-ezg-toggle-album type="button">Toggle</button>
        <button data-ezg-rename-album type="button">Rename</button>
        <input data-ezg-rename-input />
        <button data-ezg-save-rename type="button">Save rename</button>
        <span data-ezg-member="true"></span>
      </div>
      <div data-ezg-album-row data-ezg-album-id="office" data-ezg-album-title="Office">
        <button data-ezg-toggle-album type="button">Toggle</button>
        <button data-ezg-rename-album type="button">Rename</button>
        <input data-ezg-rename-input />
        <button data-ezg-save-rename type="button">Save rename</button>
      </div>
    </nav>
    <input data-ezg-album-input />
    <button data-ezg-save-album type="button">Save album</button>
  `;

  document.body.setAttribute('data-ezg-photo-id', 'photo-newer');

  document.querySelector('[data-ezg-prev]')?.addEventListener('click', () => {
    document.body.setAttribute('data-ezg-photo-id', 'photo-older');
    const image = document.querySelector('img');
    if (image) {
      image.src = 'https://example.com/older.jpg';
      image.alt = 'older.jpg';
    }
  });

  document.querySelector('[data-ezg-next]')?.addEventListener('click', () => {
    document.body.setAttribute('data-ezg-photo-id', 'photo-newer');
    const image = document.querySelector('img');
    if (image) {
      image.src = 'https://example.com/newer.jpg';
      image.alt = 'newer.jpg';
    }
  });

  document.querySelectorAll('[data-ezg-toggle-album]').forEach((button) => {
    button.addEventListener('click', () => {
      const row = button.closest('[data-ezg-album-row]');
      if (!row) {
        return;
      }
      const existing = row.querySelector('[data-ezg-member="true"]');
      if (existing) {
        existing.remove();
      } else {
        const flag = document.createElement('span');
        flag.setAttribute('data-ezg-member', 'true');
        row.appendChild(flag);
      }
    });
  });

  document.querySelector('[data-ezg-save-album]')?.addEventListener('click', () => {
    const input = document.querySelector<HTMLInputElement>('[data-ezg-album-input]');
    if (!input?.value.trim()) {
      return;
    }
    const row = document.createElement('div');
    row.setAttribute('data-ezg-album-row', '');
    row.setAttribute('data-ezg-album-id', input.value.toLowerCase().replace(/\s+/g, '-'));
    row.setAttribute('data-ezg-album-title', input.value);
    row.textContent = input.value;
    document.querySelector('nav')?.appendChild(row);
  });

  document.querySelectorAll('[data-ezg-album-row]').forEach((row) => {
    const input = row.querySelector<HTMLInputElement>('[data-ezg-rename-input]');
    row.querySelector('[data-ezg-save-rename]')?.addEventListener('click', () => {
      if (input?.value.trim()) {
        row.setAttribute('data-ezg-album-title', input.value);
      }
    });
  });
}

describe('LiveDomAdapter', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mountFixture();
  });

  it('reads albums, current photo, and memberships from the page DOM', async () => {
    const adapter = new LiveDomAdapter(document, { pathname: '/photo/photo-newer' } as Location);

    await expect(adapter.isSignedIn()).resolves.toBe(true);
    await expect(adapter.getAlbums()).resolves.toEqual([
      { id: 'family', title: 'Family' },
      { id: 'office', title: 'Office' },
    ]);
    await expect(adapter.getCurrentPhoto()).resolves.toEqual({
      id: 'photo-newer',
      title: 'newer.jpg',
      previewUrl: 'https://example.com/newer.jpg',
      timestamp: '2024-02-01',
    });
    await expect(adapter.getCurrentMemberships('photo-newer')).resolves.toEqual(['family']);
  });

  it('does not mistake account links for a signed-out state', async () => {
    const accountLink = document.createElement('a');
    accountLink.href = 'https://accounts.google.com/';
    document.body.appendChild(accountLink);

    const adapter = new LiveDomAdapter(document, { pathname: '/photo/photo-newer' } as Location);
    await expect(adapter.isSignedIn()).resolves.toBe(true);
  });

  it('stays signed in on a normal Google Photos page even when account chrome links are present', async () => {
    const accountLink = document.createElement('a');
    accountLink.href = 'https://accounts.google.com/AccountChooser';
    accountLink.textContent = 'Google Account';
    document.body.appendChild(accountLink);

    const profileLink = document.createElement('a');
    profileLink.href = 'https://myaccount.google.com/';
    profileLink.textContent = 'Profile';
    document.body.appendChild(profileLink);

    const adapter = new LiveDomAdapter(document, { pathname: '/photo/photo-newer' } as Location);
    await expect(adapter.isSignedIn()).resolves.toBe(true);
    await expect(adapter.getCurrentPhoto()).resolves.toMatchObject({ id: 'photo-newer' });
    await expect(adapter.getAlbums()).resolves.toContainEqual({ id: 'family', title: 'Family' });
  });

  it('reports signed out on the login route or login form', async () => {
    const loginAdapter = new LiveDomAdapter(document, { pathname: '/login' } as Location);
    await expect(loginAdapter.isSignedIn()).resolves.toBe(false);

    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    document.body.appendChild(emailInput);

    const formAdapter = new LiveDomAdapter(document, { pathname: '/photo/photo-newer' } as Location);
    await expect(formAdapter.isSignedIn()).resolves.toBe(false);
  });

  it('drives page controls to navigate photos and toggle albums', async () => {
    const adapter = new LiveDomAdapter(document, { pathname: '/photo/photo-newer' } as Location);

    await adapter.goPrevious();
    await expect(adapter.getCurrentPhoto()).resolves.toMatchObject({ id: 'photo-older', title: 'older.jpg' });

    await expect(adapter.toggleAlbum('office', 'photo-older')).resolves.toBe(true);
    await expect(adapter.getCurrentMemberships('photo-older')).resolves.toEqual(['family', 'office']);

    await adapter.goNext();
    await expect(adapter.getCurrentPhoto()).resolves.toMatchObject({ id: 'photo-newer' });
  });

  it('creates and renames albums through the page DOM', async () => {
    const adapter = new LiveDomAdapter(document, { pathname: '/photo/photo-newer' } as Location);

    await adapter.createAlbum('London Trip');
    await expect(adapter.getAlbums()).resolves.toContainEqual({ id: 'london-trip', title: 'London Trip' });

    await adapter.renameAlbum('office', 'Office Archive');
    await expect(adapter.getAlbums()).resolves.toContainEqual({ id: 'office', title: 'Office Archive' });
  });

  it('falls back to the session album cache when the current page does not show album rows', async () => {
    window.sessionStorage.setItem(
      ALBUM_CACHE_KEY,
      JSON.stringify([{ id: 'family', title: 'Family' }, { id: 'office', title: 'Office' }]),
    );
    document.querySelector('nav')?.remove();

    const adapter = new LiveDomAdapter(document, { pathname: '/photo/photo-newer' } as Location);
    await expect(adapter.getAlbums()).resolves.toEqual([
      { id: 'family', title: 'Family' },
      { id: 'office', title: 'Office' },
    ]);
  });

  it('keeps the full cached album list on photo pages instead of overwriting it with a partial DOM subset', async () => {
    window.sessionStorage.setItem(
      ALBUM_CACHE_KEY,
      JSON.stringify([
        { id: 'family', title: 'Family' },
        { id: 'office', title: 'Office' },
        { id: 'travel', title: 'Travel' },
      ]),
    );

    const nav = document.querySelector('nav');
    if (nav) {
      nav.innerHTML = `
        <div data-ezg-album-row data-ezg-album-id="family" data-ezg-album-title="Family"></div>
      `;
    }

    const adapter = new LiveDomAdapter(document, { pathname: '/photo/photo-newer' } as Location);
    await expect(adapter.getAlbums()).resolves.toEqual([
      { id: 'family', title: 'Family' },
      { id: 'office', title: 'Office' },
      { id: 'travel', title: 'Travel' },
    ]);
    expect(window.sessionStorage.getItem(ALBUM_CACHE_KEY)).toBe(
      JSON.stringify([
        { id: 'family', title: 'Family' },
        { id: 'office', title: 'Office' },
        { id: 'travel', title: 'Travel' },
      ]),
    );
  });

  it('refreshes the cache from the albums page when the full album grid is visible', async () => {
    window.sessionStorage.setItem(
      ALBUM_CACHE_KEY,
      JSON.stringify([{ id: 'stale', title: 'Stale' }]),
    );

    const adapter = new LiveDomAdapter(document, { pathname: '/albums' } as Location);
    await expect(adapter.getAlbums()).resolves.toEqual([
      { id: 'family', title: 'Family' },
      { id: 'office', title: 'Office' },
    ]);
    expect(window.sessionStorage.getItem(ALBUM_CACHE_KEY)).toBe(
      JSON.stringify([
        { id: 'family', title: 'Family' },
        { id: 'office', title: 'Office' },
      ]),
    );
  });

  it('extracts the album title without trailing item counts or more-options text', async () => {
    document.body.innerHTML = `
      <nav>
        <a href="/album/fathers-day">
          <span role="heading">2019 Father's Day</span>
          <span>4 items</span>
          <button type="button" aria-label="More options">More options</button>
        </a>
      </nav>
    `;

    const adapter = new LiveDomAdapter(document, { pathname: '/albums' } as Location);
    await expect(adapter.getAlbums()).resolves.toEqual([
      { id: 'fathers-day', title: "2019 Father's Day" },
    ]);
  });

  it('extracts the album title from a fully concatenated raw row string', async () => {
    document.body.innerHTML = `
      <nav>
        <a href="/album/fathers-day">2019 Father's Day4 itemsMore options</a>
      </nav>
    `;

    const adapter = new LiveDomAdapter(document, { pathname: '/albums' } as Location);
    await expect(adapter.getAlbums()).resolves.toEqual([
      { id: 'fathers-day', title: "2019 Father's Day" },
    ]);
  });

  it('extracts the album title from the real Google Photos title node structure', async () => {
    document.body.innerHTML = `
      <nav>
        <a href="/album/fathers-day">
          <div class="fykiDc">
            <div class="mfQCMe" dir="auto">
              <span class="ptmR6b">2019 Father's Day</span>
              <span class="AJB7kb"></span>
              <span class="asACRb"></span>
            </div>
            <div class="UV4Xae">4 items</div>
          </div>
        </a>
      </nav>
    `;

    const adapter = new LiveDomAdapter(document, { pathname: '/albums' } as Location);
    await expect(adapter.getAlbums()).resolves.toEqual([
      { id: 'fathers-day', title: "2019 Father's Day" },
    ]);
  });

  it('strips shared and empty-state suffixes from raw fallback text', async () => {
    document.body.innerHTML = `
      <nav>
        <a href="/album/shared-album">Family191 items  ·  Shared</a>
        <a href="/album/empty-album">ReceiptsNo items</a>
      </nav>
    `;

    const adapter = new LiveDomAdapter(document, { pathname: '/albums' } as Location);
    await expect(adapter.getAlbums()).resolves.toEqual([
      { id: 'shared-album', title: 'Family' },
      { id: 'empty-album', title: 'Receipts' },
    ]);
  });
});

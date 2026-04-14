import { EZGPhotosController } from './controller';
import type { AlbumEntry, PhotoEntry, PhotosAdapter } from './types';

class FakeAdapter implements PhotosAdapter {
  signedIn = true;
  albums: AlbumEntry[] = [
    { id: 'family', title: 'Family' },
    { id: 'office', title: 'Office' },
    { id: 'baby', title: 'Baby' },
    { id: 'baby-shower', title: 'Baby Shower' },
  ];
  photos: PhotoEntry[] = [
    { id: 'newer', title: 'newer.jpg', previewUrl: 'https://example.com/newer.jpg', timestamp: '2024-02-01' },
    { id: 'older', title: 'older.jpg', previewUrl: 'https://example.com/older.jpg', timestamp: '2024-01-01' },
  ];
  index = 0;
  memberships = new Map<string, Set<string>>([
    ['newer', new Set(['family'])],
    ['older', new Set(['office'])],
  ]);

  async isSignedIn() {
    return this.signedIn;
  }

  async getAlbums() {
    return [...this.albums];
  }

  async getCurrentPhoto() {
    return this.photos[this.index] ?? null;
  }

  async getCurrentMemberships(photoId: string) {
    return [...(this.memberships.get(photoId) ?? new Set<string>())];
  }

  async goPrevious() {
    this.index = Math.max(this.index - 1, 0);
  }

  async goNext() {
    this.index = Math.min(this.index + 1, this.photos.length - 1);
  }

  async toggleAlbum(albumId: string, photoId: string) {
    const memberships = this.memberships.get(photoId) ?? new Set<string>();
    if (memberships.has(albumId)) {
      memberships.delete(albumId);
    } else {
      memberships.add(albumId);
    }
    this.memberships.set(photoId, memberships);
    return memberships.has(albumId);
  }

  async createAlbum(title: string) {
    this.albums.push({ id: `album-${this.albums.length + 1}`, title });
  }

  async renameAlbum(albumId: string, title: string) {
    const album = this.albums.find((entry) => entry.id === albumId);
    if (album) {
      album.title = title;
    }
  }

  getSignInUrl() {
    return 'https://photos.google.com/login';
  }
}

describe('EZGPhotosController', () => {
  let adapter: FakeAdapter;
  let controller: EZGPhotosController;

  beforeEach(() => {
    document.body.innerHTML = '';
    adapter = new FakeAdapter();
    controller = new EZGPhotosController(adapter, document, window);
  });

  afterEach(() => {
    controller.dispose();
    vi.restoreAllMocks();
  });

  async function flush() {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await Promise.resolve();
    await Promise.resolve();
  }

  it('shows a login prompt when the user is not signed in', async () => {
    adapter.signedIn = false;
    controller.mount();
    await controller.refresh();
    await flush();

    expect(document.querySelector('[data-action="launcher"]')).not.toBeNull();
    (document.querySelector('[data-action="launcher"]') as HTMLElement).dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, clientX: 20, clientY: 20 }),
    );
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 20, clientY: 20 }));
    await flush();

    expect(document.body.textContent).toContain('Login with Google');
  });

  it('starts collapsed, opens on click, closes via close control, and keeps a dragged fixed position', async () => {
    controller.mount();
    await controller.refresh();
    await flush();

    const root = document.getElementById('ezgphotos-root');
    expect(root?.dataset.mode).toBe('collapsed');
    expect(document.querySelector('[data-action="launcher"]')).not.toBeNull();

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1400 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });

    const launcher = document.querySelector('[data-action="launcher"]') as HTMLElement;
    launcher.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 20, clientY: 20 }));
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 180, clientY: 140 }));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 180, clientY: 140 }));
    await flush();

    expect(root?.dataset.mode).toBe('collapsed');
    expect(root?.style.left).toBe('160px');
    expect(root?.style.top).toBe('120px');

    launcher.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 182, clientY: 142 }));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 182, clientY: 142 }));
    await flush();

    expect(root?.dataset.mode).toBe('expanded');
    expect(document.body.textContent).toContain('close - [X]');

    (document.querySelector('[data-action="close-panel"]') as HTMLElement).click();
    await flush();

    expect(root?.dataset.mode).toBe('collapsed');
    expect(root?.style.left).toBe('160px');
    expect(root?.style.top).toBe('120px');
  });

  it('uses the focused Google Photos photo as the target and navigates with arrow keys', async () => {
    controller.mount();
    await controller.refresh();
    await flush();

    (document.querySelector('[data-action="launcher"]') as HTMLElement).dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, clientX: 20, clientY: 20 }),
    );
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 20, clientY: 20 }));
    await flush();

    expect(document.body.textContent).not.toContain('Target photo');
    expect(document.body.textContent).toContain('currently open in Google Photos');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await flush();
    await controller.refresh();
    expect(adapter.index).toBe(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await flush();
    await controller.refresh();
    expect(adapter.index).toBe(0);
  });

  it('creates albums and keeps unique shortcut letters visible without rename controls', async () => {
    vi.spyOn(window, 'prompt').mockReturnValueOnce('London Trip');

    controller.mount();
    await controller.refresh();
    await flush();

    (document.querySelector('[data-action="launcher"]') as HTMLElement).dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, clientX: 20, clientY: 20 }),
    );
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 20, clientY: 20 }));
    await flush();

    const createButton = document.querySelector('[data-action="create-album"]');
    expect(createButton).not.toBeNull();
    createButton instanceof HTMLElement && createButton.click();
    await flush();
    await controller.refresh();

    expect(document.body.textContent).toContain('London Trip');
    expect(document.querySelector('[aria-label="Toggle London Trip"]')?.textContent?.trim()).toBe('L');
    expect(document.querySelector('[data-action="rename-album"]')).toBeNull();
    expect(document.querySelector('[aria-label="Toggle Office"]')?.textContent?.trim()).toBe('C');
  });

  it('toggles current-photo album membership from the keyboard and shows green checks', async () => {
    controller.mount();
    await controller.refresh();
    await flush();

    (document.querySelector('[data-action="launcher"]') as HTMLElement).dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, clientX: 20, clientY: 20 }),
    );
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 20, clientY: 20 }));
    await flush();

    expect(document.querySelector('[aria-label="Family contains current photo"]')?.textContent).toBe('✓');
    expect(document.querySelector('[aria-label="Office does not contain current photo"]')?.textContent).toBe('');
    expect(document.body.textContent).not.toContain('Target photo');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'C', bubbles: true }));
    await flush();
    await controller.refresh();
    expect(document.querySelector('[aria-label="Office contains current photo"]')?.textContent).toBe('✓');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'B', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'S', bubbles: true }));
    await flush();
    await controller.refresh();
    expect(document.querySelector('[aria-label="Baby contains current photo"]')?.textContent).toBe('✓');
    expect(document.querySelector('[aria-label="Baby Shower contains current photo"]')?.textContent).toBe('✓');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', bubbles: true }));
    await flush();
    await controller.refresh();
    expect(document.querySelector('[aria-label="Family does not contain current photo"]')?.textContent).toBe('');
  });
});

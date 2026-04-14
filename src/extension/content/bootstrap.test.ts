import { ensureAlbumCache } from './bootstrap';
import { ALBUM_CACHE_KEY } from './liveDomAdapter';

function createStorage(seed?: Record<string, string>) {
  const map = new Map(Object.entries(seed ?? {}));
  return {
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
}

describe('ensureAlbumCache', () => {
  it('navigates from a non-albums page to /albums on first load', async () => {
    const storage = createStorage();
    const location = { pathname: '/photo/abc', href: 'https://photos.google.com/photo/abc' };

    const didNavigate = await ensureAlbumCache({
      isSignedIn: async () => true,
      getAlbums: async () => [],
      location,
      storage,
    });

    expect(didNavigate).toBe(true);
    expect(location.href).toBe('https://photos.google.com/albums');
    expect(storage.getItem('ezgphotos:return-url')).toBe('https://photos.google.com/photo/abc');
  });

  it('caches albums on /albums and returns to the original page', async () => {
    const storage = createStorage({
      'ezgphotos:return-url': 'https://photos.google.com/photo/abc',
    });
    const location = { pathname: '/albums', href: 'https://photos.google.com/albums' };

    const didNavigate = await ensureAlbumCache({
      isSignedIn: async () => true,
      getAlbums: async () => [{ id: 'family', title: 'Family' }],
      location,
      storage,
    });

    expect(didNavigate).toBe(true);
    expect(location.href).toBe('https://photos.google.com/photo/abc');
    expect(storage.getItem(ALBUM_CACHE_KEY)).toBe(JSON.stringify([{ id: 'family', title: 'Family' }]));
    expect(storage.getItem('ezgphotos:return-url')).toBeNull();
  });

  it('does not navigate away when the starting page is already /albums', async () => {
    const storage = createStorage();
    const location = { pathname: '/albums', href: 'https://photos.google.com/albums' };

    const didNavigate = await ensureAlbumCache({
      isSignedIn: async () => true,
      getAlbums: async () => [{ id: 'family', title: 'Family' }],
      location,
      storage,
    });

    expect(didNavigate).toBe(false);
    expect(location.href).toBe('https://photos.google.com/albums');
    expect(storage.getItem(ALBUM_CACHE_KEY)).toBe(JSON.stringify([{ id: 'family', title: 'Family' }]));
  });

  it('does not repeat the /albums detour after the cache exists', async () => {
    const storage = createStorage({
      [ALBUM_CACHE_KEY]: JSON.stringify([{ id: 'family', title: 'Family' }]),
    });
    const location = { pathname: '/photo/abc', href: 'https://photos.google.com/photo/abc' };

    const didNavigate = await ensureAlbumCache({
      isSignedIn: async () => true,
      getAlbums: async () => [],
      location,
      storage,
    });

    expect(didNavigate).toBe(false);
    expect(location.href).toBe('https://photos.google.com/photo/abc');
  });
});

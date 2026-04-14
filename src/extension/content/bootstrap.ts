import type { AlbumEntry } from '../core/types';
import { ALBUM_CACHE_KEY } from './liveDomAdapter';

const RETURN_URL_KEY = 'ezgphotos:return-url';
const ALBUMS_URL = 'https://photos.google.com/albums';

type BootstrapLocation = Pick<Location, 'pathname' | 'href'>;
type BootstrapStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export async function ensureAlbumCache(params: {
  isSignedIn: () => Promise<boolean>;
  getAlbums: () => Promise<AlbumEntry[]>;
  location: BootstrapLocation;
  storage: BootstrapStorage;
}): Promise<boolean> {
  const { isSignedIn, getAlbums, location, storage } = params;

  if (!(await isSignedIn())) {
    return false;
  }

  const onAlbumsPage = location.pathname === '/albums' || location.pathname.startsWith('/albums/');
  const returnUrl = storage.getItem(RETURN_URL_KEY);

  if (onAlbumsPage) {
    const albums = await getAlbums();
    if (albums.length > 0) {
      storage.setItem(ALBUM_CACHE_KEY, JSON.stringify(albums));
    }

    if (returnUrl && returnUrl !== location.href) {
      storage.removeItem(RETURN_URL_KEY);
      location.href = returnUrl;
      return true;
    }

    storage.removeItem(RETURN_URL_KEY);
    return false;
  }

  if (storage.getItem(ALBUM_CACHE_KEY)) {
    return false;
  }

  storage.setItem(RETURN_URL_KEY, location.href);
  location.href = ALBUMS_URL;
  return true;
}

export { ALBUMS_URL, RETURN_URL_KEY };

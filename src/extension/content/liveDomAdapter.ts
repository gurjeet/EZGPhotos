import type { AlbumEntry, PhotoEntry, PhotosAdapter } from '../core/types';

const ALBUM_CACHE_KEY = 'ezgphotos:albums-cache';

function delay(ms = 50) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function clickIfPresent(element: Element | null) {
  if (element instanceof HTMLElement) {
    element.click();
    return true;
  }
  return false;
}

function textContentOf(element: Element | null): string {
  return element?.textContent?.trim() ?? '';
}

function sanitizeAlbumTitle(rawText: string): string {
  return rawText
    .replace(/\s*no\s*items\s*$/i, '')
    .replace(/\s*\d+\s*items?\s*[·•]\s*shared\s*$/i, '')
    .replace(/\s*shared\s*$/i, '')
    .replace(/\s*more\s*options\s*$/i, '')
    .replace(/\s*\d+\s*items?\s*$/i, '')
    .replace(/\s*\d+\s*items?\s*more\s*options\s*$/i, '')
    .replace(/(.*?)(no\s*items)\s*$/i, '$1')
    .replace(/(.*?)(\d+\s*items?\s*[·•]\s*shared)\s*$/i, '$1')
    .replace(/(.*?)(\d+\s*items?\s*more\s*options)\s*$/i, '$1')
    .replace(/(.*?)(\d+\s*items?)\s*$/i, '$1')
    .trim();
}

function isMetadataOnly(rawText: string): boolean {
  const normalized = rawText.replace(/\s+/g, ' ').trim().toLowerCase();
  return (
    normalized === '' ||
    normalized === 'more options' ||
    normalized === 'no items' ||
    /^(\d+\s*items?)$/.test(normalized) ||
    /^(\d+\s*items?\s*[·•]\s*shared)$/.test(normalized) ||
    normalized === 'shared'
  );
}

function albumIdFromElement(element: Element): string | null {
  const datasetId = element.getAttribute('data-ezg-album-id');
  if (datasetId) {
    return datasetId;
  }

  const href = element.getAttribute('href') ?? '';
  const match = href.match(/\/album\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function findAlbumRows(documentRef: Document): Element[] {
  const explicitRows = [...documentRef.querySelectorAll('[data-ezg-album-row]')];
  if (explicitRows.length > 0) {
    return explicitRows;
  }

  return [...documentRef.querySelectorAll('a[href*="/album/"]')];
}

function readAlbumTitle(element: Element): string {
  const explicitTitle =
    element.getAttribute('data-ezg-album-title') ||
    textContentOf(
      element.querySelector(
        '[data-ezg-album-title], [aria-label][role="heading"], [role="heading"], h1, h2, h3, h4, h5, h6',
      ),
    );

  if (explicitTitle) {
    return explicitTitle;
  }

  const descendantCandidate = [...element.querySelectorAll('span, div, p')]
    .map((node) => textContentOf(node))
    .find((text) => {
      if (!text || isMetadataOnly(text)) {
        return false;
      }

      return sanitizeAlbumTitle(text).length > 0;
    });

  if (descendantCandidate) {
    return sanitizeAlbumTitle(descendantCandidate);
  }

  const ariaLabel = element.getAttribute('aria-label')?.trim();
  if (ariaLabel) {
    return ariaLabel;
  }

  const rawText = textContentOf(element);
  return sanitizeAlbumTitle(rawText);
}

function readActiveAlbumIds(documentRef: Document): Set<string> {
  const explicit = [...documentRef.querySelectorAll('[data-ezg-member="true"]')];
  if (explicit.length > 0) {
    return new Set(
      explicit
        .map((element) => element.closest('[data-ezg-album-row]'))
        .map((row) => (row ? albumIdFromElement(row) : null))
        .filter((value): value is string => Boolean(value)),
    );
  }

  return new Set(
    findAlbumRows(documentRef)
      .filter((row) => row.getAttribute('aria-checked') === 'true' || row.getAttribute('aria-selected') === 'true')
      .map((row) => albumIdFromElement(row))
      .filter((value): value is string => Boolean(value)),
  );
}

function currentPhotoId(locationRef: Location, documentRef: Document): string | null {
  return (
    documentRef.body.getAttribute('data-ezg-photo-id') ??
    locationRef.pathname.match(/\/photo\/([^/?#]+)/)?.[1] ??
    null
  );
}

function currentPhotoImage(documentRef: Document): HTMLImageElement | null {
  return (
    documentRef.querySelector<HTMLImageElement>('[data-ezg-current-photo] img') ??
    documentRef.querySelector<HTMLImageElement>('main img') ??
    documentRef.querySelector<HTMLImageElement>('img')
  );
}

function isAlbumsPath(pathname: string): boolean {
  return pathname === '/albums' || pathname.startsWith('/albums/');
}

export class LiveDomAdapter implements PhotosAdapter {
  constructor(
    private readonly documentRef: Document = document,
    private readonly locationRef: Location = window.location,
    private readonly storageRef: Storage = window.sessionStorage,
  ) {}

  async isSignedIn() {
    if (this.locationRef.pathname.startsWith('/login')) {
      return false;
    }

    if (
      this.documentRef.querySelector(
        'form[action*="ServiceLogin"], input[type="email"], input[type="password"], a[href*="ServiceLogin"]',
      )
    ) {
      return false;
    }

    return true;
  }

  async getAlbums() {
    const albums = findAlbumRows(this.documentRef)
      .map((row) => {
        const id = albumIdFromElement(row);
        const title = readAlbumTitle(row);
        if (!id || !title) {
          return null;
        }
        return { id, title } satisfies AlbumEntry;
      })
      .filter((value): value is AlbumEntry => Boolean(value));

    const cachedAlbums = this.storageRef.getItem(ALBUM_CACHE_KEY);
    const parsedCachedAlbums = (() => {
      if (!cachedAlbums) {
        return null;
      }

      try {
        return JSON.parse(cachedAlbums) as AlbumEntry[];
      } catch {
        return null;
      }
    })();

    if (albums.length > 0) {
      if (isAlbumsPath(this.locationRef.pathname)) {
        this.storageRef.setItem(ALBUM_CACHE_KEY, JSON.stringify(albums));
        return albums;
      }

      if (parsedCachedAlbums && parsedCachedAlbums.length >= albums.length) {
        return parsedCachedAlbums;
      }

      return albums;
    }

    if (!parsedCachedAlbums) {
      return [];
    }

    return parsedCachedAlbums;
  }

  async getCurrentPhoto() {
    const id = currentPhotoId(this.locationRef, this.documentRef);
    const image = currentPhotoImage(this.documentRef);
    if (!id || !image?.src) {
      return null;
    }

    return {
      id,
      title: image.alt || this.documentRef.title || 'Google Photos item',
      previewUrl: image.currentSrc || image.src,
      timestamp: this.documentRef.querySelector('[data-ezg-photo-timestamp]')?.textContent?.trim() ?? undefined,
    } satisfies PhotoEntry;
  }

  async getCurrentMemberships(_photoId: string) {
    return [...readActiveAlbumIds(this.documentRef)];
  }

  async goPrevious() {
    const clicked =
      clickIfPresent(this.documentRef.querySelector('[data-ezg-prev]')) ||
      clickIfPresent(this.documentRef.querySelector('[aria-label*="Previous"]')) ||
      clickIfPresent(this.documentRef.querySelector('[aria-label*="previous"]'));

    if (!clicked) {
      throw new Error('Previous-photo control not found on this Google Photos page.');
    }

    await delay();
  }

  async goNext() {
    const clicked =
      clickIfPresent(this.documentRef.querySelector('[data-ezg-next]')) ||
      clickIfPresent(this.documentRef.querySelector('[aria-label*="Next"]')) ||
      clickIfPresent(this.documentRef.querySelector('[aria-label*="next"]'));

    if (!clicked) {
      throw new Error('Next-photo control not found on this Google Photos page.');
    }

    await delay();
  }

  async toggleAlbum(albumId: string, _photoId: string) {
    const row = findAlbumRows(this.documentRef).find((element) => albumIdFromElement(element) === albumId);
    if (!row) {
      throw new Error(`Album ${albumId} not found.`);
    }

    const toggleTarget =
      row.querySelector('[data-ezg-toggle-album]') ??
      row.querySelector('[role="checkbox"], [role="button"], button') ??
      row;

    if (!clickIfPresent(toggleTarget)) {
      throw new Error(`Album ${albumId} could not be toggled.`);
    }

    await delay();
    return readActiveAlbumIds(this.documentRef).has(albumId);
  }

  async createAlbum(title: string) {
    const launcher =
      this.documentRef.querySelector('[data-ezg-create-album]') ??
      this.documentRef.querySelector('[aria-label*="Create album"]');
    if (!clickIfPresent(launcher)) {
      throw new Error('Create-album control not found on this Google Photos page.');
    }

    await delay();
    const input =
      this.documentRef.querySelector<HTMLInputElement>('[data-ezg-album-input]') ??
      this.documentRef.querySelector<HTMLInputElement>('input[aria-label*="album"], input[type="text"]');

    if (!input) {
      throw new Error('Album-title input not found.');
    }

    input.value = title;
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const saveButton =
      this.documentRef.querySelector('[data-ezg-save-album]') ??
      this.documentRef.querySelector('[aria-label*="Create"], [aria-label*="Save"]');

    if (!clickIfPresent(saveButton)) {
      throw new Error('Album-save control not found.');
    }

    await delay();
  }

  async renameAlbum(albumId: string, title: string) {
    const row = findAlbumRows(this.documentRef).find((element) => albumIdFromElement(element) === albumId);
    if (!row) {
      throw new Error(`Album ${albumId} not found.`);
    }

    const renameTrigger =
      row.querySelector('[data-ezg-rename-album]') ??
      row.querySelector('[aria-label*="Rename"]');

    if (!clickIfPresent(renameTrigger)) {
      throw new Error(`Rename control not found for album ${albumId}.`);
    }

    await delay();
    const input =
      row.querySelector<HTMLInputElement>('[data-ezg-rename-input]') ??
      this.documentRef.querySelector<HTMLInputElement>('[data-ezg-rename-input], input[aria-label*="Rename"]');

    if (!input) {
      throw new Error('Rename input not found.');
    }

    input.value = title;
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const saveButton =
      row.querySelector('[data-ezg-save-rename]') ??
      this.documentRef.querySelector('[data-ezg-save-rename], [aria-label*="Save"]');

    if (!clickIfPresent(saveButton)) {
      throw new Error('Rename-save control not found.');
    }

    await delay();
  }

  getSignInUrl() {
    return 'https://photos.google.com/login';
  }
}

export { ALBUM_CACHE_KEY };

import { assignAlbumShortcuts } from '../../lib/albumShortcuts';
import type { AlbumEntry, PhotoEntry, PhotosAdapter } from './types';

type ControllerState = {
  signedIn: boolean;
  albums: AlbumEntry[];
  photo: PhotoEntry | null;
  memberships: Set<string>;
};

type FloatingPosition = {
  x: number;
  y: number;
};

export class EZGPhotosController {
  private root: HTMLDivElement | null = null;
  private expanded = false;
  private position: FloatingPosition = { x: 16, y: 16 };
  private dragState:
    | {
        offsetX: number;
        offsetY: number;
        moved: boolean;
      }
    | null = null;
  private state: ControllerState = {
    signedIn: false,
    albums: [],
    photo: null,
    memberships: new Set(),
  };

  private readonly onKeydown = (event: KeyboardEvent) => {
    if (!this.root || !this.expanded || !this.state.signedIn || !this.state.photo) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    const target = event.target;
    if (target instanceof HTMLElement) {
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target.isContentEditable) {
        return;
      }
    }

    if (event.key === 'ArrowLeft') {
      void this.adapter.goPrevious().then(() => this.refresh());
      return;
    }

    if (event.key === 'ArrowRight') {
      void this.adapter.goNext().then(() => this.refresh());
      return;
    }

    const shortcuts = assignAlbumShortcuts(this.state.albums);
    const requestedAlbum = this.state.albums.find(
      (album) => shortcuts.get(album.id) === event.key.toUpperCase(),
    );

    if (requestedAlbum) {
      void this.toggleAlbum(requestedAlbum.id);
    }
  };

  constructor(
    private readonly adapter: PhotosAdapter,
    private readonly documentRef: Document = document,
    private readonly windowRef: Window = window,
  ) {}

  mount() {
    if (this.root) {
      return;
    }

    this.root = this.documentRef.createElement('div');
    this.root.id = 'ezgphotos-root';
    this.documentRef.body.appendChild(this.root);
    this.windowRef.addEventListener('keydown', this.onKeydown);
    this.windowRef.addEventListener('mousemove', this.onMouseMove);
    this.windowRef.addEventListener('mouseup', this.onMouseUp);
    void this.refresh();
  }

  dispose() {
    this.windowRef.removeEventListener('keydown', this.onKeydown);
    this.windowRef.removeEventListener('mousemove', this.onMouseMove);
    this.windowRef.removeEventListener('mouseup', this.onMouseUp);
    this.root?.remove();
    this.root = null;
  }

  async refresh() {
    if (!this.root) {
      return;
    }

    const signedIn = await this.adapter.isSignedIn();
    if (!signedIn) {
      this.state = {
        signedIn: false,
        albums: [],
        photo: null,
        memberships: new Set(),
      };
      this.render();
      return;
    }

    const [albums, photo] = await Promise.all([
      this.adapter.getAlbums(),
      this.adapter.getCurrentPhoto(),
    ]);

    const memberships = photo
      ? new Set(await this.adapter.getCurrentMemberships(photo.id))
      : new Set<string>();

    this.state = {
      signedIn: true,
      albums,
      photo,
      memberships,
    };
    this.render();
  }

  private async toggleAlbum(albumId: string) {
    const photo = this.state.photo;
    if (!photo) {
      return;
    }

    const isMember = await this.adapter.toggleAlbum(albumId, photo.id);
    const nextMemberships = new Set(this.state.memberships);
    if (isMember) {
      nextMemberships.add(albumId);
    } else {
      nextMemberships.delete(albumId);
    }
    this.state = { ...this.state, memberships: nextMemberships };
    this.render();
  }

  private async handleCreateAlbum() {
    const title = this.windowRef.prompt('Create album');
    if (!title?.trim()) {
      return;
    }
    await this.adapter.createAlbum(title.trim());
    await this.refresh();
  }

  private readonly onMouseMove = (event: MouseEvent) => {
    if (!this.root || !this.dragState || this.expanded) {
      return;
    }

    const nextX = Math.max(0, Math.min(event.clientX - this.dragState.offsetX, this.windowRef.innerWidth - 72));
    const nextY = Math.max(0, Math.min(event.clientY - this.dragState.offsetY, this.windowRef.innerHeight - 72));
    this.position = { x: nextX, y: nextY };
    this.dragState.moved = true;
    this.applyRootPosition();
  };

  private readonly onMouseUp = (_event: MouseEvent) => {
    if (!this.dragState) {
      return;
    }

    const shouldOpen = !this.dragState.moved;
    this.dragState = null;
    if (shouldOpen) {
      this.expanded = true;
      this.render();
    }
  };

  private applyRootPosition() {
    if (!this.root) {
      return;
    }

    this.root.style.left = `${this.position.x}px`;
    this.root.style.top = `${this.position.y}px`;
  }

  private render() {
    if (!this.root) {
      return;
    }

    const { signedIn, albums, memberships, photo } = this.state;
    const shortcuts = assignAlbumShortcuts(albums);
    this.root.dataset.mode = this.expanded ? 'expanded' : 'collapsed';
    this.applyRootPosition();

    if (!this.expanded) {
      this.root.innerHTML = `
        <button class="ezg-launcher" type="button" data-action="launcher" aria-label="Open EZGPhotos">
          EZ
        </button>
      `;
      this.bindInteractions();
      return;
    }

    if (!signedIn) {
      this.root.innerHTML = `
        <section class="ezg-panel">
          <header class="ezg-topbar">
            <div>
              <p class="ezg-eyebrow">EZGPhotos Extension</p>
              <h1>Sign in to Google Photos</h1>
            </div>
            <button class="ezg-close" type="button" data-action="close-panel">close - [X]</button>
          </header>
          <a class="ezg-primary" href="${this.adapter.getSignInUrl()}" target="_blank" rel="noreferrer">Login with Google</a>
          <p class="ezg-empty">Open Google Photos in this browser, sign in, then reload the page.</p>
        </section>
      `;
      this.bindInteractions();
      return;
    }

    const albumRows = albums
      .map((album) => {
        const shortcut = shortcuts.get(album.id) ?? '?';
        const isMember = memberships.has(album.id);
        return `
          <li class="ezg-album-row${isMember ? ' is-active' : ''}" data-album-id="${album.id}">
            <button class="ezg-shortcut" type="button" data-action="toggle-album" data-album-id="${album.id}" aria-label="Toggle ${album.title}">
              ${shortcut}
            </button>
            <span class="ezg-album-title">${album.title}</span>
            <span class="ezg-status${isMember ? ' is-on' : ''}" aria-label="${album.title} ${isMember ? 'contains' : 'does not contain'} current photo">${isMember ? '✓' : ''}</span>
          </li>
        `;
      })
      .join('');

    this.root.innerHTML = `
      <section class="ezg-panel">
        <header class="ezg-topbar">
          <div>
            <p class="ezg-eyebrow">EZGPhotos Extension</p>
            <h1>Google Photos Keyboard Manager</h1>
          </div>
          <div class="ezg-actions">
            <button class="ezg-close" type="button" data-action="close-panel">close - [X]</button>
            <button class="ezg-primary" type="button" data-action="create-album">Create album</button>
            <button class="ezg-secondary" type="button" data-action="refresh">Refresh</button>
          </div>
        </header>
        <div class="ezg-workspace">
          <aside class="ezg-sidebar">
            <div class="ezg-section-header">
              <h2>Albums</h2>
              <span>${albums.length}</span>
            </div>
            <ul class="ezg-album-list">${albumRows}</ul>
            <p class="ezg-hint">
              ${
                photo
                  ? 'The target photo is the one currently open in Google Photos. Use left/right arrows to move between photos and press an album shortcut key to add or remove it.'
                  : 'Open a Google Photos URL that starts with /photo/ to select a target photo.'
              }
            </p>
          </aside>
        </div>
      </section>
    `;

    this.bindInteractions();
  }

  private bindInteractions() {
    if (!this.root) {
      return;
    }

    this.root.querySelector<HTMLElement>('[data-action="launcher"]')?.addEventListener('mousedown', (event) => {
      if (!(event instanceof MouseEvent)) {
        return;
      }

      const rect = this.root?.getBoundingClientRect();
      this.dragState = {
        offsetX: rect ? event.clientX - rect.left : 0,
        offsetY: rect ? event.clientY - rect.top : 0,
        moved: false,
      };
    });

    this.root.querySelector('[data-action="close-panel"]')?.addEventListener('click', () => {
      this.expanded = false;
      this.render();
    });

    this.root.querySelector('[data-action="refresh"]')?.addEventListener('click', () => {
      void this.refresh();
    });

    this.root.querySelector('[data-action="create-album"]')?.addEventListener('click', () => {
      void this.handleCreateAlbum();
    });

    this.root.querySelector('[data-action="previous-photo"]')?.addEventListener('click', () => {
      void this.adapter.goPrevious().then(() => this.refresh());
    });

    this.root.querySelector('[data-action="next-photo"]')?.addEventListener('click', () => {
      void this.adapter.goNext().then(() => this.refresh());
    });

    this.root.querySelectorAll<HTMLElement>('[data-action="toggle-album"]').forEach((element) => {
      element.addEventListener('click', () => {
        const albumId = element.dataset.albumId;
        if (albumId) {
          void this.toggleAlbum(albumId);
        }
      });
    });
  }
}

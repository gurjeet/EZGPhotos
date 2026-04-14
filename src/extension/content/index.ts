import { EZGPhotosController } from '../core/controller';
import { ensureAlbumCache } from './bootstrap';
import { LiveDomAdapter } from './liveDomAdapter';
import { panelStyles } from './panelStyles';

function injectStyles(documentRef: Document) {
  if (documentRef.getElementById('ezgphotos-style')) {
    return;
  }

  const style = documentRef.createElement('style');
  style.id = 'ezgphotos-style';
  style.textContent = panelStyles;
  documentRef.head.appendChild(style);
}

async function boot() {
  const adapter = new LiveDomAdapter();
  const didNavigate = await ensureAlbumCache({
    isSignedIn: () => adapter.isSignedIn(),
    getAlbums: () => adapter.getAlbums(),
    location: window.location,
    storage: window.sessionStorage,
  });

  if (didNavigate) {
    return;
  }

  injectStyles(document);
  const controller = new EZGPhotosController(adapter);
  controller.mount();

  const observer = new MutationObserver((mutations) => {
    const overlayRoot = document.getElementById('ezgphotos-root');
    if (overlayRoot && mutations.every((mutation) => overlayRoot.contains(mutation.target))) {
      return;
    }

    void controller.refresh();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-selected', 'aria-checked', 'src', 'alt', 'data-ezg-member', 'data-ezg-photo-id'],
  });
}

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      void boot();
    },
    { once: true },
  );
} else {
  void boot();
}

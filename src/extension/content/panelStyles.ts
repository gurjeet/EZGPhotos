export const panelStyles = `
#ezgphotos-root {
  position: fixed;
  left: 16px;
  top: 16px;
  z-index: 2147483647;
  color: #f7f2e8;
  font-family: "Avenir Next", "Segoe UI", sans-serif;
}

#ezgphotos-root[data-mode="collapsed"] {
  width: 64px;
  height: 64px;
}

#ezgphotos-root[data-mode="expanded"] {
  width: calc(100vw - 32px);
  height: calc(100vh - 32px);
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
}

#ezgphotos-root * {
  box-sizing: border-box;
}

.ezg-launcher {
  width: 64px;
  height: 64px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  background:
    radial-gradient(circle at top left, rgba(241, 126, 56, 0.24), transparent 40%),
    linear-gradient(180deg, rgba(16, 22, 29, 0.96), rgba(10, 14, 19, 0.96));
  color: #f7f2e8;
  font: inherit;
  font-weight: 800;
  cursor: grab;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
}

.ezg-launcher:active {
  cursor: grabbing;
}

.ezg-panel {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(241, 126, 56, 0.18), transparent 30%),
    linear-gradient(180deg, rgba(16, 22, 29, 0.96), rgba(10, 14, 19, 0.96));
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(18px);
  padding: 18px;
  width: 100%;
  height: 100%;
  max-height: calc(100vh - 32px);
  overflow: auto;
}

.ezg-topbar,
.ezg-workspace,
.ezg-section-header,
.ezg-photo-card figcaption,
.ezg-actions,
.ezg-album-row {
  display: flex;
}

.ezg-topbar,
.ezg-section-header,
.ezg-photo-card figcaption,
.ezg-actions,
.ezg-album-row {
  align-items: center;
}

.ezg-topbar,
.ezg-section-header,
.ezg-photo-card figcaption,
.ezg-album-row {
  justify-content: space-between;
}

.ezg-workspace {
  gap: 16px;
  margin-top: 16px;
}

.ezg-sidebar {
  width: 100%;
  max-height: 76vh;
  overflow: auto;
}

.ezg-eyebrow {
  margin: 0 0 4px;
  color: #f6b15e;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.ezg-topbar h1,
.ezg-section-header h2,
.ezg-album-title {
  margin: 0;
}

.ezg-topbar h1 {
  font-size: 28px;
  line-height: 1;
}

.ezg-section-header {
  margin-bottom: 12px;
  color: #d6dde6;
}

.ezg-album-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ezg-album-row {
  gap: 10px;
  padding: 10px 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
}

.ezg-album-row.is-active {
  background: rgba(87, 193, 118, 0.14);
}

.ezg-primary,
.ezg-secondary,
.ezg-ghost,
.ezg-close,
.ezg-shortcut {
  border: none;
  border-radius: 999px;
  text-decoration: none;
  cursor: pointer;
  font: inherit;
}

.ezg-primary {
  background: linear-gradient(135deg, #f6b15e, #ef6b3b);
  color: #131820;
  padding: 10px 14px;
  font-weight: 700;
}

.ezg-secondary,
.ezg-ghost,
.ezg-close,
.ezg-shortcut {
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
}

.ezg-secondary,
.ezg-ghost,
.ezg-close {
  padding: 8px 12px;
}

.ezg-shortcut {
  width: 40px;
  height: 40px;
  font-weight: 800;
}

.ezg-status {
  width: 24px;
  text-align: center;
  color: transparent;
  font-weight: 900;
}

.ezg-status.is-on {
  color: #5edb76;
}

.ezg-empty,
.ezg-hint {
  color: #b4becd;
}

@media (max-width: 960px) {
  .ezg-panel {
    border-radius: 24px;
  }

  .ezg-workspace {
    flex-direction: column;
  }

  .ezg-sidebar {
    width: 100%;
    max-height: 28vh;
  }
}
`;

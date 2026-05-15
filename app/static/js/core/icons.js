// core/icons.js — Lucide icon helpers
//
// Wraps `lucide.createIcons()` so callers don't have to guard for
// the global being missing. `bindModalReinit()` re-renders icons
// when Bootstrap modals open (dynamic content inside).

export function initIcons() {
    if (window.lucide?.createIcons) {
        window.lucide.createIcons();
    }
}

export function bindModalReinit() {
    document.addEventListener('shown.bs.modal', initIcons);
}

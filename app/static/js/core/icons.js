// core/icons.js — Lucide icon helpers
//
// Wraps `lucide.createIcons()` so callers don't have to guard for
// the global being missing. `bindModalReinit()` re-renders icons
// when Bootstrap modals open (dynamic content inside).

// lucide v1.x UMD: createIcons() ต้องส่ง { icons } object ด้วย (ไม่ auto-include
// เหมือน v0.x). global `window.lucide` มีทั้ง createIcons function + icon data
// เป็น PascalCase keys → ส่งทั้งหมดเป็น icons map ได้เลย
function getIconsMap() {
    const l = window.lucide;
    if (!l) return null;
    return l.icons || l;
}

export function initIcons(scope) {
    const lucide = window.lucide;
    if (!lucide?.createIcons) return;
    const icons = getIconsMap();
    if (!icons) return;
    try {
        const opts = { icons };
        if (scope instanceof Element) opts.nameAttr = 'data-lucide', opts.root = scope;
        lucide.createIcons(opts);
    } catch (e) { /* lucide not ready yet */ }
}

export function bindModalReinit() {
    document.addEventListener('shown.bs.modal', (e) => initIcons(e.target));
}

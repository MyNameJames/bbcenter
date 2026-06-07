/* ══════════════════════════════════════════════════
   pages/dashboard.js — landing page (ES module)
   - Lucide icon init
   - Live clock (Thai locale, tabular nums)
   ══════════════════════════════════════════════════ */

import { initIcons, bindModalReinit } from '../core/icons.js';

initIcons();
bindModalReinit();

const clockEl = document.getElementById('liveClock');
if (clockEl) {
    const dateFmt = new Intl.DateTimeFormat('th-TH', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const timeFmt = new Intl.DateTimeFormat('th-TH', {
        hour: '2-digit', minute: '2-digit'
    });
    const tick = () => {
        const now = new Date();
        clockEl.textContent = `${dateFmt.format(now)} · ${timeFmt.format(now)}`;
    };
    tick();
    setInterval(tick, 30_000);
}

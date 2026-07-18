/* ══════════════════════════════════════════════════
   core/js/ue-motion.js — UE redesign motion helpers (generic)
   ──────────────────────────────────────────────────
   Phase 1.5 (2026-07-11): promote จาก vehicle_mileage.js → shared
   ใช้คู่กับ core/css/ue.css (keyframes ml2FrameIn/RowIn/DotPop/Bump/Shimmer + คลาส .ml2-*)
   pattern เดียวกับ window.bbToast/bbComponents — classic script, set window.ueMotion
   โหลด "ก่อน" page JS ที่เรียกใช้
════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

    var SKEL_MIN_MS = 350;

    /* count-up ตัวเลข (ease-out cubic) · opts.format = fn(number)->string · opts.duration ms */
    function countUp(el, target, opts) {
        opts = opts || {};
        var fmt = opts.format || function (n) { return Math.round(n).toLocaleString('en-US'); };
        if (REDUCE) { el.textContent = fmt(target); return; }
        var dur = opts.duration || 900, start = null;
        function step(ts) {
            if (!start) start = ts;
            var p = Math.min((ts - start) / dur, 1);
            el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = fmt(target);
        }
        requestAnimationFrame(step);
    }

    /* stagger row เข้า (.ml2-rowin) + dotPop (.ml2-dotpop) ที่ลูกใน row
       scope = element | selector · opts.rows = selector แถว · opts.dots = selector dot ใน row
       opts.step (วินาที/แถว, default .05) · opts.cap (index สูงสุดที่ยังหน่วง, default 15) */
    function staggerRows(scope, opts) {
        if (REDUCE) return;
        opts = opts || {};
        var root = (typeof scope === 'string') ? document.querySelector(scope) : (scope || document);
        if (!root) return;
        var rowSel = opts.rows || '.ml2-rowin-item';
        var dotSel = opts.dots || null;
        var step = (opts.step != null) ? opts.step : 0.05;
        var cap = (opts.cap != null) ? opts.cap : 15;
        var rows = root.querySelectorAll(rowSel);
        rows.forEach(function (row, i) {
            var d = Math.min(i, cap) * step;
            row.classList.remove('ml2-rowin');
            row.style.animationDelay = d + 's';
            if (dotSel) {
                var dot = row.querySelector(dotSel);
                if (dot) { dot.classList.remove('ml2-dotpop'); dot.style.animationDelay = (d + 0.1) + 's'; }
            }
        });
        void root.offsetWidth;                          // reflow เดียว batch ทั้งชุด
        rows.forEach(function (row) {
            row.classList.add('ml2-rowin');
            if (dotSel) { var dot = row.querySelector(dotSel); if (dot) dot.classList.add('ml2-dotpop'); }
        });
    }

    /* skeleton rows แทน content ระหว่างโหลด · opts.count = จำนวนแถว
       คืน timestamp (0 ถ้า reduced-motion → ผู้เรียกข้าม min-delay) */
    function showSkeleton(container, opts) {
        if (REDUCE) return 0;
        opts = opts || {};
        var n = opts.count || 5;
        var h = '';
        for (var i = 0; i < n; i++) {
            h += '<div class="ml2-skel-row"><div class="ml2-skel-block" style="width:' +
                (55 + Math.random() * 30).toFixed(0) + '%;animation-delay:' + (i * 0.08).toFixed(2) + 's"></div></div>';
        }
        container.innerHTML = h;
        return performance.now();
    }

    window.ueMotion = {
        REDUCE: REDUCE, sleep: sleep, SKEL_MIN_MS: SKEL_MIN_MS,
        countUp: countUp, staggerRows: staggerRows, showSkeleton: showSkeleton
    };
})();

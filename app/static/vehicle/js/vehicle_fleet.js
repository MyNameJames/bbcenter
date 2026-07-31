/* ============================================================
   Manage Fleet — page JS
   - Modal bind (edit/delete vehicle, edit/delete driver)
   - Vehicle history fetch
   - Lucide refresh hook
   ============================================================ */
(function () {
    'use strict';

    const TH_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

    function setVal(id, v) {
        const el = document.getElementById(id);
        if (el) el.value = v ?? '';
    }
    function setText(id, v) {
        const el = document.getElementById(id);
        if (el) el.textContent = v ?? '';
    }
    function setChecked(id, v) {
        const el = document.getElementById(id);
        if (el) el.checked = !!v;
    }

    // ue-chip radio ตั้งค่าผ่าน JS (.checked=true เฉยๆ) ไม่ทำให้ badge/label ของ ue-chip-dd
    // อัปเดต — bb-components.js sync ด้วย native 'change' event เท่านั้น (ดู initUeChipDd
    // ใน bb-components.js) ต้อง dispatch เองหลังตั้งค่า .checked ให้ทุกตัวใน group ครบก่อน
    function syncChip(anyRadioId) {
        const el = document.getElementById(anyRadioId);
        if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Add/Edit Vehicle — merged เป็น modal เดียว (#addVehicleModal, 2026-07-31)
    // e.relatedTarget มี data-id = เปิดจากปุ่มแก้ไข (edit mode) · ไม่มี = เปิดจากปุ่ม toolbar (add mode)
    const addVehicleModal = document.getElementById('addVehicleModal');
    if (addVehicleModal) {
        addVehicleModal.addEventListener('show.bs.modal', function (e) {
            const b = e.relatedTarget;
            const isEdit = !!(b && b.dataset.id);

            setVal('av_action',     isEdit ? 'edit_vehicle' : 'add_vehicle');
            setVal('av_vehicle_id', isEdit ? b.dataset.id : '');
            setText('avModalEyebrow',  isEdit ? '#แก้ไขข้อมูล' : '#แบบฟอร์ม');
            setText('avModalTitle',    isEdit ? 'แก้ไขข้อมูลรถ' : 'เพิ่มรถใหม่ในระบบ');
            setText('avModalSubtitle', isEdit ? 'แก้ไขข้อมูลรถคันนี้ในระบบ' : 'กรอกข้อมูลรถเพื่อเพิ่มเข้าระบบ');
            const submitBtn = document.getElementById('avSubmitBtn');
            if (submitBtn) submitBtn.title = isEdit ? 'บันทึกการแก้ไข' : 'บันทึกรถใหม่';

            setVal('av_plate', isEdit ? b.dataset.plate : '');
            setVal('av_brand', isEdit ? (b.dataset.brand || '') + (b.dataset.model ? ' ' + b.dataset.model : '') : '');
            setVal('av_fuel_rate', isEdit ? (b.dataset.fuelRate || 10) : 10);
            window.avSetCapacity?.(isEdit ? (parseInt(b.dataset.capacity, 10) || 1) : 8);

            setChecked('av_vtype_pickup', isEdit && b.dataset.vehicleType === 'pickup');
            setChecked('av_vtype_van',    isEdit && b.dataset.vehicleType === 'van');
            setChecked('av_vtype_truck6', isEdit && b.dataset.vehicleType === 'truck6');
            syncChip('av_vtype_pickup');

            setChecked('av_status_active',      !isEdit || b.dataset.status === 'active');
            setChecked('av_status_maintenance',  isEdit && b.dataset.status === 'maintenance');
            syncChip('av_status_active');

            const svcSection = document.getElementById('avServiceSection');
            if (svcSection) svcSection.classList.toggle('d-none', !isEdit);
            setVal('av_svc_date', isEdit ? (b.dataset.svcDate || '') : '');
            setVal('av_svc_km',   isEdit ? (b.dataset.svcKm  || '') : '');
            setVal('av_tax_date', isEdit ? (b.dataset.taxDate || '') : '');
        });
    }

    // Delete Vehicle
    const deleteVehicleModal = document.getElementById('deleteVehicleModal');
    if (deleteVehicleModal) {
        deleteVehicleModal.addEventListener('show.bs.modal', function (e) {
            const b = e.relatedTarget;
            if (!b) return;
            setVal('dv_id',  b.dataset.id);
            setText('dv_name', b.dataset.name);
        });
    }

    // คนขับ: data-* อยู่บน .fleet-driver-row (<tr> จริง, 2026-07-30) — ปุ่ม view/edit/delete อ่านจาก row ที่ครอบ
    function driverRowOf(el) {
        return el ? el.closest('.fleet-driver-row') : null;
    }

    function fillEditDriver(d) {
        if (!d) return;
        setVal('ed_id',               d.id);
        setVal('ed_name',             d.name);
        setVal('ed_phone',            d.phone);
        setChecked('ed_active',       d.active === 'true');
        setVal('ed_user_id',          d.userId || '');
        setVal('ed_national_id',      d.nationalId || '');
        setVal('ed_addr_line',        d.addrLine || '');
        setVal('ed_addr_subdistrict', d.addrSubdistrict || '');
        setVal('ed_addr_district',    d.addrDistrict || '');
        setVal('ed_addr_province',    d.addrProvince || '');
        setVal('ed_addr_postal',      d.addrPostal || '');

        const avEl = document.getElementById('ed_avatar_current');
        if (avEl) {
            if (d.avatar) { avEl.href = d.avatar; avEl.style.display = ''; }
            else { avEl.style.display = 'none'; }
        }
        const idEl = document.getElementById('ed_idcard_current');
        if (idEl) {
            if (d.idcard) { idEl.href = d.idcard; idEl.style.display = ''; }
            else { idEl.style.display = 'none'; }
        }
    }

    function composeAddress(d) {
        const parts = [];
        if (d.addrLine)        parts.push(d.addrLine);
        if (d.addrSubdistrict) parts.push('ต.' + d.addrSubdistrict);
        if (d.addrDistrict)    parts.push('อ.' + d.addrDistrict);
        if (d.addrProvince)    parts.push('จ.' + d.addrProvince);
        if (d.addrPostal)      parts.push(d.addrPostal);
        return parts.join(' ');
    }

    // Edit Driver
    const editDriverModal = document.getElementById('editDriverModal');
    if (editDriverModal) {
        editDriverModal.addEventListener('show.bs.modal', function (e) {
            const row = driverRowOf(e.relatedTarget);
            if (row) fillEditDriver(row.dataset);
        });
    }

    // Delete Driver
    const deleteDriverModal = document.getElementById('deleteDriverModal');
    if (deleteDriverModal) {
        deleteDriverModal.addEventListener('show.bs.modal', function (e) {
            const row = driverRowOf(e.relatedTarget);
            if (!row) return;
            setVal('dd_id', row.dataset.id);
            setText('dd_name', row.dataset.name);
        });
    }

    // Driver Detail (read-only) + ปุ่มแก้ไขในนั้น
    let detailDataset = null;
    const driverDetailModal = document.getElementById('driverDetailModal');
    if (driverDetailModal) {
        driverDetailModal.addEventListener('show.bs.modal', function (e) {
            const row = driverRowOf(e.relatedTarget);
            if (!row) return;
            const d = row.dataset;
            detailDataset = d;

            setText('dd_detail_name', d.name);
            setText('dd_detail_jobs', d.jobs || '0');
            setText('dd_detail_phone', d.phone || '—');
            setText('dd_detail_nid', d.nationalId || '—');
            setText('dd_detail_addr', composeAddress(d) || '—');

            // avatar
            const avImg = document.getElementById('dd_avatar_img');
            const avIni = document.getElementById('dd_avatar_initials');
            if (d.avatar) {
                avImg.src = d.avatar; avImg.style.display = '';
                if (avIni) avIni.style.display = 'none';
            } else {
                avImg.style.display = 'none';
                if (avIni) { avIni.style.display = ''; avIni.textContent = (d.name || '').slice(0, 1); }
            }

            // status badge
            const st = document.getElementById('dd_detail_status');
            if (st) {
                st.innerHTML = d.active === 'true'
                    ? '<span class="vc-badge vc-badge-success vc-badge-dot">ใช้งาน</span>'
                    : '<span class="vc-badge vc-badge-neutral vc-badge-dot">ปิด</span>';
            }

            // username chip
            const un = document.getElementById('dd_detail_username');
            if (un) {
                if (d.username) { un.textContent = '@' + d.username; un.style.display = ''; }
                else { un.style.display = 'none'; }
            }

            // id card image
            const wrap = document.getElementById('dd_idcard_wrap');
            const link = document.getElementById('dd_idcard_link');
            const img  = document.getElementById('dd_idcard_img');
            if (d.idcard) {
                link.href = d.idcard; img.src = d.idcard; wrap.style.display = '';
            } else {
                wrap.style.display = 'none';
            }
        });
    }

    // ปุ่ม "แก้ไข" ใน detail modal → ปิด detail แล้วเปิด edit ของคนเดิม
    const ddEditBtn = document.getElementById('dd_edit_btn');
    if (ddEditBtn && window.bootstrap) {
        ddEditBtn.addEventListener('click', function () {
            const captured = detailDataset;
            const detailInstance = bootstrap.Modal.getInstance(driverDetailModal);
            if (detailInstance) detailInstance.hide();
            driverDetailModal.addEventListener('hidden.bs.modal', function handler() {
                driverDetailModal.removeEventListener('hidden.bs.modal', handler);
                fillEditDriver(captured);
                bootstrap.Modal.getOrCreateInstance(editDriverModal).show();
            });
        });
    }

    // Vehicle History
    const histModal = document.getElementById('vehicleHistoryModal');
    if (histModal) {
        histModal.addEventListener('show.bs.modal', function (e) {
            const b = e.relatedTarget;
            if (!b) return;
            setText('histVehicleName', b.dataset.name);

            const loading = document.getElementById('histLoading');
            const content = document.getElementById('histContent');
            if (loading) loading.style.display = 'flex';
            if (content) content.style.display = 'none';

            fetch(`/api/vehicle/${b.dataset.id}/history`)
                .then(r => r.json())
                .then(data => {
                    setText('histTotalKm', (data.total_km || 0).toLocaleString());
                    const tbody = document.getElementById('histTableBody');
                    if (tbody) {
                        tbody.innerHTML = '';
                        (data.rows || []).forEach((r) => {
                            const tr = document.createElement('tr');
                            const distance = r.distance
                                ? `<span class="mf-distance-pos vc-mono">+${r.distance.toLocaleString()}</span>`
                                : '<span class="vc-td-muted">—</span>';
                            const odo = r.odometer_end
                                ? `<span class="vc-mono">${r.odometer_end.toLocaleString()}</span>`
                                : '<span class="vc-td-muted">—</span>';
                            tr.innerHTML = `
                                <td class="vc-td-muted">#${r.id}</td>
                                <td class="vc-td-muted">${r.date || '—'}</td>
                                <td class="vc-td-strong">${r.destination || '—'}</td>
                                <td>${r.driver || '—'}</td>
                                <td class="vc-td-num">${distance}</td>
                                <td class="vc-td-num">${odo}</td>
                            `;
                            tbody.appendChild(tr);
                        });
                    }
                    if (loading) loading.style.display = 'none';
                    if (content) content.style.display = 'block';
                })
                .catch(() => {
                    if (loading) loading.innerHTML = '<span class="vc-td-muted">โหลดประวัติไม่สำเร็จ</span>';
                });
        });
    }

    // Refresh lucide icons after modal show (for dynamically inserted icons)
    document.addEventListener('shown.bs.modal', function () {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    });

    // Tab รถ/คนขับ — สลับ panel เต็มความกว้าง (pattern เดียวกับ bindTab2Tabs ใน vehicle_admin.js)
    function bindFleetTabs() {
        const wrap = document.getElementById('fleetTabWrap');
        if (!wrap) return;
        const vehiclesPanel = document.getElementById('fleetPanelVehicles');
        const driversPanel  = document.getElementById('fleetPanelDrivers');
        wrap.querySelectorAll('.tab2-tab').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const panel = btn.dataset.tab || 'vehicles';
                wrap.querySelectorAll('.tab2-tab').forEach(function (c) {
                    c.classList.toggle('active', c === btn);
                });
                if (vehiclesPanel) vehiclesPanel.classList.toggle('d-none', panel !== 'vehicles');
                if (driversPanel)  driversPanel.classList.toggle('d-none', panel !== 'drivers');
            });
        });
    }
    bindFleetTabs();

    // Stepper "เพิ่มรถใหม่" (#addVehicleModal) — pattern เดียวกับ .ui-stepper ใน vehicle_book.html
    // (min 1, ไม่มี max) — sync hidden input #fleetCapacityInput ด้วย ไม่งั้น capacity ไม่ถูกส่งไป
    // form เลย (int(None) พังตอน controller อ่านค่า)
    (function bindFleetCapacityStepper() {
        const wrap  = document.getElementById('fleetCapacityStepper');
        const input = document.getElementById('fleetCapacityInput');
        if (!wrap || !input) return;
        const minus = wrap.querySelector('.minus');
        const plus  = wrap.querySelector('.plus');
        const val   = wrap.querySelector('.step-value');
        let count = parseInt(val.textContent, 10) || 1;
        function render() {
            val.textContent = count;
            input.value = count;
            minus.disabled = count <= 1;
        }
        minus.addEventListener('click', function () { if (count > 1) { count--; render(); } });
        plus.addEventListener('click', function () { count++; render(); });
        render();

        // เรียกจากภายนอก (edit mode ของ #addVehicleModal) ให้ sync ทั้ง count ภายใน +
        // hidden input + ตัวเลขที่โชว์ — pattern เดียวกับ window.bkSetPax ใน vehicle_book.html
        window.avSetCapacity = function (n) {
            count = Math.max(1, parseInt(n, 10) || 1);
            render();
        };
    })();
})();

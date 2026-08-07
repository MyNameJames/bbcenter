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

    // Add/Edit Driver — merged เป็น modal เดียว (#addDriverModal, 2026-07-31), pattern เดียวกับ
    // #addVehicleModal (docs/notes/modal_pattern.md) ต่างตรง data-* อยู่บน .fleet-driver-row
    // ไม่ใช่ปุ่ม — เรียกจาก isEdit=false ตอน add จะได้ d={} (ไม่ใช่ null) กัน d.xxx พังตอนอ่าน
    function fillDriverForm(d, isEdit) {
        setVal('ed_action', isEdit ? 'edit_driver' : 'add_driver');
        setVal('ed_id',     isEdit ? d.id : '');
        setText('adModalEyebrow',  isEdit ? '#แก้ไขข้อมูล' : '#แบบฟอร์ม');
        setText('adModalTitle',    isEdit ? 'แก้ไขข้อมูลคนขับ' : 'เพิ่มคนขับใหม่');
        setText('adModalSubtitle', isEdit ? 'แก้ไขข้อมูลคนขับคนนี้ในระบบ' : 'กรอกข้อมูลคนขับเพื่อเพิ่มเข้าระบบ');
        const submitBtn = document.getElementById('adSubmitBtn');
        if (submitBtn) submitBtn.title = isEdit ? 'บันทึกการแก้ไข' : 'บันทึกคนขับใหม่';

        setVal('ed_name',             isEdit ? d.name : '');
        setVal('ed_phone',            isEdit ? d.phone : '');
        setVal('ed_user_id',          isEdit ? (d.userId || '') : '');
        setVal('ed_national_id',      isEdit ? (d.nationalId || '') : '');
        setVal('ed_addr_line',        isEdit ? (d.addrLine || '') : '');
        setVal('ed_addr_subdistrict', isEdit ? (d.addrSubdistrict || '') : '');
        setVal('ed_addr_district',    isEdit ? (d.addrDistrict || '') : '');
        setVal('ed_addr_province',    isEdit ? (d.addrProvince || '') : '');
        setVal('ed_addr_postal',      isEdit ? (d.addrPostal || '') : '');

        // <input type=file> ไม่ยอมให้ set .value เป็นไฟล์ผ่าน JS — reset ทุกครั้งที่เปิด (ทั้ง 2
        // โหมด) กันไฟล์ที่เคยเลือกไว้ค้างจากการเปิด modal รอบก่อนหน้า (add ครั้งก่อน/edit คนละคน)
        // แล้ว prefill preview จากรูปเดิมถ้ามี (edit mode)
        const avatarFile = document.getElementById('profileImage');
        if (avatarFile) avatarFile.value = '';
        setAvatarPreview(isEdit ? d.avatar : '');

        const idcardFile = document.getElementById('idcardFile');
        if (idcardFile) idcardFile.value = '';
        setIdcardState(isEdit && d.idcard ? { existingUrl: d.idcard } : null);
    }

    // ── Avatar circle (#addDriverModal .profile-upload) ──────────────────
    // ย้ายมาจาก inline <script> เดิมในเทมเพลต (2 บั๊ก: reader ถูกอ้างนอก scope ที่ประกาศ →
    // ปุ่มลบรูปไม่เคยทำงาน, input ไม่มี name= → เลือกรูปแล้วไม่เคยถูก submit เลย) — แก้ทั้งคู่ที่นี่
    function setAvatarPreview(url) {
        const preview     = document.getElementById('profilePreview');
        const placeholder = document.getElementById('profilePlaceholder');
        if (!preview || !placeholder) return;
        if (url) {
            preview.src = url;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        } else {
            preview.src = '';
            preview.style.display = 'none';
            placeholder.style.display = 'flex';
        }
    }

    (function bindAvatarUpload() {
        const input = document.getElementById('profileImage');
        const removeBtn = document.getElementById('removeProfile');
        if (!input || !removeBtn) return;
        input.addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => setAvatarPreview(e.target.result);
            reader.readAsDataURL(file);
        });
        removeBtn.addEventListener('click', function () {
            input.value = '';
            setAvatarPreview('');
        });
    })();

    // ── รูปบัตรประชาชน (#addDriverModal #idcardDropzone/#idcardUploadCard) ─
    // toggle state ว่าง (dropzone, คลิกเปิด file picker ผ่าน <label for>) ↔ อัปโหลดแล้ว
    // (การ์ด + progress จำลอง) — ย้ายมาจาก inline <script> เดิมที่อ้าง id ผิด (fileInput/
    // dropzoneArea/uploadedCard ฯลฯ ไม่มีอยู่จริงในหน้านี้เลย โยนไฟล์เดิมทิ้งทั้งก้อน)
    // preview URL ของรูปบัตรที่กำลังโชว์ในการ์ด — ใช้ตอนคลิกเปิด #idcardPreviewModal
    // (ไฟล์เพิ่งเลือก = blob URL ต้อง revoke ตัวเก่าเองกัน memory leak, ไฟล์เดิม = URL จริงจาก server)
    let idcardObjectUrl = '';
    let idcardPreviewUrl = '';

    function setIdcardState(state) {
        // state: null = ว่าง · {file} = เพิ่งเลือกจาก input · {existingUrl} = ไฟล์เดิม (edit mode)
        const card   = document.getElementById('idcardUploadCard');
        const zone   = document.getElementById('idcardDropzone');
        const nameEl = document.getElementById('idcardFileName');
        const bar    = document.getElementById('idcardProgressBar');
        if (!card || !zone) return;
        if (idcardObjectUrl) { URL.revokeObjectURL(idcardObjectUrl); idcardObjectUrl = ''; }
        if (!state) {
            card.classList.add('d-none');
            zone.classList.remove('d-none');
            idcardPreviewUrl = '';
            return;
        }
        card.classList.remove('d-none');
        zone.classList.add('d-none');
        if (state.file) {
            nameEl.textContent = state.file.name;
            idcardObjectUrl = URL.createObjectURL(state.file);
            idcardPreviewUrl = idcardObjectUrl;
            if (bar) {
                bar.style.width = '0%';
                let progress = 0;
                const interval = setInterval(() => {
                    progress += 20;
                    if (progress >= 100) { progress = 100; clearInterval(interval); }
                    bar.style.width = progress + '%';
                }, 80);
            }
        } else {
            nameEl.textContent = 'รูปบัตรประชาชน (ไฟล์ปัจจุบัน)';
            idcardPreviewUrl = state.existingUrl;
            if (bar) bar.style.width = '100%';
        }
    }

    (function bindIdcardUpload() {
        const input = document.getElementById('idcardFile');
        const removeBtn = document.getElementById('idcardRemoveBtn');
        if (!input || !removeBtn) return;
        input.addEventListener('change', function () {
            const file = this.files[0];
            if (file) setIdcardState({ file });
        });
        removeBtn.addEventListener('click', function (e) {
            e.stopPropagation(); // กันคลิกทะลุไปเปิด preview modal (ปุ่มอยู่ในการ์ดเดียวกัน)
            input.value = '';
            setIdcardState(null);
        });
    })();

    // คลิกการ์ด "อัปโหลดแล้ว" → เปิด #idcardPreviewModal โชว์รูปเต็ม (กว้างพอดีจอ)
    // ใช้ได้ทั้งไฟล์เพิ่งเลือก (blob URL) และไฟล์เดิมตอน edit (URL จริงจาก server)
    // — modal นี้ปิด backdrop ของ Bootstrap เอง (data-bs-backdrop="false", ดู CSS overlay ของ
    // ตัวเองในเทมเพลต) เลยต้องทำ click-outside-to-close เอง: คลิกตรงพื้นหลังมืด (target ตรง
    // modal root เอง ไม่ใช่ลูกข้างในอย่างรูป/ปุ่ม) ให้ปิด
    (function bindIdcardPreview() {
        const card    = document.getElementById('idcardUploadCard');
        const modalEl = document.getElementById('idcardPreviewModal');
        const img     = document.getElementById('idcardPreviewImg');
        if (!card || !modalEl || !img || !window.bootstrap) return;
        card.addEventListener('click', function () {
            if (!idcardPreviewUrl) return;
            img.src = idcardPreviewUrl;
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        });
        modalEl.addEventListener('click', function (e) {
            if (e.target === modalEl) {
                bootstrap.Modal.getInstance(modalEl)?.hide();
            }
        });
    })();

    function composeAddress(d) {
        const parts = [];
        if (d.addrLine)        parts.push(d.addrLine);
        if (d.addrSubdistrict) parts.push('ต.' + d.addrSubdistrict);
        if (d.addrDistrict)    parts.push('อ.' + d.addrDistrict);
        if (d.addrProvince)    parts.push('จ.' + d.addrProvince);
        if (d.addrPostal)      parts.push(d.addrPostal);
        return parts.join(' ');
    }

    // Add/Edit Driver — relatedTarget อาจเป็นปุ่ม toolbar (ไม่อยู่ใน row → null → add mode),
    // ปุ่มแก้ไขต่อแถว (อยู่ใน row → edit mode), หรือ row เองที่ dd_edit_btn ส่งผ่าน .show(row)
    // (driverRowOf ใช้ .closest() — element ที่ตรง selector อยู่แล้วคืนตัวเองได้)
    const addDriverModal = document.getElementById('addDriverModal');
    if (addDriverModal) {
        addDriverModal.addEventListener('show.bs.modal', function (e) {
            const row = driverRowOf(e.relatedTarget);
            fillDriverForm(row ? row.dataset : {}, !!row);
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

    // สถานะคนขับ (คอลัมน์ "สถานะ" ในตาราง) — ย้ายออกจาก modal (เดิม checkbox "สถานะใช้งาน")
    // มาเป็นปุ่มกดตรงในตาราง คงหน้าตา .bb-status-inline เดิมทุกอย่าง แค่ทำให้กดสลับได้ทันที
    // (AJAX เดียว ไม่เปิด modal — mirror pattern เดียวกับ fixDone() ใน vehicle_admin.js)
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.mf-driver-toggle-active');
        if (!btn) return;
        const row = driverRowOf(btn);
        if (!row) return;
        fetch(`/vehicle/admin/driver/${row.dataset.id}/toggle-active`, { method: 'POST' })
            .then(r => r.json())
            .then(data => {
                if (!data.ok) return;
                row.dataset.active = data.active ? 'true' : 'false';
                btn.classList.toggle('is-ok', data.active);
                btn.classList.toggle('is-neutral', !data.active);
                btn.innerHTML = `<span class="material-symbols-rounded">${data.active ? 'check_circle' : 'circle'}</span>${data.active ? 'พร้อมขับรถ' : 'ไม่พร้อมขับรถ'}`;
            });
    });

    // Driver Detail (read-only) + ปุ่มแก้ไขในนั้น
    let detailRow = null;
    const driverDetailModal = document.getElementById('driverDetailModal');
    if (driverDetailModal) {
        driverDetailModal.addEventListener('show.bs.modal', function (e) {
            const row = driverRowOf(e.relatedTarget);
            if (!row) return;
            const d = row.dataset;
            detailRow = row;

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

    // ปุ่ม "แก้ไข" ใน detail modal → ปิด detail แล้วเปิด #addDriverModal ของคนเดิม
    // ส่ง row เป็น relatedTarget ผ่าน .show(row) (Bootstrap API รับ arg ได้) แทนการเรียก
    // fillDriverForm() เอง — ให้ไหลผ่าน show.bs.modal listener เดียวกับปุ่มแก้ไขในตาราง
    const ddEditBtn = document.getElementById('dd_edit_btn');
    if (ddEditBtn && window.bootstrap) {
        ddEditBtn.addEventListener('click', function () {
            const row = detailRow;
            const detailInstance = bootstrap.Modal.getInstance(driverDetailModal);
            if (detailInstance) detailInstance.hide();
            driverDetailModal.addEventListener('hidden.bs.modal', function handler() {
                driverDetailModal.removeEventListener('hidden.bs.modal', handler);
                bootstrap.Modal.getOrCreateInstance(addDriverModal).show(row);
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

    // "งานในสัปดาห์" (คอลัมน์คนขับ) — chevron ทุกแถวคุมสัปดาห์เดียวกันทั้งตาราง ไม่ใช่ต่อแถว
    // (server render สัปดาห์ปัจจุบันมาให้ตั้งต้นแล้ว ผ่าน #fleetDriverTable[data-week-start])
    // คลิก prev/next → fetch /vehicle/admin/driver-week แล้ว re-render ทุกแถวพร้อมกัน
    (function bindFleetWeekNav() {
        const table = document.getElementById('fleetDriverTable');
        if (!table) return;
        let weekStart = table.dataset.weekStart || '';
        const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

        // ต้อง build string เองจาก local Y/M/D — ห้ามใช้ .toISOString() (แปลงเป็น UTC ก่อน
        // slice ทำให้วันที่เพี้ยนไป 1 วันเมื่อ browser อยู่ timezone +7 เช่น ICT — "next" เจอบั๊กนี้
        // แล้วดันวันตกไปอยู่ "เสาร์" ของสัปดาห์เดิม ทำให้กดแล้วเหมือนไม่ขยับเลย)
        function toIsoDate(d) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }

        function render(label, statusByDriver) {
            document.querySelectorAll('#fleetDriverTable .fleet-week-label').forEach(function (el) {
                el.textContent = label;
            });
            document.querySelectorAll('#fleetDriverTable .fleet-driver-row').forEach(function (row) {
                const daysEl = row.querySelector('.fleet-week-days');
                if (!daysEl) return;
                const statuses = (statusByDriver && statusByDriver[row.dataset.id]) || Array(7).fill('off');
                daysEl.innerHTML = statuses.map(function (status, i) {
                    const cls = status && status !== 'off' ? ' is-' + status : '';
                    return `<span class="fleet-day${cls}">${dayLabels[i]}</span>`;
                }).join('');
            });
        }

        function goToWeek(newWeekStart) {
            fetch(`/vehicle/admin/driver-week?week_start=${newWeekStart}`)
                .then(r => r.json())
                .then(function (data) {
                    if (!data.ok) return;
                    weekStart = data.weekStart;
                    render(data.label, data.drivers);
                });
        }

        table.addEventListener('click', function (e) {
            const btn = e.target.closest('.fleet-week-nav');
            if (!btn || !weekStart) return;
            const d = new Date(weekStart + 'T00:00:00');
            d.setDate(d.getDate() + (btn.dataset.dir === 'prev' ? -7 : 7));
            goToWeek(toIsoDate(d));
        });
    })();

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

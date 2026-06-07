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

    // Edit Vehicle
    const editVehicleModal = document.getElementById('editVehicleModal');
    if (editVehicleModal) {
        editVehicleModal.addEventListener('show.bs.modal', function (e) {
            const b = e.relatedTarget;
            if (!b) return;
            setVal('ev_id',        b.dataset.id);
            setVal('ev_brand',     b.dataset.brand);
            setVal('ev_model',     b.dataset.model);
            setVal('ev_plate',     b.dataset.plate);
            setVal('ev_capacity',  b.dataset.capacity);
            setVal('ev_fuel_rate', b.dataset.fuelRate || 10);
            setVal('ev_status',    b.dataset.status);
            setVal('ev_svc_date',  b.dataset.svcDate || '');
            setVal('ev_svc_km',    b.dataset.svcKm  || '');
            setVal('ev_tax_date',  b.dataset.taxDate || '');
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

    // Edit Driver
    const editDriverModal = document.getElementById('editDriverModal');
    if (editDriverModal) {
        editDriverModal.addEventListener('show.bs.modal', function (e) {
            const b = e.relatedTarget;
            if (!b) return;
            setVal('ed_id',      b.dataset.id);
            setVal('ed_name',    b.dataset.name);
            setVal('ed_phone',   b.dataset.phone);
            setChecked('ed_active', b.dataset.active === 'true');
            setVal('ed_user_id', b.dataset.userId || '');
        });
    }

    // Delete Driver
    const deleteDriverModal = document.getElementById('deleteDriverModal');
    if (deleteDriverModal) {
        deleteDriverModal.addEventListener('show.bs.modal', function (e) {
            const b = e.relatedTarget;
            if (!b) return;
            setVal('dd_id', b.dataset.id);
            setText('dd_name', b.dataset.name);
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
})();

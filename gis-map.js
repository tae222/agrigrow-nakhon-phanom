/* ==========================================================================
   โมดูลที่ 2: ระบบแผนที่ดาวเทียมและพิกัดแปลงเพาะปลูก (js/gis-map.js)
   - แก้ไขปัญหาซูมแผนที่แล้วภาพไม่ขึ้น (กำหนด maxNativeZoom: 17 สำหรับภาพดาวเทียม Esri)
   - ใช้ ResizeObserver + invalidateSize() อัตโนมัติเมื่อสลับแท็บมาหน้าแผนที่
   - แยกจังหวะ setView() และ openPopup() เพื่อไม่ให้แอนิเมชันชนกันจนแผ่นภาพแผนที่ค้าง
   ========================================================================== */

        let pendingFocusPlotId = null;
        let mapResizeObserver = null;

        function initOrRefreshMap() {
            const mapContainer = document.getElementById('farmGisMap');
            if (!mapContainer || typeof L === 'undefined') return;

            if (!leafletMap) {
                leafletMap = L.map('farmGisMap', {
                    center: [17.3945, 104.7693],
                    zoom: 15,
                    minZoom: 5,
                    maxZoom: 20,
                    zoomAnimation: true
                });

                // สำคัญ: กำหนด maxNativeZoom: 17 เพราะภาพดาวเทียม Esri ในต่างจังหวัดมีภาพละเอียดสุดที่ระดับ 17
                // เมื่อซูมลึกกว่าระดับ 17 (เช่น 18-20) Leaflet จะขยายภาพระดับ 17 ให้แสดงผลต่อทันทีโดยไม่ขึ้นแผ่นสีขาว/เทาว่างเปล่า
                satelliteTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    maxZoom: 20,
                    maxNativeZoom: 17,
                    attribution: 'Tiles &copy; Esri World Imagery'
                });

                streetTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 20,
                    maxNativeZoom: 18,
                    attribution: '&copy; OpenStreetMap contributors'
                });

                satelliteTileLayer.addTo(leafletMap);
                mapMarkersGroup = L.layerGroup().addTo(leafletMap);

                // ดักจับขนาดกรอบแผนที่อัตโนมัติ (ป้องกันปัญหาเปิดหน้าแผนที่หรือซูมแล้วแผนที่ขึ้นไม่เต็มกรอบ)
                if (typeof ResizeObserver !== 'undefined' && !mapResizeObserver) {
                    mapResizeObserver = new ResizeObserver(() => {
                        if (leafletMap) {
                            leafletMap.invalidateSize({ animate: false });
                        }
                    });
                    mapResizeObserver.observe(mapContainer);
                }

                // เมื่อซูมจบ ให้บังคับตรวจสอบขนาดและโหลดแผ่นภาพที่ตกค้าง
                leafletMap.on('zoomend moveend', function() {
                    if (leafletMap) {
                        leafletMap.invalidateSize({ animate: false });
                    }
                });

                // เมื่อคลิกบนแผนที่ ให้ดึงค่า Latitude / Longitude มาใส่ช่องสร้างแปลงใหม่ทันที
                leafletMap.on('click', function(e) {
                    const lat = Number(e.latlng.lat.toFixed(5));
                    const lng = Number(e.latlng.lng.toFixed(5));
                    const latInput = document.getElementById('mapQuickLat');
                    const lngInput = document.getElementById('mapQuickLng');
                    if (latInput) latInput.value = lat;
                    if (lngInput) lngInput.value = lng;

                    const simLat = document.getElementById('inputSimTreeLat');
                    const simLng = document.getElementById('inputSimTreeLng');
                    if (simLat) simLat.value = lat;
                    if (simLng) simLng.value = lng;

                    const label = document.getElementById('clickedCoordLabel');
                    if (label) {
                        label.textContent = `📍 พิกัดที่เลือกบนแผนที่: Latitude ${lat}, Longitude ${lng} (พร้อมปักหมุดต้นไม้ใหม่ด้านขวา)`;
                    }

                    if (tempClickedMarker) {
                        leafletMap.removeLayer(tempClickedMarker);
                    }
                    tempClickedMarker = L.circleMarker([lat, lng], {
                        radius: 9,
                        color: '#fbbf24',
                        weight: 3,
                        fillColor: '#f59e0b',
                        fillOpacity: 0.9
                    }).addTo(leafletMap).bindPopup(`<b>จุดพิกัดที่เลือกสำหรับปักหมุดต้นไม้ใหม่</b><br>Lat: ${lat}, Lng: ${lng}`).openPopup();
                });
            }

            // รีเฟรชขนาดแผนที่และวาดหมุดทั้งหมด
            requestAnimationFrame(() => {
                if (!leafletMap) return;
                leafletMap.invalidateSize({ animate: false });
                renderMapMarkers();

                setTimeout(() => {
                    if (!leafletMap) return;
                    leafletMap.invalidateSize({ animate: false });
                    if (pendingFocusPlotId !== null) {
                        const targetId = pendingFocusPlotId;
                        pendingFocusPlotId = null;
                        focusPlotOnMap(targetId);
                    }
                }, 180);
            });
        }

        function setMapLayer(mode) {
            if (!leafletMap) return;
            const satBtn = document.getElementById('btnLayerSatellite');
            const strBtn = document.getElementById('btnLayerStreet');

            if (mode === 'satellite') {
                if (streetTileLayer) leafletMap.removeLayer(streetTileLayer);
                if (satelliteTileLayer && !leafletMap.hasLayer(satelliteTileLayer)) {
                    satelliteTileLayer.addTo(leafletMap);
                }
                if (satBtn) satBtn.className = 'theme-btn-primary text-xs font-bold px-3.5 py-2 rounded-xl transition';
                if (strBtn) strBtn.className = 'bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition';
                leafletMap.invalidateSize({ animate: false });
                showToast('สลับเป็นมุมมองภาพถ่ายดาวเทียม (Satellite) แล้ว');
            } else {
                if (satelliteTileLayer) leafletMap.removeLayer(satelliteTileLayer);
                if (streetTileLayer && !leafletMap.hasLayer(streetTileLayer)) {
                    streetTileLayer.addTo(leafletMap);
                }
                if (strBtn) strBtn.className = 'theme-btn-primary text-xs font-bold px-3.5 py-2 rounded-xl transition';
                if (satBtn) satBtn.className = 'bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition';
                leafletMap.invalidateSize({ animate: false });
                showToast('สลับเป็นมุมมองแผนที่ถนน (Street Map) แล้ว');
            }
        }

        function renderMapMarkers() {
            const listEl = document.getElementById('mapPlotListContainer');
            if (listEl) {
                listEl.innerHTML = plots.map((p, idx) => {
                    const plotLogs = logs.filter(r => r.plotId === p.id).sort((a, b) => b.ageDays - a.ageDays);
                    const latest = plotLogs[0] || { ageDays: 14, heightCm: 15.0, leafCount: 6, moisture: 70 };
                    const lat = Number(p.lat || 17.3942).toFixed(4);
                    const lng = Number(p.lng || 104.7693).toFixed(4);
                    const isNewTree = idx >= 4;
                    return `
                        <div class="bg-white p-3 rounded-xl border ${isNewTree ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'} hover:border-emerald-400 transition flex items-center justify-between gap-2">
                            <div class="min-w-0">
                                <div class="flex items-center gap-1.5">
                                    <span class="text-xs font-extrabold text-slate-800 truncate">${p.icon || '🌱'} ${p.name}</span>
                                    ${isNewTree ? '<span class="bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">หมุดใหม่</span>' : ''}
                                </div>
                                <div class="text-[11px] text-slate-500">📍 พิกัด <span class="font-mono font-bold text-emerald-700">${lat}, ${lng}</span> • สูง ${latest.heightCm} ซม.</div>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                                <button type="button" onclick="focusPlotOnMap(${p.id})" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1.5 rounded-lg transition">
                                    🎯 ซูมดู
                                </button>
                                <button type="button" onclick="deleteTreeAndGraph(${p.id})" class="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-1.5 rounded-lg transition" title="ลบหมุดต้นไม้นี้และลบกราฟ">
                                    🗑️ ลบหมุด
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            const countBadge = document.getElementById('mapPinnedCountBadge');
            if (countBadge) {
                countBadge.textContent = `📍 ปักหมุดต้นไม้บนแผนที่แล้วทั้งหมด ${plots.length} ต้น`;
            }

            if (!leafletMap || !mapMarkersGroup) return;
            mapMarkersGroup.clearLayers();

            plots.forEach((p, idx) => {
                const rawLat = Number(p.lat);
                const rawLng = Number(p.lng);
                const lat = (isFinite(rawLat) && rawLat !== 0) ? rawLat : 17.3942;
                const lng = (isFinite(rawLng) && rawLng !== 0) ? rawLng : 104.7693;

                const plotLogs = logs.filter(r => r.plotId === p.id).sort((a, b) => b.ageDays - a.ageDays);
                const latest = plotLogs[0] || {
                    ageDays: 14,
                    heightCm: 15.0,
                    leafCount: 6,
                    moisture: 70,
                    stage: 'ระยะต้นกล้า (1-15 วัน)',
                    q1: 5, q2: 5, q3: 5, q4: 5
                };
                const healthAvg = ((latest.q1 + latest.q2 + latest.q3 + latest.q4) / 4).toFixed(2);
                const isNewTree = idx >= 4;
                const borderStyle = isNewTree ? 'border: 3px solid #e11d48; box-shadow: 0 0 12px rgba(225,29,72,0.65);' : '';

                const iconHtml = `<div class="custom-crop-pin" style="${borderStyle}">${p.icon || '🌳'}</div>`;
                const customIcon = L.divIcon({
                    html: iconHtml,
                    className: '',
                    iconSize: [38, 38],
                    iconAnchor: [19, 19],
                    popupAnchor: [0, -18]
                });

                const lastTimeSlot = (typeof currentActive30MinSlot !== 'undefined' && currentActive30MinSlot) ? currentActive30MinSlot : '18:00';
                const popupHtml = `
                    <div style="font-family: 'Sarabun', sans-serif; min-width: 225px;">
                        <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-bottom: 2px;">${p.icon || '🌳'} ${p.name}</div>
                        <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${p.zone}<br>📍 <b>พิกัด GPS:</b> ${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 6px 8px; font-size: 12px; margin-bottom: 6px;">
                            <div>📏 <b>ความสูงล่าสุด:</b> ${latest.heightCm} ซม. (${latest.leafCount} ใบ)</div>
                            <div>💧 <b>ความชื้นดิน:</b> ${latest.moisture}% • อายุ ${latest.ageDays} วัน</div>
                            <div>🌟 <b>ดัชนีสุขภาพพืช:</b> ${healthAvg} / 5.00</div>
                            <div style="color: #be123c; font-weight: 700; margin-top: 3px;">🕒 สรุปผลรอบ 30 นาทีล่าสุด: เวลา ${lastTimeSlot} น.</div>
                        </div>
                        <div style="display: flex; gap: 6px;">
                            <button type="button" onclick="switchTab('report30m')" style="flex: 1; background: #059669; color: white; border: none; border-radius: 8px; padding: 6px 8px; font-size: 11px; font-weight: 700; cursor: pointer;">
                                📈 ดูกราฟ 30 นาที
                            </button>
                            <button type="button" onclick="deleteTreeAndGraph(${p.id})" style="flex: 1; background: #e11d48; color: white; border: none; border-radius: 8px; padding: 6px 8px; font-size: 11px; font-weight: 700; cursor: pointer;">
                                🗑️ ลบหมุด & กราฟ
                            </button>
                        </div>
                    </div>
                `;

                const marker = L.marker([lat, lng], { icon: customIcon }).bindPopup(popupHtml, { autoPan: true });
                marker.plotId = Number(p.id);
                mapMarkersGroup.addLayer(marker);
            });
        }

        // แก้ไขฟังก์ชันซูมดูหมุดบนแผนที่ให้แสดงผลขึ้น 100% ทุกครั้ง
        function focusPlotOnMap(plotId) {
            const targetId = Number(plotId);
            const p = plots.find(item => Number(item.id) === targetId);
            if (!p) return;

            const viewMapEl = document.getElementById('viewMap');
            // หากยังไม่ได้เปิดหน้าแผนที่ ให้สลับมาหน้าแผนที่ก่อนแล้วค่อยซูม
            if (viewMapEl && viewMapEl.classList.contains('hidden')) {
                pendingFocusPlotId = targetId;
                switchTab('map');
                return;
            }

            if (!leafletMap) {
                pendingFocusPlotId = targetId;
                initOrRefreshMap();
                return;
            }

            const rawLat = Number(p.lat);
            const rawLng = Number(p.lng);
            const lat = (isFinite(rawLat) && rawLat !== 0) ? rawLat : 17.3942;
            const lng = (isFinite(rawLng) && rawLng !== 0) ? rawLng : 104.7693;

            // 1. บังคับคำนวณขนาดกรอบแผนที่ใหม่ก่อนซูม (แก้ปัญหาแผนที่ขาว/เทา)
            leafletMap.closePopup();
            leafletMap.invalidateSize({ animate: false });

            // 2. ใช้ setView ที่ระดับซูม 17 (ซึ่งตรงกับ maxNativeZoom ของภาพดาวเทียม Esri พอดี ภาพจึงคมชัดและไม่หาย)
            leafletMap.setView([lat, lng], 17, { animate: true });

            // 3. เปิดป๊อปอัปหลังจากเลื่อนตำแหน่งเสร็จ เพื่อไม่ให้ autoPan ของป๊อปอัปชนกับจังหวะซูม
            setTimeout(() => {
                if (!leafletMap || !mapMarkersGroup) return;
                leafletMap.invalidateSize({ animate: false });
                mapMarkersGroup.eachLayer(layer => {
                    if (Number(layer.plotId) === targetId) {
                        layer.openPopup();
                    }
                });
            }, 220);
        }

        function resetMapView() {
            if (!leafletMap || plots.length === 0) return;
            leafletMap.closePopup();
            leafletMap.invalidateSize({ animate: false });
            if (mapMarkersGroup && mapMarkersGroup.getLayers().length > 0) {
                const groupBounds = L.featureGroup(mapMarkersGroup.getLayers()).getBounds();
                leafletMap.fitBounds(groupBounds.pad(0.25), { maxZoom: 16 });
            } else {
                const first = plots[0];
                leafletMap.setView([first.lat || 17.3942, first.lng || 104.7693], 15, { animate: true });
            }
        }

        function locateUserGPS() {
            if (!navigator.geolocation) {
                showToast('เบราว์เซอร์นี้ไม่รองรับการดึงพิกัด GPS');
                return;
            }
            showToast('กำลังดึงพิกัด GPS ปัจจุบันของคุณ...');
            navigator.geolocation.getCurrentPosition(
                function(pos) {
                    const lat = Number(pos.coords.latitude.toFixed(5));
                    const lng = Number(pos.coords.longitude.toFixed(5));
                    const qLat = document.getElementById('mapQuickLat');
                    const qLng = document.getElementById('mapQuickLng');
                    if (qLat) qLat.value = lat;
                    if (qLng) qLng.value = lng;
                    if (leafletMap) {
                        leafletMap.invalidateSize({ animate: false });
                        leafletMap.setView([lat, lng], 17, { animate: true });
                    }
                    showToast(`ดึงพิกัด GPS สำเร็จ: ${lat}, ${lng}`);
                },
                function() {
                    showToast('ไม่สามารถดึงพิกัด GPS ได้ กรุณาคลิกเลือกจุดบนแผนที่โดยตรง');
                }
            );
        }

        function addPlotFromMap() {
            const nameInput = document.getElementById('mapQuickPlotName');
            const lat = Number(document.getElementById('mapQuickLat')?.value || (17.3942 + (plots.length * 0.0005)).toFixed(5));
            const lng = Number(document.getElementById('mapQuickLng')?.value || (104.7690 + (plots.length * 0.0005)).toFixed(5));
            const name = (nameInput?.value || '').trim();
            if (!name) {
                showToast('กรุณาพิมพ์ชื่อต้นไม้/แปลงเพาะปลูกก่อนกดปักหมุด');
                return;
            }
            const nextId = plots.length > 0 ? Math.max(...plots.map(p => p.id)) + 1 : 1;
            const shortName = name.split('(')[0].trim();
            const newPlot = {
                id: nextId,
                name: name.startsWith('แปลงที่') ? name : `แปลงที่ ${nextId}: ${name}`,
                zone: `พิกัดแผนที่ดาวเทียม GPS (${lat.toFixed(4)}, ${lng.toFixed(4)}) จ.นครพนม`,
                harvestDays: 150,
                icon: '🌳',
                lat: lat,
                lng: lng,
                shortName: shortName
            };
            plots.push(newPlot);
            iotState[nextId] = { water: true, fan: true, light: false, fert: true };

            const now = new Date();
            const dateStr = now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0');
            logs.push({
                id: Date.now(),
                plotId: nextId,
                stage: 'ระยะเจริญเติบโตทางใบ (16-35 วัน)',
                ageDays: 30,
                heightCm: 42.0,
                leafCount: 18,
                moisture: 72,
                soilPh: 6.5,
                q1: 5, q2: 5, q3: 5, q4: 5,
                note: `ปักหมุดต้นไม้ใหม่ลงบนแผนที่พิกัด ${lat.toFixed(4)}, ${lng.toFixed(4)} พร้อมซิงค์กราฟทุก 30 นาที`,
                createdAt: dateStr
            });

            saveData();
            if (nameInput) nameInput.value = '';
            if (tempClickedMarker && leafletMap) {
                leafletMap.removeLayer(tempClickedMarker);
                tempClickedMarker = null;
            }

            if (typeof init30MinTelemetryData === 'function') {
                init30MinTelemetryData(false);
            }
            renderPlotSelectors();
            renderBlueprint();
            renderKanban();
            renderOverview();
            renderDashboard();
            renderPlotsTable();
            renderMapMarkers();
            if (typeof render30MinReport === 'function') {
                render30MinReport();
            }
            focusPlotOnMap(nextId);
            showToast(`📍 ปักหมุด "${newPlot.name}" ลงแผนที่ (${lat.toFixed(4)}, ${lng.toFixed(4)}) และซูมไปยังหมุดเรียบร้อย!`);
        }

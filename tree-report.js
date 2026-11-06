/* ==========================================================================
   โมดูลที่ 5: ระบบจำลองต้นไม้เพิ่ม ปักหมุดแผนที่ & รายงานกราฟแจ้งเวลาทุก 30 นาที (js/tree-report.js)
   ประกอบด้วย:
   - ระบบจำลองต้นไม้เพิ่มพร้อมปักหมุดพิกัด GPS ลงแผนที่ดาวเทียมอัตโนมัติ
   - ระบบนาฬิกาและแจ้งเตือนเวลาที่กำลังสรุปผลทุกๆ 30 นาที (Real-Time & Step Time Notifier)
   - กราฟรวมทุกต้นใน 1 กราฟ (1 Combined Multi-Tree 30-Minute Graph)
   - กราฟแยกเฉพาะแต่ละต้น (Individual Separate 30-Minute Graphs)
   - ตารางรายงานสถิติทุก 30 นาที (Mean / X-bar, S.D.) พร้อมไฮไลต์เวลาที่กำลังสรุปผล
   ========================================================================== */

        let combined30MinChartInstance = null;
        let separate30MinChartInstances = {};
        let telemetry30MinStore = {};
        let current30MinWindow = 'day12h';
        let current30MinMetric = 'growthRate';
        let currentSeparateChartType = 'line';
        let currentActive30MinSlot = '12:00';
        let auto30MinAlertTimer = null;
        let realTimeClockTimer = null;
        let timeAlertLogHistory = [];
        let lastDeletedTreeBackup = null;

        const METRIC_30MIN_CONFIG = {
            growthRate: {
                label: 'อัตราการสังเคราะห์แสงและการเติบโตสะสม (µmol/m²/s)',
                shortLabel: 'อัตราเติบโต/สังเคราะห์แสง',
                unit: 'µmol/m²/s',
                baseMin: 12.5,
                baseMax: 28.0,
                decimals: 2
            },
            moisture: {
                label: 'ความชื้นในดินรอบรากตามเวลาทุก 30 นาที (% RH)',
                shortLabel: 'ความชื้นดินรอบราก',
                unit: '% RH',
                baseMin: 62.0,
                baseMax: 79.5,
                decimals: 1
            },
            sapFlow: {
                label: 'อัตราการดูดซึมน้ำและธาตุอาหารทางลำต้น (มล./30 นาที)',
                shortLabel: 'การดูดซึมน้ำทางลำต้น',
                unit: 'มล./30นาที',
                baseMin: 18.0,
                baseMax: 46.0,
                decimals: 1
            },
            canopyTemp: {
                label: 'อุณหภูมิผิวใบและทรงพุ่มทุก 30 นาที (°C)',
                shortLabel: 'อุณหภูมิทรงพุ่ม',
                unit: '°C',
                baseMin: 25.0,
                baseMax: 33.8,
                decimals: 1
            },
            vitality: {
                label: 'ดัชนีความสมบูรณ์และสุขภาพต้นไม้ราย 30 นาที (คะแนนเต็ม 100)',
                shortLabel: 'ดัชนีสุขภาพต้นไม้',
                unit: 'คะแนน',
                baseMin: 84.0,
                baseMax: 98.5,
                decimals: 1
            }
        };

        const TREE_PALETTE_30MIN = [
            { border: '#059669', bg: 'rgba(5, 150, 105, 0.16)', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', hex: '#059669' },
            { border: '#0284c7', bg: 'rgba(2, 132, 199, 0.16)', badge: 'bg-sky-100 text-sky-800 border-sky-300', hex: '#0284c7' },
            { border: '#d97706', bg: 'rgba(217, 119, 6, 0.16)', badge: 'bg-amber-100 text-amber-800 border-amber-300', hex: '#d97706' },
            { border: '#7c3aed', bg: 'rgba(124, 58, 237, 0.16)', badge: 'bg-violet-100 text-violet-800 border-violet-300', hex: '#7c3aed' },
            { border: '#e11d48', bg: 'rgba(225, 29, 72, 0.18)', badge: 'bg-rose-100 text-rose-800 border-rose-300', hex: '#e11d48' },
            { border: '#0d9488', bg: 'rgba(13, 148, 136, 0.16)', badge: 'bg-teal-100 text-teal-800 border-teal-300', hex: '#0d9488' },
            { border: '#4f46e5', bg: 'rgba(79, 70, 229, 0.16)', badge: 'bg-indigo-100 text-indigo-800 border-indigo-300', hex: '#4f46e5' },
            { border: '#ea580c', bg: 'rgba(234, 88, 12, 0.16)', badge: 'bg-orange-100 text-orange-800 border-orange-300', hex: '#ea580c' }
        ];

        const EXTRA_SIM_SPECIES = [
            { name: 'กล้าไม้ตะเคียนทอง (Hopea odorata)', zone: 'โซนจำลองเปรียบเทียบไม้เศรษฐกิจ จ.นครพนม', harvestDays: 165, icon: '🌲', shortName: 'ต้นตะเคียนทอง' },
            { name: 'กล้าไม้พะยอม (Shorea roxburghii)', zone: 'โซนจำลองไม้ดอกหอมและไม้เศรษฐกิจ จ.นครพนม', harvestDays: 155, icon: '🌳', shortName: 'ต้นพะยอม' },
            { name: 'กล้าไม้อินทนิลน้ำ (Lagerstroemia speciosa)', zone: 'โซนจำลองไม้ป่าริมน้ำโขง จ.นครพนม', harvestDays: 145, icon: '🌸', shortName: 'ต้นอินทนิลน้ำ' },
            { name: 'กล้าไม้จำปาทอง (Magnolia champaca)', zone: 'โซนจำลองไม้มงคลท้องถิ่น จ.นครพนม', harvestDays: 150, icon: '🌼', shortName: 'ต้นจำปาทอง' },
            { name: 'กล้าไม้มะค่าโมง (Afzelia xylocarpa)', zone: 'โซนจำลองไม้เนื้อแข็งอนุรักษ์ จ.นครพนม', harvestDays: 170, icon: '🌿', shortName: 'ต้นมะค่าโมง' }
        ];

        function get30MinTimeLabels(windowKey) {
            const labels = [];
            let startHour = 6;
            let endHour = 18;
            if (windowKey === 'work8h') {
                startHour = 8;
                endHour = 16;
            } else if (windowKey === 'full24h') {
                startHour = 0;
                endHour = 23.5;
            }

            for (let t = startHour * 60; t <= endHour * 60; t += 30) {
                const hh = String(Math.floor(t / 60)).padStart(2, '0');
                const mm = String(t % 60).padStart(2, '0');
                labels.push(`${hh}:${mm}`);
            }
            return labels;
        }

        function getPrevious30MinTimeStr(timeStr) {
            const parts = (timeStr || '12:00').split(':');
            let totalMins = Number(parts[0]) * 60 + Number(parts[1]) - 30;
            if (totalMins < 0) totalMins += 24 * 60;
            const hh = String(Math.floor(totalMins / 60)).padStart(2, '0');
            const mm = String(totalMins % 60).padStart(2, '0');
            return `${hh}:${mm}`;
        }

        function generateRealistic30MinCurve(plotIdx, timeLabels, metricKey, jitterSeed) {
            const cfg = METRIC_30MIN_CONFIG[metricKey] || METRIC_30MIN_CONFIG.growthRate;
            const span = cfg.baseMax - cfg.baseMin;
            const seed = (plotIdx + 1) * 1.37 + (jitterSeed || 0);

            return timeLabels.map((timeStr, idx) => {
                const parts = timeStr.split(':');
                const hourFloat = Number(parts[0]) + Number(parts[1]) / 60;
                const sunFactor = Math.max(0, Math.sin(((hourFloat - 5.5) / 13.5) * Math.PI));
                const harmonic = Math.sin(idx * 0.65 + seed) * 0.08 + Math.cos(idx * 0.35 + plotIdx) * 0.05;
                const treeOffset = ((plotIdx % 5) - 1.8) * 0.065;

                let normalized = 0.5;
                if (metricKey === 'moisture') {
                    const irrigationBoost = (hourFloat >= 7.0 && hourFloat <= 8.5) || (hourFloat >= 16.0 && hourFloat <= 17.5) ? 0.16 : 0;
                    normalized = 0.68 - 0.24 * sunFactor + irrigationBoost + harmonic + treeOffset * 0.6;
                } else if (metricKey === 'vitality') {
                    normalized = 0.62 + 0.26 * sunFactor + harmonic * 0.6 + treeOffset * 0.5;
                } else {
                    const plot5Bonus = (plotIdx === 4) ? 0.09 : 0;
                    normalized = 0.18 + 0.72 * Math.pow(sunFactor, 0.85) + harmonic + treeOffset + plot5Bonus;
                }

                normalized = Math.max(0.06, Math.min(0.98, normalized));
                const val = cfg.baseMin + normalized * span;
                return Number(val.toFixed(cfg.decimals));
            });
        }

        function init30MinTelemetryData(forceRegenerate) {
            const allTimestamps = get30MinTimeLabels('full24h');
            const jitter = forceRegenerate ? Math.random() * 10 : 0;

            plots.forEach((p, idx) => {
                if (!telemetry30MinStore[p.id] || forceRegenerate) {
                    telemetry30MinStore[p.id] = {};
                    Object.keys(METRIC_30MIN_CONFIG).forEach(mKey => {
                        const fullSeries = generateRealistic30MinCurve(idx, allTimestamps, mKey, jitter);
                        const mapByTime = {};
                        allTimestamps.forEach((t, i) => {
                            mapByTime[t] = fullSeries[i];
                        });
                        telemetry30MinStore[p.id][mKey] = mapByTime;
                    });
                }
            });

            // Initialize default coordinates in the add-tree inputs so they are always ready
            const nextOffset = (plots.length + 1) * 0.0005;
            const latEl = document.getElementById('inputSimTreeLat');
            const lngEl = document.getElementById('inputSimTreeLng');
            if (latEl && !latEl.value) latEl.value = (17.3942 + nextOffset).toFixed(4);
            if (lngEl && !lngEl.value) lngEl.value = (104.7690 + nextOffset).toFixed(4);
        }

        // ระบบนาฬิกาเรียลไทม์และนับถอยหลังรอบการสรุปผลทุก 30 นาที
        function startRealTime30MinClock() {
            if (realTimeClockTimer) clearInterval(realTimeClockTimer);

            function updateClockDisplay() {
                const now = new Date();
                const hh = String(now.getHours()).padStart(2, '0');
                const mm = String(now.getMinutes()).padStart(2, '0');
                const ss = String(now.getSeconds()).padStart(2, '0');
                const currentClockStr = `${hh}:${mm}:${ss} น.`;

                // คำนวณรอบ 30 นาทีล่าสุด และรอบ 30 นาทีถัดไป
                const curMins = now.getMinutes();
                const curSecs = now.getSeconds();
                const latestSlotMM = curMins >= 30 ? '30' : '00';
                const latestSlotStr = `${hh}:${latestSlotMM} น.`;

                let nextHour = now.getHours();
                let nextSlotMM = '30';
                let remMins = 0;
                if (curMins < 30) {
                    nextSlotMM = '30';
                    remMins = 29 - curMins;
                } else {
                    nextHour = (nextHour + 1) % 24;
                    nextSlotMM = '00';
                    remMins = 59 - curMins;
                }
                const remSecs = 59 - curSecs;
                const nextSlotStr = `${String(nextHour).padStart(2, '0')}:${nextSlotMM} น.`;
                const countdownStr = `${String(remMins).padStart(2, '0')} นาที ${String(remSecs).padStart(2, '0')} วินาที`;

                const clockEls = document.querySelectorAll('.live-system-clock');
                clockEls.forEach(el => { el.textContent = currentClockStr; });

                const latestSlotEls = document.querySelectorAll('.live-latest-30m-slot');
                latestSlotEls.forEach(el => { el.textContent = latestSlotStr; });

                const nextSlotEls = document.querySelectorAll('.live-next-30m-countdown');
                nextSlotEls.forEach(el => { el.textContent = `รอบถัดไป ${nextSlotStr} (อีก ${countdownStr})`; });

                // หากถึงวินาทีที่ 00 ของนาทีที่ 00 หรือ 30 ให้เด้งแจ้งเตือนเวลาสรุปผลอัตโนมัติทันที
                if ((curMins === 0 || curMins === 30) && curSecs === 0) {
                    const autoSlot = `${hh}:${latestSlotMM}`;
                    announce30MinSummaryAtTime(autoSlot, true);
                }
            }

            updateClockDisplay();
            realTimeClockTimer = setInterval(updateClockDisplay, 1000);
        }

        function getTreeShortTitle(plot, idx) {
            if (!plot) return `ต้นที่ ${idx + 1}`;
            if (plot.shortName) return `ต้นที่ ${idx + 1}: ${plot.shortName}`;
            const cleaned = plot.name.replace(/^แปลงที่\s*\d+\s*:\s*/, '').split('(')[0].trim();
            return `ต้นที่ ${idx + 1}: ${cleaned}`;
        }

        function buildMiniTreeSvg(plotIdx, hexColor) {
            const canopyColors = ['#059669', '#0284c7', '#d97706', '#7c3aed', '#e11d48', '#0d9488'];
            const c = hexColor || canopyColors[plotIdx % canopyColors.length];
            return `
                <svg class="w-11 h-11 shrink-0" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="4" width="56" height="56" rx="14" fill="${c}18" stroke="${c}45" stroke-width="1.5"/>
                    <path d="M22 50H42L39 56H25L22 50Z" fill="#78350F"/>
                    <rect x="30" y="32" width="4" height="19" rx="2" fill="#92400E"/>
                    <circle cx="32" cy="23" r="11" fill="${c}"/>
                    <circle cx="24" cy="28" r="8" fill="${c}" fill-opacity="0.85"/>
                    <circle cx="40" cy="28" r="8" fill="${c}" fill-opacity="0.85"/>
                    <circle cx="32" cy="15" r="7" fill="#34D399" fill-opacity="0.65"/>
                </svg>
            `;
        }

        // ฟังก์ชันแจ้งเตือนและสรุปผล ณ เวลาทุก 30 นาทีที่เลือก
        function announce30MinSummaryAtTime(slotTimeStr, showNotificationToast) {
            const timeLabels = get30MinTimeLabels(current30MinWindow);
            if (!slotTimeStr || !timeLabels.includes(slotTimeStr)) {
                slotTimeStr = timeLabels[Math.floor(timeLabels.length / 2)] || '12:00';
            }
            currentActive30MinSlot = slotTimeStr;

            const slotSelect = document.getElementById('selectActive30MinSlot');
            if (slotSelect && slotSelect.value !== slotTimeStr) {
                slotSelect.value = slotTimeStr;
            }

            const prevTimeStr = getPrevious30MinTimeStr(slotTimeStr);
            const metricCfg = METRIC_30MIN_CONFIG[current30MinMetric] || METRIC_30MIN_CONFIG.growthRate;

            const slotValues = plots.map((p, idx) => {
                const val = (telemetry30MinStore[p.id] && telemetry30MinStore[p.id][current30MinMetric] && telemetry30MinStore[p.id][current30MinMetric][slotTimeStr]) ?? metricCfg.baseMin;
                return {
                    plot: p,
                    shortTitle: getTreeShortTitle(p, idx),
                    val: Number(val),
                    palette: TREE_PALETTE_30MIN[idx % TREE_PALETTE_30MIN.length]
                };
            });

            const rawNums = slotValues.map(item => item.val);
            const slotStats = calculateStats(rawNums);
            let topItem = slotValues[0];
            slotValues.forEach(item => {
                if (item.val > (topItem?.val || 0)) topItem = item;
            });

            // อัปเดตแถบแจ้งเตือนเวลาสรุปผลด้านบนสุด (Global Banner)
            const globalTimeBadge = document.getElementById('globalActiveSummaryTimeText');
            if (globalTimeBadge) {
                globalTimeBadge.textContent = `กำลังสรุปผลรอบเวลา ${slotTimeStr} น. (คาบเวลา 30 นาที: ${prevTimeStr} – ${slotTimeStr} น.) • ค่าเฉลี่ยรวม ${plots.length} ต้น = ${slotStats.mean.toFixed(metricCfg.decimals)} ${metricCfg.unit}`;
            }

            // อัปเดตกล่องแจ้งเวลาสรุปผลในหน้ารายงานทุก 30 นาที
            const detailBox = document.getElementById('live30MinTimeSlotDetail');
            if (detailBox) {
                const slotIndex = timeLabels.indexOf(slotTimeStr) + 1;
                detailBox.innerHTML = `
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200/80 pb-2.5">
                        <div class="flex items-center gap-2">
                            <span class="bg-rose-600 text-white text-xs font-extrabold px-3 py-1 rounded-xl shadow-sm animate-pulse">
                                🔔 แจ้งเวลาสรุปผล: ${slotTimeStr} น.
                            </span>
                            <span class="text-xs font-bold text-slate-700">
                                (รอบที่ ${slotIndex}/${timeLabels.length} • ช่วงเวลาที่เก็บข้อมูล: <b>${prevTimeStr} น. – ${slotTimeStr} น.</b>)
                            </span>
                        </div>
                        <div class="text-xs font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-xl">
                            📐 ค่าเฉลี่ย ณ เวลา ${slotTimeStr} น.: ${slotStats.mean.toFixed(metricCfg.decimals)} ± ${slotStats.sd.toFixed(2)} ${metricCfg.unit}
                        </div>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2">
                        ${slotValues.map(item => `
                            <div class="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div class="text-[11px] font-bold text-slate-700 truncate">${item.plot.icon || '🌳'} ${item.shortTitle}</div>
                                <div class="flex items-baseline justify-between mt-1">
                                    <span class="text-sm font-extrabold" style="color:${item.palette.hex}">${item.val.toFixed(metricCfg.decimals)}</span>
                                    <span class="text-[10px] text-slate-500">🕒 ${slotTimeStr} น.</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            // บันทึกประวัติการแจ้งเวลาสรุปผลทุก 30 นาที
            const nowReal = new Date();
            const realStamp = String(nowReal.getHours()).padStart(2, '0') + ':' + String(nowReal.getMinutes()).padStart(2, '0') + ':' + String(nowReal.getSeconds()).padStart(2, '0');
            const logEntry = {
                slotTime: slotTimeStr,
                intervalText: `${prevTimeStr} – ${slotTimeStr} น.`,
                realTime: realStamp,
                meanText: `${slotStats.mean.toFixed(metricCfg.decimals)} ${metricCfg.unit}`,
                bestTreeText: topItem ? `${topItem.shortTitle} (${topItem.val.toFixed(metricCfg.decimals)})` : '-'
            };
            if (timeAlertLogHistory.length === 0 || timeAlertLogHistory[0].slotTime !== slotTimeStr) {
                timeAlertLogHistory.unshift(logEntry);
                if (timeAlertLogHistory.length > 8) timeAlertLogHistory.pop();
            }

            const feedEl = document.getElementById('timeAlertFeedList');
            if (feedEl) {
                feedEl.innerHTML = timeAlertLogHistory.map((item, idx) => `
                    <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs ${idx === 0 ? 'bg-rose-50 border border-rose-200 font-bold text-rose-950' : 'bg-slate-50 border border-slate-200/80 text-slate-600'}">
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-0.5 rounded-md ${idx === 0 ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'} font-mono text-[11px]">🕒 รอบเวลา ${item.slotTime} น.</span>
                            <span>สรุปผลคาบเวลา <b>${item.intervalText}</b> สำเร็จ</span>
                        </div>
                        <div class="flex items-center gap-3 text-[11px]">
                            <span>ค่าเฉลี่ยรวม: <b>${item.meanText}</b></span>
                            <span class="text-emerald-700">สูงสุด: <b>${item.bestTreeText}</b></span>
                            <span class="text-slate-400 font-mono">(แจ้งเมื่อ ${item.realTime} น.)</span>
                        </div>
                    </div>
                `).join('');
            }

            // ไฮไลต์แถวของเวลานี้ในตารางรายงานทุก 30 นาที
            document.querySelectorAll('#table30MinReportBody tr[data-time-slot]').forEach(tr => {
                const rowSlot = tr.getAttribute('data-time-slot');
                const badgeEl = tr.querySelector('.slot-status-badge');
                if (rowSlot === slotTimeStr) {
                    tr.className = 'border-b-2 border-rose-300 bg-rose-50/90 text-xs font-bold transition';
                    if (badgeEl) badgeEl.innerHTML = '<span class="ml-1.5 bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">🔔 กำลังสรุปผลเวลานี้</span>';
                } else {
                    tr.className = 'border-b border-slate-100 hover:bg-emerald-50/40 text-xs transition';
                    if (badgeEl) badgeEl.innerHTML = '';
                }
            });

            if (showNotificationToast) {
                showToast(`🔔 แจ้งเวลาสรุปผลรอบ 30 นาที [เวลา ${slotTimeStr} น.]: สรุปผลต้นไม้ทั้ง ${plots.length} ต้นสำเร็จ (ค่าเฉลี่ย = ${slotStats.mean.toFixed(metricCfg.decimals)} ${metricCfg.unit})`);
            }
        }

        function stepNext30MinSummary(direction) {
            const timeLabels = get30MinTimeLabels(current30MinWindow);
            let idx = timeLabels.indexOf(currentActive30MinSlot);
            if (idx === -1) idx = 0;
            idx = (idx + (direction || 1) + timeLabels.length) % timeLabels.length;
            announce30MinSummaryAtTime(timeLabels[idx], true);
        }

        function toggleAuto30MinTimeAlert() {
            const btn = document.getElementById('btnAuto30MinAlert');
            if (auto30MinAlertTimer) {
                clearInterval(auto30MinAlertTimer);
                auto30MinAlertTimer = null;
                if (btn) {
                    btn.textContent = '▶ จำลองวิ่งแจ้งเวลาสรุปผลทีละ 30 นาที';
                    btn.className = 'bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl transition shadow flex items-center gap-1.5';
                }
                showToast('⏸ หยุดการจำลองวิ่งแจ้งเวลาสรุปผลอัตโนมัติแล้ว');
                return;
            }

            if (btn) {
                btn.textContent = '⏸ หยุดวิ่งแจ้งเตือนเวลา (กำลังสรุปทีละ 30 นาที...)';
                btn.className = 'bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold px-3.5 py-2 rounded-xl transition shadow flex items-center gap-1.5';
            }
            stepNext30MinSummary(1);
            auto30MinAlertTimer = setInterval(() => {
                stepNext30MinSummary(1);
            }, 2200);
        }

        function render30MinReport() {
            init30MinTelemetryData(false);

            const winSelect = document.getElementById('select30MinWindow');
            const metricSelect = document.getElementById('select30MinMetric');
            const chartTypeSelect = document.getElementById('selectSeparateChartType');

            if (winSelect) current30MinWindow = winSelect.value;
            if (metricSelect) current30MinMetric = metricSelect.value;
            if (chartTypeSelect) currentSeparateChartType = chartTypeSelect.value;

            const timeLabels = get30MinTimeLabels(current30MinWindow);
            const metricCfg = METRIC_30MIN_CONFIG[current30MinMetric] || METRIC_30MIN_CONFIG.growthRate;

            // Populate active 30-min slot selector
            const slotSelect = document.getElementById('selectActive30MinSlot');
            if (slotSelect) {
                if (!timeLabels.includes(currentActive30MinSlot)) {
                    currentActive30MinSlot = timeLabels[timeLabels.length - 1] || '18:00';
                }
                slotSelect.innerHTML = timeLabels.map(t => {
                    const prevT = getPrevious30MinTimeStr(t);
                    return `<option value="${t}" ${t === currentActive30MinSlot ? 'selected' : ''}>🕒 รอบเวลา ${t} น. (สรุปคาบ ${prevT} - ${t} น.)</option>`;
                }).join('');
            }

            // Update KPI cards
            const kpiTreesEl = document.getElementById('kpi30mTotalTrees');
            const kpiPointsEl = document.getElementById('kpi30mTotalPoints');
            const kpiBestTreeEl = document.getElementById('kpi30mBestTree');
            const kpiOverallMeanEl = document.getElementById('kpi30mOverallMean');

            const allTreeSeries = plots.map((p, idx) => {
                const mapByTime = (telemetry30MinStore[p.id] && telemetry30MinStore[p.id][current30MinMetric]) || {};
                const values = timeLabels.map(t => mapByTime[t] ?? metricCfg.baseMin);
                const stats = calculateStats(values);
                const minVal = Math.min(...values);
                const maxVal = Math.max(...values);
                const palette = TREE_PALETTE_30MIN[idx % TREE_PALETTE_30MIN.length];
                return {
                    plot: p,
                    idx,
                    shortTitle: getTreeShortTitle(p, idx),
                    values,
                    stats,
                    minVal,
                    maxVal,
                    palette
                };
            });

            const meanSeriesByTime = timeLabels.map((_, tIdx) => {
                const valsAtTime = allTreeSeries.map(s => s.values[tIdx]);
                const sum = valsAtTime.reduce((a, b) => a + b, 0);
                return Number((sum / (valsAtTime.length || 1)).toFixed(metricCfg.decimals));
            });

            const allFlattened = allTreeSeries.flatMap(s => s.values);
            const overallStats = calculateStats(allFlattened);

            let bestTree = allTreeSeries[0];
            allTreeSeries.forEach(s => {
                if (s.stats.mean > (bestTree?.stats.mean || 0)) bestTree = s;
            });

            if (kpiTreesEl) kpiTreesEl.textContent = `${plots.length} ต้น (ปักหมุดแผนที่ครบทุกต้น)`;
            if (kpiPointsEl) kpiPointsEl.textContent = `ทุก 30 นาที (${timeLabels.length} รอบเวลา)`;
            if (kpiBestTreeEl && bestTree) kpiBestTreeEl.textContent = `${bestTree.shortTitle} (${bestTree.stats.mean.toFixed(metricCfg.decimals)} ${metricCfg.unit})`;
            if (kpiOverallMeanEl) kpiOverallMeanEl.textContent = `${overallStats.mean.toFixed(metricCfg.decimals)} ± ${overallStats.sd.toFixed(2)} ${metricCfg.unit}`;

            // Render Pinned Trees Map Strip so user sees that every tree is pinned on the GIS Map
            const pinStripEl = document.getElementById('pinnedTreesMapStrip');
            if (pinStripEl) {
                pinStripEl.innerHTML = allTreeSeries.map(s => {
                    const lat = Number(s.plot.lat || 17.3945).toFixed(4);
                    const lng = Number(s.plot.lng || 104.7692).toFixed(4);
                    return `
                        <div class="bg-white/10 border border-white/20 rounded-xl px-2.5 py-1.5 flex items-center gap-2">
                            <button type="button" onclick="jumpToPlotOnMap(${s.plot.id})" class="text-left hover:opacity-85 transition flex items-center gap-1.5">
                                <span class="text-sm">${s.plot.icon || '🌳'}</span>
                                <div>
                                    <div class="text-[11px] font-extrabold text-white">${s.shortTitle}</div>
                                    <div class="text-[10px] text-emerald-300 font-mono">📍 ${lat}, ${lng}</div>
                                </div>
                            </button>
                            <button type="button" onclick="deleteTreeAndGraph(${s.plot.id})" class="bg-rose-600/80 hover:bg-rose-600 text-white text-[10px] font-extrabold px-2 py-1 rounded-lg transition ml-1" title="ลบกราฟและหมุดแผนที่ของต้นนี้">
                                🗑️ ลบ
                            </button>
                        </div>
                    `;
                }).join('');
            }

            const combinedMgrEl = document.getElementById('combinedChartTreeManager');
            if (combinedMgrEl) {
                combinedMgrEl.innerHTML = allTreeSeries.map(s => `
                    <div class="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                        <span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${s.palette.hex}"></span>
                        <span class="font-bold text-slate-800">${s.shortTitle}</span>
                        <button type="button" onclick="deleteTreeAndGraph(${s.plot.id})" class="text-rose-600 hover:bg-rose-100 font-extrabold px-1.5 py-0.5 rounded-md transition" title="ลบเส้นกราฟและหมุดแผนที่ของต้นนี้">
                            🗑️ ลบกราฟนี้
                        </button>
                    </div>
                `).join('');
            }

            const subCombinedEl = document.getElementById('combined30MinSubtitle');
            if (subCombinedEl) {
                subCombinedEl.textContent = `พารามิเตอร์: ${metricCfg.label} | แจ้งผลทุกๆ 30 นาที (${timeLabels[0]} - ${timeLabels[timeLabels.length - 1]} น.) | เปรียบเทียบ ${plots.length} ต้นในกราฟเดียว`;
            }

            // 1. Render Combined Chart (1 กราฟรวมกันทุกต้น)
            const combinedCanvas = document.getElementById('combined30MinChart');
            if (combinedCanvas && typeof Chart !== 'undefined') {
                if (combined30MinChartInstance) {
                    combined30MinChartInstance.destroy();
                }

                const combinedDatasets = allTreeSeries.map(s => ({
                    label: `${s.plot.icon || '🌳'} ${s.shortTitle}`,
                    data: s.values,
                    borderColor: s.palette.border,
                    backgroundColor: s.palette.bg,
                    borderWidth: s.idx === plots.length - 1 ? 3.5 : 2.4,
                    pointRadius: s.idx === plots.length - 1 ? 4 : 2.8,
                    pointHoverRadius: 6,
                    tension: 0.35,
                    fill: false
                }));

                combinedDatasets.push({
                    label: '📊 ค่าเฉลี่ยรวมทุกต้น (Mean Line)',
                    data: meanSeriesByTime,
                    borderColor: '#334155',
                    backgroundColor: 'rgba(51, 65, 85, 0.08)',
                    borderWidth: 2,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    tension: 0.35,
                    fill: false
                });

                combined30MinChartInstance = new Chart(combinedCanvas.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: timeLabels.map(t => `${t} น.`),
                        datasets: combinedDatasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: false,
                        interaction: {
                            mode: 'index',
                            intersect: false
                        },
                        plugins: {
                            legend: {
                                position: 'top',
                                labels: {
                                    font: { family: 'Sarabun', size: 12, weight: 'bold' },
                                    usePointStyle: true,
                                    padding: 14
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    title: function(items) {
                                        if (!items.length) return '';
                                        const rawT = timeLabels[items[0].dataIndex] || '';
                                        return `🔔 แจ้งเวลาสรุปผล: ${rawT} น. (คาบเวลา ${getPrevious30MinTimeStr(rawT)} - ${rawT} น.)`;
                                    },
                                    label: function(ctx) {
                                        return `${ctx.dataset.label}: ${ctx.parsed.y} ${metricCfg.unit}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                title: {
                                    display: true,
                                    text: 'เวลาที่สรุปผลทุกๆ 30 นาที (Time Notification Every 30 Minutes)',
                                    font: { family: 'Sarabun', size: 12, weight: 'bold' }
                                },
                                ticks: {
                                    font: { family: 'Sarabun', size: 11 },
                                    maxRotation: 45
                                }
                            },
                            y: {
                                title: {
                                    display: true,
                                    text: `${metricCfg.shortLabel} (${metricCfg.unit})`,
                                    font: { family: 'Sarabun', size: 12, weight: 'bold' }
                                },
                                ticks: {
                                    font: { family: 'Sarabun', size: 11 }
                                }
                            }
                        }
                    }
                });
            }

            // 2. Render Separate Individual Charts for Each Tree (แยกกราฟรายต้นครบทุกต้น + ปุ่มซูมดูหมุดบนแผนที่)
            Object.values(separate30MinChartInstances).forEach(inst => {
                if (inst) inst.destroy();
            });
            separate30MinChartInstances = {};

            const sepGrid = document.getElementById('separate30MinChartsGrid');
            if (sepGrid) {
                sepGrid.innerHTML = allTreeSeries.map(s => {
                    const isNewSim = s.idx >= 4;
                    const lat = Number(s.plot.lat || 17.3945).toFixed(4);
                    const lng = Number(s.plot.lng || 104.7692).toFixed(4);
                    const newBadge = isNewSim
                        ? `<span class="bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">✨ ต้นจำลองใหม่ (ปักหมุดแล้ว)</span>`
                        : `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.palette.badge}">แปลงหลัก #${s.plot.id}</span>`;

                    return `
                        <div class="bg-white rounded-3xl p-5 shadow-md border-2 ${isNewSim ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200/90'} flex flex-col justify-between space-y-4">
                            <div class="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                                <div class="flex items-center gap-3">
                                    ${buildMiniTreeSvg(s.idx, s.palette.hex)}
                                    <div>
                                        <div class="flex flex-wrap items-center gap-1.5">
                                            <span class="text-xs font-extrabold text-slate-900">${s.plot.name}</span>
                                            ${newBadge}
                                        </div>
                                        <p class="text-[11px] text-slate-500 mt-0.5">📍 ${s.plot.zone} | พิกัดหมุด: <b class="text-emerald-700">${lat}, ${lng}</b></p>
                                    </div>
                                </div>
                                <div class="flex flex-wrap items-center gap-1.5 shrink-0">
                                    <button type="button" onclick="jumpToPlotOnMap(${s.plot.id})" class="bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[11px] font-extrabold px-2.5 py-1.5 rounded-xl transition">
                                        🗺️ ดูหมุดแผนที่
                                    </button>
                                    <button type="button" onclick="deleteTreeAndGraph(${s.plot.id})" class="bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 text-[11px] font-extrabold px-2.5 py-1.5 rounded-xl transition">
                                        🗑️ ลบกราฟ & หมุด
                                    </button>
                                </div>
                            </div>

                            <!-- Individual Tree 30-Min KPI Strip -->
                            <div class="grid grid-cols-4 gap-2 text-center bg-slate-50 p-2.5 rounded-2xl border border-slate-200/70">
                                <div>
                                    <div class="text-[10px] text-slate-500 font-semibold">ค่าเฉลี่ย (X̄)</div>
                                    <div class="text-xs sm:text-sm font-extrabold" style="color:${s.palette.hex}">${s.stats.mean.toFixed(metricCfg.decimals)}</div>
                                </div>
                                <div>
                                    <div class="text-[10px] text-slate-500 font-semibold">ส่วนเบี่ยงเบน (S.D.)</div>
                                    <div class="text-xs sm:text-sm font-extrabold text-slate-800">${s.stats.sd.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div class="text-[10px] text-slate-500 font-semibold">สูงสุด (Peak)</div>
                                    <div class="text-xs sm:text-sm font-extrabold text-emerald-700">${s.maxVal.toFixed(metricCfg.decimals)}</div>
                                </div>
                                <div>
                                    <div class="text-[10px] text-slate-500 font-semibold">ต่ำสุด (Min)</div>
                                    <div class="text-xs sm:text-sm font-extrabold text-amber-700">${s.minVal.toFixed(metricCfg.decimals)}</div>
                                </div>
                            </div>

                            <!-- Individual Separate 30-Minute Chart Canvas -->
                            <div class="relative h-56 w-full">
                                <canvas id="sep30MinChart_${s.plot.id}"></canvas>
                            </div>

                            <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                <span>🕒 สรุปผลทุก 30 นาที (${timeLabels[0]} - ${timeLabels[timeLabels.length - 1]} น.)</span>
                                <span class="font-bold" style="color:${s.palette.hex}">หน่วย: ${metricCfg.unit}</span>
                            </div>
                        </div>
                    `;
                }).join('');

                allTreeSeries.forEach(s => {
                    const canvasEl = document.getElementById(`sep30MinChart_${s.plot.id}`);
                    if (!canvasEl || typeof Chart === 'undefined') return;
                    separate30MinChartInstances[s.plot.id] = new Chart(canvasEl.getContext('2d'), {
                        type: currentSeparateChartType,
                        data: {
                            labels: timeLabels.map(t => `${t} น.`),
                            datasets: [
                                {
                                    label: `${s.shortTitle} (${metricCfg.unit})`,
                                    data: s.values,
                                    borderColor: s.palette.border,
                                    backgroundColor: currentSeparateChartType === 'bar' ? s.palette.border + 'CC' : s.palette.bg,
                                    borderWidth: 2.5,
                                    pointRadius: 2.5,
                                    pointHoverRadius: 5,
                                    fill: currentSeparateChartType === 'line',
                                    tension: 0.35,
                                    borderRadius: currentSeparateChartType === 'bar' ? 5 : 0
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            animation: false,
                            plugins: {
                                legend: {
                                    display: true,
                                    labels: {
                                        font: { family: 'Sarabun', size: 11, weight: 'bold' },
                                        boxWidth: 12
                                    }
                                },
                                tooltip: {
                                    callbacks: {
                                        title: function(items) {
                                            if (!items.length) return '';
                                            const rawT = timeLabels[items[0].dataIndex] || '';
                                            return `🕒 เวลาสรุปผล ${rawT} น. (คาบ ${getPrevious30MinTimeStr(rawT)} - ${rawT} น.)`;
                                        },
                                        label: function(ctx) {
                                            return `ค่าที่วัดได้: ${ctx.parsed.y} ${metricCfg.unit}`;
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    ticks: {
                                        font: { family: 'Sarabun', size: 10 },
                                        maxRotation: 45
                                    }
                                },
                                y: {
                                    ticks: {
                                        font: { family: 'Sarabun', size: 10 }
                                    }
                                }
                            }
                        }
                    });
                });
            }

            // 3. Render Executive Summary & 30-Minute Interval Report Table (with time range & click-to-announce!)
            const narrative30mEl = document.getElementById('narrative30MinSummary');
            if (narrative30mEl && bestTree) {
                const newestTree = allTreeSeries[allTreeSeries.length - 1];
                narrative30mEl.innerHTML = `
                    จากการจำลองและปักหมุดพิกัดต้นไม้บนแผนที่ทั้งหมด <b>${plots.length} ต้น</b> (รวมต้นไม้จำลองใหม่คือ <b>${newestTree.plot.name}</b> พิกัด GPS ${Number(newestTree.plot.lat || 17.3954).toFixed(4)}, ${Number(newestTree.plot.lng || 104.7695).toFixed(4)})
                    โดยระบบทำการสรุปผลและแจ้งเวลาทุกๆ <b>30 นาที</b> จำนวนรวม <b>${timeLabels.length} รอบเวลา</b> (ตั้งแต่เวลา <b>${timeLabels[0]} น.</b> ถึง <b>${timeLabels[timeLabels.length - 1]} น.</b>)
                    พบว่าภาพรวมของทุกต้นมีค่าเฉลี่ยรวม (X̄) อยู่ที่ <b>${overallStats.mean.toFixed(metricCfg.decimals)} ${metricCfg.unit}</b> และส่วนเบี่ยงเบนมาตรฐาน (S.D.) เท่ากับ <b>${overallStats.sd.toFixed(2)}</b>
                    ทั้งนี้ รอบเวลาที่กำลังแจ้งสรุปผลปัจจุบันคือ <b>เวลา ${currentActive30MinSlot} น. (คาบเวลา ${getPrevious30MinTimeStr(currentActive30MinSlot)} – ${currentActive30MinSlot} น.)</b>
                `;
            }

            const theadEl = document.getElementById('table30MinReportHead');
            const tbodyEl = document.getElementById('table30MinReportBody');
            if (theadEl && tbodyEl) {
                theadEl.innerHTML = `
                    <tr class="bg-slate-900 text-white text-xs">
                        <th class="py-3 px-3 text-left font-bold whitespace-nowrap">รอบที่</th>
                        <th class="py-3 px-3 text-left font-bold whitespace-nowrap">🕒 เวลาที่แจ้งสรุปผล (คาบทุก 30 นาที)</th>
                        ${allTreeSeries.map(s => `<th class="py-3 px-3 text-center font-bold whitespace-nowrap">${s.plot.icon || '🌳'} ${s.shortTitle}<br><span class="text-[10px] font-normal text-emerald-300">(${metricCfg.unit})</span></th>`).join('')}
                        <th class="py-3 px-3 text-center font-bold bg-emerald-950 text-emerald-300 whitespace-nowrap">ค่าเฉลี่ยรวม (X̄)</th>
                        <th class="py-3 px-3 text-center font-bold bg-slate-800 text-amber-300 whitespace-nowrap">S.D.</th>
                    </tr>
                `;

                const rowsHtml = timeLabels.map((tStr, rIdx) => {
                    const prevT = getPrevious30MinTimeStr(tStr);
                    const rowVals = allTreeSeries.map(s => s.values[rIdx]);
                    const rowStats = calculateStats(rowVals);
                    const isActiveSlot = (tStr === currentActive30MinSlot);
                    return `
                        <tr data-time-slot="${tStr}" onclick="announce30MinSummaryAtTime('${tStr}', true)" class="cursor-pointer ${isActiveSlot ? 'border-b-2 border-rose-300 bg-rose-50/90 font-bold' : 'border-b border-slate-100 hover:bg-emerald-50/40'} text-xs transition">
                            <td class="py-2.5 px-3 font-semibold text-slate-500">#${rIdx + 1}</td>
                            <td class="py-2.5 px-3 font-extrabold text-slate-900 whitespace-nowrap">
                                🕒 แจ้งสรุปเวลา ${tStr} น. <span class="text-[11px] font-normal text-slate-500">(คาบ ${prevT}–${tStr} น.)</span>
                                <span class="slot-status-badge">${isActiveSlot ? '<span class="ml-1.5 bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">🔔 กำลังสรุปผลเวลานี้</span>' : ''}</span>
                            </td>
                            ${rowVals.map((v, cIdx) => `<td class="py-2.5 px-3 text-center font-bold ${cIdx >= 4 ? 'bg-rose-50/60 text-rose-900' : 'text-slate-700'}">${v.toFixed(metricCfg.decimals)}</td>`).join('')}
                            <td class="py-2.5 px-3 text-center font-extrabold bg-emerald-50/70 text-emerald-900">${rowStats.mean.toFixed(metricCfg.decimals)}</td>
                            <td class="py-2.5 px-3 text-center font-semibold bg-slate-50 text-slate-600">${rowStats.sd.toFixed(2)}</td>
                        </tr>
                    `;
                }).join('');

                const footerRowHtml = `
                    <tr class="bg-emerald-950 text-white font-extrabold text-xs">
                        <td colspan="2" class="py-3 px-3 text-left">📌 สรุปค่าเฉลี่ยรวมทุกรอบเวลา 30 นาที (Mean ± S.D.)</td>
                        ${allTreeSeries.map(s => `<td class="py-3 px-3 text-center text-emerald-300">${s.stats.mean.toFixed(metricCfg.decimals)} ± ${s.stats.sd.toFixed(2)}</td>`).join('')}
                        <td class="py-3 px-3 text-center text-amber-300">${overallStats.mean.toFixed(metricCfg.decimals)}</td>
                        <td class="py-3 px-3 text-center text-amber-200">${overallStats.sd.toFixed(2)}</td>
                    </tr>
                `;

                tbodyEl.innerHTML = rowsHtml + footerRowHtml;
            }

            announce30MinSummaryAtTime(currentActive30MinSlot, false);
        }

        function simulateAnotherTree30Min(openMapAfter) {
            const customInput = document.getElementById('inputSimTreeName');
            const latInput = document.getElementById('inputSimTreeLat');
            const lngInput = document.getElementById('inputSimTreeLng');

            const customName = (customInput?.value || '').trim();
            const nextId = plots.length > 0 ? Math.max(...plots.map(p => p.id)) + 1 : 1;
            const presetTemplate = EXTRA_SIM_SPECIES[(nextId - 5 + EXTRA_SIM_SPECIES.length) % EXTRA_SIM_SPECIES.length];

            const finalSpeciesName = customName || presetTemplate.name;
            const shortName = customName ? customName.split('(')[0].trim() : presetTemplate.shortName;

            // คำนวณพิกัด GPS ให้กระจายตัวสวยงามในพื้นที่ฟาร์ม จ.นครพนม หรือใช้ค่าที่ผู้ใช้กรอก
            const angle = (nextId * 1.15);
            const defaultLat = Number((17.3945 + Math.sin(angle) * 0.0022).toFixed(4));
            const defaultLng = Number((104.7692 + Math.cos(angle) * 0.0024).toFixed(4));
            const lat = Number(latInput?.value || defaultLat);
            const lng = Number(lngInput?.value || defaultLng);

            const newPlot = {
                id: nextId,
                name: `แปลงที่ ${nextId}: ${finalSpeciesName}`,
                zone: `${presetTemplate.zone} (พิกัด ${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                harvestDays: presetTemplate.harvestDays,
                icon: presetTemplate.icon,
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
                ageDays: 32,
                heightCm: 44.5,
                leafCount: 19,
                moisture: 71,
                soilPh: 6.5,
                q1: 5,
                q2: 5,
                q3: 5,
                q4: 5,
                note: `เพิ่มต้นไม้ใหม่และปักหมุดพิกัด GPS (${lat.toFixed(4)}, ${lng.toFixed(4)}) พร้อมสรุปกราฟทุก 30 นาที`,
                createdAt: dateStr
            });

            saveData();
            if (customInput) customInput.value = '';

            // อัปเดตพิกัดถัดไปเตรียมไว้สำหรับต้นต่อไป
            const nextAngle = ((nextId + 1) * 1.15);
            if (latInput) latInput.value = (17.3945 + Math.sin(nextAngle) * 0.0022).toFixed(4);
            if (lngInput) lngInput.value = (104.7692 + Math.cos(nextAngle) * 0.0024).toFixed(4);

            init30MinTelemetryData(false);
            renderPlotSelectors();
            renderBlueprint();
            renderKanban();
            renderOverview();
            renderDashboard();
            renderPlotsTable();
            renderMapMarkers();
            render30MinReport();

            // ตั้งค่าให้แผนที่ซูมไปยังหมุดของต้นไม้ที่เพิ่งเพิ่มใหม่ทันที
            if (typeof pendingFocusPlotId !== 'undefined') {
                pendingFocusPlotId = nextId;
            }
            if (openMapAfter) {
                switchTab('map');
                setTimeout(() => {
                    focusPlotOnMap(nextId);
                }, 220);
                showToast(`📍 ปักหมุด "${newPlot.name}" ลงบนแผนที่ดาวเทียม (${lat.toFixed(4)}, ${lng.toFixed(4)}) และซูมไปยังหมุดเรียบร้อย!`);
            } else {
                if (leafletMap) {
                    focusPlotOnMap(nextId);
                }
                showToast(`📍 เพิ่ม "${newPlot.name}" ปักหมุดพิกัด (${lat.toFixed(4)}, ${lng.toFixed(4)}) ลงแผนที่ และอัปเดตกราฟทุก 30 นาทีเรียบร้อย!`);
            }
        }

        function regenerate30MinSimulation() {
            init30MinTelemetryData(true);
            render30MinReport();
            announce30MinSummaryAtTime(currentActive30MinSlot, true);
        }

        function copy30MinReportTable() {
            const timeLabels = get30MinTimeLabels(current30MinWindow);
            const metricCfg = METRIC_30MIN_CONFIG[current30MinMetric] || METRIC_30MIN_CONFIG.growthRate;

            let text = `รายงานการติดตามและจำลองต้นไม้ทุก 30 นาที (${metricCfg.label})\n`;
            const headers = ['รอบที่', 'เวลาที่แจ้งสรุปผล (คาบทุก 30 นาที)', ...plots.map((p, i) => getTreeShortTitle(p, i)), 'ค่าเฉลี่ยรวม (X-bar)', 'S.D.'];
            text += headers.join('\t') + '\n';

            timeLabels.forEach((tStr, idx) => {
                const prevT = getPrevious30MinTimeStr(tStr);
                const vals = plots.map(p => telemetry30MinStore[p.id][current30MinMetric][tStr]);
                const st = calculateStats(vals);
                text += `${idx + 1}\tแจ้งสรุปเวลา ${tStr} น. (${prevT}-${tStr} น.)\t${vals.map(v => v.toFixed(metricCfg.decimals)).join('\t')}\t${st.mean.toFixed(metricCfg.decimals)}\t${st.sd.toFixed(2)}\n`;
            });

            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast('📋 คัดลอกตารางรายงานพร้อมเวลาสรุปผลทุก 30 นาทีแล้ว นำไปวางใน Word หรือ Excel ได้เลย!');
            } catch (e) {
                showToast('ไม่สามารถคัดลอกอัตโนมัติได้');
            }
            document.body.removeChild(textarea);
        }

        function export30MinReportCSV() {
            const timeLabels = get30MinTimeLabels(current30MinWindow);
            const metricCfg = METRIC_30MIN_CONFIG[current30MinMetric] || METRIC_30MIN_CONFIG.growthRate;

            const headers = ['รอบที่', 'เวลาแจ้งสรุปผล', 'คาบเวลา30นาที', ...plots.map((p, i) => getTreeShortTitle(p, i).replace(/,/g, ' ')), 'ค่าเฉลี่ยรวม(X-bar)', 'ส่วนเบี่ยงเบนมาตรฐาน(S.D.)', 'หน่วยวัด'];
            let csv = '\uFEFF' + headers.join(',') + '\n';

            timeLabels.forEach((tStr, idx) => {
                const prevT = getPrevious30MinTimeStr(tStr);
                const vals = plots.map(p => telemetry30MinStore[p.id][current30MinMetric][tStr]);
                const st = calculateStats(vals);
                csv += `${idx + 1},${tStr} น.,${prevT}-${tStr} น.,${vals.map(v => v.toFixed(metricCfg.decimals)).join(',')},${st.mean.toFixed(metricCfg.decimals)},${st.sd.toFixed(2)},${metricCfg.unit}\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `tree_simulation_30min_report_${current30MinMetric}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('📥 ดาวน์โหลดไฟล์ CSV รายงานพร้อมเวลาสรุปผลทุก 30 นาทีเรียบร้อยแล้ว!');
        }

        // ฟังก์ชันลบกราฟต้นไม้และลบหมุดออกจากแผนที่พร้อมกันทันที
        function deleteTreeAndGraph(plotId) {
            if (plots.length <= 1) {
                showToast('⚠️ ต้องมีต้นไม้อย่างน้อย 1 ต้นในระบบเพื่อแสดงกราฟและแผนที่');
                return;
            }
            const targetPlot = plots.find(p => p.id === plotId);
            if (!targetPlot) return;

            // สำรองข้อมูลเผื่อกดกู้คืน (Undo)
            lastDeletedTreeBackup = {
                plot: JSON.parse(JSON.stringify(targetPlot)),
                logs: JSON.parse(JSON.stringify(logs.filter(r => r.plotId === plotId))),
                telemetry: telemetry30MinStore[plotId] ? JSON.parse(JSON.stringify(telemetry30MinStore[plotId])) : null
            };

            // ลบ Instance ของกราฟแยกต้นนี้
            if (separate30MinChartInstances[plotId]) {
                separate30MinChartInstances[plotId].destroy();
                delete separate30MinChartInstances[plotId];
            }

            // ลบข้อมูลออกจากระบบและแผนที่
            plots = plots.filter(p => p.id !== plotId);
            logs = logs.filter(r => r.plotId !== plotId);
            delete telemetry30MinStore[plotId];
            delete iotState[plotId];

            saveData();

            if (leafletMap) {
                leafletMap.closePopup();
            }

            renderPlotSelectors();
            renderBlueprint();
            renderKanban();
            renderOverview();
            renderDashboard();
            renderPlotsTable();
            renderMapMarkers();
            render30MinReport();

            const undoBtns = document.querySelectorAll('.btn-undo-delete-tree');
            undoBtns.forEach(b => b.classList.remove('hidden'));

            showToast(`🗑️ ลบกราฟและลบหมุดแผนที่ของ "${targetPlot.name}" เรียบร้อยแล้ว!`);
        }

        function deleteAllSimulatedTrees() {
            if (plots.length <= 4) {
                showToast('ไม่มีต้นไม้ที่จำลองเพิ่มเกินจาก 4 แปลงหลักแล้ว (หากต้องการลบแปลงหลัก กดปุ่ม 🗑️ ลบกราฟ & หมุด ที่การ์ดแต่ละต้นได้เลย)');
                return;
            }
            const removedCount = plots.length - 4;
            const keepIds = new Set(plots.slice(0, 4).map(p => p.id));
            plots = plots.slice(0, 4);
            logs = logs.filter(r => keepIds.has(r.plotId));

            saveData();
            if (leafletMap) leafletMap.closePopup();

            renderPlotSelectors();
            renderBlueprint();
            renderKanban();
            renderOverview();
            renderDashboard();
            renderPlotsTable();
            renderMapMarkers();
            render30MinReport();

            showToast(`🗑️ ลบกราฟและหมุดแผนที่ของต้นไม้ที่จำลองเพิ่มจำนวน ${removedCount} ต้นเรียบร้อยแล้ว!`);
        }

        function undoDeleteTree() {
            if (!lastDeletedTreeBackup || !lastDeletedTreeBackup.plot) {
                showToast('ไม่มีรายการต้นไม้ที่เพิ่งลบให้กู้คืน');
                return;
            }
            const restoredPlot = lastDeletedTreeBackup.plot;
            if (!plots.some(p => p.id === restoredPlot.id)) {
                plots.push(restoredPlot);
            }
            if (Array.isArray(lastDeletedTreeBackup.logs)) {
                logs.push(...lastDeletedTreeBackup.logs);
            }
            if (lastDeletedTreeBackup.telemetry) {
                telemetry30MinStore[restoredPlot.id] = lastDeletedTreeBackup.telemetry;
            }
            iotState[restoredPlot.id] = { water: true, fan: true, light: false, fert: true };
            lastDeletedTreeBackup = null;

            saveData();
            renderPlotSelectors();
            renderBlueprint();
            renderKanban();
            renderOverview();
            renderDashboard();
            renderPlotsTable();
            renderMapMarkers();
            render30MinReport();

            const undoBtns = document.querySelectorAll('.btn-undo-delete-tree');
            undoBtns.forEach(b => b.classList.add('hidden'));

            showToast(`↩️ กู้คืนกราฟและหมุดแผนที่ของ "${restoredPlot.name}" กลับมาเรียบร้อยแล้ว!`);
        }

/* ==========================================================================
   โมดูลที่ 4: ระบบควบคุมหลัก แผงควบคุม IoT 2D, Kanban, ฟอร์มบันทึก และกราฟสถิติ (js/app-core.js)
   ========================================================================== */

// =====================================================================
        // 4. การสลับหน้าแท็บ (5 โหมด: Overview, Map, Record, Dashboard, Plots)
        // =====================================================================
        let iotState = {
            1: { water: true, fan: false, light: false, fert: true },
            2: { water: true, fan: true, light: true, fert: false },
            3: { water: false, fan: false, light: false, fert: true },
            4: { water: true, fan: true, light: false, fert: true },
            5: { water: true, fan: true, light: true, fert: true }
        };

        function switchTab(tabName) {
            const views = {
                ai: document.getElementById('viewAI'),
                report30m: document.getElementById('viewReport30m'),
                farm3d: document.getElementById('view3D'),
                overview: document.getElementById('viewOverview'),
                blueprint: document.getElementById('viewBlueprint'),
                kanban: document.getElementById('viewKanban'),
                map: document.getElementById('viewMap'),
                record: document.getElementById('viewRecord'),
                dashboard: document.getElementById('viewDashboard'),
                plots: document.getElementById('viewPlots')
            };
            const btns = {
                ai: document.getElementById('tabBtnAI'),
                report30m: document.getElementById('tabBtnReport30m'),
                farm3d: document.getElementById('view3D') ? document.getElementById('tabBtn3D') : null,
                overview: document.getElementById('tabBtnOverview'),
                blueprint: document.getElementById('tabBtnBlueprint'),
                kanban: document.getElementById('tabBtnKanban'),
                map: document.getElementById('tabBtnMap'),
                record: document.getElementById('tabBtnRecord'),
                dashboard: document.getElementById('tabBtnDashboard'),
                plots: document.getElementById('tabBtnPlots')
            };
            const titles = {
                ai: ['🤖 ผู้ช่วย AI เกษตรอัจฉริยะ', 'วิเคราะห์ข้อมูลแปลงปลูก กราฟการเติบโต และตอบคำถามอัตโนมัติ'],
                report30m: ['⏱️ รายงานและกราฟทุก 30 นาที', 'ติดตามแนวโน้มการเติบโตและสถิติภาพรวมทุก 30 นาที'],
                farm3d: ['🧊 แบบจำลองสมาร์ทฟาร์ม 3 มิติ', 'หมุนมุมกล้อง 360° และติดตามการเติบโตของแปลงปลูก'],
                overview: ['🏞️ ภาพรวมฟาร์มและระยะการเติบโต', 'ติดตามพัฒนาการพืชผลเศรษฐกิจ จ.นครพนม และแผนที่ GIS'],
                blueprint: ['🎛️ ผังควบคุมสมาร์ทฟาร์ม 2D & IoT', 'ควบคุมระบบน้ำ พัดลมระบายอากาศ และระบบให้ปุ๋ย'],
                kanban: ['📋 กระดานติดตามสถานะพืชผล (Kanban)', 'ติดตามระยะการเจริญเติบโตและประมาณการรายได้'],
                map: ['🗺️ แผนที่แปลงเพาะปลูก (GIS Map)', 'พิกัดแปลงเกษตรและภาพถ่ายดาวเทียม จ.นครพนม'],
                record: ['📝 บันทึกข้อมูลการเจริญเติบโต', 'บันทึกความสูง จำนวนใบ ความชื้น และค่า pH ดิน'],
                dashboard: ['📊 สถิติและวิเคราะห์ผลการประเมิน', 'ภาพรวมสถิติ กราฟแนวโน้ม และดัชนีสุขภาพพืช'],
                plots: ['🌱 จัดการแปลงเพาะปลูก', 'เพิ่ม แก้ไข หรือลบแปลงเกษตรและชนิดพืช']
            };

            Object.keys(views).forEach(k => {
                if (k === tabName) {
                    views[k].classList.remove('hidden');
                    if (btns[k]) btns[k].classList.add('active');
                } else {
                    views[k].classList.add('hidden');
                    if (btns[k]) btns[k].classList.remove('active');
                }
            });

            if (titles[tabName]) {
                document.getElementById('pageHeaderTitle').textContent = titles[tabName][0];
                document.getElementById('pageHeaderSubtitle').textContent = titles[tabName][1];
            }

            if (tabName !== 'farm3d' && typeof stop3DLoop === 'function') {
                stop3DLoop();
            }
            if (tabName === 'ai') {
                if (typeof initAiAssistant === 'function') initAiAssistant();
                if (typeof renderAiLiveDiagnostics === 'function') renderAiLiveDiagnostics();
            } else if (tabName === 'report30m') {
                if (typeof render30MinReport === 'function') render30MinReport();
            } else if (tabName === 'farm3d') {
                initOrResize3DFarm();
            } else if (tabName === 'overview') {
                renderOverview();
            } else if (tabName === 'blueprint') {
                renderBlueprint();
            } else if (tabName === 'kanban') {
                renderKanban();
                calculateYieldForecast();
            } else if (tabName === 'map') {
                initOrRefreshMap();
            } else if (tabName === 'record') {
                updatePlantPreview();
            } else if (tabName === 'dashboard') {
                renderDashboard();
            } else if (tabName === 'plots') {
                renderPlotsTable();
            }
        }

        function jumpToPlotRecord(plotId) {
            const select = document.getElementById('inputPlot');
            if (select) select.value = String(plotId);
            switchTab('record');
            showToast('เลือกแปลงเพาะปลูกสำหรับบันทึกข้อมูลแล้ว');
        }

        function jumpToPlotDashboard(plotId) {
            const filter = document.getElementById('filterPlot');
            if (filter) filter.value = String(plotId);
            switchTab('dashboard');
        }

        function jumpToPlotOnMap(plotId) {
            if (typeof pendingFocusPlotId !== 'undefined') {
                pendingFocusPlotId = Number(plotId);
            }
            switchTab('map');
            setTimeout(() => {
                focusPlotOnMap(plotId);
            }, 240);
        }

// =====================================================================
        // 6. แสดงผลหน้าแรก (Visual Farm Cards & 5-Stage Growth Progress)
        // =====================================================================
        
        function renderBlueprint() {
            const grid = document.getElementById('blueprintZonesGrid');
            if (!grid) return;

            grid.innerHTML = plots.map(p => {
                if (!iotState[p.id]) {
                    iotState[p.id] = { water: false, fan: false, light: false, fert: false };
                }
                const st = iotState[p.id];
                const plotLogs = logs.filter(r => r.plotId === p.id).sort((a, b) => b.ageDays - a.ageDays);
                const latest = plotLogs[0] || { ageDays: 15, heightCm: 18.0, leafCount: 8, moisture: 70, soilPh: 6.5, stage: 'ระยะต้นกล้า (1-15 วัน)', q1: 5, q2: 5, q3: 5, q4: 5 };
                const liveMoist = Math.min(98, latest.moisture + (st.water ? 6 : 0));

                return `
                    <div class="bg-slate-800/90 rounded-2xl p-5 border ${st.water ? 'border-emerald-400/70 shadow-lg shadow-emerald-950/50' : 'border-slate-700'} space-y-4">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-2xl bg-slate-700 border border-slate-600 flex items-center justify-center text-2xl">
                                    ${p.icon || '🌱'}
                                </div>
                                <div>
                                    <span class="text-[11px] font-bold text-emerald-400">${p.zone}</span>
                                    <h4 class="text-base font-extrabold text-white">${p.name}</h4>
                                    <span class="text-[11px] text-slate-400">อายุ ${latest.ageDays} วัน • สูง ${latest.heightCm} ซม. • ${latest.leafCount} ใบ</span>
                                </div>
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold ${st.water ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40' : 'bg-slate-700 text-slate-300'}">
                                ${st.water ? '💦 กำลังให้น้ำหยด' : '⏸️ โหมดสแตนด์บาย'}
                            </span>
                        </div>

                        <!-- Visual Plant Rows Simulation inside the 2D Zone -->
                        <div class="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800 space-y-2">
                            <div class="flex items-center justify-between text-xs">
                                <span class="text-slate-400 font-semibold">ผังแถวปลูกในแปลง (Soil Moisture Heatmap)</span>
                                <span class="font-bold text-sky-300">ความชื้นดิน: ${liveMoist}% • pH ${latest.soilPh || 6.5}</span>
                            </div>
                            <div class="grid grid-cols-6 gap-2 py-1">
                                ${[1,2,3,4,5,6].map(n => `
                                    <div class="h-10 rounded-lg flex flex-col items-center justify-center text-xs border ${st.water ? 'bg-emerald-900/60 border-emerald-500/50' : 'bg-slate-900 border-slate-700'}">
                                        <span>${p.icon || '🌱'}</span>
                                        <span class="text-[9px] text-slate-400">แถว ${n}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Interactive IoT Switches -->
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <button type="button" onclick="toggleIotDevice(${p.id}, 'water')" class="py-2 px-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${st.water ? 'bg-sky-600 text-white border-sky-400' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'}">
                                <span>💦 น้ำหยด</span>
                                <span class="text-[10px]">${st.water ? 'เปิด (ON)' : 'ปิด (OFF)'}</span>
                            </button>
                            <button type="button" onclick="toggleIotDevice(${p.id}, 'fert')" class="py-2 px-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${st.fert ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'}">
                                <span>🧪 ปุ๋ยน้ำ AB</span>
                                <span class="text-[10px]">${st.fert ? 'เปิด (ON)' : 'ปิด (OFF)'}</span>
                            </button>
                            <button type="button" onclick="toggleIotDevice(${p.id}, 'fan')" class="py-2 px-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${st.fan ? 'bg-teal-600 text-white border-teal-400' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'}">
                                <span>🌬️ พัดลม</span>
                                <span class="text-[10px]">${st.fan ? 'เปิด (ON)' : 'ปิด (OFF)'}</span>
                            </button>
                            <button type="button" onclick="toggleIotDevice(${p.id}, 'light')" class="py-2 px-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${st.light ? 'bg-amber-500 text-slate-950 border-amber-300' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'}">
                                <span>💡 ไฟเสริมแสง</span>
                                <span class="text-[10px]">${st.light ? 'เปิด (ON)' : 'ปิด (OFF)'}</span>
                            </button>
                        </div>

                        <div class="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                            <button type="button" onclick="jumpToPlotRecord(${p.id})" class="text-emerald-400 hover:underline font-bold">
                                + บันทึกความสูง/ใบแปลงนี้
                            </button>
                            <button type="button" onclick="jumpToPlotOnMap(${p.id})" class="text-sky-400 hover:underline font-bold">
                                📍 ดูพิกัดดาวเทียม &rarr;
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function toggleIotDevice(plotId, deviceKey) {
            if (!iotState[plotId]) {
                iotState[plotId] = { water: false, fan: false, light: false, fert: false };
            }
            iotState[plotId][deviceKey] = !iotState[plotId][deviceKey];
            const labels = { water: 'ระบบน้ำหยดอัตโนมัติ', fert: 'ระบบจ่ายปุ๋ยน้ำ', fan: 'พัดลมระบายอากาศ', light: 'โคมไฟเสริมแสงสังเคราะห์' };
            const statusText = iotState[plotId][deviceKey] ? 'เปิดทำงาน (ON)' : 'ปิดการทำงาน (OFF)';
            renderBlueprint();
            showToast(`อัปเดตสวิตช์ ${labels[deviceKey]}: ${statusText}`);
        }

        function triggerAllIrrigation() {
            plots.forEach(p => {
                if (!iotState[p.id]) iotState[p.id] = { water: true, fan: false, light: false, fert: true };
                else iotState[p.id].water = true;
            });
            renderBlueprint();
            showToast('💦 เปิดระบบน้ำหยดอัตโนมัติครบทุกแปลงในฟาร์มเรียบร้อยแล้ว!');
        }

        function renderKanban() {
            const board = document.getElementById('kanbanBoardGrid');
            if (!board) return;

            const columns = [
                { key: 'ระยะต้นกล้า (1-15 วัน)', title: '🌱 1. ระยะต้นกล้า', sub: 'อายุ 1–15 วัน', color: 'border-t-emerald-500' },
                { key: 'ระยะเจริญเติบโตทางใบ (16-35 วัน)', title: '🌿 2. เจริญเติบโตทางใบ', sub: 'อายุ 16–35 วัน', color: 'border-t-teal-500' },
                { key: 'ระยะออกดอก/ติดผล (36-55 วัน)', title: '🌼 3. ออกดอก / ติดผล', sub: 'อายุ 36–55 วัน', color: 'border-t-amber-500' },
                { key: 'ระยะพร้อมเก็บเกี่ยว (60 วันขึ้นไป)', title: '🧺 4. พร้อมเก็บเกี่ยว', sub: 'อายุ 60 วันขึ้นไป', color: 'border-t-purple-500' }
            ];

            board.innerHTML = columns.map((col, colIdx) => {
                const matchingPlots = plots.filter(p => {
                    const plotLogs = logs.filter(r => r.plotId === p.id).sort((a, b) => b.ageDays - a.ageDays);
                    const stage = plotLogs[0] ? plotLogs[0].stage : 'ระยะต้นกล้า (1-15 วัน)';
                    return stage === col.key;
                });

                const cardsHtml = matchingPlots.length === 0
                    ? `<div class="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">ไม่มีแปลงในระยะนี้</div>`
                    : matchingPlots.map(p => {
                        const plotLogs = logs.filter(r => r.plotId === p.id).sort((a, b) => b.ageDays - a.ageDays);
                        const latest = plotLogs[0] || { ageDays: 14, heightCm: 15, leafCount: 6, moisture: 70 };
                        const nextButton = colIdx < columns.length - 1
                            ? `<button type="button" onclick="advancePlotStage(${p.id}, ${colIdx + 1})" class="w-full mt-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold py-1.5 px-2 rounded-lg transition">เลื่อนไประยะถัดไป &rarr;</button>`
                            : `<div class="mt-2 text-center bg-purple-50 text-purple-800 text-[11px] font-bold py-1 rounded-lg">🎉 พร้อมเก็บเกี่ยวส่งจำหน่าย</div>`;

                        return `
                            <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
                                <div class="flex items-center justify-between">
                                    <span class="text-lg">${p.icon || '🌱'}</span>
                                    <span class="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">อายุ ${latest.ageDays} วัน</span>
                                </div>
                                <div class="text-xs font-extrabold text-slate-900">${p.name}</div>
                                <div class="text-[11px] text-slate-500">สูง ${latest.heightCm} ซม. • ${latest.leafCount} ใบ • ชื้น ${latest.moisture}%</div>
                                ${nextButton}
                            </div>
                        `;
                    }).join('');

                return `
                    <div class="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 border-t-4 ${col.color} space-y-3">
                        <div class="flex items-center justify-between">
                            <div>
                                <h4 class="text-xs sm:text-sm font-extrabold text-slate-900">${col.title}</h4>
                                <span class="text-[11px] text-slate-500">${col.sub}</span>
                            </div>
                            <span class="w-6 h-6 rounded-full bg-white border border-slate-200 text-xs font-extrabold flex items-center justify-center text-slate-700">${matchingPlots.length}</span>
                        </div>
                        <div class="space-y-2.5">
                            ${cardsHtml}
                        </div>
                    </div>
                `;
            }).join('');
        }

        function advancePlotStage(plotId, nextStageIdx) {
            const stages = [
                'ระยะต้นกล้า (1-15 วัน)',
                'ระยะเจริญเติบโตทางใบ (16-35 วัน)',
                'ระยะออกดอก/ติดผล (36-55 วัน)',
                'ระยะพร้อมเก็บเกี่ยว (60 วันขึ้นไป)'
            ];
            const plotLogs = logs.filter(r => r.plotId === plotId).sort((a, b) => b.ageDays - a.ageDays);
            const prev = plotLogs[0] || { ageDays: 12, heightCm: 15, leafCount: 6, moisture: 70, soilPh: 6.5, q1: 5, q2: 5, q3: 5, q4: 5 };
            const now = new Date();
            const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

            logs.push({
                id: Date.now(),
                plotId: plotId,
                stage: stages[nextStageIdx],
                ageDays: prev.ageDays + 14,
                heightCm: Number((prev.heightCm + 16.5).toFixed(1)),
                leafCount: prev.leafCount + 6,
                moisture: prev.moisture,
                soilPh: prev.soilPh || 6.5,
                q1: 5, q2: 5, q3: 5, q4: 5,
                note: `อัปเดตเข้าสู่${stages[nextStageIdx]} พืชเจริญเติบโตสมบูรณ์ตามเป้าหมาย`,
                createdAt: dateStr
            });
            saveData();
            renderKanban();
            renderOverview();
            renderBlueprint();
            renderDashboard();
            showToast(`เลื่อนแปลงเข้าสู่ "${stages[nextStageIdx]}" เรียบร้อยแล้ว!`);
        }

        function calculateYieldForecast() {
            const rai = Number(document.getElementById('calcAreaRai')?.value || 5);
            const yieldPerRai = Number(document.getElementById('calcYieldPerRai')?.value || 1800);
            const price = Number(document.getElementById('calcPricePerKg')?.value || 35);
            const cost = Number(document.getElementById('calcCostTotal')?.value || 45000);

            const totalKg = rai * yieldPerRai;
            const gross = totalKg * price;
            const net = gross - cost;
            const roi = cost > 0 ? ((net / cost) * 100) : 0;

            const elKg = document.getElementById('resTotalYieldKg');
            const elGross = document.getElementById('resGrossRevenue');
            const elNet = document.getElementById('resNetProfit');
            const elRoi = document.getElementById('resRoiPercent');
            if (elKg) elKg.textContent = `${totalKg.toLocaleString()} กก.`;
            if (elGross) elGross.textContent = `${gross.toLocaleString()} บาท`;
            if (elNet) elNet.textContent = `${net.toLocaleString()} บาท`;
            if (elRoi) elRoi.textContent = `ผลตอบแทน (ROI): ${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`;
        }

        function renderOverview() {
            const container = document.getElementById('visualPlotCardsContainer');
            if (!container) return;

            const allHeights = logs.map(r => Number(r.heightCm));
            const allMoist = logs.map(r => Number(r.moisture));
            const avgH = allHeights.length ? (allHeights.reduce((a, b) => a + b, 0) / allHeights.length) : 0;
            const avgM = allMoist.length ? (allMoist.reduce((a, b) => a + b, 0) / allMoist.length) : 0;

            document.getElementById('overviewTotalPlots').textContent = `${plots.length} แปลง`;
            document.getElementById('overviewAvgHeight').textContent = `${avgH.toFixed(1)} ซม.`;
            document.getElementById('overviewAvgMoisture').textContent = `${avgM.toFixed(0)}%`;
            const sideMoist = document.getElementById('sidebarAvgMoisture');
            if (sideMoist) sideMoist.textContent = `${avgM.toFixed(0)}% RH`;

            container.innerHTML = plots.map(p => {
                const plotLogs = logs.filter(r => r.plotId === p.id).sort((a, b) => b.ageDays - a.ageDays);
                const latest = plotLogs[0] || {
                    ageDays: 14,
                    heightCm: 15.0,
                    leafCount: 6,
                    moisture: 70,
                    soilPh: 6.5,
                    stage: 'ระยะต้นกล้า (1-15 วัน)',
                    q1: 5, q2: 5, q3: 5, q4: 5,
                    note: 'พร้อมบันทึกข้อมูลการสำรวจ'
                };
                const targetDays = p.harvestDays || 65;
                const progressPct = Math.min(100, Math.round((latest.ageDays / targetDays) * 100));
                const remainDays = Math.max(0, targetDays - latest.ageDays);
                const agr = (latest.heightCm / Math.max(1, latest.ageDays)).toFixed(2);
                const healthAvg = ((latest.q1 + latest.q2 + latest.q3 + latest.q4) / 4);
                const grade = healthAvg >= 4.6 ? 'Grade A+' : (healthAvg >= 4.0 ? 'Grade A' : 'Grade B');

                const stageStep = latest.ageDays <= 7 ? 1 : (latest.ageDays <= 18 ? 2 : (latest.ageDays <= 35 ? 3 : (latest.ageDays <= 55 ? 4 : 5)));
                const stagesList = ['เพาะเมล็ด', 'ต้นกล้า', 'แตกใบ', 'ออกดอก/ผล', 'เก็บเกี่ยว'];

                const stepsHtml = stagesList.map((stName, idx) => {
                    const stepNum = idx + 1;
                    const doneClass = stepNum <= stageStep ? 'done' : 'bg-slate-100 text-slate-400 border-slate-300';
                    return `
                        <div class="flex flex-col items-center flex-1">
                            <div class="stage-dot ${doneClass} w-6 h-6 rounded-full border text-[11px] font-extrabold flex items-center justify-center shadow-sm">${stepNum}</div>
                            <span class="text-[10px] font-semibold text-slate-600 mt-1 text-center">${stName}</span>
                        </div>
                    `;
                }).join('');

                return `
                    <div class="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 hover:border-emerald-400 transition flex flex-col justify-between space-y-4">
                        <div class="space-y-3">
                            <div class="flex items-start justify-between gap-2">
                                <div class="flex items-center gap-3">
                                    <div class="w-12 h-12 rounded-2xl theme-badge border flex items-center justify-center text-2xl shadow-sm">
                                        ${p.icon || '🌱'}
                                    </div>
                                    <div>
                                        <span class="text-[11px] font-bold text-slate-400">${p.zone} • 📍 ${(p.lat || 17.394).toFixed(3)}, ${(p.lng || 104.769).toFixed(3)}</span>
                                        <h4 class="text-base font-extrabold text-slate-900 leading-snug">${p.name}</h4>
                                    </div>
                                </div>
                                <span class="theme-step-badge text-xs font-extrabold px-3 py-1 rounded-full whitespace-nowrap">${grade} (${healthAvg.toFixed(2)})</span>
                            </div>

                            <!-- 5-Stage Timeline Bar -->
                            <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                                <div class="flex items-center justify-between text-xs">
                                    <span class="font-bold text-slate-700">อายุพืช: ${latest.ageDays} / ${targetDays} วัน (${progressPct}%)</span>
                                    <span class="font-bold text-emerald-700">${remainDays > 0 ? `อีก ${remainDays} วันเก็บเกี่ยว` : 'พร้อมเก็บเกี่ยวผลผลิต!'}</span>
                                </div>
                                <div class="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div class="h-full theme-step-badge rounded-full transition-all" style="width: ${progressPct}%"></div>
                                </div>
                                <div class="flex items-center justify-between pt-1">
                                    ${stepsHtml}
                                </div>
                            </div>

                            <!-- Key Physical Metrics -->
                            <div class="grid grid-cols-4 gap-2 text-center">
                                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <div class="text-[10px] text-slate-400">ความสูงล่าสุด</div>
                                    <div class="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5">${latest.heightCm} ซม.</div>
                                </div>
                                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <div class="text-[10px] text-slate-400">จำนวนใบ</div>
                                    <div class="text-xs sm:text-sm font-extrabold text-teal-700 mt-0.5">${latest.leafCount} ใบ</div>
                                </div>
                                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <div class="text-[10px] text-slate-400">อัตราโต (AGR)</div>
                                    <div class="text-xs sm:text-sm font-extrabold text-emerald-700 mt-0.5">${agr} ซม./วัน</div>
                                </div>
                                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <div class="text-[10px] text-slate-400">ความชื้นดิน</div>
                                    <div class="text-xs sm:text-sm font-extrabold text-sky-700 mt-0.5">${latest.moisture}%</div>
                                </div>
                            </div>

                            <div class="text-xs text-slate-600 bg-emerald-50/60 border border-emerald-200/70 px-3.5 py-2 rounded-xl">
                                📌 <b>บันทึกล่าสุด:</b> ${latest.note || '-'}
                            </div>
                        </div>

                        <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                            <button type="button" onclick="jumpToPlotRecord(${p.id})" class="flex-1 theme-btn-primary text-xs font-bold py-2.5 px-3 rounded-xl transition">
                                🌱 บันทึกวัดผลแปลงนี้
                            </button>
                            <button type="button" onclick="jumpToPlotOnMap(${p.id})" class="bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold py-2.5 px-3 rounded-xl transition">
                                📍 ดูบนแผนที่
                            </button>
                            <button type="button" onclick="jumpToPlotDashboard(${p.id})" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-3 rounded-xl transition">
                                📊 กราฟ (${plotLogs.length})
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // =====================================================================
        // 7. จำลองต้นพืชแบบไดนามิก (Interactive Plant Twin) & วินิจฉัยสุขภาพพืช
        // =====================================================================
        function updatePlantPreview() {
            const age = Number(document.getElementById('inputAgeDays')?.value || 28);
            const height = Number(document.getElementById('inputHeightCm')?.value || 38.5);
            const leaves = Number(document.getElementById('inputLeafCount')?.value || 14);
            const moisture = Number(document.getElementById('inputMoisture')?.value || 68);
            const ph = Number(document.getElementById('inputSoilPh')?.value || 6.5);

            const agr = (height / Math.max(1, age)).toFixed(2);
            const hLabel = document.getElementById('simHeightLabel');
            const agrLabel = document.getElementById('simAgrLabel');
            const soilLabel = document.getElementById('simSoilLabel');
            if (hLabel) hLabel.textContent = `${height.toFixed(1)} ซม.`;
            if (agrLabel) agrLabel.textContent = `${agr} ซม./วัน`;
            if (soilLabel) soilLabel.textContent = `${moisture}% • pH ${ph.toFixed(1)}`;

            const scaleY = Math.min(1.25, Math.max(0.55, 0.55 + (height / 80) * 0.65));
            const plantGroup = document.getElementById('svgPlantGroup');
            if (plantGroup) {
                plantGroup.setAttribute('transform', `translate(0, ${(1 - scaleY) * 172}) scale(1, ${scaleY})`);
            }

            const advices = [];
            if (moisture < 55) {
                advices.push(`⚠️ ความชื้นในดินค่อนข้างต่ำ (${moisture}%) แนะนำให้เปิดระบบน้ำหยดเพิ่มอีก 15-20 นาที`);
            } else if (moisture > 85) {
                advices.push(`⚠️ ความชื้นในดินสูงเกินไป (${moisture}%) ควรระบายน้ำเพื่อป้องกันรากเน่า`);
            } else {
                advices.push(`✅ ความชื้นในดิน (${moisture}%) อยู่ในเกณฑ์สมดุล`);
            }

            if (ph < 5.5) {
                advices.push(`ควรเติมปูนโดโลไมท์เพื่อปรับลดความเป็นกรดของดิน (pH ${ph})`);
            } else if (ph > 7.5) {
                advices.push(`ดินค่อนข้างด่าง (pH ${ph}) แนะนำเสริมปุ๋ยอินทรีย์หรือน้ำหมักชีวภาพ`);
            } else {
                advices.push(`ค่า pH ดิน (${ph}) เหมาะสมต่อการดูดซึมธาตุอาหารหลัก N-P-K`);
            }

            advices.push(`อัตราการเติบโตเฉลี่ยอยู่ที่ ${agr} ซม./วัน (จำนวนใบ ${leaves} ใบ/ต้น)`);
            const diagEl = document.getElementById('liveDiagnosisText');
            if (diagEl) diagEl.textContent = advices.join(' • ');
        }

        function handlePhotoPreview(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                uploadedPhotoDataUrl = ev.target.result;
                const wrap = document.getElementById('uploadedPhotoPreviewWrap');
                const img = document.getElementById('uploadedPhotoPreview');
                if (wrap && img) {
                    img.src = uploadedPhotoDataUrl;
                    wrap.classList.remove('hidden');
                }
                showToast('แนบรูปถ่ายต้นพืชเรียบร้อยแล้ว');
            };
            reader.readAsDataURL(file);
        }

        // =====================================================================
        // 8. สร้างฟอร์มประเมินสุขภาพพืช 4 ด้านและตัวเลือกแปลงปลูก
        // =====================================================================
        function renderRatingQuestions() {
            const container = document.getElementById('ratingQuestionsContainer');
            container.innerHTML = QUESTIONS.map(q => {
                const buttonsHtml = SCORE_LABELS.map(item => {
                    const isActive = currentScores[q.key] === item.score ? 'active' : '';
                    return `
                        <button type="button"
                            onclick="selectScore('${q.key}', ${item.score})"
                            class="score-btn ${isActive} flex-1 min-w-[95px] py-2 px-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-400 flex items-center justify-center gap-1">
                            <span>${item.emoji}</span>
                            <span>${item.text}</span>
                        </button>
                    `;
                }).join('');

                return `
                    <div class="bg-slate-50/90 border border-slate-200 rounded-2xl p-3.5 transition">
                        <div class="text-xs sm:text-sm font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
                            <span>${q.icon}</span>
                            <span>${q.title}</span>
                            <span class="text-red-500">*</span>
                        </div>
                        <div class="flex flex-wrap gap-1.5">
                            ${buttonsHtml}
                        </div>
                    </div>
                `;
            }).join('');

            const avg = (currentScores.q1 + currentScores.q2 + currentScores.q3 + currentScores.q4) / 4;
            const stats = calculateStats([avg]);
            const badge = document.getElementById('liveHealthBadge');
            if (badge) {
                badge.textContent = `${avg.toFixed(2)} / 5.00 (${stats.level})`;
            }
            const simGrade = document.getElementById('simGradeBadge');
            if (simGrade) {
                simGrade.textContent = avg >= 4.5 ? 'Grade A+' : (avg >= 3.8 ? 'Grade A' : 'Grade B');
            }
        }

        function selectScore(questionKey, scoreVal) {
            currentScores[questionKey] = scoreVal;
            renderRatingQuestions();
        }

        function renderPlotSelectors() {
            const inputPlot = document.getElementById('inputPlot');
            const filterPlot = document.getElementById('filterPlot');
            const currentFilter = filterPlot.value || 'all';

            inputPlot.innerHTML = plots.map(p =>
                `<option value="${p.id}">${p.name} (${p.zone})</option>`
            ).join('');

            filterPlot.innerHTML = `<option value="all">รวมทุกแปลงเพาะปลูก (${plots.length} แปลง)</option>` +
                plots.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

            filterPlot.value = currentFilter;
        }

        // =====================================================================
        // 9. คำนวณค่าสถิติ (Mean / X-bar, S.D., แปลผลคุณภาพการเติบโต)
        // =====================================================================
        function calculateStats(values) {
            const n = values.length;
            if (n === 0) {
                return { mean: 0, sd: 0, level: 'ยังไม่มีข้อมูล' };
            }
            const sum = values.reduce((acc, v) => acc + v, 0);
            const mean = sum / n;
            let sd = 0;
            if (n > 1) {
                const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1);
                sd = Math.sqrt(variance);
            }

            let level = 'ควรปรับปรุง';
            if (mean >= 4.50) level = 'ดีเยี่ยม';
            else if (mean >= 3.50) level = 'ดี';
            else if (mean >= 2.50) level = 'ปานกลาง';
            else if (mean >= 1.50) level = 'พอใช้';

            return { mean, sd, level };
        }

        // =====================================================================
        // 10. แสดงผลหน้า Dashboard, บทสรุปอัตโนมัติ และกราฟ 4 มิติ
        // =====================================================================
        function renderDashboard() {
            const filterVal = document.getElementById('filterPlot').value;
            const filtered = filterVal === 'all'
                ? logs
                : logs.filter(r => String(r.plotId) === String(filterVal));

            const s1 = calculateStats(filtered.map(r => r.q1));
            const s2 = calculateStats(filtered.map(r => r.q2));
            const s3 = calculateStats(filtered.map(r => r.q3));
            const s4 = calculateStats(filtered.map(r => r.q4));

            const rowAverages = filtered.map(r => (r.q1 + r.q2 + r.q3 + r.q4) / 4);
            const overall = calculateStats(rowAverages);
            const pct = (overall.mean / 5) * 100;

            const avgHeight = filtered.length > 0
                ? filtered.reduce((acc, r) => acc + Number(r.heightCm), 0) / filtered.length
                : 0;
            const avgLeaf = filtered.length > 0
                ? filtered.reduce((acc, r) => acc + Number(r.leafCount), 0) / filtered.length
                : 0;
            const avgMoisture = filtered.length > 0
                ? filtered.reduce((acc, r) => acc + Number(r.moisture), 0) / filtered.length
                : 0;

            document.getElementById('kpiTotalCount').textContent = `${filtered.length} ครั้ง`;
            document.getElementById('kpiAvgHeightLeaf').textContent = `${avgHeight.toFixed(1)} ซม. / ${avgLeaf.toFixed(0)} ใบ`;
            document.getElementById('kpiAvgMoisture').textContent = `ความชื้นในดินเฉลี่ย: ${avgMoisture.toFixed(0)}%`;
            document.getElementById('kpiOverallMean').textContent = `${overall.mean.toFixed(2)} / 5.00`;
            document.getElementById('kpiOverallLevel').textContent = `คุณภาพการเติบโต: ${overall.level}`;
            document.getElementById('kpiOverallSD').textContent = overall.sd.toFixed(2);
            document.getElementById('kpiPercentage').textContent = `ความสมบูรณ์คิดเป็น ${pct.toFixed(1)}%`;

            const statsRows = [
                { title: QUESTIONS[0].title, ...s1 },
                { title: QUESTIONS[1].title, ...s2 },
                { title: QUESTIONS[2].title, ...s3 },
                { title: QUESTIONS[3].title, ...s4 }
            ];

            const sortedDimensions = [...statsRows].sort((a, b) => b.mean - a.mean);
            const highestDim = sortedDimensions[0];
            const lowestDim = sortedDimensions[sortedDimensions.length - 1];
            const narrativeEl = document.getElementById('autoNarrativeSummary');
            if (filtered.length === 0) {
                narrativeEl.textContent = 'ยังไม่มีข้อมูลการสำรวจสำหรับแปลงเพาะปลูกที่เลือก';
            } else {
                narrativeEl.textContent = `จากการติดตามและประเมินการเจริญเติบโตของพืชผลจำนวน ${filtered.length} ครั้ง พบว่ามีค่าความสูงต้นพืชเฉลี่ย ${avgHeight.toFixed(1)} ซม. จำนวนใบเฉลี่ย ${avgLeaf.toFixed(1)} ใบ/ต้น ความชื้นในดินเฉลี่ย ${avgMoisture.toFixed(0)}% และมีดัชนีคุณภาพการเติบโตในภาพรวมอยู่ในระดับ "${overall.level}" (X-bar = ${overall.mean.toFixed(2)}, S.D. = ${overall.sd.toFixed(2)} คิดเป็นร้อยละ ${pct.toFixed(1)}) โดยด้านที่มีความสมบูรณ์สูงสุดคือ "${highestDim.title}" (X-bar = ${highestDim.mean.toFixed(2)}) และด้านที่ควรเฝ้าระวังดูแลเพิ่มเติมคือ "${lowestDim.title}" (X-bar = ${lowestDim.mean.toFixed(2)})`;
            }

            const statsTbody = document.getElementById('statsTableBody');
            statsTbody.innerHTML = statsRows.map(row => `
                <tr class="hover:bg-slate-50">
                    <td class="py-3 px-4 font-medium text-slate-800">${row.title}</td>
                    <td class="py-3 px-4 text-right font-bold text-slate-900">${row.mean.toFixed(2)}</td>
                    <td class="py-3 px-4 text-right text-slate-700">${row.sd.toFixed(2)}</td>
                    <td class="py-3 px-4 text-right text-slate-600">${((row.mean / 5) * 100).toFixed(1)}%</td>
                    <td class="py-3 px-4 text-center">
                        <span class="inline-block theme-badge border text-xs font-bold px-2.5 py-1 rounded-full">${row.level}</span>
                    </td>
                </tr>
            `).join('') + `
                <tr class="bg-slate-100 font-bold text-slate-900">
                    <td class="py-3 px-4">สรุปผลการประเมินการเจริญเติบโตและสุขภาพพืชรวมทั้งหมด</td>
                    <td class="py-3 px-4 text-right">${overall.mean.toFixed(2)}</td>
                    <td class="py-3 px-4 text-right">${overall.sd.toFixed(2)}</td>
                    <td class="py-3 px-4 text-right">${pct.toFixed(1)}%</td>
                    <td class="py-3 px-4 text-center">
                        <span class="inline-block theme-step-badge text-xs font-bold px-2.5 py-1 rounded-full">${overall.level}</span>
                    </td>
                </tr>
            `;

            const searchQuery = (document.getElementById('searchLogInput')?.value || '').trim().toLowerCase();
            const logsTbody = document.getElementById('logsTableBody');
            const sortedLogs = [...filtered]
                .filter(r => {
                    if (!searchQuery) return true;
                    const plot = plots.find(p => p.id === r.plotId);
                    const plotName = plot ? plot.name : '';
                    const combined = `${plotName} ${r.stage} ${r.note || ''} ${r.createdAt}`.toLowerCase();
                    return combined.includes(searchQuery);
                })
                .sort((a, b) => b.ageDays - a.ageDays);

            if (sortedLogs.length === 0) {
                logsTbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400">ไม่พบประวัติการสำรวจที่ค้นหา</td></tr>`;
            } else {
                logsTbody.innerHTML = sortedLogs.map(r => {
                    const plot = plots.find(p => p.id === r.plotId);
                    const plotName = plot ? plot.name : 'แปลงทั่วไป';
                    const avg = ((r.q1 + r.q2 + r.q3 + r.q4) / 4).toFixed(2);
                    const phText = r.soilPh ? ` • pH ${r.soilPh}` : '';
                    return `
                        <tr class="hover:bg-slate-50">
                            <td class="py-2.5 px-3 text-xs text-slate-500 whitespace-nowrap">${r.createdAt}</td>
                            <td class="py-2.5 px-3 font-semibold text-slate-800">${plotName}</td>
                            <td class="py-2.5 px-3 text-xs text-slate-600">อายุ <b>${r.ageDays} วัน</b><br><span class="text-[11px] text-slate-400">${r.stage}</span></td>
                            <td class="py-2.5 px-3 text-right text-xs font-medium text-slate-700">สูง <b>${r.heightCm} ซม.</b> • ${r.leafCount} ใบ<br><span class="text-teal-700">ชื้น ${r.moisture}%${phText}</span></td>
                            <td class="py-2.5 px-3 text-right font-bold text-slate-900">${avg} / 5.00</td>
                            <td class="py-2.5 px-3 text-slate-700 text-xs sm:text-sm">${r.note || '-'}</td>
                            <td class="py-2.5 px-3 text-center no-print">
                                <button type="button" onclick="deleteLog(${r.id})" class="text-xs text-red-600 hover:underline font-semibold">ลบ</button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }

            renderCharts([s1.mean, s2.mean, s3.mean, s4.mean], filtered);
        }

        function renderCharts(barMeans, filteredList) {
            const cleanMeans = barMeans.map(v => Number(v.toFixed(2)));
            const t = THEMES[activeThemeKey] || THEMES.emerald;

            const sortedByAge = [...filteredList].sort((a, b) => a.ageDays - b.ageDays);
            const ageLabels = sortedByAge.map(r => `อายุ ${r.ageDays} วัน`);
            const heightSeries = sortedByAge.map(r => Number(r.heightCm));
            const leafSeries = sortedByAge.map(r => Number(r.leafCount));

            const lineCtx = document.getElementById('growthLineCanvas').getContext('2d');
            if (growthLineInstance) growthLineInstance.destroy();
            growthLineInstance = new Chart(lineCtx, {
                type: 'line',
                data: {
                    labels: ageLabels,
                    datasets: [
                        {
                            label: 'ความสูงต้นพืช (ซม.)',
                            data: heightSeries,
                            borderColor: t.primary,
                            backgroundColor: t.radarFill,
                            fill: true,
                            tension: 0.35,
                            borderWidth: 2.5
                        },
                        {
                            label: 'จำนวนใบ (ใบ/ต้น)',
                            data: leafSeries,
                            borderColor: '#f59e0b',
                            backgroundColor: 'rgba(245, 158, 11, 0.12)',
                            borderDash: [5, 4],
                            tension: 0.35,
                            borderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } },
                    plugins: { legend: { position: 'top' } }
                }
            });

            const radarCtx = document.getElementById('radarChartCanvas').getContext('2d');
            if (radarChartInstance) radarChartInstance.destroy();
            radarChartInstance = new Chart(radarCtx, {
                type: 'radar',
                data: {
                    labels: ['ความแข็งแรงลำต้น/ราก', 'ความสมบูรณ์ใบ/ปลอดโรค', 'อัตราการเติบโต', 'ความชื้นดิน/ธาตุอาหาร'],
                    datasets: [{
                        label: 'ดัชนีสุขภาพพืช',
                        data: cleanMeans,
                        backgroundColor: t.radarFill,
                        borderColor: t.primary,
                        pointBackgroundColor: t.primaryDark,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { r: { min: 0, max: 5, ticks: { stepSize: 1 } } },
                    plugins: { legend: { display: false } }
                }
            });

            const barCtx = document.getElementById('barChartCanvas').getContext('2d');
            if (barChartInstance) barChartInstance.destroy();
            barChartInstance = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: ['1. ลำต้น/ระบบราก', '2. ใบสด/ปลอดโรค', '3. อัตราเติบโต', '4. ความชื้น/อาหาร'],
                    datasets: [{
                        label: 'คะแนนเฉลี่ย (เต็ม 5.00)',
                        data: cleanMeans,
                        backgroundColor: t.chartColors,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, max: 5 } },
                    plugins: { legend: { display: false } }
                }
            });

            const pieCtx = document.getElementById('pieChartCanvas').getContext('2d');
            if (pieChartInstance) pieChartInstance.destroy();
            const plotLabels = plots.map(p => p.name.length > 26 ? p.name.slice(0, 26) + '...' : p.name);
            const plotCounts = plots.map(p => logs.filter(r => r.plotId === p.id).length);

            pieChartInstance = new Chart(pieCtx, {
                type: 'doughnut',
                data: {
                    labels: plotLabels,
                    datasets: [{
                        data: plotCounts,
                        backgroundColor: [...t.chartColors, '#6366f1', '#14b8a6']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
                    }
                }
            });
        }

        // =====================================================================
        // 11. จำลองข้อมูลการสำรวจพืชผลเพิ่ม +5 รายการ
        // =====================================================================
        function simulateMoreCropLogs() {
            const stages = [
                'ระยะต้นกล้า (1-15 วัน)',
                'ระยะเจริญเติบโตทางใบ (16-35 วัน)',
                'ระยะออกดอก/ติดผล (36-55 วัน)',
                'ระยะพร้อมเก็บเกี่ยว (60 วันขึ้นไป)'
            ];
            const sampleNotes = [
                'ต้นพืชเจริญเติบโตตามเกณฑ์ ใบสีเขียวเข้มสมบูรณ์ดีมาก',
                'ความชื้นในดินเหมาะสม ระบบให้น้ำอัตโนมัติทำงานตามเวลา',
                'ใส่ปุ๋ยอินทรีย์เสริมธาตุอาหารหลักและฉีดพ่นน้ำหมักชีวภาพป้องกันแมลง',
                'ทรงพุ่มขยายตัวดี ลำต้นแข็งแรง ไม่พบอาการใบเหลือง',
                'ผลผลิตเริ่มสมบูรณ์เต็มที่ เตรียมวางแผนเก็บเกี่ยวรอบถัดไป'
            ];

            const now = new Date();
            const dateStr = now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0');

            for (let i = 0; i < 5; i++) {
                const randPlot = plots[Math.floor(Math.random() * plots.length)];
                const age = Math.floor(Math.random() * 50) + 10;
                const height = Number((age * 1.4 + (Math.random() * 6)).toFixed(1));
                const leaves = Math.max(4, Math.floor(age * 0.55));
                const moisture = Math.floor(Math.random() * 16) + 64;
                const randScore = () => (Math.random() > 0.2 ? (Math.random() > 0.4 ? 5 : 4) : 3);
                const stageIdx = age <= 15 ? 0 : (age <= 35 ? 1 : (age <= 55 ? 2 : 3));

                logs.push({
                    id: Date.now() + i,
                    plotId: randPlot.id,
                    stage: stages[stageIdx],
                    ageDays: age,
                    heightCm: height,
                    leafCount: leaves,
                    moisture: moisture,
                    soilPh: 6.5,
                    q1: randScore(),
                    q2: randScore(),
                    q3: randScore(),
                    q4: randScore(),
                    note: sampleNotes[i % sampleNotes.length],
                    createdAt: dateStr
                });
            }

            saveData();
            renderOverview();
            renderDashboard();
            renderPlotsTable();
            renderMapMarkers();
            showToast(`จำลองข้อมูลสำรวจพืชผลเพิ่มอีก 5 ครั้งแล้ว! (รวมทั้งหมด ${logs.length} ครั้ง)`);
        }

        // =====================================================================
        // 12. จัดการแปลงปลูก และระบบส่งออกไฟล์เว็บ .html / ซิงค์ข้อมูลข้ามเครื่องฟรี
        // =====================================================================
        function renderPlotsTable() {
            const tbody = document.getElementById('plotsTableBody');
            tbody.innerHTML = plots.map(p => {
                const count = logs.filter(r => r.plotId === p.id).length;
                const coords = `${(p.lat || 17.394).toFixed(4)}, ${(p.lng || 104.769).toFixed(4)}`;
                return `
                    <tr class="hover:bg-slate-50">
                        <td class="py-3 px-4 font-mono text-xs text-slate-500">#${p.id}</td>
                        <td class="py-3 px-4 font-bold text-slate-800">${p.name}</td>
                        <td class="py-3 px-4 text-slate-600">${p.zone} <span class="text-xs font-mono text-emerald-700 block">📍 ${coords}</span></td>
                        <td class="py-3 px-4 text-center font-semibold text-slate-800">${count} ครั้ง</td>
                        <td class="py-3 px-4 text-center">
                            <button type="button" onclick="deletePlot(${p.id})" class="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-3 py-1 rounded-lg transition">
                                ลบแปลงปลูก
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        function deletePlot(id) {
            if (typeof deleteTreeAndGraph === 'function') {
                deleteTreeAndGraph(id);
                return;
            }
            if (plots.length <= 1) {
                showToast('ต้องมีแปลงเพาะปลูกในระบบอย่างน้อย 1 แปลง');
                return;
            }
            plots = plots.filter(p => p.id !== id);
            saveData();
            renderPlotSelectors();
            renderPlotsTable();
            renderOverview();
            renderMapMarkers();
            showToast('ลบแปลงเพาะปลูกเรียบร้อยแล้ว');
        }

        function deleteLog(id) {
            logs = logs.filter(r => r.id !== id);
            saveData();
            renderOverview();
            renderDashboard();
            renderMapMarkers();
            showToast('ลบประวัติการสำรวจเรียบร้อยแล้ว');
        }

        function resetDemoData() {
            plots = [...DEFAULT_PLOTS];
            logs = [...DEFAULT_LOGS];
            saveData();
            renderPlotSelectors();
            renderPlotsTable();
            renderOverview();
            renderDashboard();
            renderMapMarkers();
            if (typeof init30MinTelemetryData === 'function') { init30MinTelemetryData(true); render30MinReport(); }
            showToast('รีเซ็ตข้อมูลตัวอย่างเริ่มต้นเรียบร้อยแล้ว');
        }

        function exportSelfContainedHTML() {
            let fullHtml = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
            const replacementBlock = `/*__EMBEDDED_DATA_START__*/\n        const DEFAULT_PLOTS = ${JSON.stringify(plots, null, 4)};\n        const DEFAULT_LOGS = ${JSON.stringify(logs, null, 4)};\n        /*__EMBEDDED_DATA_END__*/`;
            fullHtml = fullHtml.replace(/\/\*__EMBEDDED_DATA_START__\*\/[\s\S]*?\/\*__EMBEDDED_DATA_END__\*\//, replacementBlock);

            const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'crop_growth_shared.html');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('ดาวน์โหลดไฟล์เว็บพร้อมข้อมูลชุดนี้แล้ว ส่งเข้า LINE ให้เพื่อนเปิดดูได้เลย!');
        }

        function copyShareCode() {
            const payload = JSON.stringify({ plots, logs });
            const encoded = btoa(unescape(encodeURIComponent(payload)));
            const textarea = document.createElement('textarea');
            textarea.value = encoded;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast('คัดลอกรหัสข้อมูลแล้ว ส่งทาง LINE ให้เพื่อนกดนำเข้าได้เลย!');
            } catch (e) {
                showToast('ไม่สามารถคัดลอกรหัสได้');
            }
            document.body.removeChild(textarea);
        }

        function importShareCode() {
            const input = document.getElementById('importCodeInput');
            const raw = (input?.value || '').trim();
            if (!raw) {
                showToast('กรุณาวางรหัสข้อมูลก่อนกดนำเข้า');
                return;
            }
            try {
                const decoded = decodeURIComponent(escape(atob(raw)));
                const parsed = JSON.parse(decoded);
                if (Array.isArray(parsed.plots) && Array.isArray(parsed.logs)) {
                    plots = parsed.plots;
                    logs = parsed.logs;
                    saveData();
                    renderPlotSelectors();
                    renderOverview();
                    renderDashboard();
                    renderPlotsTable();
                    renderMapMarkers();
                    input.value = '';
                    toggleQrModal(false);
                    showToast('นำเข้าข้อมูลจากเครื่องอื่นสำเร็จแล้ว!');
                } else {
                    showToast('รูปแบบรหัสข้อมูลไม่ถูกต้อง');
                }
            } catch (e) {
                showToast('รหัสข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
            }
        }

        function copyStatsForThesis() {
            const rows = document.querySelectorAll('#statsTableBody tr');
            let text = "รายการประเมินการเจริญเติบโตและสุขภาพพืช\tค่าเฉลี่ย (X-bar)\tส่วนเบี่ยงเบนมาตรฐาน (S.D.)\tคิดเป็นร้อยละ\tแปลผลคุณภาพการเติบโต\n";
            rows.forEach(tr => {
                const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
                text += cells.join('\t') + '\n';
            });

            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast('คัดลอกตารางสถิติแล้ว นำไปกดวาง (Ctrl+V) ใน Word บทที่ 4 ได้เลย!');
            } catch (err) {
                showToast('ไม่สามารถคัดลอกอัตโนมัติได้');
            }
            document.body.removeChild(textarea);
        }

        function copyNarrativeText() {
            const narrative = document.getElementById('autoNarrativeSummary').innerText;
            const textarea = document.createElement('textarea');
            textarea.value = narrative;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast('คัดลอกคำบรรยายสรุปผลแล้ว นำไปวางในบทที่ 4 หรือบทที่ 5 ได้เลย!');
            } catch (err) {
                showToast('ไม่สามารถคัดลอกอัตโนมัติได้');
            }
            document.body.removeChild(textarea);
        }

        function exportToCSV() {
            let csvContent = "\uFEFFลำดับ,ชื่อแปลงปลูก/ชนิดพืช,โซนพื้นที่,พิกัดGPS,ระยะการเติบโต,อายุพืช(วัน),ความสูง(ซม.),จำนวนใบ(ใบ),ความชื้นดิน(%),ค่าpHดิน,คะแนนลำต้น/ราก,คะแนนใบ/ปลอดโรค,คะแนนอัตราเติบโต,คะแนนสภาพแวดล้อม,คะแนนสุขภาพเฉลี่ย,บันทึกภาคสนาม,วันที่สำรวจ\n";
            logs.forEach((r, idx) => {
                const plot = plots.find(p => p.id === r.plotId);
                const plotName = plot ? plot.name.replace(/,/g, ' ') : '-';
                const plotZone = plot ? plot.zone.replace(/,/g, ' ') : '-';
                const gps = plot ? `${plot.lat || 17.394} ${plot.lng || 104.769}` : '-';
                const avg = ((r.q1 + r.q2 + r.q3 + r.q4) / 4).toFixed(2);
                const cleanNote = (r.note || '').replace(/,/g, ' ').replace(/\n/g, ' ');
                csvContent += `${idx + 1},${plotName},${plotZone},${gps},${r.stage},${r.ageDays},${r.heightCm},${r.leafCount},${r.moisture},${r.soilPh || 6.5},${r.q1},${r.q2},${r.q3},${r.q4},${avg},${cleanNote},${r.createdAt}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'crop_growth_assessment_report.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('ดาวน์โหลดไฟล์ CSV สำหรับเปิดใน Excel เรียบร้อยแล้ว');
        }

        // =====================================================================
        // 13. Event Listeners เมื่อกดบันทึกข้อมูลและเริ่มต้นระบบ
        // =====================================================================
        document.getElementById('cropForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const now = new Date();
            const dateStr = now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0');

            const newEntry = {
                id: Date.now(),
                plotId: Number(document.getElementById('inputPlot').value),
                stage: document.getElementById('inputStage').value,
                ageDays: Number(document.getElementById('inputAgeDays').value),
                heightCm: Number(document.getElementById('inputHeightCm').value),
                leafCount: Number(document.getElementById('inputLeafCount').value),
                moisture: Number(document.getElementById('inputMoisture').value),
                soilPh: Number(document.getElementById('inputSoilPh')?.value || 6.5),
                q1: currentScores.q1,
                q2: currentScores.q2,
                q3: currentScores.q3,
                q4: currentScores.q4,
                note: document.getElementById('inputNote').value.trim(),
                createdAt: dateStr
            };

            logs.push(newEntry);
            saveData();

            document.getElementById('inputNote').value = '';
            currentScores = { q1: 5, q2: 5, q3: 5, q4: 5 };
            renderRatingQuestions();
            renderOverview();
            renderMapMarkers();
            showToast('บันทึกข้อมูลการเติบโตพืชผลเรียบร้อยแล้ว! อัปเดตการ์ดแปลงและแผนที่ทันที');
        });

        document.getElementById('addPlotForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const nameInput = document.getElementById('newPlotName');
            const zoneInput = document.getElementById('newPlotZone');
            const name = nameInput.value.trim();
            const zone = zoneInput.value.trim();
            if (!name || !zone) return;

            const nextId = plots.length > 0 ? Math.max(...plots.map(p => p.id)) + 1 : 1;
            const angle = nextId * 1.15;
            const lat = Number((17.3945 + Math.sin(angle) * 0.0022).toFixed(4));
            const lng = Number((104.7692 + Math.cos(angle) * 0.0024).toFixed(4));
            plots.push({
                id: nextId,
                name: name.startsWith('แปลงที่') ? name : `แปลงที่ ${nextId}: ${name}`,
                zone: `${zone} (พิกัด ${lat}, ${lng})`,
                harvestDays: 150,
                icon: '🌳',
                lat: lat,
                lng: lng,
                shortName: name.split('(')[0].trim()
            });
            iotState[nextId] = { water: true, fan: true, light: false, fert: true };
            saveData();

            nameInput.value = '';
            zoneInput.value = '';
            if (typeof init30MinTelemetryData === 'function') init30MinTelemetryData(false);
            if (typeof pendingFocusPlotId !== 'undefined') pendingFocusPlotId = nextId;
            renderPlotSelectors();
            renderBlueprint();
            renderKanban();
            renderPlotsTable();
            renderOverview();
            renderDashboard();
            renderMapMarkers();
            if (typeof render30MinReport === 'function') render30MinReport();
            if (leafletMap) focusPlotOnMap(nextId);
            showToast(`📍 เพิ่ม "${name}" พร้อมปักหมุดลงแผนที่ (${lat}, ${lng}) และซิงค์กราฟทุก 30 นาทีเรียบร้อย!`);
        });

        // =====================================================================
        // 15. ระบบดูโครงสร้างโค้ดแยกส่วนและดาวน์โหลดไฟล์แยก (Modular Code Explorer)
        // =====================================================================
        const MODULAR_FILE_META = {
            'index.html': {
                path: 'index.html',
                title: '1. index.html — โครงสร้างหน้าเว็บหลัก (HTML5 Layout)',
                desc: 'โครงสร้าง Sidebar, Header, และหน้าจอทำงานทั้ง 9 โหมด เชื่อมต่อกับ css/styles.css และไฟล์ JS ทั้ง 5 โมดูล',
                mime: 'text/html;charset=utf-8;'
            },
            'styles.css': {
                path: 'css/styles.css',
                elId: 'mod-styles-css',
                title: '2. css/styles.css — สไตล์และการตกแต่งธีม 5 โทนสี (CSS3)',
                desc: 'ตัวแปรสี CSS Variables, ปุ่มสลับธีม 5 สไตล์, การ์ด, แอนิเมชัน และตั้งค่าสำหรับการพิมพ์รายงาน (@media print)',
                mime: 'text/css;charset=utf-8;'
            },
            'config-data.js': {
                path: 'js/config-data.js',
                elId: 'mod-config-data-js',
                title: '3. js/config-data.js — ข้อมูลเริ่มต้น 5 แปลง โทนสี และ LocalStorage',
                desc: 'เก็บค่าคงที่ THEMES, QUESTIONS, DEFAULT_PLOTS (5 ต้น), DEFAULT_LOGS, TREE_PRESETS และฟังก์ชัน loadData/saveData',
                mime: 'text/javascript;charset=utf-8;'
            },
            'gis-map.js': {
                path: 'js/gis-map.js',
                elId: 'mod-gis-map-js',
                title: '4. js/gis-map.js — ระบบแผนที่ดาวเทียมและพิกัด GPS (Leaflet GIS)',
                desc: 'จัดการแผนที่ดาวเทียม Esri World Imagery, แผนที่ถนน OSM, หมุดแปลงเกษตร และการคลิกเพิ่มแปลงบนแผนที่',
                mime: 'text/javascript;charset=utf-8;'
            },
            'farm-3d.js': {
                path: 'js/farm-3d.js',
                elId: 'mod-farm-3d-js',
                title: '5. js/farm-3d.js — ระบบจำลองสมาร์ทฟาร์ม 3 มิติ 5 โซน (Three.js WebGL)',
                desc: 'สร้างแปลงปลูก 3 มิติ 5 โซน, โมเดลต้นไม้ยางนา/สักทอง/พะยูง/กันเกรา/ประดู่ป่า, สปริงเกลอร์รดน้ำ 3D และ Time-lapse',
                mime: 'text/javascript;charset=utf-8;'
            },
            'tree-report.js': {
                path: 'js/tree-report.js',
                elId: 'mod-tree-report-js',
                title: '6. js/tree-report.js — ระบบจำลองต้นไม้ & รายงานกราฟทุก 30 นาที (รวม & แยกกราฟ)',
                desc: 'สร้างกราฟรวมทุกต้นใน 1 กราฟ และกราฟแยกเฉพาะแต่ละต้นทุกๆ 30 นาที พร้อมตารางสถิติและระบบจำลองต้นไม้เพิ่มอัตโนมัติ',
                mime: 'text/javascript;charset=utf-8;'
            },
            'ai-assistant.js': {
                path: 'js/ai-assistant.js',
                elId: 'mod-ai-assistant-js',
                title: '7. js/ai-assistant.js — ระบบผู้ช่วย AI สอบถามและวิเคราะห์เกษตรอัจฉริยะ',
                desc: 'ระบบแชทถาม-ตอบ AI วิเคราะห์กราฟทุก 30 นาที สุขภาพต้นไม้ พิกัดแผนที่ สั่งงานฟาร์ม และช่วยร่างบทสรุปวิจัย',
                mime: 'text/javascript;charset=utf-8;'
            },
            'app-core.js': {
                path: 'js/app-core.js',
                elId: 'mod-app-core-js',
                title: '7. js/app-core.js — ระบบควบคุมหลัก, ผัง IoT 2D, Kanban และกราฟสถิติวิจัย',
                desc: 'ควบคุมการสลับแท็บ, แผงควบคุม IoT 2D, กระดาน Kanban, ฟอร์มบันทึกผล, การคำนวณ X-bar/S.D. และกราฟ Chart.js 4 มิติ',
                mime: 'text/javascript;charset=utf-8;'
            }
        };

        let activeModularFileKey = 'index.html';

        function buildCleanIndexHtmlSource() {
            const clone = document.documentElement.cloneNode(true);
            const inlineStyle = clone.querySelector('#mod-styles-css');
            if (inlineStyle) {
                const linkEl = document.createElement('link');
                linkEl.setAttribute('rel', 'stylesheet');
                linkEl.setAttribute('href', 'css/styles.css');
                inlineStyle.parentNode.replaceChild(linkEl, inlineStyle);
            }
            const scriptIds = ['mod-config-data-js', 'mod-gis-map-js', 'mod-farm-3d-js', 'mod-tree-report-js', 'mod-ai-assistant-js', 'mod-app-core-js'];
            const scriptSrcs = ['js/config-data.js', 'js/gis-map.js', 'js/farm-3d.js', 'js/tree-report.js', 'js/ai-assistant.js', 'js/app-core.js'];
            scriptIds.forEach((id, idx) => {
                const sEl = clone.querySelector('#' + id);
                if (sEl) {
                    const extScript = document.createElement('script');
                    extScript.setAttribute('src', scriptSrcs[idx]);
                    sEl.parentNode.replaceChild(extScript, sEl);
                }
            });
            return '<!DOCTYPE html>\n<html lang="th">\n' + clone.innerHTML + '\n</html>';
        }

        function getModularFileContent(fileKey) {
            const meta = MODULAR_FILE_META[fileKey];
            if (!meta) return '';
            if (fileKey === 'index.html') {
                return buildCleanIndexHtmlSource();
            }
            const el = document.getElementById(meta.elId);
            if (el && el.textContent.trim()) {
                return el.textContent.trim() + '\n';
            }
            return '// โค้ดของส่วนนี้ทำงานอยู่ในไฟล์แยก ' + meta.path + ' เรียบร้อยแล้ว';
        }

        function toggleModularModal(show) {
            const modal = document.getElementById('modularModal');
            if (!modal) return;
            if (show) {
                modal.classList.remove('hidden');
                selectModularFilePreview(activeModularFileKey);
            } else {
                modal.classList.add('hidden');
            }
        }

        function selectModularFilePreview(fileKey) {
            if (!MODULAR_FILE_META[fileKey]) fileKey = 'index.html';
            activeModularFileKey = fileKey;
            const meta = MODULAR_FILE_META[fileKey];
            const content = getModularFileContent(fileKey);
            const lineCount = content.split('\n').length;

            document.querySelectorAll('.mod-file-tab').forEach(btn => {
                if (btn.getAttribute('data-mod-file') === fileKey) {
                    btn.className = 'mod-file-tab theme-btn-primary px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm';
                } else {
                    btn.className = 'mod-file-tab bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5';
                }
            });

            const titleEl = document.getElementById('modPreviewTitle');
            const descEl = document.getElementById('modPreviewDesc');
            const linesEl = document.getElementById('modPreviewLines');
            const codeEl = document.getElementById('modPreviewCode');

            if (titleEl) titleEl.textContent = meta.title;
            if (descEl) descEl.textContent = meta.desc;
            if (linesEl) linesEl.textContent = `${lineCount.toLocaleString()} บรรทัด (${meta.path})`;
            if (codeEl) codeEl.value = content;
        }

        function copyActiveModularFile() {
            const codeEl = document.getElementById('modPreviewCode');
            if (!codeEl) return;
            codeEl.select();
            try {
                document.execCommand('copy');
                showToast(`คัดลอกโค้ดไฟล์ ${activeModularFileKey} เรียบร้อยแล้ว!`);
            } catch (e) {
                showToast('ไม่สามารถคัดลอกโค้ดได้');
            }
        }

        function downloadSingleModularFile(fileKey) {
            const key = fileKey || activeModularFileKey;
            const meta = MODULAR_FILE_META[key];
            if (!meta) return;
            const content = getModularFileContent(key);
            const blob = new Blob([content], { type: meta.mime });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', key);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast(`ดาวน์โหลดไฟล์ ${key} เรียบร้อยแล้ว`);
        }

        window.onload = function() {
            loadData();
            setAppTheme(activeThemeKey, true);
            renderPlotSelectors();
            renderRatingQuestions();
            renderBlueprint();
            renderKanban();
            calculateYieldForecast();
            renderOverview();
            renderDashboard();
            renderPlotsTable();
            updatePlantPreview();
            init30MinTelemetryData(false);
            renderMapMarkers();
            render30MinReport();
            startRealTime30MinClock();
            if (typeof initAiAssistant === 'function') initAiAssistant();
            initOrResize3DFarm();
        };

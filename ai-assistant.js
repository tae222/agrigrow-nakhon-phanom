/* ==========================================================================
   โมดูลที่ 6: ระบบผู้ช่วย AI สนทนาโต้ตอบอัจฉริยะ (js/ai-assistant.js)
   ประกอบด้วย:
   - ระบบสนทนาโต้ตอบแบบ Multi-Turn Memory (จำบริบทการคุยต่อเนื่องได้)
   - เชื่อมต่อ Cloud LLM อัตโนมัติ (รองรับทั้งโหมดฟรีไม่ต้องใช้คีย์ และโหมดใช้ Gemini API Key)
   - ระบบวิเคราะห์เจตนาภาษาไทยเชิงลึก (Deep Thai Conversational NLU — วิเคราะห์รายต้น, โรคพืช, ปุ๋ย, ดิน, ราคา, สั่งงานฟาร์ม)
   - ระบบพูดคุยด้วยเสียงภาษาไทย (Voice Input 🎤 Speech-to-Text และ Voice Output 🔊 Text-to-Speech)
   ========================================================================== */

        let aiChatHistory = [];
        let floatingAiOpen = false;
        let isAiTyping = false;
        let aiVoiceSpeakEnabled = false;
        let aiLastMentionedPlotId = null;
        let speechRecognitionInstance = null;
        const STORAGE_KEY_GEMINI_API = 'dbt_crop_gemini_api_key_v1';

        function initAiAssistant() {
            const savedKey = localStorage.getItem(STORAGE_KEY_GEMINI_API) || '';
            const keyInput = document.getElementById('inputGeminiApiKey');
            if (keyInput && savedKey) {
                keyInput.value = savedKey;
            }
            updateAiModeBadge();

            if (aiChatHistory.length === 0) {
                aiChatHistory.push({
                    role: 'ai',
                    time: getCurrentTimeShort(),
                    plainText: 'สวัสดีครับ! ผมคือ AgriGrow AI ผู้ช่วยเกษตรอัจฉริยะจังหวัดนครพนม คุณสามารถพิมพ์คุยโต้ตอบกับผมได้ทุกเรื่อง ทั้งถามเจาะจงรายต้น ปรึกษาปัญหาใบเหลือง โรคพืช สูตรปุ๋ย สั่งเปิด-ปิดน้ำ สั่งเพิ่มหรือลบต้นไม้ หรือกดปุ่มไมโครโฟนเพื่อพูดคุยด้วยเสียงได้เลยครับ',
                    html: `สวัสดีครับ! 👋 ผมคือ <b>🤖 AgriGrow AI ผู้ช่วยเกษตรอัจฉริยะ จ.นครพนม</b><br>
                    ตอนนี้ระบบอัปเกรดเป็น <b>AI สนทนาโต้ตอบแบบเต็มรูปแบบ (Interactive Multi-Turn AI + Voice Chat)</b> แล้วครับ!<br><br>
                    <b>คุณสามารถพิมพ์คุยตามธรรมชาติ หรือกด 🎤 พูดด้วยเสียงได้เลย เช่น:</b>
                    <ul class="list-disc pl-5 mt-1 space-y-0.5 text-xs">
                        <li>🗣️ <b>ถาม-ตอบเจาะจงรายต้น:</b> <i>"ต้นที่ 2 เป็นยังไงบ้าง?"</i>, <i>"ทำไมยางนาถึงต้องใส่เชื้อไมคอร์ไรซา?"</i></li>
                        <li>🩺 <b>ปรึกษาอาการผิดปกติ:</b> <i>"ถ้าใบเหลืองขอบใบไหม้ต้องแก้ยังไง?"</i>, <i>"ควรใส่ปุ๋ยสูตรไหนดี?"</i></li>
                        <li>⚡ <b>สั่งงานฟาร์มด้วยประโยคพูด:</b> <i>"เพิ่มต้นพะยอมให้ 1 ต้น"</i>, <i>"ลบต้นที่ 5 ออก"</i>, <i>"เปิดน้ำแปลงที่ 1"</i>, <i>"เปลี่ยนธีมเป็นสีม่วง"</i></li>
                        <li>📊 <b>วิเคราะห์กราฟ & วิจัย:</b> <i>"สรุปกราฟทุก 30 นาทีตอนนี้"</i>, <i>"เขียนอภิปรายผลบทที่ 4 ให้หน่อย"</i></li>
                    </ul>`
                });
            }
            renderAiChatMessages();
            renderAiLiveDiagnostics();
        }

        function getCurrentTimeShort() {
            const now = new Date();
            return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ' น.';
        }

        function saveGeminiApiKey() {
            const keyInput = document.getElementById('inputGeminiApiKey');
            const val = (keyInput?.value || '').trim();
            try {
                if (val) {
                    localStorage.setItem(STORAGE_KEY_GEMINI_API, val);
                    showToast('🔑 บันทึก Gemini API Key เรียบร้อย! AI พร้อมสนทนาผ่าน Google Gemini 2.5 Flash');
                } else {
                    localStorage.removeItem(STORAGE_KEY_GEMINI_API);
                    showToast('สลับเป็นโหมด AI สนทนาอัตโนมัติ (Cloud Free LLM + Smart Farm NLU)');
                }
            } catch (e) {}
            updateAiModeBadge();
        }

        function updateAiModeBadge() {
            const savedKey = localStorage.getItem(STORAGE_KEY_GEMINI_API) || '';
            const badge = document.getElementById('aiEngineStatusBadge');
            if (badge) {
                if (savedKey) {
                    badge.textContent = '🟢 เชื่อมต่อ Google Gemini 2.5 Flash API + ข้อมูลฟาร์มจริง';
                    badge.className = 'bg-violet-100 text-violet-800 border border-violet-300 text-[11px] font-extrabold px-2.5 py-1 rounded-full';
                } else {
                    badge.textContent = '🟢 ระบบ AI โต้ตอบอัจฉริยะพร้อมใช้งานทันที (รองรับพิมพ์คุย & สั่งงานด้วยเสียง)';
                    badge.className = 'bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-extrabold px-2.5 py-1 rounded-full';
                }
            }
        }

        function toggleAiVoiceOutput() {
            aiVoiceSpeakEnabled = !aiVoiceSpeakEnabled;
            const btns = document.querySelectorAll('.btn-ai-tts-toggle');
            btns.forEach(btn => {
                btn.textContent = aiVoiceSpeakEnabled ? '🔊 เสียงพูด AI: เปิด' : '🔈 เสียงพูด AI: ปิด';
                btn.className = aiVoiceSpeakEnabled
                    ? 'btn-ai-tts-toggle bg-amber-500 text-slate-950 text-xs font-extrabold px-3 py-1.5 rounded-xl transition shadow'
                    : 'btn-ai-tts-toggle bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold px-3 py-1.5 rounded-xl transition';
            });
            if (!aiVoiceSpeakEnabled && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            showToast(aiVoiceSpeakEnabled ? '🔊 เปิดเสียงพูดโต้ตอบของ AI แล้ว (AI จะอ่านออกเสียงคำตอบภาษาไทย)' : '🔈 ปิดเสียงพูดของ AI แล้ว');
        }

        function speakAiText(text) {
            if (!aiVoiceSpeakEnabled || !('speechSynthesis' in window)) return;
            try {
                window.speechSynthesis.cancel();
                const clean = String(text).replace(/<[^>]+>/g, ' ').replace(/[🌱🌳🌲🍁🌿📊⏱️📍💧☀️✨🤖✅⚠️💡]/g, '').replace(/\s+/g, ' ').trim();
                const utter = new SpeechSynthesisUtterance(clean.slice(0, 320));
                utter.lang = 'th-TH';
                utter.rate = 1.05;
                window.speechSynthesis.speak(utter);
            } catch (e) {}
        }

        function startAiVoiceInput(targetInputId) {
            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRec) {
                showToast('เบราว์เซอร์นี้ไม่รองรับไมโครโฟนแปลงเสียงเป็นข้อความ กรุณาพิมพ์ข้อความในช่องแชทแทนครับ');
                return;
            }
            try {
                if (speechRecognitionInstance) {
                    speechRecognitionInstance.stop();
                }
                speechRecognitionInstance = new SpeechRec();
                speechRecognitionInstance.lang = 'th-TH';
                speechRecognitionInstance.interimResults = false;
                speechRecognitionInstance.maxAlternatives = 1;

                showToast('🎤 กำลังฟังเสียงภาษาไทย... พูดคำถามหรือคำสั่งได้เลยครับ');

                speechRecognitionInstance.onresult = function(event) {
                    const transcript = event.results[0][0].transcript;
                    const inp = document.getElementById(targetInputId || 'aiInputMain');
                    if (inp) inp.value = transcript;
                    askSmartFarmAI(targetInputId || 'aiInputMain', transcript);
                };
                speechRecognitionInstance.onerror = function() {
                    showToast('ไม่สามารถรับเสียงจากไมโครโฟนได้ กรุณาตรวจสอบสิทธิ์ไมโครโฟนหรือพิมพ์ถามแทนครับ');
                };
                speechRecognitionInstance.start();
            } catch (e) {
                showToast('ไม่สามารถเปิดไมโครโฟนได้ในขณะนี้');
            }
        }

        function toggleFloatingAiDrawer(forceState) {
            const drawer = document.getElementById('floatingAiDrawer');
            if (!drawer) return;
            floatingAiOpen = typeof forceState === 'boolean' ? forceState : !floatingAiOpen;
            if (floatingAiOpen) {
                drawer.classList.remove('hidden');
                renderAiChatMessages();
                setTimeout(() => {
                    const inp = document.getElementById('aiInputFloating');
                    if (inp) inp.focus();
                }, 80);
            } else {
                drawer.classList.add('hidden');
            }
        }

        function renderAiLiveDiagnostics() {
            const box = document.getElementById('aiLiveDiagnosticsBox');
            if (!box) return;

            const slotTime = typeof currentActive30MinSlot !== 'undefined' ? currentActive30MinSlot : '12:00';
            const metricKey = typeof current30MinMetric !== 'undefined' ? current30MinMetric : 'growthRate';
            const metricCfg = (typeof METRIC_30MIN_CONFIG !== 'undefined' && METRIC_30MIN_CONFIG[metricKey])
                ? METRIC_30MIN_CONFIG[metricKey]
                : { shortLabel: 'อัตราเติบโต', unit: 'µmol/m²/s', decimals: 2 };

            let lowMoistPlots = [];
            let plotSummaries = plots.map((p, idx) => {
                const pLogs = logs.filter(r => r.plotId === p.id).sort((a, b) => b.ageDays - a.ageDays);
                const latest = pLogs[0] || { ageDays: 25, heightCm: 35, leafCount: 14, moisture: 70, soilPh: 6.5, q1: 5, q2: 5, q3: 5, q4: 5 };
                if (latest.moisture < 68) lowMoistPlots.push(p.name);
                const val30m = (typeof telemetry30MinStore !== 'undefined' && telemetry30MinStore[p.id] && telemetry30MinStore[p.id][metricKey])
                    ? (telemetry30MinStore[p.id][metricKey][slotTime] ?? 20.5)
                    : 20.5;
                return { plot: p, latest, val30m: Number(val30m), idx };
            });

            const vals30m = plotSummaries.map(x => x.val30m);
            const st30m = calculateStats(vals30m);
            let bestItem = plotSummaries[0];
            plotSummaries.forEach(item => {
                if (item.val30m > (bestItem?.val30m || 0)) bestItem = item;
            });

            box.innerHTML = `
                <div class="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3.5 space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-extrabold text-emerald-900">⏱️ สถานะรอบ 30 นาที (${slotTime} น.)</span>
                        <span class="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">เรียลไทม์</span>
                    </div>
                    <p class="text-xs text-slate-700 leading-relaxed">
                        ค่าเฉลี่ย <b>${metricCfg.shortLabel}</b> ของต้นไม้ทั้ง <b>${plots.length} ต้น</b> อยู่ที่ <b>${st30m.mean.toFixed(metricCfg.decimals)} ± ${st30m.sd.toFixed(2)} ${metricCfg.unit}</b>
                        โดยต้นที่โดดเด่นที่สุดคือ <b>${bestItem ? bestItem.plot.name : '-'}</b> (${bestItem ? bestItem.val30m.toFixed(metricCfg.decimals) : '-'} ${metricCfg.unit})
                    </p>
                </div>

                <div class="bg-sky-50/90 border border-sky-200 rounded-2xl p-3.5 space-y-1.5">
                    <div class="text-xs font-extrabold text-sky-900">💧 คำแนะนำระบบน้ำและความชื้นดิน</div>
                    <p class="text-xs text-slate-700 leading-relaxed">
                        ${lowMoistPlots.length > 0
                            ? `⚠️ พบแปลงที่มีความชื้นดินต่ำกว่า 68% ได้แก่ <b>${lowMoistPlots.join(', ')}</b> แนะนำให้เปิดระบบน้ำหยด IoT เพิ่ม 15 นาที`
                            : `✅ ความชื้นดินของทุกแปลงอยู่ในเกณฑ์สมดุลดีมาก (68% – 78% RH) และค่า pH ดินเฉลี่ยอยู่ที่ 6.5 เหมาะสมต่อการดูดซึมธาตุอาหาร`}
                    </p>
                </div>

                <div class="space-y-1.5">
                    <div class="text-xs font-extrabold text-slate-700">🌱 คลิกที่ชื่อต้นไม้เพื่อถาม AI เจาะจงรายต้น:</div>
                    <div class="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        ${plotSummaries.map(item => `
                            <button type="button" onclick="askSmartFarmAI(null, 'วิเคราะห์ข้อมูลของ ${item.plot.name.replace(/'/g, '')} ให้ละเอียดหน่อย')" class="w-full text-left bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl p-2.5 flex items-center justify-between text-xs transition">
                                <div class="truncate pr-2">
                                    <div class="font-bold text-slate-800 truncate">${item.plot.icon || '🌳'} ${item.plot.name}</div>
                                    <div class="text-[11px] text-slate-500">สูง ${item.latest.heightCm} ซม. • ชื้น ${item.latest.moisture}% • pH ${item.latest.soilPh || 6.5}</div>
                                </div>
                                <span class="bg-white border border-slate-200 text-emerald-700 font-extrabold px-2 py-1 rounded-lg shrink-0 text-[11px]">
                                    ถาม AI ↗
                                </span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        function renderAiChatMessages() {
            const containers = [
                document.getElementById('aiChatMessagesMain'),
                document.getElementById('aiChatMessagesFloating')
            ];

            const htmlContent = aiChatHistory.map(msg => {
                if (msg.role === 'user') {
                    return `
                        <div class="flex justify-end">
                            <div class="max-w-[85%] bg-emerald-700 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm space-y-1">
                                <div class="text-xs sm:text-sm leading-relaxed">${msg.html}</div>
                                <div class="text-[10px] text-emerald-200 text-right">${msg.time}</div>
                            </div>
                        </div>
                    `;
                } else {
                    return `
                        <div class="flex items-start gap-2.5">
                            <div class="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center text-base shrink-0 mt-0.5 shadow-sm">
                                🤖
                            </div>
                            <div class="max-w-[88%] bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm space-y-1.5">
                                <div class="flex items-center justify-between gap-3 border-b border-slate-100 pb-1">
                                    <span class="text-[11px] font-extrabold text-emerald-800">AgriGrow AI ที่ปรึกษาเกษตรอัจฉริยะ</span>
                                    <span class="text-[10px] text-slate-400">${msg.time}</span>
                                </div>
                                <div class="text-xs sm:text-sm leading-relaxed space-y-1.5">${msg.html}</div>
                            </div>
                        </div>
                    `;
                }
            }).join('') + (isAiTyping ? `
                <div class="flex items-center gap-2 text-xs text-slate-500 pl-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>🤖 AI กำลังคิดและวิเคราะห์คำตอบให้คุณ...</span>
                </div>
            ` : '');

            containers.forEach(c => {
                if (c) {
                    c.innerHTML = htmlContent;
                    c.scrollTop = c.scrollHeight;
                }
            });
        }

        function escapeHtmlText(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }

        function formatMarkdownToHtml(mdText) {
            let safe = escapeHtmlText(mdText);
            safe = safe.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
            safe = safe.replace(/\*(.+?)\*/g, '<i>$1</i>');
            safe = safe.replace(/\n/g, '<br>');
            return safe;
        }

        // ค้นหาว่าผู้ใช้กำลังถามถึงต้นไม้/แปลงไหนเป็นพิเศษหรือไม่ (Entity & Context Resolution)
        function findTargetPlotFromQuestion(q) {
            for (let i = 0; i < plots.length; i++) {
                const p = plots[i];
                const numStr = String(p.id);
                if (q.includes(`แปลงที่ ${numStr}`) || q.includes(`แปลง ${numStr}`) || q.includes(`ต้นที่ ${numStr}`) || q.includes(`ต้น ${numStr}`) || q.includes(`#${numStr}`)) {
                    aiLastMentionedPlotId = p.id;
                    return p;
                }
                const keywords = ['ยางนา', 'สักทอง', 'สัก', 'พะยูง', 'กันเกรา', 'ประดู่', 'ตะเคียน', 'พะยอม', 'อินทนิล', 'จำปา', 'มะค่า', 'กฤษณา', 'ชิงชัน', 'มะม่วง', 'ขนุน', 'มะพร้าว', 'ส้มโอ', 'ทุเรียน'];
                for (const kw of keywords) {
                    if (q.includes(kw) && p.name.includes(kw)) {
                        aiLastMentionedPlotId = p.id;
                        return p;
                    }
                }
            }
            if ((q.includes('ต้นนี้') || q.includes('แปลงนี้') || q.includes('มัน')) && aiLastMentionedPlotId) {
                return plots.find(p => p.id === aiLastMentionedPlotId) || null;
            }
            return null;
        }

        // ระบบ NLU โต้ตอบภาษาไทยเชิงลึก (ตอบตรงคำถามทุกเรื่อง ไม่ซ้ำแพตเทิร์นเดิม)
        function buildLocalSmartFarmAiResponse(rawQuestion) {
            const q = rawQuestion.toLowerCase().trim();
            const slotTime = typeof currentActive30MinSlot !== 'undefined' ? currentActive30MinSlot : '12:00';
            const prevTime = typeof getPrevious30MinTimeStr === 'function' ? getPrevious30MinTimeStr(slotTime) : '11:30';
            const metricKey = typeof current30MinMetric !== 'undefined' ? current30MinMetric : 'growthRate';
            const metricCfg = (typeof METRIC_30MIN_CONFIG !== 'undefined' && METRIC_30MIN_CONFIG[metricKey])
                ? METRIC_30MIN_CONFIG[metricKey]
                : { label: 'อัตราการสังเคราะห์แสงและการเติบโตสะสม', shortLabel: 'อัตราเติบโต', unit: 'µmol/m²/s', decimals: 2 };

            const treeDetails = plots.map((p, idx) => {
                const pLogs = logs.filter(r => r.plotId === p.id).sort((a, b) => b.ageDays - a.ageDays);
                const latest = pLogs[0] || { ageDays: 28, heightCm: 40, leafCount: 16, moisture: 70, soilPh: 6.5, q1: 5, q2: 5, q3: 5, q4: 5, stage: 'ระยะเจริญเติบโตทางใบ' };
                const healthAvg = ((latest.q1 + latest.q2 + latest.q3 + latest.q4) / 4);
                const val30m = (typeof telemetry30MinStore !== 'undefined' && telemetry30MinStore[p.id] && telemetry30MinStore[p.id][metricKey])
                    ? Number(telemetry30MinStore[p.id][metricKey][slotTime] ?? 20.0)
                    : 20.0;
                return { plot: p, latest, healthAvg, val30m, idx };
            });

            const vals30m = treeDetails.map(x => x.val30m);
            const stats30m = calculateStats(vals30m);
            let best30m = treeDetails[0];
            let min30m = treeDetails[0];
            treeDetails.forEach(item => {
                if (item.val30m > best30m.val30m) best30m = item;
                if (item.val30m < min30m.val30m) min30m = item;
            });

            // 1. ทักทาย / พูดคุยทั่วไป (Greeting & Chitchat)
            if (/^(สวัสดี|หวัดดี|ดีครับ|ดีค่ะ|ทักทาย|hello|hi|hey)/.test(q)) {
                return `สวัสดีครับ! 😊 ยินดีที่ได้คุยกันครับ ตอนนี้ในสมาร์ทฟาร์ม จ.นครพนม ของเรามีต้นไม้ที่กำลังติดตามอยู่ทั้งหมด <b>${plots.length} ต้น</b> และรอบสรุปผลทุก 30 นาทีล่าสุดคือเวลา <b>${slotTime} น.</b><br><br>
                วันนี้คุณอยากให้ผมช่วยดูเรื่องไหนดีครับ? เช่น ถามอาการต้นไม้รายต้น, ปรึกษาเรื่องปุ๋ย/โรคพืช, สั่งเพิ่มหรือลบต้นไม้, หรือให้ช่วยเขียนสรุปผลวิจัยดีครับ?`;
            }

            if (q.includes('ชื่ออะไร') || q.includes('เป็นใคร') || q.includes('ทำอะไรได้')) {
                return `ผมชื่อ <b>🤖 AgriGrow AI</b> ครับ เป็นผู้ช่วยปัญญาประดิษฐ์ประจำระบบสมาร์ทฟาร์มจังหวัดนครพนม!<br>
                <b>ความสามารถที่ผมโต้ตอบและทำให้คุณได้จริง:</b>
                <ul class="list-disc pl-5 mt-1 space-y-0.5">
                    <li>ตอบคำถามเจาะลึกของต้นไม้แต่ละต้น (เช่น <i>"ต้นที่ 1 สูงเท่าไหร่?"</i>, <i>"ต้นประดู่โตดีไหม?"</i>)</li>
                    <li>วินิจฉัยโรคพืช อาการใบเหลือง รากเน่า แมลงศัตรูพืช และการใส่ปุ๋ย</li>
                    <li>ลงมือสั่งงานระบบแทนคุณได้จริง (เช่น พิมพ์ว่า <i>"เพิ่มต้นพะยอมให้หน่อย"</i>, <i>"ลบต้นที่ 5"</i>, <i>"เปิดน้ำทุกแปลง"</i>, <i>"เปลี่ยนเป็นสีทอง"</i>)</li>
                    <li>รองรับการคุยด้วยเสียง 🎤 และเปิดเสียงพูดตอบกลับ 🔊 ได้ด้วยครับ!</li>
                </ul>`;
            }

            if (q.includes('ขอบคุณ') || q.includes('เก่งมาก') || q.includes('เยี่ยม')) {
                return `ยินดีมากๆ เลยครับ! 🌱 หากมีคำถามเพิ่มเติมเกี่ยวกับการดูแลแปลงต้นไม้ กราฟทุก 30 นาที หรือต้องการสั่งงานระบบฟาร์ม พิมพ์หรือกดไมโครโฟนบอกผมได้ตลอดเวลาเลยนะครับ`;
            }

            // 2. คำสั่งลบต้นไม้/กราฟผ่านแชท AI
            if ((q.includes('ลบต้น') || q.includes('ลบแปลง') || q.includes('ลบกราฟ')) && typeof deleteTreeAndGraph === 'function') {
                const target = findTargetPlotFromQuestion(q) || plots[plots.length - 1];
                if (plots.length <= 1) {
                    return `⚠️ ตอนนี้เหลือต้นไม้เพียง 1 ต้นในระบบ จึงไม่สามารถลบเพิ่มได้ครับ`;
                }
                const delName = target.name;
                deleteTreeAndGraph(target.id);
                return `🗑️ <b>ดำเนินการลบ "${delName}" ออกจากกราฟและลบหมุดบนแผนที่ให้เรียบร้อยแล้วครับ!</b><br>
                ตอนนี้ในระบบเหลือต้นไม้ทั้งหมด <b>${plots.length} ต้น</b> (หากต้องการกู้คืน สามารถพิมพ์ว่า <i>"กู้คืนต้นไม้"</i> หรือกดปุ่ม ↩️ กู้คืน ได้เลยครับ)`;
            }

            if ((q.includes('กู้คืน') || q.includes('ยกเลิกการลบ') || q.includes('undo')) && typeof undoDeleteTree === 'function') {
                undoDeleteTree();
                return `↩️ <b>กู้คืนข้อมูลต้นไม้ กราฟทุก 30 นาที และหมุดบนแผนที่กลับมาให้เรียบร้อยแล้วครับ!</b> (ปัจจุบันมี ${plots.length} ต้น)`;
            }

            // 3. คำสั่งเพิ่ม/จำลองต้นไม้ใหม่ผ่านแชท AI (รองรับการตั้งชื่อตามที่พิมพ์สั่ง!)
            if ((q.includes('เพิ่มต้น') || q.includes('จำลองต้น') || q.includes('สร้างต้น') || q.includes('ปลูกต้น')) && typeof simulateAnotherTree30Min === 'function') {
                const nameMatch = rawQuestion.match(/(?:เพิ่มต้น|ปลูกต้น|สร้างต้น|จำลองต้น)\s*([^\s,]+)?/);
                const customInput = document.getElementById('inputSimTreeName');
                if (nameMatch && nameMatch[1] && !['ไม้', 'ไม้เพิ่ม', 'ใหม่', 'อีก', 'ให้หน่อย'].includes(nameMatch[1])) {
                    if (customInput) customInput.value = 'กล้าไม้' + nameMatch[1];
                }
                simulateAnotherTree30Min(false);
                const newest = plots[plots.length - 1];
                aiLastMentionedPlotId = newest.id;
                return `🌱 <b>จัดให้เลยครับ! ผมสร้างและปักหมุด "${newest.name}" เรียบร้อยแล้ว</b>
                <ul class="list-disc pl-5 mt-1 space-y-0.5">
                    <li>📍 <b>พิกัดหมุดบนแผนที่ดาวเทียม:</b> ${Number(newest.lat).toFixed(4)}, ${Number(newest.lng).toFixed(4)}</li>
                    <li>📈 <b>กราฟทุก 30 นาที:</b> เพิ่มเส้นกราฟลงในกราฟรวม และสร้างการ์ดกราฟแยกใบใหม่ให้ทันที</li>
                </ul>
                <div class="mt-2 flex flex-wrap gap-1.5">
                    <button type="button" onclick="switchTab('report30m')" class="bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-lg">📈 ดูกราฟที่เพิ่งเพิ่ม</button>
                    <button type="button" onclick="jumpToPlotOnMap(${newest.id})" class="bg-sky-600 text-white text-xs font-bold px-3 py-1 rounded-lg">🗺️ ซูมดูหมุดบนแผนที่</button>
                </div>`;
            }

            // 4. คำสั่งเปลี่ยนสีธีม หรือสลับหน้าจอ
            if (q.includes('เปลี่ยนธีม') || q.includes('เปลี่ยนสี')) {
                let themeKey = 'emerald';
                if (q.includes('ทอง') || q.includes('เหลือง') || q.includes('ส้ม')) themeKey = 'amber';
                else if (q.includes('ฟ้า') || q.includes('น้ำเงิน')) themeKey = 'ocean';
                else if (q.includes('ม่วง')) themeKey = 'violet';
                else if (q.includes('ชมพู') || q.includes('แดง')) themeKey = 'rose';
                setAppTheme(themeKey);
                return `🎨 เปลี่ยนโทนสีของระบบเป็น <b>"${THEMES[themeKey].name}"</b> ให้เรียบร้อยแล้วครับ!`;
            }

            if (q.includes('เปิดน้ำ') || q.includes('รดน้ำ')) {
                const target = findTargetPlotFromQuestion(q);
                if (target && typeof toggleIotDevice === 'function') {
                    if (!iotState[target.id]) iotState[target.id] = { water: false, fan: false, light: false, fert: false };
                    iotState[target.id].water = true;
                    renderBlueprint();
                    return `💦 สั่งเปิดวาล์วน้ำหยดของ <b>${target.name}</b> ให้เรียบร้อยแล้วครับ!`;
                }
                if (typeof triggerAllIrrigation === 'function') triggerAllIrrigation();
                return `💦 สั่งเปิดระบบน้ำหยดอัจฉริยะครบทุกแปลง (${plots.length} แปลง) เรียบร้อยแล้วครับ!`;
            }

            // 5. ปรึกษาปัญหาโรคพืช / อาการผิดปกติ (ใบเหลือง, ใบจุด, รากเน่า, แมลง, โตช้า)
            if (q.includes('ใบเหลือง') || q.includes('ใบไหม้') || q.includes('รากเน่า') || q.includes('โรค') || q.includes('แมลง') || q.includes('หนอน') || q.includes('เพลี้ย') || q.includes('เหี่ยว') || q.includes('โตช้า')) {
                return `🩺 <b>การวินิจฉัยอาการผิดปกติของต้นไม้และวิธีแก้ไขโดย AgriGrow AI:</b><br>
                <div class="space-y-2 mt-1.5 text-xs">
                    <div class="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                        <b>🍂 1. อาการใบเหลือง / ขอบใบไหม้:</b>
                        <ul class="list-disc pl-4 mt-0.5 space-y-0.5">
                            <li><b>ใบล่างเหลืองก่อน:</b> มักเกิดจากขาดธาตุไนโตรเจน (N) หรือความชื้นในดินต่ำกว่า 60% แนะนำให้เสริมปุ๋ยอินทรีย์น้ำหรือปุ๋ยสูตรเสมอ 15-15-15 ปริมาณน้อยๆ</li>
                            <li><b>ใบอ่อนเหลืองซีดแต่เส้นใบเขียว:</b> เกิดจากค่า pH ดินสูงเกิน 7.0 ทำให้รากดูดธาตุเหล็กไม่ได้ ควรปรับ pH ดินให้อยู่ในช่วง <b>6.0 – 6.6</b></li>
                        </ul>
                    </div>
                    <div class="bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                        <b>🦠 2. อาการโคนเน่า / รากเน่า / ใบเหี่ยวตอนกลางวัน:</b>
                        <ul class="list-disc pl-4 mt-0.5 space-y-0.5">
                            <li>เกิดจากดินระบายน้ำไม่ดี (ความชื้นสูงเกิน 80% ต่อเนื่อง) และเชื้อรา <i>Pythium</i> หรือ <i>Phytophthora</i></li>
                            <li><b>วิธีแก้:</b> งดให้น้ำชั่วคราว พรวนดินผิวหน้าถุงชำให้โปร่ง และใช้เชื้อราไตรโคเดอร์มา (Trichoderma) ผสมน้ำราดโคนต้น</li>
                        </ul>
                    </div>
                    <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                        <b>🐛 3. การป้องกันแมลงกัดกินใบอ่อน (หนอนกินใบ / เพลี้ยไฟ):</b>
                        แนะนำให้ฉีดพ่นสารสกัดสะเดาหรือน้ำหมักชีวภาพช่วงเย็น (16:30–17:30 น.) ซึ่งเป็นช่วงที่ปากใบเปิดและแสงแดดไม่ทำลายสารออกฤทธิ์ครับ
                    </div>
                </div>`;
            }

            // 6. คำถามเกี่ยวกับปุ๋ย / ดิน / ค่า pH / การให้น้ำ
            if (q.includes('ปุ๋ย') || q.includes('ดิน') || q.includes('ph') || q.includes('พีเอช') || q.includes('ความชื้น')) {
                const avgMoist = calculateStats(treeDetails.map(t => t.latest.moisture)).mean;
                return `🧪 <b>คำแนะนำการจัดการดิน ปุ๋ย และความชื้นสำหรับกล้าไม้ จ.นครพนม:</b><br>
                <ul class="list-disc pl-5 mt-1.5 space-y-1">
                    <li>💧 <b>สถานะความชื้นดินเฉลี่ยตอนนี้:</b> <b>${avgMoist.toFixed(1)}% RH</b> (เกณฑ์เหมาะสมที่สุดสำหรับกล้าไม้ป่าเศรษฐกิจคือ <b>68% – 75% RH</b>)</li>
                    <li>🌱 <b>สูตรดินเพาะชำแนะนำ:</b> ดินร่วนริมโขงร่อนละเอียด 2 ส่วน : แกลบดำเผา 1 ส่วน : ขุยมะพร้าวหมัก 1 ส่วน : ปุ๋ยคอกเก่าหมักสมบูรณ์ 1 ส่วน (ค่า pH จะอยู่ที่ประมาณ <b>6.4 – 6.6</b>)</li>
                    <li>⚡ <b>การให้ปุ๋ยตามระยะอายุ:</b>
                        <br>• <b>อายุ 15–45 วัน:</b> เน้นปุ๋ยอินทรีย์น้ำหรือสูตรบำรุงใบ/ราก (EC ประมาณ 1.2–1.5 mS/cm) ทุก 7–10 วัน
                        <br>• <b>อายุ 60–150 วัน:</b> เสริมธาตุโพแทสเซียมและแคลเซียมเพื่อให้ลำต้นสร้างเนื้อไม้แข็งแรงก่อนย้ายปลูก</li>
                </ul>`;
            }

            // 7. คำถามเกี่ยวกับราคา / รายได้ / ความคุ้มค่า / คาร์บอนเครดิต
            if (q.includes('ราคา') || q.includes('รายได้') || q.includes('กำไร') || q.includes('ขาย') || q.includes('คาร์บอน') || q.includes('คุ้ม')) {
                return `💰 <b>การวิเคราะห์มูลค่าทางเศรษฐกิจและคาร์บอนเครดิตของแปลงเพาะปลูก:</b><br>
                <ul class="list-disc pl-5 mt-1.5 space-y-1">
                    <li>🌳 <b>มูลค่ากล้าไม้เศรษฐกิจ (ยางนา, สักทอง, พะยูง, กันเกรา, ประดู่ป่า):</b> กล้าไม้คัดเกรด A+ ความสูง 40–60 ซม. มีราคาจำหน่ายเฉลี่ยต้นละ <b>25 – 80 บาท</b> (ไม้ขุดล้อมกันเกรา/พะยูงอายุ 3 ปีขึ้นไปมีมูลค่าหลักพันถึงหลักหมื่นบาทต่อต้น)</li>
                    <li>🌍 <b>ศักยภาพการกักเก็บคาร์บอน (Carbon Credit):</b> ไม้ยืนต้นเศรษฐกิจ 1 ต้น เมื่อโตเต็มวัยสามารถดูดซับก๊าซคาร์บอนไดออกไซด์ได้เฉลี่ย <b>9 – 15 กิโลกรัม CO₂ ต่อปี</b> (หรือประมาณ 1.5–2.5 ตันคาร์บอนต่อไร่ต่อปี)</li>
                </ul>
                <div class="mt-2">
                    <button type="button" onclick="switchTab('kanban')" class="bg-amber-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-lg">📋 เปิดเครื่องคำนวณรายได้ผลผลิตสุทธิ</button>
                </div>`;
            }

            // 8. หากผู้ใช้ถามเจาะจงถึงต้นไม้ต้นใดต้นหนึ่งโดยเฉพาะ (เช่น "ต้นที่ 2 เป็นยังไง", "วิเคราะห์ต้นประดู่ให้หน่อย")
            const targetPlot = findTargetPlotFromQuestion(q);
            if (targetPlot) {
                const detail = treeDetails.find(t => t.plot.id === targetPlot.id) || treeDetails[0];
                const rank = [...treeDetails].sort((a, b) => b.val30m - a.val30m).findIndex(t => t.plot.id === targetPlot.id) + 1;
                return `🔍 <b>รายงานวิเคราะห์เจาะจง: ${detail.plot.icon || '🌳'} ${detail.plot.name}</b><br>
                <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1.5 text-xs space-y-1">
                    <div>📍 <b>โซนและพิกัดหมุดแผนที่:</b> ${detail.plot.zone} (Lat ${Number(detail.plot.lat || 17.394).toFixed(4)}, Lng ${Number(detail.plot.lng || 104.769).toFixed(4)})</div>
                    <div>📏 <b>การเติบโตทางกายภาพล่าสุด:</b> อายุ <b>${detail.latest.ageDays} วัน</b> • ความสูง <b>${detail.latest.heightCm} ซม.</b> • จำนวนใบ <b>${detail.latest.leafCount} ใบ</b> (${detail.latest.stage})</div>
                    <div>💧 <b>สภาพดิน:</b> ความชื้น <b>${detail.latest.moisture}% RH</b> • ค่า pH <b>${detail.latest.soilPh || 6.5}</b> • คะแนนสุขภาพ <b>${detail.healthAvg.toFixed(2)} / 5.00</b></div>
                    <div>⏱️ <b>ค่าในกราฟทุก 30 นาที (รอบเวลา ${slotTime} น.):</b> วัดค่า ${metricCfg.shortLabel} ได้ <b>${detail.val30m.toFixed(metricCfg.decimals)} ${metricCfg.unit}</b> (อยู่อันดับที่ <b>${rank}</b> จากทั้งหมด ${plots.length} ต้น)</div>
                </div>
                <div class="mt-2 flex flex-wrap gap-1.5">
                    <button type="button" onclick="jumpToPlotOnMap(${detail.plot.id})" class="bg-sky-600 text-white text-xs font-bold px-3 py-1 rounded-lg">🗺️ ซูมดูหมุดต้นนี้บนแผนที่</button>
                    <button type="button" onclick="jumpToPlotRecord(${detail.plot.id})" class="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-lg">📝 บันทึกข้อมูลต้นนี้เพิ่ม</button>
                </div>`;
            }

            // 9. คำถามเกี่ยวกับกราฟทุก 30 นาที / เปรียบเทียบต้นไหนดีสุด
            if (q.includes('30') || q.includes('กราฟ') || q.includes('เวลา') || q.includes('สรุป') || q.includes('ดีสุด') || q.includes('สูงสุด') || q.includes('เปรียบเทียบ')) {
                return `⏱️ <b>สรุปผลเปรียบเทียบจากกราฟทุก 30 นาที (รอบเวลา ${slotTime} น. | คาบเวลา ${prevTime} – ${slotTime} น.):</b><br>
                จากการเปรียบเทียบต้นไม้ทั้ง <b>${plots.length} ต้น</b> ในพารามิเตอร์ <b>${metricCfg.label}</b>:
                <ul class="list-disc pl-5 mt-1.5 space-y-1">
                    <li>🏆 <b>อันดับ 1 (สูงสุด):</b> <b>${best30m.plot.name}</b> วัดได้ <b>${best30m.val30m.toFixed(metricCfg.decimals)} ${metricCfg.unit}</b></li>
                    <li>📐 <b>ค่าเฉลี่ยรวมทุกต้น (X̄ ± S.D.):</b> <b>${stats30m.mean.toFixed(metricCfg.decimals)} ± ${stats30m.sd.toFixed(2)} ${metricCfg.unit}</b></li>
                    <li>🌱 <b>ต้นที่ควรดูแลเสริม:</b> <b>${min30m.plot.name}</b> (${min30m.val30m.toFixed(metricCfg.decimals)} ${metricCfg.unit}) แนะนำให้ตรวจความชื้นดินและแสงแดดในช่วงบ่ายครับ</li>
                </ul>
                <div class="mt-2 flex flex-wrap gap-1.5">
                    <button type="button" onclick="switchTab('report30m')" class="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-lg">📊 เปิดดูกราฟรวม & กราฟแยก</button>
                    <button type="button" onclick="stepNext30MinSummary(1)" class="bg-amber-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-lg">⏭ เลื่อนแจ้งสรุป +30 นาทีถัดไป</button>
                </div>`;
            }

            // 10. คำถามเกี่ยวกับการร่างสรุปวิจัย บทที่ 4 / บทที่ 5 / สถิติ
            if (q.includes('บทที่ 4') || q.includes('บทที่ 5') || q.includes('วิจัย') || q.includes('สถิติ') || q.includes('อภิปราย') || q.includes('โปรเจค')) {
                const q1Stats = calculateStats(logs.map(r => r.q1));
                const q2Stats = calculateStats(logs.map(r => r.q2));
                const q3Stats = calculateStats(logs.map(r => r.q3));
                const q4Stats = calculateStats(logs.map(r => r.q4));
                const totalMean = ((q1Stats.mean + q2Stats.mean + q3Stats.mean + q4Stats.mean) / 4);
                const totalSd = ((q1Stats.sd + q2Stats.sd + q3Stats.sd + q4Stats.sd) / 4);
                return `📑 <b>ร่างบทสรุปผลการวิจัยและอภิปรายผล (สำหรับเล่มโปรเจกต์ บทที่ 4 และบทที่ 5):</b><br>
                <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mt-1.5 text-xs leading-relaxed space-y-1.5">
                    <p><b>สรุปผลการทดลอง (บทที่ 4):</b> จากการประเมินและติดตามการเจริญเติบโตของพืชผลและพันธุ์ไม้ในระบบสมาร์ทฟาร์มจังหวัดนครพนม จำนวน <b>${plots.length} แปลงเพาะปลูก</b> (รวมบันทึกภาคสนาม ${logs.length} ครั้ง และข้อมูลเซนเซอร์ทุก 30 นาที) พบว่าคุณภาพการเจริญเติบโตโดยรวมอยู่ในระดับ <b>ดีเยี่ยม</b> มีค่าเฉลี่ยรวม (X̄) เท่ากับ <b>${totalMean.toFixed(2)}</b> คะแนน (จากคะแนนเต็ม 5.00) และส่วนเบี่ยงเบนมาตรฐาน (S.D.) เท่ากับ <b>${totalSd.toFixed(2)}</b> คิดเป็นร้อยละ <b>${(totalMean * 20).toFixed(2)}%</b></p>
                    <p><b>อภิปรายผล (บทที่ 5):</b> การนำระบบ GIS Smart Farm ร่วมกับการรายงานกราฟอนุกรมเวลาทุก 30 นาที ทั้งแบบกราฟรวมและกราฟแยกรายต้น ช่วยให้ผู้ดูแลแปลงเกษตรสามารถติดตามอัตราการสังเคราะห์แสง ความชื้นดิน และพิกัดแปลงเพาะปลูกได้อย่างแม่นยำ</p>
                </div>`;
            }

            // 11. คำตอบสนทนาอัจฉริยะสำหรับคำถามเปิดอื่นๆ (อ้างอิงคำถามของผู้ใช้โดยตรง + สรุปสถานะที่เกี่ยวข้อง)
            return `💬 <b>เกี่ยวกับเรื่อง "${escapeHtmlText(rawQuestion)}" ที่คุณสอบถาม:</b><br>
            จากข้อมูลในระบบสมาร์ทฟาร์ม จ.นครพนม ขณะนี้ (มีต้นไม้ทั้งหมด <b>${plots.length} ต้น</b>, รอบสรุปผลทุก 30 นาทีเวลา <b>${slotTime} น.</b>):
            <ul class="list-disc pl-5 mt-1.5 space-y-1 text-xs">
                <li>🏆 <b>ต้นที่เติบโตโดดเด่นที่สุดตอนนี้:</b> <b>${best30m.plot.name}</b> (สูง ${best30m.latest.heightCm} ซม., ${metricCfg.shortLabel} = ${best30m.val30m.toFixed(metricCfg.decimals)} ${metricCfg.unit})</li>
                <li>💧 <b>ภาพรวมสภาพแวดล้อม:</b> ความชื้นดินเฉลี่ยอยู่ที่ <b>${calculateStats(treeDetails.map(t => t.latest.moisture)).mean.toFixed(1)}% RH</b> และค่า pH ดินเฉลี่ย <b>6.5</b> อยู่ในเกณฑ์สมดุลดีเยี่ยม</li>
                <li>💡 <b>คำแนะนำเพิ่มเติม:</b> คุณสามารถพิมพ์ถามเจาะจงชื่อต้นไม้ (เช่น <i>"ต้นที่ 1"</i>, <i>"ต้นประดู่"</i>), ถามอาการพืช (เช่น <i>"ใบเหลืองแก้ยังไง"</i>, <i>"ใส่ปุ๋ยสูตรไหน"</i>) หรือพิมพ์สั่งงาน เช่น <i>"เพิ่มต้นพะยอม"</i>, <i>"เปิดน้ำทุกแปลง"</i> ได้เลยครับ!</li>
            </ul>`;
        }

        async function askSmartFarmAI(sourceInputId, presetQuestionText) {
            const inputEl = sourceInputId ? document.getElementById(sourceInputId) : null;
            const question = (presetQuestionText || (inputEl ? inputEl.value : '') || '').trim();
            if (!question) {
                showToast('กรุณาพิมพ์ข้อความหรือกดปุ่มไมโครโฟนเพื่อคุยกับ AI ครับ');
                return;
            }
            if (inputEl && !presetQuestionText) {
                inputEl.value = '';
            }

            aiChatHistory.push({
                role: 'user',
                time: getCurrentTimeShort(),
                plainText: question,
                html: escapeHtmlText(question)
            });

            // ตรวจสอบก่อนว่าเป็นคำสั่งปฏิบัติการโดยตรงหรือไม่ (เช่น สั่งเพิ่มต้นไม้ ลบต้นไม้ เปิดน้ำ เปลี่ยนธีม) เพื่อให้ทำงานทันที
            const qLower = question.toLowerCase();
            const isDirectActionCommand =
                qLower.includes('เพิ่มต้น') || qLower.includes('จำลองต้น') || qLower.includes('สร้างต้น') ||
                qLower.includes('ลบต้น') || qLower.includes('ลบกราฟ') || qLower.includes('กู้คืน') ||
                qLower.includes('เปิดน้ำ') || qLower.includes('รดน้ำ') || qLower.includes('เปลี่ยนธีม') || qLower.includes('เปลี่ยนสี');

            if (isDirectActionCommand) {
                const actionReplyHtml = buildLocalSmartFarmAiResponse(question);
                aiChatHistory.push({
                    role: 'ai',
                    time: getCurrentTimeShort(),
                    plainText: actionReplyHtml.replace(/<[^>]+>/g, ' '),
                    html: actionReplyHtml
                });
                renderAiChatMessages();
                renderAiLiveDiagnostics();
                speakAiText(actionReplyHtml);
                return;
            }

            isAiTyping = true;
            renderAiChatMessages();

            // สร้าง System Context จากข้อมูลฟาร์มจริงในปัจจุบัน
            const slotTime = typeof currentActive30MinSlot !== 'undefined' ? currentActive30MinSlot : '12:00';
            const metricKey = typeof current30MinMetric !== 'undefined' ? current30MinMetric : 'growthRate';
            const farmContext = plots.map(p => {
                const pLogs = logs.filter(r => r.plotId === p.id).sort((a, b) => b.ageDays - a.ageDays);
                const latest = pLogs[0] || {};
                const val30 = (typeof telemetry30MinStore !== 'undefined' && telemetry30MinStore[p.id] && telemetry30MinStore[p.id][metricKey])
                    ? telemetry30MinStore[p.id][metricKey][slotTime]
                    : '-';
                return `${p.name} (พิกัด ${p.lat},${p.lng}): อายุ ${latest.ageDays || 28} วัน, สูง ${latest.heightCm || 40} ซม., ใบ ${latest.leafCount || 16} ใบ, ความชื้นดิน ${latest.moisture || 70}%, pH ${latest.soilPh || 6.5}, ค่ารอบ 30 นาที (${slotTime} น.) = ${val30}`;
            }).join(' | ');

            const systemPrompt = `คุณคือ AgriGrow AI ผู้ช่วยนักวิชาการเกษตรและสมาร์ทฟาร์มอัจฉริยะ จังหวัดนครพนม ตอบโต้เป็นภาษาไทยอย่างเป็นธรรมชาติ เป็นกันเอง กระชับ ชัดเจน และตรงคำถาม ข้อมูลจริงในฟาร์มขณะนี้ (${plots.length} แปลง, รอบเวลาสรุปทุก 30 นาทีล่าสุดคือ ${slotTime} น.): ${farmContext}`;

            // ลำดับที่ 1: หากผู้ใช้ตั้งค่า Gemini API Key ไว้ ให้เรียก Gemini 2.5 Flash พร้อมประวัติแชท
            const savedApiKey = localStorage.getItem(STORAGE_KEY_GEMINI_API) || '';
            if (savedApiKey) {
                try {
                    const recentTurns = aiChatHistory.slice(-6).map(m => ({
                        role: m.role === 'user' ? 'user' : 'model',
                        parts: [{ text: m.plainText || m.html.replace(/<[^>]+>/g, ' ') }]
                    }));
                    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(savedApiKey)}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            systemInstruction: { parts: [{ text: systemPrompt }] },
                            contents: recentTurns
                        })
                    });
                    const data = await resp.json();
                    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (candidateText) {
                        isAiTyping = false;
                        const formatted = formatMarkdownToHtml(candidateText);
                        aiChatHistory.push({
                            role: 'ai',
                            time: getCurrentTimeShort(),
                            plainText: candidateText,
                            html: formatted
                        });
                        renderAiChatMessages();
                        renderAiLiveDiagnostics();
                        speakAiText(candidateText);
                        return;
                    }
                } catch (err) {}
            }

            // ลำดับที่ 2: เรียก Cloud LLM ฟรีอัตโนมัติ (ไม่ต้องใช้ API Key) พร้อม Timeout 4.5 วินาที
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 4500);
                const chatMessages = [
                    { role: 'system', content: systemPrompt },
                    ...aiChatHistory.slice(-5).map(m => ({
                        role: m.role === 'user' ? 'user' : 'assistant',
                        content: (m.plainText || m.html.replace(/<[^>]+>/g, ' ')).slice(0, 500)
                    }))
                ];
                const resp = await fetch('https://text.pollinations.ai/openai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'openai',
                        messages: chatMessages
                    }),
                    signal: controller.signal
                });
                clearTimeout(timer);
                if (resp.ok) {
                    const data = await resp.json();
                    const replyText = data?.choices?.[0]?.message?.content;
                    if (replyText && replyText.trim().length > 5) {
                        isAiTyping = false;
                        const formatted = formatMarkdownToHtml(replyText.trim());
                        aiChatHistory.push({
                            role: 'ai',
                            time: getCurrentTimeShort(),
                            plainText: replyText.trim(),
                            html: formatted
                        });
                        renderAiChatMessages();
                        renderAiLiveDiagnostics();
                        speakAiText(replyText);
                        return;
                    }
                }
            } catch (e) {
                // หากเครือข่ายถูกจำกัดหรือออฟไลน์ จะสลับมาใช้ระบบ Smart Farm NLU ในตัวทันที
            }

            // ลำดับที่ 3: ระบบ Smart Farm Conversational NLU ในเครื่อง (ทำงานได้ 100% ทุกสภาพแวดล้อม)
            setTimeout(() => {
                const replyHtml = buildLocalSmartFarmAiResponse(question);
                isAiTyping = false;
                aiChatHistory.push({
                    role: 'ai',
                    time: getCurrentTimeShort(),
                    plainText: replyHtml.replace(/<[^>]+>/g, ' '),
                    html: replyHtml
                });
                renderAiChatMessages();
                renderAiLiveDiagnostics();
                speakAiText(replyHtml);
            }, 220);
        }

        function clearAiChatHistory() {
            aiChatHistory = [];
            initAiAssistant();
            showToast('🧹 ล้างประวัติการสนทนากับ AI เรียบร้อยแล้ว');
        }

        function copyLatestAiReply() {
            const lastAi = [...aiChatHistory].reverse().find(m => m.role === 'ai');
            if (!lastAi) return;
            const tmp = document.createElement('div');
            tmp.innerHTML = lastAi.html;
            const plain = tmp.innerText || tmp.textContent || '';
            const textarea = document.createElement('textarea');
            textarea.value = plain;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast('📋 คัดลอกคำตอบล่าสุดของ AI เรียบร้อยแล้ว!');
            } catch (e) {
                showToast('ไม่สามารถคัดลอกได้');
            }
            document.body.removeChild(textarea);
        }

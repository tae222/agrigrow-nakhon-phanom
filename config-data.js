/* ==========================================================================
   โมดูลที่ 1: ข้อมูลเริ่มต้น โทนสี และการจัดการฐานข้อมูล (js/config-data.js)
   ========================================================================== */

// =====================================================================
        // 1. ระบบเปลี่ยนโทนสี 5 สไตล์
        // =====================================================================
        const STORAGE_KEY_PLOTS = 'dbt_crop_plots_trees_v6';
        const STORAGE_KEY_LOGS = 'dbt_crop_logs_trees_v6';
        const STORAGE_KEY_THEME = 'dbt_crop_theme_np_v3';

        const THEMES = {
            emerald: {
                name: 'เขียวเกษตรอัจฉริยะ (Emerald)',
                primary: '#059669',
                primaryDark: '#047857',
                secondary: '#10b981',
                light: '#ecfdf5',
                border: '#a7f3d0',
                headerFrom: '#064e3b',
                headerTo: '#0f172a',
                bg: '#f1f5f9',
                shadow: 'rgba(5, 150, 105, 0.28)',
                chartColors: ['#059669', '#10b981', '#0d9488', '#f59e0b'],
                radarFill: 'rgba(5, 150, 105, 0.22)'
            },
            amber: {
                name: 'ทองรวงข้าว (Golden Harvest)',
                primary: '#d97706',
                primaryDark: '#b45309',
                secondary: '#ea580c',
                light: '#fffbeb',
                border: '#fde68a',
                headerFrom: '#78350f',
                headerTo: '#1c1917',
                bg: '#fafaf9',
                shadow: 'rgba(217, 119, 6, 0.28)',
                chartColors: ['#d97706', '#ea580c', '#16a34a', '#0284c7'],
                radarFill: 'rgba(217, 119, 6, 0.22)'
            },
            ocean: {
                name: 'ฟ้าระบบน้ำ (Hydro Blue)',
                primary: '#0284c7',
                primaryDark: '#0369a1',
                secondary: '#0891b2',
                light: '#f0f9ff',
                border: '#bae6fd',
                headerFrom: '#0c4a6e',
                headerTo: '#0f172a',
                bg: '#f1f5f9',
                shadow: 'rgba(2, 132, 199, 0.28)',
                chartColors: ['#0284c7', '#0891b2', '#10b981', '#6366f1'],
                radarFill: 'rgba(2, 132, 199, 0.22)'
            },
            violet: {
                name: 'ม่วงโรงเรือน (Indoor LED)',
                primary: '#7c3aed',
                primaryDark: '#6d28d9',
                secondary: '#9333ea',
                light: '#f5f3ff',
                border: '#ddd6fe',
                headerFrom: '#3b0764',
                headerTo: '#0f172a',
                bg: '#f8fafc',
                shadow: 'rgba(124, 58, 237, 0.28)',
                chartColors: ['#7c3aed', '#9333ea', '#ec4899', '#10b981'],
                radarFill: 'rgba(124, 58, 237, 0.22)'
            },
            rose: {
                name: 'ชมพูสตรอว์เบอร์รี (Berry Rose)',
                primary: '#e11d48',
                primaryDark: '#be123c',
                secondary: '#db2777',
                light: '#fff1f2',
                border: '#fecdd3',
                headerFrom: '#881337',
                headerTo: '#0f172a',
                bg: '#f8fafc',
                shadow: 'rgba(225, 29, 72, 0.28)',
                chartColors: ['#e11d48', '#db2777', '#16a34a', '#f59e0b'],
                radarFill: 'rgba(225, 29, 72, 0.22)'
            }
        };

        let activeThemeKey = 'emerald';
        let uploadedPhotoDataUrl = '';

        function setAppTheme(themeKey, silent) {
            if (!THEMES[themeKey]) themeKey = 'emerald';
            activeThemeKey = themeKey;
            const t = THEMES[themeKey];
            const root = document.documentElement;
            root.style.setProperty('--theme-primary', t.primary);
            root.style.setProperty('--theme-primary-dark', t.primaryDark);
            root.style.setProperty('--theme-secondary', t.secondary);
            root.style.setProperty('--theme-light', t.light);
            root.style.setProperty('--theme-border', t.border);
            root.style.setProperty('--theme-header-from', t.headerFrom);
            root.style.setProperty('--theme-header-to', t.headerTo);
            root.style.setProperty('--theme-bg', t.bg);
            root.style.setProperty('--theme-shadow', t.shadow);

            const btnMap = {
                emerald: 'themeBtnEmerald',
                amber: 'themeBtnAmber',
                ocean: 'themeBtnOcean',
                violet: 'themeBtnViolet',
                rose: 'themeBtnRose'
            };
            Object.keys(btnMap).forEach(k => {
                const el = document.getElementById(btnMap[k]);
                if (el) {
                    if (k === themeKey) el.classList.add('active');
                    else el.classList.remove('active');
                }
            });

            try {
                localStorage.setItem(STORAGE_KEY_THEME, themeKey);
            } catch (e) {}

            if (!silent) {
                renderOverview();
                renderDashboard();
                renderMapMarkers();
                if (typeof render30MinReport === 'function') render30MinReport();
                showToast(`เปลี่ยนโทนสีเป็น "${t.name}" เรียบร้อยแล้ว`);
            }
        }

        // =====================================================================
        // 2. ข้อมูลเริ่มต้นและเกณฑ์การประเมินสุขภาพพืช 4 ด้าน + พิกัด GPS
        // =====================================================================
        const QUESTIONS = [
            { key: 'q1', title: '1. ด้านความแข็งแรงสมบูรณ์ของลำต้นและระบบราก', icon: '🌿' },
            { key: 'q2', title: '2. ด้านความเขียวสด ขนาดใบ และการปลอดโรค/แมลงศัตรูพืช', icon: '🍃' },
            { key: 'q3', title: '3. ด้านอัตราการเจริญเติบโตเทียบตามเกณฑ์อายุของพืชผล', icon: '📈' },
            { key: 'q4', title: '4. ด้านความเหมาะสมของความชื้นดิน แสงแดด และธาตุอาหาร', icon: '💧' }
        ];

        const SCORE_LABELS = [
            { score: 5, text: '5 (ดีเยี่ยม)', emoji: '🌟' },
            { score: 4, text: '4 (ดี)', emoji: '😊' },
            { score: 3, text: '3 (ปานกลาง)', emoji: '😐' },
            { score: 2, text: '2 (พอใช้)', emoji: '😟' },
            { score: 1, text: '1 (ควรปรับปรุง)', emoji: '⚠️' }
        ];

        /*__EMBEDDED_DATA_START__*/
        const DEFAULT_PLOTS = [
            { id: 1, name: 'แปลงที่ 1: กล้าไม้ยางนา (Dipterocarpus alatus)', zone: 'โซนเพาะชำไม้เศรษฐกิจ A1 อ.เมืองนครพนม', harvestDays: 150, icon: '🌳', lat: 17.3948, lng: 104.7682 },
            { id: 2, name: 'แปลงที่ 2: กล้าไม้สักทอง (Tectona grandis)', zone: 'โรงเรือนเพาะชำอัจฉริยะ B2 ต.นาราชควาย จ.นครพนม', harvestDays: 120, icon: '🌲', lat: 17.3961, lng: 104.7704 },
            { id: 3, name: 'แปลงที่ 3: กล้าไม้พะยูง (Dalbergia cochinchinensis)', zone: 'แปลงเพาะชำไม้ป่าอนุรักษ์ C1 อ.เมือง จ.นครพนม', harvestDays: 150, icon: '🌳', lat: 17.3922, lng: 104.7668 },
            { id: 4, name: 'แปลงที่ 4: กล้าไม้กันเกรา (Fagraea fragrans - ไม้ประจำ จ.นครพนม)', zone: 'โซนอนุรักษ์พันธุ์ไม้ประจำจังหวัด D1 จ.นครพนม', harvestDays: 180, icon: '🌿', lat: 17.3935, lng: 104.7718 },
            { id: 5, name: 'แปลงที่ 5: กล้าไม้ประดู่ป่า (Pterocarpus macrocarpus - ต้นจำลองเปรียบเทียบกราฟ 30 นาที)', zone: 'โซนจำลองเปรียบเทียบการเติบโตราย 30 นาที E1 จ.นครพนม', harvestDays: 160, icon: '🍁', lat: 17.3954, lng: 104.7695, shortName: 'ต้นประดู่ป่า' }
        ];

        const DEFAULT_LOGS = [
            { id: 201, plotId: 1, stage: 'ระยะต้นกล้า (1-15 วัน)', ageDays: 7, heightCm: 8.5, leafCount: 4, moisture: 70, soilPh: 6.4, q1: 5, q2: 5, q3: 4, q4: 5, note: 'ต้นกล้าตั้งตัวได้ดี ระบบรากเดินไว ความชื้นเหมาะสม', createdAt: '2026-10-05' },
            { id: 202, plotId: 1, stage: 'ระยะต้นกล้า (1-15 วัน)', ageDays: 14, heightCm: 18.2, leafCount: 7, moisture: 68, soilPh: 6.5, q1: 5, q2: 4, q3: 5, q4: 5, note: 'เริ่มทำค้างเชือกให้ยอดเมล่อนเลื้อย ใบเขียวเข้มสมบูรณ์', createdAt: '2026-10-12' },
            { id: 203, plotId: 1, stage: 'ระยะเจริญเติบโตทางใบ (16-35 วัน)', ageDays: 21, heightCm: 36.0, leafCount: 12, moisture: 66, soilPh: 6.5, q1: 5, q2: 5, q3: 5, q4: 4, note: 'ตัดแต่งแขนงข้อที่ 1-8 ออกเพื่อให้ต้นส่งอาหารเลี้ยงยอดหลัก', createdAt: '2026-10-19' },
            { id: 204, plotId: 1, stage: 'ระยะเจริญเติบโตทางใบ (16-35 วัน)', ageDays: 28, heightCm: 58.5, leafCount: 18, moisture: 69, soilPh: 6.6, q1: 5, q2: 5, q3: 5, q4: 5, note: 'เริ่มออกดอกตัวเมีย เตรียมผสมเกสรในสัปดาห์ถัดไป', createdAt: '2026-10-26' },
            { id: 205, plotId: 2, stage: 'ระยะต้นกล้า (1-15 วัน)', ageDays: 10, heightCm: 6.5, leafCount: 5, moisture: 75, soilPh: 6.2, q1: 4, q2: 5, q3: 4, q4: 5, note: 'ย้ายต้นกล้าลงรางปลูกไฮโดรโปนิกส์ ค่า EC น้ำปุ๋ยอยู่ที่ 1.4', createdAt: '2026-10-10' },
            { id: 206, plotId: 2, stage: 'ระยะเจริญเติบโตทางใบ (16-35 วัน)', ageDays: 20, heightCm: 14.0, leafCount: 11, moisture: 74, soilPh: 6.3, q1: 5, q2: 5, q3: 5, q4: 5, note: 'พุ่มใบขยายใหญ่ สีเขียวสดกรอบ ไม่พบโรคใบจุด', createdAt: '2026-10-20' },
            { id: 207, plotId: 2, stage: 'ระยะเจริญเติบโตทางใบ (16-35 วัน)', ageDays: 30, heightCm: 21.5, leafCount: 18, moisture: 72, soilPh: 6.4, q1: 5, q2: 5, q3: 5, q4: 5, note: 'ขนาดทรงพุ่มได้มาตรฐาน เตรียมเก็บเกี่ยวส่งตลาดสัปดาห์หน้า', createdAt: '2026-10-29' },
            { id: 208, plotId: 3, stage: 'ระยะเจริญเติบโตทางใบ (16-35 วัน)', ageDays: 25, heightCm: 32.0, leafCount: 9, moisture: 80, soilPh: 6.5, q1: 5, q2: 4, q3: 4, q4: 5, note: 'ข้าวแตกกอดีมาก น้ำในแปลงรักษาระดับ 5 ซม.', createdAt: '2026-10-18' },
            { id: 209, plotId: 3, stage: 'ระยะออกดอก/ติดผล (36-55 วัน)', ageDays: 45, heightCm: 64.0, leafCount: 15, moisture: 78, soilPh: 6.5, q1: 5, q2: 5, q3: 5, q4: 4, note: 'ต้นข้าวเริ่มตั้งท้อง ใส่ปุ๋ยอินทรีย์บำรุงระยะตั้งท้องเรียบร้อย', createdAt: '2026-10-28' },
            { id: 210, plotId: 4, stage: 'ระยะออกดอก/ติดผล (36-55 วัน)', ageDays: 40, heightCm: 72.0, leafCount: 24, moisture: 64, soilPh: 6.6, q1: 4, q2: 4, q3: 5, q4: 4, note: 'ติดช่อผลดกมาก เสริมไม้ค้ำยันกิ่งป้องกันกิ่งหัก', createdAt: '2026-10-29' },
            { id: 211, plotId: 5, stage: 'ระยะต้นกล้า (1-15 วัน)', ageDays: 12, heightCm: 14.5, leafCount: 6, moisture: 71, soilPh: 6.5, q1: 5, q2: 5, q3: 5, q4: 5, note: 'ต้นประดู่ป่าจำลองใหม่ตั้งตัวแข็งแรง รากเดินดีมาก', createdAt: '2026-10-14' },
            { id: 212, plotId: 5, stage: 'ระยะเจริญเติบโตทางใบ (16-35 วัน)', ageDays: 26, heightCm: 34.0, leafCount: 15, moisture: 70, soilPh: 6.6, q1: 5, q2: 5, q3: 5, q4: 5, note: 'แตกใบประกอบขนนกสีเขียวเข้ม อัตราเติบโตทุก 30 นาทีอยู่ในเกณฑ์ดีเยี่ยม', createdAt: '2026-10-24' },
            { id: 213, plotId: 5, stage: 'ระยะออกดอก/ติดผล (36-55 วัน)', ageDays: 42, heightCm: 56.5, leafCount: 22, moisture: 69, soilPh: 6.5, q1: 5, q2: 5, q3: 5, q4: 5, note: 'ลำต้นตั้งตรง แข็งแรง ทนทานต่อสภาพอากาศริมโขง จ.นครพนม', createdAt: '2026-11-02' }
        ];
        /*__EMBEDDED_DATA_END__*/

        let plots = [];
        let logs = [];
        let currentScores = { q1: 5, q2: 5, q3: 5, q4: 5 };
        let growthLineInstance = null;
        let radarChartInstance = null;
        let barChartInstance = null;
        let pieChartInstance = null;

        // Leaflet Map instances
        let leafletMap = null;
        let streetTileLayer = null;
        let satelliteTileLayer = null;
        let mapMarkersGroup = null;
        let tempClickedMarker = null;

        // =====================================================================
        // 3. การโหลดและบันทึกข้อมูลลง LocalStorage
        // =====================================================================
        function loadData() {
            try {
                const savedPlots = localStorage.getItem(STORAGE_KEY_PLOTS);
                const savedLogs = localStorage.getItem(STORAGE_KEY_LOGS);
                const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
                plots = savedPlots ? JSON.parse(savedPlots) : [...DEFAULT_PLOTS];
                logs = savedLogs ? JSON.parse(savedLogs) : [...DEFAULT_LOGS];
                if (savedTheme && THEMES[savedTheme]) {
                    activeThemeKey = savedTheme;
                }
            } catch (e) {
                plots = [...DEFAULT_PLOTS];
                logs = [...DEFAULT_LOGS];
            }
        }

        function saveData() {
            try {
                localStorage.setItem(STORAGE_KEY_PLOTS, JSON.stringify(plots));
                localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
            } catch (e) {}
        }

        function showToast(msg) {
            const box = document.getElementById('toastBox');
            const text = document.getElementById('toastMessage');
            text.textContent = msg;
            box.classList.remove('hidden');
            setTimeout(() => {
                box.classList.add('hidden');
            }, 3200);
        }

        function toggleQrModal(show) {
            const modal = document.getElementById('qrModal');
            if (show) {
                modal.classList.remove('hidden');
            } else {
                modal.classList.add('hidden');
            }
        }

        function appendQuickTag(text) {
            const input = document.getElementById('inputNote');
            input.value = input.value ? input.value + ' ' + text : text;
        }

        function savePlots() {
            saveData();
        }

        const TREE_PRESETS = {
            preset1: [
                { id: 1, name: 'แปลงที่ 1: กล้าไม้ยางนา (Dipterocarpus alatus)', zone: 'โซนเพาะชำไม้เศรษฐกิจ A1 อ.เมืองนครพนม', harvestDays: 150, icon: '🌳', lat: 17.3948, lng: 104.7682, shortName: 'ต้นยางนา' },
                { id: 2, name: 'แปลงที่ 2: กล้าไม้สักทอง (Tectona grandis)', zone: 'แปลงเพาะชำกลางแจ้ง B2 ต.นาราชควาย จ.นครพนม', harvestDays: 120, icon: '🌲', lat: 17.3961, lng: 104.7704, shortName: 'ต้นสักทอง' },
                { id: 3, name: 'แปลงที่ 3: กล้าไม้พะยูง (Dalbergia cochinchinensis)', zone: 'แปลงเพาะชำไม้ป่าอนุรักษ์ C1 อ.เมือง จ.นครพนม', harvestDays: 150, icon: '🌳', lat: 17.3922, lng: 104.7668, shortName: 'ต้นพะยูง' },
                { id: 4, name: 'แปลงที่ 4: กล้าไม้กันเกรา (Fagraea fragrans - ไม้ประจำ จ.นครพนม)', zone: 'โซนอนุรักษ์พันธุ์ไม้ประจำจังหวัด D1 จ.นครพนม', harvestDays: 180, icon: '🌿', lat: 17.3935, lng: 104.7718, shortName: 'ต้นกันเกรา' },
                { id: 5, name: 'แปลงที่ 5: กล้าไม้ประดู่ป่า (Pterocarpus macrocarpus - ต้นจำลองกราฟ 30 นาที)', zone: 'โซนจำลองเปรียบเทียบการเติบโตราย 30 นาที E1 จ.นครพนม', harvestDays: 160, icon: '🍁', lat: 17.3954, lng: 104.7695, shortName: 'ต้นประดู่ป่า' }
            ],
            preset2: [
                { id: 1, name: 'แปลงที่ 1: ต้นประดู่ป่า (Pterocarpus macrocarpus)', zone: 'โซนไม้ป่าเนื้อแข็งพรีเมียม A1 จ.นครพนม', harvestDays: 160, icon: '🌳', lat: 17.3948, lng: 104.7682, shortName: 'ต้นประดู่ป่า' },
                { id: 2, name: 'แปลงที่ 2: ต้นชิงชัน (Dalbergia oliveri)', zone: 'แปลงสาธิตพันธุ์ไม้หายาก B2 จ.นครพนม', harvestDays: 170, icon: '🌲', lat: 17.3961, lng: 104.7704, shortName: 'ต้นชิงชัน' },
                { id: 3, name: 'แปลงที่ 3: ต้นมะค่าโมง (Afzelia xylocarpa)', zone: 'แปลงเพาะขยายพันธุ์ C1 อ.เมือง จ.นครพนม', harvestDays: 150, icon: '🌳', lat: 17.3922, lng: 104.7668, shortName: 'ต้นมะค่าโมง' },
                { id: 4, name: 'แปลงที่ 4: ต้นกฤษณา (Aquilaria crassna)', zone: 'โซนไม้กฤษณาหอม D1 จ.นครพนม', harvestDays: 180, icon: '🌿', lat: 17.3935, lng: 104.7718, shortName: 'ต้นกฤษณา' },
                { id: 5, name: 'แปลงที่ 5: ต้นตะเคียนทอง (Hopea odorata - ต้นจำลองกราฟ 30 นาที)', zone: 'โซนจำลองเปรียบเทียบการเติบโตราย 30 นาที E1 จ.นครพนม', harvestDays: 165, icon: '🍁', lat: 17.3954, lng: 104.7695, shortName: 'ต้นตะเคียนทอง' }
            ],
            preset3: [
                { id: 1, name: 'แปลงที่ 1: ต้นมะม่วงอกร่องทอง/น้ำดอกไม้', zone: 'แปลงไม้ผลยืนต้นเชิงพาณิชย์ A1 จ.นครพนม', harvestDays: 120, icon: '🥭', lat: 17.3948, lng: 104.7682, shortName: 'ต้นมะม่วง' },
                { id: 2, name: 'แปลงที่ 2: ต้นขนุนพันธุ์ทองประเสริฐ', zone: 'แปลงเพาะกล้าไม้ผลเนื้อทอง B2 จ.นครพนม', harvestDays: 130, icon: '🌳', lat: 17.3961, lng: 104.7704, shortName: 'ต้นขนุน' },
                { id: 3, name: 'แปลงที่ 3: ต้นมะพร้าวน้ำหอมแท้', zone: 'แปลงสวนมะพร้าวริมแม่น้ำโขง C1 จ.นครพนม', harvestDays: 180, icon: '🌴', lat: 17.3922, lng: 104.7668, shortName: 'ต้นมะพร้าว' },
                { id: 4, name: 'แปลงที่ 4: ต้นส้มโอหวานริมฝั่งโขง', zone: 'แปลงไม้ผลอัตลักษณ์ริมโขง D1 จ.นครพนม', harvestDays: 140, icon: '🍊', lat: 17.3935, lng: 104.7718, shortName: 'ต้นส้มโอ' },
                { id: 5, name: 'แปลงที่ 5: ต้นทุเรียนหมอนทองริมโขง (ต้นจำลองกราฟ 30 นาที)', zone: 'โซนจำลองเปรียบเทียบไม้ผลราย 30 นาที E1 จ.นครพนม', harvestDays: 150, icon: '🍈', lat: 17.3954, lng: 104.7695, shortName: 'ต้นทุเรียน' }
            ]
        };

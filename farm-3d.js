/* ==========================================================================
   โมดูลที่ 3: ระบบจำลองสมาร์ทฟาร์ม 3 มิติ (js/farm-3d.js)
   - แสดงแปลงเพาะปลูก 4 โซนหลัก (ลบฟาร์มตรงกลางออกเพื่อให้ทางเดินกลางโล่งสวยงาม)
   - ปรับแต่ง Low-Poly & Shared Geometry/Material Cache เพื่อลดอาการแล็คกว่า 80%
   ========================================================================== */

// =====================================================================
        // 14. ระบบจำลองสมาร์ทฟาร์ม 3 มิติ (Three.js 3D Digital Twin)
        // =====================================================================
        let threeScene = null;
        let threeCamera = null;
        let threeRenderer = null;
        let threeAnimId = null;
        let plantMeshes3D = [];
        let fruitMeshes3D = [];
        let waterParticles3D = null;
        let sprinklerOn3D = true;
        let isNightMode3D = false;
        let autoRotate3D = true;
        let ambientLight3D = null;
        let hemiLight3D = null;
        let dirLight3D = null;
        let sunMesh3D = null;
        let greenhouseLight3D = null;
        let greenhouseMesh3D = null;
        let showGreenhouseFrame = false;

        // Orbit Camera State
        let camTheta = 0.65;
        let camPhi = 0.92;
        let camRadius = 26;
        let camTarget = { x: 0, y: 0.5, z: 0 };
        let isDragging3D = false;
        let prevMouse3D = { x: 0, y: 0 };

        function initOrResize3DFarm() {
            const container = document.getElementById('threeCanvasContainer');
            if (!container || typeof THREE === 'undefined') return;

            if (!threeRenderer) {
                const w = container.clientWidth || 800;
                const h = container.clientHeight || 440;

                threeScene = new THREE.Scene();
                threeScene.background = new THREE.Color(0xdbeafe);
                threeScene.fog = new THREE.FogExp2(0xe0f2fe, 0.005);

                threeCamera = new THREE.PerspectiveCamera(45, w / h, 0.5, 140);
                threeRenderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
                threeRenderer.setSize(w, h);
                // จำกัด PixelRatio ไม่เกิน 1.25 และปิด ShadowMap เพื่อลดภาระ GPU และทำให้หมุนลื่นไหลไม่แล็ค
                threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
                threeRenderer.shadowMap.enabled = false;
                container.innerHTML = '';
                container.appendChild(threeRenderer.domElement);

                // Bright Morning Sunlight & Sky Hemisphere Lighting
                ambientLight3D = new THREE.AmbientLight(0xffffff, 1.3);
                threeScene.add(ambientLight3D);

                hemiLight3D = new THREE.HemisphereLight(0xffffff, 0xbbf7d0, 1.0);
                hemiLight3D.position.set(0, 35, 0);
                threeScene.add(hemiLight3D);

                dirLight3D = new THREE.DirectionalLight(0xfffbeb, 1.5);
                dirLight3D.position.set(18, 28, 16);
                dirLight3D.castShadow = false;
                threeScene.add(dirLight3D);

                // Morning Sun Sphere in the Sky
                const sunGeo = new THREE.SphereGeometry(2.2, 16, 16);
                const sunMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
                sunMesh3D = new THREE.Mesh(sunGeo, sunMat);
                sunMesh3D.position.set(18, 22, -18);
                threeScene.add(sunMesh3D);

                greenhouseLight3D = new THREE.PointLight(0xa855f7, 0.0, 18);
                greenhouseLight3D.position.set(6, 4.5, -5.5);
                threeScene.add(greenhouseLight3D);

                // Base Ground Island (Farmland)
                const groundGeo = new THREE.BoxGeometry(28, 1.2, 22);
                const groundMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
                const ground = new THREE.Mesh(groundGeo, groundMat);
                ground.position.y = -0.6;
                ground.receiveShadow = true;
                threeScene.add(ground);

                // Bright Lush Morning Grass Top Surface
                const grassGeo = new THREE.PlaneGeometry(27, 21);
                const grassMat = new THREE.MeshLambertMaterial({ color: 0x4ade80 });
                const grass = new THREE.Mesh(grassGeo, grassMat);
                grass.rotation.x = -Math.PI / 2;
                grass.position.y = 0.02;
                threeScene.add(grass);

                // Mekong River Strip along the front edge (เอกลักษณ์ริมโขง จ.นครพนม)
                const riverGeo = new THREE.BoxGeometry(28, 0.35, 3.2);
                const riverMat = new THREE.MeshPhongMaterial({ color: 0x0284c7, shininess: 90 });
                const river = new THREE.Mesh(riverGeo, riverMat);
                river.position.set(0, -0.05, 11.2);
                threeScene.add(river);

                // Build 4 Farm Plots (2x2 Grid)
                const plotConfigs = [
                    { id: 1, x: -6.2, z: -4.8, type: 'yangna', soilColor: 0x78350f },
                    { id: 2, x: 6.2, z: -4.8, type: 'teak', soilColor: 0x5a3818 },
                    { id: 3, x: -6.2, z: 4.5, type: 'payung', soilColor: 0x422006 },
                    { id: 4, x: 6.2, z: 4.5, type: 'kankrao', soilColor: 0x713f12 }
                ];

                plotConfigs.forEach(cfg => {
                    // Raised Soil Bed
                    const bedGeo = new THREE.BoxGeometry(9.6, 0.45, 7.2);
                    const bedMat = new THREE.MeshLambertMaterial({ color: cfg.soilColor });
                    const bed = new THREE.Mesh(bedGeo, bedMat);
                    bed.position.set(cfg.x, 0.22, cfg.z);
                    threeScene.add(bed);

                    // Optional translucent nursery dome for Plot 2 (ซ่อนกรอบขาวออกตามที่ผู้ใช้ต้องการ แต่สามารถเปิดได้หากต้องการดูโรงเรือน)
                    if (cfg.id === 2) {
                        const ghGeo = new THREE.BoxGeometry(9.8, 3.8, 7.4);
                        const ghMat = new THREE.MeshPhongMaterial({
                            color: 0xe0f2fe,
                            transparent: true,
                            opacity: 0.18,
                            shininess: 90
                        });
                        greenhouseMesh3D = new THREE.Mesh(ghGeo, ghMat);
                        greenhouseMesh3D.position.set(cfg.x, 2.1, cfg.z);
                        greenhouseMesh3D.visible = showGreenhouseFrame;
                        threeScene.add(greenhouseMesh3D);
                    }

                    // จัดวางต้นไม้ 3x3 ต้นต่อแปลง (รวม 4 แปลง = 36 ต้น ไม่มีแปลงตรงกลาง) เพื่อให้โปร่งสวยงามและลดอาการแล็ค
                    for (let r = -1; r <= 1; r++) {
                        for (let c = -1; c <= 1; c++) {
                            const px = cfg.x + c * 2.75;
                            const pz = cfg.z + r * 2.05;
                            const treeItem = createBotanicalTreeMesh(cfg.id, px, pz, currentTreePresetKey);
                            threeScene.add(treeItem.rootGroup);
                            plantMeshes3D.push(treeItem);
                        }
                    }
                });

                // 3D Water Sprinkler Particle System (ปรับจำนวนอนุภาคให้ลื่นไหล)
                const particleCount = 110;
                const pGeo = new THREE.BufferGeometry();
                const positions = new Float32Array(particleCount * 3);
                for (let i = 0; i < particleCount; i++) {
                    positions[i * 3] = (Math.random() - 0.5) * 22;
                    positions[i * 3 + 1] = Math.random() * 5.5 + 0.6;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
                }
                pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                const pMat = new THREE.PointsMaterial({
                    color: 0x38bdf8,
                    size: 0.22,
                    transparent: true,
                    opacity: 0.85
                });
                waterParticles3D = new THREE.Points(pGeo, pMat);
                threeScene.add(waterParticles3D);

                // Pointer & Touch Orbit Controls
                const domEl = threeRenderer.domElement;
                domEl.addEventListener('mousedown', e => {
                    isDragging3D = true;
                    autoRotate3D = false;
                    prevMouse3D = { x: e.clientX, y: e.clientY };
                });
                window.addEventListener('mouseup', () => { isDragging3D = false; });
                window.addEventListener('mousemove', e => {
                    if (!isDragging3D) return;
                    const dx = e.clientX - prevMouse3D.x;
                    const dy = e.clientY - prevMouse3D.y;
                    prevMouse3D = { x: e.clientX, y: e.clientY };
                    camTheta -= dx * 0.008;
                    camPhi = Math.max(0.25, Math.min(1.42, camPhi - dy * 0.007));
                });
                domEl.addEventListener('wheel', e => {
                    e.preventDefault();
                    camRadius = Math.max(10, Math.min(42, camRadius + e.deltaY * 0.015));
                }, { passive: false });

                // Touch support for mobile
                domEl.addEventListener('touchstart', e => {
                    if (e.touches.length === 1) {
                        isDragging3D = true;
                        autoRotate3D = false;
                        prevMouse3D = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                    }
                }, { passive: true });
                window.addEventListener('touchend', () => { isDragging3D = false; });
                window.addEventListener('touchmove', e => {
                    if (!isDragging3D || e.touches.length !== 1) return;
                    const dx = e.touches[0].clientX - prevMouse3D.x;
                    const dy = e.touches[0].clientY - prevMouse3D.y;
                    prevMouse3D = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                    camTheta -= dx * 0.008;
                    camPhi = Math.max(0.25, Math.min(1.42, camPhi - dy * 0.007));
                }, { passive: true });

                window.addEventListener('resize', () => {
                    if (!threeRenderer || !threeCamera) return;
                    const cw = container.clientWidth;
                    const ch = container.clientHeight;
                    if (cw > 0 && ch > 0) {
                        threeCamera.aspect = cw / ch;
                        threeCamera.updateProjectionMatrix();
                        threeRenderer.setSize(cw, ch);
                    }
                });

                update3DGrowthStage(90);
                start3DLoop();
            } else {
                const cw = container.clientWidth;
                const ch = container.clientHeight;
                if (cw > 0 && ch > 0) {
                    threeCamera.aspect = cw / ch;
                    threeCamera.updateProjectionMatrix();
                    threeRenderer.setSize(cw, ch);
                }
                start3DLoop();
            }
        }

        function stop3DLoop() {
            if (threeAnimId) {
                cancelAnimationFrame(threeAnimId);
                threeAnimId = null;
            }
        }

        function start3DLoop() {
            if (threeAnimId) cancelAnimationFrame(threeAnimId);
            function animate() {
                const view3DEl = document.getElementById('view3D');
                if (!view3DEl || view3DEl.classList.contains('hidden') || document.hidden) {
                    threeAnimId = null;
                    return;
                }
                threeAnimId = requestAnimationFrame(animate);
                if (!threeRenderer || !threeScene || !threeCamera) return;

                if (autoRotate3D && !isDragging3D) {
                    camTheta += 0.003;
                }

                // Update camera position from spherical coordinates
                threeCamera.position.x = camTarget.x + camRadius * Math.sin(camPhi) * Math.sin(camTheta);
                threeCamera.position.y = camTarget.y + camRadius * Math.cos(camPhi);
                threeCamera.position.z = camTarget.z + camRadius * Math.sin(camPhi) * Math.cos(camTheta);
                threeCamera.lookAt(camTarget.x, camTarget.y, camTarget.z);

                // Animate falling sprinkler water droplets
                if (waterParticles3D) {
                    waterParticles3D.visible = sprinklerOn3D;
                    if (sprinklerOn3D) {
                        const posAttr = waterParticles3D.geometry.attributes.position;
                        for (let i = 0; i < posAttr.count; i++) {
                            let y = posAttr.getY(i) - 0.12;
                            if (y < 0.4) y = 5.6;
                            posAttr.setY(i, y);
                        }
                        posAttr.needsUpdate = true;
                    }
                }

                threeRenderer.render(threeScene, threeCamera);
            }
            animate();
        }

        let currentTreePresetKey = 'preset1';
        let currentFocusedZone = 0;
        let growthTimeLapseTimer = null;

        // แคช Geometry และ Material ร่วมกันทุกต้น (Shared Resource Pool) เพื่อลด Draw Calls และป้องกันอาการแล็ค
        const _sharedMatCache = {};
        function getSharedLambertMat(colorHex) {
            if (!_sharedMatCache[colorHex]) {
                _sharedMatCache[colorHex] = new THREE.MeshLambertMaterial({ color: colorHex });
            }
            return _sharedMatCache[colorHex];
        }
        let _sharedUnitSphereGeo = null;
        function getSharedUnitSphereGeo() {
            if (!_sharedUnitSphereGeo) {
                _sharedUnitSphereGeo = new THREE.SphereGeometry(0.5, 6, 5);
            }
            return _sharedUnitSphereGeo;
        }

        // ฟังก์ชันสร้างใบไม้จริง 3 มิติ (Optimized Low-Poly + Shared Geometry/Material)
        function createLeafBlade(width, length, colorHex, tiltZ, rotY, posY, radialDist) {
            const holder = new THREE.Group();
            holder.rotation.y = rotY;
            holder.position.y = posY;

            const petiole = new THREE.Group();
            petiole.position.x = radialDist;
            petiole.rotation.z = -tiltZ;

            const blade = new THREE.Mesh(getSharedUnitSphereGeo(), getSharedLambertMat(colorHex));
            blade.scale.set(length, 0.12, width);
            blade.position.x = length * 0.44;

            petiole.add(blade);
            holder.add(petiole);
            return holder;
        }

        // ฟังก์ชันสร้างกิ่งใบประกอบแบบขนนก (Optimized Low-Poly + Shared Geometry/Material)
        function createPinnateBranch(branchLen, leafletCount, colorHex, tiltZ, rotY, posY) {
            const holder = new THREE.Group();
            holder.rotation.y = rotY;
            holder.position.y = posY;

            const rachisGroup = new THREE.Group();
            rachisGroup.rotation.z = -tiltZ;

            const rachisGeo = new THREE.CylinderGeometry(0.015, 0.030, branchLen, 5);
            rachisGeo.rotateZ(-Math.PI / 2);
            const rachis = new THREE.Mesh(rachisGeo, getSharedLambertMat(0x451a03));
            rachis.position.x = branchLen * 0.5;
            rachisGroup.add(rachis);

            const stepCount = Math.min(leafletCount, 3);
            const leafMat = getSharedLambertMat(colorHex);
            const sphereGeo = getSharedUnitSphereGeo();
            for (let i = 1; i <= stepCount; i++) {
                const dist = (i / (stepCount + 0.5)) * branchLen;
                [-1, 1].forEach(side => {
                    const lf = new THREE.Mesh(sphereGeo, leafMat);
                    lf.scale.set(0.34, 0.09, 0.20);
                    lf.position.set(dist, 0.01, side * 0.14);
                    lf.rotation.y = side * 0.35;
                    rachisGroup.add(lf);
                });
            }
            const termLf = new THREE.Mesh(sphereGeo, getSharedLambertMat(0x22c55e));
            termLf.scale.set(0.36, 0.09, 0.20);
            termLf.position.set(branchLen + 0.12, 0.01, 0);
            rachisGroup.add(termLf);

            holder.add(rachisGroup);
            return holder;
        }

        function createBotanicalTreeMesh(plotId, px, pz, presetKey) {
            const rootGroup = new THREE.Group();
            rootGroup.position.set(px, 0.45, pz);

            // 1. ถุงเพาะชำกล้าไม้สีดำและดินเพาะ (ขนาดคงที่ 100% ตามความจริง ไม่ยืดหดตามอายุต้นไม้)
            const bagGroup = new THREE.Group();
            const bagGeo = new THREE.CylinderGeometry(0.24, 0.21, 0.36, 14);
            const bagMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
            const bag = new THREE.Mesh(bagGeo, bagMat);
            bag.position.y = 0.18;
            bagGroup.add(bag);

            const soilTopGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.04, 14);
            const soilTopMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
            const soilTop = new THREE.Mesh(soilTopGeo, soilTopMat);
            soilTop.position.y = 0.35;
            bagGroup.add(soilTop);
            rootGroup.add(bagGroup);

            // 2. อวัยวะของต้นไม้ที่เติบโตตามลำดับเวลาจริง (Stage-by-stage Organogenesis)
            const stemGroup = new THREE.Group();
            stemGroup.position.y = 0.34;
            rootGroup.add(stemGroup);

            // ใบเลี้ยงคู่แรก (Cotyledons: 15-50 วัน)
            const cotyledonGroup = new THREE.Group();
            cotyledonGroup.position.y = 0.48;
            rootGroup.add(cotyledonGroup);
            cotyledonGroup.add(createLeafBlade(0.14, 0.24, 0x4ade80, 0.2, 0, 0, 0.03));
            cotyledonGroup.add(createLeafBlade(0.14, 0.24, 0x4ade80, 0.2, Math.PI, 0, 0.03));

            const lowerCanopy = new THREE.Group();  // ใบจริงชุดล่าง (22+ วัน)
            const midCanopy = new THREE.Group();    // กิ่งแขนงและใบชั้นกลาง (55+ วัน)
            const upperCanopy = new THREE.Group();  // เรือนยอดชั้นบน (95+ วัน)
            const apicalShoot = new THREE.Group();  // ยอดอ่อน/หูใบ/ดอก/ผล (125+ วัน)

            rootGroup.add(lowerCanopy);
            rootGroup.add(midCanopy);
            rootGroup.add(upperCanopy);
            rootGroup.add(apicalShoot);

            // ---------------------------------------------------------
            // แยกการสร้างรูปทรงทางพฤกษศาสตร์จริงตามชุดพันธุ์ไม้ (Preset 1, 2, 3)
            // ---------------------------------------------------------
            if (presetKey === 'preset3') {
                // ชุดที่ 3: ไม้ผลยืนต้น (1: มะม่วง, 2: ขนุน, 3: มะพร้าวน้ำหอม, 4: ส้มโอ)
                if (plotId === 1) {
                    // ต้นมะม่วงอกร่องทอง: พุ่มกลมใบเรียวยาวโค้งลง + ผลมะม่วงสีเหลืองทองห้อยจากกิ่ง
                    const maxH = 1.75;
                    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, maxH, 12), new THREE.MeshLambertMaterial({ color: 0x5c3a21 }));
                    trunk.position.y = maxH / 2;
                    stemGroup.add(trunk);

                    for (let i = 0; i < 6; i++) lowerCanopy.add(createLeafBlade(0.22, 0.72, 0x14532d, 0.42, (i * Math.PI * 2) / 6, 0.95, 0.08));
                    for (let i = 0; i < 8; i++) midCanopy.add(createLeafBlade(0.24, 0.78, 0x166534, 0.28, (i * Math.PI * 2) / 8 + 0.3, 1.38, 0.12));
                    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), new THREE.MeshLambertMaterial({ color: 0x15803d }));
                    crown.scale.set(1.2, 0.85, 1.2);
                    crown.position.y = 1.75;
                    upperCanopy.add(crown);

                    // ผลมะม่วงสุกสีเหลืองทองห้อยลงมา 4 ผล
                    for (let i = 0; i < 4; i++) {
                        const a = (i * Math.PI) / 2 + 0.4;
                        const mango = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), new THREE.MeshPhongMaterial({ color: 0xfacc15, shininess: 60 }));
                        mango.scale.set(0.85, 1.45, 0.75);
                        mango.position.set(Math.cos(a) * 0.48, 1.42, Math.sin(a) * 0.48);
                        apicalShoot.add(mango);
                    }
                } else if (plotId === 2) {
                    // ต้นขนุนพันธุ์ทองประเสริฐ: ใบรีสีเขียวเข้มเป็นมัน + ลูกขนุนเกาะตามลำต้นหลัก (Cauliflory)
                    const maxH = 1.85;
                    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, maxH, 12), new THREE.MeshLambertMaterial({ color: 0x713f12 }));
                    trunk.position.y = maxH / 2;
                    stemGroup.add(trunk);

                    for (let i = 0; i < 5; i++) lowerCanopy.add(createLeafBlade(0.34, 0.58, 0x14532d, 0.20, (i * Math.PI * 2) / 5, 1.05, 0.09));
                    for (let i = 0; i < 6; i++) midCanopy.add(createLeafBlade(0.36, 0.62, 0x15803d, 0.12, (i * Math.PI * 2) / 6 + 0.4, 1.45, 0.10));
                    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.52, 1), new THREE.MeshLambertMaterial({ color: 0x16a34a }));
                    crown.position.y = 1.85;
                    upperCanopy.add(crown);

                    // ลูกขนุนเกาะติดลำต้นจริง (Cauliflorous jackfruits on trunk)
                    [ { y: 0.78, a: 0.3 }, { y: 0.96, a: 2.5 }, { y: 1.12, a: 4.4 } ].forEach(jf => {
                        const jack = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 1), new THREE.MeshLambertMaterial({ color: 0x84cc16 }));
                        jack.scale.set(0.85, 1.45, 0.85);
                        jack.position.set(Math.cos(jf.a) * 0.22, jf.y, Math.sin(jf.a) * 0.22);
                        apicalShoot.add(jack);
                    });
                } else if (plotId === 3) {
                    // ต้นมะพร้าวน้ำหอม: ลำต้นเดี่ยวมีข้อปล้อง + ทางมะพร้าวแผ่โค้งรอบยอด + ทะลายมะพร้าวน้ำหอม
                    const maxH = 1.65;
                    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.18, maxH, 12), new THREE.MeshLambertMaterial({ color: 0x78350f }));
                    trunk.position.y = maxH / 2;
                    stemGroup.add(trunk);

                    for (let i = 0; i < 6; i++) {
                        const a = (i * Math.PI * 2) / 6;
                        lowerCanopy.add(createPinnateBranch(0.95, 5, 0x15803d, 0.38, a, 1.15));
                        midCanopy.add(createPinnateBranch(1.12, 6, 0x16a34a, 0.18, a + 0.5, 1.45));
                    }
                    for (let i = 0; i < 4; i++) {
                        const a = (i * Math.PI * 2) / 4;
                        upperCanopy.add(createPinnateBranch(0.88, 5, 0x22c55e, -0.15, a + 0.25, 1.72));
                        const nut = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), new THREE.MeshPhongMaterial({ color: 0x65a30d, shininess: 55 }));
                        nut.position.set(Math.cos(a) * 0.17, 1.50, Math.sin(a) * 0.17);
                        apicalShoot.add(nut);
                    }
                } else {
                    // ต้นส้มโอหวานริมโขง: พุ่มใบเขียวเข้ม + ลูกส้มโอกลมใหญ่สีเขียวอมเหลือง
                    const maxH = 1.65;
                    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, maxH, 12), new THREE.MeshLambertMaterial({ color: 0x5c3a21 }));
                    trunk.position.y = maxH / 2;
                    stemGroup.add(trunk);

                    for (let i = 0; i < 6; i++) lowerCanopy.add(createLeafBlade(0.36, 0.56, 0x15803d, 0.22, (i * Math.PI * 2) / 6, 0.95, 0.08));
                    for (let i = 0; i < 6; i++) midCanopy.add(createLeafBlade(0.38, 0.60, 0x16a34a, 0.12, (i * Math.PI * 2) / 6 + 0.5, 1.35, 0.10));
                    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.56, 12, 10), new THREE.MeshLambertMaterial({ color: 0x22c55e }));
                    crown.scale.set(1.15, 0.85, 1.15);
                    crown.position.y = 1.68;
                    upperCanopy.add(crown);

                    for (let i = 0; i < 4; i++) {
                        const a = (i * Math.PI) / 2 + 0.2;
                        const pomelo = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), new THREE.MeshPhongMaterial({ color: 0xa3e635, shininess: 50 }));
                        pomelo.position.set(Math.cos(a) * 0.44, 1.38, Math.sin(a) * 0.44);
                        apicalShoot.add(pomelo);
                    }
                }
            } else if (presetKey === 'preset2') {
                // ชุดที่ 2: ไม้ป่ามีค่า & สมุนไพร (1: ประดู่ป่า, 2: ชิงชัน, 3: มะค่าโมง, 4: กฤษณา)
                if (plotId === 1) {
                    // ต้นประดู่ป่า: ทรงพุ่มแผ่กว้างเหมือนร่ม + ช่อดอกประดู่สีเหลืองทอง
                    const maxH = 1.90;
                    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.16, maxH, 12), new THREE.MeshLambertMaterial({ color: 0x451a03 }));
                    trunk.position.y = maxH / 2;
                    stemGroup.add(trunk);
                    for (let i = 0; i < 5; i++) lowerCanopy.add(createPinnateBranch(0.75, 4, 0x166534, 0.25, (i * Math.PI * 2) / 5, 1.05));
                    for (let i = 0; i < 6; i++) midCanopy.add(createPinnateBranch(0.95, 5, 0x15803d, 0.15, (i * Math.PI * 2) / 6 + 0.3, 1.48));
                    const umbrella = new THREE.Mesh(new THREE.SphereGeometry(0.68, 12, 10), new THREE.MeshLambertMaterial({ color: 0x16a34a }));
                    umbrella.scale.set(1.35, 0.65, 1.35);
                    umbrella.position.y = 1.92;
                    upperCanopy.add(umbrella);
                    // ช่อดอกประดู่สีเหลืองทอง
                    for (let i = 0; i < 5; i++) {
                        const a = (i * Math.PI * 2) / 5;
                        const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), new THREE.MeshLambertMaterial({ color: 0xfacc15 }));
                        flower.position.set(Math.cos(a) * 0.55, 2.05, Math.sin(a) * 0.55);
                        apicalShoot.add(flower);
                    }
                } else if (plotId === 2) {
                    // ต้นชิงชัน: ลำต้นสีน้ำตาลอมม่วง กิ่งใบประกอบขนนกละเอียด
                    const maxH = 1.85;
                    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.14, maxH, 12), new THREE.MeshLambertMaterial({ color: 0x3b0764 }));
                    trunk.position.y = maxH / 2;
                    stemGroup.add(trunk);
                    for (let i = 0; i < 4; i++) lowerCanopy.add(createPinnateBranch(0.70, 5, 0x15803d, 0.22, (i * Math.PI) / 2, 1.0));
                    for (let i = 0; i < 6; i++) midCanopy.add(createPinnateBranch(0.85, 6, 0x16a34a, 0.12, (i * Math.PI * 2) / 6 + 0.4, 1.42));
                    for (let i = 0; i < 5; i++) upperCanopy.add(createPinnateBranch(0.75, 5, 0x22c55e, 0.02, (i * Math.PI * 2) / 5, 1.78));
                    apicalShoot.add(createPinnateBranch(0.55, 4, 0x4ade80, -0.25, 0.5, 2.02));
                } else if (plotId === 3) {
                    // ต้นมะค่าโมง: ลำต้นแข็งแรง พุ่มใบประกอบกว้างสีเขียวเข้ม
                    const maxH = 1.80;
                    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.17, maxH, 12), new THREE.MeshLambertMaterial({ color: 0x713f12 }));
                    trunk.position.y = maxH / 2;
                    stemGroup.add(trunk);
                    for (let i = 0; i < 5; i++) lowerCanopy.add(createPinnateBranch(0.80, 4, 0x14532d, 0.20, (i * Math.PI * 2) / 5, 1.02));
                    for (let i = 0; i < 6; i++) midCanopy.add(createPinnateBranch(0.92, 5, 0x166534, 0.10, (i * Math.PI * 2) / 6 + 0.3, 1.45));
                    const topC = new THREE.Mesh(new THREE.DodecahedronGeometry(0.58, 1), new THREE.MeshLambertMaterial({ color: 0x15803d }));
                    topC.scale.set(1.25, 0.75, 1.25);
                    topC.position.y = 1.85;
                    upperCanopy.add(topC);
                    apicalShoot.add(createLeafBlade(0.32, 0.58, 0x4ade80, -0.2, 0, 2.15, 0.05));
                } else {
                    // ต้นกฤษณา: ทรงพุ่มพีระมิดใบเรียวมันสีเขียวสด
                    const maxH = 1.95;
                    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.14, maxH, 12), new THREE.MeshLambertMaterial({ color: 0x475569 }));
                    trunk.position.y = maxH / 2;
                    stemGroup.add(trunk);
                    for (let i = 0; i < 7; i++) lowerCanopy.add(createLeafBlade(0.24, 0.58, 0x065f46, 0.25, (i * Math.PI * 2) / 7, 0.92, 0.08));
                    for (let i = 0; i < 6; i++) midCanopy.add(createLeafBlade(0.22, 0.52, 0x047857, 0.18, (i * Math.PI * 2) / 6 + 0.3, 1.35, 0.08));
                    for (let i = 0; i < 5; i++) upperCanopy.add(createLeafBlade(0.20, 0.46, 0x059669, 0.10, (i * Math.PI * 2) / 5, 1.72, 0.07));
                    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.50, 10), new THREE.MeshPhongMaterial({ color: 0x10b981, shininess: 50 }));
                    tip.position.y = 2.08;
                    apicalShoot.add(tip);
                }
            } else {
                // ชุดที่ 1 (ค่าเริ่มต้น): ไม้ป่าเศรษฐกิจ จ.นครพนม (1: ยางนา, 2: สักทอง, 3: พะยูง, 4: กันเกรา)
                if (plotId === 1) {
                    // 1. ต้นยางนา (Dipterocarpus alatus)
                    // เอกลักษณ์จริง: ลำต้นเปลาตรงสูงชะลูด สีน้ำตาลอมเทา ใบเดี่ยวรูปไข่แกมใบหอกแผ่ออกส่วนบน + หูใบหุ้มยอดอ่อนสีแดงอมชมพู
                    const maxStemHeight = 2.15;
                    const trunk = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.075, 0.15, maxStemHeight, 12),
                        new THREE.MeshLambertMaterial({ color: 0x6b4423 })
                    );
                    trunk.position.y = maxStemHeight / 2;
                    stemGroup.add(trunk);

                    for (let i = 0; i < 4; i++) {
                        lowerCanopy.add(createLeafBlade(0.32, 0.68, 0x166534, 0.22, (i * Math.PI) / 2 + 0.3, 1.15, 0.08));
                    }
                    for (let i = 0; i < 6; i++) {
                        const a = (i * Math.PI * 2) / 6;
                        midCanopy.add(createLeafBlade(0.36, 0.78, 0x15803d, 0.15, a, 1.62, 0.09));
                    }
                    const crownCore = new THREE.Mesh(
                        new THREE.DodecahedronGeometry(0.46, 1),
                        new THREE.MeshLambertMaterial({ color: 0x16a34a })
                    );
                    crownCore.position.y = 2.05;
                    upperCanopy.add(crownCore);
                    for (let i = 0; i < 6; i++) {
                        const a = (i * Math.PI * 2) / 6 + 0.4;
                        upperCanopy.add(createLeafBlade(0.30, 0.62, 0x22c55e, -0.08, a, 2.02, 0.12));
                    }
                    // ยอดอ่อนยางนา + หูใบสีแดงอมชมพู (Stipular Bud)
                    const stipuleBud = new THREE.Mesh(
                        new THREE.ConeGeometry(0.09, 0.34, 8),
                        new THREE.MeshPhongMaterial({ color: 0xe11d48, shininess: 45 })
                    );
                    stipuleBud.position.y = 2.52;
                    apicalShoot.add(stipuleBud);
                    apicalShoot.add(createLeafBlade(0.24, 0.48, 0x4ade80, -0.35, 0.8, 2.38, 0.05));
                    apicalShoot.add(createLeafBlade(0.24, 0.48, 0x4ade80, -0.35, 3.9, 2.38, 0.05));

                } else if (plotId === 2) {
                    // 2. ต้นสักทอง (Tectona grandis)
                    // เอกลักษณ์จริง: ลำต้นตรงสีน้ำตาลอ่อน ใบเดี่ยวขนาดใหญ่มาก ออกตรงข้ามกันเป็นคู่สลับตั้งฉาก (Opposite decussate large leaves) สีเขียวอมเหลืองทอง
                    const maxStemHeight = 1.75;
                    const trunk = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.085, 0.15, maxStemHeight, 12),
                        new THREE.MeshLambertMaterial({ color: 0x854d0e })
                    );
                    trunk.position.y = maxStemHeight / 2;
                    stemGroup.add(trunk);

                    // คู่ใบสักขนาดใหญ่ชั้นล่าง (มุม 0° และ 180°)
                    lowerCanopy.add(createLeafBlade(0.58, 0.88, 0x3f6212, 0.25, 0, 0.88, 0.08));
                    lowerCanopy.add(createLeafBlade(0.58, 0.88, 0x3f6212, 0.25, Math.PI, 0.88, 0.08));

                    // คู่ใบสักขนาดใหญ่มากชั้นกลาง (สลับตั้งฉาก 90° และ 270°)
                    midCanopy.add(createLeafBlade(0.68, 1.02, 0x4d7c0f, 0.16, Math.PI / 2, 1.28, 0.09));
                    midCanopy.add(createLeafBlade(0.68, 1.02, 0x4d7c0f, 0.16, (3 * Math.PI) / 2, 1.28, 0.09));

                    // คู่ใบสักชั้นบน (สลับตั้งฉาก 0° และ 180°)
                    upperCanopy.add(createLeafBlade(0.56, 0.86, 0x65a30d, 0.06, 0.15, 1.65, 0.08));
                    upperCanopy.add(createLeafBlade(0.56, 0.86, 0x65a30d, 0.06, Math.PI + 0.15, 1.65, 0.08));

                    // ยอดอ่อนใบสักสีเขียวทอง (Young golden-green shoot)
                    apicalShoot.add(createLeafBlade(0.36, 0.54, 0x84cc16, -0.25, Math.PI / 2 + 0.15, 1.96, 0.04));
                    apicalShoot.add(createLeafBlade(0.36, 0.54, 0x84cc16, -0.25, (3 * Math.PI) / 2 + 0.15, 1.96, 0.04));

                } else if (plotId === 3) {
                    // 3. ต้นพะยูง (Dalbergia cochinchinensis)
                    // เอกลักษณ์จริง: ลำต้นสีน้ำตาลเข้ม แตกกิ่งไม้แขนงเฉียงออกซ้าย-ขวา พร้อมแผงใบประกอบแบบขนนกปลายคี่ (Odd-pinnate compound leaves)
                    const maxStemHeight = 1.85;
                    const trunk = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.07, 0.145, maxStemHeight, 12),
                        new THREE.MeshLambertMaterial({ color: 0x451a03 })
                    );
                    trunk.position.y = maxStemHeight / 2;
                    stemGroup.add(trunk);

                    for (let b = 0; b < 3; b++) {
                        const ang = (b * Math.PI * 2) / 3 + 0.2;
                        lowerCanopy.add(createPinnateBranch(0.68, 4, 0x14532d, 0.25, ang, 0.95));
                    }
                    for (let b = 0; b < 4; b++) {
                        const ang = (b * Math.PI) / 2 + 0.6;
                        midCanopy.add(createPinnateBranch(0.86, 5, 0x15803d, 0.15, ang, 1.38));
                    }
                    for (let b = 0; b < 4; b++) {
                        const ang = (b * Math.PI) / 2 + 0.2;
                        upperCanopy.add(createPinnateBranch(0.74, 4, 0x16a34a, 0.04, ang, 1.75));
                    }
                    apicalShoot.add(createPinnateBranch(0.55, 3, 0x22c55e, -0.35, 0.4, 2.02));
                    apicalShoot.add(createPinnateBranch(0.55, 3, 0x22c55e, -0.35, 3.5, 2.02));

                } else {
                    // 4. ต้นกันเกรา (Fagraea fragrans - ไม้มงคลประจำ จ.นครพนม)
                    // เอกลักษณ์จริง: ทรงพุ่มเป็นฉัตรรูปเจดีย์เรียวสูง 4 ชั้น แตกกิ่งเป็นวงรอบลำต้น ใบเดี่ยวเรียวมันสีเขียวเข้ม
                    const maxStemHeight = 2.05;
                    const trunk = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.068, 0.14, maxStemHeight, 12),
                        new THREE.MeshLambertMaterial({ color: 0x5c3a21 })
                    );
                    trunk.position.y = maxStemHeight / 2;
                    stemGroup.add(trunk);

                    const tier1Cone = new THREE.Mesh(
                        new THREE.ConeGeometry(0.72, 0.55, 12),
                        new THREE.MeshPhongMaterial({ color: 0x064e3b, shininess: 45 })
                    );
                    tier1Cone.position.y = 0.98;
                    lowerCanopy.add(tier1Cone);
                    for (let i = 0; i < 8; i++) {
                        lowerCanopy.add(createLeafBlade(0.22, 0.52, 0x065f46, 0.25, (i * Math.PI * 2) / 8, 0.85, 0.25));
                    }

                    const tier2Cone = new THREE.Mesh(
                        new THREE.ConeGeometry(0.58, 0.52, 12),
                        new THREE.MeshPhongMaterial({ color: 0x065f46, shininess: 50 })
                    );
                    tier2Cone.position.y = 1.40;
                    midCanopy.add(tier2Cone);
                    for (let i = 0; i < 6; i++) {
                        midCanopy.add(createLeafBlade(0.20, 0.45, 0x047857, 0.18, (i * Math.PI * 2) / 6 + 0.3, 1.28, 0.20));
                    }

                    const tier3Cone = new THREE.Mesh(
                        new THREE.ConeGeometry(0.43, 0.48, 12),
                        new THREE.MeshPhongMaterial({ color: 0x047857, shininess: 55 })
                    );
                    tier3Cone.position.y = 1.78;
                    upperCanopy.add(tier3Cone);

                    const tier4Cone = new THREE.Mesh(
                        new THREE.ConeGeometry(0.28, 0.46, 12),
                        new THREE.MeshPhongMaterial({ color: 0x10b981, shininess: 65 })
                    );
                    tier4Cone.position.y = 2.15;
                    apicalShoot.add(tier4Cone);
                }
            }

            return {
                rootGroup,
                plotId,
                stemGroup,
                cotyledonGroup,
                lowerCanopy,
                midCanopy,
                upperCanopy,
                apicalShoot
            };
        }

        function rebuildAll3DTrees() {
            if (!threeScene) return;
            plantMeshes3D.forEach(item => {
                if (item.rootGroup) threeScene.remove(item.rootGroup);
            });
            plantMeshes3D = [];

            const plotCoords = [
                { id: 1, x: -6.2, z: -4.8 },
                { id: 2, x: 6.2, z: -4.8 },
                { id: 3, x: -6.2, z: 4.5 },
                { id: 4, x: 6.2, z: 4.5 }
            ];
            plotCoords.forEach(cfg => {
                for (let r = -1; r <= 1; r++) {
                    for (let c = -1; c <= 1; c++) {
                        const px = cfg.x + c * 2.75;
                        const pz = cfg.z + r * 2.05;
                        const treeItem = createBotanicalTreeMesh(cfg.id, px, pz, currentTreePresetKey);
                        threeScene.add(treeItem.rootGroup);
                        plantMeshes3D.push(treeItem);
                    }
                }
            });

            const slider = document.getElementById('slider3DGrowth');
            update3DGrowthStage(slider ? slider.value : 90);
        }

        function toggleGrowthTimeLapse3D() {
            const btn = document.getElementById('btnPlayGrowth3D');
            const slider = document.getElementById('slider3DGrowth');
            if (!slider) return;

            if (growthTimeLapseTimer) {
                clearInterval(growthTimeLapseTimer);
                growthTimeLapseTimer = null;
                if (btn) {
                    btn.textContent = '▶ เล่น Time-Lapse การเติบโต';
                    btn.className = 'bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg shadow transition';
                }
                return;
            }

            let curAge = Number(slider.value || 15);
            if (curAge >= 175) curAge = 15;
            if (btn) {
                btn.textContent = '⏸ หยุด Time-Lapse';
                btn.className = 'bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg shadow transition';
            }

            growthTimeLapseTimer = setInterval(() => {
                curAge += 2;
                if (curAge > 180) {
                    curAge = 180;
                    slider.value = curAge;
                    update3DGrowthStage(curAge);
                    clearInterval(growthTimeLapseTimer);
                    growthTimeLapseTimer = null;
                    if (btn) {
                        btn.textContent = '▶ เล่น Time-Lapse การเติบโต';
                        btn.className = 'bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg shadow transition';
                    }
                    return;
                }
                slider.value = curAge;
                update3DGrowthStage(curAge);
            }, 70);
        }

        // ฟังก์ชันจำลองการเติบโตตามสรีรวิทยาของกล้าไม้จริง (Realistic Biological Morphogenesis 15 - 180 วัน)
        function update3DGrowthStage(ageVal) {
            const age = Number(ageVal || 90);
            const t = Math.max(0, Math.min(1, (age - 15) / 165));
            // Sigmoid biological growth curve (โตช้าช่วงตั้งตัว -> พุ่งเร็วช่วงยืดลำต้น -> ชะลอเพื่อสร้างเนื้อไม้ช่วงปลาย)
            const sigmoid = 1 / (1 + Math.exp(-7.5 * (t - 0.42)));

            plantMeshes3D.forEach(item => {
                // 1. ลำต้นไม้: ยืดความสูงและขยายขนาดโคนต้นแยกจากถุงชำ (ถุงชำไม่ขยายตาม)
                const stemScaleY = 0.16 + 0.98 * sigmoid;
                const stemScaleXZ = 0.32 + 0.82 * Math.pow(t, 0.75);
                item.stemGroup.scale.set(stemScaleXZ, stemScaleY, stemScaleXZ);

                // 2. ใบเลี้ยงคู่แรก (Cotyledons): ปรากฏช่วง 15-55 วัน แล้วค่อยๆ ร่วงตามธรรมชาติเมื่อต้นโต
                if (age <= 55) {
                    item.cotyledonGroup.visible = true;
                    const cotScale = Math.min(1.0, (age - 10) / 18);
                    item.cotyledonGroup.scale.set(cotScale, cotScale, cotScale);
                    item.cotyledonGroup.position.y = 0.34 + 0.25 * stemScaleY;
                } else {
                    item.cotyledonGroup.visible = false;
                }

                // 3. ใบจริงชั้นล่าง (Lower True Leaves): เริ่มคลี่ออกตั้งแต่อายุ 22 วันขึ้นไป
                if (age >= 22) {
                    item.lowerCanopy.visible = true;
                    const lowProgress = Math.min(1.15, (age - 20) / 55);
                    item.lowerCanopy.scale.set(lowProgress, lowProgress, lowProgress);
                    item.lowerCanopy.position.y = (stemScaleY - 1.0) * 0.45;
                } else {
                    item.lowerCanopy.visible = false;
                }

                // 4. กิ่งแขนงและพุ่มใบชั้นกลาง (Middle Canopy & Branches): เริ่มแตกออกเมื่ออายุ 55 วันขึ้นไป
                if (age >= 55) {
                    item.midCanopy.visible = true;
                    const midProgress = Math.min(1.18, (age - 52) / 65);
                    item.midCanopy.scale.set(midProgress, midProgress, midProgress);
                    item.midCanopy.position.y = (stemScaleY - 1.0) * 0.75;
                } else {
                    item.midCanopy.visible = false;
                }

                // 5. เรือนยอดชั้นบน (Upper Crown): เริ่มสร้างทรงพุ่มสมบูรณ์เมื่ออายุ 95 วันขึ้นไป
                if (age >= 95) {
                    item.upperCanopy.visible = true;
                    const upProgress = Math.min(1.18, (age - 92) / 55);
                    item.upperCanopy.scale.set(upProgress, upProgress, upProgress);
                    item.upperCanopy.position.y = (stemScaleY - 1.0) * 1.05;
                } else {
                    item.upperCanopy.visible = false;
                }

                // 6. ยอดอ่อน/ฉัตรยอดสุด/หูใบแดงยางนา/ผลไม้ (Apical Shoot): แตกยอดเต็มที่ช่วง 125-180 วัน
                if (age >= 125) {
                    item.apicalShoot.visible = true;
                    const topProgress = Math.min(1.2, (age - 122) / 45);
                    item.apicalShoot.scale.set(topProgress, topProgress, topProgress);
                    item.apicalShoot.position.y = (stemScaleY - 1.0) * 1.25;
                } else {
                    item.apicalShoot.visible = false;
                }
            });

            let stageName = 'ระยะที่ 1: งอกใบเลี้ยงและตั้งตัวในถุงชำ';
            if (age >= 140) stageName = 'ระยะที่ 4: กล้าไม้เนื้อไม้แข็งแรงพร้อมย้ายปลูก (เกณฑ์กรมป่าไม้)';
            else if (age >= 90) stageName = 'ระยะที่ 3: แตกกิ่งแขนงและสร้างเรือนยอดประจำพันธุ์';
            else if (age >= 45) stageName = 'ระยะที่ 2: ยืดลำต้นและคลี่ใบจริงชุดแรก';

            const lbl = document.getElementById('sim3DAgeLabel');
            if (lbl) lbl.textContent = `อายุกล้าไม้ ${age} วัน (${stageName})`;

            let heightCm = 7.5 + 42.0 * sigmoid;
            let leavesCount = Math.max(2, Math.round(2 + 18 * sigmoid));
            if (currentFocusedZone === 1) {
                heightCm = 9.0 + 48.0 * sigmoid;
                leavesCount = Math.max(2, Math.round(2 + 14 * sigmoid));
            } else if (currentFocusedZone === 2) {
                heightCm = 8.0 + 40.0 * sigmoid;
                leavesCount = Math.max(2, Math.round(2 + Math.floor(8 * sigmoid) * 2));
            } else if (currentFocusedZone === 3) {
                heightCm = 7.5 + 41.0 * sigmoid;
                leavesCount = Math.max(4, Math.round(4 + 32 * sigmoid));
            } else if (currentFocusedZone === 4) {
                heightCm = 6.0 + 34.0 * sigmoid;
                leavesCount = Math.max(4, Math.round(4 + 28 * sigmoid));
            }

            const hEl = document.getElementById('inspector3DHeight');
            const lEl = document.getElementById('inspector3DLeaves');
            if (hEl) hEl.textContent = `${heightCm.toFixed(1)} ซม.`;
            if (lEl) lEl.textContent = `${leavesCount} ใบ/ต้น`;
        }

        function toggle3DSprinklers() {
            sprinklerOn3D = !sprinklerOn3D;
            const btn = document.getElementById('btn3DSprinkler');
            if (btn) {
                btn.textContent = sprinklerOn3D ? '💦 สปริงเกลอร์ 3D: เปิด (ON)' : '💦 สปริงเกลอร์ 3D: ปิด (OFF)';
                btn.className = sprinklerOn3D
                    ? 'bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl transition';
            }
            showToast(sprinklerOn3D ? 'เปิดเอฟเฟกต์สปริงเกลอร์รดน้ำ 3 มิติแล้ว' : 'ปิดสปริงเกลอร์ 3 มิติแล้ว');
        }

        function toggle3DLightMode() {
            isNightMode3D = !isNightMode3D;
            const btn = document.getElementById('btn3DLightMode');
            if (threeScene && ambientLight3D && dirLight3D && greenhouseLight3D) {
                if (isNightMode3D) {
                    threeScene.background = new THREE.Color(0x020617);
                    threeScene.fog = new THREE.FogExp2(0x020617, 0.015);
                    ambientLight3D.intensity = 0.25;
                    if (hemiLight3D) hemiLight3D.intensity = 0.15;
                    dirLight3D.intensity = 0.2;
                    greenhouseLight3D.intensity = 2.4;
                    if (sunMesh3D) sunMesh3D.visible = false;
                    if (btn) btn.textContent = '🌙 แสงบรรยากาศ: กลางคืน + ไฟปลูกพืช LED';
                } else {
                    threeScene.background = new THREE.Color(0xdbeafe);
                    threeScene.fog = new THREE.FogExp2(0xe0f2fe, 0.005);
                    ambientLight3D.intensity = 1.25;
                    if (hemiLight3D) hemiLight3D.intensity = 1.05;
                    dirLight3D.intensity = 1.65;
                    greenhouseLight3D.intensity = 0.0;
                    if (sunMesh3D) sunMesh3D.visible = true;
                    if (btn) btn.textContent = '☀️ แสงบรรยากาศ: กลางวัน';
                }
            }
            showToast(isNightMode3D ? 'สลับเป็นโหมดกลางคืน + เปิดไฟโรงเรือน LED 3 มิติ' : 'สลับเป็นโหมดแสงอาทิตย์ตอนเช้าสว่างสดใส');
        }

        function toggle3DAutoRotate() {
            autoRotate3D = !autoRotate3D;
            showToast(autoRotate3D ? 'เปิดการหมุนมุมกล้อง 3 มิติอัตโนมัติ' : 'หยุดหมุนมุมกล้องอัตโนมัติ');
        }

        function toggle3DGreenhouseFrame() {
            showGreenhouseFrame = !showGreenhouseFrame;
            if (greenhouseMesh3D) {
                greenhouseMesh3D.visible = showGreenhouseFrame;
            }
            const btn = document.getElementById('btn3DGreenhouse');
            if (btn) {
                btn.textContent = showGreenhouseFrame ? '🏛️ กรอบโรงเรือน: แสดงอยู่ (เปิด)' : '🏛️ กรอบโรงเรือน: ซ่อนแล้ว (ปิด)';
                btn.className = showGreenhouseFrame
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow'
                    : 'bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl transition';
            }
            showToast(showGreenhouseFrame ? 'เปิดแสดงโครงโรงเรือนโปร่งแสงครอบแปลงที่ 2' : 'ซ่อนกรอบโรงเรือนสีขาวเรียบร้อย (แปลงเปิดโล่ง)');
        }

        // (TREE_PRESETS ถูกแยกเก็บไว้ในไฟล์ js/config-data.js แล้ว)

        function changeTreePreset(presetKey) {
            currentTreePresetKey = presetKey || 'preset1';
            const list = TREE_PRESETS[currentTreePresetKey] || TREE_PRESETS.preset1;
            plots = JSON.parse(JSON.stringify(list));
            saveData();
            renderPlotSelectors();
            renderBlueprint();
            renderKanban();
            renderOverview();
            renderDashboard();
            renderPlotsTable();

            const p1 = document.getElementById('btnFocusP1');
            const p2 = document.getElementById('btnFocusP2');
            const p3 = document.getElementById('btnFocusP3');
            const p4 = document.getElementById('btnFocusP4');
            if (p1 && list[0]) p1.textContent = `${list[0].icon} แปลง 1 ${list[0].shortName || ''}`;
            if (p2 && list[1]) p2.textContent = `${list[1].icon} แปลง 2 ${list[1].shortName || ''}`;
            if (p3 && list[2]) p3.textContent = `${list[2].icon} แปลง 3 ${list[2].shortName || ''}`;
            if (p4 && list[3]) p4.textContent = `${list[3].icon} แปลง 4 ${list[3].shortName || ''}`;

            rebuildAll3DTrees();
            focus3DCamera(0);
            if (typeof init30MinTelemetryData === 'function') { init30MinTelemetryData(true); render30MinReport(); }
            showToast(`เปลี่ยนโมเดลต้นไม้ 3D และชุดพันธุ์ไม้เป็น: ${document.getElementById('selectTreePreset').selectedOptions[0].text}`);
        }

        function focus3DCamera(zoneIdx) {
            currentFocusedZone = zoneIdx || 0;
            const coords = [
                { x: 0, z: 0, r: 25 },
                { x: -6.2, z: -4.8, r: 12.2 },
                { x: 6.2, z: -4.8, r: 12.2 },
                { x: -6.2, z: 4.5, r: 12.2 },
                { x: 6.2, z: 4.5, r: 12.2 }
            ];
            const c = coords[zoneIdx] || coords[0];
            camTarget = { x: c.x, y: 1.1, z: c.z };
            camRadius = c.r;

            let title = '🌍 ภาพรวมแปลงเพาะปลูกต้นไม้ จ.นครพนม';
            let sub = 'แสดงแปลงเพาะปลูกต้นไม้ทั้งหมด 4 โซน';
            if (zoneIdx >= 1 && zoneIdx <= 4 && plots[zoneIdx - 1]) {
                const p = plots[zoneIdx - 1];
                title = `${p.icon} ${p.name}`;
                sub = p.zone;
            }

            const titleEl = document.getElementById('inspector3DTitle');
            const zoneEl = document.getElementById('inspector3DZone');
            if (titleEl) titleEl.textContent = title;
            if (zoneEl) zoneEl.textContent = sub;

            const slider = document.getElementById('slider3DGrowth');
            update3DGrowthStage(slider ? slider.value : 90);
            showToast(`ซูมกล้อง 3 มิติไปยัง: ${title}`);
        }

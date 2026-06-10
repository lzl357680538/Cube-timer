/* Square-1 3D viewer based on csTimer's twistysq1 facelet model. */
window.Sq1Viewer = (function() {
    const TAU = Math.PI * 2;
    const containerId = 'sq1Viewer';

    const hsq3 = Math.sqrt(3) / 2;
    const amp = 1.5;
    const wg = 0.05;
    const ws = 0.6;
    const w = 1 + hsq3;
    const h = Math.sqrt(2) + Math.sqrt(6);
    const hh = h / 2;
    const lof = (3 + Math.sqrt(3)) / 4;
    const hm = hh - ws * 2;

    const sp = [
        [0, 1 - wg * 2],
        [-0.5 + wg, -hsq3 + wg * hsq3],
        [0.5 - wg, -hsq3 + wg * hsq3]
    ];
    const lp = [
        [1 - wg * 2, 1 - wg * 2],
        [-hsq3 + wg * hsq3, 0.5 - wg],
        [-hsq3 + wg * hsq3, -hsq3 + wg * hsq3],
        [0.5 - wg, -hsq3 + wg * hsq3]
    ];
    const ss = [
        [-0.5 + wg, ws - wg],
        [-0.5 + wg, -ws + wg],
        [0.5 - wg, -ws + wg],
        [0.5 - wg, ws - wg]
    ];
    const ls = [
        [-(0.5 + hsq3) / 2 + wg, ws - wg],
        [-(0.5 + hsq3) / 2 + wg, -ws + wg],
        [(0.5 + hsq3) / 2 - wg, -ws + wg],
        [(0.5 + hsq3) / 2 - wg, ws - wg]
    ];
    const mf = [
        [-w + wg, hm - wg],
        [-w + wg, -hm + wg],
        [w - wg, -hm + wg],
        [w - wg, hm - wg]
    ];
    const lm = [
        [-(1.5 + hsq3) / 2 + wg, hm - wg],
        [-(1.5 + hsq3) / 2 + wg, -hm + wg],
        [(1.5 + hsq3) / 2 - wg, -hm + wg],
        [(1.5 + hsq3) / 2 - wg, hm - wg]
    ];
    const sm = [
        [-(0.5 + hsq3) / 2 + wg, hm - wg],
        [-(0.5 + hsq3) / 2 + wg, -hm + wg],
        [(0.5 + hsq3) / 2 - wg, -hm + wg],
        [(0.5 + hsq3) / 2 - wg, hm - wg]
    ];

    const facelets = [
        [
            [sp, 0, -1, hh, 0],
            [lp, -1, -1, hh, 0],
            [sp, 0, -1, hh, 1],
            [lp, -1, -1, hh, 1],
            [sp, 0, -1, hh, 2],
            [lp, -1, -1, hh, 2],
            [sp, 0, -1, hh, 3],
            [lp, -1, -1, hh, 3]
        ],
        [
            [ss, 0, hh - ws, w, 0],
            [ls, lof, hh - ws, w, 0],
            [ls, -lof, hh - ws, w, 0],
            [ss, 0, hh - ws, w, 2],
            [ls, lof, hh - ws, w, 2],
            [ls, -lof, hh - ws, w, 2],
            [mf, 0, 0, w, 0]
        ],
        [
            [ss, 0, hh - ws, w, 0],
            [ls, lof, hh - ws, w, 0],
            [ls, -lof, hh - ws, w, 0],
            [ss, 0, hh - ws, w, 2],
            [ls, lof, hh - ws, w, 2],
            [ls, -lof, hh - ws, w, 2],
            [lm, lof - 0.5, 0, w, 0],
            [sm, -lof, 0, w, 0]
        ],
        [
            [ss, 0, hh - ws, w, 0],
            [ls, lof, hh - ws, w, 0],
            [ls, -lof, hh - ws, w, 0],
            [ss, 0, hh - ws, w, 2],
            [ls, lof, hh - ws, w, 2],
            [ls, -lof, hh - ws, w, 2],
            [mf, 0, 0, w, 0]
        ],
        [
            [ss, 0, hh - ws, w, 0],
            [ls, lof, hh - ws, w, 0],
            [ls, -lof, hh - ws, w, 0],
            [ss, 0, hh - ws, w, 2],
            [ls, lof, hh - ws, w, 2],
            [ls, -lof, hh - ws, w, 2],
            [lm, lof - 0.5, 0, w, 0],
            [sm, -lof, 0, w, 0]
        ],
        [
            [sp, 0, -1, hh, 0],
            [lp, -1, -1, hh, 0],
            [sp, 0, -1, hh, 1],
            [lp, -1, -1, hh, 1],
            [sp, 0, -1, hh, 2],
            [lp, -1, -1, hh, 2],
            [sp, 0, -1, hh, 3],
            [lp, -1, -1, hh, 3]
        ]
    ];

    // csTimer maps SQ1 colors from colsq1 [U,R,F,D,L,B] to twisty face order [U,L,F,R,B,D].
    const faceColors = [0xffe11f, 0x2563eb, 0xef4444, 0x22c55e, 0xff8a00, 0xffffff];
    const indexSide = ['U', 'L', 'F', 'R', 'B', 'D'];

    let container;
    let scene;
    let camera;
    let renderer;
    let controls;
    let viewport;
    let playButton;
    let progressInput;
    let stepLabel;
    let prevStepButton;
    let nextStepButton;
    let root;
    let cubePieces;
    let animationFrame;
    let allMoves = [];
    let currentMoveIndex = 0;
    let moveQueue = [];
    let activeMove = null;
    let activeMoveItems = [];
    let moveStartTime = 0;
    let moveDuration = 180;
    let isPlaying = false;
    let pausedAt = 0;
    let resizeObserver;
    let standalone3dLink = null;

    function axify(v1, v2, v3) {
        return new THREE.Matrix4().set(
            v1.x, v2.x, v3.x, 0,
            v1.y, v2.y, v3.y, 0,
            v1.z, v2.z, v3.z, 0,
            0, 0, 0, 1
        );
    }

    function makeShapeGeometry(points) {
        const shape = new THREE.Shape();
        shape.moveTo(points[0][0] * amp, points[0][1] * amp);
        for (let i = 1; i < points.length; i++) {
            shape.lineTo(points[i][0] * amp, points[i][1] * amp);
        }
        shape.closePath();
        return new THREE.ShapeGeometry(shape);
    }

    function makeSticker(points, material) {
        const sticker = new THREE.Object3D();
        const geometry = makeShapeGeometry(points);
        const mesh = new THREE.Mesh(geometry, material);
        const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry),
            new THREE.LineBasicMaterial({ color: 0x172033, transparent: true, opacity: 0.85 })
        );

        mesh.renderOrder = 2;
        sticker.add(mesh);
        sticker.add(edges);
        sticker.matrixAutoUpdate = false;
        return sticker;
    }

    function matrixPositionDot(matrix, vector) {
        const e = matrix.elements;
        return e[12] * vector.x + e[13] * vector.y + e[14] * vector.z;
    }

    function applyMatrixToSticker(stickerRecord, matrix) {
        stickerRecord.base.premultiply(matrix);
        stickerRecord.object.matrix.copy(stickerRecord.base);
        stickerRecord.object.updateMatrixWorld(true);
    }

    function previewMatrixOnSticker(stickerRecord, matrix) {
        stickerRecord.object.matrix.copy(stickerRecord.base).premultiply(matrix);
        stickerRecord.object.updateMatrixWorld(true);
    }

    function isTwistable() {
        const normVector = axisList()[0];
        for (let faceIndex = 0; faceIndex < cubePieces.length; faceIndex++) {
            const faceStickers = cubePieces[faceIndex];
            for (let stickerIndex = 0; stickerIndex < faceStickers.length; stickerIndex++) {
                const layer = matrixPositionDot(faceStickers[stickerIndex].object.matrix, normVector);
                if (Math.abs(layer) < 0.01) {
                    return false;
                }
            }
        }
        return true;
    }

    function axisList() {
        return [
            new THREE.Vector3(Math.cos(TAU / 24), 0, Math.sin(TAU / 24)).normalize(),
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(Math.sin(TAU / 24), 0, -Math.cos(TAU / 24)).normalize()
        ];
    }

    function advanceMove(move) {
        if (!cubePieces || (!isTwistable() && move[0] === 0 && move[2] === 0)) {
            return;
        }

        const axes = axisList();
        const normVector = axes[move[0]];
        const fullStep = TAU / 12 * move[1];
        const rotation = new THREE.Matrix4().makeRotationAxis(normVector, -fullStep);

        for (let faceIndex = 0; faceIndex < cubePieces.length; faceIndex++) {
            const faceStickers = cubePieces[faceIndex];
            for (let stickerIndex = 0; stickerIndex < faceStickers.length; stickerIndex++) {
                const sticker = faceStickers[stickerIndex];
                const layer = matrixPositionDot(sticker.object.matrix, normVector);
                if (layer > move[2] && layer < move[3]) {
                    applyMatrixToSticker(sticker, rotation);
                }
            }
        }
    }

    function collectMoveStickers(move) {
        if (!cubePieces || (!isTwistable() && move[0] === 0 && move[2] === 0)) {
            return [];
        }

        const normVector = axisList()[move[0]];
        const stickers = [];
        for (let faceIndex = 0; faceIndex < cubePieces.length; faceIndex++) {
            const faceStickers = cubePieces[faceIndex];
            for (let stickerIndex = 0; stickerIndex < faceStickers.length; stickerIndex++) {
                const sticker = faceStickers[stickerIndex];
                const layer = matrixPositionDot(sticker.object.matrix, normVector);
                if (layer > move[2] && layer < move[3]) {
                    stickers.push(sticker);
                }
            }
        }
        return stickers;
    }

    function collectStepItems(step) {
        const items = [];
        for (let i = 0; i < step.length; i++) {
            const stickers = collectMoveStickers(step[i]);
            if (stickers.length > 0) {
                items.push({ move: step[i], stickers });
            }
        }
        return items;
    }

    function startNextMove(now) {
        activeMove = null;
        activeMoveItems = [];

        while (moveQueue.length > 0 && activeMoveItems.length === 0) {
            const step = moveQueue.shift();
            activeMoveItems = collectStepItems(step);
            if (activeMoveItems.length > 0) {
                activeMove = step;
            } else {
                currentMoveIndex++;
            }
        }

        if (!activeMove && moveQueue.length === 0) {
            isPlaying = false;
        }
        moveStartTime = now;
        updatePlaybackControls();
    }

    function finishActiveMove() {
        if (!activeMove) {
            return;
        }

        activeMoveItems.forEach(item => {
            const normVector = axisList()[item.move[0]];
            const fullStep = TAU / 12 * item.move[1];
            const rotation = new THREE.Matrix4().makeRotationAxis(normVector, -fullStep);
            item.stickers.forEach(sticker => applyMatrixToSticker(sticker, rotation));
        });
        currentMoveIndex++;
        activeMove = null;
        activeMoveItems = [];
        updatePlaybackControls();
    }

    function updateScrambleAnimation(now) {
        if (!isPlaying || !cubePieces || (!activeMove && moveQueue.length === 0)) {
            return;
        }

        if (!activeMove) {
            startNextMove(now);
            if (!activeMove) {
                return;
            }
        }

        const progress = Math.min((now - moveStartTime) / moveDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        activeMoveItems.forEach(item => {
            const normVector = axisList()[item.move[0]];
            const fullStep = TAU / 12 * item.move[1];
            const rotation = new THREE.Matrix4().makeRotationAxis(normVector, -fullStep * eased);
            item.stickers.forEach(sticker => previewMatrixOnSticker(sticker, rotation));
        });

        if (progress >= 1) {
            finishActiveMove();
            startNextMove(now);
        }
    }

    function updatePlaybackControls() {
        const currentStep = Math.min(currentMoveIndex, allMoves.length);
        if (progressInput) {
            progressInput.max = String(allMoves.length);
            progressInput.value = String(currentStep);
        }
        if (stepLabel) {
            stepLabel.textContent = `${currentStep} / ${allMoves.length}`;
        }
        if (playButton) {
            playButton.textContent = isPlaying && (activeMove || moveQueue.length > 0) ? '暂停' : '播放';
            playButton.disabled = allMoves.length === 0;
        }
        if (prevStepButton) {
            prevStepButton.disabled = currentStep <= 0;
        }
        if (nextStepButton) {
            nextStepButton.disabled = currentStep >= allMoves.length;
        }
    }

    function resetAnimationState() {
        moveQueue = [];
        activeMove = null;
        activeMoveItems = [];
        currentMoveIndex = 0;
        isPlaying = false;
        pausedAt = 0;
    }

    function rebuildToStep(step) {
        if (!renderer) {
            return;
        }

        const targetStep = Math.max(0, Math.min(step, allMoves.length));
        clearScene(false);
        buildCube();
        for (let i = 0; i < targetStep; i++) {
            allMoves[i].forEach(advanceMove);
        }
        currentMoveIndex = targetStep;
        moveQueue = [];
        activeMove = null;
        activeMoveItems = [];
        isPlaying = false;
        updatePlaybackControls();
    }

    function playFromCurrent() {
        if (activeMove && activeMoveItems.length > 0) {
            isPlaying = true;
            if (pausedAt) {
                moveStartTime += performance.now() - pausedAt;
                pausedAt = 0;
            }
            updatePlaybackControls();
            return;
        }

        if (currentMoveIndex >= allMoves.length) {
            rebuildToStep(0);
        }
        moveQueue = allMoves.slice(currentMoveIndex);
        activeMove = null;
        activeMoveItems = [];
        isPlaying = true;
        pausedAt = 0;
        moveStartTime = performance.now();
        updatePlaybackControls();
    }

    function pausePlayback() {
        isPlaying = false;
        pausedAt = performance.now();
        updatePlaybackControls();
    }

    function togglePlayback() {
        if (isPlaying) {
            pausePlayback();
        } else {
            playFromCurrent();
        }
    }



    function createStandalone3dLink() {
        const link = document.createElement('a');
        link.className = 'sq1-3d-link';
        link.textContent = '3D';
        link.href = 'sq1-3d.html';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        return link;
    }

    function updateStandalone3dLink(scramble) {
        if (!standalone3dLink) {
            return;
        }
        const alg = (scramble || '').trim();
        standalone3dLink.href = alg ? `sq1-3d.html?alg=${encodeURIComponent(alg)}` : 'sq1-3d.html';
    }

    function parseScramble(scramble) {
        if (!scramble || /^\s*$/.test(scramble)) {
            return [];
        }

        const sqre = /(\/)|\((-?\d+), *(-?\d+)\)|(y'?2)/g;
        const steps = [];
        scramble.replace(sqre, function(match, slash, top, bottom, y2) {
            if (slash) {
                steps.push([[0, 6, 0, 5]]);
            } else if (y2) {
                steps.push([[1, y2[1] === "'" ? -6 : 6, -5, 5]]);
            } else {
                const u = Number.parseInt(top, 10);
                const d = Number.parseInt(bottom, 10);
                const step = [];
                if (u !== 0) {
                    step.push([1, u, 1, 5]);
                }
                if (d !== 0) {
                    step.push([2, d, 1, 5]);
                }
                if (step.length > 0) {
                    steps.push(step);
                }
            }
            return match;
        });
        return steps;
    }

    function buildCube() {
        const xx = new THREE.Vector3(1, 0, 0);
        const yy = new THREE.Vector3(0, 1, 0);
        const zz = new THREE.Vector3(0, 0, 1);
        const xxi = new THREE.Vector3(-1, 0, 0);
        const yyi = new THREE.Vector3(0, -1, 0);
        const zzi = new THREE.Vector3(0, 0, -1);

        const sidesRotAxis = {
            U: yyi,
            L: xx,
            F: zzi,
            R: xxi,
            B: zz,
            D: yy
        };
        const sidesUV = [
            axify(xx, zzi, yy),
            axify(zz, yy, xxi),
            axify(xx, yy, zz),
            axify(zzi, yy, xx),
            axify(xxi, yy, zzi),
            axify(xx, zz, yyi)
        ];

        root = new THREE.Object3D();
        root.scale.setScalar(0.5);
        cubePieces = [];

        const materials = faceColors.map(color => new THREE.MeshPhongMaterial({
            color,
            side: THREE.DoubleSide,
            shininess: 35
        }));

        for (let faceIndex = 0; faceIndex < facelets.length; faceIndex++) {
            const facePieces = [];
            cubePieces.push(facePieces);

            for (let stickerIndex = 0; stickerIndex < facelets[faceIndex].length; stickerIndex++) {
                const facelet = facelets[faceIndex][stickerIndex];
                const sticker = makeSticker(facelet[0], materials[faceIndex]);
                const side = indexSide[faceIndex];
                const rotation = new THREE.Matrix4().makeRotationAxis(sidesRotAxis[side], TAU / 4 * facelet[4]);
                const translation = new THREE.Matrix4().makeTranslation(
                    facelet[1] * amp,
                    facelet[2] * amp,
                    facelet[3] * amp
                );
                const transform = rotation.clone().multiply(sidesUV[faceIndex]).multiply(translation);

                sticker.matrix.copy(transform);
                sticker.updateMatrixWorld(true);
                root.add(sticker);
                facePieces.push({ base: transform.clone(), object: sticker });
            }
        }

        scene.add(root);
    }

    function clearScene(resetPlayback = true) {
        if (resetPlayback) {
            resetAnimationState();
        }

        if (root) {
            scene.remove(root);
            root.traverse(object => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    object.material.dispose();
                }
            });
        }
        root = null;
        cubePieces = null;
    }

    function resize() {
        if (!container || !renderer || !camera) {
            return;
        }
        const target = viewport || container;
        const width = Math.max(target.clientWidth || 420, 260);
        const height = Math.max(target.clientHeight || 360, 240);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
    }

    function renderLoop() {
        animationFrame = requestAnimationFrame(renderLoop);
        updateScrambleAnimation(performance.now());
        if (controls) {
            controls.update();
        }
        renderer.render(scene, camera);
    }

    function bindSharedPlayback() {
        prevStepButton = document.getElementById('sq1PrevStepBtn');
        playButton = document.getElementById('sq1PlayPauseBtn');
        progressInput = document.getElementById('sq1ProgressSlider');
        stepLabel = document.getElementById('sq1StepCounter');
        nextStepButton = document.getElementById('sq1NextStepBtn');
    }

    // Expose playback methods for the unified controller
    window.Sq1Playback = {
        toggle: togglePlayback,
        seekTo: function(idx) { rebuildToStep(Number(idx)); },
        refreshControls: updatePlaybackControls,
        getState: function() {
            return {
                current: Math.min(currentMoveIndex, allMoves.length),
                total: allMoves.length,
                playing: isPlaying && (activeMove || moveQueue.length > 0)
            };
        }
    };

    function init() {
        if (renderer) {
            resize();
            return;
        }

        container = document.getElementById(containerId);
        if (!container || !window.THREE) {
            return;
        }

        container.innerHTML = '';
        viewport = document.createElement('div');
        viewport.className = 'sq1-viewport';
        standalone3dLink = createStandalone3dLink();
        container.append(viewport, standalone3dLink);
        bindSharedPlayback();

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf8faff);

        camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.set(0, 5.8, 5.8);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputEncoding = THREE.sRGBEncoding;
        viewport.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.78));

        const keyLight = new THREE.DirectionalLight(0xffffff, 0.92);
        keyLight.position.set(4, 7, 5);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xbdd7ff, 0.5);
        fillLight.position.set(-5, 2, -3);
        scene.add(fillLight);

        if (THREE.OrbitControls) {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.enablePan = false;
            controls.minDistance = 3.2;
            controls.maxDistance = 10;
            controls.target.set(0, -0.08, 0);
        }

        if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(resize);
            resizeObserver.observe(container);
        } else {
            window.addEventListener('resize', resize);
        }
        resize();
        renderLoop();
        updatePlaybackControls();
    }

    function applyScramble(scramble) {
        init();
        if (!renderer) {
            return;
        }

        allMoves = parseScramble(scramble);
        rebuildToStep(allMoves.length);
        updateStandalone3dLink(scramble);
        renderer.render(scene, camera);
    }

    function applyScrambleAnimated(scramble) {
        init();
        if (!renderer) {
            return;
        }

        clearScene();
        buildCube();
        allMoves = parseScramble(scramble);
        currentMoveIndex = 0;
        moveQueue = allMoves.slice();
        activeMove = null;
        activeMoveItems = [];
        isPlaying = true;
        moveStartTime = performance.now();
        updateStandalone3dLink(scramble);
        updatePlaybackControls();
        renderer.render(scene, camera);
    }

    function show() {
        init();
        if (container) {
            container.style.display = 'flex';
            if (renderer && !root) {
                clearScene();
                buildCube();
                updatePlaybackControls();
                renderer.render(scene, camera);
            }
            resize();
        }
    }

    function hide() {
        if (container) {
            container.style.display = 'none';
        }
    }

    return {
        init,
        applyScramble,
        applyScrambleAnimated,
        show,
        hide
    };
})();

let solveTimesMap = { 
    '2x2': [], '3x3': [], '3x3oh': [], '4x4': [], '5x5': [], '6x6': [], '7x7': [],
    'clock': [], 'minx': [], 'pyram': [], 'skewb': [], 'sq1': [] 
};
let timerState = 'IDLE';
let startTime = 0;
let activeInterval = null;

function generateScrambleStr(type) {
    const modifiers = ['', "'", '2'];
    let n = parseInt(type[0]);
    if (type === '3x3oh') n = 3;
    let scramble = [];
    let lastAxis = -1;
    if (n === 2) {
        const moves = ['U', 'R', 'F'];
        let lastMove = '';
        for (let i = 0; i < 11; i++) {
            let move = moves[Math.floor(Math.random() * moves.length)];
            while (move === lastMove) move = moves[Math.floor(Math.random() * moves.length)];
            scramble.push(move + modifiers[Math.floor(Math.random() * modifiers.length)]);
            lastMove = move;
        }
        return scramble.join(' ');
    }
    const axes = [['U', 'D'], ['F', 'B'], ['L', 'R']];
    let allowedMoves = [[], [], []];
    for(let i = 0; i < 3; i++) {
        for(let face of axes[i]) {
            allowedMoves[i].push(face);
            if (n >= 4) allowedMoves[i].push(face + 'w');
            if (n >= 6) allowedMoves[i].push('3' + face + 'w');
        }
    }
    const lengths = {3: 20, 4: 45, 5: 60, 6: 80, 7: 100};
    let len = lengths[n];
    for (let i = 0; i < len; i++) {
        let axis = Math.floor(Math.random() * 3);
        while (axis === lastAxis) axis = Math.floor(Math.random() * 3);
        let move = allowedMoves[axis][Math.floor(Math.random() * allowedMoves[axis].length)];
        scramble.push(move + modifiers[Math.floor(Math.random() * modifiers.length)]);
        lastAxis = axis;
    }
    return scramble.join(' ');
}

function applyScramble(scrambleStr) {
    window.dispatchEvent(new CustomEvent('update-scramble', { detail: scrambleStr }));
}

async function handleRandomScramble() {
    const type = document.getElementById('cubeType').value;
    let scramble = "";
    if (['clock', 'minx', 'pyram', 'skewb', 'sq1'].includes(type)) {
        if (window.getOfficialScramble) {
            scramble = await window.getOfficialScramble(type);
        }
    } else {
        scramble = generateScrambleStr(type);
    }
    document.getElementById('displayText').innerText = scramble;
    
    const crossRes = document.getElementById('crossResult');
    if(crossRes) crossRes.innerText = ""; 

    applyScramble(scramble);
}

function getCurrentType() {
    return document.getElementById('cubeType').value;
}

function changeCubeType() {
    const type = getCurrentType();
    window.dispatchEvent(new CustomEvent('change-puzzle', { detail: type }));
    updateStatistics();
    handleRandomScramble();
}

function formatSolveTime(ms) {
    let totalSeconds = ms / 1000;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = (totalSeconds % 60).toFixed(3);
    return minutes > 0 ? (minutes + ":" + (seconds < 10 ? "0" : "") + seconds) : seconds;
}

function calculateMean(arr) {
    if (arr.length === 0) return "-";
    let sum = arr.reduce((a, b) => a + b, 0);
    return formatSolveTime(sum / arr.length);
}

function calculateAo12(arr) {
    if (arr.length < 12) return "-";
    let last12 = arr.slice(-12).sort((a, b) => a - b);
    let sum = 0;
    for (let i = 1; i < 11; i++) sum += last12[i];
    return formatSolveTime(sum / 10);
}

function updateStatistics() {
    const type = getCurrentType();
    const arr = solveTimesMap[type];
    document.getElementById('countDisplay').innerText = arr.length;
    document.getElementById('meanDisplay').innerText = calculateMean(arr);
    document.getElementById('ao12Display').innerText = calculateAo12(arr);
    let listHtml = "";
    arr.forEach((t, index) => {
        listHtml = `<li>
            <span>${index + 1}. ${formatSolveTime(t)}</span>
            <button class="delete-btn" onclick="deleteTime(${index}); this.blur();">✖</button>
        </li>` + listHtml;
    });
    document.getElementById('timeList').innerHTML = listHtml;
}

function deleteTime(index) {
    solveTimesMap[getCurrentType()].splice(index, 1);
    updateStatistics();
}

function clearCurrentTimes() {
    const type = getCurrentType();
    if(confirm(`确定要清空该项目的所有成绩吗？`)) {
        solveTimesMap[type] = [];
        updateStatistics();
    }
}

function updateInspection() {
    let elapsed = performance.now() - startTime;
    let left = 15 - Math.floor(elapsed / 1000);
    if (left <= 0) {
        clearInterval(activeInterval);
        document.getElementById('timerDisplay').innerText = "DNF";
        document.getElementById('timerDisplay').style.color = '#ff4c4c';
        timerState = 'IDLE';
    } else if (timerState === 'INSPECTING') {
        document.getElementById('timerDisplay').innerText = left;
    }
}

function solveCross() {
    const type = document.getElementById('cubeType').value;
    if (type !== '3x3') {
        document.getElementById('crossResult').innerText = "提示：目前仅支持 3x3x3 魔方的 Cross 求解。";
        return;
    }
    
    const currentScramble = document.getElementById('displayText').innerText;
    if (!currentScramble) {
        document.getElementById('crossResult').innerText = "请先生成或输入打乱公式！";
        return;
    }

    const color = document.getElementById('crossColor').value;
    document.getElementById('crossResult').innerText = "计算中...";
    
    setTimeout(() => {
        const start = performance.now();
        const solution = window.CrossSolver.solveBest(currentScramble, color);
        const timeTook = (performance.now() - start).toFixed(2);
        document.getElementById('crossResult').innerText = `${solution} (耗时: ${timeTook}ms)`;
    }, 10);
}

function updateTimer() {
    let currentTime = performance.now() - startTime;
    document.getElementById('timerDisplay').innerText = formatSolveTime(currentTime);
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
        e.preventDefault();
        if (document.activeElement) document.activeElement.blur();
        if (!e.repeat) {
            let displayEl = document.getElementById('timerDisplay');
            if (timerState === 'IDLE') {
                timerState = 'INSPECTING';
                displayEl.style.color = '#ff4c4c';
                displayEl.innerText = "15";
                startTime = performance.now();
                activeInterval = setInterval(updateInspection, 100);
            } else if (timerState === 'INSPECTING') {
                timerState = 'READY';
                displayEl.style.color = '#00D800';
            } else if (timerState === 'RUNNING') {
                clearInterval(activeInterval);
                timerState = 'STOPPED';
                let finalTime = performance.now() - startTime;
                solveTimesMap[getCurrentType()].push(finalTime);
                displayEl.innerText = formatSolveTime(finalTime);
                updateStatistics();
                handleRandomScramble();
            }
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
        e.preventDefault();
        if (timerState === 'READY') {
            clearInterval(activeInterval);
            timerState = 'RUNNING';
            document.getElementById('timerDisplay').style.color = 'white';
            startTime = performance.now();
            activeInterval = setInterval(updateTimer, 10);
        } else if (timerState === 'STOPPED') {
            timerState = 'IDLE';
        }
    }
});

function init() {
    if (window.viewerLoaded) {
        changeCubeType();
    } else {
        setTimeout(init, 50);
    }
}
init();
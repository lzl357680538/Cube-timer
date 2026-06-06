import { randomScrambleForEvent } from "https://cdn.cubing.net/js/cubing/scramble";
import "https://cdn.cubing.net/js/cubing/twisty";

const eventMap = {
    'clock': 'clock', 'minx': 'minx', 'pyram': 'pyram', 
    'skewb': 'skewb', 'sq1': 'sq1'
};

const player = document.getElementById('cubeViewer');

window.getOfficialScramble = async function(type) {
    const eventId = eventMap[type];
    if (!eventId) return "";
    try {
        const scramble = await randomScrambleForEvent(eventId);
        return scramble.toString();
    } catch (e) {
        return ""; 
    }
};

window.addEventListener('change-puzzle', (e) => {
    const type = e.detail;
    const puzzleMap = {
        '2x2': '2x2x2', '3x3': '3x3x3', '3x3oh': '3x3x3',
        '4x4': '4x4x4', '5x5': '5x5x5', '6x6': '6x6x6', '7x7': '7x7x7',
        'clock': 'clock', 'minx': 'megaminx', 'pyram': 'pyraminx',
        'skewb': 'skewb', 'sq1': 'square1'
    };
    
    player.alg = "";
    player.puzzle = puzzleMap[type] || '3x3x3';
    player.visualization = "3D";
});

window.addEventListener('update-scramble', (e) => {
    player.alg = e.detail;
});

window.viewerLoaded = true;
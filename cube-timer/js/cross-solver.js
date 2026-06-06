class CrossSolver {
    constructor() {
        this.solvedState = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
        this.solvedOri = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        this.moves = ['R', "R'", 'R2', 'L', "L'", 'L2', 'U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'B', "B'", 'B2'];
        this.setupsForColor = {
            'white': ['x2', 'x2 y', 'x2 y2', "x2 y'"],
            'yellow': ['', 'y', 'y2', "y'"],
            'green': ["x'", "x' y", "x' y2", "x' y'"],
            'blue': ['x', 'x y', 'x y2', "x y'"],
            'red': ['z', 'z y', 'z y2', "z y'"],
            'orange': ["z'", "z' y", "z' y2", "z' y'"]
        };
    }

    applyMove(state, ori, move) {
        let newState = [...state];
        let newOri = [...ori];
        const cycle = (arr, a, b, c, d) => {
            let temp = arr[d]; arr[d] = arr[c]; arr[c] = arr[b]; arr[b] = arr[a]; arr[a] = temp;
        };
        const flip = (arr, a, b, c, d) => {
            arr[a] ^= 1; arr[b] ^= 1; arr[c] ^= 1; arr[d] ^= 1;
        };

        const m = move[0];
        const times = move.includes('2') ? 2 : (move.includes("'") ? 3 : 1);

        for (let i = 0; i < times; i++) {
            if (m === 'U') { cycle(newState, 0, 3, 2, 1); cycle(newOri, 0, 3, 2, 1); }
            if (m === 'D') { cycle(newState, 4, 5, 6, 7); cycle(newOri, 4, 5, 6, 7); }
            if (m === 'F') { cycle(newState, 0, 9, 4, 8); cycle(newOri, 0, 9, 4, 8); flip(newOri, 0, 9, 4, 8); }
            if (m === 'B') { cycle(newState, 2, 11, 6, 10); cycle(newOri, 2, 11, 6, 10); flip(newOri, 2, 11, 6, 10); }
            if (m === 'L') { cycle(newState, 3, 8, 7, 11); cycle(newOri, 3, 8, 7, 11); }
            if (m === 'R') { cycle(newState, 1, 10, 5, 9); cycle(newOri, 1, 10, 5, 9); }
        }
        return { state: newState, ori: newOri };
    }

    applyScramble(scramble) {
        let state = [...this.solvedState];
        let ori = [...this.solvedOri];
        const moves = scramble.split(' ').filter(m => this.moves.includes(m));
        for (let move of moves) {
            const res = this.applyMove(state, ori, move);
            state = res.state;
            ori = res.ori;
        }
        return { state, ori };
    }

    isCrossSolved(state, ori) {
        const targets = [4, 5, 6, 7];
        const targetPos = [4, 5, 6, 7];
        for (let i = 0; i < 4; i++) {
            let currentPos = state.indexOf(targets[i]);
            if (currentPos !== targetPos[i] || ori[currentPos] !== 0) return false;
        }
        return true;
    }

    solve(scramble) {
        const start = this.applyScramble(scramble);
        if (this.isCrossSolved(start.state, start.ori)) return "Already Solved";

        let solution = null;
        const maxDepth = 8;
        
        const faceOrder = { 'U': 0, 'D': 1, 'L': 2, 'R': 3, 'F': 4, 'B': 5 };
        const opp = { 'U': 'D', 'D': 'U', 'L': 'R', 'R': 'L', 'F': 'B', 'B': 'F' };

        let currentState = [...start.state];
        let currentOri = [...start.ori];

        const cycle = (arr, a, b, c, d) => {
            let temp = arr[d]; arr[d] = arr[c]; arr[c] = arr[b]; arr[b] = arr[a]; arr[a] = temp;
        };
        const flip = (arr, a, b, c, d) => {
            arr[a] ^= 1; arr[b] ^= 1; arr[c] ^= 1; arr[d] ^= 1;
        };

        const doMove = (m, times) => {
            for (let i = 0; i < times; i++) {
                if (m === 'U') { cycle(currentState, 0, 3, 2, 1); cycle(currentOri, 0, 3, 2, 1); }
                else if (m === 'D') { cycle(currentState, 4, 5, 6, 7); cycle(currentOri, 4, 5, 6, 7); }
                else if (m === 'F') { cycle(currentState, 0, 9, 4, 8); cycle(currentOri, 0, 9, 4, 8); flip(currentOri, 0, 9, 4, 8); }
                else if (m === 'B') { cycle(currentState, 2, 11, 6, 10); cycle(currentOri, 2, 11, 6, 10); flip(currentOri, 2, 11, 6, 10); }
                else if (m === 'L') { cycle(currentState, 3, 8, 7, 11); cycle(currentOri, 3, 8, 7, 11); }
                else if (m === 'R') { cycle(currentState, 1, 10, 5, 9); cycle(currentOri, 1, 10, 5, 9); }
            }
        };

        const getHeuristic = () => {
            let h = 0;
            const targetEdges = [4, 5, 6, 7];
            for (let i = 0; i < 4; i++) {
                let pos = currentState.indexOf(targetEdges[i]);
                if (pos !== targetEdges[i] || currentOri[pos] !== 0) {
                    h++;
                }
            }
            return Math.ceil(h / 4);
        };

        const dfs = (g, limit, path) => {
            const h = getHeuristic();
            const f = g + h;
            
            if (f > limit) return f;
            
            if (this.isCrossSolved(currentState, currentOri)) {
                solution = path.join(' ');
                return -1;
            }

            let nextLimit = Infinity;
            let lastFace = path.length > 0 ? path[path.length - 1][0] : '';
            let prevFace = path.length > 1 ? path[path.length - 2][0] : '';

            for (let move of this.moves) {
                let face = move[0];

                if (face === lastFace) continue;
                if (opp[face] === lastFace && faceOrder[face] > faceOrder[lastFace]) continue;
                if (face === prevFace && opp[face] === lastFace) continue;

                const times = move.includes('2') ? 2 : (move.includes("'") ? 3 : 1);
                const undoTimes = 4 - times;

                doMove(face, times);
                path.push(move);
                
                let res = dfs(g + 1, limit, path);
                if (res === -1) return -1;
                if (res < nextLimit) nextLimit = res;
                
                path.pop();
                doMove(face, undoTimes);
            }
            return nextLimit;
        };

        for (let limit = 0; limit <= maxDepth; ) {
            let res = dfs(0, limit, []);
            if (res === -1) return solution;
            if (res === Infinity) break;
            limit = res;
        }

        return "Cross calculation failed or takes > 8 moves.";
    }

    mapFace(face, setup) {
        let current = face;
        let moves = setup.split(' ').filter(m => m);
        for (let m of moves) {
            if (m === 'x') current = {U:'B', F:'U', D:'F', B:'D', R:'R', L:'L'}[current];
            if (m === "x'") current = {U:'F', F:'D', D:'B', B:'U', R:'R', L:'L'}[current];
            if (m === 'x2') current = {U:'D', F:'B', D:'U', B:'F', R:'R', L:'L'}[current];
            if (m === 'y') current = {U:'U', D:'D', F:'L', R:'F', B:'R', L:'B'}[current];
            if (m === "y'") current = {U:'U', D:'D', F:'R', R:'B', B:'L', L:'F'}[current];
            if (m === 'y2') current = {U:'U', D:'D', F:'B', R:'L', B:'F', L:'R'}[current];
            if (m === 'z') current = {U:'R', F:'F', D:'L', B:'B', R:'D', L:'U'}[current];
            if (m === "z'") current = {U:'L', F:'F', D:'R', B:'B', R:'U', L:'D'}[current];
            if (m === 'z2') current = {U:'D', F:'F', D:'U', B:'B', R:'L', L:'R'}[current];
        }
        return current;
    }

    mapScramble(scramble, setup) {
        return scramble.split(' ').map(move => {
            if (!move) return '';
            let base = move[0];
            let suffix = move.substring(1);
            return this.mapFace(base, setup) + suffix;
        }).join(' ').trim();
    }

    scoreSolution(sol) {
        if (!sol) return 9999;
        let fb = 0, rl = 0;
        let moves = sol.split(' ');
        for (let m of moves) {
            if (m.startsWith('F') || m.startsWith('B')) fb++;
            if (m.startsWith('R') || m.startsWith('L')) rl++;
        }
        return fb * 100 - rl;
    }

    solveBest(scramble, color) {
        let setups = this.setupsForColor[color] || this.setupsForColor['white'];
        let bestSetup = '';
        let bestSol = null;
        let bestScore = Infinity;

        for (let setup of setups) {
            let mappedScramble = this.mapScramble(scramble, setup);
            let sol = this.solve(mappedScramble);
            
            if (sol && !sol.includes("failed")) {
                let score = this.scoreSolution(sol);
                if (score < bestScore) {
                    bestScore = score;
                    bestSol = sol;
                    bestSetup = setup;
                }
            }
        }

        if (!bestSol) return "Cross calculation failed.";
        if (bestSol === "Already Solved") return bestSetup ? `${bestSetup} (已完成)` : "已完成";
        return bestSetup ? `${bestSetup}   ${bestSol}` : bestSol;
    }
}

window.CrossSolver = new CrossSolver();
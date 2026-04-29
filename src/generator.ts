import { BlockData } from './levels';

export function getConstraints(block: BlockData, blocks: BlockData[], isGhost: boolean = false) {
    let minGrid = 0;
    let maxGrid = 6 - block.size;
    
    if (block.dir === 'H') {
        const obstaclesLeft: number[] = [];
        const obstaclesRight: number[] = [];

        for (let i=0; i<blocks.length; i++) {
            const b = blocks[i];
            if (b.id === block.id) continue;
            const bMinY = b.y;
            const bMaxY = b.dir === 'V' ? b.y + b.size - 1 : b.y;
            
            if (block.y >= bMinY && block.y <= bMaxY) {
                const bMinX = b.x;
                const bMaxX = b.dir === 'H' ? b.x + b.size - 1 : b.x;
                
                if (bMaxX < block.x) {
                    obstaclesLeft.push(bMaxX + 1);
                } else if (bMinX > block.x) {
                    obstaclesRight.push(bMinX - block.size);
                }
            }
        }

        if (obstaclesLeft.length > 0) {
            obstaclesLeft.sort((a, b) => b - a); // Closest first
            if (isGhost) {
                // Skip one obstacle
                minGrid = obstaclesLeft.length > 1 ? obstaclesLeft[1] : 0;
            } else {
                minGrid = obstaclesLeft[0];
            }
        }

        if (obstaclesRight.length > 0) {
            obstaclesRight.sort((a, b) => a - b); // Closest first
            if (isGhost) {
                // Skip one obstacle
                maxGrid = obstaclesRight.length > 1 ? obstaclesRight[1] : 6 - block.size;
            } else {
                maxGrid = obstaclesRight[0];
            }
        }
    } else {
        const obstaclesAbove: number[] = [];
        const obstaclesBelow: number[] = [];

        for (let i=0; i<blocks.length; i++) {
            const b = blocks[i];
            if (b.id === block.id) continue;
            const bMinX = b.x;
            const bMaxX = b.dir === 'H' ? b.x + b.size - 1 : b.x;
            
            if (block.x >= bMinX && block.x <= bMaxX) {
                const bMinY = b.y;
                const bMaxY = b.dir === 'V' ? b.y + b.size - 1 : b.y;
                
                if (bMaxY < block.y) {
                    obstaclesAbove.push(bMaxY + 1);
                } else if (bMinY > block.y) {
                    obstaclesBelow.push(bMinY - block.size);
                }
            }
        }

        if (obstaclesAbove.length > 0) {
            obstaclesAbove.sort((a, b) => b - a);
            if (isGhost) {
                minGrid = obstaclesAbove.length > 1 ? obstaclesAbove[1] : 0;
            } else {
                minGrid = obstaclesAbove[0];
            }
        }

        if (obstaclesBelow.length > 0) {
            obstaclesBelow.sort((a, b) => a - b);
            if (isGhost) {
                maxGrid = obstaclesBelow.length > 1 ? obstaclesBelow[1] : 6 - block.size;
            } else {
                maxGrid = obstaclesBelow[0];
            }
        }
    }
    return { minGrid, maxGrid };
}

export function solve(blocks: BlockData[]): number {
    const targetId = blocks.find(b => b.type === 'target')?.id;
    if (!targetId) return -1;
    const targetIndex = blocks.findIndex(b => b.id === targetId);

    const initialState = blocks.map(b => b.dir === 'H' ? b.x : b.y);
    let queue: { state: number[], depth: number }[] = [{ state: initialState, depth: 0 }];
    const visited = new Set<string>();
    visited.add(initialState.join(','));

    let iterations = 0;
    let head = 0; // use index instead of shift for performance

    const tempBlocks = blocks.map(b => ({ ...b }));

    while (head < queue.length && iterations < 3000) {
        iterations++;
        const { state, depth } = queue[head++];

        // Target reached x = 4 (for size 2 block in 6x6 grid)
        if (state[targetIndex] === 4) return depth;

        for (let i = 0; i < tempBlocks.length; i++) {
            if (tempBlocks[i].dir === 'H') tempBlocks[i].x = state[i];
            else tempBlocks[i].y = state[i];
        }

        for (let i = 0; i < tempBlocks.length; i++) {
            const b = tempBlocks[i];
            const { minGrid, maxGrid } = getConstraints(b, tempBlocks);
            for (let pos = minGrid; pos <= maxGrid; pos++) {
                if (pos !== state[i]) {
                    const newState = [...state];
                    newState[i] = pos;
                    const key = newState.join(',');
                    if (!visited.has(key)) {
                        visited.add(key);
                        queue.push({ state: newState, depth: depth + 1 });
                    }
                }
            }
        }
    }
    return -1;
}

export function generateLevel(levelNum: number): { blocks: BlockData[], maxMoves: number, minMoves: number } {
    let seed = levelNum * 99991 + 12345;
    const random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    const targetDifficulty = Math.min(8 + Math.floor(levelNum * 1.5), 35);
    
    let bestBlocks: BlockData[] = [];
    let bestMoves = -1;

    for (let tries = 0; tries < 45; tries++) {
        let blocks: BlockData[] = [{ id: 1, x: 4, y: 2, size: 2, dir: 'H', type: 'target' }];
        const numObstacles = Math.min(14, 7 + Math.floor(levelNum / 2));
        
        for(let i=0; i<numObstacles; i++) {
            let attempts = 0;
            while(attempts < 15) {
                attempts++;
                const size = random() > 0.75 ? 3 : 2;
                const dir = random() > 0.5 ? 'H' : 'V';
                const x = Math.floor(random() * (dir === 'H' ? 7 - size : 6));
                const y = Math.floor(random() * (dir === 'V' ? 7 - size : 6));
                
                if (y === 2 && dir === 'V' && x > 4) continue; 
                if (y === 2 && dir === 'H') continue;
                
                let overlap = false;
                for (const b of blocks) {
                    const bMinX = b.x, bMaxX = b.dir === 'H' ? b.x + b.size - 1 : b.x;
                    const bMinY = b.y, bMaxY = b.dir === 'V' ? b.y + b.size - 1 : b.y;
                    const newMinX = x, newMaxX = dir === 'H' ? x + size - 1 : x;
                    const newMinY = y, newMaxY = dir === 'V' ? y + size - 1 : y;
                    if (!(newMaxX < bMinX || newMinX > bMaxX || newMaxY < bMinY || newMinY > bMaxY)) {
                        overlap = true;
                        break;
                    }
                }
                if (!overlap) {
                    blocks.push({ id: i+2, x, y, size, dir, type: 'obstacle' });
                    break;
                }
            }
        }

        const shuffleSteps = 30 + levelNum * 5;
        for(let s=0; s<shuffleSteps; s++) {
            const allMoves: {id: number, pos: number}[] = [];
            for (const b of blocks) {
                const { minGrid, maxGrid } = getConstraints(b, blocks);
                const curr = b.dir === 'H' ? b.x : b.y;
                for (let pos = minGrid; pos <= maxGrid; pos++) {
                    if (pos !== curr) {
                        let weight = 1;
                        if (b.type === 'target' && pos < curr) weight = 5; 
                        for (let w=0; w<weight; w++) allMoves.push({ id: b.id, pos });
                    }
                }
            }
            if (allMoves.length > 0) {
                const move = allMoves[Math.floor(random() * allMoves.length)];
                const block = blocks.find(b => b.id === move.id)!;
                if (block.dir === 'H') block.x = move.pos;
                else block.y = move.pos;
            }
        }
        
        const target = blocks.find(b => b.type === 'target')!;
        if (target.x <= 3) {
            const moves = solve(blocks);
            if (moves > bestMoves) {
                bestMoves = moves;
                bestBlocks = blocks.map(b => ({...b}));
            }
            if (bestMoves >= targetDifficulty) {
                break; // Found a hard enough level
            }
        }
    }
    
    // In case logic breaks or difficulty is unreachable after tries
    if (bestMoves === -1) {
        bestBlocks = [{ id: 1, x: 0, y: 2, size: 2, dir: 'H', type: 'target' }];
        bestMoves = 4;
    }

    // Exact required moves + tight margin (rewards thinking rather than random sliding)
    const margin = Math.max(0, 2 - Math.floor(levelNum / 5));
    const maxMoves = bestMoves + margin;
    
    return { blocks: bestBlocks, maxMoves, minMoves: bestMoves };
}

/* =========================================================
   DADOS DAS FASES
   Cada fase é só um objeto de configuração. Para criar uma
   fase nova, basta adicionar outro objeto neste array — o
   GameScene lê tudo daqui, nada é fixo no código.

   checkpoints: apenas o "x" onde fica a bandeira intermediária.
   Ao passar por ali, o jogador renasce ali (não lá do início)
   se cair num buraco ou for atingido depois disso.
========================================================= */

const LEVELS = [

    {
        id: 1,
        name: 'Floresta Verde',
        theme: 'forest',
        powerType: 'speed',
        worldWidth: 6000,
        timeLimit: 120,
        backgroundColor: 0x87CEEB,
        spawn: { x: 150, y: 300 },

        holes: [
            { start: 1150, end: 1320 },
            { start: 2450, end: 2650 },
            { start: 3900, end: 4120 },
            { start: 5050, end: 5280 }
        ],

        platforms: [
            { x: 500, topY: 400, width: 250, height: 30 },
            { x: 950, topY: 330, width: 220, height: 30 },
            { x: 1450, topY: 390, width: 280, height: 30 },
            { x: 2000, topY: 300, width: 220, height: 30 },
            { x: 2600, topY: 370, width: 300, height: 30 },
            { x: 3200, topY: 290, width: 240, height: 30 },
            { x: 3700, topY: 360, width: 280, height: 30 },
            { x: 4300, topY: 310, width: 250, height: 30 },
            { x: 4850, topY: 370, width: 300, height: 30 },
            { x: 5450, topY: 300, width: 260, height: 30 }
        ],

        enemies: [
            { x: 700, y: 300 }, { x: 1650, y: 300 }, { x: 2300, y: 300 },
            { x: 3000, y: 300 }, { x: 3550, y: 300 }, { x: 4550, y: 300 },
            { x: 5650, y: 300 }
        ],

        carrots: [
            { x: 950, y: 290 }, { x: 2000, y: 260 }, { x: 3200, y: 250 },
            { x: 4300, y: 270 }, { x: 5450, y: 250 }
        ],

        checkpoints: [
            { x: 3000 }
        ]
    },

    {
        id: 2,
        name: 'Deserto da Raposa',
        theme: 'desert',
        powerType: 'attack',
        worldWidth: 6800,
        timeLimit: 140,
        backgroundColor: 0xE8C77E,
        groundTint: 0xE0AE6B,
        platformTint: 0xE0AE6B,
        spawn: { x: 150, y: 300 },

        holes: [
            { start: 900, end: 1050 },
            { start: 1900, end: 2150 },
            { start: 2900, end: 3050 },
            { start: 3900, end: 4200 },
            { start: 5200, end: 5450 },
            { start: 6100, end: 6300 }
        ],

        platforms: [
            { x: 450, topY: 380, width: 200, height: 30 },
            { x: 1300, topY: 320, width: 240, height: 30 },
            { x: 1750, topY: 400, width: 200, height: 30 },
            { x: 2500, topY: 300, width: 260, height: 30 },
            { x: 3300, topY: 380, width: 220, height: 30 },
            { x: 3700, topY: 300, width: 200, height: 30 },
            { x: 4500, topY: 360, width: 260, height: 30 },
            { x: 4950, topY: 280, width: 220, height: 30 },
            { x: 5700, topY: 340, width: 260, height: 30 },
            { x: 6300, topY: 300, width: 240, height: 30 }
        ],

        /* "fast" = raposa veloz (mais rápida, tingida de laranja-avermelhado) */
        enemies: [
            { x: 600, y: 300 },
            { x: 1400, y: 300, type: 'fast', speed: 190, patrolRange: 130, tint: 0xff5533, scale: 0.9 },
            { x: 2500, y: 300 },
            { x: 3500, y: 300, type: 'fast', speed: 190, patrolRange: 130, tint: 0xff5533, scale: 0.9 },
            { x: 4300, y: 300 },
            { x: 4700, y: 300, type: 'fast', speed: 190, patrolRange: 130, tint: 0xff5533, scale: 0.9 },
            { x: 5000, y: 300 },
            { x: 5900, y: 300, type: 'fast', speed: 190, patrolRange: 130, tint: 0xff5533, scale: 0.9 }
        ],

        carrots: [
            { x: 1300, y: 280 }, { x: 2500, y: 260 }, { x: 3700, y: 260 },
            { x: 4950, y: 240 }, { x: 6300, y: 260 }
        ],

        checkpoints: [
            { x: 2400 },
            { x: 4800 }
        ]
    },

    {
        id: 3,
        name: 'Noite Assombrada',
        theme: 'night',
        powerType: 'jump',
        worldWidth: 7200,
        timeLimit: 150,
        backgroundColor: 0x1B2A4A,
        groundTint: 0x30395C,
        platformTint: 0x30395C,
        spawn: { x: 150, y: 300 },

        holes: [
            { start: 800, end: 950 },
            { start: 1600, end: 1780 },
            { start: 2400, end: 2600 },
            { start: 3300, end: 3500 },
            { start: 4200, end: 4450 },
            { start: 5100, end: 5350 },
            { start: 6200, end: 6450 }
        ],

        platforms: [
            { x: 400, topY: 400, width: 200, height: 30 },
            { x: 1200, topY: 320, width: 220, height: 30 },
            { x: 2000, topY: 380, width: 240, height: 30 },
            { x: 2800, topY: 300, width: 220, height: 30 },
            { x: 3600, topY: 370, width: 260, height: 30 },
            { x: 4000, topY: 290, width: 200, height: 30 },
            { x: 4700, topY: 350, width: 240, height: 30 },
            { x: 5600, topY: 300, width: 260, height: 30 },
            { x: 6600, topY: 340, width: 260, height: 30 }
        ],

        /* "flyer" = morcego voador (sem gravidade, voa em zigue-zague) */
        enemies: [
            { x: 550, y: 300, tint: 0x445577 },
            { x: 1300, y: 300, type: 'flyer', speed: 110, patrolRange: 150, flyRange: 60 },
            { x: 2100, y: 300, tint: 0x445577 },
            { x: 2900, y: 300, type: 'flyer', speed: 110, patrolRange: 150, flyRange: 60 },
            { x: 3700, y: 300, tint: 0x445577 },
            { x: 4500, y: 300, type: 'flyer', speed: 110, patrolRange: 150, flyRange: 60 },
            { x: 5450, y: 300, tint: 0x445577 },
            { x: 6100, y: 300, type: 'flyer', speed: 110, patrolRange: 150, flyRange: 60 },
            { x: 6900, y: 300, tint: 0x445577 }
        ],

        carrots: [
            { x: 1200, y: 280 }, { x: 2800, y: 260 }, { x: 4000, y: 250 },
            { x: 5600, y: 260 }, { x: 6600, y: 280 }
        ],

        checkpoints: [
            { x: 2700 },
            { x: 5000 },
            { x: 6900 }
        ]
    }

];

/* Retorna a fase pelo id, ou null se não existir */
function getLevelById(levelId) {
    return LEVELS.find(level => level.id === levelId) || null;
}

/* Retorna a próxima fase depois da atual, ou null se for a última */
function getNextLevel(levelId) {
    const index = LEVELS.findIndex(level => level.id === levelId);
    if (index === -1 || index === LEVELS.length - 1) return null;
    return LEVELS[index + 1];
}
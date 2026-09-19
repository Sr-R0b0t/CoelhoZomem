/* =========================================================
   CONSTANTES
   (a configuração do Phaser e a criação do jogo ficam no
   final do arquivo, depois de todas as cenas estarem
   declaradas — classes não sofrem hoisting em JS)
========================================================= */

/* Constantes de mundo/HUD compartilhadas por todas as fases */
const WORLD_HEIGHT = 540;
const GROUND_TOP_Y = 500;
const GROUND_HEIGHT = 40;
const GROUND_VISUAL_HEIGHT = 140;
const GROUND_TEXTURE_HEIGHT = 800;
const GROUND_SOLID_LINE_FRACTION = 235 / 800;

const PLATFORM_VISUAL_HEIGHT = 28.8;
const PLATFORM_TEXTURE_HEIGHT = 235;
const PLATFORM_SOLID_LINE_FRACTION = 38 / 235;

/* Configurações do coelho (jogador) */
const PLAYER_MAX_SPEED = 320;
const PLAYER_ACCELERATION = 1800;
const PLAYER_DRAG = 2200;
const PLAYER_AIR_ACCELERATION = 1100;
const PLAYER_JUMP_FORCE = 620;
const COYOTE_TIME = 120;
const JUMP_BUFFER_TIME = 120;
const PLAYER_BODY_WIDTH = 50;
const PLAYER_BODY_HEIGHT = 60;
const PLAYER_IMAGE_WIDTH = 100;
const PLAYER_IMAGE_HEIGHT = 100;
const PLAYER_VISUAL_OFFSET_X = 0;
const PLAYER_VISUAL_OFFSET_Y = -1;

const PLAYER_START_LIVES = 3;
const HIT_INVINCIBILITY_TIME = 1200;

const CARROT_POWER_DURATION = 8000;
const CARROT_SPEED_MULTIPLIER = 1.5;

const ENEMY_SPEED = 100;
const ENEMY_WIDTH = 50;
const ENEMY_HEIGHT = 50;
const ENEMY_PATROL_RANGE = 160;
const ENEMY_RESPAWN_DELAY = 15555;
const ENEMY_IMAGE_WIDTH = 70;
const ENEMY_IMAGE_HEIGHT = 70;

/* Morcego (inimigo voador) */
const BAT_BODY_WIDTH = 46;
const BAT_BODY_HEIGHT = 30;
const BAT_IMAGE_WIDTH = 72;
const BAT_IMAGE_HEIGHT = 36;

const CHECKPOINT_ZONE_WIDTH = 40;

const ATTACK_COOLDOWN = 400;
const PROJECTILE_SPEED = 500;
const PROJECTILE_LIFETIME = 1200;

/* Controles mobile compartilhados (um único conjunto de botões na tela) */
const mobileControls = { left: false, right: false, jump: false, attack: false };

/* =========================================================
   EFEITOS SONOROS
   Gerados na hora via Web Audio API (sem arquivos de áudio).
   O AudioContext só pode ser criado/retomado depois de um
   gesto do usuário (clique/toque/tecla) — por isso ele nasce
   sob demanda, na primeira vez que um som é tocado.
========================================================= */

const SFX = (() => {
    let ctx = null;

    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    /* Um "bipe" com a frequência deslizando de start pra end */
    function tone(freqStart, freqEnd, duration, type = 'square', volume = 0.15, delay = 0) {
        const audioCtx = getCtx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = type;

        const startTime = audioCtx.currentTime + delay;
        osc.frequency.setValueAtTime(Math.max(freqStart, 1), startTime);
        osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), startTime + duration);

        gain.gain.setValueAtTime(volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain).connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.02);
    }

    /* Um "chiado" curto (ruído branco com fade-out) — usado no dano */
    function noiseBurst(duration = 0.2, volume = 0.15) {
        const audioCtx = getCtx();
        const bufferSize = Math.floor(audioCtx.sampleRate * duration);
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(volume, audioCtx.currentTime);

        noise.connect(gain).connect(audioCtx.destination);
        noise.start();
    }

    const effects = {
        jump: () => tone(300, 650, 0.14, 'square', 0.14),
        hit: () => { noiseBurst(0.18, 0.18); tone(220, 90, 0.2, 'sawtooth', 0.12); },
        defeatEnemy: () => tone(500, 140, 0.16, 'square', 0.14),
        collectCarrot: () => { tone(520, 900, 0.08, 'square', 0.12); tone(760, 1200, 0.09, 'square', 0.1, 0.06); },
        checkpoint: () => tone(420, 880, 0.3, 'triangle', 0.14),
        gameOver: () => tone(320, 50, 0.9, 'sawtooth', 0.16),
        levelComplete: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.16, 'square', 0.14, i * 0.12)); },
        shoot: () => tone(700, 300, 0.1, 'square', 0.1),
        click: () => tone(600, 850, 0.06, 'square', 0.08)
    };

    return {
        play(name) {
            try {
                (effects[name] || (() => {}))();
            } catch (e) {
                /* Se o navegador bloquear áudio por algum motivo, o jogo
                   continua normalmente — som nunca deve travar a jogabilidade. */
            }
        }
    };
})();

/* =========================================================
   HELPERS DE HUD (DOM)
========================================================= */

function showGameHud(visible, showAttackButton = false) {
    const hud = document.getElementById('hud');
    const mobile = document.getElementById('mobile-controls');
    const attackBtn = document.getElementById('attack-btn');

    if (hud) hud.style.display = visible ? 'flex' : 'none';

    /* Os controles de toque só aparecem em dispositivos sem mouse fino,
       e mesmo assim só durante a fase jogável. */
    const isTouchDevice = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (mobile) mobile.style.display = (visible && isTouchDevice) ? 'flex' : 'none';
    if (attackBtn) attackBtn.style.display = (visible && isTouchDevice && showAttackButton) ? 'flex' : 'none';
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/* =========================================================
   BOOT SCENE — carrega os assets uma única vez
========================================================= */

class BootScene extends Phaser.Scene {

    constructor() {
        super('BootScene');
    }

    preload() {
        this.load.spritesheet('rabbit', './images/coelho-spritesheet.png', { frameWidth: 320, frameHeight: 320 });
        this.load.spritesheet('fox', './images/raposa.png', { frameWidth: 284, frameHeight: 217 });
        this.load.spritesheet('bat', './images/morcego.png', { frameWidth: 412, frameHeight: 209 });
        this.load.image('carrot', './images/cenoura.png');
        this.load.image('groundTexture', './images/chao.png');
        this.load.image('platformTexture', './images/base.png');
        this.load.spritesheet('finishFlag', './images/bandeira-final.png', { frameWidth: 256, frameHeight: 682 });
    }

    create() {
        showGameHud(false);
        this.scene.start('MenuScene');
    }
}

/* =========================================================
   MENU SCENE
========================================================= */

class MenuScene extends Phaser.Scene {

    constructor() {
        super('MenuScene');
    }

    create() {
        showGameHud(false);

        this.cameras.main.setBackgroundColor('#111111');

        this.add.text(480, 150, '🐰 MUFFY ADVENTURES', {
            fontFamily: 'Arial', fontSize: '44px', fontStyle: 'bold', color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(480, 200, 'Uma aventura em fases', {
            fontFamily: 'Arial', fontSize: '18px', color: '#cccccc'
        }).setOrigin(0.5);

        this.createButton(480, 300, 'JOGAR', () => {
            this.scene.start('MapScene');
        });

        this.createButton(480, 380, 'APAGAR PROGRESSO', () => {
            SaveManager.resetProgress();
            this.showToast('Progresso apagado!');
        }, '#883333');
    }

    createButton(x, y, label, onClick, color = '#1bf103') {
        const button = this.add.text(x, y, label, {
            fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold',
            color: '#ffffff', backgroundColor: color, padding: { x: 24, y: 12 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        button.on('pointerover', () => button.setScale(1.05));
        button.on('pointerout', () => button.setScale(1));
        button.on('pointerdown', () => { SFX.play('click'); onClick(); });

        return button;
    }

    showToast(message) {
        const toast = this.add.text(480, 450, message, {
            fontFamily: 'Arial', fontSize: '16px', color: '#ffff88'
        }).setOrigin(0.5);

        this.time.delayedCall(1500, () => toast.destroy());
    }
}

/* =========================================================
   MAP SCENE — seleção de fases (estilo mundo do Mario)
========================================================= */

class MapScene extends Phaser.Scene {

    constructor() {
        super('MapScene');
    }

    create() {
        showGameHud(false);

        this.cameras.main.setBackgroundColor('#2b4d3a');

        this.add.text(480, 50, 'MAPA DE FASES', {
            fontFamily: 'Arial', fontSize: '30px', fontStyle: 'bold', color: '#ffffff'
        }).setOrigin(0.5);

        const positions = this.getNodePositions();

        /* Trilha conectando as fases */
        const path = new Phaser.Curves.Path(positions[0].x, positions[0].y);
        positions.slice(1).forEach(pos => path.lineTo(pos.x, pos.y));

        const graphics = this.add.graphics();
        graphics.lineStyle(6, 0xffffff, 0.5);
        path.draw(graphics);

        LEVELS.forEach((level, index) => {
            this.createLevelNode(level, positions[index]);
        });

        this.createBackButton();
    }

    getNodePositions() {
        const startX = 150;
        const gapX = (960 - 300) / Math.max(LEVELS.length - 1, 1);

        return LEVELS.map((_, index) => ({
            x: startX + gapX * index,
            y: 300 + (index % 2 === 0 ? -40 : 40)
        }));
    }

    createLevelNode(level, pos) {
        const unlocked = SaveManager.isUnlocked(level.id);
        const completed = SaveManager.isCompleted(level.id);

        const circleColor = completed ? 0xffd54c : (unlocked ? 0x1bf103 : 0x555555);

        const circle = this.add.circle(pos.x, pos.y, 34, circleColor);
        circle.setStrokeStyle(4, 0xffffff, unlocked ? 0.9 : 0.3);

        const icon = completed ? '★' : (unlocked ? String(level.id) : '🔒');

        this.add.text(pos.x, pos.y, icon, {
            fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold', color: '#1a1a1a'
        }).setOrigin(0.5);

        this.add.text(pos.x, pos.y + 55, level.name, {
            fontFamily: 'Arial', fontSize: '14px', color: '#ffffff', align: 'center', wordWrap: { width: 140 }
        }).setOrigin(0.5, 0);

        const bestTime = SaveManager.getBestTime(level.id);
        if (bestTime != null) {
            this.add.text(pos.x, pos.y + 90, `Melhor: ${formatTime(bestTime)}`, {
                fontFamily: 'Arial', fontSize: '12px', color: '#cccccc'
            }).setOrigin(0.5, 0);
        }

        if (unlocked) {
            circle.setInteractive({ useHandCursor: true });
            circle.on('pointerover', () => circle.setScale(1.1));
            circle.on('pointerout', () => circle.setScale(1));
            circle.on('pointerdown', () => {
                this.scene.start('GameScene', { levelData: level });
            });
        }
    }

    createBackButton() {
        const button = this.add.text(480, 500, 'VOLTAR AO MENU', {
            fontFamily: 'Arial', fontSize: '16px', color: '#ffffff',
            backgroundColor: '#333333', padding: { x: 14, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        button.on('pointerdown', () => this.scene.start('MenuScene'));
    }
}

/* =========================================================
   GAME SCENE — a fase jogável em si (dirigida pelos dados
   recebidos em init())
========================================================= */

class GameScene extends Phaser.Scene {

    constructor() {
        super('GameScene');
    }

    init(data) {
        this.levelData = data.levelData;
        this.worldWidth = this.levelData.worldWidth;

        this.groundBodies = [];
        this.platforms = [];

        this.lives = PLAYER_START_LIVES;
        this.isInvincible = false;
        this.invincibleTimer = 0;

        this.gameOverFlag = false;
        this.levelCompleted = false;

        this.hasCarrotPower = false;
        this.carrotPowerTimer = 0;
        this.powerType = this.levelData.powerType || 'speed';
        this.attackCooldown = 0;

        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;

        this.playerAnimationState = 'idle';

        this.levelTimeLeft = this.levelData.timeLimit;
        this.levelTimerEvent = null;

        this.currentSpawn = { ...this.levelData.spawn };
        this.reachedCheckpoints = new Set();

        mobileControls.left = false;
        mobileControls.right = false;
        mobileControls.jump = false;
        mobileControls.attack = false;
    }

    create() {
        showGameHud(true, this.powerType === 'attack');

        this.cameras.main.setBackgroundColor(this.levelData.backgroundColor);

        this.createAnimations();

        this.physics.world.setBounds(0, 0, this.worldWidth, WORLD_HEIGHT);
        this.physics.world.setBoundsCollision(true, true, true, false);

        this.add.rectangle(this.worldWidth / 2, WORLD_HEIGHT / 2, this.worldWidth, WORLD_HEIGHT, this.levelData.backgroundColor).setDepth(-10);

        this.createSceneryDecorations();
        this.createGround();
        this.createPlatforms();
        this.createCheckpoints();
        this.createEnemiesGroup();
        this.createCarrotsGroup();
        this.createPlayer();
        this.createProjectilesGroup();
        this.createFinishZone();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.cameras.main.setBounds(0, 0, this.worldWidth, WORLD_HEIGHT);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(180, 100);

        this.setupMobileControls();

        this.updateLivesDisplay();
        this.updatePowerDisplay();
        this.updateTimerDisplay();

        this.levelTimerEvent = this.time.addEvent({
            delay: 1000, callback: this.updateLevelTimer, callbackScope: this, loop: true
        });

        this.events.on('shutdown', this.onShutdown, this);
    }

    onShutdown() {
        if (this.levelTimerEvent) this.levelTimerEvent.remove(false);
        this.input.keyboard.removeAllKeys(true, true);
    }

    /* ===== ANIMAÇÕES (criadas uma vez só, reaproveitadas entre fases) ===== */

    createAnimations() {
        if (!this.anims.exists('rabbit-idle')) {
            this.anims.create({ key: 'rabbit-idle', frames: [{ key: 'rabbit', frame: 0 }], frameRate: 1, repeat: -1 });
            this.anims.create({ key: 'rabbit-walk', frames: this.anims.generateFrameNumbers('rabbit', { start: 0, end: 7 }), frameRate: 3.33, repeat: -1 });
            this.anims.create({ key: 'rabbit-jump', frames: [{ key: 'rabbit', frame: 2 }], frameRate: 1, repeat: -1 });
            this.anims.create({ key: 'rabbit-fall', frames: [{ key: 'rabbit', frame: 5 }], frameRate: 1, repeat: -1 });
        }

        if (!this.anims.exists('fox-walk')) {
            this.anims.create({ key: 'fox-walk', frames: this.anims.generateFrameNumbers('fox', { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
        }

        if (!this.anims.exists('bat-fly')) {
            this.anims.create({ key: 'bat-fly', frames: this.anims.generateFrameNumbers('bat', { start: 0, end: 6 }), frameRate: 10, repeat: -1 });
        }

        if (!this.anims.exists('finish-flag-wave')) {
            this.anims.create({ key: 'finish-flag-wave', frames: this.anims.generateFrameNumbers('finishFlag', { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
        }
    }

    /* ===== CENÁRIO DE FUNDO (diferencia visualmente cada fase) ===== */

    createSceneryDecorations() {
        const theme = this.levelData.theme || 'forest';

        if (theme === 'forest') this.createForestScenery();
        else if (theme === 'desert') this.createDesertScenery();
        else if (theme === 'night') this.createNightScenery();
    }

    createForestScenery() {
        /* Morros ondulados ao fundo, com leve paralaxe */
        const hills = this.add.graphics().setDepth(-6);
        hills.fillStyle(0x4a8f5c, 0.55);

        for (let x = 0; x < this.worldWidth + 400; x += 400) {
            hills.fillCircle(x, GROUND_TOP_Y + 20, 160);
        }
        hills.setScrollFactor(0.4);

        /* Nuvens espalhadas pelo céu */
        for (let x = 200; x < this.worldWidth; x += 550) {
            const cloud = this.add.graphics().setDepth(-8).setScrollFactor(0.25);
            const y = 90 + (x % 3) * 30;
            cloud.fillStyle(0xffffff, 0.85);
            cloud.fillEllipse(x, y, 90, 36);
            cloud.fillEllipse(x - 35, y + 6, 55, 26);
            cloud.fillEllipse(x + 35, y + 6, 55, 26);
        }
    }

    createDesertScenery() {
        /* Sol fixo no canto do céu */
        const sun = this.add.circle(120, 100, 55, 0xfff2a8).setDepth(-8).setScrollFactor(0.15);
        sun.setStrokeStyle(6, 0xffe066, 0.6);

        /* Dunas onduladas ao fundo */
        const dunes = this.add.graphics().setDepth(-6).setScrollFactor(0.4);
        dunes.fillStyle(0xd8a45c, 0.6);
        for (let x = 0; x < this.worldWidth + 500; x += 500) {
            dunes.fillEllipse(x, GROUND_TOP_Y + 40, 420, 140);
        }

        /* Cactos no chão, na frente do cenário mas atrás do jogador */
        for (let x = 300; x < this.worldWidth; x += 480) {
            const cactusOnHole = this.levelData.holes.some(h => x > h.start - 40 && x < h.end + 40);
            if (cactusOnHole) continue;

            const cactus = this.add.graphics().setDepth(2);
            cactus.fillStyle(0x3f7d4a, 1);
            cactus.fillRoundedRect(x - 10, GROUND_TOP_Y - 70, 20, 70, 8);
            cactus.fillRoundedRect(x - 28, GROUND_TOP_Y - 45, 18, 35, 7);
            cactus.fillRoundedRect(x + 10, GROUND_TOP_Y - 55, 18, 40, 7);
        }
    }

    createNightScenery() {
        /* Lua */
        this.add.circle(150, 90, 46, 0xf3f0d8).setDepth(-8).setScrollFactor(0.15);

        /* Estrelas espalhadas pelo céu */
        for (let i = 0; i < Math.floor(this.worldWidth / 140); i++) {
            const x = 60 + i * 140 + (i % 3) * 25;
            const y = 40 + (i % 5) * 45;
            const size = 2 + (i % 3);

            this.add.circle(x, y, size, 0xffffff, 0.9).setDepth(-8).setScrollFactor(0.2);
        }

        /* Silhueta de morros distantes */
        const hills = this.add.graphics().setDepth(-6).setScrollFactor(0.4);
        hills.fillStyle(0x14213a, 0.8);
        for (let x = 0; x < this.worldWidth + 400; x += 400) {
            hills.fillCircle(x, GROUND_TOP_Y + 30, 150);
        }
    }

    /* ===== CHÃO COM BURACOS ===== */

    createGround() {
        const groundSegments = [];
        let segmentStart = 0;

        this.levelData.holes.forEach(hole => {
            if (hole.start > segmentStart) groundSegments.push({ start: segmentStart, end: hole.start });
            segmentStart = hole.end;
        });

        if (segmentStart < this.worldWidth) groundSegments.push({ start: segmentStart, end: this.worldWidth });

        groundSegments.forEach(segment => {
            const width = segment.end - segment.start;
            const centerX = segment.start + width / 2;

            const groundBody = this.add.rectangle(centerX, GROUND_TOP_Y + GROUND_HEIGHT / 2, width, GROUND_HEIGHT, 0x1bf103, 0);
            this.physics.add.existing(groundBody, true);
            this.groundBodies.push(groundBody);

            const groundTextureWidth = this.textures.get('groundTexture').getSourceImage().width;
            const groundScaleY = GROUND_VISUAL_HEIGHT / GROUND_TEXTURE_HEIGHT;
            const naturalGroundTileWidth = groundTextureWidth * groundScaleY;
            const numGroundTiles = Math.max(1, Math.round(width / naturalGroundTileWidth));
            const groundScaleX = width / (numGroundTiles * groundTextureWidth);
            const groundVisualOffset = GROUND_SOLID_LINE_FRACTION * GROUND_VISUAL_HEIGHT;

            const groundVisual = this.add.tileSprite(
                centerX, GROUND_TOP_Y - groundVisualOffset + GROUND_VISUAL_HEIGHT / 2,
                width, GROUND_VISUAL_HEIGHT, 'groundTexture'
            );
            groundVisual.setTileScale(groundScaleX, groundScaleY);
            groundVisual.setDepth(1);
            if (this.levelData.groundTint) groundVisual.setTint(this.levelData.groundTint);
        });
    }

    /* ===== PAREDES INVISÍVEIS NAS BORDAS DOS BURACOS =====
       Impedem que os inimigos (que patrulham sozinhos) andem
       para dentro de um buraco e fiquem caindo/renascendo sem
       parar. O jogador não colide com essas paredes — só os
       inimigos — porque ele PRECISA poder cair nos buracos. */

    createHoleWalls() {
        this.holeWalls = [];

        this.levelData.holes.forEach(hole => {
            [hole.start, hole.end].forEach(edgeX => {
                const wall = this.add.rectangle(edgeX, GROUND_TOP_Y - 300, 12, 700, 0xff0000, 0);
                this.physics.add.existing(wall, true);
                this.holeWalls.push(wall);
            });
        });
    }

    /* ===== PLATAFORMAS ===== */

    createPlatforms() {
        this.levelData.platforms.forEach(p => this.createPlatform(p.x, p.topY, p.width, p.height));
    }

    createPlatform(x, topY, width, height) {
        const centerY = topY + height / 2;

        const platform = this.add.rectangle(x, centerY, width, height, 0x8B4513, 0);
        this.physics.add.existing(platform, true);

        const textureWidth = this.textures.get('platformTexture').getSourceImage().width;
        const tileScaleY = PLATFORM_VISUAL_HEIGHT / PLATFORM_TEXTURE_HEIGHT;
        const naturalTileWidth = textureWidth * tileScaleY;
        const numTiles = Math.max(1, Math.round(width / naturalTileWidth));
        const tileScaleX = width / (numTiles * textureWidth);
        const platformVisualOffset = PLATFORM_SOLID_LINE_FRACTION * PLATFORM_VISUAL_HEIGHT;

        const platformVisual = this.add.tileSprite(
            x, topY - platformVisualOffset + PLATFORM_VISUAL_HEIGHT / 2,
            width, PLATFORM_VISUAL_HEIGHT, 'platformTexture'
        );
        platformVisual.setTileScale(tileScaleX, tileScaleY);
        platformVisual.setDepth(1);
        if (this.levelData.platformTint) platformVisual.setTint(this.levelData.platformTint);

        this.platforms.push(platform);
        return platform;
    }

    /* ===== CHECKPOINTS ===== */

    createCheckpoints() {
        this.checkpointZones = [];

        (this.levelData.checkpoints || []).forEach((cp, index) => {
            const zone = this.add.zone(cp.x, WORLD_HEIGHT / 2, CHECKPOINT_ZONE_WIDTH, WORLD_HEIGHT);
            this.physics.add.existing(zone, true);
            zone.checkpointIndex = index;
            zone.checkpointX = cp.x;
            this.checkpointZones.push(zone);

            /* Bandeira "plantada" no chão: origin(0.5, 1) faz a base do
               emoji encostar no chão em vez de flutuar no ar. */
            const flag = this.add.text(cp.x, GROUND_TOP_Y + 14, '🚩', { fontSize: '40px' })
                .setOrigin(0.5, 1)
                .setDepth(9);

            zone.flagVisual = flag;
        });
    }

    onReachCheckpoint(playerBody, zone) {
        if (this.reachedCheckpoints.has(zone.checkpointIndex)) return;

        this.reachedCheckpoints.add(zone.checkpointIndex);
        this.currentSpawn = { x: zone.checkpointX, y: 300 };

        SFX.play('checkpoint');

        if (zone.flagVisual) {
            zone.flagVisual.setTint(0x88ff88);
            this.tweens.add({ targets: zone.flagVisual, scale: 1.3, duration: 150, yoyo: true });
        }
    }

    /* ===== INIMIGOS ===== */

    createEnemiesGroup() {
        this.enemies = this.physics.add.group();
        this.createHoleWalls();
        this.levelData.enemies.forEach(cfg => this.createEnemy(cfg));
    }

    createEnemy(cfg) {
        if (cfg.type === 'flyer') return this.createFlyerEnemy(cfg);
        return this.createWalkerEnemy(cfg);
    }

    /* Inimigo padrão (raposa): anda no chão, vira ao bater em parede,
       buraco ou no limite da sua patrulha. */
    createWalkerEnemy(cfg) {
        const speed = cfg.speed || ENEMY_SPEED;
        const patrolRange = cfg.patrolRange || ENEMY_PATROL_RANGE;
        const scale = cfg.scale || 1;

        const enemy = this.add.rectangle(cfg.x, cfg.y, ENEMY_WIDTH, ENEMY_HEIGHT, 0xff4444, 0);
        this.physics.add.existing(enemy);

        enemy.body.setCollideWorldBounds(true);
        enemy.body.setSize(ENEMY_WIDTH, ENEMY_HEIGHT);

        enemy.cfg = cfg;
        enemy.enemyType = 'walker';
        enemy.spawnX = cfg.x;
        enemy.spawnY = cfg.y;
        enemy.direction = -1;
        enemy.isDead = false;
        enemy.speed = speed;
        enemy.patrolRange = patrolRange;
        enemy.body.setVelocityX(enemy.direction * speed);

        const visual = this.add.sprite(cfg.x, cfg.y, 'fox');
        visual.setDisplaySize(ENEMY_IMAGE_WIDTH * scale, ENEMY_IMAGE_HEIGHT * scale);
        visual.play('fox-walk');
        visual.setDepth(5);
        if (cfg.tint) visual.setTint(cfg.tint);
        enemy.visual = visual;

        this.groundBodies.forEach(g => this.physics.add.collider(enemy, g));
        this.platforms.forEach(p => this.physics.add.collider(enemy, p));
        this.holeWalls.forEach(w => this.physics.add.collider(enemy, w));

        this.enemies.add(enemy);
        return enemy;
    }

    /* Inimigo voador (morcego): voa livre, sem gravidade e sem colidir
       com chão/plataformas — quica dentro de uma faixa horizontal e
       vertical ao redor do ponto onde nasceu. O corpo físico é um
       retângulo invisível (mesma técnica da raposa/coelho) e o visual
       é o sprite animado, sincronizado a cada frame. */
    createFlyerEnemy(cfg) {
        const speed = cfg.speed || 100;
        const patrolRange = cfg.patrolRange || 160;
        const flyRange = cfg.flyRange || 50;
        const scale = cfg.scale || 1;

        const enemy = this.add.rectangle(cfg.x, cfg.y, BAT_BODY_WIDTH, BAT_BODY_HEIGHT, 0x000000, 0);
        this.physics.add.existing(enemy);

        enemy.body.setAllowGravity(false);
        enemy.body.setSize(BAT_BODY_WIDTH, BAT_BODY_HEIGHT);
        enemy.body.setCollideWorldBounds(true);

        enemy.cfg = cfg;
        enemy.enemyType = 'flyer';
        enemy.spawnX = cfg.x;
        enemy.spawnY = cfg.y;
        enemy.direction = -1;
        enemy.verticalDirection = 1;
        enemy.isDead = false;
        enemy.speed = speed;
        enemy.patrolRange = patrolRange;
        enemy.flyRange = flyRange;

        const visual = this.add.sprite(cfg.x, cfg.y, 'bat');
        visual.setDisplaySize(BAT_IMAGE_WIDTH * scale, BAT_IMAGE_HEIGHT * scale);
        visual.play('bat-fly');
        visual.setDepth(6);
        if (cfg.tint) visual.setTint(cfg.tint);
        enemy.visual = visual;

        enemy.body.setVelocityX(enemy.direction * speed);
        enemy.body.setVelocityY(enemy.verticalDirection * (speed * 0.5));

        this.enemies.add(enemy);
        return enemy;
    }

    updateEnemies() {
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.isDead) return;

            if (enemy.enemyType === 'flyer') this.updateFlyerEnemy(enemy);
            else this.updateWalkerEnemy(enemy);
        });
    }

    updateWalkerEnemy(enemy) {
        /* Segurança extra: se de algum jeito ele cair (ex.: nocaute),
           reaparece na configuração original — nunca só na posição,
           pra preservar tipo/velocidade/tinta do inimigo. */
        if (enemy.y > WORLD_HEIGHT + 150) {
            const cfg = enemy.cfg;
            if (enemy.visual) enemy.visual.destroy();
            enemy.destroy();
            this.createEnemy(cfg);
            return;
        }

        enemy.body.setVelocityX(enemy.direction * enemy.speed);

        if (enemy.x <= enemy.spawnX - enemy.patrolRange) enemy.direction = 1;
        else if (enemy.x >= enemy.spawnX + enemy.patrolRange) enemy.direction = -1;

        if (enemy.body.blocked.left) enemy.direction = 1;
        else if (enemy.body.blocked.right) enemy.direction = -1;

        if (enemy.visual) {
            enemy.visual.x = enemy.x;
            enemy.visual.y = enemy.y;
            enemy.visual.setFlipX(enemy.direction === -1);
        }
    }

    updateFlyerEnemy(enemy) {
        enemy.body.setVelocityX(enemy.direction * enemy.speed);
        enemy.body.setVelocityY(enemy.verticalDirection * (enemy.speed * 0.5));

        if (enemy.x <= enemy.spawnX - enemy.patrolRange) enemy.direction = 1;
        else if (enemy.x >= enemy.spawnX + enemy.patrolRange) enemy.direction = -1;

        if (enemy.y <= enemy.spawnY - enemy.flyRange) enemy.verticalDirection = 1;
        else if (enemy.y >= enemy.spawnY + enemy.flyRange) enemy.verticalDirection = -1;

        if (enemy.visual) {
            enemy.visual.x = enemy.x;
            enemy.visual.y = enemy.y;
            enemy.visual.setFlipX(enemy.direction === 1);
        }
    }

    defeatEnemy(enemy) {
        if (enemy.isDead) return;
        enemy.isDead = true;
        enemy.body.enable = false;
        enemy.body.setVelocity(0, 0);

        SFX.play('defeatEnemy');

        const cfg = enemy.cfg;
        const visual = enemy.visual;
        if (visual) visual.anims.stop();

        this.tweens.add({
            targets: visual || enemy, scaleY: 0.25, alpha: 0, duration: 250, ease: 'Power2'
        });

        this.time.delayedCall(250, () => {
            if (visual) visual.destroy();
            enemy.destroy();
        });

        this.time.delayedCall(ENEMY_RESPAWN_DELAY, () => {
            if (!this.gameOverFlag && !this.levelCompleted) this.createEnemy(cfg);
        });
    }

    hitEnemy(playerBody, enemy) {
        if (enemy.isDead || this.gameOverFlag || this.levelCompleted) return;

        const stompedEnemy = playerBody.body.touching.down && enemy.body.touching.up;

        if (stompedEnemy || this.hasCarrotPower) {
            this.defeatEnemy(enemy);
            if (stompedEnemy) playerBody.body.setVelocityY(-420);
            return;
        }

        this.damagePlayer(playerBody);
    }

    /* ===== CENOURAS ===== */

    createCarrotsGroup() {
        this.carrots = this.physics.add.group();
        this.levelData.carrots.forEach(c => this.createCarrot(c.x, c.y));
    }

    createCarrot(x, y) {
        const carrotImage = this.add.image(0, 0, 'carrot');
        carrotImage.setDisplaySize(42, 42);

        /* A cor da cenoura já entrega qual poder ela vai dar,
           usando a mesma paleta do tint aplicado no coelho. */
        const tintByPower = { speed: 0xffa500, jump: 0x9dff66, attack: 0xffcc44 };
        carrotImage.setTint(tintByPower[this.powerType] || 0xffffff);

        const carrot = this.add.container(x, y, [carrotImage]);
        this.physics.add.existing(carrot);
        this.carrots.add(carrot);

        carrot.body.setAllowGravity(false);
        carrot.body.gravity.y = -this.physics.world.gravity.y;
        carrot.body.setSize(30, 30);
        carrot.body.setOffset(-15, -15);

        this.tweens.add({ targets: carrotImage, y: -6, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.easeInOut' });

        /* Brilho pulsante sutil pra reforçar que é um item de poder */
        this.tweens.add({ targets: carrotImage, alpha: 0.7, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.easeInOut' });

        return carrot;
    }

    collectCarrot(playerBody, carrot) {
        carrot.destroy();
        SFX.play('collectCarrot');
        this.activateCarrotPower();
    }

    activateCarrotPower() {
        this.hasCarrotPower = true;
        this.carrotPowerTimer = CARROT_POWER_DURATION;

        const tintByType = { speed: 0xffa500, shield: 0x66ccff, jump: 0x9dff66, attack: 0xffee55 };
        this.playerVisual.setTint(tintByType[this.powerType] || 0xffa500);

        this.updatePowerDisplay();
    }

    deactivateCarrotPower() {
        this.hasCarrotPower = false;
        this.playerVisual.clearTint();
        this.updatePowerDisplay();
    }

    /* ===== JOGADOR ===== */

    createPlayer() {
        this.player = this.add.rectangle(this.currentSpawn.x, this.currentSpawn.y, PLAYER_BODY_WIDTH, PLAYER_BODY_HEIGHT, 0xffffff, 0);
        this.physics.add.existing(this.player);
        this.player.body.setSize(PLAYER_BODY_WIDTH, PLAYER_BODY_HEIGHT);
        this.player.body.setCollideWorldBounds(false);

        this.playerVisual = this.add.sprite(this.player.x, this.player.y, 'rabbit');
        this.playerVisual.setDisplaySize(PLAYER_IMAGE_WIDTH, PLAYER_IMAGE_HEIGHT);
        this.playerVisual.play('rabbit-walk');
        this.playerVisual.setOrigin(0.5, 1);
        this.playerVisual.setDepth(10);

        this.groundBodies.forEach(g => this.physics.add.collider(this.player, g));
        this.platforms.forEach(p => this.physics.add.collider(this.player, p));
        this.physics.add.collider(this.player, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.player, this.carrots, this.collectCarrot, null, this);

        this.checkpointZones.forEach(zone => {
            this.physics.add.overlap(this.player, zone, this.onReachCheckpoint, null, this);
        });
    }

    /* ===== ATAQUE À DISTÂNCIA (poder do deserto) ===== */

    createProjectilesGroup() {
        /* allowGravity: false garante que qualquer membro adicionado
           ao grupo já nasça sem sofrer a gravidade do mundo. */
        this.projectiles = this.physics.add.group({ allowGravity: false });

        this.physics.add.overlap(this.projectiles, this.enemies, (projectile, enemy) => {
            if (enemy.isDead) return;
            this.defeatEnemy(enemy);
            projectile.destroy();
        }, null, this);
    }

    fireProjectile() {
        if (!this.hasCarrotPower || this.powerType !== 'attack') return;
        if (this.attackCooldown > 0) return;
        if (this.gameOverFlag || this.levelCompleted) return;

        this.attackCooldown = ATTACK_COOLDOWN;

        SFX.play('shoot');

        const direction = this.playerVisual.flipX ? -1 : 1;
        const startX = this.player.x + direction * 35;
        const startY = this.player.body.center.y;

        const projectile = this.add.image(startX, startY, 'carrot');
        projectile.setDisplaySize(28, 28);
        projectile.setTint(0xffcc44);
        projectile.setAngle(direction === -1 ? 90 : -90);
        projectile.setDepth(6);

        this.physics.add.existing(projectile);
        this.projectiles.add(projectile);

        projectile.body.setAllowGravity(false);
        projectile.body.setVelocityX(direction * PROJECTILE_SPEED);

        this.time.delayedCall(PROJECTILE_LIFETIME, () => {
            if (projectile.active) projectile.destroy();
        });
    }

    damagePlayer(playerBody) {
        if (this.isInvincible || this.gameOverFlag || this.levelCompleted) return;

        /* Escudo do deserto: enquanto ativo, o coelho não toma dano */
        if (this.hasCarrotPower && this.powerType === 'shield') return;

        this.lives -= 1;
        this.updateLivesDisplay();

        if (this.lives <= 0) {
            this.triggerGameOver();
            return;
        }

        SFX.play('hit');

        this.isInvincible = true;
        this.invincibleTimer = HIT_INVINCIBILITY_TIME;

        playerBody.body.setVelocity(0, 0);
        playerBody.setPosition(this.currentSpawn.x, this.currentSpawn.y);

        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
    }

    checkPlayerFall() {
        if (this.player.y > WORLD_HEIGHT + 100) this.damagePlayer(this.player);
    }

    /* ===== TIMER DA FASE ===== */

    updateLevelTimer() {
        if (this.gameOverFlag || this.levelCompleted) return;

        this.levelTimeLeft -= 1;
        this.updateTimerDisplay();

        if (this.levelTimeLeft <= 0) {
            this.levelTimeLeft = 0;
            this.updateTimerDisplay();
            this.triggerTimeOver();
        }
    }

    updateTimerDisplay() {
        const el = document.getElementById('timer-display');
        if (!el) return;

        el.textContent = `⏱️ ${formatTime(this.levelTimeLeft)}`;
        el.style.color = this.levelTimeLeft <= 15 ? '#ff4444' : '';
    }

    /* ===== FIM DE FASE (tempo esgotado / game over) ===== */

    triggerTimeOver() {
        if (this.gameOverFlag || this.levelCompleted) return;
        this.gameOverFlag = true;

        SFX.play('gameOver');

        if (this.levelTimerEvent) this.levelTimerEvent.remove(false);
        this.physics.pause();

        this.scene.start('GameOverScene', { levelData: this.levelData, reason: 'time' });
    }

    triggerGameOver() {
        if (this.gameOverFlag) return;
        this.gameOverFlag = true;

        SFX.play('gameOver');

        if (this.levelTimerEvent) this.levelTimerEvent.remove(false);
        this.physics.pause();

        this.scene.start('GameOverScene', { levelData: this.levelData, reason: 'lives' });
    }

    /* ===== HUD ===== */

    updateLivesDisplay() {
        const el = document.getElementById('lives-display');
        if (!el) return;

        const heartsOn = '❤️'.repeat(Math.max(this.lives, 0));
        const heartsOff = '🖤'.repeat(Math.max(PLAYER_START_LIVES - this.lives, 0));
        el.textContent = heartsOn + heartsOff;
    }

    updatePowerDisplay() {
        const el = document.getElementById('power-display');
        if (!el) return;

        if (!this.hasCarrotPower) {
            el.textContent = '';
            return;
        }

        const secondsLeft = Math.ceil(this.carrotPowerTimer / 1000);
        const labelByType = {
            speed: `🥕 Velocidade: ${secondsLeft}s`,
            shield: `🛡️ Escudo: ${secondsLeft}s`,
            jump: `⬆️ Super Pulo: ${secondsLeft}s`,
            attack: `🥕 Ataque pronto: ${secondsLeft}s (ESPAÇO)`
        };

        el.textContent = labelByType[this.powerType] || `🥕 Poder ativo: ${secondsLeft}s`;
    }

    /* ===== ÁREA FINAL / CONCLUSÃO DA FASE ===== */

    createFinishZone() {
        const finishX = this.worldWidth - 180;
        const groundY = GROUND_TOP_Y;

        this.finishZone = this.add.rectangle(finishX, groundY - 45, 90, 90, 0x00ff00, 0);
        this.finishZone.setVisible(false);
        this.physics.add.existing(this.finishZone, true);

        const flag = this.add.sprite(finishX, groundY + 20, 'finishFlag');
        flag.setOrigin(0.5, 1);
        flag.setScale(0.28);
        flag.play('finish-flag-wave');
        flag.setDepth(10);

        const flagBounds = flag.getBounds();
        const finishText = this.add.text(finishX, flagBounds.top - 45, 'FINAL', {
            fontFamily: 'Arial', fontSize: '28px', fontStyle: 'bold',
            color: '#ffffff', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5, 1);
        finishText.setDepth(11);

        this.physics.add.overlap(this.player, this.finishZone, this.completeLevel, null, this);
    }

    completeLevel() {
        if (this.levelCompleted || this.gameOverFlag) return;
        this.levelCompleted = true;

        SFX.play('levelComplete');

        if (this.levelTimerEvent) this.levelTimerEvent.remove(false);
        this.physics.pause();

        const timeUsed = this.levelData.timeLimit - this.levelTimeLeft;

        SaveManager.completeLevel(this.levelData.id, timeUsed);

        const next = getNextLevel(this.levelData.id);
        if (next) SaveManager.unlockLevel(next.id);

        this.scene.start('LevelCompleteScene', { levelData: this.levelData, timeUsed });
    }

    /* ===== ANIMAÇÃO DO COELHO ===== */

    updatePlayerAnimation(onGround, movingLeft, movingRight) {
        const velocityY = this.player.body.velocity.y;

        if (!onGround && velocityY < -50) return this.setPlayerAnimation('jump');
        if (!onGround && velocityY > 50) return this.setPlayerAnimation('fall');
        if (movingLeft || movingRight) return this.setPlayerAnimation('walk');
        this.setPlayerAnimation('idle');
    }

    setPlayerAnimation(newState) {
        if (this.playerAnimationState === newState) return;
        this.playerAnimationState = newState;

        const animKey = { idle: 'rabbit-idle', walk: 'rabbit-walk', jump: 'rabbit-jump', fall: 'rabbit-fall' }[newState];
        this.playerVisual.play(animKey, true);
    }

    /* ===== CONTROLES MOBILE ===== */

    setupMobileControls() {
        const leftBtn = document.getElementById('left-btn');
        const rightBtn = document.getElementById('right-btn');
        const jumpBtn = document.getElementById('jump-btn');
        const attackBtn = document.getElementById('attack-btn');

        const bindMovementButton = (button, controlName) => {
            if (!button) return;

            button.onpointerdown = event => {
                event.preventDefault();
                mobileControls[controlName] = true;
                button.classList.add('pressed');
            };

            const release = () => {
                mobileControls[controlName] = false;
                button.classList.remove('pressed');
            };

            button.onpointerup = release;
            button.onpointercancel = release;
            button.onpointerleave = release;
        };

        /* Botões de "toque único" (pulo, ataque): a flag é lida e
           zerada no update() do próprio jogo, então aqui só marcamos
           true na hora de tocar. */
        const bindTapButton = (button, controlName) => {
            if (!button) return;

            button.onpointerdown = event => {
                event.preventDefault();
                mobileControls[controlName] = true;
                button.classList.add('pressed');
            };

            const release = () => button.classList.remove('pressed');

            button.onpointerup = release;
            button.onpointercancel = release;
            button.onpointerleave = release;
        };

        bindMovementButton(leftBtn, 'left');
        bindMovementButton(rightBtn, 'right');
        bindTapButton(jumpBtn, 'jump');
        bindTapButton(attackBtn, 'attack');
    }

    /* ===== UPDATE ===== */

    update(time, delta) {
        if (this.gameOverFlag || this.levelCompleted) return;

        this.checkPlayerFall();
        if (this.gameOverFlag) return;

        this.updateEnemies();

        if (this.isInvincible) {
            this.invincibleTimer -= delta;
            this.playerVisual.setAlpha(Math.floor(time / 100) % 2 === 0 ? 0.3 : 1);

            if (this.invincibleTimer <= 0) {
                this.isInvincible = false;
                this.playerVisual.setAlpha(1);
            }
        }

        if (this.hasCarrotPower) {
            this.carrotPowerTimer -= delta;
            if (this.carrotPowerTimer <= 0) this.deactivateCarrotPower();
            else this.updatePowerDisplay();
        }

        if (this.attackCooldown > 0) this.attackCooldown -= delta;

        const attackPressed = Phaser.Input.Keyboard.JustDown(this.attackKey) || mobileControls.attack;
        if (attackPressed) {
            this.fireProjectile();
            mobileControls.attack = false;
        }

        this.playerVisual.x = this.player.x + PLAYER_VISUAL_OFFSET_X;
        this.playerVisual.y = this.player.body.bottom + PLAYER_VISUAL_OFFSET_Y;

        const onGround = this.player.body.blocked.down || this.player.body.touching.down;
        if (onGround) this.coyoteTimer = COYOTE_TIME;
        else this.coyoteTimer -= delta;

        const movingLeft = this.cursors.left.isDown || mobileControls.left;
        const movingRight = this.cursors.right.isDown || mobileControls.right;

        if (movingLeft && !movingRight) {
            this.player.body.setAccelerationX(onGround ? -PLAYER_ACCELERATION : -PLAYER_AIR_ACCELERATION);
            this.player.body.setDragX(0);
            this.playerVisual.setFlipX(true);
        } else if (movingRight && !movingLeft) {
            this.player.body.setAccelerationX(onGround ? PLAYER_ACCELERATION : PLAYER_AIR_ACCELERATION);
            this.player.body.setDragX(0);
            this.playerVisual.setFlipX(false);
        } else {
            this.player.body.setAccelerationX(0);
            this.player.body.setDragX(PLAYER_DRAG);
        }

        const currentMaxSpeed = (this.hasCarrotPower && this.powerType === 'speed')
            ? PLAYER_MAX_SPEED * CARROT_SPEED_MULTIPLIER
            : PLAYER_MAX_SPEED;
        this.player.body.setMaxVelocity(currentMaxSpeed, 1000);

        const jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) || mobileControls.jump;

        if (jumpPressed) {
            this.jumpBufferTimer = JUMP_BUFFER_TIME;
            mobileControls.jump = false;
        } else {
            this.jumpBufferTimer -= delta;
        }

        if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
            const jumpForce = (this.hasCarrotPower && this.powerType === 'jump')
                ? PLAYER_JUMP_FORCE * 1.35
                : PLAYER_JUMP_FORCE;

            this.player.body.setVelocityY(-jumpForce);
            this.jumpBufferTimer = 0;
            this.coyoteTimer = 0;

            SFX.play('jump');
        }

        this.updatePlayerAnimation(onGround, movingLeft, movingRight);
    }
}

/* =========================================================
   LEVEL COMPLETE SCENE
========================================================= */

class LevelCompleteScene extends Phaser.Scene {

    constructor() {
        super('LevelCompleteScene');
    }

    init(data) {
        this.levelData = data.levelData;
        this.timeUsed = data.timeUsed;
    }

    create() {
        showGameHud(false);
        this.cameras.main.setBackgroundColor('#0d1f12');

        this.add.text(480, 130, '🎉 FASE CONCLUÍDA!', {
            fontFamily: 'Arial', fontSize: '38px', fontStyle: 'bold', color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(480, 190, this.levelData.name, {
            fontFamily: 'Arial', fontSize: '20px', color: '#cccccc'
        }).setOrigin(0.5);

        this.add.text(480, 230, `⏱️ Tempo: ${formatTime(this.timeUsed)}`, {
            fontFamily: 'Arial', fontSize: '22px', color: '#ffffff'
        }).setOrigin(0.5);

        const bestTime = SaveManager.getBestTime(this.levelData.id);
        if (bestTime != null) {
            this.add.text(480, 265, `🏆 Melhor tempo: ${formatTime(bestTime)}`, {
                fontFamily: 'Arial', fontSize: '16px', color: '#ffd54c'
            }).setOrigin(0.5);
        }

        const next = getNextLevel(this.levelData.id);

        if (next) {
            this.createButton(480, 340, 'PRÓXIMA FASE', () => {
                this.scene.start('GameScene', { levelData: next });
            });
        }

        this.createButton(480, next ? 400 : 340, 'MAPA DE FASES', () => {
            this.scene.start('MapScene');
        }, '#555555');
    }

    createButton(x, y, label, onClick, color = '#1bf103') {
        const button = this.add.text(x, y, label, {
            fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold',
            color: '#ffffff', backgroundColor: color, padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        button.on('pointerover', () => button.setScale(1.05));
        button.on('pointerout', () => button.setScale(1));
        button.on('pointerdown', () => { SFX.play('click'); onClick(); });

        return button;
    }
}

/* =========================================================
   GAME OVER SCENE
========================================================= */

class GameOverScene extends Phaser.Scene {

    constructor() {
        super('GameOverScene');
    }

    init(data) {
        this.levelData = data.levelData;
        this.reason = data.reason;
    }

    create() {
        showGameHud(false);
        this.cameras.main.setBackgroundColor('#2a0d0d');

        const title = this.reason === 'time' ? '⏰ Tempo esgotado!' : '💀 Game Over';

        this.add.text(480, 190, title, {
            fontFamily: 'Arial', fontSize: '38px', fontStyle: 'bold', color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(480, 240, this.levelData.name, {
            fontFamily: 'Arial', fontSize: '18px', color: '#cccccc'
        }).setOrigin(0.5);

        this.createButton(480, 320, 'TENTAR NOVAMENTE', () => {
            this.scene.start('GameScene', { levelData: this.levelData });
        });

        this.createButton(480, 380, 'MAPA DE FASES', () => {
            this.scene.start('MapScene');
        }, '#555555');
    }

    createButton(x, y, label, onClick, color = '#1bf103') {
        const button = this.add.text(x, y, label, {
            fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold',
            color: '#ffffff', backgroundColor: color, padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        button.on('pointerover', () => button.setScale(1.05));
        button.on('pointerout', () => button.setScale(1));
        button.on('pointerdown', () => { SFX.play('click'); onClick(); });

        return button;
    }
}

/* =========================================================
   CONFIGURAÇÃO PRINCIPAL DO PHASER E INÍCIO DO JOGO
========================================================= */

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 960,
    height: 540,
    backgroundColor: '#111111',

    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1400 },
            debug: false
        }
    },

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 960,
        height: 540
    },

    scene: [BootScene, MenuScene, MapScene, GameScene, LevelCompleteScene, GameOverScene]
};

const game = new Phaser.Game(config);

window.addEventListener('blur', () => {
    mobileControls.left = false;
    mobileControls.right = false;
    mobileControls.jump = false;
});
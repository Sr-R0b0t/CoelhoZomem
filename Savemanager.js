/* =========================================================
   SAVE MANAGER
   Controla o progresso salvo do jogador (localStorage).
========================================================= */

const SAVE_KEY = 'muffySaveData_v1';

const SaveManager = {

    getDefault() {
        return {
            unlockedLevels: [1],   // Fase 1 sempre começa destravada
            levelProgress: {}      // { [levelId]: { completed, bestTime } }
        };
    },

    load() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return this.getDefault();

            const parsed = JSON.parse(raw);
            return { ...this.getDefault(), ...parsed };
        } catch (e) {
            console.warn('Save corrompido, iniciando novo progresso.', e);
            return this.getDefault();
        }
    },

    save(data) {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Não foi possível salvar o progresso:', e);
        }
    },

    isUnlocked(levelId) {
        return this.load().unlockedLevels.includes(levelId);
    },

    unlockLevel(levelId) {
        const data = this.load();
        if (!data.unlockedLevels.includes(levelId)) {
            data.unlockedLevels.push(levelId);
            this.save(data);
        }
    },

    isCompleted(levelId) {
        const data = this.load();
        return !!(data.levelProgress[levelId] && data.levelProgress[levelId].completed);
    },

    getBestTime(levelId) {
        const data = this.load();
        const progress = data.levelProgress[levelId];
        return progress ? progress.bestTime : null;
    },

    completeLevel(levelId, timeUsedSeconds) {
        const data = this.load();
        const previous = data.levelProgress[levelId];

        const bestTime = (previous && previous.bestTime != null)
            ? Math.min(previous.bestTime, timeUsedSeconds)
            : timeUsedSeconds;

        data.levelProgress[levelId] = { completed: true, bestTime };
        this.save(data);
    },

    resetProgress() {
        localStorage.removeItem(SAVE_KEY);
    }
};
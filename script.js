// ============ SISTEMA DE MENU ============
const menuIcon = document.getElementById("menuIcon");
const menu = document.getElementById("menu");

menuIcon.addEventListener("click", function(e) {
    e.stopPropagation();
    menu.classList.toggle("active");
    menuIcon.classList.toggle("active");
});

document.addEventListener("click", function(e) {
    if (!menu.contains(e.target) && !menuIcon.contains(e.target)) {
        menu.classList.remove("active");
        menuIcon.classList.remove("active");
    }
});

document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("mouseenter", function() {
        this.style.transform = "translateY(-3px)";
    });
    item.addEventListener("mouseleave", function() {
        this.style.transform = "translateY(0)";
    });
});

// ============ SISTEMA DE ESTADO AVANÇADO ============
class StateManager {
    constructor() {
        this.state = {
            user: this.loadState('user', {
                level: 1,
                points: 0,
                connectionTime: 0,
                ritualsCompleted: 0,
                missionsCompleted: 0,
                quantumActivations: 0,
                achievements: [],
                energy: { solar: 0, lunar: 0, water: 0, wind: 0, quantum: 0 }
            }),
            weather: this.loadState('weather', {}),
            missions: this.loadState('missions', {
                active: [],
                completed: []
            })
        };
    }

    loadState(key, defaultValue) {
        try {
            const stored = localStorage.getItem(`eco_${key}`);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch {
            return defaultValue;
        }
    }

    saveState(key) {
        try {
            localStorage.setItem(`eco_${key}`, JSON.stringify(this.state[key]));
        } catch (e) {
            console.warn('Erro ao guardar estado:', e);
        }
    }

    updateState(key, updates) {
        this.state[key] = { ...this.state[key], ...updates };
        this.saveState(key);
        this.notifyChanges(key);
    }

    notifyChanges(key) {
        window.dispatchEvent(new CustomEvent(`eco-${key}-changed`, {
            detail: this.state[key]
        }));
    }
}

const stateManager = new StateManager();

// ============ SISTEMA DE MISSÕES ============
class MissionSystem {
    constructor() {
        this.missions = {
            'first_observation': {
                title: "Primeira Observação",
                description: "Completa o teu primeiro ritual de observação",
                icon: "🔍",
                reward: { points: 50, energy: { solar: 10 } },
                condition: (state) => state.ritualsCompleted >= 1,
                progress: (state) => Math.min(state.ritualsCompleted, 1)
            },
            'wind_whisperer': {
                title: "Sussurro do Vento",
                description: "Completa 3 rituais com vento acima de 10km/h",
                icon: "💨",
                reward: { points: 100, energy: { wind: 20 } },
                condition: (state) => state.ritualsCompleted >= 3,
                progress: (state) => Math.min(state.ritualsCompleted, 3) / 3
            },
            'quantum_initiate': {
                title: "Iniciado Quântico",
                description: "Ativa o modo quântico 5 vezes",
                icon: "⚛️",
                reward: { points: 150, energy: { quantum: 30 } },
                condition: (state) => state.quantumActivations >= 5,
                progress: (state) => Math.min(state.quantumActivations || 0, 5) / 5
            }
        };
    }

    checkMissions() {
        const state = stateManager.state.user;
        let newMissionUnlocked = false;

        for (const [missionId, mission] of Object.entries(this.missions)) {
            if (!stateManager.state.missions.completed.includes(missionId) &&
                !stateManager.state.missions.active.includes(missionId) &&
                mission.condition(state)) {
                
                stateManager.state.missions.active.push(missionId);
                this.showMissionAlert(mission);
                newMissionUnlocked = true;
            }
        }

        if (newMissionUnlocked) {
            stateManager.saveState('missions');
        }
    }

    showMissionAlert(mission) {
        const alert = document.getElementById('missionAlert');
        const missionText = document.getElementById('missionText');
        
        missionText.textContent = mission.description;
        alert.classList.remove('hidden');

        document.getElementById('acceptMission').onclick = () => {
            alert.classList.add('hidden');
            this.updateMissionsDisplay();
        };
    }

    updateMissionsDisplay() {
        const missionsList = document.getElementById('missionsList');
        const completedMissions = document.getElementById('completedMissions');
        
        const activeMissions = stateManager.state.missions.active;
        completedMissions.textContent = stateManager.state.missions.completed.length;

        missionsList.innerHTML = activeMissions.map(missionId => {
            const mission = this.missions[missionId];
            const progress = mission.progress(stateManager.state.user) * 100;
            
            return `
                <div class="mission-item">
                    <span class="mission-icon">${mission.icon}</span>
                    <span class="mission-text">${mission.title}</span>
                    <div class="mission-progress">
                        <div class="mission-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
        }).join('') || '<div class="mission-item">Nenhuma missão ativa</div>';
    }

    completeMission(missionId) {
        const missionIndex = stateManager.state.missions.active.indexOf(missionId);
        if (missionIndex > -1) {
            stateManager.state.missions.active.splice(missionIndex, 1);
            stateManager.state.missions.completed.push(missionId);
            
            const reward = this.missions[missionId].reward;
            this.applyReward(reward);
            
            stateManager.saveState('missions');
            this.updateMissionsDisplay();
            achievementSystem.showAchievement(this.missions[missionId].title);
        }
    }

    applyReward(reward) {
        if (reward.points) {
            stateManager.updateState('user', {
                points: stateManager.state.user.points + reward.points
            });
        }
        if (reward.energy) {
            const newEnergy = { ...stateManager.state.user.energy };
            Object.keys(reward.energy).forEach(type => {
                newEnergy[type] = (newEnergy[type] || 0) + reward.energy[type];
            });
            stateManager.updateState('user', { energy: newEnergy });
        }
    }
}

// ============ SISTEMA DE ACHIEVEMENTS ============
class AchievementSystem {
    constructor() {
        this.achievements = {
            'first_step': { title: "Primeiro Passo", description: "Completa o primeiro ritual", icon: "👣" },
            'wind_master': { title: "Mestre do Vento", description: "5 rituais de vento completados", icon: "💨" },
            'quantum_explorer': { title: "Explorador Quântico", description: "10 ativações do modo quântico", icon: "⚛️" }
        };
    }

    showAchievement(title) {
        const achievement = Object.values(this.achievements).find(a => a.title === title);
        if (!achievement) return;

        const popup = document.getElementById('achievementPopup');
        const achievementTitle = document.getElementById('achievementTitle');
        const achievementDesc = document.getElementById('achievementDesc');

        achievementTitle.textContent = achievement.title;
        achievementDesc.textContent = achievement.description;
        
        popup.classList.remove('hidden');

        setTimeout(() => {
            popup.classList.add('hidden');
        }, 3000);
    }

    updateAchievementsDisplay() {
        const achievementsGrid = document.getElementById('achievementsGrid');
        const completed = stateManager.state.user.achievements || [];
        
        const displayAchievements = Object.keys(this.achievements).slice(0, 3);
        
        achievementsGrid.innerHTML = displayAchievements.map(achievementId => {
            const isUnlocked = completed.includes(achievementId);
            const achievement = this.achievements[achievementId];
            
            return `
                <div class="${isUnlocked ? 'achievement-unlocked' : 'achievement-locked'}">
                    ${isUnlocked ? achievement.icon : '🔒'}
                </div>
            `;
        }).join('');
    }
}

// ============ SISTEMA DE ENERGIA ============
class EnergySystem {
    constructor() {
        this.energyTypes = ['solar', 'lunar', 'water', 'wind', 'quantum'];
    }

    updateEnergyDisplay() {
        const energy = stateManager.state.user.energy || {};
        
        this.energyTypes.forEach(type => {
            const element = document.getElementById(`${type}Energy`);
            if (element) {
                element.textContent = energy[type] || 0;
            }
        });
    }

    generateEnergy(weatherData, ritualType) {
        const energyGains = {
            solar: this.calculateSolarEnergy(weatherData),
            lunar: this.calculateLunarEnergy(),
            water: this.calculateWaterEnergy(weatherData),
            wind: this.calculateWindEnergy(weatherData),
            quantum: ritualType === 'quantum' ? 5 : 0
        };

        const newEnergy = { ...stateManager.state.user.energy };
        this.energyTypes.forEach(type => {
            newEnergy[type] = (newEnergy[type] || 0) + (energyGains[type] || 0);
        });

        stateManager.updateState('user', { energy: newEnergy });
        this.updateEnergyDisplay();
    }

    calculateSolarEnergy(weatherData) {
        const hour = new Date().getHours();
        const isDaytime = hour >= 6 && hour <= 20;
        const isSunny = weatherData.weatherCode <= 3;
        
        return isDaytime && isSunny ? 2 : 0;
    }

    calculateLunarEnergy() {
        const hour = new Date().getHours();
        const isNighttime = hour < 6 || hour > 20;
        return isNighttime ? 1 : 0;
    }

    calculateWaterEnergy(weatherData) {
        return weatherData.humidity > 70 ? 2 : 0;
    }

    calculateWindEnergy(weatherData) {
        return weatherData.windSpeed > 15 ? 3 : 1;
    }
}

// ============ SISTEMA DE NÍVEL E PROGRESSO ============
class LevelSystem {
    constructor() {
        this.levels = {
            1: { points: 0, title: "Iniciante", color: "#95a5a6" },
            2: { points: 100, title: "Explorador", color: "#2ecc71" },
            3: { points: 300, title: "Guardiano", color: "#3498db" },
            4: { points: 600, title: "Xamã Digital", color: "#9b59b6" },
            5: { points: 1000, title: "Eco-Sapiens", color: "#f1c40f" }
        };
    }

    calculateLevel(points) {
        let currentLevel = 1;
        for (const [level, data] of Object.entries(this.levels)) {
            if (points >= data.points) {
                currentLevel = parseInt(level);
            }
        }
        return currentLevel;
    }

    getLevelProgress(points) {
        const currentLevel = this.calculateLevel(points);
        const currentLevelData = this.levels[currentLevel];
        const nextLevelData = this.levels[currentLevel + 1];
        
        if (!nextLevelData) return 100;
        
        const pointsInLevel = points - currentLevelData.points;
        const pointsToNextLevel = nextLevelData.points - currentLevelData.points;
        
        return (pointsInLevel / pointsToNextLevel) * 100;
    }

    updateLevelDisplay() {
        const points = stateManager.state.user.points || 0;
        const level = this.calculateLevel(points);
        const levelData = this.levels[level];
        const progress = this.getLevelProgress(points);

        document.getElementById('levelBadge').textContent = levelData.title;
        document.getElementById('levelFill').style.width = `${progress}%`;
        document.getElementById('levelFill').style.background = levelData.color;
        document.getElementById('progressLevel').textContent = level;
        document.getElementById('progressPoints').textContent = points;
    }
}

// ============ SISTEMA DE RITUAIS AVANÇADO ============
class BioRitualSystem {
    constructor() {
        this.currentTimer = null;
        this.isRitualActive = false;
        this.currentTimeLeft = 0;
        this.energySystem = new EnergySystem();
    }
    
    generateRitual(weatherData) {
        const rituals = [
            {
                title: "Respiração do Vento",
                description: "Sincroniza tua respiração com o ritmo do vento local.",
                duration: 60,
                type: "wind",
                points: 10,
                energyMultiplier: 1.5
            },
            {
                title: "Grounding Térmico", 
                description: "Conecta com a temperatura ambiente através da respiração consciente.",
                duration: 90,
                type: "thermal",
                points: 15,
                energyMultiplier: 1.2
            },
            {
                title: "Meditação da Humidade",
                description: "Visualiza a humidade do ar como uma chuva purificadora.",
                duration: 120,
                type: "water", 
                points: 20,
                energyMultiplier: 1.3
            },
            {
                title: "Não-Solidez Quântica",
                description: "Sente teu corpo como energia pura - 99.9% espaço vazio vibrando.",
                duration: 180,
                type: "quantum",
                points: 30,
                energyMultiplier: 2.0,
                conditions: { windSpeed: 5 }
            }
        ];
        
        let chosenRitual;
        
        if (weatherData.windSpeed < 5) {
            chosenRitual = rituals[3];
        } else if (weatherData.windSpeed > 10) {
            chosenRitual = rituals[0];
        } else if (Math.abs(weatherData.temperature - 22) > 8) {
            chosenRitual = rituals[1];
        } else if (weatherData.humidity > 70) {
            chosenRitual = rituals[2];
        } else {
            const availableRituals = rituals.filter(r => !r.conditions || 
                weatherData.windSpeed <= r.conditions.windSpeed);
            chosenRitual = availableRituals[Math.floor(Math.random() * availableRituals.length)];
        }
        
        this.currentRitual = chosenRitual;
        this.displayRitual(chosenRitual);
    }
    
    displayRitual(ritual) {
        document.getElementById('ritualName').textContent = ritual.title;
        document.getElementById('ritualTimer').textContent = this.formatTime(ritual.duration);
        this.currentTimeLeft = ritual.duration;
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    startRitual() {
        if (this.isRitualActive || !this.currentRitual) return;
        
        this.isRitualActive = true;
        const ritual = this.currentRitual;
        this.currentTimeLeft = ritual.duration;
        
        const startBtn = document.getElementById('startRitualBtn');
        startBtn.textContent = '⏸️';
        
        this.currentTimer = setInterval(() => {
            this.currentTimeLeft--;
            document.getElementById('ritualTimer').textContent = this.formatTime(this.currentTimeLeft);
            
            const progress = ((ritual.duration - this.currentTimeLeft) / ritual.duration) * 100;
            document.getElementById('progressFill').style.width = `${progress}%`;
            
            if (this.currentTimeLeft <= 0) {
                this.completeRitual();
            }
        }, 1000);
    }
    
    pauseRitual() {
        if (this.currentTimer) {
            clearInterval(this.currentTimer);
            this.currentTimer = null;
        }
        this.isRitualActive = false;
        document.getElementById('startRitualBtn').textContent = '▶️';
    }
    
    completeRitual() {
        this.pauseRitual();
        
        const ritual = this.currentRitual;
        const userState = stateManager.state.user;
        
        const updates = {
            ritualsCompleted: (userState.ritualsCompleted || 0) + 1,
            points: (userState.points || 0) + ritual.points,
            connectionTime: (userState.connectionTime || 0) + ritual.duration
        };
        
        stateManager.updateState('user', updates);
        
        this.energySystem.generateEnergy(window.weatherData, ritual.type);
        
        missionSystem.checkMissions();
        
        document.getElementById('ritualTimer').textContent = 'Concluído!';
        document.getElementById('progressFill').style.width = '100%';
        
        this.updateStatsDisplay();
        levelSystem.updateLevelDisplay();
        
        setTimeout(() => {
            this.generateRitual(window.weatherData);
        }, 3000);
    }
    
    updateStatsDisplay() {
        const user = stateManager.state.user;
        document.getElementById('ritualsCount').textContent = `${user.ritualsCompleted || 0} completos`;
        document.getElementById('progressTime').textContent = `${Math.floor((user.connectionTime || 0) / 60)}min`;
    }
}

// ============ SISTEMA DE MINI-JOGO ============
class MinigameSystem {
    constructor() {
        this.targetHarmony = { temp: 75, humidity: 60, pressure: 45 };
    }

    calculateHarmony(sliderValues) {
        let harmony = 100;
        
        Object.keys(this.targetHarmony).forEach(param => {
            const difference = Math.abs(sliderValues[param] - this.targetHarmony[param]);
            harmony -= difference * 0.5;
        });
        
        const exactMatches = Object.keys(this.targetHarmony).filter(param => 
            Math.abs(sliderValues[param] - this.targetHarmony[param]) <= 2
        ).length;
        
        harmony += exactMatches * 10;
        
        return Math.max(0, Math.min(100, Math.round(harmony)));
    }

    setupMinigame() {
        const harmonizeBtn = document.getElementById('harmonizeBtn');
        const sliders = document.querySelectorAll('.param-slider');
        
        harmonizeBtn.addEventListener('click', () => {
            const sliderValues = {};
            sliders.forEach(slider => {
                sliderValues[slider.dataset.param] = parseInt(slider.value);
            });
            
            const harmony = this.calculateHarmony(sliderValues);
            this.showHarmonyResult(harmony);
            
            if (harmony > 80) {
                stateManager.updateState('user', {
                    points: (stateManager.state.user.points || 0) + 25
                });
                levelSystem.updateLevelDisplay();
            }
        });

        sliders.forEach(slider => {
            slider.addEventListener('input', () => {
                const sliderValues = {};
                sliders.forEach(s => {
                    sliderValues[s.dataset.param] = parseInt(s.value);
                });
                const harmony = this.calculateHarmony(sliderValues);
                document.getElementById('harmonyValue').textContent = `${harmony}%`;
                document.getElementById('harmonyFill').style.width = `${harmony}%`;
            });
        });
    }

    showHarmonyResult(harmony) {
        const messages = {
            90: "🎵 Harmonia Perfeita! A natureza canta contigo.",
            70: "👍 Boa sintonia! O ecossistema responde.",
            50: "🔧 Ajusta um pouco mais...",
            30: "🌪️ Busca o equilíbrio..."
        };
        
        let message = "💤 Começa a harmonizar...";
        for (const [threshold, msg] of Object.entries(messages)) {
            if (harmony >= parseInt(threshold)) {
                message = msg;
                break;
            }
        }
        
        document.getElementById('insightText').textContent = message;
    }
}

// ============ CAMPOS DE FORÇA (OTIMIZADO) ============
class OptimizedForceField {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.fieldType = 'wind';
        this.animationId = null;
        this.lastRenderTime = 0;
        this.fps = 30;
        this.initParticles();
    }
    
    initParticles() {
        this.particles = [];
        const particleCount = this.calculateOptimalParticleCount();
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: 0,
                vy: 0,
                size: 1 + Math.random() * 3,
                life: 0.5 + Math.random() * 0.5,
                decay: 0.001 + Math.random() * 0.002,
                originalSize: 1 + Math.random() * 3
            });
        }
    }
    
    calculateOptimalParticleCount() {
        const isMobile = window.innerWidth < 768;
        const isLowPower = navigator.hardwareConcurrency < 4;
        
        if (isMobile && isLowPower) return 80;
        if (isMobile) return 120;
        return 200;
    }
    
    updateParticles() {
        this.particles.forEach(particle => {
            switch(this.fieldType) {
                case 'wind':
                    particle.vx += 0.1;
                    particle.vy += (Math.random() - 0.5) * 0.2;
                    break;
                case 'thermal':
                    particle.vy -= 0.05;
                    particle.vx += (Math.random() - 0.5) * 0.3;
                    break;
                case 'bio':
                    const centerX = this.canvas.width / 2;
                    const centerY = this.canvas.height / 2;
                    const dx = particle.x - centerX;
                    const dy = particle.y - centerY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx);
                    const force = Math.sin(distance * 0.05 + Date.now() * 0.001) * 0.2;
                    
                    particle.vx += Math.cos(angle) * force;
                    particle.vy += Math.sin(angle) * force;
                    break;
                case 'quantum':
                    if (Math.random() < 0.02) {
                        particle.vx = (Math.random() - 0.5) * 4;
                        particle.vy = (Math.random() - 0.5) * 4;
                    }
                    particle.size = particle.originalSize * (0.5 + 0.5 * Math.sin(Date.now() * 0.002 + particle.x));
                    break;
            }
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            
            particle.life -= particle.decay;
            if (particle.life <= 0 || 
                particle.x < -50 || particle.x > this.canvas.width + 50 ||
                particle.y < -50 || particle.y > this.canvas.height + 50) {
                this.resetParticle(particle);
            }
        });
    }
    
    resetParticle(particle) {
        particle.x = Math.random() * this.canvas.width;
        particle.y = Math.random() * this.canvas.height;
        particle.vx = 0;
        particle.vy = 0;
        particle.life = 0.5 + Math.random() * 0.5;
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        let gradient;
        switch(this.fieldType) {
            case 'wind':
                gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
                gradient.addColorStop(0, 'rgba(52, 152, 219, 0.05)');
                gradient.addColorStop(1, 'rgba(52, 152, 219, 0.1)');
                break;
            case 'thermal':
                gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
                gradient.addColorStop(0, 'rgba(231, 76, 60, 0.05)');
                gradient.addColorStop(1, 'rgba(243, 156, 18, 0.1)');
                break;
            case 'bio':
                gradient = this.ctx.createRadialGradient(
                    this.canvas.width/2, this.canvas.height/2, 0,
                    this.canvas.width/2, this.canvas.height/2, this.canvas.width/2
                );
                gradient.addColorStop(0, 'rgba(46, 204, 113, 0.05)');
                gradient.addColorStop(1, 'rgba(39, 174, 96, 0.1)');
                break;
            case 'quantum':
                gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
                gradient.addColorStop(0, 'rgba(155, 89, 182, 0.05)');
                gradient.addColorStop(1, 'rgba(155, 89, 182, 0.1)');
                break;
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(particle => {
            let color;
            switch(this.fieldType) {
                case 'wind':
                    color = `rgba(52, 152, 219, ${particle.life})`;
                    break;
                case 'thermal':
                    color = `rgba(231, 76, 60, ${particle.life})`;
                    break;
                case 'bio':
                    color = `rgba(46, 204, 113, ${particle.life})`;
                    break;
                case 'quantum':
                    color = `rgba(155, 89, 182, ${particle.life})`;
                    break;
            }
            
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    animate(currentTime) {
        if (!this.lastRenderTime) this.lastRenderTime = currentTime;
        
        const delta = currentTime - this.lastRenderTime;
        
        if (delta > 1000 / this.fps) {
            this.updateParticles();
            this.draw();
            this.lastRenderTime = currentTime;
        }
        
        this.animationId = requestAnimationFrame((time) => this.animate(time));
    }
    
    setFieldType(type) {
        this.fieldType = type;
        this.initParticles();
        this.updateInsight();
        
        if (type === 'quantum') {
            const current = stateManager.state.user.quantumActivations || 0;
            stateManager.updateState('user', { quantumActivations: current + 1 });
            missionSystem.checkMissions();
        }
    }
    
    updateInsight() {
        const insightText = document.getElementById('insightText');
        const insights = {
            wind: "O vento lembra que tudo está em constante movimento e transformação.",
            thermal: "O calor é energia em transição - tudo vibra em frequências específicas.",
            bio: "A vida emerge de padrões complexos no campo biológico universal.",
            quantum: "No nível quântico, a matéria é 99.9% espaço vazio - pura potencialidade."
        };
        insightText.textContent = insights[this.fieldType] || insights.wind;
    }
    
    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.initParticles();
    }
    
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// ============ SISTEMA DE TUTORIAL ============
class TutorialSystem {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 3;
        this.hasSeenTutorial = localStorage.getItem('eco_tutorial_seen') === 'true';
    }

    showTutorial() {
        if (!this.hasSeenTutorial) {
            document.getElementById('tutorialModal').style.display = 'flex';
        }
    }

    setupTutorial() {
        const tutorialModal = document.getElementById('tutorialModal');
        const nextBtn = document.getElementById('nextStep');
        const skipBtn = document.getElementById('skipTutorial');
        const startBtn = document.getElementById('startPlaying');

        // Mostrar tutorial para novos utilizadores
        if (!this.hasSeenTutorial) {
            setTimeout(() => {
                tutorialModal.style.display = 'flex';
                this.updateTutorialDisplay();
            }, 1500);
        }

        nextBtn.addEventListener('click', () => {
            this.currentStep++;
            this.updateTutorialDisplay();
        });

        skipBtn.addEventListener('click', () => {
            this.completeTutorial();
        });

        startBtn.addEventListener('click', () => {
            this.completeTutorial();
        });
    }

    updateTutorialDisplay() {
        // Esconder todos os passos
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });

        // Mostrar passo atual
        const currentStepElement = document.querySelector(`[data-step="${this.currentStep}"]`);
        if (currentStepElement) {
            currentStepElement.classList.add('active');
        }

        // Atualizar botões
        const nextBtn = document.getElementById('nextStep');
        const startBtn = document.getElementById('startPlaying');
        const skipBtn = document.getElementById('skipTutorial');

        if (this.currentStep >= this.totalSteps) {
            nextBtn.style.display = 'none';
            startBtn.style.display = 'block';
            skipBtn.style.display = 'none';
        } else {
            nextBtn.style.display = 'block';
            startBtn.style.display = 'none';
            skipBtn.style.display = 'block';
        }
    }

    completeTutorial() {
        document.getElementById('tutorialModal').style.display = 'none';
        localStorage.setItem('eco_tutorial_seen', 'true');
        this.hasSeenTutorial = true;
        
        // Mostrar mensagem de boas-vindas
        document.getElementById('insightText').textContent = "🎉 Tutorial completo! Agora explora o ECO-SAPIENS por ti mesmo!";
    }

    showHelpGuide() {
        // Criar modal de guia completo
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.style.display = 'flex';
        
        modalOverlay.innerHTML = `
            <div class="guide-modal">
                <h2>📚 Guia Completo ECO-SAPIENS</h2>
                
                <div class="guide-section">
                    <h3>🎮 COMO JOGAR</h3>
                    <p><strong>1. Rituais (Coluna Esquerda)</strong> - Clica ▶️ para iniciar exercícios de conexão com a natureza. Dura 1-3 minutos.</p>
                    <p><strong>2. Mini-Jogo (Centro)</strong> - Ajusta os sliders para criar harmonia perfeita. Objetivo: >80% de harmonia.</p>
                    <p><strong>3. Missões</strong> - Completa objetivos para ganhar pontos e energia especial.</p>
                    <p><strong>4. Campos de Força</strong> - Experimenta os 4 modos de visualização diferentes.</p>
                </div>
                
                <div class="guide-section">
                    <h3>⚡ SISTEMA DE ENERGIA</h3>
                    <p>• <strong>Solar ☀️</strong> - Ganha com rituais durante o dia com sol</p>
                    <p>• <strong>Lunar 🌙</strong> - Ganha com rituais durante a noite</p>
                    <p>• <strong>Água 💧</strong> - Ganha com humidade alta (>70%)</p>
                    <p>• <strong>Vento 💨</strong> - Ganha com vento forte (>15km/h)</p>
                    <p>• <strong>Quântica ⚛️</strong> - Ganha ativando o modo quântico</p>
                </div>
                
                <div class="guide-section">
                    <h3>🏆 SISTEMA DE PROGRESSO</h3>
                    <p><strong>Níveis:</strong> Iniciante → Explorador → Guardião → Xamã Digital → Eco-Sapiens</p>
                    <p><strong>Pontos:</strong> Ganha completando rituais e missões</p>
                    <p><strong>Conquistas:</strong> Desbloqueia achievements especiais</p>
                </div>
                
                <div class="guide-section">
                    <h3>💡 DICAS RÁPIDAS</h3>
                    <p>• Completa pelo menos 3 rituais por dia</p>
                    <p>• Foca em atingir alta harmonia no mini-jogo</p>
                    <p>• Experimenta todos os campos de força</p>
                    <p>• Verifica as missões regularmente</p>
                </div>
                
                <button class="btn-close-guide">Fechar Guia</button>
            </div>
        `;
        
        document.body.appendChild(modalOverlay);
        
        // Fechar modal
        modalOverlay.querySelector('.btn-close-guide').addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
        });
        
        // Fechar ao clicar fora
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                document.body.removeChild(modalOverlay);
            }
        });
    }
}

// ============ SISTEMAS PRINCIPAIS ============
const missionSystem = new MissionSystem();
const achievementSystem = new AchievementSystem();
const levelSystem = new LevelSystem();
const ritualSystem = new BioRitualSystem();
const minigameSystem = new MinigameSystem();
const tutorialSystem = new TutorialSystem();
let forceField;

// ============ PRINCÍPIOS QUÂNTICOS ============
function setupQuantumPrinciples() {
    const principles = {
        'non-solidity': "A matéria é 99.9% espaço vazio com campos quânticos. O que percebemos como sólido é vibração pura.",
        'interconnection': "Tudo está emaranhado a nível quântico. Separação é uma ilusão da percepção limitada.",
        'transformation': "Como E=MC² mostra, massa e energia são intercambiáveis. Tudo pode transmutar."
    };
    
    document.querySelectorAll('.principle-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.principle-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            const principle = this.dataset.principle;
            document.getElementById('principleDetail').innerHTML = `<p>${principles[principle]}</p>`;
        });
    });
}

// ============ ESPÉCIES ============
async function loadLocalSpecies(lat, lon) {
    try {
        const speciesExamples = [
            "Pardal-comum", "Oliveira", "Abelha-europeia", 
            "Pinheiro-manso", "Toutinegra", "Urze", "Lavanda", "Alecrim"
        ];
        
        const shuffled = speciesExamples.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 4);
    } catch (error) {
        return ["Pardal-comum", "Oliveira", "Abelha-europeia"];
    }
}

function displaySpecies(speciesList) {
    const container = document.getElementById('speciesList');
    const speciesCount = document.getElementById('speciesCount');
    
    container.innerHTML = speciesList.map(species => 
        `<div class="species-item">${species}</div>`
    ).join('');
    
    speciesCount.textContent = speciesList.length;
}

// ============ ATUALIZAÇÃO DA UI ============
function updateWeatherUI(weatherData) {
    document.getElementById('mainTemp').textContent = `${weatherData.temperature}°C`;
    document.getElementById('windStat').textContent = `${weatherData.windSpeed}km/h`;
    document.getElementById('humidityStat').textContent = `${weatherData.humidity}%`;
    document.getElementById('pressureStat').textContent = `${weatherData.pressure}hPa`;
}

// ============ SIMULAÇÃO DE DADOS DE TEMPO ============
function simulateWeatherData() {
    return {
        temperature: Math.floor(Math.random() * 15) + 15, // 15-30°C
        windSpeed: Math.floor(Math.random() * 20) + 5,    // 5-25 km/h
        humidity: Math.floor(Math.random() * 50) + 30,    // 30-80%
        pressure: Math.floor(Math.random() * 30) + 1000,  // 1000-1030 hPa
        weatherCode: Math.floor(Math.random() * 5)        // 0-4
    };
}

// ============ CONTROLES DE VISUALIZAÇÃO ============
function setupVisualizationControls() {
    document.querySelectorAll('.viz-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.viz-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const fieldType = this.dataset.field;
            forceField.setFieldType(fieldType);
        });
    });
}

// ============ CONTROLE DE RITUAL ============
function setupRitualControls() {
    const startBtn = document.getElementById('startRitualBtn');
    startBtn.addEventListener('click', function() {
        if (ritualSystem.isRitualActive) {
            ritualSystem.pauseRitual();
        } else {
            ritualSystem.startRitual();
        }
    });
}

// ============ SISTEMA DE AJUDA ============
function setupHelpSystem() {
    // Botão de ajuda no header
    document.getElementById('helpIcon').addEventListener('click', () => {
        tutorialSystem.showHelpGuide();
    });
    
    // Botão de guia completo no módulo de ajuda
    document.getElementById('showFullGuide').addEventListener('click', () => {
        tutorialSystem.showHelpGuide();
    });
    
    // Tooltips automáticos para elementos com a classe tooltip
    setupAutoTooltips();
}

function setupAutoTooltips() {
    // Os tooltips já funcionam via CSS, esta função é para lógica adicional se necessário
    console.log('🔧 Tooltips configurados automaticamente');
}

// ============ INICIALIZAÇÃO DA APLICAÇÃO ============
async function initializeApp() {
    console.log('🚀 Inicializando ECO-SAPIENS...');
    
    // Mostrar loading screen
    const loadingScreen = document.getElementById('loadingScreen');
    
    try {
        // 1. Inicializar dados básicos
        window.weatherData = simulateWeatherData();
        updateWeatherUI(window.weatherData);
        
        // 2. Inicializar sistemas
        forceField = new OptimizedForceField();
        
        // 3. Configurar controles
        setupVisualizationControls();
        setupRitualControls();
        setupQuantumPrinciples();
        minigameSystem.setupMinigame();
        
        // 4. Configurar sistema de tutorial e ajuda
        tutorialSystem.setupTutorial();
        setupHelpSystem();
        
        // 5. Carregar espécies locais
        const species = await loadLocalSpecies();
        displaySpecies(species);
        
        // 6. Inicializar ritual
        ritualSystem.generateRitual(window.weatherData);
        
        // 7. Atualizar displays
        missionSystem.updateMissionsDisplay();
        achievementSystem.updateAchievementsDisplay();
        levelSystem.updateLevelDisplay();
        ritualSystem.updateStatsDisplay();
        
        // 8. Iniciar animação
        forceField.resize();
        forceField.animate(performance.now());
        
        // 9. Configurar redimensionamento
        window.addEventListener('resize', () => {
            forceField.resize();
        });
        
        // 10. Esconder loading screen após um tempo
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            console.log('✅ ECO-SAPIENS inicializado com sucesso!');
        }, 2000);
        
    } catch (error) {
        console.error('❌ Erro ao inicializar aplicação:', error);
        loadingScreen.classList.add('hidden');
    }
}

// ============ INICIAR APLICAÇÃO ============
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

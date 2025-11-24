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

// ============ ESTADO DA APLICAÇÃO ============
const state = {
    userLocation: null,
    weatherData: null,
    ritualsCompleted: parseInt(localStorage.getItem('eco_ritualsCompleted')) || 0,
    ecoPoints: parseInt(localStorage.getItem('eco_ecoPoints')) || 0,
    currentRitual: null,
    activeField: 'wind'
};

// ============ SISTEMA DE CARREGAMENTO ============
const loadingScreen = document.getElementById('loadingScreen');

function hideLoading() {
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        setTimeout(() => loadingScreen.remove(), 500);
    }, 1500);
}

// ============ GEOLOCALIZAÇÃO ============
async function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocalização não suportada'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                state.userLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                resolve(state.userLocation);
            },
            error => {
                reject(new Error('Permissão de localização negada'));
            },
            {
                timeout: 10000,
                enableHighAccuracy: false
            }
        );
    });
}

// ============ API WEATHER - APENAS DADOS REAIS ============
async function getWeatherData(lat, lon) {
    try {
        // Open-Meteo API - completamente gratuita e sem chave
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure,weather_code&timezone=auto`
        );
        
        if (!response.ok) throw new Error('Open-Meteo API error');
        
        const data = await response.json();
        const current = data.current;
        
        // Obter nome da localização via API de geocoding reversa
        const locationName = await getLocationName(lat, lon);
        
        return {
            temperature: Math.round(current.temperature_2m),
            humidity: Math.round(current.relative_humidity_2m),
            windSpeed: Math.round(current.wind_speed_10m * 3.6), // converter para km/h
            windDeg: current.wind_direction_10m,
            pressure: Math.round(current.surface_pressure),
            weatherCode: current.weather_code,
            description: getWeatherDescriptionFromCode(current.weather_code),
            location: locationName
        };
    } catch (error) {
        console.error('Erro ao obter dados meteorológicos:', error);
        throw new Error('Não foi possível obter dados meteorológicos em tempo real');
    }
}

// API de Geocoding Reversa para obter nome da localização
async function getLocationName(lat, lon) {
    try {
        const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`
        );
        
        if (response.ok) {
            const data = await response.json();
            return data.city || data.locality || 'Localização Atual';
        }
    } catch (error) {
        console.log('Geocoding API falhou');
    }
    
    return 'Tua Localização';
}

// Converter código meteorológico em descrição
function getWeatherDescriptionFromCode(weatherCode) {
    const weatherCodes = {
        0: 'Céu limpo',
        1: 'Principalmente limpo',
        2: 'Parcialmente nublado',
        3: 'Nublado',
        45: 'Nevoeiro',
        48: 'Nevoeiro com geada',
        51: 'Chuvisco leve',
        53: 'Chuvisco moderado',
        55: 'Chuvisco denso',
        56: 'Chuvisco gelado leve',
        57: 'Chuvisco gelado denso',
        61: 'Chuva leve',
        63: 'Chuva moderada',
        65: 'Chuva forte',
        66: 'Chuva gelada leve',
        67: 'Chuva gelada forte',
        71: 'Queda de neve leve',
        73: 'Queda de neve moderada',
        75: 'Queda de neve forte',
        77: 'Grãos de neve',
        80: 'Pancadas de chuva leves',
        81: 'Pancadas de chuva moderadas',
        82: 'Pancadas de chuva violentas',
        85: 'Pancadas de neve leves',
        86: 'Pancadas de neve fortes',
        95: 'Trovoada',
        96: 'Trovoada com granizo leve',
        99: 'Trovoada com granizo forte'
    };
    
    return weatherCodes[weatherCode] || 'Condições desconhecidas';
}

// ============ VISUALIZAÇÃO DO CLIMA ============
const weatherCanvas = document.getElementById('weatherCanvas');
const weatherCtx = weatherCanvas.getContext('2d');

function setupWeatherCanvas() {
    weatherCanvas.width = weatherCanvas.clientWidth;
    weatherCanvas.height = weatherCanvas.clientHeight;
}

function drawWeatherVisualization(weatherData) {
    if (!weatherCtx) return;
    
    const width = weatherCanvas.width;
    const height = weatherCanvas.height;
    
    // Limpar canvas
    weatherCtx.clearRect(0, 0, width, height);
    
    // Fundo baseado nas condições reais
    let gradient;
    if (weatherData.weatherCode >= 0 && weatherData.weatherCode <= 3) {
        // Céu limpo a nublado
        gradient = weatherCtx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, 'rgba(135, 206, 235, 0.2)'); // Azul céu
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    } else if (weatherData.weatherCode >= 45 && weatherData.weatherCode <= 48) {
        // Nevoeiro
        gradient = weatherCtx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, 'rgba(210, 210, 210, 0.3)');
        gradient.addColorStop(1, 'rgba(180, 180, 180, 0.2)');
    } else if (weatherData.weatherCode >= 51 && weatherData.weatherCode <= 67) {
        // Chuva
        gradient = weatherCtx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, 'rgba(100, 149, 237, 0.3)'); // Azul acinzentado
        gradient.addColorStop(1, 'rgba(70, 130, 180, 0.2)');
    } else {
        // Condições diversas
        gradient = weatherCtx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, 'rgba(46, 204, 113, 0.1)');
        gradient.addColorStop(1, 'rgba(52, 152, 219, 0.1)');
    }
    
    weatherCtx.fillStyle = gradient;
    weatherCtx.fillRect(0, 0, width, height);
    
    // Desenhar elementos baseados nos dados meteorológicos REAIS
    drawWindLines(weatherData.windSpeed, weatherData.windDeg);
    drawTemperatureCircles(weatherData.temperature);
    drawHumidityDrops(weatherData.humidity);
    drawWeatherSymbol(weatherData.weatherCode);
}

function drawWindLines(speed, deg) {
    const centerX = weatherCanvas.width / 2;
    const centerY = weatherCanvas.height / 2;
    const maxLength = Math.min(centerX, centerY) * 0.6;
    
    const angle = (deg * Math.PI) / 180;
    const length = (speed / 30) * maxLength;
    
    // Cor baseada na velocidade do vento REAL
    const intensity = Math.min(1, speed / 20);
    weatherCtx.strokeStyle = `rgba(52, 152, 219, ${0.3 + intensity * 0.7})`;
    weatherCtx.lineWidth = 1 + intensity * 3;
    weatherCtx.setLineDash([5, 3]);
    
    weatherCtx.beginPath();
    weatherCtx.moveTo(centerX, centerY);
    weatherCtx.lineTo(
        centerX + Math.cos(angle) * length,
        centerY + Math.sin(angle) * length
    );
    weatherCtx.stroke();
    
    // Ponta da seta
    weatherCtx.setLineDash([]);
    const arrowSize = 8;
    const endX = centerX + Math.cos(angle) * length;
    const endY = centerY + Math.sin(angle) * length;
    
    weatherCtx.beginPath();
    weatherCtx.moveTo(endX, endY);
    weatherCtx.lineTo(
        endX - Math.cos(angle - Math.PI/6) * arrowSize,
        endY - Math.sin(angle - Math.PI/6) * arrowSize
    );
    weatherCtx.lineTo(
        endX - Math.cos(angle + Math.PI/6) * arrowSize,
        endY - Math.sin(angle + Math.PI/6) * arrowSize
    );
    weatherCtx.closePath();
    weatherCtx.fillStyle = `rgba(52, 152, 219, ${0.3 + intensity * 0.7})`;
    weatherCtx.fill();
}

function drawTemperatureCircles(temperature) {
    const centerX = weatherCanvas.width / 2;
    const centerY = weatherCanvas.height / 2;
    
    // Cor baseada na temperatura REAL
    let hue;
    if (temperature < 0) hue = 240;       // Azul (frio)
    else if (temperature < 10) hue = 200; // Azul claro
    else if (temperature < 20) hue = 160; // Verde-azulado
    else if (temperature < 30) hue = 120; // Verde
    else hue = 60;                        // Amarelo (quente)
    
    const intensity = Math.min(1, Math.abs(temperature - 15) / 30);
    weatherCtx.fillStyle = `hsla(${hue}, 70%, 50%, ${0.2 + intensity * 0.3})`;
    
    // Número de círculos baseado na temperatura REAL
    const circleCount = Math.max(3, Math.min(8, Math.floor(Math.abs(temperature) / 5)));
    const baseRadius = 20;
    
    for (let i = 0; i < circleCount; i++) {
        const radius = baseRadius + (i * 12);
        const pulse = Math.sin(Date.now() / 1000 + i) * 2;
        
        weatherCtx.beginPath();
        weatherCtx.arc(centerX, centerY, radius + pulse, 0, 2 * Math.PI);
        
        if (i % 2 === 0) {
            weatherCtx.fill();
        } else {
            weatherCtx.strokeStyle = `hsla(${hue}, 70%, 50%, ${0.3 + intensity * 0.2})`;
            weatherCtx.lineWidth = 1;
            weatherCtx.stroke();
        }
    }
}

function drawHumidityDrops(humidity) {
    const dropCount = Math.floor(humidity / 15); // Baseado na humidade REAL
    
    for (let i = 0; i < dropCount; i++) {
        const x = Math.random() * weatherCanvas.width;
        const y = Math.random() * weatherCanvas.height;
        const size = 1 + Math.random() * 3;
        const alpha = 0.1 + (humidity / 200); // Alpha baseado na humidade REAL
        
        weatherCtx.fillStyle = `rgba(52, 152, 219, ${alpha})`;
        
        // Desenhar gota
        weatherCtx.beginPath();
        weatherCtx.moveTo(x, y);
        weatherCtx.lineTo(x - size, y + size * 4);
        weatherCtx.lineTo(x + size, y + size * 4);
        weatherCtx.closePath();
        weatherCtx.fill();
    }
}

function drawWeatherSymbol(weatherCode) {
    const centerX = weatherCanvas.width / 2;
    const centerY = weatherCanvas.height / 2;
    
    weatherCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    weatherCtx.font = '24px Arial';
    weatherCtx.textAlign = 'center';
    weatherCtx.textBaseline = 'middle';
    
    let symbol = '☀️'; // Default
    
    if (weatherCode >= 0 && weatherCode <= 3) symbol = '☀️';
    else if (weatherCode >= 45 && weatherCode <= 48) symbol = '🌫️';
    else if (weatherCode >= 51 && weatherCode <= 67) symbol = '🌧️';
    else if (weatherCode >= 71 && weatherCode <= 77) symbol = '❄️';
    else if (weatherCode >= 80 && weatherCode <= 86) symbol = '⛈️';
    else if (weatherCode >= 95 && weatherCode <= 99) symbol = '🌩️';
    
    weatherCtx.fillText(symbol, centerX, centerY - 60);
}

// ============ SISTEMA DE RITUAIS ============
class BioRitualSystem {
    constructor() {
        this.currentTimer = null;
        this.isRitualActive = false;
    }
    
    generateRitual(weatherData) {
        const rituals = [
            {
                title: "Respiração do Vento",
                description: `Sincroniza tua respiração com o vento de ${weatherData.windSpeed} km/h. Inspira por 4s, expira por 6s.`,
                duration: 60,
                type: "wind",
                points: 10
            },
            {
                title: "Grounding Térmico", 
                description: `Conecta com a temperatura de ${weatherData.temperature}°C. Sente o calor/frio e ajusta tua respiração.`,
                duration: 90,
                type: "thermal",
                points: 15
            },
            {
                title: "Meditação da Humidade",
                description: `Visualiza a humidade de ${weatherData.humidity}% como uma brisa refrescante que te envolve.`,
                duration: 120,
                type: "water",
                points: 20
            },
            {
                title: "Conexão com a Pressão",
                description: `Sente a pressão atmosférica de ${weatherData.pressure} hPa como um abraço da Terra. Relaxa e entrega-te.`,
                duration: 75,
                type: "pressure", 
                points: 12
            }
        ];
        
        // Escolher ritual baseado nos dados meteorológicos REAIS
        let chosenRitual;
        if (weatherData.windSpeed > 5) {
            chosenRitual = rituals[0]; // Vento
        } else if (Math.abs(weatherData.temperature - 22) > 8) {
            chosenRitual = rituals[1]; // Temperatura extrema
        } else if (weatherData.humidity > 70) {
            chosenRitual = rituals[2]; // Humidade alta
        } else {
            chosenRitual = rituals[3]; // Pressão
        }
        
        state.currentRitual = chosenRitual;
        this.displayRitual(chosenRitual);
    }
    
    displayRitual(ritual) {
        document.getElementById('ritualTitle').textContent = ritual.title;
        document.getElementById('ritualDescription').textContent = ritual.description;
        document.getElementById('timerCount').textContent = ritual.duration;
    }
    
    startRitual() {
        if (this.isRitualActive || !state.currentRitual) return;
        
        this.isRitualActive = true;
        const ritual = state.currentRitual;
        let timeLeft = ritual.duration;
        
        const startBtn = document.getElementById('startRitual');
        const timerCircle = document.querySelector('.timer-circle');
        
        startBtn.disabled = true;
        startBtn.textContent = 'Ritual em Progresso...';
        timerCircle.style.borderColor = '#2ecc71';
        
        this.currentTimer = setInterval(() => {
            timeLeft--;
            document.getElementById('timerCount').textContent = timeLeft;
            
            // Animação do círculo
            const progress = (ritual.duration - timeLeft) / ritual.duration;
            timerCircle.style.background = `conic-gradient(#2ecc71 ${progress * 360}deg, transparent ${progress * 360}deg)`;
            
            if (timeLeft <= 0) {
                this.completeRitual();
            }
        }, 1000);
    }
    
    completeRitual() {
        clearInterval(this.currentTimer);
        this.isRitualActive = false;
        
        state.ritualsCompleted++;
        state.ecoPoints += state.currentRitual.points;
        
        this.updateStats();
        this.saveProgress();
        
        const startBtn = document.getElementById('startRitual');
        const timerCircle = document.querySelector('.timer-circle');
        
        startBtn.disabled = false;
        startBtn.textContent = 'Ritual Concluído! ✨';
        timerCircle.style.background = '';
        timerCircle.style.borderColor = '#2ecc71';
        
        // Efeito visual de conclusão
        document.querySelector('.ritual-active').style.boxShadow = '0 0 20px rgba(46, 204, 113, 0.5)';
        
        setTimeout(() => {
            startBtn.textContent = 'Iniciar Novo Ritual';
            document.querySelector('.ritual-active').style.boxShadow = '';
            this.generateRitual(state.weatherData);
        }, 3000);
    }
    
    updateStats() {
        document.getElementById('ritualsCompleted').textContent = state.ritualsCompleted;
        document.getElementById('ecoPoints').textContent = state.ecoPoints;
    }
    
    saveProgress() {
        localStorage.setItem('eco_ritualsCompleted', state.ritualsCompleted.toString());
        localStorage.setItem('eco_ecoPoints', state.ecoPoints.toString());
    }
}

// ============ MAPA DE ESPÉCIES - DADOS REAIS ============
async function loadLocalSpecies(lat, lon) {
    try {
        // GBIF API - dados reais de biodiversidade
        const response = await fetch(
            `https://api.gbif.org/v1/occurrence/search?lat=${lat}&lon=${lon}&limit=6&radius=50&hasCoordinate=true&hasGeospatialIssue=false&basisOfRecord=HUMAN_OBSERVATION&year=2022,2023,2024`
        );
        
        if (!response.ok) throw new Error('GBIF API error');
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            // Filtrar e processar dados REAIS
            const realSpecies = data.results
                .filter(occurrence => occurrence.species && occurrence.family)
                .slice(0, 6)
                .map(occurrence => ({
                    species: occurrence.species,
                    family: occurrence.family,
                    year: occurrence.year
                }));
            
            return realSpecies.length > 0 ? realSpecies : getFallbackSpecies();
        } else {
            return getFallbackSpecies();
        }
    } catch (error) {
        console.log('API de espécies temporariamente indisponível');
        return getFallbackSpecies();
    }
}

// Apenas espécies reais como fallback
function getFallbackSpecies() {
    return [
        { species: 'Pardal-comum', family: 'Passeridae', year: 'Observação comum' },
        { species: 'Andorinha-das-chaminés', family: 'Hirundinidae', year: 'Migratória' },
        { species: 'Pombo-doméstico', family: 'Columbidae', year: 'Urbana' }
    ];
}

function displaySpecies(speciesList) {
    const container = document.getElementById('speciesList');
    
    if (!speciesList || speciesList.length === 0) {
        container.innerHTML = '<div class="species-item">🔍 A explorar biodiversidade local...</div>';
        return;
    }
    
    container.innerHTML = speciesList.map(species => `
        <div class="species-item">
            <strong>${species.species}</strong>
            <br>
            <small>${species.family} • ${species.year || 'Observada'}</small>
        </div>
    `).join('');
}

// ============ CAMPOS DE FORÇA ============
const forceCanvas = document.getElementById('forceCanvas');
const forceCtx = forceCanvas.getContext('2d');
let forceAnimationId = null;

function setupForceCanvas() {
    forceCanvas.width = forceCanvas.clientWidth;
    forceCanvas.height = forceCanvas.clientHeight;
}

class ForceFieldVisualization {
    constructor() {
        this.particles = [];
        this.fieldType = 'wind';
        this.initParticles();
    }
    
    initParticles() {
        this.particles = [];
        const particleCount = 150;
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * forceCanvas.width,
                y: Math.random() * forceCanvas.height,
                vx: 0,
                vy: 0,
                size: 1 + Math.random() * 4,
                life: 0.5 + Math.random() * 0.5,
                decay: 0.001 + Math.random() * 0.002,
                originalSize: 1 + Math.random() * 4
            });
        }
    }
    
    updateParticles() {
        this.particles.forEach(particle => {
            // Forças baseadas no tipo de campo (visual apenas)
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
                    const centerX = forceCanvas.width / 2;
                    const centerY = forceCanvas.height / 2;
                    const dx = particle.x - centerX;
                    const dy = particle.y - centerY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx);
                    const force = Math.sin(distance * 0.05 + Date.now() * 0.001) * 0.2;
                    
                    particle.vx += Math.cos(angle) * force;
                    particle.vy += Math.sin(angle) * force;
                    break;
            }
            
            // Atualizar posição
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Reduzir velocidade
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            
            // Decaimento e renascimento
            particle.life -= particle.decay;
            if (particle.life <= 0 || 
                particle.x < -50 || particle.x > forceCanvas.width + 50 ||
                particle.y < -50 || particle.y > forceCanvas.height + 50) {
                this.resetParticle(particle);
            }
        });
    }
    
    resetParticle(particle) {
        particle.x = Math.random() * forceCanvas.width;
        particle.y = Math.random() * forceCanvas.height;
        particle.vx = 0;
        particle.vy = 0;
        particle.life = 0.5 + Math.random() * 0.5;
    }
    
    draw() {
        forceCtx.clearRect(0, 0, forceCanvas.width, forceCanvas.height);
        
        // Fundo com gradiente
        let gradient;
        switch(this.fieldType) {
            case 'wind':
                gradient = forceCtx.createLinearGradient(0, 0, forceCanvas.width, 0);
                gradient.addColorStop(0, 'rgba(52, 152, 219, 0.05)');
                gradient.addColorStop(1, 'rgba(52, 152, 219, 0.1)');
                break;
            case 'thermal':
                gradient = forceCtx.createLinearGradient(0, 0, 0, forceCanvas.height);
                gradient.addColorStop(0, 'rgba(231, 76, 60, 0.05)');
                gradient.addColorStop(1, 'rgba(243, 156, 18, 0.1)');
                break;
            case 'bio':
                gradient = forceCtx.createRadialGradient(
                    forceCanvas.width/2, forceCanvas.height/2, 0,
                    forceCanvas.width/2, forceCanvas.height/2, forceCanvas.width/2
                );
                gradient.addColorStop(0, 'rgba(46, 204, 113, 0.05)');
                gradient.addColorStop(1, 'rgba(39, 174, 96, 0.1)');
                break;
        }
        
        forceCtx.fillStyle = gradient;
        forceCtx.fillRect(0, 0, forceCanvas.width, forceCanvas.height);
        
        // Desenhar partículas
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
            }
            
            forceCtx.fillStyle = color;
            forceCtx.beginPath();
            forceCtx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
            forceCtx.fill();
        });
    }
    
    animate() {
        this.updateParticles();
        this.draw();
        forceAnimationId = requestAnimationFrame(() => this.animate());
    }
    
    setFieldType(type) {
        this.fieldType = type;
        this.initParticles();
    }
    
    stop() {
        if (forceAnimationId) {
            cancelAnimationFrame(forceAnimationId);
        }
    }
}

// ============ INICIALIZAÇÃO DA APLICAÇÃO ============
async function initializeApp() {
    try {
        console.log('🌱 Iniciando ECO-SAPIENS com dados REAIS...');
        
        // 1. Obter localização REAL do usuário
        await getUserLocation();
        console.log('📍 Localização REAL obtida:', state.userLocation);
        
        // 2. Carregar dados meteorológicos REAIS
        state.weatherData = await getWeatherData(state.userLocation.lat, state.userLocation.lon);
        console.log('🌤 Dados meteorológicos REAIS:', state.weatherData);
        
        // 3. Atualizar UI com dados REAIS
        updateWeatherUI(state.weatherData);
        
        // 4. Configurar visualizações
        setupWeatherCanvas();
        setupForceCanvas();
        drawWeatherVisualization(state.weatherData);
        
        // 5. Inicializar sistemas com dados REAIS
        const ritualSystem = new BioRitualSystem();
        ritualSystem.generateRitual(state.weatherData);
        ritualSystem.updateStats();
        
        // 6. Inicializar campos de força (visual apenas)
        const forceField = new ForceFieldVisualization();
        forceField.animate();
        
        // 7. Carregar espécies locais REAIS
        const species = await loadLocalSpecies(state.userLocation.lat, state.userLocation.lon);
        displaySpecies(species);
        
        // 8. Configurar event listeners
        document.getElementById('startRitual').addEventListener('click', () => {
            ritualSystem.startRitual();
        });
        
        document.getElementById('refreshSpecies').addEventListener('click', async () => {
            const refreshBtn = document.getElementById('refreshSpecies');
            refreshBtn.textContent = '🔄 A procurar...';
            const species = await loadLocalSpecies(state.userLocation.lat, state.userLocation.lon);
            displaySpecies(species);
            refreshBtn.textContent = '🔄 Atualizar';
        });
        
        // Controles dos campos de força
        document.getElementById('windField').classList.add('active');
        document.getElementById('windField').addEventListener('click', () => {
            forceField.setFieldType('wind');
            setActiveFieldButton('windField');
        });
        
        document.getElementById('thermalField').addEventListener('click', () => {
            forceField.setFieldType('thermal');
            setActiveFieldButton('thermalField');
        });
        
        document.getElementById('bioField').addEventListener('click', () => {
            forceField.setFieldType('bio');
            setActiveFieldButton('bioField');
        });
        
        // 9. Esconder loading screen
        hideLoading();
        
        console.log('✅ ECO-SAPIENS inicializado com DADOS REAIS!');
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        
        // Mostrar erro ao usuário em vez de dados simulados
        document.getElementById('loadingScreen').innerHTML = `
            <div class="loading-content">
                <h2>🌍 ECO-SAPIENS</h2>
                <p>⚠️ ${error.message}</p>
                <p style="font-size: 0.9rem; margin-top: 10px;">
                    Para uma experiência completa, permite a localização e verifica a ligação à internet.
                </p>
                <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: var(--primary); border: none; border-radius: 20px; color: white; cursor: pointer;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

function updateWeatherUI(weatherData) {
    document.getElementById('temperature').textContent = `${weatherData.temperature}°C`;
    document.getElementById('humidity').textContent = `${weatherData.humidity}%`;
    document.getElementById('wind').textContent = `${weatherData.windSpeed} km/h`;
    document.getElementById('pressure').textContent = `${weatherData.pressure} hPa`;
    document.getElementById('locationInfo').innerHTML = 
        `📍 ${weatherData.location} | ${weatherData.description}`;
}

function setActiveFieldButton(activeId) {
    document.querySelectorAll('.force-controls button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(activeId).classList.add('active');
}

// ============ EVENT LISTENERS GLOBAIS ============
window.addEventListener('resize', () => {
    setupWeatherCanvas();
    setupForceCanvas();
    if (state.weatherData) {
        drawWeatherVisualization(state.weatherData);
    }
});

// ============ INICIAR APLICAÇÃO ============
document.addEventListener('DOMContentLoaded', initializeApp);

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
    }, 2000);
}

// ============ GEOLOCALIZAÇÃO ============
async function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            // Fallback para Lisboa
            state.userLocation = { lat: 38.7223, lon: -9.1393 };
            resolve(state.userLocation);
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
                console.log('Geolocalização não permitida, usando localização padrão');
                // Localização fallback (Lisboa)
                state.userLocation = { lat: 38.7223, lon: -9.1393 };
                resolve(state.userLocation);
            },
            {
                timeout: 10000,
                enableHighAccuracy: false
            }
        );
    });
}

// ============ API WEATHER - SISTEMA ROBUSTO ============
async function getWeatherData(lat, lon) {
    // Tentar múltiplas fontes de dados
    const weatherSources = [
        tryOpenMeteoAPI(lat, lon),
        tryWeatherAPIFallback(lat, lon),
        generateSimulatedWeather(lat, lon)
    ];

    for (const source of weatherSources) {
        try {
            const weatherData = await source;
            if (weatherData) {
                console.log('Dados meteorológicos obtidos com sucesso');
                return weatherData;
            }
        } catch (error) {
            console.log('Fonte de dados falhou, tentando próxima...');
        }
    }
    
    // Fallback final
    return generateSimulatedWeather(lat, lon);
}

// Fonte 1: Open-Meteo (API gratuita e sem chave)
async function tryOpenMeteoAPI(lat, lon) {
    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure&timezone=auto`
        );
        
        if (!response.ok) throw new Error('Open-Meteo API error');
        
        const data = await response.json();
        const current = data.current;
        
        return {
            temperature: Math.round(current.temperature_2m),
            humidity: Math.round(current.relative_humidity_2m),
            windSpeed: Math.round(current.wind_speed_10m * 3.6), // converter para km/h
            windDeg: current.wind_direction_10m,
            pressure: Math.round(current.surface_pressure),
            description: getWeatherDescription(current.temperature_2m, current.relative_humidity_2m),
            location: 'Tua Localização'
        };
    } catch (error) {
        throw new Error('Open-Meteo failed');
    }
}

// Fonte 2: WeatherAPI com fallback
async function tryWeatherAPIFallback(lat, lon) {
    try {
        // Esta é uma API pública de exemplo - em produção usar chave real
        const response = await fetch(
            `https://api.weather.gov/points/${lat},${lon}`
        );
        
        if (!response.ok) throw new Error('Weather API error');
        
        // Simular dados para demonstração
        return generateSimulatedWeather(lat, lon);
    } catch (error) {
        throw new Error('Weather API failed');
    }
}

// Fonte 3: Dados simulados baseados na localização e estação
function generateSimulatedWeather(lat, lon) {
    const now = new Date();
    const month = now.getMonth();
    const hour = now.getHours();
    
    // Determinar estação baseada no mês e hemisfério
    const isNorthernHemisphere = lat > 0;
    let season;
    if (month >= 2 && month <= 4) season = isNorthernHemisphere ? 'spring' : 'autumn';
    else if (month >= 5 && month <= 7) season = isNorthernHemisphere ? 'summer' : 'winter';
    else if (month >= 8 && month <= 10) season = isNorthernHemisphere ? 'autumn' : 'spring';
    else season = isNorthernHemisphere ? 'winter' : 'summer';
    
    // Gerar dados realistas baseados na estação e hora
    const baseTemp = getBaseTemperature(season, lat);
    const tempVariation = getHourlyVariation(hour);
    const temperature = Math.round(baseTemp + tempVariation);
    
    const humidity = 40 + Math.floor(Math.random() * 40); // 40-80%
    const windSpeed = 1 + Math.floor(Math.random() * 20); // 1-20 km/h
    const windDeg = Math.floor(Math.random() * 360);
    const pressure = 1000 + Math.floor(Math.random() * 30); // 1000-1030 hPa
    
    return {
        temperature: temperature,
        humidity: humidity,
        windSpeed: windSpeed,
        windDeg: windDeg,
        pressure: pressure,
        description: getWeatherDescription(temperature, humidity),
        location: 'Simulação Realista'
    };
}

function getBaseTemperature(season, lat) {
    const baseTemps = {
        spring: 15,
        summer: 25,
        autumn: 18,
        winter: 8
    };
    
    let temp = baseTemps[season];
    
    // Ajustar pela latitude (mais frio longe do equador)
    const absLat = Math.abs(lat);
    if (absLat > 40) temp -= 5;
    if (absLat > 50) temp -= 5;
    if (absLat > 60) temp -= 5;
    
    return temp;
}

function getHourlyVariation(hour) {
    // Temperatura mais baixa de madrugada, mais alta à tarde
    if (hour >= 22 || hour < 6) return -5; // Noite
    if (hour >= 6 && hour < 10) return -2; // Manhã cedo
    if (hour >= 10 && hour < 14) return 2; // Meio-dia
    if (hour >= 14 && hour < 18) return 5; // Tarde
    return 0; // Entardecer
}

function getWeatherDescription(temperature, humidity) {
    if (temperature > 30) return 'Muito Quente';
    if (temperature > 25) return 'Quente';
    if (temperature > 20) return 'Agradável';
    if (temperature > 15) return 'Ameno';
    if (temperature > 10) return 'Fresco';
    if (temperature > 5) return 'Frio';
    if (temperature > 0) return 'Muito Frio';
    
    if (humidity > 80) return 'Húmido';
    if (humidity > 60) return 'Moderado';
    return 'Seco';
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
    
    // Fundo gradiente baseado na temperatura
    const temp = weatherData.temperature;
    let color1, color2;
    
    if (temp > 25) {
        color1 = 'rgba(231, 76, 60, 0.1)';   // Vermelho para calor
        color2 = 'rgba(243, 156, 18, 0.1)';  // Laranja
    } else if (temp > 15) {
        color1 = 'rgba(46, 204, 113, 0.1)';  // Verde para ameno
        color2 = 'rgba(52, 152, 219, 0.1)';  // Azul
    } else {
        color1 = 'rgba(52, 152, 219, 0.1)';  // Azul para frio
        color2 = 'rgba(155, 89, 182, 0.1)';  // Roxo
    }
    
    const gradient = weatherCtx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    weatherCtx.fillStyle = gradient;
    weatherCtx.fillRect(0, 0, width, height);
    
    // Desenhar elementos baseados nos dados meteorológicos
    drawWindLines(weatherData.windSpeed, weatherData.windDeg);
    drawTemperatureCircles(weatherData.temperature);
    drawHumidityDrops(weatherData.humidity);
}

function drawWindLines(speed, deg) {
    const centerX = weatherCanvas.width / 2;
    const centerY = weatherCanvas.height / 2;
    const maxLength = Math.min(centerX, centerY) * 0.6;
    
    const angle = (deg * Math.PI) / 180;
    const length = (speed / 30) * maxLength;
    
    // Cor baseada na velocidade do vento
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
    
    // Adicionar ponta da seta
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
    
    // Cor baseada na temperatura
    let hue;
    if (temperature < 0) hue = 240;       // Azul (frio)
    else if (temperature < 10) hue = 200; // Azul claro
    else if (temperature < 20) hue = 160; // Verde-azulado
    else if (temperature < 30) hue = 120; // Verde
    else hue = 60;                        // Amarelo (quente)
    
    const intensity = Math.min(1, Math.abs(temperature - 15) / 30);
    weatherCtx.fillStyle = `hsla(${hue}, 70%, 50%, ${0.2 + intensity * 0.3})`;
    
    // Número de círculos baseado na temperatura
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
    const dropCount = Math.floor(humidity / 15); // Mais gotas para maior humidade
    
    for (let i = 0; i < dropCount; i++) {
        const x = Math.random() * weatherCanvas.width;
        const y = Math.random() * weatherCanvas.height;
        const size = 1 + Math.random() * 3;
        const alpha = 0.1 + (humidity / 200);
        
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
                description: "Sincroniza tua respiração com o ritmo do vento local. Inspira por 4s, expira por 6s.",
                duration: 60,
                type: "wind",
                points: 10
            },
            {
                title: "Grounding Térmico", 
                description: "Conecta com a temperatura ambiente. Sente o calor/frio e ajusta tua respiração.",
                duration: 90,
                type: "thermal",
                points: 15
            },
            {
                title: "Meditação da Humidade",
                description: "Visualiza a humidade do ar como uma brisa refrescante que te envolve.",
                duration: 120,
                type: "water",
                points: 20
            },
            {
                title: "Conexão com a Pressão",
                description: "Sente a pressão atmosférica como um abraço da Terra. Relaxa e entrega-te.",
                duration: 75,
                type: "pressure", 
                points: 12
            }
        ];
        
        // Escolher ritual baseado nos dados meteorológicos
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

// ============ MAPA DE ESPÉCIES ============
async function loadLocalSpecies(lat, lon) {
    try {
        // GBIF API para espécies próximas - com tratamento de erro melhorado
        const response = await fetch(
            `https://api.gbif.org/v1/occurrence/search?lat=${lat}&lon=${lon}&limit=8&radius=20&hasCoordinate=true&hasGeospatialIssue=false`
        );
        
        if (!response.ok) throw new Error('Species API error');
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            return data.results.slice(0, 6).map(occurrence => ({
                species: occurrence.species || 'Espécie não identificada',
                family: occurrence.family || 'Família desconhecida'
            }));
        } else {
            // Dados de exemplo quando não há resultados
            return getExampleSpecies();
        }
    } catch (error) {
        console.log('API de espécies não disponível, usando dados de exemplo');
        return getExampleSpecies();
    }
}

function getExampleSpecies() {
    const examples = [
        { species: 'Pardal-comum', family: 'Passeridae' },
        { species: 'Oliveira', family: 'Oleaceae' },
        { species: 'Abelha-europeia', family: 'Apidae' },
        { species: 'Pinheiro-manso', family: 'Pinaceae' },
        { species: 'Toutinegra-de-barrete', family: 'Sylviidae' },
        { species: 'Urze', family: 'Ericaceae' }
    ];
    
    // Embaralhar array para variedade
    return examples.sort(() => Math.random() - 0.5).slice(0, 4);
}

function displaySpecies(speciesList) {
    const container = document.getElementById('speciesList');
    
    if (!speciesList || speciesList.length === 0) {
        container.innerHTML = '<div class="species-item">🌿 A explorar biodiversidade local...</div>';
        return;
    }
    
    container.innerHTML = speciesList.map(species => `
        <div class="species-item">
            <strong>${species.species}</strong>
            <br>
            <small>${species.family}</small>
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
            // Aplicar forças baseadas no tipo de campo
            switch(this.fieldType) {
                case 'wind':
                    particle.vx += 0.1;
                    particle.vy += (Math.random() - 0.5) * 0.2;
                    particle.size = particle.originalSize * (0.8 + 0.4 * Math.sin(Date.now() * 0.001 + particle.x));
                    break;
                case 'thermal':
                    particle.vy -= 0.05;
                    particle.vx += (Math.random() - 0.5) * 0.3;
                    particle.size = particle.originalSize * (1 + 0.3 * Math.sin(Date.now() * 0.002 + particle.y));
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
                    particle.size = particle.originalSize * (0.7 + 0.6 * Math.sin(Date.now() * 0.003 + distance * 0.1));
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
        console.log('🌱 Iniciando ECO-SAPIENS...');
        
        // 1. Obter localização do usuário
        await getUserLocation();
        console.log('📍 Localização obtida:', state.userLocation);
        
        // 2. Carregar dados meteorológicos
        state.weatherData = await getWeatherData(state.userLocation.lat, state.userLocation.lon);
        console.log('🌤 Dados meteorológicos:', state.weatherData);
        
        // 3. Atualizar UI com dados meteorológicos
        updateWeatherUI(state.weatherData);
        
        // 4. Configurar visualizações
        setupWeatherCanvas();
        setupForceCanvas();
        drawWeatherVisualization(state.weatherData);
        
        // 5. Inicializar sistemas
        const ritualSystem = new BioRitualSystem();
        ritualSystem.generateRitual(state.weatherData);
        ritualSystem.updateStats();
        
        // 6. Inicializar campos de força
        const forceField = new ForceFieldVisualization();
        forceField.animate();
        
        // 7. Carregar espécies locais
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
        
        console.log('✅ ECO-SAPIENS inicializado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        // Mesmo com erro, mostrar a aplicação com dados simulados
        state.weatherData = generateSimulatedWeather(38.7223, -9.1393);
        updateWeatherUI(state.weatherData);
        hideLoading();
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
    // Remover classe active de todos os botões
    document.querySelectorAll('.force-controls button').forEach(btn => {
        btn.classList.remove('active');
    });
    // Adicionar classe active ao botão clicado
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
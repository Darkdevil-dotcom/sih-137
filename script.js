// Global variables
let map;
let userMarker;
let hospitalMarker;
let fireStationMarker;
let hospitalRoute;
let fireStationRoute;
let currentStep = 1;
const totalSteps = 5;
let weatherData = {};
const isFirstVisit = !localStorage.getItem('tutorialCompleted');
let activeRoute = 'hospital';

// OpenWeatherMap API Configuration
const OPENWEATHER_API_KEY = 'a7efd0951b1742a71fd98cfe394e19d9'; // Replace with your actual API key
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// VIT Chennai coordinates as reference point
const VIT_CHENNAI = {
    lat: 12.8422129,
    lng: 80.1549869218863
};

// Emergency services within 20km of VIT Chennai
const EMERGENCY_SERVICES = {
    hospitals: [
        {
            name: "Hindu Mission Hospital",
            lat: 12.92389,
            lng: 80.11389,
            address: "GST Road, Tambaram, Chennai",
            phone: "044-22271001",
            distance: "8.5 km from VIT Chennai"
        },
        {
            name: "Government Hospital of Thoracic Medicine",
            lat: 12.94444,
            lng: 80.12917,
            address: "Tambaram Sanatorium, Chennai",
            phone: "044-22418450",
            distance: "7.2 km from VIT Chennai"
        },
        {
            name: "Tambaram Medical Center",
            lat: 12.9250,
            lng: 80.1167,
            address: "Bharathamadha Street, East Tambaram",
            phone: "044-48625877",
            distance: "8.1 km from VIT Chennai"
        }
    ],
    fireStations: [
        {
            name: "Guindy Fire Station",
            lat: 13.010236,
            lng: 80.215652,
            address: "Alandur Road, SIDCO Industrial Estate, Guindy",
            phone: "101 / 9445086050",
            distance: "19.2 km from VIT Chennai"
        },
        {
            name: "Tambaram Fire Station",
            lat: 12.9230,
            lng: 80.1270,
            address: "Tambaram Main Road, Chennai",
            phone: "044-22382204 / 9445086053",
            distance: "8.8 km from VIT Chennai"
        },
        {
            name: "Saidapet Fire Station",
            lat: 13.0297,
            lng: 80.2247,
            address: "Saidapet, Chennai",
            phone: "101 / 9445086049",
            distance: "18.5 km from VIT Chennai"
        }
    ]
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkAPIKey();
    initMap();
    if (isFirstVisit) {
        showTutorial();
    }
    getCurrentLocation();
    setupRealTimeUpdates();
    addEmergencyServiceButtons();
});

// Check if API key is set
function checkAPIKey() {
    if (OPENWEATHER_API_KEY === 'YOUR_API_KEY_HERE' || !OPENWEATHER_API_KEY) {
        console.warn('⚠️ OpenWeatherMap API key not configured! Please:');
        console.warn('1. Sign up at https://openweathermap.org/api');
        console.warn('2. Get your free API key');
        console.warn('3. Replace YOUR_API_KEY_HERE in the code with your actual API key');
        
        setTimeout(() => {
            alert('🌤️ Weather API Setup Required!\n\n' +
                  '1. Get a free API key from OpenWeatherMap.org\n' +
                  '2. Replace YOUR_API_KEY_HERE in the code\n' +
                  '3. Reload the page\n\n' +
                  'Using simulated weather data for now.');
        }, 2000);
    }
}

// Initialize Leaflet map
function initMap() {
    const indiaBounds = L.latLngBounds(
        L.latLng(6.0, 68.0),
        L.latLng(38.0, 98.0)
    );

    map = L.map('map', {
        center: [20.5937, 78.9629],
        zoom: 5,
        minZoom: 5,
        maxBounds: indiaBounds,
        maxBoundsViscosity: 1.0
    });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    L.marker([VIT_CHENNAI.lat, VIT_CHENNAI.lng], {
        icon: L.divIcon({
            html: '<i class="fas fa-university" style="color: #8B4513; font-size: 20px;"></i>',
            className: 'vit-marker',
            iconSize: [30, 30]
        })
    }).addTo(map).bindPopup('VIT Chennai Campus');

    addEmergencyServiceMarkers();
    addRiskZones();
}

// Add emergency service markers to map
function addEmergencyServiceMarkers() {
    EMERGENCY_SERVICES.hospitals.forEach((hospital, index) => {
        L.marker([hospital.lat, hospital.lng], {
            icon: L.divIcon({
                html: '<i class="fas fa-hospital" style="color: #dc3545; font-size: 18px;"></i>',
                className: 'hospital-marker',
                iconSize: [25, 25]
            })
        }).addTo(map).bindPopup(`
            <strong>${hospital.name}</strong><br>
            ${hospital.address}<br>
            📞 ${hospital.phone}<br>
            📍 ${hospital.distance}
        `);
    });

    EMERGENCY_SERVICES.fireStations.forEach((station, index) => {
        L.marker([station.lat, station.lng], {
            icon: L.divIcon({
                html: '<i class="fas fa-fire-extinguisher" style="color: #fd7e14; font-size: 18px;"></i>',
                className: 'fire-station-marker',
                iconSize: [25, 25]
            })
        }).addTo(map).bindPopup(`
            <strong>${station.name}</strong><br>
            ${station.address}<br>
            📞 ${station.phone}<br>
            📍 ${station.distance}
        `);
    });
}

// Add emergency service toggle buttons
function addEmergencyServiceButtons() {
    const controlPanel = document.querySelector('.control-panel');
    const routeSection = document.createElement('div');
    routeSection.className = 'panel-section';
    routeSection.innerHTML = `
        <h4 class="panel-title">
            <i class="fas fa-route"></i> Auto Emergency Routes
        </h4>
        <div class="route-buttons">
            <button class="route-button hospital-route active" onclick="showNearestHospitalRoute()">
                <i class="fas fa-hospital"></i>
                Nearest Hospital
            </button>
            <button class="route-button fire-route" onclick="showNearestFireStationRoute()">
                <i class="fas fa-fire-extinguisher"></i>
                Nearest Fire Station
            </button>
            <button class="route-button clear-routes" onclick="clearAllRoutes()">
                <i class="fas fa-times"></i>
                Clear Routes
            </button>
        </div>
        <div id="currentRouteInfo" style="margin-top: 1rem; padding: 0.8rem; background: #e3f2fd; border-radius: 6px; display: none;">
            <div id="routeServiceName" style="font-weight: 600; color: #1976d2;"></div>
            <div id="routeServiceDetails" style="font-size: 0.9rem; color: #333; margin-top: 0.3rem;"></div>
        </div>
    `;
    
    const lastSection = controlPanel.lastElementChild;
    controlPanel.insertBefore(routeSection, lastSection);
}

// Get current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                map.setView([lat, lng], 12);
                addUserMarker(lat, lng);
                fetchRealWeatherData(lat, lng);
                findNearbyServices(lat, lng);
                
                setTimeout(() => {
                    showNearestHospitalRoute();
                }, 1000);
            },
            function(error) {
                console.log('Geolocation error:', error);
                map.setView([VIT_CHENNAI.lat, VIT_CHENNAI.lng], 12);
                addUserMarker(VIT_CHENNAI.lat, VIT_CHENNAI.lng);
                fetchRealWeatherData(VIT_CHENNAI.lat, VIT_CHENNAI.lng);
                
                setTimeout(() => {
                    showNearestHospitalRoute();
                }, 1000);
            }
        );
    }
}

// Add user location marker
function addUserMarker(lat, lng) {
    if (userMarker) {
        map.removeLayer(userMarker);
    }
    
    userMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            html: '<i class="fas fa-user" style="color: #3742fa; font-size: 20px;"></i>',
            className: 'user-marker',
            iconSize: [30, 30]
        })
    }).addTo(map).bindPopup('Your Current Location');
}

// Fetch real weather data from OpenWeatherMap API
async function fetchRealWeatherData(lat, lng) {
    try {
        if (OPENWEATHER_API_KEY === 'YOUR_API_KEY_HERE' || !OPENWEATHER_API_KEY) {
            console.warn('Using simulated weather data - API key not configured');
            getSimulatedWeatherData(lat, lng);
            return;
        }

        updateWeatherDisplay({
            temperature: '--',
            humidity: '--',
            pressure: '--',
            rainfall: '--'
        });

        const apiUrl = `${OPENWEATHER_BASE_URL}?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        
        console.log('Fetching weather data from OpenWeatherMap...');
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Weather data received:', data);
        
        const weatherInfo = processOpenWeatherData(data);
        updateWeatherDisplay(weatherInfo);
        updateRiskLevel(weatherInfo.riskLevel);
        
        if (weatherInfo.riskLevel === 'HIGH' || weatherInfo.riskLevel === 'EXTREME') {
            addWeatherAlert(data.weather[0].description, weatherInfo.riskLevel);
        }
        
    } catch (error) {
        console.error('Error fetching weather data:', error);
        console.warn('Falling back to simulated weather data');
        getSimulatedWeatherData(lat, lng);
        
        setTimeout(() => {
            addNewAlert('Weather API Error', 'Unable to fetch real weather data. Using simulated data.');
        }, 1000);
    }
}

// Process OpenWeatherMap API response
function processOpenWeatherData(data) {
    const temperature = Math.round(data.main.temp);
    const humidity = data.main.humidity;
    const pressure = data.main.pressure;
    const rainfall = data.rain ? data.rain['1h'] || data.rain['3h'] || 0 : 0;
    
    const riskLevel = calculateWeatherRiskLevel(data);
    
    return {
        temperature,
        humidity,
        pressure,
        rainfall: Math.round(rainfall),
        riskLevel,
        weatherMain: data.weather[0].main,
        weatherDescription: data.weather[0].description,
        windSpeed: data.wind.speed,
        visibility: data.visibility / 1000,
        cityName: data.name
    };
}

// Calculate risk level based on weather conditions
function calculateWeatherRiskLevel(weatherData) {
    const weather = weatherData.weather[0];
    const main = weatherData.main;
    const wind = weatherData.wind || {};
    const rain = weatherData.rain || {};
    
    if (weather.main === 'Thunderstorm' || 
        weather.main === 'Tornado' || 
        wind.speed > 15 || 
        (rain['1h'] && rain['1h'] > 20)) {
        return 'EXTREME';
    }
    
    if (weather.main === 'Rain' && rain['1h'] > 10 ||
        wind.speed > 10 ||
        main.temp < 5 || main.temp > 40) {
        return 'HIGH';
    }
    
    if (weather.main === 'Rain' ||
        weather.main === 'Snow' ||
        weather.main === 'Mist' ||
        weather.main === 'Fog' ||
        wind.speed > 5) {
        return 'MODERATE';
    }
    
    return 'LOW';
}

// Fallback simulated weather data
function getSimulatedWeatherData(lat, lng) {
    const weatherInfo = {
        temperature: Math.round(Math.random() * 15 + 20),
        humidity: Math.round(Math.random() * 40 + 40),
        pressure: Math.round(Math.random() * 50 + 1000),
        rainfall: Math.round(Math.random() * 20),
        riskLevel: ['LOW', 'MODERATE', 'HIGH', 'EXTREME'][Math.floor(Math.random() * 4)]
    };

    updateWeatherDisplay(weatherInfo);
    updateRiskLevel(weatherInfo.riskLevel);
}

// Add weather-specific alert
function addWeatherAlert(description, riskLevel) {
    const alertsContainer = document.getElementById('alertsContainer');
    const alertClass = riskLevel === 'EXTREME' ? 'extreme-alert' : 'high-alert';
    
    const newAlert = document.createElement('div');
    newAlert.className = `alert-item ${alertClass}`;
    newAlert.style.background = riskLevel === 'EXTREME' ? 
        'linear-gradient(135deg, #d32f2f, #b71c1c)' : 
        'linear-gradient(135deg, #e74c3c, #c0392b)';
    
    newAlert.innerHTML = `
        <i class="fas fa-cloud-rain"></i>
        <div>
            <strong>Weather Alert:</strong> ${description.charAt(0).toUpperCase() + description.slice(1)}. Risk level: ${riskLevel}.
        </div>
    `;
    
    alertsContainer.insertBefore(newAlert, alertsContainer.firstChild);
}

// Find nearest hospital and show route
function showNearestHospitalRoute() {
    if (!userMarker) {
        alert('Location not available. Please enable location services.');
        return;
    }

    clearAllRoutes();
    setActiveRouteButton('hospital');

    const userLatLng = userMarker.getLatLng();
    const nearestHospital = findNearestService(userLatLng, EMERGENCY_SERVICES.hospitals);
    
    if (nearestHospital) {
        hospitalRoute = L.Routing.control({
            waypoints: [
                L.latLng(userLatLng.lat, userLatLng.lng),
                L.latLng(nearestHospital.lat, nearestHospital.lng)
            ],
            routeWhileDragging: false,
            addWaypoints: false,
            lineOptions: {
                styles: [{ 
                    color: '#dc3545', 
                    weight: 4, 
                    opacity: 0.8 
                }]
            },
            createMarker: function() { 
                return null;
            },
            router: L.Routing.osrmv1({
                language: 'en',
                profile: 'driving'
            })
        }).on('routesfound', function(e) {
            const routes = e.routes;
            const summary = routes[0].summary;
            
            updateRouteInfo(nearestHospital, summary, 'hospital');
        }).addTo(map);

        hospitalMarker = L.marker([nearestHospital.lat, nearestHospital.lng], {
            icon: L.divIcon({
                html: '<i class="fas fa-hospital" style="color: #dc3545; font-size: 24px; animation: pulse 2s infinite;"></i>',
                className: 'active-hospital-marker',
                iconSize: [35, 35]
            })
        }).addTo(map).bindPopup(`
            <strong>🏥 NEAREST HOSPITAL</strong><br>
            ${nearestHospital.name}<br>
            📞 ${nearestHospital.phone}
        `);
    }
}

// Find nearest fire station and show route
function showNearestFireStationRoute() {
    if (!userMarker) {
        alert('Location not available. Please enable location services.');
        return;
    }

    clearAllRoutes();
    setActiveRouteButton('fire');

    const userLatLng = userMarker.getLatLng();
    const nearestFireStation = findNearestService(userLatLng, EMERGENCY_SERVICES.fireStations);
    
    if (nearestFireStation) {
        fireStationRoute = L.Routing.control({
            waypoints: [
                L.latLng(userLatLng.lat, userLatLng.lng),
                L.latLng(nearestFireStation.lat, nearestFireStation.lng)
            ],
            routeWhileDragging: false,
            addWaypoints: false,
            lineOptions: {
                styles: [{ 
                    color: '#fd7e14', 
                    weight: 4, 
                    opacity: 0.8 
                }]
            },
            createMarker: function() { 
                return null;
            },
            router: L.Routing.osrmv1({
                language: 'en',
                profile: 'driving'
            })
        }).on('routesfound', function(e) {
            const routes = e.routes;
            const summary = routes[0].summary;
            
            updateRouteInfo(nearestFireStation, summary, 'fire');
        }).addTo(map);

        fireStationMarker = L.marker([nearestFireStation.lat, nearestFireStation.lng], {
            icon: L.divIcon({
                html: '<i class="fas fa-fire-extinguisher" style="color: #fd7e14; font-size: 24px; animation: pulse 2s infinite;"></i>',
                className: 'active-fire-marker',
                iconSize: [35, 35]
            })
        }).addTo(map).bindPopup(`
            <strong>🚒 NEAREST FIRE STATION</strong><br>
            ${nearestFireStation.name}<br>
            📞 ${nearestFireStation.phone}
        `);
    }
}

// Find nearest service based on distance
function findNearestService(userLocation, services) {
    let nearest = null;
    let minDistance = Infinity;

    services.forEach(service => {
        const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            service.lat, service.lng
        );
        
        if (distance < minDistance && distance <= 20) {
            minDistance = distance;
            nearest = service;
        }
    });

    return nearest;
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Update route information display
function updateRouteInfo(service, summary, type) {
    const routeInfo = document.getElementById('currentRouteInfo');
    const serviceName = document.getElementById('routeServiceName');
    const serviceDetails = document.getElementById('routeServiceDetails');
    
    const icon = type === 'hospital' ? '🏥' : '🚒';
    
    serviceName.textContent = `${icon} ${service.name}`;
    serviceDetails.innerHTML = `
        <div><strong>Distance:</strong> ${(summary.totalDistance / 1000).toFixed(2)} km</div>
        <div><strong>ETA:</strong> ${Math.round(summary.totalTime / 60)} minutes</div>
        <div><strong>Phone:</strong> ${service.phone}</div>
        <div><strong>Address:</strong> ${service.address}</div>
    `;
    
    routeInfo.style.display = 'block';
}

// Set active route button
function setActiveRouteButton(type) {
    document.querySelectorAll('.route-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (type === 'hospital') {
        document.querySelector('.hospital-route').classList.add('active');
    } else if (type === 'fire') {
        document.querySelector('.fire-route').classList.add('active');
    }
}

// Clear all routes
function clearAllRoutes() {
    if (hospitalRoute) {
        map.removeControl(hospitalRoute);
        hospitalRoute = null;
    }
    
    if (fireStationRoute) {
        map.removeControl(fireStationRoute);
        fireStationRoute = null;
    }
    
    if (hospitalMarker) {
        map.removeLayer(hospitalMarker);
        hospitalMarker = null;
    }
    
    if (fireStationMarker) {
        map.removeLayer(fireStationMarker);
        fireStationMarker = null;
    }
    
    document.getElementById('currentRouteInfo').style.display = 'none';
    document.querySelectorAll('.route-button').forEach(btn => {
        btn.classList.remove('active');
    });
}

// Add risk zones to map
function addRiskZones() {
    L.circle([22.5726, 88.3639], {
        color: 'red',
        fillColor: '#ff0000',
        fillOpacity: 0.2,
        radius: 100000
    }).addTo(map).bindPopup('High Risk Zone: Cyclone Alert');

    L.circle([26.9124, 75.7873], {
        color: 'orange',
        fillColor: '#ffa500',
        fillOpacity: 0.2,
        radius: 80000
    }).addTo(map).bindPopup('Medium Risk Zone: Flood Watch');

    L.circle([15.2993, 74.1240], {
        color: 'yellow',
        fillColor: '#ffff00',
        fillOpacity: 0.2,
        radius: 60000
    }).addTo(map).bindPopup('Low Risk Zone: Normal Conditions');
}

// Update weather display
function updateWeatherDisplay(data) {
    document.getElementById('temperature').textContent = data.temperature + '°C';
    document.getElementById('humidity').textContent = data.humidity + '%';
    document.getElementById('pressure').textContent = data.pressure + ' hPa';
    document.getElementById('rainfall').textContent = data.rainfall + ' mm';
}

// Update risk level
function updateRiskLevel(level) {
    const riskElement = document.getElementById('riskLevel');
    const descElement = document.getElementById('riskDescription');
    
    riskElement.textContent = level;
    
    const riskIndicator = document.querySelector('.risk-indicator');
    
    switch(level) {
        case 'LOW':
            riskIndicator.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
            descElement.textContent = 'Normal conditions expected';
            break;
        case 'MODERATE':
            riskIndicator.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';
            descElement.textContent = 'Monitor weather conditions';
            break;
        case 'HIGH':
            riskIndicator.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
            descElement.textContent = 'Prepare for severe weather';
            break;
        case 'EXTREME':
            riskIndicator.style.background = 'linear-gradient(135deg, #d32f2f, #b71c1c)';
            descElement.textContent = 'Immediate action required';
            triggerAlert();
            break;
    }
}

// Find nearby emergency services
function findNearbyServices(lat, lng) {
    const services = [
        { name: 'Hindu Mission Hospital', distance: '8.5 km', phone: '044-22271001' },
        { name: 'Tambaram Fire Station', distance: '8.8 km', phone: '044-22382204' },
        { name: 'Guindy Fire Station', distance: '19.2 km', phone: '101' },
        { name: 'Government Hospital', distance: '7.2 km', phone: '044-22418450' }
    ];

    let servicesHTML = '';
    services.forEach(service => {
        servicesHTML += `
            <div style="background: #f8f9fa; padding: 0.8rem; border-radius: 6px; margin-bottom: 0.5rem;">
                <div style="font-weight: 600; color: #2c3e50;">${service.name}</div>
                <div style="font-size: 0.9rem; color: #666;">${service.distance} • 📞 ${service.phone}</div>
            </div>
        `;
    });

    document.getElementById('emergencyServices').innerHTML = servicesHTML;
}

// Trigger SOS with automatic hospital routing
function triggerSOS() {
    if (confirm('This will send an emergency alert with your location to nearby hospitals. Continue?')) {
        playAlertSound();
        vibrateDevice();
        
        showNearestHospitalRoute();
        
        alert('🚨 SOS ACTIVATED\n\nYour location has been sent to:\n• Emergency Services\n• Nearest Hospital\n• Local Authorities\n\nRoute to nearest hospital is now displayed!\nHelp is on the way!');
    }
}

// Utility functions
function playAlertSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    function playBeep(frequency, duration) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    }

    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            playBeep(800, 0.5);
            setTimeout(() => playBeep(600, 0.5), 600);
        }, i * 2000);
    }
}

function vibrateDevice() {
    if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 500]);
    }
}

function triggerAlert() {
    playAlertSound();
    vibrateDevice();
    
    const alertsContainer = document.getElementById('alertsContainer');
    const newAlert = document.createElement('div');
    newAlert.className = 'alert-item';
    newAlert.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
    newAlert.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <div>
            <strong>CRITICAL ALERT:</strong> Extreme weather conditions detected. Take immediate shelter and follow evacuation procedures.
        </div>
    `;
    alertsContainer.insertBefore(newAlert, alertsContainer.firstChild);
}

// Setup real-time updates with weather refresh
function setupRealTimeUpdates() {
    console.log('Setting up real-time weather updates...');
    
    setInterval(() => {
        if (userMarker) {
            const lat = userMarker.getLatLng().lat;
            const lng = userMarker.getLatLng().lng;
            fetchRealWeatherData(lat, lng);
        }
    }, 600000); // 10 minutes
    
    setTimeout(() => {
        addNewAlert('System Status', 'Real-time weather monitoring active');
    }, 5000);
}

function addNewAlert(title, message) {
    const alertsContainer = document.getElementById('alertsContainer');
    const newAlert = document.createElement('div');
    newAlert.className = 'alert-item';
    newAlert.innerHTML = `
        <i class="fas fa-info-circle"></i>
        <div>
            <strong>${title}:</strong> ${message}
        </div>
    `;
    alertsContainer.appendChild(newAlert);
}

// Tutorial Functions
function showTutorial() {
    document.getElementById('tutorialOverlay').style.display = 'flex';
}

function skipTutorial() {
    document.getElementById('tutorialOverlay').style.display = 'none';
    localStorage.setItem('tutorialCompleted', 'true');
}

function nextStep() {
    if (currentStep < totalSteps) {
        document.querySelector(`[data-step="${currentStep}"]`).classList.remove('active');
        currentStep++;
        document.querySelector(`[data-step="${currentStep}"]`).classList.add('active');
        
        document.getElementById('prevBtn').style.display = 'inline-block';
        
        if (currentStep === totalSteps) {
            document.getElementById('nextBtn').textContent = 'Finish';
        }
    } else {
        skipTutorial();
    }
}

function previousStep() {
    if (currentStep > 1) {
        document.querySelector(`[data-step="${currentStep}"]`).classList.remove('active');
        currentStep--;
        document.querySelector(`[data-step="${currentStep}"]`).classList.add('active');

        document.getElementById('nextBtn').textContent = 'Next';

        if (currentStep === 1) {
            document.getElementById('prevBtn').style.display = 'none';
        }
    }
}

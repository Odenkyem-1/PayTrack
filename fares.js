// fares.js - Cleaned up version

// Load fare data
let fareData = {};
fetch('data/Ghana-fares.json')
  .then(response => response.json())
  .then(data => {
    fareData = data;
    populatePopularRoutes();
  });

// Map and routing variables
let map;
let fromMarker;
let toMarker;
let routeLine;
const OPENCAGE_API_KEY = "0bde10b2c5ab41fa8fa5f73b6b50caaa";

// Initialize the map using Leaflet
function initMap() {
  // Center on Ghana
  window.map = L.map('map', {
    zoomControl: false // We'll add our own positioned control
  }).setView([7.9465, -1.0232], 7);
  
  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(window.map);
  
  // Add zoom control with better mobile positioning
  L.control.zoom({
    position: window.innerWidth < 768 ? 'bottomright' : 'topright'
  }).addTo(window.map);
  
  // Initialize markers with custom icons
  const fromIcon = L.icon({
    iconUrl: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  });
  
  const toIcon = L.icon({
    iconUrl: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  });
  
  window.fromMarker = L.marker([0, 0], {icon: fromIcon}).addTo(window.map);
  window.toMarker = L.marker([0, 0], {icon: toIcon}).addTo(window.map);
  
  // Set initial map size
  handleResize();
}

// Tab Navigation
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    button.classList.add('active');
    const tabId = button.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');
  });
});

// Calculate fare function
document.getElementById('calculate-btn').addEventListener('click', calculateFare);

async function calculateFare() {
  const from = document.getElementById('from').value;
  const to = document.getElementById('to').value;
  const region = document.getElementById('region').value;

  // Fit map bounds with responsive padding
  const padding = window.innerWidth < 768 ? [20, 20] : [50, 50];
  window.map.fitBounds([
    [fromLocation.lat, fromLocation.lng],
    [toLocation.lat, toLocation.lng]
  ], { padding: padding });
  
  
  if (!from || !to) {
    showAlert("Please enter both locations", "error");
    return;
  }
  
  try {
    const btn = document.getElementById('calculate-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
    
    // Get coordinates using OpenCage
    const fromLocation = await geocodeWithOpenCage(from);
    const toLocation = await geocodeWithOpenCage(to);
    
    if (!fromLocation || !toLocation) {
      throw new Error("Could not geocode locations");
    }
    
    // Update markers
    fromMarker.setLatLng([fromLocation.lat, fromLocation.lng])
      .bindPopup(`<b>From:</b> ${fromLocation.formatted}`)
      .openPopup();
    
    toMarker.setLatLng([toLocation.lat, toLocation.lng])
      .bindPopup(`<b>To:</b> ${toLocation.formatted}`)
      .openPopup();
    
    // Calculate distance
    const distanceKm = calculateHaversineDistance(
      fromLocation.lat, fromLocation.lng,
      toLocation.lat, toLocation.lng
    );
    
    // Get region info
    const regionInfo = await getRegionInfo(from, region);
    
    // Calculate fare
    const fare = calculateFareAmount(distanceKm, regionInfo);
    
    // Display results
    displayResults(fare, distanceKm, regionInfo);
    
    // Draw route
    drawRouteLine(fromLocation, toLocation);
    
    // Fit map bounds
    map.fitBounds([
      [fromLocation.lat, fromLocation.lng],
      [toLocation.lat, toLocation.lng]
    ], {padding: [50, 50]});
    
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-calculator"></i> Calculate Fare';
    
  } catch (error) {
    console.error("Error:", error);
    showAlert("Could not calculate fare. Please try again.", "error");
    const btn = document.getElementById('calculate-btn');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-calculator"></i> Calculate Fare';
  }
}

// Geocode using OpenCage API
async function geocodeWithOpenCage(address) {
  const response = await fetch(
    `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${OPENCAGE_API_KEY}&countrycode=gh`
  );
  const data = await response.json();
  
  if (data.results.length > 0) {
    return {
      lat: data.results[0].geometry.lat,
      lng: data.results[0].geometry.lng,
      formatted: data.results[0].formatted
    };
  }
  return null;
}

// Haversine distance calculation
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Calculate fare based on Ghana transport formula
function calculateFareAmount(distanceKm, rateInfo) {
  const baseFare = rateInfo.base;
  const perKmRate = rateInfo.perKm;
  const fuelCostPerLiter = 12.50;
  const consumptionRate = 0.1;
  const markupPercentage = 0.15;
  const unionSurcharge = 1.50;
  
  const distanceCharge = distanceKm * perKmRate;
  const fuelCost = fuelCostPerLiter * consumptionRate * distanceKm * (1 + markupPercentage);
  
  return baseFare + distanceCharge + fuelCost + unionSurcharge;
}

// Draw route line on map
function drawRouteLine(fromLocation, toLocation) {
  if (window.routeLine) window.map.removeLayer(window.routeLine);
  
  window.routeLine = L.polyline(
    [
      [fromLocation.lat, fromLocation.lng],
      [toLocation.lat, toLocation.lng]
    ],
    {
      color: '#D4AF37',
      weight: window.innerWidth < 768 ? 3 : 4,
      opacity: 0.8,
      dashArray: '5, 5'
    }
  ).addTo(window.map);
}

// Display results
function displayResults(fare, distance, regionInfo) {
  document.getElementById('fare-amount').textContent = fare.toFixed(2);
  document.getElementById('route-distance').textContent = distance.toFixed(1) + ' km';
  document.getElementById('route-region').textContent = regionInfo.town 
    ? `${regionInfo.town}, ${regionInfo.region}` 
    : regionInfo.region;
  
  document.getElementById('base-fare').textContent = `₵${regionInfo.base.toFixed(2)}`;
  document.getElementById('distance-rate').textContent = `₵${regionInfo.perKm.toFixed(2)}/km`;
  
  document.getElementById('result').classList.remove('hidden');
  document.getElementById('result').scrollIntoView({ behavior: 'smooth' });
}

// Get region information
async function getRegionInfo(location, selectedRegion) {
  if (selectedRegion) {
    return {
      region: selectedRegion,
      ...fareData.regions[selectedRegion]
    };
  }
  
  const locationLower = location.toLowerCase();
  
  for (const town in fareData.townExceptions) {
    if (locationLower.includes(town.toLowerCase())) {
      return {
        town: town,
        region: fareData.townExceptions[town].region,
        ...fareData.townExceptions[town]
      };
    }
  }
  
  for (const region in fareData.regions) {
    if (locationLower.includes(region.toLowerCase())) {
      return {
        region: region,
        ...fareData.regions[region]
      };
    }
  }
  
  return {
    region: "Greater Accra",
    ...fareData.regions["Greater Accra"]
  };
}

// Populate popular routes
function populatePopularRoutes() {
  if (!fareData.popularRoutes) return;
  
  const routesGrid = document.querySelector('.routes-grid');
  if (!routesGrid) return;
  
  routesGrid.innerHTML = '';
  
  fareData.popularRoutes.forEach(route => {
    const routeCard = document.createElement('div');
    routeCard.className = 'route-card';
    routeCard.innerHTML = `
      <div class="route-info">
        <div class="route-name">${route.from} to ${route.to}</div>
        <div class="route-fare">₵${route.fare.toFixed(2)}</div>
      </div>
      <button class="route-select">Select</button>
    `;
    
    routeCard.querySelector('.route-select').addEventListener('click', () => {
      document.getElementById('from').value = route.from;
      document.getElementById('to').value = route.to;
      document.getElementById('region').value = route.region || '';
    });
    
    routesGrid.appendChild(routeCard);
  });
}

// Show alert message
function showAlert(message, type) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alert.style.position = 'fixed';
  alert.style.top = '20px';
  alert.style.left = '50%';
  alert.style.transform = 'translateX(-50%)';
  alert.style.padding = '12px 24px';
  alert.style.backgroundColor = type === 'error' ? '#FF6B6B' : '#4CAF50';
  alert.style.color = 'white';
  alert.style.borderRadius = '8px';
  alert.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  alert.style.zIndex = '1000';
  alert.style.animation = 'fadeIn 0.3s ease-out';
  
  document.body.appendChild(alert);
  
  setTimeout(() => {
    alert.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => alert.remove(), 300);
  }, 3000);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  initMap();
  
  // Handle back button
  document.getElementById('backBtn').addEventListener('click', function() {
    window.history.back();
  });
  
  // Handle window resize for responsive adjustments
  window.addEventListener('resize', handleResize);
  
  // Initial responsive adjustments
  handleResize();
});

function handleResize() {
  // Adjust map height based on window size
  const mapElement = document.getElementById('map');
  if (mapElement && window.map) {
    const windowHeight = window.innerHeight;
    const headerHeight = document.querySelector('.app-header').offsetHeight;
    const cardHeight = document.querySelector('.card').offsetHeight;
    const availableHeight = windowHeight - headerHeight - cardHeight - 100; // 100px buffer
    
    // Set map height to be 40% of viewport height but not less than 250px
    const newHeight = Math.max(250, Math.min(availableHeight, windowHeight * 0.4));
    mapElement.style.height = `${newHeight}px`;
    
    // Refresh map
    setTimeout(() => {
      window.map.invalidateSize();
    }, 100);
  }
}
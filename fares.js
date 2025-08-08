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
  map = L.map('map').setView([7.9465, -1.0232], 7);
  
  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  
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
  
  fromMarker = L.marker([0, 0], {icon: fromIcon}).addTo(map);
  toMarker = L.marker([0, 0], {icon: toIcon}).addTo(map);
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
  // Ensure minimum distance of 1km
  const effectiveDistance = Math.max(distanceKm, 1);
  
  // Calculate raw fare
  let fare = rateInfo.base + (effectiveDistance * rateInfo.perKm);
  
  // Apply minimum fare
  fare = Math.max(fare, rateInfo.minFare || 5.00);
  
  // Round according to regional rules (usually to nearest 0.50 or 1.00 GHS)
  const roundingUnit = rateInfo.rounding || 0.50;
  fare = Math.round(fare / roundingUnit) * roundingUnit;
  
  return fare;
}

// Draw route line on map
function drawRouteLine(fromLocation, toLocation) {
  if (routeLine) map.removeLayer(routeLine);
  
  routeLine = L.polyline(
    [
      [fromLocation.lat, fromLocation.lng],
      [toLocation.lat, toLocation.lng]
    ],
    {
      color: '#D4AF37',
      weight: 4,
      opacity: 0.8,
      dashArray: '5, 5'
    }
  ).addTo(map);
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
  const routesGrid = document.getElementById('routes-grid');
  if (!routesGrid || !fareData.popularRoutes) return;

  routesGrid.innerHTML = fareData.popularRoutes.map(route => `
    <div class="route-card">
      <div class="route-info">
        <div class="route-name">${route.from} to ${route.to}</div>
        <div class="route-distance">${route.distance} km</div>
        <div class="route-fare">₵${route.typicalFare.toFixed(2)}</div>
      </div>
      <button class="route-select" 
              data-from="${route.from}" 
              data-to="${route.to}"
              data-fare="${route.typicalFare}">
        Select
      </button>
    </div>
  `).join('');

  // Add event listeners
  document.querySelectorAll('.route-select').forEach(button => {
    button.addEventListener('click', function() {
      document.getElementById('from').value = this.dataset.from;
      document.getElementById('to').value = this.dataset.to;
      
      // Optional: Auto-calculate if you want
      document.getElementById('calculate-btn').click();
    });
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
document.addEventListener('DOMContentLoaded', initMap);

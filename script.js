// =====================
// CONSTANTS & CONFIG
// =====================
const OPENCAGE_API_KEY = "0bde10b2c5ab41fa8fa5f73b6b50caaa";
let currentLocation = [5.6037, -0.1870]; // Default: Accra
let currentLocationName = "Accra, Ghana";
let map = null; // Global map reference

// =====================
// GEOLOCATION SERVICES
// =====================

// Get user's current location
async function getUserLocation() {
  return new Promise((resolve) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          currentLocation = [
            position.coords.latitude,
            position.coords.longitude
          ];
          
          // Get location name
          currentLocationName = await reverseGeocode(currentLocation);
          resolve(currentLocation);
        },
        async (error) => {
          console.error("Geolocation error:", error);
          currentLocationName = "Accra, Ghana";
          resolve(currentLocation);
        }
      );
    } else {
      console.log("Geolocation not supported");
      resolve(currentLocation);
    }
  });
}

// Convert coordinates to address
async function reverseGeocode(coords) {
  try {
    const response = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${coords[0]}+${coords[1]}&key=${OPENCAGE_API_KEY}&countrycode=gh`
    );
    const data = await response.json();
    
    if (data.results.length > 0) {
      return data.results[0].formatted || "Location in Ghana";
    }
    return "Ghana Location";
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return "Ghana Location";
  }
}

// Convert address to coordinates
async function geocodeAddress(address) {
  try {
    const response = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${OPENCAGE_API_KEY}&countrycode=gh`
    );
    const data = await response.json();
    
    if (data.results.length > 0) {
      return {
        coords: [
          data.results[0].geometry.lat,
          data.results[0].geometry.lng
        ],
        name: data.results[0].formatted
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

// =====================
// MAP INITIALIZATION
// =====================
async function initMap() {
  await getUserLocation();
  
  // Initialize map at user's location
  map = L.map('map').setView(currentLocation, 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  
  // Custom icon for user marker
  const userIcon = L.divIcon({
    html: '<i class="fas fa-user"></i>',
    iconSize: [30, 30],
    className: 'user-marker'
  });
  
  // Add user marker with custom icon
  const userMarker = L.marker(currentLocation, { icon: userIcon }).addTo(map)
    .bindPopup(`<b>Your Location</b><br>${currentLocationName}`)
    .openPopup();
  
  // Custom icon for landmarks
  const landmarkIcon = L.divIcon({
    html: '<i class="fas fa-map-marker-alt"></i>',
    iconSize: [30, 30],
    className: 'landmark-marker'
  });
  
  // Add landmarks with custom icons
  const landmarks = [
    {name: "Independence Square", coords: [5.5500, -0.1918]},
    {name: "Makola Market", coords: [5.5561, -0.2072]},
    {name: "Accra Mall", coords: [5.6352, -0.1756]},
    {name: "UMaT Campus", coords: [5.3018, -1.9932]}
  ];
  
  landmarks.forEach(landmark => {
    L.marker(landmark.coords, { icon: landmarkIcon }).addTo(map)
      .bindPopup(landmark.name);
  });
  
  // Map controls
  document.getElementById('zoomIn').addEventListener('click', () => map.zoomIn());
  document.getElementById('zoomOut').addEventListener('click', () => map.zoomOut());
  document.getElementById('locateMe').addEventListener('click', () => {
    map.setView(currentLocation, 15);
    userMarker.openPopup();
  });
  
  // Search functionality
  document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = document.getElementById('destination-input').value.trim();
    if (query) {
      await handleSearch(query);
    }
  });
}

// =====================
// SIDEBAR FUNCTIONALITY
// =====================
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const menuBtn = document.getElementById('menuBtn');
  const closeBtn = document.getElementById('closeBtn');
  
  function openSidebar() {
    document.body.classList.add('sidebar-open');
    sidebar.classList.add('open');
    overlay.classList.add('active');
  }
  
  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  }
  
  // Menu button click handler
  menuBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    openSidebar();
  });
  
  // Close button handler
  closeBtn.addEventListener('click', closeSidebar);
  
  // Overlay click handler
  overlay.addEventListener('click', closeSidebar);
  
  // Close sidebar when clicking outside
  document.addEventListener('click', function(e) {
    if (sidebar.classList.contains('open') && 
        !sidebar.contains(e.target) && 
        e.target !== menuBtn) {
      closeSidebar();
    }
  });
  
  // Close on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      closeSidebar();
    }
  });
}

// Update your DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize sidebar immediately
  initSidebar();
  
  // Initialize map and search
  try {
    await initMap();
    initSearch();
  } catch (error) {
    console.error("Initialization error:", error);
    // Fallback to initialize search even if map fails
    initSearch();
  }
});

// =====================
// SEARCH FUNCTIONALITY
// =====================
function initSearch() {
  const searchInput = document.getElementById('destination-input');
  const searchContainer = document.querySelector('.search-container');
  
  // Focus effects
  searchInput.addEventListener('focus', () => {
    searchContainer.style.boxShadow = '0 4px 15px rgba(10, 36, 99, 0.2)';
  });
  
  searchInput.addEventListener('blur', () => {
    searchContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
  });
  
  // Enter key search
  searchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      await handleSearch(searchInput.value.trim());
    }
  });
  
  // Create and add search button
  const searchBtn = document.createElement('button');
  searchBtn.innerHTML = '<i class="fas fa-search"></i>';
  searchBtn.className = 'search-btn';
  searchContainer.appendChild(searchBtn);
  
  // Search button click handler
  searchBtn.addEventListener('click', async () => {
    await handleSearch(searchInput.value.trim());
  });
}

async function handleSearch(query) {
  if (!query) return;
  
  const result = await geocodeAddress(query);
  
  if (result) {
    // Add marker to map
    L.marker(result.coords).addTo(map)
      .bindPopup(`<b>Destination</b><br>${result.name}`)
      .openPopup();
    
    // Zoom to show both locations
    const bounds = L.latLngBounds([currentLocation, result.coords]);
    map.fitBounds(bounds, { padding: [50, 50] });
    
    // Calculate and display fare
    calculateAndDisplayFare(result.coords, result.name);
  } else {
    alert("Location not found in Ghana. Please try another address.");
  }
}

// =====================
// FARE CALCULATION
// =====================
function calculateAndDisplayFare(destCoords, destName) {
  // Calculate distance
  const distance = calculateDistance(
    currentLocation[0], currentLocation[1],
    destCoords[0], destCoords[1]
  );
  
  // Calculate fare
  const fare = calculateFare(distance, destName);
  
  // Display fare
  document.getElementById('fareAmount').textContent = `₵${fare.toFixed(2)}`;
  document.getElementById('distanceText').textContent = `Distance: ${distance.toFixed(1)} km`;
  document.getElementById('regionText').textContent = `From: ${currentLocationName.split(",")[0]}`;
  
  // Show fare section
  document.getElementById('fareSection').style.display = 'block';
}

// Haversine distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in km
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Calculate fare based on location and distance
function calculateFare(distance, locationName) {
  // Tarkwa-specific calculation
  if (locationName.toLowerCase().includes("tarkwa")) {
    return 0.12 + (distance * 1.32);
  }
  
  // Default calculation for other areas
  const baseRate = 2.50;
  const perKm = 0.60;
  
  // Apply peak hour surcharge (7-9am, 4-7pm)
  const now = new Date();
  const hours = now.getHours();
  const isPeak = (hours >= 7 && hours < 9) || (hours >= 16 && hours < 19);
  const surcharge = isPeak ? 0.75 : 0;
  
  return baseRate + (distance * perKm) + surcharge;
}

// =====================
// INITIALIZATION
// =====================
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize sidebar immediately
  initSidebar();
  
  // Initialize map and search
  try {
    await initMap();
    initSearch();
  } catch (error) {
    console.error("Initialization error:", error);
    // Fallback to initialize search even if map fails
    initSearch();
  }
});
// DOM elements
const backBtn = document.getElementById('backBtn');
const personalInfoBtn = document.getElementById('personalInfoBtn');
const securityBtn = document.getElementById('securityBtn');
const privacyBtn = document.getElementById('privacyBtn');
const logoutBtn = document.getElementById('logoutBtn');
const homeLocation = document.getElementById('homeLocation');
const workLocation = document.getElementById('workLocation');
const addPlace = document.getElementById('addPlace');
const savedPlacesList = document.getElementById('savedPlacesList');

// Modals
const personalInfoModal = document.getElementById('personalInfoModal');
const securityModal = document.getElementById('securityModal');
const privacyModal = document.getElementById('privacyModal');
const locationModal = document.getElementById('locationModal');

// Location modal elements
const locationModalTitle = document.getElementById('locationModalTitle');
const locationType = document.getElementById('locationType');
const locationName = document.getElementById('locationName');
const locationAddress = document.getElementById('locationAddress');
const saveLocationBtn = document.getElementById('saveLocation');

// User data
let savedLocations = {
    home: { name: "Home", address: "" },
    work: { name: "Work", address: "" },
    places: [] // Additional saved places
};

// Initialize saved places from localStorage
function initSavedLocations() {
    const saved = localStorage.getItem('paytrackSavedLocations');
    if (saved) {
        savedLocations = JSON.parse(saved);
        updateSavedPlacesUI();
    }
}

// Update UI with saved places
function updateSavedPlacesUI() {
    // Update home and work
    document.getElementById('homeAddress').textContent = 
        savedLocations.home.address || "Not set";
    document.getElementById('workAddress').textContent = 
        savedLocations.work.address || "Not set";
    
    // Update saved places list
    savedPlacesList.innerHTML = '';
    
    if (savedLocations.places.length === 0) {
        savedPlacesList.innerHTML = `
            <div class="no-places">
                <i class="fas fa-map-marker-alt"></i>
                <p>No saved places yet</p>
            </div>
        `;
        return;
    }
    
    savedLocations.places.forEach((place, index) => {
        const placeItem = document.createElement('div');
        placeItem.className = 'saved-place-item';
        placeItem.innerHTML = `
            <div class="saved-place-icon">
                <i class="fas fa-map-marker-alt"></i>
            </div>
            <div class="saved-place-content">
                <div class="saved-place-title">${place.name}</div>
                <div class="saved-place-address">${place.address}</div>
            </div>
            <div class="saved-place-actions">
                <button class="saved-place-btn edit-btn" data-index="${index}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="saved-place-btn delete-btn" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        savedPlacesList.appendChild(placeItem);
    });
    
    // Add event listeners to edit/delete buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.currentTarget.getAttribute('data-index');
            openLocationEditor('edit', index);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.currentTarget.getAttribute('data-index');
            deleteSavedPlace(index);
        });
    });
}

// Open location editor
function openLocationEditor(mode, index = null) {
    if (mode === 'home') {
        locationModalTitle.textContent = "Set Home Location";
        locationType.value = "home";
        locationType.disabled = true;
        locationName.value = savedLocations.home.name;
        locationAddress.value = savedLocations.home.address;
    }
    else if (mode === 'work') {
        locationModalTitle.textContent = "Set Work Location";
        locationType.value = "work";
        locationType.disabled = true;
        locationName.value = savedLocations.work.name;
        locationAddress.value = savedLocations.work.address;
    }
    else if (mode === 'add') {
        locationModalTitle.textContent = "Add a Place";
        locationType.value = "other";
        locationType.disabled = false;
        locationName.value = "";
        locationAddress.value = "";
    }
    else if (mode === 'edit') {
        const place = savedLocations.places[index];
        locationModalTitle.textContent = "Edit Place";
        locationType.value = "other";
        locationType.disabled = true;
        locationName.value = place.name;
        locationAddress.value = place.address;
        saveLocationBtn.setAttribute('data-index', index);
    }
    
    locationModal.style.display = 'flex';
}

// Save location
function saveLocation() {
    const type = locationType.value;
    const name = locationName.value.trim();
    const address = locationAddress.value.trim();
    
    if (!name) {
        alert("Please enter a location name");
        return;
    }
    
    if (!address) {
        alert("Please enter an address");
        return;
    }
    
    if (type === 'home') {
        savedLocations.home = { name, address };
    }
    else if (type === 'work') {
        savedLocations.work = { name, address };
    }
    else if (type === 'other') {
        const index = saveLocationBtn.getAttribute('data-index');
        if (index !== null) {
            // Editing existing place
            savedLocations.places[index] = { name, address };
        } else {
            // Adding new place
            savedLocations.places.push({ name, address });
        }
    }
    
    // Save to localStorage
    localStorage.setItem('paytrackSavedLocations', JSON.stringify(savedLocations));
    
    // Update UI
    updateSavedPlacesUI();
    
    // Close modal
    locationModal.style.display = 'none';
}

// Delete saved place
function deleteSavedPlace(index) {
    if (confirm("Are you sure you want to delete this saved place?")) {
        savedLocations.places.splice(index, 1);
        localStorage.setItem('paytrackSavedLocations', JSON.stringify(savedLocations));
        updateSavedPlacesUI();
    }
}

function handleResponsiveElements() {
    // Adjust header padding based on screen size
    const header = document.querySelector('.account-header');
    const backBtn = document.getElementById('backBtn');
    
    if (window.innerWidth <= 393) { // A35 size
        header.style.paddingTop = '45px';
        backBtn.style.top = '12px';
        backBtn.style.left = '8px';
    } else if (window.innerWidth <= 412) { // S23 Ultra size
        header.style.paddingTop = '50px';
        backBtn.style.top = '15px';
        backBtn.style.left = '10px';
    } else {
        header.style.paddingTop = '60px';
        backBtn.style.top = '20px';
        backBtn.style.left = '15px';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initSavedLocations();
    handleResponsiveElements();
    
    // Add resize listener
    window.addEventListener('resize', handleResponsiveElements);
    
    // Existing event listeners...
    
    // Location event listeners
    homeLocation.addEventListener('click', () => openLocationEditor('home'));
    workLocation.addEventListener('click', () => openLocationEditor('work'));
    addPlace.addEventListener('click', () => openLocationEditor('add'));
    
    // Location modal buttons
    document.getElementById('closeLocationModal').addEventListener('click', () => {
        locationModal.style.display = 'none';
    });
    
    document.getElementById('cancelLocation').addEventListener('click', () => {
        locationModal.style.display = 'none';
    });
    
    saveLocationBtn.addEventListener('click', saveLocation);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === locationModal) {
            locationModal.style.display = 'none';
        }
    });
});



// Existing modal and navigation functionality...
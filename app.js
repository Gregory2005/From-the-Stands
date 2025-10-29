// From-the-Stands core script
const apiKey = "740987a4e6f38838c7f5664d02d298ea"; 
const statusEl = document.getElementById("status");
const clubList = document.getElementById("clubList");
const locateBtn = document.getElementById("locateBtn");

// Retrieve nearby clubs (mocked radius filter)
async function fetchNearbyClubs(lat, lon) {
  statusEl.textContent = "Fetching nearby clubs...";
  clubList.innerHTML = "";

  try {
    // API-Football call (using country as simple filter)
    const url = `https://v3.football.api-sports.io/teams?country=Scotland`;
    const res = await fetch(url, { headers: { "x-apisports-key": apiKey } });
    const data = await res.json();

    const clubs = data.response.slice(0, 10);
    statusEl.textContent = `Showing ${clubs.length} clubs near your location.`;

    clubs.forEach(c => {
      const card = document.createElement("div");
      card.className = "club-card";
      card.innerHTML = `
        <img src="${c.team.logo}" alt="${c.team.name}">
        <h3>${c.team.name}</h3>
        <p>${c.venue.name}, ${c.venue.city}</p>
      `;
      clubList.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Could not load clubs. Please try again.";
  }
}

// Handle location access
function getLocation() {
  if ("geolocation" in navigator) {
    statusEl.textContent = "Getting your location...";
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        fetchNearbyClubs(latitude, longitude);
      },
      err => (statusEl.textContent = "Location access denied.")
    );
  } else {
    statusEl.textContent = "Geolocation not supported.";
  }
}

locateBtn.addEventListener("click", getLocation);

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => console.log("Service Worker registered"))
    .catch(err => console.log("SW registration failed:", err));
}

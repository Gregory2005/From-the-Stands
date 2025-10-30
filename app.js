// From-the-Stands – Dynamic Location (Week 7 update)

// === CONFIG ===
const apiKey = "740987a4e6f38838c7f5664d02d298ea";
const apiBase = "https://v3.football.api-sports.io";

// === TEST MODE ===
// Change to true to spoof London for testing
const testMode = true;
const testCoords = { latitude: 51.5074, longitude: -0.1278 }; // London

// === ELEMENTS ===
const statusEl = document.getElementById("status");
const clubList = document.getElementById("clubList");
const locateBtn = document.getElementById("locateBtn");
const showFavsBtn = document.getElementById("showFavsBtn");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");

// === FAVOURITES ===
let favourites = JSON.parse(localStorage.getItem("favourites") || "[]");
function saveFavs() {
  localStorage.setItem("favourites", JSON.stringify(favourites));
}

// === FETCH CLUBS BY COUNTRY ===
async function fetchNearbyClubs(lat, lon) {
  statusEl.textContent = "Determining country from location...";
  clubList.innerHTML = "";

  try {
    // Use OpenStreetMap Nominatim to get country name
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    );
    const geoData = await geoRes.json();
    const country = geoData.address.country;
    console.log("Detected country:", country);

    statusEl.textContent = `Fetching clubs in ${country}...`;

    // Query API-Football for teams in that country
    const res = await fetch(`${apiBase}/teams?country=${country}`, {
      headers: { "x-apisports-key": apiKey }
    });
    const data = await res.json();

    if (!data.response || data.response.length === 0) {
      statusEl.textContent = `No clubs found for ${country}.`;
      return;
    }

    const clubs = data.response.slice(0, 12);
    statusEl.textContent = `Showing ${clubs.length} clubs in ${country}.`;
    renderClubCards(clubs);
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Unable to fetch clubs.";
  }
}

// === RENDER CLUB CARDS ===
function renderClubCards(clubs) {
  clubList.innerHTML = "";
  clubs.forEach(({ team, venue }) => {
    const isFav = favourites.includes(team.id);
    const card = document.createElement("div");
    card.className = "club-card";
    card.innerHTML = `
      <img src="${team.logo}" alt="${team.name}">
      <h3>${team.name}</h3>
      <p>${venue.name}, ${venue.city}</p>
      <button class="details-btn" data-id="${team.id}">Details</button>
      <button class="fav-btn ${isFav ? "fav-active" : ""}" data-id="${team.id}">
        ⭐ Favourite
      </button>
    `;
    clubList.appendChild(card);
  });

  document.querySelectorAll(".details-btn").forEach(btn =>
    btn.addEventListener("click", e => showClubDetails(e.target.dataset.id))
  );
  document.querySelectorAll(".fav-btn").forEach(btn =>
    btn.addEventListener("click", e => toggleFavourite(e.target.dataset.id, e.target))
  );
}

// === TOGGLE FAVOURITES ===
function toggleFavourite(id, btn) {
  id = Number(id);
  if (favourites.includes(id)) {
    favourites = favourites.filter(f => f !== id);
    btn.classList.remove("fav-active");
  } else {
    favourites.push(id);
    btn.classList.add("fav-active");
  }
  saveFavs();
}

// === SHOW FAVOURITES ===
function showFavourites() {
  if (favourites.length === 0) {
    statusEl.textContent = "No favourites saved.";
    clubList.innerHTML = "";
    return;
  }
  fetch(`${apiBase}/teams?id=${favourites.join("&id=")}`, {
    headers: { "x-apisports-key": apiKey }
  })
    .then(res => res.json())
    .then(data => {
      statusEl.textContent = `Your favourites (${data.response.length})`;
      renderClubCards(data.response);
    })
    .catch(() => (statusEl.textContent = "Error loading favourites."));
}

// === CLUB DETAILS MODAL (demo-safe) ===
async function showClubDetails(teamId) {
  modal.classList.remove("hidden");
  modalBody.innerHTML = "<p>Loading fixtures...</p>";

  try {
    // Try current season 2025 for all leagues
    const res = await fetch(
      `${apiBase}/fixtures?team=${teamId}&season=2025&next=5`,
      { headers: { "x-apisports-key": apiKey } }
    );
    const data = await res.json();
    let fixtures = data.response;

    if (!fixtures || fixtures.length === 0) {
      // Fallback to Premier League for guaranteed demo
      const fb = await fetch(`${apiBase}/fixtures?league=39&season=2025&next=5`, {
        headers: { "x-apisports-key": apiKey }
      });
      const fbData = await fb.json();
      fixtures = fbData.response;
      modalBody.innerHTML = `<h2>Example Premier League Fixtures</h2>`;
    } else {
      modalBody.innerHTML = `<h2>Next Fixtures</h2>`;
    }

    const listItems = fixtures
      .map(f => {
        const date = new Date(f.fixture.date).toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
        return `<li>${f.teams.home.name} vs ${f.teams.away.name} – ${date}</li>`;
      })
      .join("");

    modalBody.innerHTML += `<ul>${listItems}</ul>`;
  } catch (err) {
    console.error(err);
    modalBody.innerHTML = "<p>Unable to load fixtures.</p>";
  }
}

// === LOCATION HANDLER ===
function getLocation() {
  if (testMode) {
    // Spoof location as London
    const { latitude, longitude } = testCoords;
    console.log("Test Mode: Using hardcoded London coordinates.");
    fetchNearbyClubs(latitude, longitude);
    return;
  }

  if ("geolocation" in navigator) {
    statusEl.textContent = "Getting your location...";
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        console.log("Detected location:", latitude, longitude);
        fetchNearbyClubs(latitude, longitude);
      },
      () => (statusEl.textContent = "Location access denied.")
    );
  } else {
    statusEl.textContent = "Geolocation not supported.";
  }
}

// === EVENT BINDINGS ===
locateBtn.addEventListener("click", getLocation);
showFavsBtn.addEventListener("click", showFavourites);
closeModal.addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", e => {
  if (e.target === modal) modal.classList.add("hidden");
});

// === REGISTER SERVICE WORKER ===
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

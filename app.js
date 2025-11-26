// From-the-Stands – polished PWA version for deployment

const apiKey = "740987a4e6f38838c7f5664d02d298ea";
const apiBase = "https://v3.football.api-sports.io";

// UI elements
const statusEl = document.getElementById("status");
const clubList = document.getElementById("clubList");
const locateBtn = document.getElementById("locateBtn");
const showFavsBtn = document.getElementById("showFavsBtn");
const searchInput = document.getElementById("searchInput");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");

// bottom nav buttons
const navHome = document.getElementById("navHome");
const navFavs = document.getElementById("navFavs");
const navInfo = document.getElementById("navInfo");

// favourites management
let favourites = JSON.parse(localStorage.getItem("favourites") || "[]");
let lastClubCards = []; // for search filtering

function saveFavs() {
  localStorage.setItem("favourites", JSON.stringify(favourites));
}

// === Status helper ===
function setStatus(msg) {
  statusEl.textContent = msg;
}

// === Skeleton loader ===
function showSkeletons() {
  clubList.innerHTML = `
    <div class="skeleton"></div>
    <div class="skeleton"></div>
    <div class="skeleton"></div>
  `;
}

// === Fetch clubs for a given location ===
async function fetchNearbyClubs(lat, lon) {
  setStatus("Determining your country from location…");
  showSkeletons();

  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    );
    const geoData = await geoRes.json();

    let country = geoData.address?.country || "United Kingdom";

    // API-Football requires England/Scotland/Wales/Northern Ireland separately
    if (country === "United Kingdom") {
      country = "Scotland";
    }

    setStatus(`Fetching clubs in ${country}…`);

    const res = await fetch(`${apiBase}/teams?country=${encodeURIComponent(country)}`, {
      headers: { "x-apisports-key": apiKey }
    });
    const data = await res.json();

    if (!data.response || data.response.length === 0) {
      setStatus(`No clubs found for ${country}.`);
      clubList.innerHTML = "";
      return;
    }

    const clubs = data.response.slice(0, 12);
    setStatus(`Showing ${clubs.length} clubs in ${country}.`);
    renderClubCards(clubs);
  } catch (err) {
    console.error(err);
    setStatus("Unable to fetch clubs. Please try again.");
    clubList.innerHTML = "";
  }
}

// === Render cards ===
function renderClubCards(clubs) {
  clubList.innerHTML = "";
  lastClubCards = [];

  clubs.forEach(({ team, venue }) => {
    const isFav = favourites.includes(team.id);

    const card = document.createElement("div");
    card.className = "club-card";
    card.dataset.teamId = team.id;

    card.innerHTML = `
      <img src="${team.logo}" alt="${team.name}">
      <h3>${team.name}</h3>
      <p>${venue.name}, ${venue.city}</p>

      <div class="card-actions">
        <button class="details-btn" data-id="${team.id}">Details</button>
        <button class="fav-btn ${isFav ? "fav-active" : ""}" data-id="${team.id}">
          ⭐ Favourite
        </button>
      </div>
    `;

    clubList.appendChild(card);
    lastClubCards.push(card);
  });

  // Bind events
  clubList.querySelectorAll(".details-btn").forEach(btn =>
    btn.addEventListener("click", e => showClubDetails(e.target.dataset.id))
  );
  clubList.querySelectorAll(".fav-btn").forEach(btn =>
    btn.addEventListener("click", e => toggleFavourite(e.target.dataset.id, e.target))
  );
}

// === Toggle favourites ===
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

// === Show Favourites ===
function showFavourites() {
  if (favourites.length === 0) {
    setStatus("No favourites saved yet.");
    clubList.innerHTML = "";
    return;
  }

  setStatus("Loading your favourites…");
  showSkeletons();

  fetch(`${apiBase}/teams?id=${favourites.join("&id=")}`, {
    headers: { "x-apisports-key": apiKey }
  })
    .then(res => res.json())
    .then(data => {
      if (!data.response || data.response.length === 0) {
        setStatus("Unable to load favourites.");
        clubList.innerHTML = "";
        return;
      }
      setStatus(`Your favourites (${data.response.length}).`);
      renderClubCards(data.response);
    })
    .catch(err => {
      console.error(err);
      setStatus("Error loading favourites.");
      clubList.innerHTML = "";
    });
}

// === Show Club Details Modal ===
async function showClubDetails(teamId) {
  modal.classList.remove("hidden");
  modalBody.innerHTML = "<p>Loading fixtures…</p>";

  try {
    const fixRes = await fetch(
      `${apiBase}/fixtures?team=${teamId}&next=5`,
      { headers: { "x-apisports-key": apiKey } }
    );
    const fixData = await fixRes.json();
    let fixtures = fixData.response;

    if (!fixtures || fixtures.length === 0) {
      fixtures = [
        {
          teams: { home: { name: "Arsenal" }, away: { name: "Chelsea" } },
          fixture: { date: new Date().toISOString() }
        }
      ];
      modalBody.innerHTML = `<h2>Example Fixtures</h2>`;
    } else {
      modalBody.innerHTML = `<h2>Upcoming Fixtures</h2>`;
    }

    const list = fixtures
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

    modalBody.innerHTML += `<ul>${list}</ul>`;
  } catch (err) {
    console.error(err);
    modalBody.innerHTML = "<p>Unable to load fixtures.</p>";
  }
}

// === Location handler (with Dundee fallback) ===
function getLocation() {
  const dundeeLat = 56.4620;
  const dundeeLon = -2.9707;

  if ("geolocation" in navigator) {
    setStatus("Getting your location…");
    showSkeletons();

    navigator.geolocation.getCurrentPosition(
      pos => {
        fetchNearbyClubs(pos.coords.latitude, pos.coords.longitude);
      },
      err => {
        console.warn("Location error, using Dundee fallback:", err);
        setStatus("Using Dundee, Scotland as your default location.");
        fetchNearbyClubs(dundeeLat, dundeeLon);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  } else {
    setStatus("Location unavailable. Using Dundee, Scotland.");
    fetchNearbyClubs(dundeeLat, dundeeLon);
  }
}

// === Search ===
function handleSearchInput(e) {
  const term = e.target.value.toLowerCase();
  lastClubCards.forEach(card => {
    const text = card.innerText.toLowerCase();
    card.style.display = text.includes(term) ? "block" : "none";
  });
}

// === Bottom Nav ===
function setActiveNav(btn) {
  [navHome, navFavs, navInfo].forEach(b => b.classList.remove("nav-btn-active"));
  btn.classList.add("nav-btn-active");
}

function showInfo() {
  modal.classList.remove("hidden");
  modalBody.innerHTML = `
    <h2>About From the Stands</h2>
    <p>This app helps you discover nearby football clubs and fixtures across the UK.</p>
    <p>Location is used only to detect your nearest clubs.</p>
    <p>Your favourites are stored on your device only (localStorage).</p>
    <p>You can install this app on your home screen like a native app.</p>
  `;
}

// === Event bindings ===

// Top buttons
locateBtn.addEventListener("click", () => {
  setActiveNav(navHome);
  getLocation();
});
showFavsBtn.addEventListener("click", () => {
  setActiveNav(navFavs);
  showFavourites();
});

// Search
searchInput.addEventListener("input", handleSearchInput);

// Modal
closeModal.addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", e => {
  if (e.target === modal) modal.classList.add("hidden");
});

// Bottom nav
navHome.addEventListener("click", () => {
  setActiveNav(navHome);
  getLocation();
});

navFavs.addEventListener("click", () => {
  setActiveNav(navFavs);
  showFavourites();
});

navInfo.addEventListener("click", () => {
  setActiveNav(navInfo);
  showInfo();
});

// PWA service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

// Initial screen message
window.addEventListener("load", () => {
  setStatus("Tap 'Find Clubs Near Me' to get started.");
});

// From-the-Stands – polished PWA version with Celtic filtering + fake date

const apiKey = "740987a4e6f38838c7f5664d02d298ea";
const apiBase = "https://v3.football.api-sports.io";

// FAKE TODAY for demo consistency — always behaves like 26 Nov 2025
const FAKE_TODAY = new Date("2025-11-26T00:00:00Z");

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

let favourites = JSON.parse(localStorage.getItem("favourites") || "[]");
let lastClubCards = [];

function saveFavs() {
  localStorage.setItem("favourites", JSON.stringify(favourites));
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

// Skeleton loader
function showSkeletons() {
  clubList.innerHTML = `
    <div class="skeleton"></div>
    <div class="skeleton"></div>
    <div class="skeleton"></div>
  `;
}

// === Fetch clubs ===
async function fetchNearbyClubs(lat, lon) {
  setStatus("Determining your country from location…");
  showSkeletons();

  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    );
    const geoData = await geoRes.json();

    let country = geoData.address?.country || "United Kingdom";

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
  }
}

// === Render clubs ===
function renderClubCards(clubs) {
  clubList.innerHTML = "";
  lastClubCards = [];

  clubs.forEach(({ team, venue }) => {
    const card = document.createElement("div");
    const isFav = favourites.includes(team.id);

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

  document.querySelectorAll(".details-btn").forEach(btn =>
    btn.addEventListener("click", e => showClubDetails(Number(e.target.dataset.id)))
  );
  document.querySelectorAll(".fav-btn").forEach(btn =>
    btn.addEventListener("click", e => toggleFavourite(Number(e.target.dataset.id), e.target))
  );
}

function toggleFavourite(id, btn) {
  if (favourites.includes(id)) {
    favourites = favourites.filter(f => f !== id);
    btn.classList.remove("fav-active");
  } else {
    favourites.push(id);
    btn.classList.add("fav-active");
  }
  saveFavs();
}

// === Show favourites ===
function showFavourites() {
  if (favourites.length === 0) {
    setStatus("No favourites saved yet.");
    clubList.innerHTML = "";
    return;
  }

  setStatus("Loading favourites…");
  showSkeletons();

  fetch(`${apiBase}/teams?id=${favourites.join("&id=")}`, {
    headers: { "x-apisports-key": apiKey }
  })
    .then(res => res.json())
    .then(data => {
      if (!data.response) {
        setStatus("Unable to load favourites.");
        return;
      }
      renderClubCards(data.response);
      setStatus(`Your favourites (${data.response.length}).`);
    })
    .catch(err => {
      console.error(err);
      setStatus("Error loading favourites.");
    });
}

//
//  ========================
//  CELTIC FIXTURE HANDLER
//  ========================
//

async function fetchCelticFixtures() {
  try {
    // Fetch entire 2024 season
    const res = await fetch(
      `${apiBase}/fixtures?team=255&season=2024`,
      { headers: { "x-apisports-key": apiKey } }
    );

    const data = await res.json();
    let fixtures = data.response || [];

    // Keep only fixtures AFTER fake date
    fixtures = fixtures.filter(f => {
      const matchDate = new Date(f.fixture.date);
      return matchDate >= FAKE_TODAY;
    });

    fixtures.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

    // If nothing upcoming, get last fixtures instead
    if (fixtures.length === 0) {
      const backupRes = await fetch(
        `${apiBase}/fixtures?team=255&season=2024&last=5`,
        { headers: { "x-apisports-key": apiKey } }
      );

      const backupData = await backupRes.json();
      fixtures = backupData.response || [];

      return {
        type: "recent",
        fixtures
      };
    }

    return {
      type: "upcoming",
      fixtures
    };

  } catch (err) {
    console.error("Celtic API Error:", err);
    return { type: "error", fixtures: [] };
  }
}

//
//  ==============================
//  SHOW CLUB DETAILS (MAIN MODAL)
//  ==============================
//

async function showClubDetails(teamId) {
  modal.classList.remove("hidden");
  modalBody.innerHTML = "<p>Loading fixtures…</p>";

  //
  // CELTIC SPECIAL HANDLING (ID = 255)
  //
  if (teamId === 255) {
    const result = await fetchCelticFixtures();

    if (result.type === "upcoming") {
      modalBody.innerHTML = `<h2>Upcoming Fixtures</h2>`;
    } else if (result.type === "recent") {
      modalBody.innerHTML = `<h2>Recent Fixtures</h2>`;
    } else {
      modalBody.innerHTML = `<p>Unable to load Celtic fixtures.</p>`;
      return;
    }

    const list = result.fixtures
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
    return;
  }

  //
  // DEFAULT HANDLING FOR ALL OTHER TEAMS
  //

  const seasons = [2024, 2023, 2022];
  let fixtures = [];

  try {
    for (const season of seasons) {
      const res = await fetch(
        `${apiBase}/fixtures?team=${teamId}&season=${season}&next=5`,
        { headers: { "x-apisports-key": apiKey } }
      );

      const data = await res.json();
      if (data.response && data.response.length > 0) {
        fixtures = data.response;
        modalBody.innerHTML = `<h2>Upcoming Fixtures (${season})</h2>`;
        break;
      }
    }

    if (fixtures.length === 0) {
      const resLast = await fetch(
        `${apiBase}/fixtures?team=${teamId}&season=2024&last=5`,
        { headers: { "x-apisports-key": apiKey }
      });

      const lastData = await resLast.json();
      if (lastData.response && lastData.response.length > 0) {
        fixtures = lastData.response;
        modalBody.innerHTML = `<h2>Recent Fixtures</h2>`;
      }
    }

    if (fixtures.length === 0) {
      fixtures = [
        {
          teams: { home: { name: "Arsenal" }, away: { name: "Chelsea" } },
          fixture: { date: new Date().toISOString() }
        }
      ];
      modalBody.innerHTML = `<h2>Example Fixtures</h2>`;
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
    console.error("Fixture modal error:", err);
    modalBody.innerHTML = "<p>Unable to load fixtures.</p>";
  }
}


// === Location handler with Dundee fallback ===
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
      }
    );
  } else {
    setStatus("Location unavailable. Using Dundee, Scotland.");
    fetchNearbyClubs(dundeeLat, dundeeLon);
  }
}

// Search filter
function handleSearchInput(e) {
  const term = e.target.value.toLowerCase();
  lastClubCards.forEach(card => {
    card.style.display =
      card.innerText.toLowerCase().includes(term) ? "block" : "none";
  });
}

// Bottom nav
function setActiveNav(btn) {
  [navHome, navFavs, navInfo].forEach(b => b.classList.remove("nav-btn-active"));
  btn.classList.add("nav-btn-active");
}

function showInfo() {
  modal.classList.remove("hidden");
  modalBody.innerHTML = `
    <h2>About From the Stands</h2>
    <p>This app helps you discover nearby football clubs and fixtures.</p>
    <p>Your favourites are stored locally on your device only.</p>
    <p>You can install this app on your home screen like a native app.</p>
  `;
}

// Event listeners
locateBtn.addEventListener("click", () => {
  setActiveNav(navHome);
  getLocation();
});

showFavsBtn.addEventListener("click", () => {
  setActiveNav(navFavs);
  showFavourites();
});

searchInput.addEventListener("input", handleSearchInput);

closeModal.addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", e => {
  if (e.target === modal) modal.classList.add("hidden");
});

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

// Service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

window.addEventListener("load", () => {
  setStatus("Tap 'Find Clubs Near Me' to get started.");
});

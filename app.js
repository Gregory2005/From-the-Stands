// From-the-Stands – Week 6
const apiKey = "740987a4e6f38838c7f5664d02d298ea";
const apiBase = "https://v3.football.api-sports.io";

const statusEl = document.getElementById("status");
const clubList = document.getElementById("clubList");
const locateBtn = document.getElementById("locateBtn");
const showFavsBtn = document.getElementById("showFavsBtn");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");

// ---- LocalStorage Favourites ----
let favourites = JSON.parse(localStorage.getItem("favourites") || "[]");
function saveFavs() {
  localStorage.setItem("favourites", JSON.stringify(favourites));
}

// ---- Fetch clubs ----
async function fetchNearbyClubs(lat, lon) {
  statusEl.textContent = "Fetching clubs...";
  clubList.innerHTML = "";

  try {
    const res = await fetch(`${apiBase}/teams?country=Scotland`, {
      headers: { "x-apisports-key": apiKey }
    });
    const data = await res.json();
    const clubs = data.response.slice(0, 12);

    statusEl.textContent = `Showing ${clubs.length} clubs.`;
    renderClubCards(clubs);
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Error fetching clubs.";
  }
}

// ---- Render club cards ----
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

// ---- Favourite toggler ----
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

// ---- Show favourites ----
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

// ---- Club details modal ----
async function showClubDetails(teamId) {
  modal.classList.remove("hidden");
  modalBody.innerHTML = "<p>Loading fixtures...</p>";

  try {
    const res = await fetch(`${apiBase}/fixtures?team=${teamId}&season=2024&next=5`, {
      headers: { "x-apisports-key": apiKey }
    });
    const data = await res.json();
    const fixtures = data.response;

    if (fixtures.length === 0) {
      modalBody.innerHTML = "<p>No upcoming fixtures found.</p>";
      return;
    }

    modalBody.innerHTML = `
      <h2>${fixtures[0].teams.home.name}</h2>
      <ul>
        ${fixtures
          .map(
            f => `<li>${f.teams.home.name} vs ${f.teams.away.name}
                   – ${new Date(f.fixture.date).toLocaleDateString()}</li>`
          )
          .join("")}
      </ul>
    `;
  } catch (err) {
    modalBody.innerHTML = "<p>Error loading fixtures.</p>";
  }
}

// ---- Location access ----
function getLocation() {
  if ("geolocation" in navigator) {
    statusEl.textContent = "Getting your location...";
    navigator.geolocation.getCurrentPosition(
      pos => fetchNearbyClubs(pos.coords.latitude, pos.coords.longitude),
      () => (statusEl.textContent = "Location access denied.")
    );
  } else statusEl.textContent = "Geolocation not supported.";
}

// ---- Event bindings ----
locateBtn.addEventListener("click", getLocation);
showFavsBtn.addEventListener("click", showFavourites);
closeModal.addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });

// ---- Register SW ----
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

/* ── STATE ── */
const API = '/movies';
let allMovies = [];
let currentRatingFilter = '';
let pendingDeleteId = null;
let editingId = null;
let selectedRating = 0;

/* ── DOM REFS ── */
const movieGrid         = document.getElementById('movieGrid');
const loadingState      = document.getElementById('loadingState');
const emptyState        = document.getElementById('emptyState');
const movieCount        = document.getElementById('movieCount');

const heroSection       = document.getElementById('heroSection');
const heroTitle         = document.getElementById('heroTitle');
const heroRating        = document.getElementById('heroRating');
const heroGenre         = document.getElementById('heroGenre');
const heroEditBtn       = document.getElementById('heroEditBtn');

const modal             = document.getElementById('modal');
const confirmModal      = document.getElementById('confirmModal');
const movieForm         = document.getElementById('movieForm');
const modalTitle        = document.getElementById('modalTitle');
const movieIdInput      = document.getElementById('movieId');
const titleInput        = document.getElementById('titleInput');
const genreInput        = document.getElementById('genreInput');
const ratingInput       = document.getElementById('ratingInput');
const posterInput       = document.getElementById('posterInput');
const starItems         = document.querySelectorAll('.star-item');
const toast             = document.getElementById('toast');

const searchInput       = document.getElementById('searchInput');
const ratingFilterSelect = document.getElementById('ratingFilterSelect');

/* ── TOAST ── */
function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => { toast.className = 'toast hidden'; }, 3000);
}

/* ── STAR RATING SYSTEM ── */
function setStarRating(val) {
  selectedRating = val;
  ratingInput.value = val;
  starItems.forEach(s => {
    s.classList.toggle('active', Number(s.dataset.val) <= val);
  });
}

starItems.forEach(s => {
  s.addEventListener('click', () => setStarRating(Number(s.dataset.val)));
  s.addEventListener('mouseover', () => {
    starItems.forEach(st => st.classList.toggle('active', Number(st.dataset.val) <= Number(s.dataset.val)));
  });
  s.addEventListener('mouseleave', () => setStarRating(selectedRating));
});

/* ── RENDERING ── */
function renderHero(movies) {
  if (!movies.length) {
    heroSection.classList.add('hidden');
    return;
  }
  heroSection.classList.remove('hidden');
  
  // Pick the highest rated movie as "Featured"
  const featured = [...movies].sort((a, b) => b.rating - a.rating)[0];
  
  heroTitle.textContent = featured.title;
  heroRating.textContent = `★ ${featured.rating}.0`;
  heroGenre.textContent = featured.genre;
  
  // Set hero background
  const posterUrl = featured.imageUrl || getFallbackPoster(featured.genre);
  heroSection.style.background = `url('${posterUrl}') center/cover no-repeat`;
  
  heroEditBtn.onclick = () => openEditModal(featured.id);
}

function renderMovies(movies) {
  movieGrid.innerHTML = '';
  loadingState.classList.add('hidden');
  movieCount.textContent = `${movies.length} Movies`;

  if (!movies.length) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  movies.forEach((m, i) => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    // Staggered entry animation
    card.style.animation = `fadeInUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards ${i * 0.05}s`;

    const isYes = m.recommendation === 'Yes';
    const posterUrl = m.imageUrl || getFallbackPoster(m.genre);

    card.innerHTML = `
      <img src="${posterUrl}" alt="${m.title}" class="card-poster" loading="lazy">
      <div class="rec-badge ${isYes ? 'rec-yes' : 'rec-no'}">${isYes ? 'RECOMMENDED' : 'SKIP'}</div>
      <div class="card-overlay">
        <h3 class="card-title">${escHtml(m.title)}</h3>
        <div class="card-meta">
          <span class="card-genre">${m.genre}</span>
          <span class="card-rating">★ ${m.rating}.0</span>
        </div>
        <div class="card-footer">
          <button class="btn btn-secondary edit-btn" data-id="${m.id}">Edit</button>
          <button class="btn btn-secondary del-btn" data-id="${m.id}">Delete</button>
        </div>
      </div>
    `;
    movieGrid.appendChild(card);
  });

  // Re-bind buttons
  document.querySelectorAll('.edit-btn').forEach(btn => 
    btn.onclick = (e) => { e.stopPropagation(); openEditModal(btn.dataset.id); });
  document.querySelectorAll('.del-btn').forEach(btn => 
    btn.onclick = (e) => { e.stopPropagation(); openDeleteConfirm(btn.dataset.id); });
}

function getFallbackPoster(genre) {
  const map = {
    'Sci-Fi': 'https://images.unsplash.com/photo-1506318137071-a8e063b4b6a1?auto=format&fit=crop&q=80&w=800',
    'Action': 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800',
    'Drama': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=800',
    'Comedy': 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&q=80&w=800',
    'Horror': 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=800',
    'Thriller': 'https://images.unsplash.com/photo-1478720143988-ad992173b2ea?auto=format&fit=crop&q=80&w=800',
    'Animation': 'https://images.unsplash.com/photo-1541562232579-512a21360020?auto=format&fit=crop&q=80&w=800',
    'Adventure': 'https://images.unsplash.com/photo-15190558116ef-8d1976a45749?auto=format&fit=crop&q=80&w=800'
  };
  return map[genre] || 'https://images.unsplash.com/photo-1485099047102-3909196b01b3?auto=format&fit=crop&q=80&w=800';
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── FILTERS ── */
function applyFilters() {
  const query = searchInput.value.toLowerCase().trim();
  const rating = ratingFilterSelect.value;

  let filtered = allMovies;

  if (rating) {
    filtered = filtered.filter(m => m.rating === Number(rating));
  }
  
  if (query) {
    filtered = filtered.filter(m => 
      m.title.toLowerCase().includes(query) || 
      m.genre.toLowerCase().includes(query)
    );
  }

  // Smooth grid transition
  movieGrid.style.opacity = '0';
  setTimeout(() => {
    renderMovies(filtered);
    movieGrid.style.opacity = '1';
  }, 300);
}

/* ── API CALLS ── */
async function fetchMovies() {
  loadingState.classList.remove('hidden');
  movieGrid.classList.add('hidden');
  try {
    const res = await fetch(API);
    const data = await res.json();
    allMovies = data.movies || [];
    renderHero(allMovies);
    renderMovies(allMovies);
  } catch (err) {
    showToast('Failed to load movies', 'error');
  } finally {
    loadingState.classList.add('hidden');
    movieGrid.classList.remove('hidden');
  }
}

/* ── MODALS ── */
function openAddModal() {
  editingId = null;
  movieIdInput.value = '';
  movieForm.reset();
  setStarRating(0);
  clearErrors();
  modalTitle.textContent = 'Add New Movie';
  document.getElementById('submitBtn').textContent = 'Save Movie';
  modal.classList.remove('hidden');
}

function openEditModal(id) {
  const m = allMovies.find(x => x.id === id);
  if (!m) return;
  editingId = id;
  clearErrors();
  modalTitle.textContent = 'Edit Movie Details';
  document.getElementById('submitBtn').textContent = 'Update Movie';

  movieIdInput.value = m.id;
  titleInput.value = m.title;
  genreInput.value = m.genre;
  posterInput.value = m.imageUrl || '';
  setStarRating(m.rating);

  document.querySelectorAll('input[name="recommendation"]').forEach(r => {
    r.checked = r.value === m.recommendation;
  });

  modal.classList.remove('hidden');
}

function closeModal() { modal.classList.add('hidden'); }

function openDeleteConfirm(id) {
  pendingDeleteId = id;
  const m = allMovies.find(x => x.id === id);
  document.getElementById('confirmText').textContent = `Are you sure you want to delete "${m.title}"?`;
  confirmModal.classList.remove('hidden');
}

function closeConfirm() { confirmModal.classList.add('hidden'); }

function clearErrors() {
  ['titleError','genreError','ratingError','recError','posterError'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
  document.getElementById('formError').classList.add('hidden');
}

/* ── EVENT LISTENERS ── */
movieForm.onsubmit = async (e) => {
  e.preventDefault();
  console.log('Form submission started');
  clearErrors();

  const title = titleInput.value.trim();
  const genre = genreInput.value;
  const rating = ratingInput.value;
  const imageUrl = posterInput.value.trim();
  const rec = document.querySelector('input[name="recommendation"]:checked');

  console.log('Form Data:', { title, genre, rating, rec: rec?.value });

  let valid = true;
  if (!title) { document.getElementById('titleError').textContent = 'Required'; valid = false; }
  if (!genre) { document.getElementById('genreError').textContent = 'Required'; valid = false; }
  if (rating === "0" || !rating) { document.getElementById('ratingError').textContent = 'Select Rating'; valid = false; }
  if (!rec) { document.getElementById('recError').textContent = 'Required'; valid = false; }
  
  if (!valid) {
    console.log('Validation failed');
    return;
  }

  const payload = { title, genre, rating: Number(rating), recommendation: rec.value, imageUrl };
  const method = editingId ? 'PATCH' : 'POST';
  const url = editingId ? `${API}/${editingId}` : API;

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error();
    showToast(editingId ? 'Movie updated successfully' : 'Movie added to CineVault');
    closeModal();
    fetchMovies();
  } catch (err) {
    document.getElementById('formError').textContent = 'Error saving movie';
    document.getElementById('formError').classList.remove('hidden');
  }
};

document.getElementById('confirmDelete').onclick = async () => {
  try {
    await fetch(`${API}/${pendingDeleteId}`, { method: 'DELETE' });
    showToast('Movie removed');
    closeConfirm();
    fetchMovies();
  } catch (err) {
    showToast('Delete failed', 'error');
  }
};

document.getElementById('openAddModal').onclick = openAddModal;
document.getElementById('closeModal').onclick = closeModal;
document.getElementById('cancelModal').onclick = closeModal;
document.getElementById('cancelDelete').onclick = closeConfirm;

searchInput.oninput = applyFilters;
ratingFilterSelect.onchange = applyFilters;

// Backdrop clicks
modal.onclick = (e) => e.target === modal && closeModal();
confirmModal.onclick = (e) => e.target === confirmModal && closeConfirm();

/* ── INIT ── */
fetchMovies();

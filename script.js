// API Configuration
const API_KEY = '12ab6cbaba2d592a334d3667c5a723e6';
const API_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// User authentication
const USER_KEY = 'movieAppUser';
const THEME_KEY = 'movieAppTheme';
const FAVORITES_KEY = 'movieAppFavorites';

let currentUser = localStorage.getItem(USER_KEY) || null;
let favorites = new Set();
let movies = [];
let isUpcomingMode = false;
let currentPage = 1;
let totalPages = 1;
let lastSearchTerm = '';
let lastGenre = '';
let lastRating = '';
let lastMode = 'popular'; // 'popular' | 'upcoming' | 'search'

// Helper to get the localStorage key for the current user's favorites
function getFavoritesKey() {
    return currentUser ? `movieAppFavorites_${currentUser}` : FAVORITES_KEY;
}

// Load favorites for the current user
function loadUserFavorites() {
    if (currentUser) {
        const savedFavorites = localStorage.getItem(getFavoritesKey());
        favorites = savedFavorites ? new Set(JSON.parse(savedFavorites)) : new Set();
    } else {
        favorites = new Set();
    }
    updateFavoritesUI();
}

// Initialize user session
function initUserSession() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (currentUser) {
        updateUserUI();
        loadUserFavorites();
    }
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeButton();
    }
}

// Fetch movies from TMDB API
async function fetchMovies(searchTerm = '') {
    try {
        let url;
        if (!searchTerm) {
            // Fetch popular movies if no search term
            url = `${API_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`;
        } else {
            // Search movies with the search term
            url = `${API_URL}/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(searchTerm)}&page=1&include_adult=false`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            movies = data.results.map(movie => ({
                id: movie.id,
                title: movie.title,
                year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
                poster: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster',
                overview: movie.overview,
                rating: movie.vote_average.toFixed(1),
                genre_ids: movie.genre_ids
            }));
            
            // Fetch genre names for each movie
            const genres = await fetchGenres();
            movies = movies.map(movie => ({
                ...movie,
                genres: movie.genre_ids.map(id => genres[id] || 'Unknown')
            }));
            
            return movies;
        } else {
            movies = [];
            return [];
        }
    } catch (error) {
        console.error('Error fetching movies:', error);
        movies = [];
        return [];
    }
}

// Fetch movie genres
async function fetchGenres() {
    try {
        const response = await fetch(`${API_URL}/genre/movie/list?api_key=${API_KEY}&language=en-US`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.genres) {
            const genreMap = {};
            data.genres.forEach(genre => {
                genreMap[genre.id] = genre.name;
            });
            return genreMap;
        }
        return {};
    } catch (error) {
        console.error('Error fetching genres:', error);
        return {};
    }
}

// Fetch detailed movie information
async function fetchMovieDetails(movieId) {
    try {
        const response = await fetch(`${API_URL}/movie/${movieId}?api_key=${API_KEY}&language=en-US`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const movie = await response.json();
        
        if (movie) {
            return {
                title: movie.title,
                year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
                poster: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster',
                overview: movie.overview || 'No description available',
                rating: movie.vote_average.toFixed(1),
                genres: movie.genres.map(genre => genre.name),
                runtime: movie.runtime ? `${movie.runtime} min` : 'N/A',
                director: 'N/A', // TMDB doesn't provide director in the main movie endpoint
                actors: 'N/A'    // TMDB doesn't provide actors in the main movie endpoint
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching movie details:', error);
        return null;
    }
}

// On login, load that user's favorites
function handleLogin() {
    // Not used on index.html, handled in login.html
}

// On logout, clear favorites from memory (not from storage)
function handleLogout() {
    currentUser = null;
    localStorage.removeItem(USER_KEY);
    favorites = new Set();
    updateUserUI();
    updateFavoritesUI();
}

// Update user interface based on login state
function updateUserUI() {
    const userGreeting = document.getElementById('userGreeting');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const favoritesLink = document.querySelector('a[href="favorites.html"]');
    const registerButton = document.getElementById('registerButton');
    if (currentUser) {
        userGreeting?.classList.remove('hidden');
        if (usernameDisplay) usernameDisplay.textContent = currentUser;
        if (favoritesLink) favoritesLink.classList.remove('hidden');
        if (registerButton) registerButton.classList.add('hidden');
    } else {
        userGreeting?.classList.add('hidden');
        if (favoritesLink) favoritesLink.classList.remove('hidden');
        if (registerButton) registerButton.classList.remove('hidden');
    }
}

// Theme switching
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    updateThemeButton();
}

function updateThemeButton() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    const currentTheme = document.documentElement.getAttribute('data-theme');
    themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
}

// Toggle favorite for the current user and update UI immediately
function toggleFavorite(movieId) {
    if (!currentUser) {
        window.location.href = 'login';
        return;
    }
    if (favorites.has(movieId)) {
        favorites.delete(movieId);
    } else {
        favorites.add(movieId);
    }
    localStorage.setItem(getFavoritesKey(), JSON.stringify(Array.from(favorites)));
    updateFavoritesUI();
}

// Update all heart buttons instantly
function updateFavoritesUI() {
    const favoriteButtons = document.querySelectorAll('.favorite-button');
    favoriteButtons.forEach(button => {
        const movieId = button.dataset.movieId;
        const isFavorite = favorites.has(movieId);
        button.classList.toggle('active', isFavorite);
        button.innerHTML = isFavorite ? '❤️' : '♡';
    });

    // Update favorites page if we're on it
    if (window.location.pathname.includes('favorites')) {
        displayFavorites();
    }
}

// Create movie card element
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
        <img src="${movie.poster}" alt="${movie.title}" class="movie-poster">
        <div class="movie-info">
            <h3 class="movie-title">${movie.title}</h3>
            <p class="movie-genre">${movie.genres?.join(', ') || 'Genre not available'}</p>
            <p class="movie-rating">⭐ ${movie.rating || 'N/A'}</p>
        </div>
    `;
    
    if (currentUser) {
        const favoriteButton = document.createElement('button');
        favoriteButton.className = `favorite-button ${favorites.has(movie.id) ? 'active' : ''}`;
        favoriteButton.dataset.movieId = movie.id;
        favoriteButton.innerHTML = favorites.has(movie.id) ? '❤️' : '♡';
        favoriteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(movie.id);
            // Update the heart icon immediately
            favoriteButton.classList.toggle('active', favorites.has(movie.id));
            favoriteButton.innerHTML = favorites.has(movie.id) ? '❤️' : '♡';
        });
        card.appendChild(favoriteButton);
    }
    
    card.addEventListener('click', () => {
        window.location.href = `movie-details?id=${movie.id}`;
    });
    
    return card;
}

// Display movies in the grid
async function displayMovies(moviesToShow) {
    const movieList = document.getElementById('movieList');
    if (!movieList) return;

    movieList.innerHTML = '';
    
    if (moviesToShow.length === 0) {
        movieList.innerHTML = '<p class="no-results">No movies found. Try a different search term.</p>';
        return;
    }

    moviesToShow.forEach(movie => {
        movieList.appendChild(createMovieCard(movie));
    });
}

function saveFiltersToStorage() {
    localStorage.setItem('movieAppSearch', lastSearchTerm);
    localStorage.setItem('movieAppGenre', lastGenre);
    localStorage.setItem('movieAppRating', lastRating);
    localStorage.setItem('movieAppMode', lastMode);
}
function loadFiltersFromStorage() {
    lastSearchTerm = localStorage.getItem('movieAppSearch') || '';
    lastGenre = localStorage.getItem('movieAppGenre') || '';
    lastRating = localStorage.getItem('movieAppRating') || '';
    lastMode = localStorage.getItem('movieAppMode') || 'popular';
}

async function fetchPopularMovies(page = 1) {
    const response = await fetch(`${API_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=${page}`);
    const data = await response.json();
    totalPages = data.total_pages;
    const genres = await fetchGenres();
    return (data.results || []).map(movie => ({
        id: movie.id,
        title: movie.title,
        year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
        poster: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster',
        overview: movie.overview,
        rating: movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A',
        genre_ids: movie.genre_ids,
        genres: movie.genre_ids ? movie.genre_ids.map(id => genres[id] || 'Unknown') : []
    }));
}

async function fetchUpcomingMovies(page = 1) {
    const response = await fetch(`${API_URL}/movie/upcoming?api_key=${API_KEY}&language=en-US&page=${page}`);
    const data = await response.json();
    totalPages = data.total_pages;
    const genres = await fetchGenres();
    return (data.results || []).map(movie => ({
        id: movie.id,
        title: movie.title,
        year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
        poster: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster',
        overview: movie.overview,
        rating: movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A',
        genre_ids: movie.genre_ids,
        genres: movie.genre_ids ? movie.genre_ids.map(id => genres[id] || 'Unknown') : []
    }));
}

async function fetchSearchMovies(searchTerm, page = 1) {
    const response = await fetch(`${API_URL}/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(searchTerm)}&page=${page}&include_adult=false`);
    const data = await response.json();
    totalPages = data.total_pages;
    const genres = await fetchGenres();
    return (data.results || []).map(movie => ({
        id: movie.id,
        title: movie.title,
        year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
        poster: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster',
        overview: movie.overview,
        rating: movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A',
        genre_ids: movie.genre_ids,
        genres: movie.genre_ids ? movie.genre_ids.map(id => genres[id] || 'Unknown') : []
    }));
}

function updateShowMoreBtn() {
    const btn = document.getElementById('showMoreBtn');
    if (!btn) return;
    btn.style.display = (currentPage < totalPages) ? 'block' : 'none';
}

async function showMoreMovies() {
    currentPage++;
    let newMovies = [];
    if (lastMode === 'popular') {
        newMovies = await fetchPopularMovies(currentPage);
    } else if (lastMode === 'upcoming') {
        newMovies = await fetchUpcomingMovies(currentPage);
    } else if (lastMode === 'search') {
        newMovies = await fetchSearchMovies(lastSearchTerm, currentPage);
    }
    movies = movies.concat(newMovies);
    filterAndDisplayMovies(false);
    updateShowMoreBtn();
}

function filterAndDisplayMovies(reset = true) {
    const genreFilter = document.getElementById('genreFilter');
    const ratingFilter = document.getElementById('ratingFilter');
    const searchInput = document.getElementById('searchInput');
    let filtered = movies;
    if (reset) {
        currentPage = 1;
        updateShowMoreBtn();
    }
    if (searchInput && searchInput.value) {
        filtered = filtered.filter(movie => movie.title.toLowerCase().includes(searchInput.value.toLowerCase()));
    }
    if (genreFilter && genreFilter.value) {
        filtered = filtered.filter(movie => movie.genres && movie.genres.includes(genreFilter.value));
    }
    if (ratingFilter && ratingFilter.value) {
        filtered = filtered.filter(movie => parseFloat(movie.rating) >= parseFloat(ratingFilter.value));
    }
    displayMovies(filtered);
}

async function filterMovies() {
    const searchInput = document.getElementById('searchInput');
    const genreFilter = document.getElementById('genreFilter');
    const ratingFilter = document.getElementById('ratingFilter');
    lastSearchTerm = searchInput ? searchInput.value : '';
    lastGenre = genreFilter ? genreFilter.value : '';
    lastRating = ratingFilter ? ratingFilter.value : '';
    saveFiltersToStorage();
    if (isUpcomingMode) {
        lastMode = 'upcoming';
        movies = await fetchUpcomingMovies(1);
    } else if (lastSearchTerm) {
        lastMode = 'search';
        movies = await fetchSearchMovies(lastSearchTerm, 1);
    } else {
        lastMode = 'popular';
        movies = await fetchPopularMovies(1);
    }
    filterAndDisplayMovies();
    updateShowMoreBtn();
}

function setupShowMoreButton() {
    const btn = document.getElementById('showMoreBtn');
    if (btn) {
        btn.onclick = showMoreMovies;
    }
}

function setupUpcomingButton() {
    const upcomingBtn = document.getElementById('upcomingBtn');
    if (upcomingBtn) {
        upcomingBtn.addEventListener('click', async () => {
            isUpcomingMode = true;
            lastMode = 'upcoming';
            currentPage = 1;
            document.getElementById('searchInput').value = '';
            await filterMovies();
        });
    }
}

// Display movie details
async function displayMovieDetails() {
    const movieDetails = document.getElementById('movieDetails');
    if (!movieDetails) return;

    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');
    
    try {
        const movie = await fetchMovieDetails(movieId);
        if (!movie) {
            movieDetails.innerHTML = '<p class="error-message">Movie not found</p>';
            return;
        }

        movieDetails.innerHTML = `
            <img src="${movie.poster}" alt="${movie.title}" class="movie-details-poster">
            <div class="movie-details-info">
                <h2 class="movie-details-title">${movie.title}</h2>
                <div class="movie-details-meta">
                    <span>${movie.year}</span>
                    <span>${movie.genres.join(', ')}</span>
                    <span class="movie-details-rating">⭐ ${movie.rating}</span>
                </div>
                <p class="movie-details-description">${movie.overview}</p>
                <div class="movie-details-extra">
                    <p><strong>Runtime:</strong> ${movie.runtime}</p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading movie details:', error);
        movieDetails.innerHTML = '<p class="error-message">Error loading movie details</p>';
    }
}

// Fetch favorite movies by their IDs
async function fetchFavoriteMovies() {
    if (!currentUser) return [];
    
    const savedFavorites = localStorage.getItem(getFavoritesKey());
    if (!savedFavorites) return [];
    
    const favoriteIds = JSON.parse(savedFavorites);
    const fetchedMovies = [];
    
    for (const id of favoriteIds) {
        try {
            const movie = await fetchMovieDetails(id);
            if (movie) {
                fetchedMovies.push({
                    id: id,
                    title: movie.title,
                    year: movie.year,
                    poster: movie.poster,
                    overview: movie.overview,
                    rating: movie.rating,
                    genres: movie.genres
                });
            }
        } catch (error) {
            console.error(`Ошибка при загрузке фильма с ID ${id}:`, error);
        }
    }
    
    return fetchedMovies;
}

// Display favorites
function displayFavorites() {
    if (!currentUser) {
        window.location.href = 'login';
        return;
    }
    const favoritesList = document.getElementById('favoritesList');
    const noFavorites = document.getElementById('noFavorites');
    if (!favoritesList || !noFavorites) return;
    const favoriteMovies = movies.filter(movie => favorites.has(movie.id));
    if (favoriteMovies.length === 0) {
        favoritesList.classList.add('hidden');
        noFavorites.classList.remove('hidden');
    } else {
        favoritesList.classList.remove('hidden');
        noFavorites.classList.add('hidden');
        favoritesList.innerHTML = '';
        favoriteMovies.forEach(movie => {
            favoritesList.appendChild(createMovieCard(movie));
        });
    }
}

// Populate genre dropdown
async function populateGenreDropdown() {
    const genreFilter = document.getElementById('genreFilter');
    if (!genreFilter) return;
    const genres = await fetchGenres();
    // Remove all but the first option
    while (genreFilter.options.length > 1) genreFilter.remove(1);
    Object.values(genres).forEach(genreName => {
        const option = document.createElement('option');
        option.value = genreName;
        option.textContent = genreName;
        genreFilter.appendChild(option);
    });
}

// Initialize the application
async function init() {
    initUserSession();
    const logoutButton = document.getElementById('logoutButton');
    const themeToggle = document.getElementById('themeToggle');
    if (logoutButton) logoutButton.addEventListener('click', handleLogout);
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    
    // Проверяем как с расширением .html, так и без него
    if (window.location.pathname.includes('movie-details')) {
        await displayMovieDetails();
    } else if (window.location.pathname.includes('favorites')) {
        // Новая логика для страницы избранных
        loadUserFavorites(); // загружаем ID избранных фильмов
        const favoriteMovies = await fetchFavoriteMovies(); // загружаем данные по этим ID
        movies = favoriteMovies; // устанавливаем загруженные данные в массив movies
        displayFavorites(); // отображаем избранные фильмы
    } else {
        loadFiltersFromStorage();
        isUpcomingMode = (lastMode === 'upcoming');
        currentPage = 1;
        let initialMovies = [];
        if (lastMode === 'upcoming') {
            initialMovies = await fetchUpcomingMovies(1);
        } else if (lastMode === 'search' && lastSearchTerm) {
            initialMovies = await fetchSearchMovies(lastSearchTerm, 1);
        } else {
            initialMovies = await fetchPopularMovies(1);
        }
        movies = initialMovies;
        await populateGenreDropdown();
        // Восстановить значения фильтров
        const searchInput = document.getElementById('searchInput');
        const genreFilter = document.getElementById('genreFilter');
        const ratingFilter = document.getElementById('ratingFilter');
        if (searchInput) searchInput.value = lastSearchTerm;
        if (genreFilter) genreFilter.value = lastGenre;
        if (ratingFilter) ratingFilter.value = lastRating;
        filterAndDisplayMovies();
        setupUpcomingButton();
        setupShowMoreButton();
        if (searchInput) {
            searchInput.addEventListener('input', () => { isUpcomingMode = false; filterMovies(); });
        }
        if (genreFilter) {
            genreFilter.addEventListener('change', () => { isUpcomingMode = false; filterMovies(); });
        }
        if (ratingFilter) {
            ratingFilter.addEventListener('change', () => { isUpcomingMode = false; filterMovies(); });
        }
    }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
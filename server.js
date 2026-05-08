const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

// ========== ЗАГРУЗКА ДАННЫХ ==========
function loadData() {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'data', 'database.json'), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        return { movies: [], series: [], persons: [] };
    }
}

// ========== СТАТИЧЕСКАЯ РАЗДАЧА ПАПОК ==========
app.use('/banners', express.static(path.join(__dirname, 'banners')));
app.use('/videos', express.static(path.join(__dirname, 'videos')));

// ========== API ДЛЯ БАННЕРОВ (С SVG-ЗАГЛУШКОЙ) ==========
app.get('/api/banner/movie/:id', (req, res) => {
    const movieId = req.params.id;
    const bannerPath = path.join(__dirname, 'banners', 'movies', `${movieId}.png`);
    
    if (fs.existsSync(bannerPath)) {
        res.sendFile(bannerPath);
    } else {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(`<svg width="300" height="450" xmlns="http://www.w3.org/2000/svg">
            <rect width="300" height="450" fill="#1a1a1a"/>
            <rect width="300" height="4" fill="#e50914" y="0"/>
            <text x="150" y="200" font-family="Arial, sans-serif" font-size="16" fill="#e50914" text-anchor="middle" font-weight="bold">КиноПортал</text>
            <text x="150" y="230" font-family="Arial, sans-serif" font-size="12" fill="#666" text-anchor="middle">Нет постера</text>
            <text x="150" y="250" font-family="Arial, sans-serif" font-size="10" fill="#444" text-anchor="middle">ID: ${movieId}</text>
        </svg>`);
    }
});

app.get('/api/banner/series/:id', (req, res) => {
    const seriesId = req.params.id;
    const bannerPath = path.join(__dirname, 'banners', 'series', `${seriesId}.png`);
    
    if (fs.existsSync(bannerPath)) {
        res.sendFile(bannerPath);
    } else {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(`<svg width="300" height="450" xmlns="http://www.w3.org/2000/svg">
            <rect width="300" height="450" fill="#1a1a1a"/>
            <rect width="300" height="4" fill="#2e7d32" y="0"/>
            <text x="150" y="200" font-family="Arial, sans-serif" font-size="16" fill="#2e7d32" text-anchor="middle" font-weight="bold">КиноПортал</text>
            <text x="150" y="230" font-family="Arial, sans-serif" font-size="12" fill="#666" text-anchor="middle">Нет постера</text>
            <text x="150" y="250" font-family="Arial, sans-serif" font-size="10" fill="#444" text-anchor="middle">ID: ${seriesId}</text>
        </svg>`);
    }
});

// ========== ВИДЕО API ==========
app.get('/api/video/movie/:id', (req, res) => {
    const movieId = req.params.id;
    const videoPath = path.join(__dirname, 'videos', 'movies', `${movieId}.mp4`);
    
    if (fs.existsSync(videoPath)) {
        res.json({ exists: true, url: `/videos/movies/${movieId}.mp4` });
    } else {
        res.json({ exists: false, message: 'Видео временно недоступно' });
    }
});

app.get('/api/video/series/:id/season/:season/episode/:episode', (req, res) => {
    const seriesId = req.params.id;
    const episode = req.params.episode;
    const videoPath = path.join(__dirname, 'videos', 'series', seriesId, `${episode}.mp4`);
    
    if (fs.existsSync(videoPath)) {
        res.json({ exists: true, url: `/videos/series/${seriesId}/${episode}.mp4` });
    } else {
        res.json({ exists: false, message: 'Серия временно недоступна' });
    }
});

// ========== ФУНКЦИИ ДЛЯ ПОИСКА ==========
function getAllGenres() {
    const { movies, series } = loadData();
    const genres = new Set();
    [...movies, ...series].forEach(item => {
        if (item.genres && Array.isArray(item.genres)) {
            item.genres.forEach(genre => genres.add(genre));
        }
    });
    return Array.from(genres).sort();
}

function getAllYears() {
    const { movies, series } = loadData();
    const years = new Set();
    [...movies, ...series].forEach(item => {
        if (item.year) years.add(item.year);
    });
    return Array.from(years).sort((a, b) => b - a);
}

function getAgeRatings() {
    const { movies, series } = loadData();
    const ages = new Set();
    [...movies, ...series].forEach(item => {
        if (item.ageRating) ages.add(item.ageRating);
    });
    return Array.from(ages).sort();
}

function getAllPersons() {
    const { persons } = loadData();
    return persons.map(p => ({ id: p.id, name: p.name, role: p.role }));
}

function searchPersons(query) {
    if (!query || query.length < 2) return [];
    const { persons } = loadData();
    const lowerQuery = query.toLowerCase();
    return persons
        .filter(p => p.name.toLowerCase().includes(lowerQuery))
        .slice(0, 10)
        .map(p => ({ id: p.id, name: p.name, role: p.role }));
}

function searchContent(searchParams) {
    const { movies, series, persons } = loadData();
    
    const {
        query = '',
        type = 'all',
        genre = 'all',
        year = 'all',
        person = '',
        description = '',
        age = 'all',
        minRating = 0
    } = searchParams;
    
    let targetPersonIds = [];
    if (person && person.length > 0) {
        const lowerPerson = person.toLowerCase();
        targetPersonIds = persons
            .filter(p => p.name.toLowerCase().includes(lowerPerson))
            .map(p => p.id);
    }
    
    let results = [];
    const lowerQuery = query.toLowerCase();
    const lowerDescription = description.toLowerCase();
    
    // Фильтруем фильмы
    if (type === 'all' || type === 'movie') {
        movies.forEach(movie => {
            let matches = true;
            
            if (query && !movie.title.toLowerCase().includes(lowerQuery)) matches = false;
            if (matches && genre !== 'all' && (!movie.genres || !movie.genres.includes(genre))) matches = false;
            if (matches && year !== 'all' && movie.year != year) matches = false;
            if (matches && targetPersonIds.length > 0) {
                const hasPerson = [...(movie.directors || []), ...(movie.actors || [])]
                    .some(id => targetPersonIds.includes(id));
                if (!hasPerson) matches = false;
            }
            if (matches && description && !movie.description.toLowerCase().includes(lowerDescription)) matches = false;
            if (matches && age !== 'all' && movie.ageRating !== age) matches = false;
            if (matches && movie.rating < minRating) matches = false;
            
            if (matches) {
                results.push({
                    ...movie,
                    contentType: 'movie'
                });
            }
        });
    }
    
    // Фильтруем сериалы
    if (type === 'all' || type === 'series') {
        series.forEach(ser => {
            let matches = true;
            
            if (query && !ser.title.toLowerCase().includes(lowerQuery)) matches = false;
            if (matches && genre !== 'all' && (!ser.genres || !ser.genres.includes(genre))) matches = false;
            if (matches && year !== 'all' && ser.year != year) matches = false;
            if (matches && targetPersonIds.length > 0) {
                const hasPerson = [...(ser.directors || []), ...(ser.actors || [])]
                    .some(id => targetPersonIds.includes(id));
                if (!hasPerson) matches = false;
            }
            if (matches && description && !ser.description.toLowerCase().includes(lowerDescription)) matches = false;
            if (matches && age !== 'all' && ser.ageRating !== age) matches = false;
            if (matches && ser.rating < minRating) matches = false;
            
            if (matches) {
                results.push({
                    ...ser,
                    contentType: 'series'
                });
            }
        });
    }
    
    results.sort((a, b) => b.rating - a.rating);
    
    return {
        total: results.length,
        results: results
    };
}

// ========== API ЭНДПОИНТЫ ==========

// Фильмы
app.get('/api/movies', (req, res) => {
    const data = loadData();
    res.json(data.movies);
});

app.get('/api/movies/:id', (req, res) => {
    const data = loadData();
    const movie = data.movies.find(m => m.id === parseInt(req.params.id));
    if (movie) {
        movie.directorsInfo = (movie.directors || []).map(id => data.persons.find(p => p.id === id));
        movie.actorsInfo = (movie.actors || []).map(id => data.persons.find(p => p.id === id));
        res.json(movie);
    } else {
        res.status(404).json({ error: 'Фильм не найден' });
    }
});

// Сериалы
app.get('/api/series', (req, res) => {
    const data = loadData();
    res.json(data.series);
});

app.get('/api/series/:id', (req, res) => {
    const data = loadData();
    const series = data.series.find(s => s.id === parseInt(req.params.id));
    if (series) {
        series.directorsInfo = (series.directors || []).map(id => data.persons.find(p => p.id === id));
        series.actorsInfo = (series.actors || []).map(id => data.persons.find(p => p.id === id));
        res.json(series);
    } else {
        res.status(404).json({ error: 'Сериал не найден' });
    }
});

// Персоны
app.get('/api/persons', (req, res) => {
    const data = loadData();
    res.json(data.persons);
});

app.get('/api/persons/:id', (req, res) => {
    const data = loadData();
    const person = data.persons.find(p => p.id === parseInt(req.params.id));
    if (person) {
        person.movies = data.movies.filter(m => 
            (m.directors || []).includes(person.id) || (m.actors || []).includes(person.id));
        person.series = data.series.filter(s => 
            (s.directors || []).includes(person.id) || (s.actors || []).includes(person.id));
        res.json(person);
    } else {
        res.status(404).json({ error: 'Персона не найдена' });
    }
});

// ========== API ПОИСКА ==========
app.get('/api/search', (req, res) => {
    const searchParams = {
        query: req.query.query || '',
        type: req.query.type || 'all',
        genre: req.query.genre || 'all',
        year: req.query.year || 'all',
        person: req.query.person || '',
        description: req.query.description || '',
        age: req.query.age || 'all',
        minRating: parseFloat(req.query.minRating) || 0
    };
    
    const results = searchContent(searchParams);
    res.json(results);
});

app.get('/api/search/filters', (req, res) => {
    res.json({
        genres: getAllGenres(),
        years: getAllYears(),
        ageRatings: getAgeRatings(),
        persons: getAllPersons()
    });
});

app.get('/api/search/persons', (req, res) => {
    const query = req.query.q || '';
    const persons = searchPersons(query);
    res.json(persons);
});

// ========== МАРШРУТЫ СТРАНИЦ ==========
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/movies', (req, res) => {
    res.sendFile(path.join(__dirname, 'movies.html'));
});

app.get('/series', (req, res) => {
    res.sendFile(path.join(__dirname, 'series.html'));
});

app.get('/search', (req, res) => {
    res.sendFile(path.join(__dirname, 'search.html'));
});

app.get('/movie/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'movie-detail.html'));
});

app.get('/series/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'series-detail.html'));
});

app.get('/person/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'person-detail.html'));
});

// ========== ЗАПУСК СЕРВЕРА ==========
app.listen(PORT, () => {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║     🎬 КиноПортал - Сервер запущен успешно      ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  🌐 Главная: http://localhost:${PORT}              ║`);
    console.log(`║  🎥 Фильмы: http://localhost:${PORT}/movies        ║`);
    console.log(`║  📺 Сериалы: http://localhost:${PORT}/series       ║`);
    console.log(`║  🔍 Поиск: http://localhost:${PORT}/search         ║`);
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║  📡 API эндпоинты:                               ║');
    console.log(`║  GET /api/banner/movie/:id                       ║`);
    console.log(`║  GET /api/banner/series/:id                      ║`);
    console.log(`║  GET /api/video/movie/:id                        ║`);
    console.log(`║  GET /api/search?query=текст                     ║`);
    console.log('╚══════════════════════════════════════════════════╝');
});
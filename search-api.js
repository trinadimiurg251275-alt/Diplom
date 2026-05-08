// search-api.js - Модуль умного поиска для Кинопортала
// ====================================================

const fs = require('fs');
const path = require('path');

// МОДУЛЬ 1: ЗАГРУЗКА ДАННЫХ ИЗ БАЗЫ
function loadSearchData() {
    try {
        const dataPath = path.join(__dirname, 'data', 'database.json');
        const rawData = fs.readFileSync(dataPath, 'utf8');
        const data = JSON.parse(rawData);
        return {
            movies: data.movies || [],
            series: data.series || [],
            persons: data.persons || []
        };
    } catch (error) {
        console.error('Ошибка загрузки данных для поиска:', error);
        return { movies: [], series: [], persons: [] };
    }
}

// МОДУЛЬ 2: ПОЛУЧЕНИЕ ВСЕХ УНИКАЛЬНЫХ ЖАНРОВ
function getAllGenres() {
    const { movies, series } = loadSearchData();
    const genres = new Set();
    [...movies, ...series].forEach(item => {
        if (item.genres && Array.isArray(item.genres)) {
            item.genres.forEach(genre => genres.add(genre));
        }
    });
    return Array.from(genres).sort();
}

// МОДУЛЬ 3: ПОЛУЧЕНИЕ ВСЕХ УНИКАЛЬНЫХ ГОДОВ
function getAllYears() {
    const { movies, series } = loadSearchData();
    const years = new Set();
    [...movies, ...series].forEach(item => {
        if (item.year) years.add(item.year);
    });
    return Array.from(years).sort((a, b) => b - a);
}

// МОДУЛЬ 4: ПОЛУЧЕНИЕ ВСЕХ ПЕРСОН (ДЛЯ ПОИСКА)
function getAllPersons() {
    const { persons } = loadSearchData();
    return persons.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role
    }));
}

// МОДУЛЬ 5: ПОЛУЧЕНИЕ ВОЗРАСТНЫХ ОГРАНИЧЕНИЙ
function getAgeRatings() {
    const { movies, series } = loadSearchData();
    const ages = new Set();
    [...movies, ...series].forEach(item => {
        if (item.ageRating) ages.add(item.ageRating);
    });
    return Array.from(ages).sort();
}

// МОДУЛЬ 6: ПОИСК ПЕРСОН ПО ЗАПРОСУ (autocomplete)
function searchPersons(query) {
    if (!query || query.length < 2) return [];
    const { persons } = loadSearchData();
    const lowerQuery = query.toLowerCase();
    return persons
        .filter(p => p.name.toLowerCase().includes(lowerQuery))
        .slice(0, 10)
        .map(p => ({ id: p.id, name: p.name, role: p.role }));
}

// МОДУЛЬ 7: ФИЛЬТРАЦИЯ ПО ПЕРСОНАМ
function filterByPersons(items, personIds, personsData) {
    if (!personIds || personIds.length === 0) return items;
    return items.filter(item => {
        const itemPersonIds = [
            ...(item.directors || []),
            ...(item.actors || [])
        ];
        return personIds.some(pid => itemPersonIds.includes(pid));
    });
}

// МОДУЛЬ 8: ОСНОВНАЯ ФУНКЦИЯ ПОИСКА
function searchContent(searchParams) {
    const { movies, series, persons } = loadSearchData();
    
    // Параметры поиска с значениями по умолчанию
    const {
        query = '',
        type = 'all',
        genre = 'all',
        year = 'all',
        person = '',
        description = '',
        age = 'all',
        minRating = 0,
        sortBy = 'rating',
        sortOrder = 'desc'
    } = searchParams;
    
    // МОДУЛЬ 9: ПОИСК ПО ID ПЕРСОНЫ
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
    
    // МОДУЛЬ 10: ФИЛЬТРАЦИЯ ФИЛЬМОВ
    if (type === 'all' || type === 'movie') {
        movies.forEach(movie => {
            let matches = true;
            
            // Поиск по названию
            if (query && !movie.title.toLowerCase().includes(lowerQuery)) {
                matches = false;
            }
            
            // Поиск по жанру
            if (matches && genre !== 'all' && 
                (!movie.genres || !movie.genres.includes(genre))) {
                matches = false;
            }
            
            // Поиск по году
            if (matches && year !== 'all' && movie.year != year) {
                matches = false;
            }
            
            // Поиск по персоне
            if (matches && targetPersonIds.length > 0) {
                const hasPerson = [...(movie.directors || []), ...(movie.actors || [])]
                    .some(id => targetPersonIds.includes(id));
                if (!hasPerson) matches = false;
            }
            
            // Поиск по описанию
            if (matches && description && 
                !movie.description.toLowerCase().includes(lowerDescription)) {
                matches = false;
            }
            
            // Фильтр по возрастному рейтингу
            if (matches && age !== 'all' && movie.ageRating !== age) {
                matches = false;
            }
            
            // Фильтр по минимальному рейтингу
            if (matches && movie.rating < minRating) {
                matches = false;
            }
            
            if (matches) {
                results.push({
                    ...movie,
                    contentType: 'movie',
                    personsInfo: {
                        directors: (movie.directors || []).map(id => 
                            persons.find(p => p.id === id)),
                        actors: (movie.actors || []).map(id => 
                            persons.find(p => p.id === id))
                    }
                });
            }
        });
    }
    
    // МОДУЛЬ 11: ФИЛЬТРАЦИЯ СЕРИАЛОВ
    if (type === 'all' || type === 'series') {
        series.forEach(ser => {
            let matches = true;
            
            if (query && !ser.title.toLowerCase().includes(lowerQuery)) {
                matches = false;
            }
            
            if (matches && genre !== 'all' && 
                (!ser.genres || !ser.genres.includes(genre))) {
                matches = false;
            }
            
            if (matches && year !== 'all' && ser.year != year) {
                matches = false;
            }
            
            if (matches && targetPersonIds.length > 0) {
                const hasPerson = [...(ser.directors || []), ...(ser.actors || [])]
                    .some(id => targetPersonIds.includes(id));
                if (!hasPerson) matches = false;
            }
            
            if (matches && description && 
                !ser.description.toLowerCase().includes(lowerDescription)) {
                matches = false;
            }
            
            if (matches && age !== 'all' && ser.ageRating !== age) {
                matches = false;
            }
            
            if (matches && ser.rating < minRating) {
                matches = false;
            }
            
            if (matches) {
                results.push({
                    ...ser,
                    contentType: 'series',
                    personsInfo: {
                        directors: (ser.directors || []).map(id => 
                            persons.find(p => p.id === id)),
                        actors: (ser.actors || []).map(id => 
                            persons.find(p => p.id === id))
                    }
                });
            }
        });
    }
    
    // МОДУЛЬ 12: СОРТИРОВКА РЕЗУЛЬТАТОВ
    if (sortBy === 'rating') {
        results.sort((a, b) => sortOrder === 'desc' ? b.rating - a.rating : a.rating - b.rating);
    } else if (sortBy === 'year') {
        results.sort((a, b) => sortOrder === 'desc' ? b.year - a.year : a.year - b.year);
    } else if (sortBy === 'title') {
        results.sort((a, b) => sortOrder === 'desc' 
            ? b.title.localeCompare(a.title) 
            : a.title.localeCompare(b.title));
    }
    
    // МОДУЛЬ 13: ФОРМИРОВАНИЕ ОТВЕТА
    return {
        total: results.length,
        results: results,
        filters: {
            availableGenres: getAllGenres(),
            availableYears: getAllYears(),
            availableAgeRatings: getAgeRatings()
        }
    };
}

// МОДУЛЬ 14: ПОИСК ПО ID (для детальных страниц)
function searchById(id, type) {
    const { movies, series } = loadSearchData();
    if (type === 'movie') {
        return movies.find(m => m.id === parseInt(id));
    } else if (type === 'series') {
        return series.find(s => s.id === parseInt(id));
    }
    return null;
}

// МОДУЛЬ 15: ЭКСПОРТ ФУНКЦИЙ
module.exports = {
    loadSearchData,
    getAllGenres,
    getAllYears,
    getAllPersons,
    getAgeRatings,
    searchPersons,
    searchContent,
    searchById
};
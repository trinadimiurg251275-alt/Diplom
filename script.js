// script.js - общие функции для всех страниц
document.addEventListener('DOMContentLoaded', function() {
    // Мобильное меню
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const mobileNav = document.getElementById('mobileNav');
    const searchToggle = document.getElementById('searchToggle');
    const searchBar = document.getElementById('searchBar');
    const closeSearch = document.getElementById('closeSearch');

    if (mobileToggle && mobileNav) {
        mobileToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            mobileNav.classList.toggle('active');
            document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
        });

        // Закрытие меню при клике вне его
        document.addEventListener('click', function(event) {
            if (mobileNav.classList.contains('active') && 
                !mobileNav.contains(event.target) && 
                !mobileToggle.contains(event.target)) {
                mobileNav.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    if (searchToggle && searchBar) {
        searchToggle.addEventListener('click', function() {
            searchBar.classList.toggle('active');
        });
    }

    if (closeSearch && searchBar) {
        closeSearch.addEventListener('click', function() {
            searchBar.classList.remove('active');
        });
    }

    // Подписка на рассылку
    const subscribeForm = document.getElementById('subscribeForm');
    if (subscribeForm) {
        subscribeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = this.querySelector('input[type="email"]').value;
            if (email) {
                alert(`Спасибо за подписку, ${email}!`);
                this.reset();
            }
        });
    }
});
// theme-toggle.js — dark/light mode for Barangay 14 system
// Reads from localStorage, applies instantly, exposes toggleTheme() globally

(function () {
    const KEY = 'brgy14-theme';
    const html = document.documentElement;

    // Apply saved theme immediately (before DOM renders) to prevent flash
    const saved = localStorage.getItem(KEY) || 'light';
    html.setAttribute('data-bs-theme', saved);

    function applyTheme(theme) {
        html.setAttribute('data-bs-theme', theme);
        localStorage.setItem(KEY, theme);

        // Update all toggle buttons on the page
        document.querySelectorAll('#themeToggleBtn').forEach(btn => {
            btn.innerHTML = theme === 'dark'
                ? '<i class="fas fa-sun fa-fw"></i>'
                : '<i class="fas fa-moon fa-fw"></i>';
            btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        });
    }

    window.toggleTheme = function () {
        const current = html.getAttribute('data-bs-theme') || 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
    };

    // Once DOM is ready, sync button icon to current theme
    document.addEventListener('DOMContentLoaded', () => {
        const current = html.getAttribute('data-bs-theme') || 'light';
        applyTheme(current);
    });
})();
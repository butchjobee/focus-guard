export class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        // Apply initial theme without transition
        document.documentElement.style.transition = 'none';
        document.documentElement.setAttribute('data-theme', this.theme);
        
        // Force reflow
        document.documentElement.offsetHeight;
        
        // Re-enable transitions
        document.documentElement.style.transition = '';

        // Add theme toggle if it doesn't exist
        if (!document.getElementById('themeToggle')) {
            this.createThemeToggle();
        }
    }

    createThemeToggle() {
        const toggle = document.createElement('button');
        toggle.id = 'themeToggle';
        toggle.className = 'theme-toggle';
        toggle.innerHTML = this.theme === 'dark' ? '☀️' : '🌙';
        toggle.style.position = 'fixed';
        toggle.style.top = '20px';
        toggle.style.right = '20px';
        toggle.style.zIndex = '1000';
        toggle.style.cursor = 'pointer';
        
        toggle.addEventListener('click', () => this.toggleTheme());
        document.body.appendChild(toggle);
    }

    toggleTheme() {
        const newTheme = this.theme === 'dark' ? 'light' : 'dark';
        this.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        
        document.documentElement.setAttribute('data-theme', newTheme);
        document.getElementById('themeToggle').innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
    }
}
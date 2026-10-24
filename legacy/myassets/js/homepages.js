
        // Detect device color scheme and set the dark mode switch accordingly
        function setDarkModeSwitch() {
            const darkModeSwitch = document.getElementById('switchDarkMode');
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                darkModeSwitch.checked = true;
            } else {
                darkModeSwitch.checked = false;
            }
        }
        
        // Apply the setting on page load
        setDarkModeSwitch();
        
        // Listen for changes in the device's color scheme
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setDarkModeSwitch);

// Dark Mode Functionality
document.addEventListener('DOMContentLoaded', () => {
    const darkModeSwitch = document.getElementById('switchDarkMode');
    const body = document.body;
    
    const applyDarkMode = (isDark) => {
    if (isDark) {
        body.classList.add('darkMode-active');
        if (darkModeSwitch) darkModeSwitch.checked = true;
    } else {
        body.classList.remove('darkMode-active');
        if (darkModeSwitch) darkModeSwitch.checked = false;
    }
    };
    
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
    applyDarkMode(savedDarkMode === 'enabled');
    } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyDarkMode(prefersDark);
    }
    
    if (darkModeSwitch) {
    darkModeSwitch.addEventListener('change', () => {
        const isDark = darkModeSwitch.checked;
        applyDarkMode(isDark);
        localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    });
    }
    });
    
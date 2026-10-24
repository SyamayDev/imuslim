$(document).ready(function() {
    // Theme Toggle
    const themeToggle = $('#themeToggle');
    const body = $('body');

    themeToggle.on('click', function() {
        if (body.attr('data-theme') === 'light') {
            body.attr('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            body.attr('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });

    // Load Saved Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        body.attr('data-theme', savedTheme);
    }

    // Load Saved Settings
    $('#name').val(localStorage.getItem('userName') || 'Syahril May Mubdi');
    $('#email').val(localStorage.getItem('userEmail') || 'example@email.com');
    $('#language').val(localStorage.getItem('language') || 'English (UK)');
    $('#prayerNotification').prop('checked', localStorage.getItem('prayerNotification') === 'true');
    $('#imsakNotification').prop('checked', localStorage.getItem('imsakNotification') === 'true');
    $('#location').val(localStorage.getItem('location') || '');
    $('#prayerMethod').val(localStorage.getItem('prayerMethod') || 'Muslim World League');
    $('#quranFontSize').val(localStorage.getItem('quranFontSize') || 'Medium');

    // Personal Details Form
    $('#personalDetailsForm').submit(function(e) {
        e.preventDefault();
        const name = $('#name').val();
        const email = $('#email').val();
        localStorage.setItem('userName', name);
        localStorage.setItem('userEmail', email);
        alert('Personal details saved successfully!');
    });

    // Password Form
    $('#passwordForm').submit(function(e) {
        e.preventDefault();
        const newPassword = $('#newPassword').val();
        const confirmPassword = $('#confirmPassword').val();
        if (newPassword === confirmPassword) {
            localStorage.setItem('userPassword', newPassword);
            alert('Password changed successfully!');
            this.reset();
        } else {
            alert('Passwords do not match!');
        }
    });

    // Language Selection
    $('#language').change(function() {
        const language = $(this).val();
        localStorage.setItem('language', language);
        alert('Language set to: ' + language);
    });

    // Notification Toggles
    $('#prayerNotification, #imsakNotification').change(function() {
        const id = this.id;
        const isChecked = $(this).is(':checked');
        localStorage.setItem(id, isChecked);
        alert(id + ' set to: ' + isChecked);
    });

    // Location Setting
    $('#setLocationBtn').click(function() {
        const location = $('#location').val();
        if (location) {
            localStorage.setItem('location', location);
            alert('Location set to: ' + location);
        } else {
            alert('Please enter a location!');
        }
    });

    // Prayer Method Selection
    $('#prayerMethod').change(function() {
        const method = $(this).val();
        localStorage.setItem('prayerMethod', method);
        alert('Prayer calculation method set to: ' + method);
    });

    // Quran Font Size Selection
    $('#quranFontSize').change(function() {
        const fontSize = $(this).val();
        localStorage.setItem('quranFontSize', fontSize);
        alert('Quran font size set to: ' + fontSize);
    });

    // Support Form
    $('#supportForm').submit(function(e) {
        e.preventDefault();
        const subject = $('#subject').val();
        const message = $('#message').val();
        if (subject && message) {
            alert('Support request sent: ' + subject);
            this.reset();
        } else {
            alert('Please fill in all fields!');
        }
    });
});

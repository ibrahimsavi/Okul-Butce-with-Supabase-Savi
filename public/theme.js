// Theme toggle disabled - Light theme only
(function () {
  // Clear any stored theme preference
  localStorage.removeItem('savi-theme');
  
  // Ensure light theme
  document.documentElement.style.colorScheme = 'light';
  document.body.classList.remove('dark-theme');
})();

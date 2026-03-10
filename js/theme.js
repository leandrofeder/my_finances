/* TEMA */
function applyTheme(t) {
  document.documentElement.classList.toggle('light', t === 'light');
  try { localStorage.setItem('ah_theme', '' + t); } catch (e) {}
}

function toggleTheme() {
  const isLight = document.documentElement.classList.contains('light');
  applyTheme(isLight ? 'dark' : 'light');
  if (chart) { chart.destroy(); chart = null; setupChart(); }
}

// Aplica tema salvo ao carregar
(function () {
  try {
    const t = localStorage.getItem('ah_theme');
    if (t) applyTheme(t);
  } catch (e) {}
})();

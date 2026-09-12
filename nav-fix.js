// Reliable navigation fallback. Loaded separately so navigation still works even if app code has an error.
(function () {
  function openScreen(id) {
    document.querySelectorAll('.screen').forEach(function (screen) {
      screen.classList.toggle('active', screen.id === id);
    });
    document.querySelectorAll('.nav button').forEach(function (button) {
      button.classList.toggle('active', button.getAttribute('data-screen') === id);
    });
    try {
      if (id === 'food' && typeof window.renderFood === 'function') window.renderFood();
      if (id === 'workout' && typeof window.renderWorkout === 'function') window.renderWorkout();
      if (id === 'history' && typeof window.renderHistory === 'function') window.renderHistory();
    } catch (e) { console.warn('Navigation render error:', e); }
    window.scrollTo(0, 0);
  }

  function install() {
    document.querySelectorAll('.nav button').forEach(function (button) {
      button.onclick = function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openScreen(button.getAttribute('data-screen'));
        return false;
      };
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();

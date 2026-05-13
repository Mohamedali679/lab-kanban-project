// lost2found · Sprint 4 · main.js

function toggleNav() {
  document.querySelector('.navbar-links').classList.toggle('mobile-open');
}

// Set today's date as default
document.addEventListener('DOMContentLoaded', () => {
  const d = document.getElementById('date_occurred');
  if (d && !d.value) d.value = new Date().toISOString().split('T')[0];

  // Auto-scroll messages to bottom
  const msgs = document.querySelector('.thread-messages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;

  // Flash banner auto-hide
  const flash = document.querySelector('.flash-banner');
  if (flash) setTimeout(() => flash.style.display = 'none', 4000);
});

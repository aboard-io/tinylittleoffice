// Light or dark, before the first paint: the saved choice if there is one, otherwise whatever the device says.
// A file rather than a script in the page, so the site's Content-Security-Policy allows no inline script at all.
(function () {
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  var apply = function () {
    var t = null;
    try { t = localStorage.getItem('to-theme'); } catch (e) {}
    document.documentElement.classList.toggle('sl-theme-dark', t ? t === 'dark' : mq.matches);
  };
  apply();
  mq.addEventListener('change', apply);
})();

// Light or dark, before the first paint: the choice in the menu if there is one (kept on the device under Private
// and Saved alike: kit/store.ts), otherwise whatever the device says (kit/theme.ts keeps it afterwards). A file rather than a script in the page, so the site's
// Content-Security-Policy allows no inline script at all.
(function () {
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  var apply = function () {
    var t = null;
    try { t = localStorage.getItem('to-theme'); } catch (e) {}
    document.documentElement.dataset.theme = t === 'light' || t === 'dark' ? t : mq.matches ? 'dark' : 'light';
  };
  apply();
})();

// iPhones and iPads zoom in on a box whose type is under 16px when it is tapped, and stay zoomed. Told the
// page may not zoom, iOS no longer does that, but still lets a person pinch to zoom; elsewhere the setting
// would stop the pinch, so it is said to iOS alone.
(function () {
  var ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var vp = document.querySelector('meta[name="viewport"]');
  if (ios && vp) vp.content += ', maximum-scale=1';
})();

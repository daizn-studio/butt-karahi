/* Loaded in <head>, before first paint. Marks the page as JS-enabled so
   css/style.css can keep the hero hidden until js/app.js starts its
   intro animation (no flash of the un-animated hero). If app.js never
   runs (blocked CDN, old browser), the hero is revealed anyway. */
document.documentElement.classList.add('js');
setTimeout(function(){ document.documentElement.classList.add('hero-ready'); }, 3000);

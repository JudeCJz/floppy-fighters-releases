// Page extras: nav Download / back-to-top visibility, mystery block roll, swipeable map slider.
(function () {
  "use strict";

  // ---------- nav Download: hidden while the big DOWNLOAD APK button is on screen ----------
  var heroBtn = document.querySelector(".btn-big");
  var navBtn = document.querySelector(".nav-dl");
  if (heroBtn && navBtn && "IntersectionObserver" in window) {
    navBtn.classList.add("away");
    new IntersectionObserver(function (entries) {
      navBtn.classList.toggle("away", entries[0].isIntersecting);
    }, { rootMargin: "-60px 0px 0px 0px" }).observe(heroBtn);
  }

  // ---------- back-to-top (style.css only shows it on phones) ----------
  var toTop = document.querySelector(".to-top");
  function updateToTop() { toTop.classList.toggle("show", window.scrollY > 700); }
  window.addEventListener("scroll", updateToTop, { passive: true });
  updateToTop();

  // ---------- mystery block ----------
  // Roll weights match LUCKY_ITEMS in scripts/game.gd; odds are deliberately never shown on the page.
  var ITEMS = [
    { name: "Homing Grace", img: "homing_grace", w: 3, info: "Your shots curve into enemies for 3 seconds." },
    { name: "Invisible", img: "power_invisible", w: 3, info: "Vanish for 8 seconds. Everyone else only sees your weapon floating around." },
    { name: "Flamethrower", img: "weapon_flamethrower", w: 2.5, info: "Hold to spray fire at close range. You can only get it from a mystery block." },
    { name: "Totem of Life", img: "totem_of_life", w: 1.5, info: "Cheat death once: instead of dying you come back with 50 HP." },
    { name: "Laser Gun", img: "weapon_laser_gun", w: 0.8, info: "Charge a beam that goes through walls and hits everyone in its line. Only from a mystery block." }
  ];
  var total = ITEMS.reduce(function (s, it) { return s + it.w; }, 0);
  ITEMS.forEach(function (it) { new Image().src = "assets/" + it.img + ".png"; });

  var block = document.getElementById("mystery");
  var reel = document.getElementById("mb-reel");
  var result = document.getElementById("mb-result");
  var rolling = false;

  function pick() {
    var r = Math.random() * total;
    for (var i = 0; i < ITEMS.length; i++) { r -= ITEMS[i].w; if (r < 0) return i; }
    return 0;
  }
  function showFrame(i) { reel.src = "assets/" + ITEMS[i].img + ".png"; }

  block.addEventListener("click", function () {
    if (rolling) return;
    rolling = true;
    block.classList.remove("popped");
    block.classList.add("rolling");
    result.classList.remove("win");
    result.innerHTML = '<p class="tag">ROLLING...</p><h3>&nbsp;</h3><p class="muted">&nbsp;</p>';
    var win = pick();
    var delays = [55, 55, 60, 65, 75, 85, 100, 120, 145, 175, 215, 265];
    // cycle through the items so the last frame lands on the winner
    var L = ITEMS.length;
    var frames = delays.map(function (_, n) { return (((win - (delays.length - 1 - n)) % L) + L) % L; });
    var n = 0;
    (function next() {
      showFrame(frames[n]);
      if (n < delays.length - 1) { setTimeout(next, delays[n++]); return; }
      setTimeout(function () {
        var it = ITEMS[win];
        block.classList.remove("rolling");
        block.classList.add("popped");
        result.classList.add("win");
        result.innerHTML = '<p class="tag">YOU GOT</p>' +
          "<h3>" + it.name + '</h3><p class="muted">' + it.info + '</p><p class="muted" style="margin-top:10px;font-size:13px">Tap the block to roll again.</p>';
        rolling = false;
      }, delays[n]);
    })();
  });

  // ---------- map slider ----------
  var slides = document.getElementById("slides");
  var items = Array.prototype.slice.call(slides.children);
  var dots = document.getElementById("dots");
  var prev = document.querySelector(".slide-arrow.prev");
  var nextBtn = document.querySelector(".slide-arrow.next");

  items.forEach(function (s, i) {
    var d = document.createElement("button");
    d.setAttribute("aria-label", "Map " + (i + 1));
    d.addEventListener("click", function () { go(i); });
    dots.appendChild(d);
  });
  function centerOf(s) { return s.offsetLeft - (slides.clientWidth - s.clientWidth) / 2; }
  function go(i) {
    i = Math.max(0, Math.min(items.length - 1, i));
    slides.scrollTo({ left: centerOf(items[i]), behavior: "smooth" });
  }
  function current() {
    var mid = slides.scrollLeft + slides.clientWidth / 2, best = 0, bestD = Infinity;
    items.forEach(function (s, i) {
      var d = Math.abs(s.offsetLeft + s.clientWidth / 2 - mid);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }
  var ticking = false;
  function update() {
    ticking = false;
    var c = current();
    Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle("on", i === c); });
    items.forEach(function (s, i) { s.style.opacity = i === c ? 1 : 0.55; });
    prev.style.visibility = c === 0 ? "hidden" : "";
    nextBtn.style.visibility = c === items.length - 1 ? "hidden" : "";
  }
  slides.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  prev.addEventListener("click", function () { go(current() - 1); });
  nextBtn.addEventListener("click", function () { go(current() + 1); });
  window.addEventListener("resize", update);
  update();

  // mouse drag to swipe on desktop (touch already swipes natively)
  var drag = null;
  slides.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse") return;
    drag = { x: e.clientX, left: slides.scrollLeft, moved: false };
    slides.style.scrollSnapType = "none"; slides.style.scrollBehavior = "auto";
  });
  window.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4) drag.moved = true;
    slides.scrollLeft = drag.left - dx;
  });
  window.addEventListener("pointerup", function () {
    if (!drag) return;
    slides.style.scrollSnapType = ""; slides.style.scrollBehavior = "";
    drag = null;
    go(current());
  });
  slides.addEventListener("dragstart", function (e) { e.preventDefault(); });
})();

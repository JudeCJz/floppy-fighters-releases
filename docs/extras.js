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
  var track = document.getElementById("mb-track");
  var nameEl = document.getElementById("mb-name") || document.getElementById("mb-result");
  var rolling = false;

  function pick() {
    var r = Math.random() * total;
    for (var i = 0; i < ITEMS.length; i++) { r -= ITEMS[i].w; if (r < 0) return i; }
    return 0;
  }

  block.addEventListener("click", function () {
    if (rolling) return;
    rolling = true;
    block.classList.remove("popped");
    block.classList.add("rolling");
    if (nameEl) {
      nameEl.classList.remove("win");
      nameEl.classList.add("rolling");
      nameEl.textContent = "...";
    }

    var winIdx = pick();
    var winnerItem = ITEMS[winIdx];

    // Horizontal reel: items slide across from LEFT to RIGHT.
    // Start view is at START_SLOT (-1900%). Animate to WIN_SLOT (-300%).
    // As translateX increases towards zero, the track travels to the right!
    var TOTAL_SLOTS = 22;
    var WIN_SLOT = 3;
    var START_SLOT = 19;
    var slots = [];

    for (var i = 0; i < TOTAL_SLOTS; i++) {
      if (i === WIN_SLOT) {
        slots.push(winnerItem);
      } else {
        var rIdx;
        do {
          rIdx = Math.floor(Math.random() * ITEMS.length);
        } while (slots.length > 0 && ITEMS[rIdx] === slots[slots.length - 1]);
        slots.push(ITEMS[rIdx]);
      }
    }

    track.innerHTML = "";
    slots.forEach(function (it, idx) {
      var d = document.createElement("div");
      d.className = "mb-slot" + (idx === WIN_SLOT ? " mb-winner-slot" : "");
      var im = document.createElement("img");
      im.src = "assets/" + it.img + ".png";
      im.alt = it.name;
      d.appendChild(im);
      track.appendChild(d);
    });

    // Reset to start slot without animation
    track.style.transition = "none";
    track.style.transform = "translateX(-" + (START_SLOT * 100) + "%)";
    void track.offsetWidth; // force reflow

    // Glide smoothly from left to right with realistic reel deceleration
    var DURATION = 3.6; // seconds
    track.style.transition = "transform " + DURATION + "s cubic-bezier(0.15, 0.65, 0.22, 1)";
    track.style.transform = "translateX(-" + (WIN_SLOT * 100) + "%)";

    // Haptic tick detector during deceleration
    var lastTicked = START_SLOT;
    var tickTimer = setInterval(function () {
      if (!rolling) { clearInterval(tickTimer); return; }
      var st = window.getComputedStyle(track);
      var tr = st.transform || st.webkitTransform;
      if (tr && tr !== "none") {
        var m = tr.match(/matrix.*\((.+)\)/);
        if (m) {
          var tx = parseFloat(m[1].split(",")[4]);
          var w = reel.clientWidth || 1;
          var curSlot = Math.round(-tx / w);
          if (curSlot !== lastTicked) {
            lastTicked = curSlot;
            if (curSlot <= WIN_SLOT + 5 && navigator.vibrate) {
              try { navigator.vibrate(10); } catch (e) {}
            }
          }
        }
      }
    }, 40);

    setTimeout(function () {
      clearInterval(tickTimer);
      block.classList.remove("rolling");
      block.classList.add("popped");
      block.title = winnerItem.name;
      block.setAttribute("aria-label", winnerItem.name + " - tap to roll again");
      if (nameEl) {
        nameEl.classList.remove("rolling");
        nameEl.classList.add("win");
        nameEl.textContent = winnerItem.name;
      }
      if (navigator.vibrate) {
        try { navigator.vibrate([30, 40, 50]); } catch (e) {}
      }
      rolling = false;
    }, DURATION * 1000 + 40);
  });

  // ---------- map slider (infinite loop) ----------
  var slides = document.getElementById("slides");
  var origItems = Array.prototype.slice.call(slides.children);
  var N = origItems.length;
  var dots = document.getElementById("dots");
  var prev = document.querySelector(".slide-arrow.prev");
  var nextBtn = document.querySelector(".slide-arrow.next");

  if (N > 0) {
    origItems.forEach(function (s, i) {
      var d = document.createElement("button");
      d.setAttribute("aria-label", "Map " + (i + 1));
      d.addEventListener("click", function () { goToReal(i); });
      dots.appendChild(d);
    });

    var CLONES = 2;
    // Clone last CLONES to the front: [N-2, N-1]
    for (var i = N - 1; i >= N - CLONES; i--) {
      var cl = origItems[i].cloneNode(true);
      cl.classList.add("clone");
      cl.setAttribute("aria-hidden", "true");
      slides.insertBefore(cl, slides.firstChild);
    }
    // Clone first CLONES to the back: [0, 1]
    for (var j = 0; j < CLONES; j++) {
      var cr = origItems[j].cloneNode(true);
      cr.classList.add("clone");
      cr.setAttribute("aria-hidden", "true");
      slides.appendChild(cr);
    }

    var allSlides = Array.prototype.slice.call(slides.children);

    function centerOf(elem) {
      return elem.offsetLeft - (slides.clientWidth - elem.clientWidth) / 2;
    }

    function currentElementIndex() {
      var mid = slides.scrollLeft + slides.clientWidth / 2;
      var best = CLONES, bestD = Infinity;
      allSlides.forEach(function (s, idx) {
        var d = Math.abs(s.offsetLeft + s.clientWidth / 2 - mid);
        if (d < bestD) { bestD = d; best = idx; }
      });
      return best;
    }

    function realIndex(elemIndex) {
      return ((elemIndex - CLONES) % N + N) % N;
    }

    function instantJump(elemIndex) {
      var snap = slides.style.scrollSnapType;
      slides.style.scrollSnapType = "none";
      slides.style.scrollBehavior = "auto";
      slides.scrollLeft = centerOf(allSlides[elemIndex]);
      slides.style.scrollSnapType = snap;
      slides.style.scrollBehavior = "";
    }

    var isNavigating = false;
    var wrapTimer = null;

    function checkWrap() {
      if (drag || isNavigating) return;
      var c = currentElementIndex();
      if (c >= N + CLONES) {
        instantJump(c - N);
        update();
      } else if (c < CLONES) {
        instantJump(c + N);
        update();
      }
    }

    function goToElement(elemIndex) {
      elemIndex = Math.max(0, Math.min(allSlides.length - 1, elemIndex));
      isNavigating = true;
      slides.scrollTo({ left: centerOf(allSlides[elemIndex]), behavior: "smooth" });
      clearTimeout(wrapTimer);
      wrapTimer = setTimeout(function () {
        isNavigating = false;
        checkWrap();
      }, 420);
    }

    function goToReal(i) {
      goToElement(CLONES + i);
    }

    var ticking = false;
    function update() {
      ticking = false;
      var c = currentElementIndex();
      var r = realIndex(c);
      Array.prototype.forEach.call(dots.children, function (d, idx) {
        d.classList.toggle("on", idx === r);
      });
      allSlides.forEach(function (s, idx) {
        s.style.opacity = realIndex(idx) === r ? 1 : 0.55;
      });
      prev.style.visibility = "";
      nextBtn.style.visibility = "";
    }

    var scrollDebounce = null;
    slides.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
      if (!isNavigating && !drag) {
        clearTimeout(scrollDebounce);
        scrollDebounce = setTimeout(checkWrap, 120);
      }
    }, { passive: true });

    if ("onscrollend" in window) {
      slides.addEventListener("scrollend", function () {
        if (!isNavigating && !drag) checkWrap();
      });
    }

    prev.addEventListener("click", function () {
      var c = currentElementIndex();
      goToElement(c - 1);
    });
    nextBtn.addEventListener("click", function () {
      var c = currentElementIndex();
      goToElement(c + 1);
    });

    // Initial positioning at the first real card
    function initPosition() {
      instantJump(CLONES);
      update();
    }
    initPosition();
    window.addEventListener("load", initPosition);
    window.addEventListener("resize", function () {
      var r = realIndex(currentElementIndex());
      instantJump(CLONES + r);
      update();
    });

    // mouse drag to swipe on desktop (touch already swipes natively)
    var drag = null;
    slides.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      drag = { x: e.clientX, left: slides.scrollLeft, moved: false };
      slides.style.scrollSnapType = "none";
      slides.style.scrollBehavior = "auto";
    });
    window.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) drag.moved = true;
      slides.scrollLeft = drag.left - dx;
    });
    window.addEventListener("pointerup", function () {
      if (!drag) return;
      slides.style.scrollSnapType = "";
      slides.style.scrollBehavior = "";
      drag = null;
      var c = currentElementIndex();
      goToElement(c);
    });
    slides.addEventListener("dragstart", function (e) { e.preventDefault(); });
  }
})();

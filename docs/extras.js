// Page extras: wallpaper parallax, nav Download / back-to-top visibility, mystery block roll, swipeable map slider.
(function () {
  "use strict";

  // ---------- background wallpaper parallax panning ----------
  var bgWallpaper = document.getElementById("bg-wallpaper");
  if (bgWallpaper) {
    var bgTicking = false;
    var prefersReduced = false;
    try {
      prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {}

    if (!prefersReduced) {
      var panRange = 40; // translateY between -40px and +40px

      var updateWallpaperParallax = function () {
        bgTicking = false;
        var scrollH = document.documentElement.scrollHeight - window.innerHeight;
        var ratio = scrollH > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollH)) : 0;
        // At scroll top (ratio 0): +40px; at scroll bottom (ratio 1): -40px
        var offset = ((0.5 - ratio) * (panRange * 2)).toFixed(2);
        bgWallpaper.style.transform = "translate3d(0, " + offset + "px, 0)";
      };

      window.addEventListener("scroll", function () {
        if (!bgTicking) {
          bgTicking = true;
          requestAnimationFrame(updateWallpaperParallax);
        }
      }, { passive: true });

      window.addEventListener("resize", function () {
        if (!bgTicking) {
          bgTicking = true;
          requestAnimationFrame(updateWallpaperParallax);
        }
      });

      updateWallpaperParallax();
    }
  }

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

  var stage = document.getElementById("mb-stage");
  var block = document.getElementById("mystery");
  var reel = document.getElementById("mb-reel");
  var track = document.getElementById("mb-track");
  var nameEl = document.getElementById("mb-name") || document.getElementById("mb-result");
  var rolling = false;
  var resetTimer = null;
  var RESET_DELAY = 5000; // 5 seconds to reset lucky block back to normal

  function getStage() {
    return document.getElementById("mb-stage") || (block ? block.parentElement : null);
  }

  function resetToNormal() {
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
    var st = getStage();
    if (st) st.classList.remove("rolling", "popped");
    if (reel) reel.classList.remove("rolling", "popped");
    if (block) {
      block.classList.remove("rolling", "popped");
      block.title = "Mystery Block";
      block.setAttribute("aria-label", "Roll the mystery block");
    }
    if (nameEl) {
      nameEl.classList.remove("rolling", "win");
      nameEl.textContent = "";
    }
    if (track) {
      track.style.transition = "none";
      track.style.transform = "none";
      track.innerHTML = "";
    }
    rolling = false;
  }

  function pick() {
    var r = Math.random() * total;
    for (var i = 0; i < ITEMS.length; i++) { r -= ITEMS[i].w; if (r < 0) return i; }
    return 0;
  }

  block.addEventListener("click", function () {
    if (rolling) return;
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }

    rolling = true;
    var st = getStage();
    if (st) {
      st.classList.remove("popped");
      st.classList.add("rolling");
    }
    if (reel) {
      reel.classList.remove("popped");
      reel.classList.add("rolling");
    }
    block.classList.remove("popped");
    block.classList.add("rolling");
    if (nameEl) {
      nameEl.classList.remove("win");
      nameEl.classList.add("rolling");
      nameEl.textContent = "...";
    }

    var winIdx = pick();
    var winnerItem = ITEMS[winIdx];

    // Compute dimensions dynamically so slots align with the center block
    var S = block.clientWidth || 160;
    var W = reel.clientWidth || (st ? st.clientWidth : 760) || 760;

    // Horizontal reel: items show outside to the left and right of the block,
    // and travel into the center block from left to right.
    var TOTAL_SLOTS = 28;
    var WIN_SLOT = 5;
    var START_SLOT = 24;
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
      d.style.width = S + "px";
      d.style.flex = "0 0 " + S + "px";
      var im = document.createElement("img");
      im.src = "assets/" + it.img + ".png";
      im.alt = it.name;
      d.appendChild(im);
      track.appendChild(d);
    });

    // Centering formula: slot i's center aligns with center of reel / block
    var startX = (W - S) / 2 - START_SLOT * S;
    var winX = (W - S) / 2 - WIN_SLOT * S;

    // Reset to start slot without animation
    track.style.transition = "none";
    track.style.transform = "translateX(" + startX + "px)";
    void track.offsetWidth; // force reflow

    // Glide smoothly from left to right with realistic reel deceleration
    var DURATION = 3.6; // seconds
    track.style.transition = "transform " + DURATION + "s cubic-bezier(0.12, 0.7, 0.22, 1)";
    track.style.transform = "translateX(" + winX + "px)";

    // Haptic tick detector during deceleration
    var lastTicked = START_SLOT;
    var tickTimer = setInterval(function () {
      if (!rolling) { clearInterval(tickTimer); return; }
      var stStyle = window.getComputedStyle(track);
      var tr = stStyle.transform || stStyle.webkitTransform;
      if (tr && tr !== "none") {
        var m = tr.match(/matrix.*\((.+)\)/);
        if (m) {
          var tx = parseFloat(m[1].split(",")[4]);
          var curSlot = Math.round(((W - S) / 2 - tx) / S);
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
      var endStage = getStage();
      if (endStage) {
        endStage.classList.remove("rolling");
        endStage.classList.add("popped");
      }
      if (reel) {
        reel.classList.remove("rolling");
        reel.classList.add("popped");
      }
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

      // Show the lucky box icon back to normal after 5 seconds
      resetTimer = setTimeout(resetToNormal, RESET_DELAY);
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

  // ---------- gift drop event card interaction ----------
  // Authentic Godot loot table weights from scripts/weapons.gd (W.DEFS) and scripts/game.gd (_pick_weapon())
  var TOTAL_GIFT_SPRITES = 8;
  for (var gi = 0; gi < TOTAL_GIFT_SPRITES; gi++) {
    new Image().src = "assets/gift_" + gi + ".png";
  }

  var giftCard = document.getElementById("ev-gift");
  if (giftCard) {
    var giftBoxes = document.getElementById("ev-gift-boxes");
    var giftBox0 = document.getElementById("ev-gift-box-0");
    var giftBox1 = document.getElementById("ev-gift-box-1");
    var giftBurst = document.getElementById("ev-gift-burst");
    var giftReveal = document.getElementById("ev-gift-reveal");
    var giftWeaponImg = document.getElementById("ev-gift-weapon-img");
    var giftWeaponName = document.getElementById("ev-gift-name");

    var giftState = "idle"; // "idle" | "popping" | "revealed"
    var giftResetTimer = null;
    var currentGifts = [-1, -1];
    var GIFT_DISPLAY_DURATION = 4500; // brief display before auto-resetting

    // Authentic weight fallback matching W.DEFS in scripts/weapons.gd
    var WEAPON_WEIGHT_FALLBACK = {
      "Sticky Bomb": 0.8,
      "Cluster Grenade": 0.8,
      "Impact Grenade": 0.8,
      "Fire Grenade": 0.8,
      "Black Hole Grenade": 0.7,
      "Coco Launcher": 1.0,
      "Nuke Launcher": 0.5,
      "Mine Layer": 0.9,
      "Flashbang": 1.6,
      "Gas Grenade": 0.7,
      "Laser Gun": 0.6,
      "Flamethrower": 1.6,
      "Grenade Launcher": 0.8
    };

    function randomizeGiftSprites() {
      var g0, g1;
      do {
        g0 = Math.floor(Math.random() * TOTAL_GIFT_SPRITES);
      } while (g0 === currentGifts[0] && TOTAL_GIFT_SPRITES > 1);
      do {
        g1 = Math.floor(Math.random() * TOTAL_GIFT_SPRITES);
      } while (g1 === g0 || (g1 === currentGifts[1] && TOTAL_GIFT_SPRITES > 2));
      currentGifts = [g0, g1];
      if (giftBox0) giftBox0.src = "assets/gift_" + g0 + ".png";
      if (giftBox1) giftBox1.src = "assets/gift_" + g1 + ".png";
    }

    // Pick weapon according to Godot game.gd _pick_weapon() loot table
    function pickLootWeapon() {
      var pool = (window.FF_WEAPONS || []).filter(function (w) {
        return w.group !== "power"; // only weapons drop from gift boxes
      });
      if (!pool || pool.length === 0) {
        return { name: "Pistol", png: "weapon_pistol" };
      }
      var totalWeight = 0;
      for (var i = 0; i < pool.length; i++) {
        var w = pool[i];
        var wt = typeof w.weight === "number" ? w.weight : (WEAPON_WEIGHT_FALLBACK[w.name] || 1.0);
        totalWeight += wt;
      }
      var r = Math.random() * totalWeight;
      for (var j = 0; j < pool.length; j++) {
        var item = pool[j];
        var itemWeight = typeof item.weight === "number" ? item.weight : (WEAPON_WEIGHT_FALLBACK[item.name] || 1.0);
        r -= itemWeight;
        if (r <= 0) return item;
      }
      return pool[0];
    }

    function createBurstSparks() {
      if (!giftBurst) return;
      giftBurst.innerHTML = "";
      var flash = document.createElement("div");
      flash.className = "ev-gift-flash";
      giftBurst.appendChild(flash);
      // In-game 8 impact burst sparks (TAU * k / 8.0)
      for (var k = 0; k < 8; k++) {
        var spark = document.createElement("div");
        spark.className = "ev-gift-spark";
        spark.style.setProperty("--angle", (k * 45) + "deg");
        giftBurst.appendChild(spark);
      }
    }

    function resetGiftCard() {
      if (giftResetTimer) {
        clearTimeout(giftResetTimer);
        giftResetTimer = null;
      }
      giftState = "idle";
      giftCard.classList.remove("popping", "revealed");
      if (giftBurst) giftBurst.innerHTML = "";
      if (giftBox0) giftBox0.classList.remove("tapped");
      if (giftBox1) giftBox1.classList.remove("tapped");
      randomizeGiftSprites();
      giftCard.setAttribute("aria-label", "Gift Drop - tap a gift box to open a weapon");
    }

    function openGift(tappedBox) {
      if (giftResetTimer) {
        clearTimeout(giftResetTimer);
        giftResetTimer = null;
      }
      giftState = "popping";

      if (tappedBox) {
        tappedBox.classList.add("tapped");
      }

      var weapon = pickLootWeapon();

      if (giftWeaponImg) {
        giftWeaponImg.src = "assets/" + weapon.png + ".png";
        giftWeaponImg.alt = weapon.name;
      }
      if (giftWeaponName) {
        giftWeaponName.textContent = weapon.name;
      }

      createBurstSparks();
      giftCard.classList.add("popping");

      if (navigator.vibrate) {
        try { navigator.vibrate([25, 35, 45]); } catch (e) {}
      }

      setTimeout(function () {
        giftState = "revealed";
        giftCard.classList.remove("popping");
        giftCard.classList.add("revealed");
        giftCard.setAttribute("aria-label", "Gift Drop: unwrapped " + weapon.name + "! Tap to close and switch gift.");

        giftResetTimer = setTimeout(function () {
          resetGiftCard();
        }, GIFT_DISPLAY_DURATION);
      }, 180);
    }

    function handleCardTap(e) {
      if (giftState === "popping") return;

      if (giftState === "revealed") {
        // Tapping again resets it and switches to another random gift box sprite
        resetGiftCard();
        return;
      }

      // Identify which box was clicked (if any)
      var target = e.target;
      var tappedBox = (target === giftBox1) ? giftBox1 : giftBox0;
      openGift(tappedBox);
    }

    giftCard.addEventListener("click", handleCardTap);
    giftCard.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCardTap(e);
      }
    });

    // Initial random gift box sprites on page load
    randomizeGiftSprites();
  }

  // ---------- thunderstorm lightning strike position randomizer ----------
  // User requested: "make the thunder clap at left or right or centre chances"
  var lightningEl = document.querySelector(".ev-lightning");
  if (lightningEl) {
    var STRIKE_POSITIONS = [
      { name: "left", x: 26 },
      { name: "center", x: 50 },
      { name: "right", x: 74 }
    ];
    var lastStrikeIdx = -1;

    function randomizeLightningPosition() {
      var idx;
      do {
        idx = Math.floor(Math.random() * STRIKE_POSITIONS.length);
      } while (idx === lastStrikeIdx && STRIKE_POSITIONS.length > 1);
      lastStrikeIdx = idx;

      // Small organic jitter (+/- 4%) so strikes look dynamic
      var jitter = (Math.random() * 8) - 4;
      var posX = Math.round(STRIKE_POSITIONS[idx].x + jitter);
      var flip = Math.random() > 0.5 ? " scaleX(-1)" : " scaleX(1)";

      lightningEl.style.left = posX + "%";
      lightningEl.style.transform = "translateX(-50%)" + flip;
    }

    lightningEl.addEventListener("animationiteration", randomizeLightningPosition);
    randomizeLightningPosition();
  }
})();

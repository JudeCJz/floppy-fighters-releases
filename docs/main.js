// Floppy Fighters site: weapons grid, latest release from GitHub, optional promo art from img/.
(function () {
  "use strict";
  var REPO = "JudeCJz/floppy-fighters-releases";
  var RELEASES = "https://github.com/" + REPO + "/releases";

  // ---------- weapons ----------
  // [name, png in assets/, group, one-liner, lucky block only]
  var WEAPONS = [
    ["Pistol", "weapon_pistol", "gun", "Reliable, quick and accurate."],
    ["Revolver", "weapon_revolver", "gun", "Six heavy shots that kick hard."],
    ["SMG", "weapon_smg", "gun", "Hold to spray. Fast and wild."],
    ["Rifle", "weapon_rifle", "gun", "Steady automatic with good range."],
    ["Minigun", "weapon_minigun", "gun", "Shreds everything. Slows you down."],
    ["Shotgun", "weapon_shotgun", "gun", "Shoot the floor mid-air to fly."],
    ["Sniper", "weapon_sniper", "gun", "One shot, massive knockback."],
    ["Ricochet Gun", "weapon_ricochet_gun", "gun", "Bullets bounce off walls 3 times."],
    ["Freeze Ray", "weapon_freeze_ray", "gun", "Freezes fighters. Turns platforms to ice."],
    ["Coco Launcher", "weapon_coco_launcher", "gun", "Fires coconuts. Faster hurts more."],
    ["Laser Gun", "weapon_laser_gun", "gun", "Charge a beam that goes through walls.", true],
    ["Flamethrower", "weapon_flamethrower", "gun", "Sprays fire at close range.", true],
    ["Rocket Launcher", "weapon_rocket_launcher", "boom", "Accelerating rocket. Mind the blast."],
    ["Nuke Launcher", "weapon_nuke_launcher", "boom", "One slow rocket. Run."],
    ["Grenade Launcher", "weapon_grenade_launcher", "boom", "Lobs bouncing grenades."],
    ["Grenades", "weapon_grenades", "boom", "Hold to cook, release to throw."],
    ["Sticky Bomb", "weapon_sticky_bomb", "boom", "Sticks to walls and fighters."],
    ["Cluster Grenade", "weapon_cluster_grenade", "boom", "Bursts into five mini bombs."],
    ["Impact Grenade", "weapon_impact_grenade", "boom", "Goes off the moment it touches anything."],
    ["Fire Grenade", "weapon_fire_grenade", "boom", "Sets the ground on fire."],
    ["Gas Grenade", "weapon_gas_grenade", "boom", "A lingering cloud of poison gas."],
    ["Black Hole Grenade", "weapon_black_hole_grenade", "boom", "Sucks everything in, then pops."],
    ["Flashbang", "weapon_flashbang", "boom", "Blinds everyone close by."],
    ["Mine Layer", "weapon_mine", "boom", "Beeps, waits, then blows."],
    ["Bat", "weapon_bat", "melee", "Big swing. Throw it for a bonk."],
    ["Sword", "weapon_sword", "melee", "Fast slashes. Thrown, it flies straight."],
    ["Spear", "weapon_spear", "melee", "Longest reach in the game."],
    ["Shuriken", "shuriken", "melee", "Throwing stars that stick in walls."]
  ];

  var grid = document.getElementById("weapon-grid");
  WEAPONS.forEach(function (w) {
    var el = document.createElement("div");
    el.className = "weapon";
    el.dataset.group = w[2];
    el.innerHTML = '<div class="pic"><img loading="lazy" alt="" src="assets/' + w[1] + '.png"></div>' +
      "<b>" + w[0] + "</b><span>" + w[3] + "</span>" + (w[4] ? '<em class="lucky">LUCKY BLOCK ONLY</em>' : "");
    grid.appendChild(el);
  });
  // Collapsed: only the first PREVIEW weapons of the current filter; "Show all" fades the rest in.
  var PREVIEW = 6;
  var moreBtn = document.getElementById("weapon-more");
  var filter = "all", expanded = false;

  function layoutWeapons(animate) {
    var shown = 0;
    grid.querySelectorAll(".weapon").forEach(function (w) {
      var match = filter === "all" || w.dataset.group === filter;
      w.classList.toggle("hide", !match);
      w.classList.remove("pop");
      if (!match) return;
      var extra = shown >= PREVIEW;
      w.classList.toggle("more", extra && !expanded);
      if (extra && expanded && animate) {
        w.style.animationDelay = Math.min(shown - PREVIEW, 16) * 0.04 + "s";
        void w.offsetWidth;  // restart the animation
        w.classList.add("pop");
      }
      shown++;
    });
    var hidden = shown > PREVIEW;
    grid.classList.toggle("collapsed", hidden && !expanded);
    moreBtn.parentNode.hidden = !hidden;
    moreBtn.textContent = expanded ? "Show less" : "Show all " + shown + " weapons";
  }

  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("on", c === chip); });
      filter = chip.dataset.filter;
      layoutWeapons(true);
    });
  });
  moreBtn.addEventListener("click", function () {
    expanded = !expanded;
    layoutWeapons(true);
    if (!expanded) document.getElementById("weapons").scrollIntoView({ behavior: "smooth" });
  });
  layoutWeapons(false);

  // ---------- nav Download: hidden while the big hero button is on screen ----------
  var heroBtn = document.querySelector(".btn-big");
  var navBtn = document.querySelector(".nav-dl");
  if (heroBtn && navBtn && "IntersectionObserver" in window) {
    navBtn.classList.add("away");
    new IntersectionObserver(function (entries) {
      navBtn.classList.toggle("away", entries[0].isIntersecting);
    }, { rootMargin: "-60px 0px 0px 0px" }).observe(heroBtn);
  }

  // ---------- back-to-top (phone CSS only shows it) ----------
  var toTop = document.querySelector(".to-top");
  function updateToTop() { toTop.classList.toggle("show", window.scrollY > 700); }
  window.addEventListener("scroll", updateToTop, { passive: true });
  updateToTop();

  // ---------- promo art (website/img/) ----------
  // Either drop the whole ChatGPT 2x2 sheet as img/website_art.png (each slot shows its quarter),
  // or crop the quarters into img/<slot>.png. Missing files leave the game art in place.
  var SLOT_QUARTER = { hero: 0, online: 1, storm: 2, armory: 3 };

  function load(src, cb) {
    var im = new Image();
    im.onload = function () { cb(src); };
    im.onerror = function () { cb(null); };
    im.src = src;
  }
  function useArt(el, src, quarter) {
    el.style.setProperty("--art", "url(" + src + ")");
    el.classList.add("from-art");
    if (quarter != null) { el.classList.add("from-sheet"); el.dataset.q = quarter; }
  }
  load("img/website_art.png", function (sheet) {
    document.querySelectorAll(".art[data-slot]").forEach(function (el) {
      var slot = el.dataset.slot;
      load("img/" + slot + ".png", function (own) {
        if (own) useArt(el, own, null);
        else if (sheet) useArt(el, sheet, SLOT_QUARTER[slot]);
      });
    });
  });
  load("img/logo.png", function (src) {
    if (src) document.querySelectorAll("img[data-logo]").forEach(function (im) { im.src = src; });
  });

  // ---------- releases ----------
  var KEEP_CAPS = /^(HUD|TNT|SFX|CPU|LAN|APK|UI|FPS|X)$/;

  function sentence(t) {
    return t.split(" ").map(function (w, i) {
      if (KEEP_CAPS.test(w)) return w;
      return i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase();
    }).join(" ");
  }

  // Release notes are written for developers; keep only the top-level headings, minus code talk.
  function summarize(r) {
    var curated = (window.FF_NOTES || {})[r.tag_name];
    if (curated) return curated;
    var out = [], fixes = false;
    (r.body || "").split(/\r?\n/).forEach(function (line) {
      if (!/^[-*] /.test(line)) return;
      var t = line.slice(2).replace(/`[^`]*`/g, "").split(":")[0].replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
      if (!t || /changelog by/i.test(t)) return;
      if (/gdscript|parse|infer|import|endcap|crash|\bfix|bug/i.test(t)) { fixes = true; return; }
      if (t.length > 70) t = t.slice(0, 67).replace(/\s+\S*$/, "") + "...";
      out.push(sentence(t));
    });
    out = out.slice(0, 3);
    if (fixes) out.push("Bug fixes");
    return out.length ? out : ["Small fixes and polish"];
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function day(iso) {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }
  function setAll(sel, fn) { document.querySelectorAll(sel).forEach(fn); }

  function show(list) {
    list = list.filter(function (r) { return !r.draft && !r.prerelease; });
    if (!list.length) throw new Error("no releases");
    var latest = list[0];
    var apk = (latest.assets || []).filter(function (a) { return /\.apk$/i.test(a.name); })[0];
    if (apk) {
      setAll(".js-download", function (a) { a.href = apk.browser_download_url; });
      setAll(".js-size", function (s) { s.textContent = " · " + Math.round(apk.size / 1048576) + " MB"; });
    }
    setAll(".js-ver", function (v) { v.textContent = latest.tag_name; });
    setAll(".js-date", function (d) { d.textContent = "Released " + day(latest.published_at); });
    setAll(".js-latest-notes", function (ul) {
      ul.innerHTML = summarize(latest).map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("");
    });
    setAll(".js-history", function (ol) {
      ol.innerHTML = list.slice(1, 7).map(function (r) {
        return '<li><span class="v">' + esc(r.tag_name) + '<span class="d">' + day(r.published_at) + "</span></span>" +
          '<span class="t">' + summarize(r).map(esc).join(" · ") +
          ' <a href="' + esc(r.html_url) + '">notes</a></span></li>';
      }).join("");
    });
  }

  function failed() {
    setAll(".js-ver", function (v) { v.textContent = "Latest version"; });
    setAll(".js-date", function (d) { d.innerHTML = 'Couldn\'t reach GitHub. <a href="' + RELEASES + '">See releases</a>.'; });
    setAll(".js-history", function (ol) { ol.innerHTML = ""; });
  }

  fetch("https://api.github.com/repos/" + REPO + "/releases?per_page=10", { headers: { Accept: "application/vnd.github+json" } })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(show)
    .catch(failed);
})();

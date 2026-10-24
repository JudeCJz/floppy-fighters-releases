// Weapon pile: every weapon drops into the box (Matter.js physics), tap one to inspect it.
// Mouse can also drag weapons around; tap weapon to inspect.
(function () {
  "use strict";
  var M = window.Matter, WEAPONS = window.FF_WEAPONS;
  var REPO = "JudeCJz/floppy-fighters-releases";
  var STEP = 1000 / 60;      // physics step (ms)
  var WALL = 400;            // wall thickness, keeps fast weapons in
  var FILL = 0.48;          // share of the box the pile's sprites cover
  var INSET = 5;             // walls sit this far inside the canvas so sprite edges aren't clipped
  var MAX = { dmg: 160, rate: 25, kb: 2600, radius: 560 };  // stat bar maximums (Nuke, Minigun, ...)

  var box = document.getElementById("box");
  var canvas = document.getElementById("pile");
  var ctx = canvas.getContext("2d");
  var imgs = {};
  var silhouettes = {};
  var engine, walls, bodies = [], k = 1, width = 0, height = 0, dpr = 1;
  var running = false, dropped = false, gen = 0, last = 0, acc = 0;
  var hover = null, hiddenBody = null, down = null, drag = null, blasts = [];

  // ---------- setup ----------
  // Pre-generate crisp white silhouettes of each weapon sprite for clean in-game style outline on hover
  function getSilhouette(name) {
    if (silhouettes[name]) return silhouettes[name];
    var im = imgs[name];
    if (!im || !im.naturalWidth || !im.naturalHeight) return null;
    try {
      var c = document.createElement("canvas");
      c.width = im.naturalWidth;
      c.height = im.naturalHeight;
      var ictx = c.getContext("2d");
      ictx.drawImage(im, 0, 0);
      ictx.globalCompositeOperation = "source-in";
      ictx.fillStyle = "#ffffff";
      ictx.fillRect(0, 0, c.width, c.height);
      silhouettes[name] = c;
      return c;
    } catch (err) {
      return null;
    }
  }

  function loadImages(cb) {
    var left = WEAPONS.length;
    WEAPONS.forEach(function (w) {
      var im = new Image();
      im.onload = function () {
        getSilhouette(w.name);
        if (--left === 0) cb();
      };
      im.onerror = function () {
        if (--left === 0) cb();
      };
      im.src = "assets/" + w.png + ".png";
      imgs[w.name] = im;
    });
  }

  // Sprite size for weapon w at scale s: its in-game length sets the long side.
  function dims(w, s) {
    var im = imgs[w.name];
    var a = im.naturalWidth ? im.naturalHeight / im.naturalWidth : 1;
    var L = Math.max(w.size, 34) * s;
    return a <= 1 ? { w: L, h: L * a } : { w: L / a, h: L };
  }

  function sizeCanvas() {
    width = box.clientWidth; height = box.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    if (walls) {
      M.Body.setPosition(walls[0], { x: width / 2, y: height - INSET + WALL / 2 });
      M.Body.setPosition(walls[1], { x: INSET - WALL / 2, y: height / 2 - 1500 });
      M.Body.setPosition(walls[2], { x: width - INSET + WALL / 2, y: height / 2 - 1500 });
    }
  }

  function build() {
    sizeCanvas();
    engine = M.Engine.create({ enableSleeping: true });
    var still = { isStatic: true };
    walls = [
      M.Bodies.rectangle(width / 2, height - INSET + WALL / 2, width + WALL * 4, WALL, still),
      M.Bodies.rectangle(INSET - WALL / 2, height / 2 - 1500, WALL, height + 3000, still),
      M.Bodies.rectangle(width - INSET + WALL / 2, height / 2 - 1500, WALL, height + 3000, still)
    ];
    M.Composite.add(engine.world, walls);
    var area = 0;
    WEAPONS.forEach(function (w) { var d = dims(w, 1); area += d.w * d.h; });
    k = Math.max(0.55, Math.min(2.4, Math.sqrt(width * height * FILL / area)));
    bodies = [];
  }

  function addWeapon(w, y) {
    var d = dims(w, k);
    var pad = d.w / 2 + INSET + 4;
    var x = pad + Math.random() * Math.max(1, width - pad * 2);
    var b = M.Bodies.rectangle(x, y, d.w * 0.94, d.h * 0.86, {
      chamfer: { radius: Math.min(d.w, d.h) * 0.28 },
      angle: Math.random() * Math.PI * 2,
      restitution: 0.25, friction: 0.5, frictionAir: 0.012, density: 0.0015
    });
    b.weapon = w; b.dw = d.w; b.dh = d.h;
    M.Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.25);
    M.Composite.add(engine.world, b);
    bodies.push(b);
  }

  // Drop everything in a random order; stagger = one at a time from the top.
  function drop(stagger) {
    var g = ++gen;
    bodies.forEach(function (b) { M.Composite.remove(engine.world, b); });
    bodies = []; hover = null;
    var order = WEAPONS.slice().sort(function () { return Math.random() - 0.5; });
    order.forEach(function (w, i) {
      if (!stagger) { addWeapon(w, -80 - i * 60); return; }
      setTimeout(function () { if (g === gen) addWeapon(w, -90); }, i * 110);
    });
    dropped = true;
  }

  // ---------- loop ----------
  function frame(t) {
    if (!running) return;
    acc += Math.min(t - last, 60); last = t;
    while (acc >= STEP) { M.Engine.update(engine, STEP); acc -= STEP; }
    draw();
    requestAnimationFrame(frame);
  }
  function start() {
    if (running) return;
    running = true; last = performance.now(); acc = 0;
    requestAnimationFrame(frame);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    bodies.forEach(function (b) {
      if (b === hiddenBody) return;
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      if (b === hover || (drag && drag.bodyB === b)) {
        var sil = getSilhouette(b.weapon.name);
        if (sil) {
          // Crisp clean white border with no blur/bleeding, exactly matching the in-game weapon outline
          var outline = 2.4;
          for (var i = 0; i < 12; i++) {
            var ang = i * Math.PI * 2 / 12;
            ctx.drawImage(sil, -b.dw / 2 + Math.cos(ang) * outline, -b.dh / 2 + Math.sin(ang) * outline, b.dw, b.dh);
          }
        }
      }
      ctx.drawImage(imgs[b.weapon.name], -b.dw / 2, -b.dh / 2, b.dw, b.dh);
      ctx.restore();
    });
    var now = performance.now();
    blasts = blasts.filter(function (bl) { return now - bl.t < 380; });
    blasts.forEach(function (bl) {
      var p = (now - bl.t) / 380;
      ctx.beginPath();
      ctx.arc(bl.x, bl.y, 20 + p * 130, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 190, 90, " + (1 - p) + ")";
      ctx.lineWidth = 6 * (1 - p) + 1;
      ctx.stroke();
    });
  }

  // ---------- interaction ----------
  function pointIn(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function bodyAt(p) {
    var hits = M.Query.point(bodies, p);
    if (hits.length) return hits[hits.length - 1];
    var best = null, bestD = 28;  // forgiving taps near a weapon's edge
    bodies.forEach(function (b) {
      var d = Math.hypot(b.position.x - p.x, b.position.y - p.y) - Math.min(b.dw, b.dh) / 2;
      if (d < bestD) { bestD = d; best = b; }
    });
    return best;
  }
  function wake(b) { M.Sleeping.set(b, false); }

  function blast(p) {
    blasts.push({ x: p.x, y: p.y, t: performance.now() });
    bodies.forEach(function (b) {
      var dx = b.position.x - p.x, dy = b.position.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d > 190) return;
      var f = 15 * (1 - d / 190);
      wake(b);
      M.Body.setVelocity(b, { x: b.velocity.x + dx / d * f, y: b.velocity.y + dy / d * f - f * 0.5 });
      M.Body.setAngularVelocity(b, b.angularVelocity + (Math.random() - 0.5) * 0.4);
    });
  }

  function shake(fx, fy) {
    var hasForce = typeof fx === "number" && typeof fy === "number";
    bodies.forEach(function (b) {
      wake(b);
      var vx = hasForce ? fx + (Math.random() - 0.5) * 8 : (Math.random() - 0.5) * 14;
      var vy = hasForce ? fy - Math.random() * 8 : -8 - Math.random() * 10;
      vx = Math.max(-20, Math.min(20, vx));
      vy = Math.max(-22, Math.min(8, vy));
      M.Body.setVelocity(b, { x: vx, y: vy });
      M.Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.6);
    });
    box.classList.remove("box-shake");
    void box.offsetWidth;
    box.classList.add("box-shake");
    if (navigator.vibrate) {
      try { navigator.vibrate(28); } catch (err) {}
    }
  }

  // ---------- earth tilt / gravity & lateral reaction ----------
  var currentGx = 0;
  var currentGy = 1;
  var lastWakeTime = 0;
  var hasMotion = false;

  function applyGravity(targetGx, targetGy) {
    // Clamp gravity to safe stable bounds
    targetGx = Math.max(-2.0, Math.min(2.0, targetGx));
    targetGy = Math.max(0.15, Math.min(2.0, targetGy));

    // Smooth transition
    currentGx += (targetGx - currentGx) * 0.35;
    currentGy += (targetGy - currentGy) * 0.35;

    if (engine && engine.gravity) {
      engine.gravity.x = currentGx;
      engine.gravity.y = currentGy;
    }

    // Wake bodies when tilting so they immediately slide towards the earth
    var now = performance.now();
    if (now - lastWakeTime > 120 && (Math.abs(currentGx) > 0.08 || Math.abs(targetGx - currentGx) > 0.08)) {
      lastWakeTime = now;
      if (!dropped) drop(true);
      start();
      bodies.forEach(wake);
    }
  }

  function onMotion(e) {
    var a = e.accelerationIncludingGravity;
    if (!a || (a.x === null && a.y === null)) return;
    hasMotion = true;

    if (openBody) return; // don't shift pile while modal is open

    var rawX = a.x || 0;
    var rawY = a.y || 0;

    // a.x is along phone width. Tilted right or moved left produces negative reaction force.
    // So canvas gx is -rawX / 9.8.
    var gx = -rawX / 9.8 * 1.35;
    // a.y is along phone height. When upright, rawY ~ 9.8 m/s² (+y downward in canvas).
    var gy = rawY / 9.8;
    if (gy < 0.2) gy = 0.35; // keep gentle downward gravity when phone is flat on table

    applyGravity(gx, gy);
  }

  function onOrientation(e) {
    if (hasMotion) return; // motion is active and handles linear acceleration
    if (e.gamma === null && e.beta === null) return;
    if (openBody) return;

    var gamma = e.gamma || 0; // -90 to +90 (left/right tilt)
    var beta = e.beta || 90;  // -180 to +180 (front/back tilt)

    var radG = gamma * Math.PI / 180;
    var gx = Math.sin(radG) * 1.4;
    var gy = Math.cos(radG);
    if (beta < 20) gy = 0.35;

    applyGravity(gx, gy);
  }

  function enableMotion() {
    if (typeof window.DeviceMotionEvent !== "undefined") {
      if (typeof DeviceMotionEvent.requestPermission === "function") {
        DeviceMotionEvent.requestPermission().then(function (res) {
          if (res === "granted") window.addEventListener("devicemotion", onMotion, { passive: true });
        }).catch(function () {});
      } else {
        window.addEventListener("devicemotion", onMotion, { passive: true });
      }
    }

    if (typeof window.DeviceOrientationEvent !== "undefined") {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        DeviceOrientationEvent.requestPermission().then(function (res) {
          if (res === "granted") window.addEventListener("deviceorientation", onOrientation, { passive: true });
        }).catch(function () {});
      } else {
        window.addEventListener("deviceorientation", onOrientation, { passive: true });
      }
    }
  }

  function initMotion() {
    var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || ("ontouchstart" in window);
    if (isMobile) {
      var hintEl = document.getElementById("box-hint");
      if (hintEl) hintEl.textContent = "Tap an item \u00B7 Tilt to slide";
    }

    enableMotion();
    window.addEventListener("pointerdown", enableMotion, { once: true });
  }
  initMotion();

  canvas.addEventListener("pointerdown", function (e) {
    var p = pointIn(e);
    down = { p: p, t: performance.now(), body: bodyAt(p), mouse: e.pointerType === "mouse", id: e.pointerId };
    if (down.mouse && down.body) canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", function (e) {
    var p = pointIn(e);
    if (down && down.mouse && down.body && !drag && Math.hypot(p.x - down.p.x, p.y - down.p.y) > 6) {
      var b = down.body;
      wake(b);
      drag = M.Constraint.create({ pointA: p, bodyB: b, pointB: { x: p.x - b.position.x, y: p.y - b.position.y }, stiffness: 0.15, damping: 0.1, length: 0 });
      M.Composite.add(engine.world, drag);
    }
    if (drag) { drag.pointA = p; wake(drag.bodyB); return; }
    if (e.pointerType === "mouse") {
      hover = bodyAt(p);
      canvas.style.cursor = hover ? "pointer" : "default";
    }
  });
  function endPointer(e, cancelled) {
    if (drag) { M.Composite.remove(engine.world, drag); drag = null; }
    else if (down && !cancelled) {
      var p = pointIn(e);
      if (Math.hypot(p.x - down.p.x, p.y - down.p.y) < 10 && performance.now() - down.t < 500) {
        var b = bodyAt(down.p);
        if (b) {
          inspect(b);
          var hintEl = document.getElementById("box-hint");
          if (hintEl) hintEl.style.opacity = 0;
        }
      }
    }
    down = null;
  }
  canvas.addEventListener("pointerup", function (e) { endPointer(e, false); });
  canvas.addEventListener("pointercancel", function (e) { endPointer(e, true); });
  canvas.addEventListener("pointerleave", function () { if (!drag) { hover = null; } });

  var shakeBtn = document.getElementById("shake");
  if (shakeBtn) {
    shakeBtn.addEventListener("click", function () {
      enableMotion();
      if (!dropped) drop(true);
      start();
      shake();
    });
  }

  // ---------- inspect (weapon flies out of the pile and grows) ----------
  var panel = document.getElementById("inspect");
  var pic = document.getElementById("inspect-pic");
  var flyer = document.getElementById("flyer");
  var openBody = null;

  function stat(label, value, frac) {
    return '<div class="stat"><span>' + label + '</span><i style="--v:' + Math.round(Math.max(0.04, Math.min(1, frac)) * 100) + '%"></i><b>' + value + "</b></div>";
  }

  function wordRating(r) {
    return r < 0.3 ? "LOW" : (r < 0.6 ? "MEDIUM" : (r < 0.9 ? "HIGH" : "HUGE"));
  }

  function getWeaponStats(w) {
    if (w.stats && Array.isArray(w.stats)) {
      return w.stats;
    }

    if (w.name === "Flamethrower") {
      return [
        ["Damage", "60 / S", 0.6],
        ["Range", "SHORT", 0.48],
        ["Fuel", "4 S", 0.5],
        ["Move Speed", "75%", 0.75]
      ];
    }

    var list = [];
    var pellets = w.pellets || 1;
    var dmg = typeof w.dmg === "number" ? w.dmg : 0;

    // 1. Damage
    if (dmg <= 0) {
      list.push(["Damage", "NONE", 0.04]);
    } else {
      var dmgText = dmg + (pellets > 1 ? " x" + pellets : "");
      if (w.group === "gun" || w.group === "melee") dmgText += " HEAD";
      list.push(["Damage", dmgText, (dmg * pellets) / 100]);
    }

    // 2. Speed / Rate
    var rate = 1 / (w.cd || 0.5);
    var rateLabel = (w.group === "melee" ? "Swing speed" : "Fire rate");
    list.push([rateLabel, (rate >= 10 ? Math.round(rate) : rate.toFixed(1)) + " / S", Math.sqrt(rate / 25)]);

    // 3. Ammo
    if (w.ammo < 0) {
      list.push(["Ammo", "UNLIMITED", 1.0]);
    } else {
      list.push(["Ammo", String(w.ammo), w.ammo / 40]);
    }

    // 4. Special characteristic (always present, never "-")
    if (w.name === "Flashbang") {
      list.push(["Blinds for", "UP TO 3.5 S", 1.0]);
    } else if (w.name === "Freeze Ray") {
      list.push(["Freeze", "2.2 S", 2.2 / 3.0]);
    } else if (w.name === "Gas Grenade") {
      list.push(["Gas Cloud", "6.0 S", 0.8]);
    } else if (w.radius) {
      list.push(["Blast", wordRating(w.radius / 280), w.radius / 280]);
    } else if (w.name === "Spear") {
      list.push(["Reach", "HUGE", 1.0]);
    } else if (w.name === "Sword") {
      list.push(["Reach", "HIGH", 0.82]);
    } else if (w.name === "Bat") {
      list.push(["Reach", "MEDIUM", 0.7]);
    } else if (w.name === "Minigun") {
      list.push(["Move Speed", "55%", 0.55]);
    } else if (w.name === "Rocket Launcher") {
      list.push(["Move Speed", "80%", 0.8]);
    } else if (w.name === "Nuke Launcher") {
      list.push(["Move Speed", "60%", 0.6]);
    } else if (w.kb) {
      list.push(["Knockback", wordRating(w.kb / 1500), w.kb / 1500]);
    } else {
      list.push(["Handling", "FAST", 0.75]);
    }

    return list;
  }

  function fillCard(w) {
    var groups = { gun: "Gun", boom: "Explosive", melee: "Melee & thrown", power: "Power-up" };
    var tagHtml = (w.tag || groups[w.group] || "Power-up");
    if (w.lucky) tagHtml += "<em>" + (w.luckyTag || "Lucky block only") + "</em>";
    document.getElementById("inspect-tag").innerHTML = tagHtml;
    document.getElementById("inspect-name").textContent = w.name;
    document.getElementById("inspect-info").textContent = w.info;

    var statsList = getWeaponStats(w);
    var html = "";
    statsList.forEach(function (st) {
      html += stat(st[0], st[1], st[2]);
    });
    document.getElementById("inspect-stats").innerHTML = html;
  }

  function norm(a) { a = a % (Math.PI * 2); if (a > Math.PI) a -= Math.PI * 2; if (a < -Math.PI) a += Math.PI * 2; return a; }
  function place(x, y, w, h, angle) {
    flyer.style.width = w + "px"; flyer.style.height = h + "px";
    flyer.style.transform = "translate(" + (x - w / 2) + "px," + (y - h / 2) + "px) rotate(" + angle + "rad)";
  }
  function bodyScreen(b) {
    var r = canvas.getBoundingClientRect();
    return { x: r.left + b.position.x, y: r.top + b.position.y };
  }
  function picTarget(w) {
    var r = pic.getBoundingClientRect(), im = imgs[w.name];
    var s = Math.min((r.width - 36) / im.naturalWidth, (r.height - 28) / im.naturalHeight, 1.4);
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: im.naturalWidth * s, h: im.naturalHeight * s };
  }

  function inspect(b) {
    if (openBody) return;
    openBody = b; hiddenBody = b; hover = null;
    var w = b.weapon;
    fillCard(w);
    pic.innerHTML = "";
    panel.hidden = false;
    var s = bodyScreen(b), t = picTarget(w);
    flyer.src = imgs[w.name].src;
    flyer.style.transition = "none";
    place(s.x, s.y, b.dw, b.dh, norm(b.angle));
    flyer.hidden = false;
    void flyer.offsetWidth;
    flyer.style.transition = "";
    requestAnimationFrame(function () {
      panel.classList.add("open");
      place(t.x, t.y, t.w, t.h, -0.08);
    });
    setTimeout(function () {  // settle the big image inside the card so it scrolls with it
      if (openBody !== b) return;
      var im = new Image();
      im.src = flyer.src; im.alt = w.name;
      im.style.cssText = "width:" + t.w + "px;height:" + t.h + "px;transform:rotate(-0.08rad);display:block;margin:auto;position:relative;top:50%;translate:0 -50%;filter:drop-shadow(0 10px 18px rgba(0,0,0,.6))";
      pic.appendChild(im);
      flyer.hidden = true;
    }, 440);
    document.getElementById("inspect-close").focus({ preventScroll: true });
  }

  function closeInspect() {
    if (!openBody) return;
    var b = openBody, w = b.weapon;
    var t = picTarget(w), s = bodyScreen(b);
    flyer.style.transition = "none";
    place(t.x, t.y, t.w, t.h, -0.08);
    flyer.hidden = false;
    pic.innerHTML = "";
    void flyer.offsetWidth;
    flyer.style.transition = "";
    panel.classList.remove("open");
    requestAnimationFrame(function () { place(s.x, s.y, b.dw, b.dh, norm(b.angle)); });
    setTimeout(function () {
      flyer.hidden = true; panel.hidden = true;
      hiddenBody = null; openBody = null;
    }, 430);
  }
  document.getElementById("inspect-close").addEventListener("click", closeInspect);
  panel.addEventListener("click", function (e) { if (e.target === panel) closeInspect(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeInspect(); });

  // keyboard / screen reader list
  var list = document.getElementById("weapon-list");
  WEAPONS.forEach(function (w) {
    var li = document.createElement("li"), btn = document.createElement("button");
    btn.textContent = "Inspect " + w.name;
    btn.addEventListener("click", function () {
      var b = bodies.filter(function (x) { return x.weapon === w; })[0];
      if (b) inspect(b);
    });
    li.appendChild(btn); list.appendChild(li);
  });

  // ---------- start when the box is on screen ----------
  loadImages(function () {
    build();
    if (!("IntersectionObserver" in window)) { drop(true); start(); return; }
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { if (!dropped) drop(true); start(); }
      else running = false;
    }, { threshold: 0.15 }).observe(box);
  });

  window.addEventListener("resize", function () {
    clearTimeout(window.__pileResize);
    window.__pileResize = setTimeout(function () {
      if (!engine) return;
      if (Math.abs(box.clientWidth - width) > 30) {  // new width: rescale the pile
        var wasDropped = dropped;
        build();
        if (wasDropped) drop(false);
      } else sizeCanvas();
    }, 200);
  });

  // ---------- latest release for the Download buttons ----------
  fetch("https://api.github.com/repos/" + REPO + "/releases?per_page=5")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (list) {
      var rel = list.filter(function (r) { return !r.draft && !r.prerelease; })[0];
      if (!rel) return;
      var apk = (rel.assets || []).filter(function (a) { return /\.apk$/i.test(a.name); })[0];
      document.querySelectorAll(".js-ver").forEach(function (v) { v.textContent = rel.tag_name; });
      if (!apk) return;
      document.querySelectorAll(".js-download").forEach(function (a) { a.href = apk.browser_download_url; });
      document.querySelectorAll(".js-size").forEach(function (s) { s.textContent = " · " + Math.round(apk.size / 1048576) + " MB"; });
    })
    .catch(function () {});
})();

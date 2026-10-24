// Weapon pile: every weapon drops into the box (Matter.js physics), tap one to inspect it.
// Mouse can also drag weapons around; tapping empty space makes a little blast.
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
  var engine, walls, bodies = [], k = 1, width = 0, height = 0, dpr = 1;
  var running = false, dropped = false, gen = 0, last = 0, acc = 0;
  var hover = null, hiddenBody = null, down = null, drag = null, blasts = [];

  // ---------- setup ----------
  function loadImages(cb) {
    var left = WEAPONS.length;
    WEAPONS.forEach(function (w) {
      var im = new Image();
      im.onload = im.onerror = function () { if (--left === 0) cb(); };
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
      if (b === hover || (drag && drag.bodyB === b)) { ctx.shadowColor = "rgba(240, 72, 77, .95)"; ctx.shadowBlur = 20; }
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

  function shake() {
    bodies.forEach(function (b) {
      wake(b);
      M.Body.setVelocity(b, { x: (Math.random() - 0.5) * 14, y: -8 - Math.random() * 10 });
      M.Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.5);
    });
  }

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
        if (b) inspect(b); else blast(down.p);
        document.getElementById("box-hint").style.opacity = 0;
      }
    }
    down = null;
  }
  canvas.addEventListener("pointerup", function (e) { endPointer(e, false); });
  canvas.addEventListener("pointercancel", function (e) { endPointer(e, true); });
  canvas.addEventListener("pointerleave", function () { if (!drag) { hover = null; } });

  document.getElementById("shake").addEventListener("click", shake);
  document.getElementById("redrop").addEventListener("click", function () { drop(true); });

  // ---------- inspect (weapon flies out of the pile and grows) ----------
  var panel = document.getElementById("inspect");
  var pic = document.getElementById("inspect-pic");
  var flyer = document.getElementById("flyer");
  var openBody = null;

  function stat(label, value, frac) {
    return '<div class="stat"><span>' + label + '</span><i style="--v:' + Math.round(Math.max(0.04, Math.min(1, frac)) * 100) + '%"></i><b>' + value + "</b></div>";
  }
  function fillCard(w) {
    var groups = { gun: "Gun", boom: "Explosive", melee: "Melee & thrown" };
    document.getElementById("inspect-tag").innerHTML = groups[w.group] + (w.lucky ? "<em>Lucky block only</em>" : "");
    document.getElementById("inspect-name").textContent = w.name;
    document.getElementById("inspect-info").textContent = w.info;
    var rate = 1 / w.cd;
    var html = stat("Damage", w.dmg ? w.dmg + (w.pellets ? " x" + w.pellets : "") : "-", (w.dmg * (w.pellets || 1)) / MAX.dmg);
    html += stat("Fire rate", (rate >= 10 ? Math.round(rate) : rate.toFixed(1)) + "/s", rate / MAX.rate);
    html += stat("Knockback", w.kb ? Math.round(w.kb / 10) : "-", w.kb / MAX.kb);
    if (w.radius) html += stat("Blast", Math.round(w.radius / 10), w.radius / MAX.radius);
    html += '<div class="stat"><span>Ammo</span><i style="--v:0%;visibility:hidden"></i><b>' + (w.ammo < 0 ? "&infin;" : w.ammo) + "</b></div>";
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

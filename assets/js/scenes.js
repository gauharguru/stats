/* AHS Global Hospital — live medical animations (ECG, X-ray, ultrasound, laparoscopy) */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- shared heartbeat clock ---------- */
  var bpm = 78, nextBeat = performance.now() + 400;
  var heart = document.querySelector(".heart");
  function onBeat(now) {
    bpm = Math.max(72, Math.min(84, bpm + (Math.random() - 0.5) * 3));
    nextBeat = now + 60000 / bpm;
    document.querySelectorAll(".bpm").forEach(function (el) { el.textContent = Math.round(bpm); });
    if (heart) { heart.classList.remove("beat"); void heart.getBoundingClientRect(); heart.classList.add("beat"); }
    if (Math.random() < 0.15) {
      var s = document.querySelector(".spo2"); if (s) s.textContent = 97 + Math.round(Math.random() * 2);
    }
  }

  // ECG waveform for a phase 0..1 of one beat (P, QRS, T)
  function ecg(ph) {
    function g(c, w, a) { var d = (ph - c) / w; return a * Math.exp(-d * d); }
    return g(0.12, 0.025, 0.12) + g(0.235, 0.008, -0.12) + g(0.25, 0.010, 1) + g(0.268, 0.009, -0.28) + g(0.48, 0.05, 0.28);
  }
  function pleth(ph) {
    var x = ph; return Math.pow(Math.sin(Math.PI * Math.min(1, x * 2.2)), 2) * (x < 0.45 ? 1 : 0) +
      0.35 * Math.exp(-Math.pow((x - 0.55) / 0.06, 2));
  }

  /* ---------- canvas helpers ---------- */
  function fit(c) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = c.clientWidth, h = c.clientHeight || +c.getAttribute("height");
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      c._reset = true;
    }
    var ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }
  function visible(el) {
    if (!el || el.offsetParent === null) return false;
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  }

  /* ---------- sweeping trace (ECG / pleth) ---------- */
  function Sweep(canvas, fn, opts) {
    this.c = canvas; this.fn = fn; this.o = opts; this.x = 0; this.lastY = null; this.phase = 0;
  }
  Sweep.prototype.step = function (dt, beatPhase) {
    var f = fit(this.c), ctx = f.ctx, w = f.w, h = f.h, o = this.o;
    if (this.c._reset) { ctx.clearRect(0, 0, w, h); this.x = 0; this.lastY = null; this.c._reset = false; if (o.grid) this.grid(ctx, w, h); }
    var speed = o.speed || 120; // px per second
    var dx = speed * dt / 1000, gap = 16;
    var y = h * (o.base || 0.62) - this.fn(beatPhase) * h * (o.amp || 0.5);
    // erase ahead
    ctx.clearRect(this.x, 0, dx + gap, h);
    if (o.grid) this.grid(ctx, w, h, this.x, dx + gap);
    ctx.strokeStyle = o.color; ctx.lineWidth = o.width || 2; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.shadowColor = o.color; ctx.shadowBlur = 6;
    if (this.lastY !== null) { ctx.beginPath(); ctx.moveTo(this.x, this.lastY); ctx.lineTo(this.x + dx, y); ctx.stroke(); }
    ctx.shadowBlur = 0;
    this.x += dx; this.lastY = y;
    if (this.x > w) { this.x = 0; this.lastY = null; }
  };
  Sweep.prototype.grid = function (ctx, w, h, from, width) {
    from = from || 0; width = width || w;
    ctx.save(); ctx.beginPath(); ctx.rect(from, 0, width, h); ctx.clip();
    ctx.strokeStyle = "rgba(47,224,138,.07)"; ctx.lineWidth = 1;
    for (var gx = Math.floor(from / 20) * 20; gx < from + width; gx += 20) { ctx.beginPath(); ctx.moveTo(gx + .5, 0); ctx.lineTo(gx + .5, h); ctx.stroke(); }
    for (var gy = 0; gy < h; gy += 20) { ctx.beginPath(); ctx.moveTo(from, gy + .5); ctx.lineTo(from + width, gy + .5); ctx.stroke(); }
    ctx.restore();
  };

  var sweeps = [];
  document.querySelectorAll("canvas.ecg").forEach(function (c) {
    sweeps.push(new Sweep(c, ecg, { color: c.getAttribute("data-color") || "#2fe08a", grid: c.hasAttribute("data-grid"), amp: 0.55, base: 0.66, speed: c.classList.contains("ecg--big") ? 150 : 70, width: c.classList.contains("ecg--big") ? 2.4 : 2 }));
  });
  document.querySelectorAll("canvas.pleth").forEach(function (c) {
    sweeps.push(new Sweep(c, pleth, { color: "#3fe0ff", amp: 0.6, base: 0.85, speed: 150, width: 2 }));
  });

  /* ---------- ultrasound ---------- */
  var usg = document.querySelector("canvas.usg");
  var noise = null;
  function makeNoise() {
    noise = document.createElement("canvas"); noise.width = noise.height = 160;
    var nctx = noise.getContext("2d"), img = nctx.createImageData(160, 160);
    for (var i = 0; i < img.data.length; i += 4) { var v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    nctx.putImageData(img, 0, 0);
  }
  function drawUSG(t) {
    var f = fit(usg), ctx = f.ctx, w = f.w, h = f.h;
    if (!noise) makeNoise();
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
    var cx = w / 2, top = 10, R = h - 24, a0 = Math.PI / 2 - 0.62, a1 = Math.PI / 2 + 0.62;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a0) * 26, top + Math.sin(a0) * 26);
    ctx.arc(cx, top, R, a0, a1); ctx.arc(cx, top, 26, a1, a0, true); ctx.closePath(); ctx.clip();
    // speckle
    var ox = (t / 40) % 160, oy = (t / 55) % 160;
    ctx.globalAlpha = 0.5;
    for (var x = -160; x < w + 160; x += 160) for (var y = -160; y < h + 160; y += 160) ctx.drawImage(noise, x + ox, y + oy);
    ctx.globalAlpha = 1;
    var shade = ctx.createRadialGradient(cx, top, 20, cx, top, R);
    shade.addColorStop(0, "rgba(0,0,0,.15)"); shade.addColorStop(.75, "rgba(0,0,0,.45)"); shade.addColorStop(1, "rgba(0,0,0,.85)");
    ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h);
    // amniotic sac (dark)
    var sx = cx, sy = top + R * 0.6, sway = Math.sin(t / 900) * 4;
    ctx.fillStyle = "rgba(0,0,0,.88)";
    ctx.beginPath(); ctx.ellipse(sx, sy, R * 0.36, R * 0.24, -0.1, 0, Math.PI * 2); ctx.fill();
    // bright wall
    ctx.strokeStyle = "rgba(230,230,230,.55)"; ctx.lineWidth = 5; ctx.filter = "blur(1.5px)"; ctx.stroke(); ctx.filter = "none";
    // baby (head + body + limb)
    ctx.save(); ctx.translate(sx + sway, sy + Math.sin(t / 700) * 2); ctx.rotate(-0.15 + Math.sin(t / 1300) * 0.05);
    ctx.fillStyle = "rgba(225,225,225,.82)"; ctx.filter = "blur(1.2px)";
    ctx.beginPath(); ctx.ellipse(-R * 0.15, -R * 0.02, R * 0.1, R * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(R * 0.06, R * 0.03, R * 0.14, R * 0.075, 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = R * 0.03; ctx.strokeStyle = "rgba(225,225,225,.8)"; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(R * 0.12, R * 0.06); ctx.quadraticCurveTo(R * 0.2, R * 0.15 + Math.sin(t / 300) * 4, R * 0.1, R * 0.16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-R * 0.05, R * 0.05); ctx.lineTo(-R * 0.02, R * 0.12 + Math.sin(t / 420) * 3); ctx.stroke();
    ctx.filter = "none"; ctx.restore();
    ctx.restore();
    // labels
    ctx.fillStyle = "#7fe3ff"; ctx.font = "600 11px Manrope, sans-serif";
    ctx.fillText("USG · C5-2 · 3.5 MHz", 12, 18);
    ctx.textAlign = "right"; ctx.fillText("GA 24w 3d", w - 12, 18);
    ctx.fillStyle = "#ffd23f"; ctx.fillText("FHR " + Math.round(140 + Math.sin(t / 2000) * 4) + " bpm", w - 12, 34);
    ctx.textAlign = "left";
    // depth scale
    ctx.fillStyle = "#4b5b70"; for (var d = 0; d < 6; d++) ctx.fillRect(8, top + 30 + d * (R - 40) / 5, 6, 1.5);
  }

  /* ---------- laparoscope camera view ---------- */
  var lap = document.querySelector("canvas.lapcam");
  function drawLap(t) {
    var f = fit(lap), ctx = f.ctx, w = f.w, h = f.h;
    var g = ctx.createRadialGradient(w * .45, h * .45, 10, w / 2, h / 2, w * .7);
    g.addColorStop(0, "#f7b39a"); g.addColorStop(.4, "#d9604f"); g.addColorStop(.8, "#7a1a22"); g.addColorStop(1, "#200406");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // tissue folds
    ctx.strokeStyle = "rgba(255,210,190,.35)"; ctx.lineWidth = 3;
    for (var i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(0, h * (.3 + i * .15));
      ctx.bezierCurveTo(w * .3, h * (.2 + i * .15) + Math.sin(t / 900 + i) * 6, w * .7, h * (.4 + i * .12), w, h * (.28 + i * .16)); ctx.stroke();
    }
    // vessel
    ctx.strokeStyle = "rgba(120,20,40,.6)"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(w * .1, h * .7); ctx.bezierCurveTo(w * .4, h * .55, w * .55, h * .8, w * .9, h * .6); ctx.stroke();
    // instruments
    function tool(fromX, fromY, tx, ty, open) {
      ctx.strokeStyle = "#cfd8e3"; ctx.lineWidth = 9; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.strokeStyle = "#8d99a8"; ctx.lineWidth = 3;
      var ang = Math.atan2(ty - fromY, tx - fromX);
      [-1, 1].forEach(function (s) {
        ctx.beginPath(); ctx.moveTo(tx, ty);
        ctx.lineTo(tx + Math.cos(ang + s * open) * 16, ty + Math.sin(ang + s * open) * 16); ctx.stroke();
      });
    }
    tool(-10, h * .2, w * .42 + Math.sin(t / 700) * 10, h * .52 + Math.cos(t / 900) * 8, .25 + Math.abs(Math.sin(t / 500)) * .35);
    tool(w + 10, h * .25, w * .6 + Math.cos(t / 800) * 10, h * .5 + Math.sin(t / 600) * 8, .15);
    // lens vignette + glare
    var v = ctx.createRadialGradient(w / 2, h / 2, w * .3, w / 2, h / 2, w * .55);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.85)");
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.ellipse(w * .35, h * .3, 18, 8, -0.5, 0, Math.PI * 2); ctx.fill();
  }

  /* ---------- X-ray scan ---------- */
  var xr = document.querySelector(".xray__reveal"), xl = document.querySelector(".xray__line");
  function drawXray(t) {
    var p = (t % 4200) / 4200; // 0..1 sweep, hold at end
    var y = Math.min(1, p / 0.7) * 300;
    xr.setAttribute("height", y);
    xl.setAttribute("y", Math.min(297, y));
    xl.style.opacity = p < 0.7 ? 1 : 0;
  }

  /* ---------- tabs ---------- */
  var titles = { ecg: "AHS · ICU-03", xray: "AHS · DR PORTABLE", usg: "AHS · USG-01", lap: "AHS · OT-1 LAP" };
  var tabs = document.querySelectorAll(".tabs [data-tab]");
  tabs.forEach(function (b) {
    b.addEventListener("click", function () {
      var key = b.getAttribute("data-tab");
      tabs.forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
      document.querySelectorAll(".scene").forEach(function (s) { s.hidden = s.getAttribute("data-scene") !== key; });
      document.querySelectorAll(".tabtext").forEach(function (s) { s.hidden = s.getAttribute("data-for") !== key; });
      var tt = document.querySelector(".screen__title"); if (tt) tt.textContent = titles[key];
      sweeps.forEach(function (s) { s.c._reset = true; });
    });
  });

  /* ---------- main loop ---------- */
  var last = performance.now(), beatStart = last;
  function frame(now) {
    var dt = Math.min(64, now - last); last = now;
    if (now >= nextBeat) { beatStart = now; onBeat(now); }
    var ph = Math.min(1, (now - beatStart) / (60000 / bpm));
    sweeps.forEach(function (s) { if (visible(s.c)) s.step(dt, ph); });
    if (usg && visible(usg)) drawUSG(now);
    if (lap && visible(lap)) drawLap(now);
    if (xr && visible(xr.ownerSVGElement)) drawXray(now);
    requestAnimationFrame(frame);
  }

  if (reduce) {
    // static frames only
    if (xr) { xr.setAttribute("height", 300); xl.style.opacity = 0; }
    window.addEventListener("load", function () {
      if (usg) drawUSG(0);
      if (lap) drawLap(0);
      sweeps.forEach(function (s) { for (var i = 0; i < 400; i++) s.step(16, (i % 60) / 60); });
    });
  } else {
    requestAnimationFrame(frame);
  }
})();

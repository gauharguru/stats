/* AHS Nursing College — interactive components.
   DNA helix background, cursor tilt + spotlight, bento dashboard (bed chart,
   countdown), scrollytelling journey, eligibility & fee calculator,
   curriculum explorer and the story carousel. Plain JS, no libraries. */

(() => {
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const inr = n => "₹" + n.toLocaleString("en-IN");

/* ------------------------------------------------------------------ DNA helix */
$$(".helix").forEach(canvas => {
  const ctx = canvas.getContext("2d");
  const host = canvas.parentElement;
  let w, h, dpr, angle = 0, tiltX = 0.35, tiltY = 0, targetX = 0.35, targetY = 0, speed = 0.008, visible = true;
  const resize = () => {
    dpr = window.devicePixelRatio || 1;
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const N = 34;
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    const R = Math.min(w * 0.32, 120), len = h * 1.1, cx = w / 2, cy = h / 2, fov = 420;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), y = (t - 0.5) * len, a = angle + t * Math.PI * 4;
      for (let s = 0; s < 2; s++) {
        let x = Math.cos(a + s * Math.PI) * R, z = Math.sin(a + s * Math.PI) * R, yy = y;
        // tilt towards the cursor
        let y2 = yy * Math.cos(tiltX) - z * Math.sin(tiltX), z2 = yy * Math.sin(tiltX) + z * Math.cos(tiltX);
        let x3 = x * Math.cos(tiltY) + z2 * Math.sin(tiltY), z3 = -x * Math.sin(tiltY) + z2 * Math.cos(tiltY);
        const k = fov / (fov + z3 + 200);
        pts.push({ i, s, x: cx + x3 * k, y: cy + y2 * k, z: z3, k });
      }
    }
    // rungs
    for (let i = 0; i < N; i += 2) {
      const a = pts[i * 2], b = pts[i * 2 + 1], depth = (a.z + b.z) / 2;
      ctx.strokeStyle = `rgba(255,246,232,${0.12 + 0.18 * (1 - (depth + 120) / 240)})`;
      ctx.lineWidth = 2 * a.k;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // beads, far ones first
    pts.sort((p, q) => q.z - p.z).forEach(p => {
      const near = 1 - (p.z + 120) / 240;
      ctx.fillStyle = p.s ? `rgba(255,210,63,${0.35 + 0.6 * near})` : `rgba(47,210,124,${0.35 + 0.6 * near})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, (3 + 5 * near) * p.k, 0, Math.PI * 2); ctx.fill();
    });
  };
  const tick = () => {
    if (visible) {
      angle += speed; tiltX += (targetX - tiltX) * 0.06; tiltY += (targetY - tiltY) * 0.06;
      draw();
    }
    requestAnimationFrame(tick);
  };
  host.addEventListener("pointermove", e => {
    const r = host.getBoundingClientRect();
    targetY = ((e.clientX - r.left) / r.width - 0.5) * 1.1;
    targetX = 0.35 + ((e.clientY - r.top) / r.height - 0.5) * 0.9;
    speed = 0.02;
  });
  host.addEventListener("pointerleave", () => { targetX = 0.35; targetY = 0; speed = 0.008; });
  resize(); addEventListener("resize", resize);
  if ("IntersectionObserver" in window) new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(canvas);
  reduce ? draw() : tick();
});

/* ------------------------------------------------- cursor tilt + spotlight */
if (fine && !reduce) {
  $$(".ccard, .stamp, .benefit, .dash__tile, .story, .elig__result").forEach(el => {
    el.classList.add("spot");
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", px * 100 + "%"); el.style.setProperty("--my", py * 100 + "%");
      if (!el.classList.contains("dash__tile")) el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 7}deg) rotateY(${(px - 0.5) * 9}deg) translateY(-3px)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
}

/* ------------------------------------------------ clinical beds bar chart */
$$(".beds").forEach(box => {
  const data = JSON.parse(box.dataset.beds);
  const max = Math.max(...data.map(d => d.beds));
  const total = data.reduce((s, d) => s + d.beds, 0);
  const readout = $(".beds__readout", box.closest(".dash__tile"));
  const show = d => {
    readout.innerHTML = d ? `<b>${d.beds}+</b><span>beds · ${d.name}</span>` : `<b>${total.toLocaleString("en-IN")}+</b><span>beds across ${data.length} hospitals</span>`;
  };
  box.innerHTML = data.map((d, i) => `
    <button class="bar" type="button" data-i="${i}" aria-label="${d.name}: ${d.beds}+ beds">
      <span class="bar__name">${d.short}</span>
      <span class="bar__track"><span class="bar__fill${d.own ? " own" : ""}" style="--v:${d.beds / max}"></span></span>
      <span class="bar__val">${d.beds}+</span>
    </button>`).join("") +
    `<table class="sr-only"><caption>Beds at hospitals used for clinical training</caption><tr><th>Hospital</th><th>Beds</th></tr>${data.map(d => `<tr><td>${d.name}</td><td>${d.beds}+</td></tr>`).join("")}</table>`;
  $$(".bar", box).forEach(b => {
    const d = data[b.dataset.i];
    const on = () => { box.classList.add("is-hover"); $$(".bar", box).forEach(x => x.classList.toggle("on", x === b)); show(d); };
    b.addEventListener("pointerenter", on); b.addEventListener("focus", on);
  });
  box.addEventListener("pointerleave", () => { box.classList.remove("is-hover"); $$(".bar", box).forEach(x => x.classList.remove("on")); show(null); });
  show(null);
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(e => { if (e[0].isIntersecting) { box.classList.add("grown"); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(box);
  } else box.classList.add("grown");
});

/* -------------------------------------------------- deadline countdown */
$$("[data-deadline]").forEach(el => {
  const end = new Date(el.dataset.deadline).getTime();
  const cells = $$("[data-unit]", el);
  const run = () => {
    const ms = end - Date.now();
    if (ms <= 0) { el.classList.add("closed"); return; }
    const parts = { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 };
    cells.forEach(c => { c.textContent = String(parts[c.dataset.unit]).padStart(2, "0"); });
    setTimeout(run, 1000);
  };
  run();
});

/* ---------------------------------------------------- scrollytelling */
$$(".story-scroll").forEach(sec => {
  const steps = $$(".journey__step", sec), scenes = $$(".scene", sec), bar = $(".journey__bar i", sec), num = $(".journey__num", sec);
  const set = i => {
    steps.forEach((s, k) => s.classList.toggle("on", k === i));
    scenes.forEach((s, k) => s.classList.toggle("on", k === i));
    if (bar) bar.style.width = ((i + 1) / steps.length) * 100 + "%";
    if (num) num.textContent = String(i + 1).padStart(2, "0");
  };
  set(0);
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) set(steps.indexOf(en.target));
    }), { rootMargin: "-45% 0px -45% 0px" });
    steps.forEach(s => io.observe(s));
  }
});

/* ------------------------------------------- eligibility & fee calculator */
const COURSES = {
  bsc: { name: "B.Sc Nursing", years: 4, fee: 250000, bscc: true, href: "course-bsc-nursing.html" },
  gnm: { name: "GNM", years: 3, fee: 200000, bscc: true, href: "course-gnm.html" },
  anm: { name: "ANM", years: 2, fee: 80000, bscc: false, href: "course-anm.html" },
};
const SESSION_YEAR = 2026;   // minimum age is counted on 31 December of the admission year

$$(".elig").forEach(root => {
  const ans = { status: null, stream: null, english: null, marks: 55, gender: null, born: null };
  const qs = $$(".elig__q", root), dots = $$(".elig__dots i", root), out = $(".elig__out", root);
  const back = $(".elig__back", root), next = $(".elig__next", root);
  let step = 0;

  const years = $(".elig__born", root);
  for (let y = SESSION_YEAR - 14; y >= SESSION_YEAR - 40; y--) years.insertAdjacentHTML("beforeend", `<option value="${y}">${y}</option>`);
  const marks = $(".elig__marks", root), marksOut = $(".elig__marksval", root);
  marks.addEventListener("input", () => { ans.marks = +marks.value; marksOut.textContent = marks.value + "%"; });
  years.addEventListener("change", () => { ans.born = +years.value; update(); });

  $$(".opt", root).forEach(o => o.addEventListener("click", () => {
    const key = o.dataset.key;
    ans[key] = o.dataset.val;
    $$(`.opt[data-key="${key}"]`, root).forEach(x => x.classList.toggle("on", x === o));
    if (step < qs.length - 1) setTimeout(() => go(step + 1), 220); else update();
  }));

  const answered = i => {
    const k = qs[i].dataset.key;
    return k === "marks" ? true : ans[k] !== null;
  };
  const update = () => {
    back.disabled = step === 0;
    next.disabled = !answered(step);
    next.textContent = step === qs.length - 1 ? "See my courses →" : "Next →";
  };
  const go = i => {
    if (ans.status === "no" && i > 0) { result(); return; }
    step = Math.max(0, Math.min(qs.length - 1, i));
    qs.forEach((q, k) => q.classList.toggle("on", k === step));
    dots.forEach((d, k) => { d.classList.toggle("on", k <= step); });
    out.hidden = true; root.classList.remove("done");
    update();
  };
  back.addEventListener("click", () => go(step - 1));
  next.addEventListener("click", () => step === qs.length - 1 ? result() : go(step + 1));

  const check = id => {
    const why = [], age = ans.born ? SESSION_YEAR - ans.born : null;
    if (ans.status === "no") return { ok: false, why: ["You need to pass 12th (intermediate) first."] };
    if (age !== null && age < 17) why.push(`You must be 17 by 31 December ${SESSION_YEAR}.`);
    if (id === "bsc") {
      if (ans.stream !== "pcb") why.push("Needs 12th in Physics, Chemistry and Biology.");
      if (ans.english !== "yes") why.push("Needs English in 12th.");
      if (ans.marks < 45) why.push("Needs at least 45% aggregate.");
    }
    if (id === "gnm") {
      if (ans.english !== "yes") why.push("Needs English in 12th.");
      if (ans.marks < 40) why.push("Needs at least 40% marks.");
    }
    if (id === "anm" && ans.gender !== "female") why.push("ANM is for girls only.");
    return { ok: !why.length, why };
  };

  const result = () => {
    const res = Object.entries(COURSES).map(([id, c]) => ({ id, c, ...check(id) }));
    const okList = res.filter(r => r.ok);
    const provisional = ans.status === "appearing";
    out.innerHTML = `
      <h3>${okList.length ? `You can apply for <em>${okList.map(r => r.c.name).join(", ")}</em>` : "Not eligible yet — but don't give up"}</h3>
      ${provisional && okList.length ? `<p class="elig__note">You're appearing this year, so this is provisional — it depends on your final 12th result.</p>` : ""}
      <div class="elig__results">${res.map(r => `
        <div class="elig__result ${r.ok ? "ok" : "no"}">
          <span class="elig__badge">${r.ok ? "✓ Eligible" : "✗ Not eligible"}</span>
          <h4>${r.c.name}</h4>
          ${r.ok ? `
            <table><tr><td>Course fee</td><td>${inr(r.c.fee)} / year</td></tr>
            <tr><td>Duration</td><td>${r.c.years} years</td></tr>
            <tr class="tot"><td>Total course fee</td><td>${inr(r.c.fee * r.c.years)}</td></tr>
            <tr><td>Application form</td><td>${inr(1000)}</td></tr>
            <tr><td>Bihar Student Credit Card</td><td>${r.c.bscc ? "Applicable" : "—"}</td></tr></table>
            <a class="btn btn--accent" href="admission.html#apply">Apply for ${r.c.name} →</a>`
          : `<ul>${r.why.map(w => `<li>${w}</li>`).join("")}</ul><a class="link-arrow" href="${r.c.href}">About ${r.c.name}</a>`}
        </div>`).join("")}</div>
      <p class="elig__note">Based on the eligibility and fees in the college brochure. Final eligibility follows INC, BUHS and state rules —
        <a href="contact.html">talk to our Counselling Cell</a> to confirm.</p>
      <button class="btn btn--ghost elig__restart" type="button">↺ Start again</button>`;
    out.hidden = false; root.classList.add("done");
    $(".elig__restart", out).addEventListener("click", () => {
      Object.assign(ans, { status: null, stream: null, english: null, marks: 55, gender: null, born: null });
      $$(".opt", root).forEach(o => o.classList.remove("on")); marks.value = 55; marksOut.textContent = "55%"; years.value = "";
      go(0);
    });
    out.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  };
  go(0);
});

/* ------------------------------------------------- curriculum explorer */
const PLACES = {
  ahs: "AHS Global Hospital", sadar: "Sadar Hospital", srj: "Sri Ram Jaanki Medical College", ecr: "ECR Railway Hospital",
  mh: "BSIMHAS Koilwar / RINPAS Ranchi", chc: "CHCs & PHCs around Samastipur", lab: "College skill labs",
};
const CURRICULUM = {
  bsc: { label: "B.Sc Nursing", unit: "Semester", terms: [
    { subjects: ["Communicative English", "Applied Anatomy", "Applied Physiology", "Applied Sociology", "Applied Psychology", "Nursing Foundation I (incl. First Aid)"], posts: ["lab", "ahs"], focus: "General wards — basic nursing care" },
    { subjects: ["Applied Biochemistry", "Applied Nutrition & Dietetics", "Nursing Foundation II", "Health / Nursing Informatics & Technology"], posts: ["lab", "ahs"], focus: "General wards — patient care procedures" },
    { subjects: ["Applied Microbiology & Infection Control", "Pharmacology I", "Pathology I", "Adult Health (Medical-Surgical) Nursing I"], posts: ["ahs", "sadar"], focus: "Medical and surgical wards" },
    { subjects: ["Pharmacology II", "Pathology II & Genetics", "Adult Health Nursing II", "Professionalism, Values & Ethics"], posts: ["ahs", "srj"], focus: "Speciality wards — OT, ENT, eye, orthopaedics" },
    { subjects: ["Child Health Nursing I", "Mental Health Nursing I", "Community Health Nursing I", "Educational Technology / Nursing Education", "Forensic Nursing & Indian Laws"], posts: ["srj", "mh", "chc"], focus: "Paediatrics, psychiatry and community" },
    { subjects: ["Child Health Nursing II", "Mental Health Nursing II", "Nursing Management & Leadership", "Midwifery / OBG Nursing I"], posts: ["srj", "mh", "ahs"], focus: "Paediatric, psychiatric and labour room postings" },
    { subjects: ["Community Health Nursing II", "Nursing Research & Statistics", "Midwifery / OBG Nursing II"], posts: ["chc", "sadar", "ahs"], focus: "Community health and maternity" },
    { subjects: ["Internship — intensive practicum"], posts: ["ahs", "srj", "sadar", "ecr", "chc"], focus: "Rotations across ICU, emergency, wards, OBG and community" },
  ]},
  gnm: { label: "GNM", unit: "Year", terms: [
    { subjects: ["Bio Sciences — Anatomy, Physiology, Microbiology", "Behavioural Sciences — Psychology, Sociology", "Fundamentals of Nursing & First Aid", "Community Health Nursing I", "English & Computer Education"], posts: ["lab", "ahs", "chc"], focus: "Basic nursing care in wards and community" },
    { subjects: ["Medical-Surgical Nursing I (incl. Pharmacology)", "Medical-Surgical Nursing II (specialities)", "Mental Health Nursing", "Child Health Nursing"], posts: ["ahs", "sadar", "srj", "mh"], focus: "Medical, surgical, paediatric and psychiatric wards" },
    { subjects: ["Midwifery & Gynaecological Nursing", "Community Health Nursing II", "Nursing Education & Introduction to Research", "Professional Trends, Ward Management & Administration", "Internship"], posts: ["ahs", "srj", "chc", "ecr"], focus: "Labour room, maternity, community and internship" },
  ]},
  anm: { label: "ANM", unit: "Year", terms: [
    { subjects: ["Community Health Nursing", "Health Promotion — nutrition, hygiene, communication", "Primary Health Care Nursing", "Child Health Nursing"], posts: ["lab", "chc", "ahs"], focus: "Sub-centres, PHCs and immunisation sessions" },
    { subjects: ["Midwifery", "Health Centre Management", "Internship"], posts: ["ahs", "chc", "sadar"], focus: "Labour room, antenatal and postnatal care, community" },
  ]},
};

$$(".curriculum").forEach(root => {
  const only = root.dataset.course;
  const ids = only && only !== "all" ? [only] : Object.keys(CURRICULUM);
  root.innerHTML = `
    ${ids.length > 1 ? `<div class="cur__tabs" role="tablist">${ids.map((id, i) => `<button type="button" role="tab" class="cur__tab${i ? "" : " on"}" data-id="${id}">${CURRICULUM[id].label}</button>`).join("")}</div>` : ""}
    <div class="cur__grid"></div><div class="cur__panel" aria-live="polite"></div>
    <p class="cur__note">Subjects follow the INC curriculum. Hospital postings shown are typical — the college sets the exact rotation schedule and credit hours each session.</p>`;
  const grid = $(".cur__grid", root), panel = $(".cur__panel", root);
  const render = id => {
    const c = CURRICULUM[id];
    grid.style.setProperty("--n", c.terms.length);
    grid.innerHTML = c.terms.map((t, i) => `
      <button type="button" class="cur__term" data-i="${i}">
        <small>${c.unit}</small><b>${i + 1}</b><span>${t.subjects.length} ${t.subjects.length === 1 ? "module" : "subjects"}</span>
      </button>`).join("");
    const open = i => {
      const t = c.terms[i];
      $$(".cur__term", grid).forEach((b, k) => b.classList.toggle("on", k === i));
      panel.innerHTML = `
        <div class="cur__card">
          <div class="cur__head"><span class="cur__pill">${c.label} · ${c.unit} ${i + 1}</span><h3>${t.focus}</h3></div>
          <div class="cur__cols">
            <div><h4>📚 Subjects</h4><ul>${t.subjects.map(s => `<li>${s}</li>`).join("")}</ul></div>
            <div><h4>🏥 Clinical postings</h4><div class="cur__posts">${t.posts.map(p => `<span>${PLACES[p]}</span>`).join("")}</div></div>
          </div>
        </div>`;
    };
    $$(".cur__term", grid).forEach(b => b.addEventListener("click", () => open(+b.dataset.i)));
    open(0);
  };
  $$(".cur__tab", root).forEach(t => t.addEventListener("click", () => {
    $$(".cur__tab", root).forEach(x => x.classList.toggle("on", x === t)); render(t.dataset.id);
  }));
  render(ids[0]);
});

/* ------------------------------------------------------ story carousel */
$$(".stories").forEach(root => {
  const track = $(".stories__track", root);
  const by = dir => track.scrollBy({ left: dir * (track.clientWidth * 0.8), behavior: reduce ? "auto" : "smooth" });
  $(".stories__prev", root)?.addEventListener("click", () => by(-1));
  $(".stories__next", root)?.addEventListener("click", () => by(1));
  // drag to scroll with a mouse
  let down = false, sx = 0, sl = 0;
  track.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") return; down = true; sx = e.clientX; sl = track.scrollLeft; track.classList.add("drag"); });
  addEventListener("pointerup", () => { down = false; track.classList.remove("drag"); });
  track.addEventListener("pointermove", e => { if (down) track.scrollLeft = sl - (e.clientX - sx); });
});
})();

/* Programme videos: autoplay muted while on screen */
if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { v.preload = "auto"; v.play().catch(() => {}); } else v.pause();
  }), { threshold: 0.5 });
  document.querySelectorAll(".vcard video").forEach(v => vio.observe(v));
}

/* Album lightbox */
(() => {
  const box = document.querySelector(".lightbox");
  if (!box) return;
  const tiles = [...document.querySelectorAll(".album__tile")];
  const img = box.querySelector("img"), cap = box.querySelector(".lightbox__cap");
  let i = 0, last = null;
  const show = k => { i = (k + tiles.length) % tiles.length; const t = tiles[i], im = t.querySelector("img");
    img.src = t.dataset.full; img.alt = im.alt; cap.textContent = im.alt; };
  const open = k => { last = document.activeElement; show(k); box.hidden = false; box.querySelector(".lightbox__close").focus(); document.body.style.overflow = "hidden"; };
  const close = () => { box.hidden = true; document.body.style.overflow = ""; last && last.focus(); };
  tiles.forEach((t, k) => t.addEventListener("click", () => open(k)));
  box.querySelector(".lightbox__close").addEventListener("click", close);
  box.querySelector(".lightbox__prev").addEventListener("click", () => show(i - 1));
  box.querySelector(".lightbox__next").addEventListener("click", () => show(i + 1));
  box.addEventListener("click", e => { if (e.target === box) close(); });
  addEventListener("keydown", e => { if (box.hidden) return;
    if (e.key === "Escape") close(); if (e.key === "ArrowLeft") show(i - 1); if (e.key === "ArrowRight") show(i + 1); });
})();
/* Also autoplay the mass-casualty reel when visible */
if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
  const rio = new IntersectionObserver(es => es.forEach(e => { const v = e.target;
    if (e.isIntersecting) { v.preload = "auto"; v.play().catch(() => {}); } else v.pause(); }), { threshold: 0.5 });
  document.querySelectorAll(".mci__reel video").forEach(v => rio.observe(v));
}

/* --------------------------------------------------------------- Careers */
(() => {
  const list = document.querySelector(".jobs");
  if (!list) return;
  const jobs = [...list.querySelectorAll(".job")], q = document.getElementById("job-q"), openOnly = document.getElementById("job-open");
  const chips = [...document.querySelectorAll(".job-chips .chip")], count = document.querySelector(".job-count"), empty = document.querySelector(".job-empty");
  let dept = "All";
  const run = () => {
    const term = q.value.trim().toLowerCase(); let n = 0;
    jobs.forEach(j => {
      const show = (dept === "All" || j.dataset.dept === dept) && (!openOnly.checked || j.dataset.status === "open") && (!term || j.dataset.text.includes(term));
      j.hidden = !show; if (show) n++;
    });
    count.textContent = `Showing ${n} of ${jobs.length} roles`; empty.hidden = n > 0;
  };
  chips.forEach(c => c.addEventListener("click", () => { dept = c.dataset.dept; chips.forEach(x => x.classList.toggle("on", x === c)); run(); }));
  q.addEventListener("input", run); openOnly.addEventListener("change", run); run();

  // "Apply" buttons pre-select the role
  const role = document.getElementById("ap-role");
  document.querySelectorAll("[data-role]").forEach(b => b.addEventListener("click", () => {
    const t = b.dataset.role.replace(/&amp;/g, "&");
    const opt = [...role.options].find(o => t.toLowerCase().startsWith(o.text.toLowerCase().split(" /")[0].toLowerCase()) || o.text.toLowerCase().startsWith(t.toLowerCase().split(" /")[0]));
    role.value = opt ? opt.text : "Other";
  }));

  // Application form.
  // To receive CVs directly, set CAREERS_ENDPOINT to a form service URL (e.g. a Formspree form) that accepts file uploads.
  // Until then, the form opens a ready-made email / WhatsApp message and asks the applicant to attach the CV.
  const CAREERS_ENDPOINT = "";
  const HR_EMAIL = "hr@ahscollege.ac.in", HR_WA = "919155358800";
  const form = document.getElementById("apply-form"), err = form.querySelector(".form-error"), done = form.querySelector(".apply-done");
  const cv = document.getElementById("ap-cv"), drop = form.querySelector(".cv-drop"), ui = form.querySelector(".cv-drop__ui b");
  cv.addEventListener("change", () => { const f = cv.files[0]; drop.classList.toggle("has-file", !!f); ui.textContent = f ? "✓ " + f.name : "📄 Choose your CV"; });
  form.addEventListener("submit", async e => {
    e.preventDefault(); err.hidden = true;
    const bad = [...form.querySelectorAll("[required]")].find(i => i.type === "checkbox" ? !i.checked : !i.checkValidity());
    const f = cv.files[0];
    let msg = bad ? (bad.type === "checkbox" ? "Please tick the confirmation box." : bad.type === "file" ? "Please choose your CV file." : `Please check “${bad.closest("label").childNodes[0].textContent.replace("*", "").trim()}”.`) : "";
    if (!msg && f && f.size > 5 * 1024 * 1024) msg = "Your CV is larger than 5 MB. Please upload a smaller PDF.";
    if (!msg && f && !/\.(pdf|docx?)$/i.test(f.name)) msg = "Please upload your CV as a PDF or Word file.";
    if (msg) { err.textContent = msg; err.hidden = false; bad && bad.focus(); return; }
    const data = new FormData(form);
    const lines = ["Job application — " + data.get("Role"), ...["Name", "Phone", "Email", "City", "Qualification", "Experience", "Registration no.", "Message"]
      .filter(k => data.get(k)).map(k => `${k}: ${data.get(k)}${k === "Experience" ? " years" : ""}`)];
    if (CAREERS_ENDPOINT) {
      try {
        const r = await fetch(CAREERS_ENDPOINT, { method: "POST", body: data, headers: { Accept: "application/json" } });
        if (!r.ok) throw new Error();
        done.innerHTML = `<h3>Application received</h3><p>Thank you, ${data.get("Name")}. Our HR team will contact you on ${data.get("Phone")} if you are shortlisted.</p>`;
        done.hidden = false; form.querySelector("button[type=submit]").hidden = true; return;
      } catch { err.textContent = "We couldn't send your application. Please try again, or email your CV to " + HR_EMAIL + "."; err.hidden = false; return; }
    }
    const subject = encodeURIComponent(`Application: ${data.get("Role")} — ${data.get("Name")}`);
    const body = encodeURIComponent(lines.join("\n") + "\n\n(CV attached)");
    done.innerHTML = `<h3>One last step: send it with your CV</h3>
      <p>Your details are ready. Open the email below, <b>attach your CV (${f.name})</b> and press send. If the button doesn't open your email app, send your CV to <b>${HR_EMAIL}</b>.</p>
      <div class="btn-row"><a class="btn" href="mailto:${HR_EMAIL}?subject=${subject}&body=${body}">Open email →</a>
      <a class="btn btn--ghost" href="https://wa.me/${HR_WA}?text=${encodeURIComponent(lines.join("\n"))}" target="_blank" rel="noopener">Send on WhatsApp</a></div>`;
    done.hidden = false;
  });
})();

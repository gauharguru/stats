/* AHS Nursing College — shared header, news ticker, footer and interactions.
   Edit SITE / NAV / NEWS below to update every page at once. */

const SITE = {
  name: "AHS Nursing College",
  full: "AHS Nursing College & Hospital",
  trust: "Sir Syed Educational & Charitable Trust",
  address: "AHS Building, Jail Chowk, Tajpur Road, Samastipur, Bihar – 848129",
  email: "info@ahscollege.ac.in",
  phones: ["+91 91553 58800", "+91 92414 88588"],
  whatsapp: "919155358800",
  support: "+91 82696 31621",      // Student Support Centre (call / WhatsApp)
  applyUrl: "admission.html#apply",
  // TODO: replace "#" with the college's real social profile URLs
  social: { facebook: "#", twitter: "#", google: "#", instagram: "#", linkedin: "#" },
  // TODO: confirm these official URLs before going live
  external: [
    ["Indian Nursing Council (INC)", "https://www.indiannursingcouncil.org/"],
    ["Bihar Nurses Registration Council (BNRC)", "https://bnrc.bihar.gov.in/"],
    ["Bihar University of Health Sciences (BUHS)", "https://buhs.ac.in/"],
    ["AISHE (Ministry of Education)", "https://aishe.gov.in/"],
    ["BSCC Loan Portal", "https://www.7nishchay-yuvaupmission.bihar.gov.in/"],
  ],
};

const NAV = [
  { label: "About Us", items: [
    { href: "about.html", title: "About College", desc: "Our story, trust and mission" },
    { href: "contact.html", title: "Contact Details", desc: "Address, phone and map" },
    { href: "affiliation.html", title: "Affiliation Disclosure", desc: "Approvals and recognition" },
    { href: "affiliation-inc.html", title: "INC", sub: true },
    { href: "affiliation-bnrc.html", title: "BNRC", sub: true },
    { href: "anti-ragging.html", title: "Anti-Ragging", desc: "Zero tolerance policy and helpline" },
    { href: "careers.html", title: "Careers", desc: "Join our team — Nursing Tutors wanted" },
  ]},
  { label: "Academics", items: [
    { href: "courses.html", title: "Courses", desc: "Compare ANM, GNM and B.Sc Nursing" },
    { href: "course-anm.html", title: "ANM", desc: "2-year diploma for girls", sub: true },
    { href: "course-gnm.html", title: "GNM", desc: "3-year diploma", sub: true },
    { href: "course-bsc-nursing.html", title: "B.Sc Nursing", desc: "4-year degree", sub: true },
    { href: "faculty.html", title: "Faculty", desc: "Meet our teachers" },
    { href: "exam-calendar.html", title: "Exam Calendar", desc: "Upcoming examinations" },
    { href: "academic-calendar.html", title: "Academic Calendar", desc: "Session dates and holidays" },
    { href: "placement.html", title: "Placement", desc: "Careers after nursing" },
  ]},
  { label: "Gallery", items: [
    { href: "gallery-buildings.html", title: "Academic Buildings", desc: "Photographs of our campus" },
    { href: "gallery-labs-libraries.html", title: "Labs & Libraries", desc: "Where skills are built" },
  ]},
  { label: "Trainings", items: [
    { href: "gallery-hospital.html", title: "Hospital Training", desc: "Live training at our 100-bed AHS Global Hospital" },
    { href: "training-hospitals.html", title: "Training Hospitals", desc: "Our hospital and government affiliated hospitals" },
    { href: "training-clinical.html", title: "Clinical Case Presentations", desc: "Bedside learning with our doctors" },
    { href: "training-mass-casualty.html", title: "Mass Casualty Training", desc: "Emergency trauma camp" },
    { href: "training-fire.html", title: "Fire & Safety Training", desc: "With the Bihar Fire Service" },
    { href: "gallery-events.html", title: "Events & Functions", desc: "Awards, visits and celebrations" },
  ]},
  { label: "Testimonials", items: [
    { href: "testimonials-students.html", title: "Student Testimonials" },
    { href: "testimonials-faculty.html", title: "Faculty Testimonials" },
    { href: "testimonials-visitors.html", title: "Visitors Testimonials" },
  ]},
  { label: "Admission", items: [
    { href: "admission.html", title: "How to Apply", desc: "Entrance, forms and last dates" },
    { href: "eligibility.html", title: "Eligibility Check", desc: "See which course you qualify for" },
    { href: "admission-bscc.html", title: "BSCC", desc: "Student Credit Card, scholarships and loans" },
    { href: "fee-structure.html", title: "Fee Structure", desc: "Course-wise fees" },
  ]},
  { label: "News", href: "news.html" },
];

// Shown in the scrolling ticker and on news.html (sorted newest first automatically).
const NEWS = [
  { date: "2026-06", tag: "Training", title: "Mass casualty training camp on campus, led by Dr Kamran ul Haque (Emergency Medicine, Max Hospital, Delhi)" },
  { date: "2026-09-26", tag: "Clinical", title: "Clinical case presentation on fracture at AHS Global Hospital by Dr. Rashid and the healthcare team" },
  { date: "2026-04-01", tag: "Award", title: "🏆 Awarded by the Government of Bihar at Urja Bhavan, Patna — Best Mentee Nursing College of Bihar, and for taking INC affiliation" },
  { date: "2025-08-15", tag: "Event", title: "Inter-team Rangoli Competition held on Independence Day" },
  { date: "2024-12-01", tag: "Event", title: "Hon’ble Chancellor Ahmad Ashfaque Karim, MP (Rajya Sabha), visits AHS Nursing College & Hospital" },
  { date: "2024-09-06", tag: "Event", title: "National Nutrition Week celebrated with a healthy-food exhibition" },
  { date: "2026-10-01", tag: "Admission", title: "Admissions open for ANM, GNM and B.Sc Nursing — session 2026-27" },
  { date: "2026-10-01", tag: "Notice", title: "Last date to submit the completed application form: 30 October" },
  { date: "2026-10-01", tag: "Notice", title: "Bihar Student Credit Card scheme applicable for B.Sc Nursing and GNM" },
  { date: "2026-10-01", tag: "Notice", title: "Student Support Centre: call or WhatsApp +91 82696 31621" },
  { date: "2026-10-01", tag: "Notice", title: "Anti-Ragging helpline: 85880 96568 · antiragging@ahscollege.ac.in" },
];
NEWS.sort((a, b) => b.date.localeCompare(a.date));

const ICONS = {
  facebook: '<path d="M14 8V6c0-.9.6-1 1-1h2V2h-3c-3 0-4 2-4 4v2H8v3h2v11h4V11h3l.5-3H14z"/>',
  twitter: '<path d="M22 5.9c-.7.3-1.5.6-2.4.7.9-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1-1.6-1.7-4.4-1.6-6 .1-.8.9-1.2 2.1-1 3.3-3.3-.2-6.4-1.7-8.5-4.3-1.1 1.9-.5 4.3 1.3 5.5-.6 0-1.3-.2-1.8-.5 0 2 1.4 3.7 3.3 4.1-.6.2-1.3.2-1.9.1.5 1.7 2.1 2.9 3.9 2.9-1.7 1.3-3.8 2-6 2H1c2 1.2 4.2 1.9 6.5 1.9 7.8 0 12.3-6.6 12.1-12.7.9-.6 1.6-1.4 2.2-2.3z"/>',
  google: '<path d="M21.6 10.2H12v3.9h5.5c-.5 2.5-2.7 3.9-5.5 3.9a6 6 0 1 1 3.9-10.6l2.9-2.8A10 10 0 1 0 12 22c5.8 0 9.8-4.1 9.8-9.8 0-.7-.1-1.4-.2-2z"/>',
  instagram: '<path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zM12 2c-2.7 0-3 0-4.1.1C4.4 2.2 2.2 4.4 2.1 7.9 2 9 2 9.3 2 12s0 3 .1 4.1c.1 3.5 2.3 5.7 5.8 5.8 1.1.1 1.4.1 4.1.1s3 0 4.1-.1c3.5-.1 5.7-2.3 5.8-5.8.1-1.1.1-1.4.1-4.1s0-3-.1-4.1c-.1-3.5-2.3-5.7-5.8-5.8C15 2 14.7 2 12 2zm0 1.8c2.7 0 3 0 4 .1 2.6.1 3.9 1.4 4 4 .1 1 .1 1.3.1 4s0 3-.1 4c-.1 2.6-1.4 3.9-4 4-1 .1-1.3.1-4 .1s-3 0-4-.1c-2.6-.1-3.9-1.4-4-4-.1-1-.1-1.3-.1-4s0-3 .1-4c.1-2.6 1.4-3.9 4-4 1-.1 1.3-.1 4-.1z"/>',
  linkedin: '<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3V9.5zm6.5 0h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.2c0-1.2 0-2.9-1.8-2.9s-2 1.4-2 2.8V21h-4V9.5z"/>',
  phone: '<path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/>',
  whatsapp: '<path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1l-.9 1.2c-.2.2-.3.2-.6.1-1.6-.8-2.7-1.5-3.8-3.3-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.6.7.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.2-.6-.4zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/>',
  pin: '<path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/>',
  mail: '<path d="M20 4H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>',
};
const svg = (name, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

// College logo (assets/img/logo.png, taken from the brochure).
const LOGO = `<img class="brand__logo" src="assets/img/logo.png" alt="" width="34" height="40">`;

const current = location.pathname.split("/").pop() || "index.html";

function renderHeader() {
  const nav = NAV.map((group, i) => {
    if (group.href) {
      return `<div class="nav__item"><a class="nav__btn" href="${group.href}">${group.label}</a></div>`;
    }
    const links = group.items.map(it =>
      `<a href="${it.href}" class="${it.sub ? "sub" : ""}"${it.href === current ? ' aria-current="page"' : ""}>
        <strong>${it.title}</strong>${it.desc ? `<span>${it.desc}</span>` : ""}</a>`).join("");
    return `<div class="nav__item">
      <button class="nav__btn" aria-expanded="false" aria-controls="mega-${i}">${group.label} ▾</button>
      <div class="mega" id="mega-${i}">${links}</div></div>`;
  }).join("");

  const tickerItems = NEWS.map(n => `<a href="news.html">● ${n.title}</a>`).join("");
  document.getElementById("site-header").outerHTML = `
    <div class="ticker" role="region" aria-label="Latest news">
      <div class="container">
        <span class="ticker__label">Notifications</span>
        <div class="ticker__track"><div class="ticker__items">${tickerItems}${tickerItems}</div></div>
      </div>
    </div>
    <header class="header">
      <div class="container">
        <a class="brand" href="index.html">${LOGO}<span>AHS Nursing College<small>& Hospital, Samastipur</small></span></a>
        <nav class="nav" aria-label="Main">${nav}</nav>
        <div class="header__cta">
          <a class="btn btn--ghost" href="contact.html">Contact</a>
          <a class="btn btn--accent" href="${SITE.applyUrl}">Apply now</a>
        </div>
        <button class="menu-toggle" aria-label="Open menu" aria-expanded="false">☰</button>
      </div>
    </header>`;
}

function renderFooter() {
  const col = (title, links) => `<div><h4>${title}</h4><ul>${links.map(([t, h, ext]) =>
    `<li><a href="${h}"${ext ? ' target="_blank" rel="noopener"' : ""}>${t}</a></li>`).join("")}</ul></div>`;
  const social = Object.entries(SITE.social).map(([k, h]) =>
    `<a href="${h}" aria-label="${k}" target="_blank" rel="noopener">${svg(k)}</a>`).join("");

  document.getElementById("site-footer").outerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer__cta">
          <h2>Your nursing career <em>starts in Samastipur.</em></h2>
          <div class="btn-row">
            <a class="btn btn--light" href="${SITE.applyUrl}">Apply online</a>
            <a class="btn btn--outline-light" href="assets/brochure.pdf">Download brochure</a>
          </div>
        </div>
        <div class="footer__top">
          <div>
            <a class="brand" href="index.html">${LOGO}<span>AHS Nursing College<small style="color:#9a9a9a">& Hospital</small></span></a>
            <p class="footer__about">An educational unit of ${SITE.trust} (registered under the Society Registration Act 1920).
              Affiliated to INC, BUHS and BNRC, and recognised by the Government of Bihar.</p>
            <div class="socials">${social}</div>
          </div>
          ${col("Useful links", [
            ["Apply Online", SITE.applyUrl], ["Eligibility Check", "eligibility.html"], ["Fee Structure", "fee-structure.html"], ["Scholarship", "admission-bscc.html#scholarships"],
            ["Download Brochure", "assets/brochure.pdf"], ["Testimonials", "testimonials-students.html"],
            ["Our Campus", "gallery-buildings.html"], ["Trainings", "gallery-hospital.html"], ["Careers — we’re hiring", "careers.html"]])}
          ${col("Academics", [
            ["ANM", "course-anm.html"], ["GNM", "course-gnm.html"], ["B.Sc Nursing", "course-bsc-nursing.html"],
            ["Faculty", "faculty.html"], ["Exam Calendar", "exam-calendar.html"], ["Academic Calendar", "academic-calendar.html"]])}
          ${col("External links", SITE.external.map(([t, h]) => [t, h, true]))}
          <div><h4>Contact</h4><ul class="footer__contact">
            <li>${svg("pin", "ic")}<span>${SITE.address}</span></li>
            <li>${svg("mail", "ic")}<a href="mailto:${SITE.email}">${SITE.email}</a></li>
            <li>${svg("phone", "ic")}<span>${SITE.phones.map(p => `<a href="tel:${p.replace(/\s/g, "")}">${p}</a>`).join("<br>")}</span></li>
            <li>${svg("whatsapp", "ic")}<a href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener">WhatsApp us</a></li>
          </ul></div>
        </div>
        <div class="footer__bottom">
          <span>© ${new Date().getFullYear()} ${SITE.full}. All rights reserved.</span>
          <span><a href="affiliation.html">Affiliation Disclosure</a> · <a href="anti-ragging.html">Anti-Ragging</a> · <a href="contact.html">Contact</a></span>
        </div>
      </div>
    </footer>
    <div class="fab">
      <a class="fab--call" href="tel:${SITE.phones[0].replace(/\s/g, "")}" aria-label="Call the college">${svg("phone")}</a>
      <a class="fab--wa" href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">${svg("whatsapp")}</a>
    </div>`;
}

function renderNewsList() {
  const el = document.getElementById("news-list");
  if (!el) return;
  // "YYYY-MM-DD" shows the full date; "YYYY-MM" (day not known) shows month and year only
  const fmt = d => new Date(d + (d.length === 7 ? "-01" : "")).toLocaleDateString("en-IN", d.length === 7 ? { month: "short", year: "numeric" } : { day: "numeric", month: "short", year: "numeric" });
  el.innerHTML = NEWS.map(n => `<div class="news-item">
    <time datetime="${n.date}">${fmt(n.date)}</time><h3>${n.title}</h3>
    <span class="badge${n.tag === "Admission" || n.tag === "Award" ? " badge--warm" : ""}">${n.tag}</span></div>`).join("");
}

function wireInteractions() {
  const header = document.querySelector(".header");
  const items = document.querySelectorAll(".nav__item");
  const closeAll = except => items.forEach(it => {
    if (it !== except) { it.classList.remove("open"); it.querySelector("button")?.setAttribute("aria-expanded", "false"); }
  });
  items.forEach(it => {
    const btn = it.querySelector("button");
    if (!btn) return;
    const hover = matchMedia("(hover: hover) and (min-width: 1101px)").matches;
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const open = hover || !it.classList.contains("open");
      closeAll(it);
      it.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
    if (hover) {
      let t;
      it.addEventListener("mouseenter", () => { clearTimeout(t); closeAll(it); it.classList.add("open"); });
      it.addEventListener("mouseleave", () => { t = setTimeout(() => it.classList.remove("open"), 250); });
    }
  });
  document.addEventListener("click", () => closeAll());
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeAll(); });

  const toggle = document.querySelector(".menu-toggle");
  toggle.addEventListener("click", () => {
    const open = header.classList.toggle("mobile-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "✕" : "☰";
  });

  const io = "IntersectionObserver" in window && new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(el => io ? io.observe(el) : el.classList.add("in"));
}

renderHeader();
renderFooter();
renderNewsList();
wireInteractions();

// Enquiry forms open WhatsApp with the filled-in details.
document.querySelectorAll("form[data-wa]").forEach(form => form.addEventListener("submit", e => {
  e.preventDefault();
  const lines = [form.dataset.wa, ...[...new FormData(form)].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)];
  window.open(`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
}));

// Rotating headline words: <span class="rotator"><span class="on">a</span><span>b</span></span>
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
document.querySelectorAll(".rotator").forEach(r => {
  const words = [...r.children];
  if (reduceMotion || words.length < 2) return;
  let i = 0;
  setInterval(() => {
    words[i].classList.remove("on");
    i = (i + 1) % words.length;
    words[i].classList.add("on");
  }, 2400);
});

// Count numbers up when they scroll into view, e.g. <b data-count="180">180</b>
const countUp = el => {
  const target = parseInt(el.dataset.count, 10), suffix = el.dataset.suffix || "";
  if (reduceMotion || !target) return;
  const start = performance.now(), dur = 1400;
  const step = now => {
    const t = Math.min(1, (now - start) / dur), eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(target * eased) + suffix;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
const counters = document.querySelectorAll("[data-count]");
if ("IntersectionObserver" in window) {
  const co = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { countUp(en.target); co.unobserve(en.target); }
  }), { threshold: 0.6 });
  counters.forEach(el => co.observe(el));
}

// Live ECG monitor: a sweeping heartbeat trace with beats of varying size.
// Markup: <div class="monitor"><canvas class="ecg-live" data-color="#ffd23f"></canvas><span class="bpm">♥ <b>78</b> BPM</span></div>
document.querySelectorAll(".ecg-live").forEach(canvas => {
  const ctx = canvas.getContext("2d");
  const color = canvas.dataset.color || "#ffd23f";
  const monitor = canvas.closest(".monitor");
  const bpmEl = monitor && monitor.querySelector(".bpm b");
  const speed = 2.2;                 // pixels per frame
  let w = 0, h = 0, dpr = 1, buf = [], head = 0, visible = true;

  // One heartbeat (P, Q, R, S, T waves) as a sum of bumps; phase runs 0..1
  const bump = (x, mu, sd) => Math.exp(-((x - mu) ** 2) / (2 * sd * sd));
  const wave = p => 0.1 * bump(p, .15, .03) - .14 * bump(p, .31, .012) + bump(p, .345, .013)
                  - .32 * bump(p, .38, .013) + .22 * bump(p, .62, .05);

  let beatLen = 90, beatPos = 0, amp = .8;
  const nextBeat = () => {
    beatLen = 70 + Math.random() * 60;                       // spacing varies
    amp = Math.random() < .25 ? 1 + Math.random() * .2       // sometimes a big beat
        : Math.random() < .35 ? .35 + Math.random() * .2      // sometimes a small one
        : .6 + Math.random() * .25;
    if (bpmEl) bpmEl.textContent = Math.round(64 + (130 - beatLen) * .55 + Math.random() * 4);
  };
  const sample = () => {
    const p = beatPos / beatLen;
    const y = amp * wave(p) + (Math.random() - .5) * .025;
    if (monitor && p > .33 && p < .345 + speed / beatLen) monitor.classList.add("beat");
    if (monitor && p > .5) monitor.classList.remove("beat");
    beatPos += speed;
    if (beatPos >= beatLen) { beatPos = 0; nextBeat(); }
    return y;
  };

  const resize = () => {
    dpr = window.devicePixelRatio || 1;
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buf = new Array(Math.ceil(w)).fill(null);
    for (let x = 0; x < buf.length; x++) buf[x] = sample();   // start with a full trace
    head = 0;
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    const mid = h * .62, scale = h * .55, gap = 26;
    ctx.lineWidth = 2.6; ctx.lineJoin = ctx.lineCap = "round";
    ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8;
    ctx.beginPath();
    let pen = false;
    for (let x = 0; x < buf.length; x++) {
      const ahead = (x - head + buf.length) % buf.length;
      if (buf[x] === null || (ahead > 0 && ahead < gap)) { pen = false; continue; }
      const y = mid - buf[x] * scale;
      pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      pen = true;
    }
    ctx.stroke();
    const hy = buf[(head - 1 + buf.length) % buf.length];
    if (hy !== null) {                                       // glowing dot at the sweep head
      ctx.shadowBlur = 16; ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(head, mid - hy * scale, 3.6, 0, Math.PI * 2); ctx.fill();
    }
  };

  const tick = () => {
    if (visible && w) {
      for (let i = 0; i < speed; i++) { buf[head] = sample(); head = (head + 1) % buf.length; }
      draw();
    }
    requestAnimationFrame(tick);
  };

  resize();
  window.addEventListener("resize", resize);
  if ("IntersectionObserver" in window) new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(canvas);
  if (reduceMotion) {                                         // static trace, no animation
    for (let x = 0; x < buf.length; x++) buf[x] = sample();
    head = buf.length - 1; draw();
  } else {
    nextBeat(); tick();
  }
});

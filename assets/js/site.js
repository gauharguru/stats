/* AHS Nursing College — shared header, news ticker, footer and interactions.
   Edit SITE / NAV / NEWS below to update every page at once. */

const SITE = {
  name: "AHS Nursing College",
  full: "AHS Nursing College & Hospital",
  trust: "Sir Syed Educational Trust",
  address: "AHS Building, Jail Chowk, Tajpur Road, Samastipur, Bihar – 848129",
  email: "info@ahscollege.com",
  phones: ["+91 91553 58800", "+91 92414 88588"],
  whatsapp: "919155358800",
  applyUrl: "admission-bscc.html#apply",
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
  ]},
  { label: "Academics", items: [
    { href: "courses.html", title: "Courses", desc: "ANM, GNM and B.Sc Nursing" },
    { href: "course-anm.html", title: "ANM", sub: true },
    { href: "course-gnm.html", title: "GNM", sub: true },
    { href: "course-bsc-nursing.html", title: "B.Sc Nursing", sub: true },
    { href: "faculty.html", title: "Faculty", desc: "Meet our teachers" },
    { href: "exam-calendar.html", title: "Exam Calendar", desc: "Upcoming examinations" },
    { href: "academic-calendar.html", title: "Academic Calendar", desc: "Session dates and holidays" },
    { href: "placement.html", title: "Placement", desc: "Careers after nursing" },
  ]},
  { label: "Gallery", items: [
    { href: "gallery-buildings.html", title: "Academic Buildings", desc: "Photographs of our campus" },
    { href: "gallery-labs-libraries.html", title: "Labs & Libraries", desc: "Where skills are built" },
  ]},
  { label: "Testimonials", items: [
    { href: "testimonials-students.html", title: "Student Testimonials" },
    { href: "testimonials-faculty.html", title: "Faculty Testimonials" },
    { href: "testimonials-visitors.html", title: "Visitors Testimonials" },
  ]},
  { label: "Admission", items: [
    { href: "admission-bscc.html", title: "BSCC", desc: "Bihar Student Credit Card loan" },
    { href: "fee-structure.html", title: "Fee Structure", desc: "Course-wise fees" },
  ]},
  { label: "News", href: "news.html" },
];

// Shown in the scrolling ticker and on news.html. Newest first.
const NEWS = [
  { date: "2026-10-01", tag: "Admission", title: "Admissions open for ANM, GNM and B.Sc Nursing — session 2026-27" },
  { date: "2026-09-20", tag: "Notice", title: "BSCC loan help desk now open at the college office" },
  { date: "2026-09-10", tag: "Exam", title: "Internal assessment schedule released — see Exam Calendar" },
  { date: "2026-08-28", tag: "Event", title: "Free health check-up camp organised by our students" },
  { date: "2026-08-15", tag: "Event", title: "Independence Day celebrated on campus" },
];

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

// Shield + cross mark, drawn after the AHS logo. Swap for <img src="assets/img/logo.png"> if preferred.
const LOGO = `<svg class="brand__logo" viewBox="0 0 40 44" aria-hidden="true">
  <path d="M20 2 4 7v13c0 10 7 18 16 22 9-4 16-12 16-22V7L20 2z" fill="none" stroke="#0b8a57" stroke-width="3"/>
  <path d="M16 11h8v7h7v8h-7v7h-8v-7H9v-8h7z" fill="#0b8a57"/></svg>`;

const current = location.pathname.split("/").pop() || "index.html";

function renderHeader() {
  const nav = NAV.map((group, i) => {
    if (group.href) {
      return `<div class="nav__item"><a class="nav__btn" href="${group.href}">${group.label}</a></div>`;
    }
    const links = group.items.map(it =>
      `<a href="${it.href}" class="${it.sub ? "sub" : ""}"${it.href === current ? ' aria-current="page"' : ""}>
        <strong>${it.sub ? "↳ " : ""}${it.title}</strong>${it.desc ? `<span>${it.desc}</span>` : ""}</a>`).join("");
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
          <h2>Your nursing career starts in Samastipur.</h2>
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
            ["Apply Online", SITE.applyUrl], ["Fee Structure", "fee-structure.html"], ["Scholarship", "admission-bscc.html"],
            ["Download Brochure", "assets/brochure.pdf"], ["Testimonials", "testimonials-students.html"],
            ["Our Campus", "gallery-buildings.html"], ["Career", "placement.html"]])}
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
  const fmt = d => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  el.innerHTML = NEWS.map(n => `<div class="news-item">
    <time datetime="${n.date}">${fmt(n.date)}</time><h3>${n.title}</h3>
    <span class="badge${n.tag === "Event" ? " badge--warm" : ""}">${n.tag}</span></div>`).join("");
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
    const hover = matchMedia("(hover: hover) and (min-width: 1081px)").matches;
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const open = hover || !it.classList.contains("open");
      closeAll(it);
      it.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
    if (hover) {
      it.addEventListener("mouseenter", () => { closeAll(it); it.classList.add("open"); });
      it.addEventListener("mouseleave", () => it.classList.remove("open"));
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

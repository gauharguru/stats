/* Shared site settings — edit these once and every page updates. */
const SITE = {
  name: "Your Nursing College",
  tagline: "Institute of Nursing & Paramedical Sciences",
  address: "College Road, District, State – 000000",
  phone: "+91 00000 00000",
  email: "info@yourcollege.edu.in",
  affiliation: "Affiliated to [University / Nursing Council] · Recognised by INC",
  // News & notifications shown in the scrolling ticker and on news.html
  news: [
    { date: "2026-10-05", text: "Admissions open for B.Sc Nursing, GNM and ANM – Session 2026-27", link: "admission.html" },
    { date: "2026-09-28", text: "GNM 1st year exam schedule released", link: "exam-calendar.html" },
    { date: "2026-09-20", text: "BSCC (Bihar Student Credit Card) applications accepted at the college office", link: "admission.html#bscc" },
    { date: "2026-09-10", text: "Campus placement drive with partner hospitals – register by 30 Oct", link: "placement.html" }
  ]
};

const MENU = [
  { label: "Home", href: "index.html" },
  { label: "About Us", href: "about.html", children: [
    { label: "About College", href: "about.html#about" },
    { label: "Contact Details", href: "about.html#contact" },
    { label: "Affiliation Disclosure", href: "about.html#affiliation" }
  ]},
  { label: "Academics", href: "courses.html", children: [
    { label: "Courses (ANM, GNM, B.Sc)", href: "courses.html" },
    { label: "Faculty", href: "faculty.html" },
    { label: "Exam Calendar", href: "exam-calendar.html" },
    { label: "Academic Calendar", href: "academic-calendar.html" },
    { label: "Placement", href: "placement.html" }
  ]},
  { label: "Gallery", href: "gallery.html", children: [
    { label: "Academics", href: "gallery.html#academics" },
    { label: "Buildings", href: "gallery.html#buildings" },
    { label: "Labs & Libraries", href: "gallery.html#labs" }
  ]},
  { label: "Testimonials", href: "testimonials.html", children: [
    { label: "Student Testimonials", href: "testimonials.html#students" },
    { label: "Faculty Testimonials", href: "testimonials.html#faculty" },
    { label: "Visitors Testimonials", href: "testimonials.html#visitors" }
  ]},
  { label: "Admission", href: "admission.html", children: [
    { label: "BSCC", href: "admission.html#bscc" },
    { label: "Fee Structure", href: "admission.html#fees" }
  ]},
  { label: "News", href: "news.html" }
];

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function fmtDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function renderHeader() {
  const page = location.pathname.split("/").pop() || "index.html";
  const items = MENU.map(m => {
    const active = m.href === page || (m.children || []).some(c => c.href.split("#")[0] === page);
    const sub = m.children
      ? `<button class="sub-toggle" aria-label="Open ${esc(m.label)} menu" aria-expanded="false">▾</button>
         <ul class="submenu">${m.children.map(c => `<li><a href="${c.href}">${esc(c.label)}</a></li>`).join("")}</ul>`
      : "";
    return `<li class="${m.children ? "has-sub" : ""}${active ? " active" : ""}"><a href="${m.href}">${esc(m.label)}</a>${sub}</li>`;
  }).join("");

  const ticker = SITE.news.map(n =>
    `<a href="${n.link || "news.html"}"><span class="tick-date">${fmtDate(n.date)}</span> ${esc(n.text)}</a>`).join("");

  document.getElementById("site-header").innerHTML = `
    <div class="topbar"><div class="wrap">
      <span>📞 ${esc(SITE.phone)}</span><span>✉ ${esc(SITE.email)}</span>
    </div></div>
    <div class="brand"><div class="wrap">
      <a href="index.html" class="logo" aria-label="Home"><span class="logo-mark">✚</span></a>
      <div><div class="brand-name">${esc(SITE.name)}</div><div class="brand-tag">${esc(SITE.tagline)}</div></div>
    </div></div>
    <nav class="nav"><div class="wrap">
      <button class="nav-toggle" aria-label="Menu" aria-expanded="false">☰ Menu</button>
      <ul class="menu">${items}</ul>
    </div></nav>
    <div class="ticker"><div class="wrap">
      <span class="ticker-label">News &amp; Notifications</span>
      <div class="ticker-track"><div class="ticker-inner">${ticker}${ticker}</div></div>
    </div></div>`;

  const nav = document.querySelector(".nav");
  nav.querySelector(".nav-toggle").addEventListener("click", e => {
    const open = nav.classList.toggle("open");
    e.currentTarget.setAttribute("aria-expanded", open);
  });
  nav.querySelectorAll(".sub-toggle").forEach(btn => btn.addEventListener("click", () => {
    const li = btn.parentElement;
    const open = li.classList.toggle("open");
    btn.setAttribute("aria-expanded", open);
  }));
}

function renderFooter() {
  document.getElementById("site-footer").innerHTML = `
    <div class="wrap footer-grid">
      <div><h4>${esc(SITE.name)}</h4><p>${esc(SITE.address)}</p><p>${esc(SITE.affiliation)}</p></div>
      <div><h4>Quick Links</h4><ul>
        <li><a href="courses.html">Courses</a></li><li><a href="admission.html">Admission</a></li>
        <li><a href="admission.html#fees">Fee Structure</a></li><li><a href="about.html#affiliation">Affiliation Disclosure</a></li>
      </ul></div>
      <div><h4>Contact</h4><p>📞 ${esc(SITE.phone)}</p><p>✉ ${esc(SITE.email)}</p></div>
    </div>
    <div class="copy">© ${new Date().getFullYear()} ${esc(SITE.name)}. All rights reserved.</div>`;
}

function renderNewsList(el) {
  el.innerHTML = [...SITE.news].sort((a, b) => b.date.localeCompare(a.date)).map(n =>
    `<li><span class="date">${fmtDate(n.date)}</span><a href="${n.link || "#"}">${esc(n.text)}</a></li>`).join("");
}

/* Simple tab component: buttons[data-tab] toggle panels[id]; syncs with URL hash. */
function initTabs(root) {
  const btns = root.querySelectorAll("[data-tab]");
  const show = id => btns.forEach(b => {
    const on = b.dataset.tab === id;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on);
    document.getElementById(b.dataset.tab).hidden = !on;
  });
  btns.forEach(b => b.addEventListener("click", () => { history.replaceState(null, "", "#" + b.dataset.tab); show(b.dataset.tab); }));
  const pick = () => { const h = location.hash.slice(1); show([...btns].some(b => b.dataset.tab === h) ? h : btns[0].dataset.tab); };
  window.addEventListener("hashchange", pick);
  pick();
}

document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderFooter();
  document.querySelectorAll("[data-news-list]").forEach(renderNewsList);
  document.querySelectorAll("[data-tabs]").forEach(initTabs);
  document.querySelectorAll("[data-site-name]").forEach(e => e.textContent = SITE.name);
});

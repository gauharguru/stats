/* AHS Global Hospital — site behaviour */
(function () {
  "use strict";

  var WA_NUMBER = "919942815500";
  var PHONE = "99428 15500";
  var root = document.documentElement;

  /* ---------- language ---------- */
  function getLang() { return root.getAttribute("data-lang") === "hi" ? "hi" : "en"; }
  function setLang(lang) {
    root.setAttribute("data-lang", lang);
    root.setAttribute("lang", lang === "hi" ? "hi" : "en");
    document.querySelectorAll("[data-set-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-set-lang") === lang));
    });
    var input = document.getElementById("chat-in");
    if (input) input.placeholder = lang === "hi" ? "जैसे: बच्चे को तेज़ बुखार है" : "e.g. My child has high fever";
    try { localStorage.setItem("ahs-lang", lang); } catch (e) {}
    document.dispatchEvent(new CustomEvent("ahs:lang", { detail: lang }));
  }
  var saved = null;
  try { saved = localStorage.getItem("ahs-lang"); } catch (e) {}
  setLang(saved === "hi" ? "hi" : "en");
  document.querySelectorAll("[data-set-lang]").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.getAttribute("data-set-lang")); });
  });
  function t(en, hi) { return getLang() === "hi" ? hi : en; }

  /* ---------- mobile menu ---------- */
  var burger = document.querySelector(".burger");
  var links = document.getElementById("nav-links");
  if (burger && links) {
    burger.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
    });
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) { links.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ---------- reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); ro.unobserve(en.target); } });
    }, { threshold: 0.15 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- portable X-ray story ---------- */
  var story = document.querySelector(".xstory");
  if (story && "IntersectionObserver" in window) {
    var steps = story.querySelectorAll(".steps li");
    var so = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      so.disconnect();
      story.classList.add("go");
      steps.forEach(function (li, i) { setTimeout(function () { li.classList.add("on"); }, 300 + i * 900); });
    }, { threshold: 0.35 });
    so.observe(story);
  }

  /* ---------- departments body map ---------- */
  var depts = document.querySelectorAll(".dept");
  var dots = document.querySelectorAll(".hot circle");
  function lightDept(key) {
    depts.forEach(function (d) { d.classList.toggle("on", d.getAttribute("data-dept") === key); });
    dots.forEach(function (c) { c.classList.toggle("on", c.getAttribute("data-dept") === key); });
  }
  depts.forEach(function (d) {
    d.addEventListener("mouseenter", function () { lightDept(d.getAttribute("data-dept")); });
    d.addEventListener("focus", function () { lightDept(d.getAttribute("data-dept")); });
    d.addEventListener("click", function () {
      openBooking("Appointment / OPD", d.querySelector("b .en").textContent);
    });
  });
  dots.forEach(function (c) {
    c.addEventListener("mouseenter", function () { lightDept(c.getAttribute("data-dept")); });
  });

  /* ---------- booking via WhatsApp ---------- */
  var dlg = document.getElementById("book");
  var form = dlg && dlg.querySelector("form");
  function openBooking(service, note) {
    if (!dlg) return;
    var sel = form.elements.service;
    if (service) {
      var found = Array.prototype.some.call(sel.options, function (o) { return o.value === service; });
      if (!found) sel.add(new Option(service, service));
      sel.value = service;
    }
    form.elements.notes.value = note ? note + " — " : "";
    form.querySelector(".book__err").hidden = true;
    if (typeof dlg.showModal === "function") dlg.showModal(); else waOpen(service || "Appointment");
  }
  function waOpen(text) {
    window.open("https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(text), "_blank", "noopener");
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-book]");
    if (!b) return;
    e.preventDefault();
    openBooking(b.getAttribute("data-book") || "");
  });
  if (form) {
    var min = new Date(); form.elements.date.min = min.toISOString().slice(0, 10);
    form.addEventListener("submit", function (e) {
      var submitter = e.submitter;
      if (submitter && submitter.value === "cancel") return;
      e.preventDefault();
      var f = form.elements;
      var name = f.name.value.trim();
      var phone = f.phone.value.replace(/[^\d+]/g, "");
      if (!name || phone.replace(/\D/g, "").length < 10) { form.querySelector(".book__err").hidden = false; return; }
      var lines = [
        "*Booking request — AHS Global Hospital*",
        "Service: " + f.service.value,
        "Name: " + name,
        "Phone: " + phone
      ];
      if (f.date.value) lines.push("Preferred date: " + f.date.value);
      if (f.notes.value.trim()) lines.push("Notes: " + f.notes.value.trim());
      lines.push("Language: " + (getLang() === "hi" ? "Hindi" : "English"));
      waOpen(lines.join("\n"));
      dlg.close();
    });
  }

  /* ---------- clock helpers (IST) ---------- */
  function istParts() {
    var p = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { day: p.weekday, h: +p.hour % 24, m: +p.minute, text: p.hour + ":" + p.minute };
  }

  /* ---------- live board (admin-editable later) ---------- */
  var BOARD = [
    { ic: "🚑", en: "Emergency & trauma", hi: "इमरजेंसी व ट्रॉमा", sen: "Doctors on duty", shi: "डॉक्टर ड्यूटी पर", open: true },
    { ic: "🫀", en: "ICU · NICU", hi: "ICU · NICU", sen: "Round-the-clock monitoring", shi: "चौबीसों घंटे निगरानी", open: true },
    { ic: "🩻", en: "Portable X-ray", hi: "पोर्टेबल एक्स-रे", sen: "Home & bedside", shi: "घर व बेड पर", open: true },
    { ic: "💊", en: "Pharmacy", hi: "फ़ार्मेसी", sen: "In-hospital, 24×7", shi: "अस्पताल में, 24×7", open: true },
    { ic: "🧪", en: "Pathology lab", hi: "पैथोलॉजी लैब", sen: "Samples 24×7", shi: "सैंपल 24×7", open: true },
    { ic: "🩺", en: "OPD — Dr Kamran ul Haque", hi: "ओपीडी — डॉ कामरान उल हक़", sen: "Mon–Fri · 11:30 AM – 3:00 PM", shi: "सोम–शुक्र · 11:30 – 3:00", opd: { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], from: 690, to: 900 } }
  ];
  var boardEl = document.getElementById("board");
  function renderBoard() {
    if (!boardEl) return;
    var now = istParts(), mins = now.h * 60 + now.m;
    boardEl.innerHTML = "";
    BOARD.forEach(function (row) {
      var open = row.open;
      if (row.opd) open = row.opd.days.indexOf(now.day) > -1 && mins >= row.opd.from && mins < row.opd.to;
      var li = document.createElement("li");
      li.innerHTML = '<span aria-hidden="true">' + row.ic + "</span><span><b></b><small></small></span>" +
        '<span class="st' + (open ? "" : " st--off") + '"></span>';
      li.querySelector("b").textContent = t(row.en, row.hi);
      li.querySelector("small").textContent = t(row.sen, row.shi);
      li.querySelector(".st").textContent = open ? t("OPEN", "खुला") : t("CLOSED NOW", "अभी बंद");
      boardEl.appendChild(li);
    });
    document.querySelectorAll(".board__clock, .screen__clock").forEach(function (c) { c.textContent = now.text + " IST"; });
  }
  renderBoard();
  setInterval(renderBoard, 30000);
  document.addEventListener("ahs:lang", renderBoard);

  /* ---------- Ask AHS (rule-based assistant) ---------- */
  var RULES = [
    { id: "emergency", urgent: true,
      k: ["chest", "heart attack", "unconscious", "not breathing", "breathing difficulty", "can't breathe", "cant breathe", "bleeding", "stroke", "paralysis", "seizure", "fits", "poison", "burn", "snake", "seene", "behosh", "saans", "khoon", "lakwa", "सीने", "छाती में दर्द", "बेहोश", "सांस", "साँस", "खून", "लकवा", "दौरा", "ज़हर", "जहर", "जल गया", "सांप", "साँप"],
      en: "This may be an emergency. Please come to AHS Emergency now or call us — we are open 24×7.",
      hi: "यह इमरजेंसी हो सकती है। कृपया तुरंत AHS इमरजेंसी आएँ या कॉल करें — हम 24×7 खुले हैं।" },
    { id: "accident", urgent: true,
      k: ["accident", "road", "hit by", "bike", "crash", "injury", "injured", "durghatna", "takkar", "दुर्घटना", "एक्सीडेंट", "टक्कर", "चोट"],
      en: "Road accident victims get cashless treatment up to ₹1.5 lakh under PM-RAHAT. Bring the patient straight to AHS Emergency or dial 112.",
      hi: "सड़क दुर्घटना पीड़ितों को PM-RAHAT के तहत ₹1.5 लाख तक कैशलेस इलाज मिलता है। मरीज़ को सीधे AHS इमरजेंसी लाएँ या 112 डायल करें।",
      dept: ["Emergency Medicine", "आपातकालीन चिकित्सा"], service: "Emergency — road accident (PM-RAHAT)" },
    { id: "ayushman",
      k: ["ayushman", "pmjay", "golden card", "free treatment", "scheme", "yojana", "आयुष्मान", "योजना", "मुफ्त", "फ्री"],
      en: "AHS is empanelled under Ayushman Bharat. Covered here: General Surgery, General Medicine, Paediatrics, ENT, Emergency Medicine, Orthopaedics and Neonatal care (NICU). Obstetrics & Gynaecology is not covered under Ayushman at AHS. Bring your Ayushman card or Aadhaar.",
      hi: "AHS आयुष्मान भारत में सूचीबद्ध है। यहाँ शामिल: जनरल सर्जरी, जनरल मेडिसिन, शिशु रोग, ENT, आपातकालीन चिकित्सा, हड्डी रोग और नवजात देखभाल (NICU)। स्त्री एवं प्रसूति रोग AHS में आयुष्मान के अंतर्गत शामिल नहीं है। आयुष्मान कार्ड या आधार साथ लाएँ।",
      service: "Ayushman Bharat enquiry" },
    { id: "child",
      k: ["child", "baby", "newborn", "infant", "kids", "my son", "daughter", "bachcha", "baccha", "shishu", "बच्चा", "बच्चे", "बच्ची", "शिशु", "नवजात"],
      en: "Our Paediatrics & NICU team can help. Covered under Ayushman Bharat at AHS.",
      hi: "हमारी शिशु रोग व NICU टीम मदद करेगी। AHS में आयुष्मान भारत के अंतर्गत शामिल।",
      dept: ["Paediatrics & NICU", "शिशु रोग व NICU"] },
    { id: "pregnancy",
      k: ["pregnan", "labour", "labor pain", "delivery", "period", "gynae", "gyne", "women", "garbh", "prasav", "गर्भ", "प्रसव", "डिलीवरी", "माहवारी", "पीरियड"],
      en: "Our Obstetrics & Gynaecology department can help, with USG in-house. Note: this department is not covered under Ayushman Bharat at AHS.",
      hi: "हमारा स्त्री एवं प्रसूति रोग विभाग मदद करेगा, अल्ट्रासाउंड अस्पताल में ही। ध्यान दें: यह विभाग AHS में आयुष्मान भारत के अंतर्गत शामिल नहीं है।",
      dept: ["Obstetrics & Gynaecology", "स्त्री एवं प्रसूति रोग"] },
    { id: "ortho",
      k: ["bone", "fracture", "joint", "knee", "back pain", "spine", "shoulder", "haddi", "jod", "kamar", "हड्डी", "फ्रैक्चर", "जोड़", "घुटन", "कमर", "पीठ"],
      en: "Orthopaedics is the right department. We also have portable X-ray, even at home. Covered under Ayushman Bharat at AHS.",
      hi: "हड्डी रोग विभाग सही रहेगा। हमारे पास पोर्टेबल एक्स-रे भी है, घर पर भी। AHS में आयुष्मान के अंतर्गत शामिल।",
      dept: ["Orthopaedics", "हड्डी रोग"] },
    { id: "ent",
      k: ["ear", "nose", "throat", "tonsil", "sinus", "hearing", "kaan", "naak", "gala", "कान", "नाक", "गला", "गले", "टॉन्सिल"],
      en: "Our ENT department can help. Covered under Ayushman Bharat at AHS.",
      hi: "हमारा ENT (नाक, कान, गला) विभाग मदद करेगा। AHS में आयुष्मान के अंतर्गत शामिल।",
      dept: ["ENT", "नाक, कान, गला"] },
    { id: "surgery",
      k: ["hernia", "stone", "gall", "appendix", "piles", "operation", "surgery", "lump", "pathri", "बवासीर", "पथरी", "हर्निया", "अपेंडिक्स", "ऑपरेशन", "सर्जरी", "गांठ"],
      en: "General & Laparoscopic Surgery — keyhole surgery with small cuts and faster recovery. Covered under Ayushman Bharat at AHS.",
      hi: "जनरल व लैप्रोस्कोपिक सर्जरी — छोटे चीरे, जल्दी रिकवरी। AHS में आयुष्मान के अंतर्गत शामिल।",
      dept: ["General & Laparoscopic Surgery", "जनरल व लैप्रोस्कोपिक सर्जरी"] },
    { id: "test",
      k: ["test", "blood", "sample", "lab", "report", "x-ray", "xray", "sugar test", "jaanch", "जाँच", "जांच", "टेस्ट", "सैंपल", "एक्स-रे", "खून की जांच"],
      en: "We can collect samples at your home, and our portable X-ray works 24×7 at home or bedside. The pathology lab is open 24×7.",
      hi: "हम घर से सैंपल ले सकते हैं, और हमारा पोर्टेबल एक्स-रे घर या बेड पर 24×7 उपलब्ध है। पैथोलॉजी लैब 24×7 खुली है।",
      service: "Test / X-ray at home" },
    { id: "elder",
      k: ["elder", "old age", "old man", "old woman", "older", "father", "mother", "parent", "senior", "bedridden", "can't come", "cannot come", "buzurg", "बुज़ुर्ग", "बुजुर्ग", "पिता", "माता", "मां", "माँ", "आ नहीं"],
      en: "Our Elder Care and Home Care teams can visit — nurse at home, regular check-ups, physiotherapy and X-ray at home.",
      hi: "हमारी बुज़ुर्ग देखभाल व होम केयर टीम घर आ सकती है — घर पर नर्स, नियमित चेकअप, फिज़ियोथेरेपी और घर पर एक्स-रे।",
      service: "Elder Care" },
    { id: "medicine",
      k: ["fever", "cough", "cold", "bp", "pressure", "sugar", "diabetes", "vomit", "loose motion", "diarrh", "weak", "headache", "typhoid", "dengue", "malaria", "bukhar", "khansi", "बुखार", "खांसी", "खाँसी", "सर्दी", "उल्टी", "दस्त", "कमज़ोरी", "शुगर", "बीपी", "सिरदर्द"],
      en: "General Medicine is the right department. Covered under Ayushman Bharat at AHS. If the fever is very high or there is breathlessness, come to Emergency.",
      hi: "जनरल मेडिसिन विभाग सही रहेगा। AHS में आयुष्मान के अंतर्गत शामिल। अगर बुखार बहुत तेज़ है या सांस फूल रही है, तो इमरजेंसी आएँ।",
      dept: ["General Medicine", "जनरल मेडिसिन"] }
  ];
  var CHIPS = [
    ["Chest pain", "सीने में दर्द"], ["Road accident", "सड़क दुर्घटना"], ["Child has fever", "बच्चे को बुखार"],
    ["Bone / joint pain", "हड्डी / जोड़ दर्द"], ["Test at home", "घर पर जाँच"], ["Is Ayushman accepted?", "आयुष्मान चलता है?"],
    ["Elderly parent", "बुज़ुर्ग माता-पिता"]
  ];

  var chat = document.getElementById("chat");
  if (chat) {
    var log = chat.querySelector(".chat__log");
    var chips = chat.querySelector(".chat__chips");
    var chatForm = chat.querySelector(".chat__form");
    var input = document.getElementById("chat-in");

    var bubble = function (cls, build) {
      var d = document.createElement("div");
      d.className = "msg " + cls;
      build(d);
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
      return d;
    };
    var text = function (el, s) { var p = document.createElement("p"); p.textContent = s; el.appendChild(p); };
    var renderChips = function () {
      chips.innerHTML = "";
      CHIPS.forEach(function (c) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "chip"; b.textContent = t(c[0], c[1]);
        b.addEventListener("click", function () { ask(b.textContent); });
        chips.appendChild(b);
      });
    };
    var greet = function () {
      log.innerHTML = "";
      bubble("msg--bot", function (d) {
        text(d, t("Namaste! Tell me what's wrong — in English or Hindi — and I'll suggest the right department.",
          "नमस्ते! अपनी समस्या बताइए — हिंदी या अंग्रेज़ी में — मैं सही विभाग बताऊँगा।"));
      });
    };
    // Latin keywords must start at a word boundary ("ear" must not match "heart");
    // Devanagari keywords match anywhere.
    var hits = function (q, kw) {
      if (/^[\x00-\x7f]+$/.test(kw)) {
        var i = -1;
        while ((i = q.indexOf(kw, i + 1)) > -1) if (i === 0 || !/[a-z]/.test(q.charAt(i - 1))) return true;
        return false;
      }
      return q.indexOf(kw) > -1;
    };
    var match = function (q) {
      q = q.toLowerCase();
      for (var i = 0; i < RULES.length; i++) {
        for (var j = 0; j < RULES[i].k.length; j++) if (hits(q, RULES[i].k[j])) return RULES[i];
      }
      return null;
    };
    var actions = function (d, rule, q) {
      var wrap = document.createElement("div"); wrap.className = "acts";
      if (rule && rule.urgent) {
        var call = document.createElement("a");
        call.className = "pill pill--red"; call.href = "tel:+" + WA_NUMBER;
        call.textContent = t("Call Emergency · ", "इमरजेंसी कॉल · ") + PHONE;
        wrap.appendChild(call);
        var c112 = document.createElement("a");
        c112.className = "pill"; c112.href = "tel:112"; c112.textContent = t("Dial 112", "112 डायल करें");
        wrap.appendChild(c112);
      }
      if (!rule || rule.id !== "emergency") {
        var wa = document.createElement("button");
        wa.type = "button"; wa.className = "pill pill--wa";
        wa.textContent = t("Book on WhatsApp", "व्हाट्सऐप पर बुक करें");
        wa.addEventListener("click", function () {
          openBooking(rule && rule.service ? rule.service : "Appointment / OPD", (rule && rule.dept ? rule.dept[0] + ": " : "") + q);
        });
        wrap.appendChild(wa);
      }
      d.appendChild(wrap);
    };
    var ask = function (q) {
      q = (q || "").trim();
      if (!q) return;
      bubble("msg--me", function (d) { text(d, q); });
      var typing = bubble("msg--bot", function (d) { d.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>'; });
      setTimeout(function () {
        typing.remove();
        var rule = match(q);
        bubble("msg--bot" + (rule && rule.urgent ? " msg--alert" : ""), function (d) {
          if (rule) {
            if (rule.dept) {
              var h = document.createElement("p");
              h.innerHTML = "<b></b>"; h.firstChild.textContent = "→ " + t(rule.dept[0], rule.dept[1]);
              d.appendChild(h);
            }
            text(d, t(rule.en, rule.hi));
          } else {
            text(d, t("I couldn't match that to a department. Our team can guide you — book a call back on WhatsApp, or call " + PHONE + ". If it feels serious, come to Emergency.",
              "मैं इसे किसी विभाग से नहीं जोड़ पाया। हमारी टीम मदद करेगी — व्हाट्सऐप पर कॉल-बैक बुक करें या " + PHONE + " पर कॉल करें। गंभीर लगे तो इमरजेंसी आएँ।"));
          }
          actions(d, rule, q);
        });
      }, 650);
    };
    chatForm.addEventListener("submit", function (e) { e.preventDefault(); ask(input.value); input.value = ""; });
    greet(); renderChips();
    document.addEventListener("ahs:lang", function () { greet(); renderChips(); });
  }

  /* ---------- misc ---------- */
  document.querySelectorAll(".year").forEach(function (y) { y.textContent = new Date().getFullYear(); });
})();

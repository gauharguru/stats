#!/usr/bin/env python3
"""Build the AHS Global Hospital inner pages.

Every page shares the same header, footer and booking dialog (build/partials/*.html).
Page content lives in build/content.py, one entry per page, grouped by type:
treatment, service, about and scheme. Run from the repo root:

    python3 build/build.py

It writes <slug>.html for every page and refreshes the shared parts of index.html.
"""
import html
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import content as C  # noqa: E402

WA = "919942815500"
PHONE = "99428 15500"


def read(name):
    with open(os.path.join(ROOT, "build", "partials", name), encoding="utf-8") as f:
        return f.read().rstrip("\n")


def L(t, tag="span"):
    """Bilingual text: a (en, hi) tuple becomes two spans; a plain string is shown in both."""
    if isinstance(t, tuple):
        en, hi = t
        return f'<{tag} class="en">{en}</{tag}><{tag} class="hi">{hi}</{tag}>'
    return t


def esc(s):
    return html.escape(s, quote=True)


def text_en(t):
    return re.sub(r"<[^>]+>", "", t[0] if isinstance(t, tuple) else t)


# ---------------------------------------------------------------- shared shell
STRIP = """  <div class="er-strip" role="note">
    <span class="er-strip__dot" aria-hidden="true"></span>
    <span class="en"><b>24×7 Emergency</b> · Road accident? Cashless treatment under PM-RAHAT</span>
    <span class="hi"><b>24×7 इमरजेंसी</b> · सड़क दुर्घटना? PM-RAHAT के तहत कैशलेस इलाज</span>
    <a href="tel:+919942815500">📞 99428 15500</a>
  </div>"""

SECTION_NAMES = {
    "treat": ("Treatments", "इलाज"),
    "serv": ("Services", "सेवाएँ"),
    "about": ("About us", "हमारे बारे में"),
    "emp": ("Empanelments", "सूचीबद्ध योजनाएँ"),
}
MENU_IDS = {"treat": "m-treat", "serv": "m-serv", "about": "m-about", "emp": "m-emp"}


def header_for(slug, section):
    h = read("header.html").replace('href="#top"', 'href="index.html"')
    h = h.replace(' aria-current="page"', "")
    if slug == "index":
        return h.replace('class="menu__top" href="index.html"', 'class="menu__top" href="index.html" aria-current="page"', 1)
    h = h.replace(f'href="{slug}.html"', f'href="{slug}.html" aria-current="page"')
    if section in MENU_IDS:
        h = h.replace(f'aria-controls="{MENU_IDS[section]}"', f'aria-controls="{MENU_IDS[section]}" data-current="true"', 1)
    return h


def shell(p, hero, body, scenes=False):
    title = text_en(p["title"])
    desc = esc(text_en(p["lead"]))
    sec = SECTION_NAMES.get(p["section"])
    crumbs = f'<nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">{L(("Home", "होम"))}</a><span aria-hidden="true">/</span>'
    if sec:
        crumbs += f'<span>{L(sec)}</span><span aria-hidden="true">/</span>'
    crumbs += f'<span aria-current="page">{L(p["title"])}</span></nav>'
    scripts = '  <script src="assets/js/main.js" defer></script>\n'
    if scenes:
        scripts += '  <script src="assets/js/scenes.js" defer></script>\n'
    return f"""<!doctype html>
<html lang="en" data-lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{esc(title)} | AHS Global Hospital, Samastipur</title>
  <meta name="description" content="{desc}">
  <meta name="theme-color" content="#2a63cc">
  <link rel="canonical" href="https://ahsglobalhospital.com/{p['slug']}.html">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="AHS Global Hospital">
  <meta property="og:title" content="{esc(title)} | AHS Global Hospital">
  <meta property="og:description" content="{desc}">
  <meta property="og:image" content="https://ahsglobalhospital.com/assets/img/hospital-team.jpg">
  <link rel="icon" type="image/png" sizes="48x48" href="assets/img/favicon-48.png">
  <link rel="icon" type="image/png" sizes="192x192" href="assets/img/icon-192.png">
  <link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="page-{p['type']}">
  <a class="skip" href="#main">{L(("Skip to content", "मुख्य सामग्री पर जाएँ"))}</a>

{STRIP}

  <div class="frame">
    <section class="panel phero">
      <!--cms:header-->
{header_for(p['slug'], p['section'])}
      <!--/cms:header-->
      <div class="phero__grid">
        <div>
          {crumbs}
{hero}
        </div>
{visual(p)}
      </div>
    </section>

    <main id="main">
{body}
    </main>

    <!--cms:footer-->
{read('footer.html')}
    <!--/cms:footer-->
  </div>

  <!--cms:tail-->
{read('tail.html')}
  <!--/cms:tail-->

{scripts}</body>
</html>
"""


# ---------------------------------------------------------------- hero parts
def hero_copy(p, ctas):
    badges = "".join(f'<span class="badge badge--{b[0]}">{L(b[1])}</span>' for b in p.get("badges", []))
    return f"""          <span class="kicker">{L(p['kicker'])}</span>
          <h1>{L(p['h1'])}</h1>
          <p class="lead">{L(p['lead'])}</p>
          {f'<div class="badges">{badges}</div>' if badges else ''}
          <div class="cta">{ctas}</div>"""


def btn_book(service, label=("Book on WhatsApp", "व्हाट्सऐप पर बुक करें"), cls="pill--dark"):
    return (f'<button type="button" class="pill {cls} pill--arrow" data-book="{esc(service)}">'
            f'{L(label)}<i aria-hidden="true">↗</i></button>')


def btn_call(label=("Call", "कॉल करें"), cls="pill--ghost-red"):
    return f'<a class="pill {cls}" href="tel:+{WA}">{L(label)} · {PHONE}</a>'


def facts_html(facts):
    rows = "".join(f"<div><span>{L(k)}</span><b>{L(v)}</b></div>" for k, v in facts)
    return f'<div class="dtile__facts">{rows}</div>'


def visual(p):
    v = p.get("visual", "tile")
    facts = facts_html(p.get("facts", []))
    tone = p.get("tone", "")
    if v == "ecg":
        return f"""        <div class="screen" aria-hidden="true">
          <div class="screen__bar"><span class="live"></span><b class="screen__title">AHS · EMERGENCY</b><span class="screen__clock">--:--</span></div>
          <div class="scene">
            <div class="vitals">
              <div class="v v--g"><small>HR</small><b class="bpm">78</b><em>bpm</em></div>
              <div class="v v--c"><small>SpO₂</small><b class="spo2">98</b><em>%</em></div>
              <div class="v v--y"><small>NIBP</small><b class="bp">120/80</b><em>mmHg</em></div>
              <div class="v v--w"><small>RESP</small><b>16</b><em>/min</em></div>
            </div>
            <canvas class="ecg ecg--big" data-color="#2fe08a" data-grid="1" height="200"></canvas>
            <canvas class="pleth" height="70"></canvas>
          </div>
        </div>"""
    if v == "xray":
        return f"""        <div class="screen" aria-hidden="true">
          <div class="screen__bar"><span class="live"></span><b class="screen__title">AHS · DR PORTABLE</b><span class="screen__clock">--:--</span></div>
          <div class="scene">{XRAY_SVG}
            <div class="xray__tag">{L(("Portable unit · home &amp; bedside", "पोर्टेबल यूनिट · घर व बेड पर"))}</div>
          </div>
        </div>"""
    if v == "photo":
        return f"""        <div class="dtile dtile--photo">
          <img src="{p['photo']}" alt="{esc(p.get('photo_alt', ''))}" style="object-position:{p.get('photo_pos', 'center')}">
          {facts}
        </div>"""
    return f"""        <div class="dtile {('dtile--' + tone) if tone else ''}">
          <span class="dtile__ic" aria-hidden="true">{p['icon']}</span>
          {facts}
        </div>"""


XRAY_SVG = """
            <svg class="xray" viewBox="0 0 300 300">
              <defs>
                <clipPath id="xClip"><rect class="xray__reveal" x="0" y="0" width="300" height="0"/></clipPath>
                <filter id="xGlow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <path d="M150 18c22 0 36 16 36 38s-14 40-36 40-36-18-36-40 14-38 36-38zM96 112c14-8 34-12 54-12s40 4 54 12c18 10 26 30 28 52l6 120H62l6-120c2-22 10-42 28-52z" fill="#1d3550" stroke="#3d6a96" stroke-width="2"/>
              <g clip-path="url(#xClip)" filter="url(#xGlow)" stroke="#d8f1ff" fill="none" stroke-linecap="round">
                <ellipse cx="150" cy="56" rx="27" ry="31" stroke-width="3"/>
                <path d="M138 72h24" stroke-width="2"/>
                <path d="M150 96v190" stroke-width="5" stroke-dasharray="6 3"/>
                <path d="M150 118c-28 0-52 6-62 12M150 118c28 0 52 6 62 12" stroke-width="5"/>
                <g stroke-width="3">
                  <path d="M150 138c-22-4-42 0-52 10M150 138c22-4 42 0 52 10"/>
                  <path d="M150 154c-24-4-46 0-56 12M150 154c24-4 46 0 56 12"/>
                  <path d="M150 170c-24-4-46 2-56 14M150 170c24-4 46 2 56 14"/>
                  <path d="M150 186c-22-2-42 4-52 16M150 186c22-2 42 4 52 16"/>
                  <path d="M150 202c-18 0-34 6-42 16M150 202c18 0 34 6 42 16"/>
                </g>
                <path d="M110 250c10-14 26-20 40-20s30 6 40 20c-12 10-26 16-40 16s-28-6-40-16z" stroke-width="4"/>
                <path d="M86 132 72 226M214 132l14 94" stroke-width="5"/>
              </g>
              <rect class="xray__line" x="40" y="0" width="220" height="3" fill="#7fe3ff"/>
            </svg>"""


# ---------------------------------------------------------------- blocks
def section(inner, dark=False, extra=""):
    return f'      <section class="panel{" panel--dark" if dark else ""} {extra}">\n{inner}\n      </section>\n'


def head(kicker, title, right=""):
    return (f'        <div class="sec-head"><div><span class="kicker{" kicker--light" if False else ""}">{L(kicker)}</span>'
            f'<h2>{L(title)}</h2></div>{right}</div>')


def cards(items):
    out = "".join(f'<div class="card"><i aria-hidden="true">{ic}</i><h3>{L(t)}</h3><p>{L(d)}</p></div>' for ic, t, d in items)
    return f'        <div class="cards">{out}</div>'


def chips(items):
    return '        <div class="chips">' + "".join(f"<span>{L(c)}</span>" for c in items) + "</div>"


def ticks(items, x=False):
    return f'<ul class="ticks{" ticks--x" if x else ""}">' + "".join(f"<li>{L(i)}</li>" for i in items) + "</ul>"


def flow(items):
    return '        <ol class="flow">' + "".join(f"<li><b>{L(t)}</b><span>{L(d)}</span></li>" for t, d in items) + "</ol>"


def faq(items):
    out = "".join(f"<details><summary>{L(q)}</summary><p>{L(a)}</p></details>" for q, a in items)
    return f'        <div class="faq">{out}</div>'


def related(slugs):
    out = ""
    for s in slugs:
        r = C.PAGES[s]
        out += f'<a href="{s}.html"><i aria-hidden="true">{r["icon"]}</i>{L(r["title"])}</a>'
    return f'        <div class="related">{out}</div>'


def warn(p):
    w = p["redflags"]
    items = "".join(f"<li>{L(i)}</li>" for i in w["items"])
    return f"""      <section class="warn">
        <div><h2>{L(w['title'])}</h2><ul>{items}</ul></div>
        <a class="pill pill--red" href="tel:+{WA}">{L(("Call Emergency", "इमरजेंसी कॉल करें"))} · {PHONE}</a>
      </section>
"""


def ayushman_note(p):
    if p.get("ayushman") is True:
        return section(f"""        <div class="cta-band">
          <div><span class="badge badge--green">{L(("Ayushman Bharat", "आयुष्मान भारत"))}</span>
          <h2 style="margin-top:12px">{L(("Covered under Ayushman Bharat at AHS.", "AHS में आयुष्मान भारत के अंतर्गत शामिल।"))}</h2>
          <p class="lead" style="margin-top:8px">{L(("Eligible families can get treatment in this department without paying. Bring your Ayushman card or Aadhaar.", "पात्र परिवार इस विभाग में बिना पैसे इलाज करा सकते हैं। आयुष्मान कार्ड या आधार साथ लाएँ।"))}</p></div>
          <div class="cta"><a class="pill pill--blue pill--arrow" href="ayushman-bharat.html">{L(("How to use Ayushman", "आयुष्मान कैसे इस्तेमाल करें"))}<i aria-hidden="true">↗</i></a></div>
        </div>""")
    return ""


def team(p):
    people = p.get("team")
    if people is None:
        return ""
    cards_ = ""
    for d in people:
        cards_ += f"""<div class="person"><img src="{d['photo']}" alt="{esc(d['name'])}" loading="lazy">
          <div><b>{d['name']}</b><span>{d['quals']}</span><span>{L(d['role'])}</span><span>{L(d['opd'])}</span>
          {btn_book(d['book'], ("Book OPD", "ओपीडी बुक करें"))}</div></div>"""
    cards_ += f"""<div class="empty"><b>{L(("More doctors coming soon", "और डॉक्टर जल्द ही"))}</b>
          <span>{L(("Call us for today's doctor and OPD timings.", "आज के डॉक्टर व ओपीडी समय के लिए कॉल करें।"))} {PHONE}</span></div>"""
    return section(head(("Our doctors", "हमारे डॉक्टर"), ("Who you'll see", "आपका इलाज कौन करेगा")) +
                   f'\n        <div class="cards">{cards_}</div>')


def wa_form(service, title, extra_fields="", date=True, notes_label=("Problem / notes (optional)", "समस्या / नोट (वैकल्पिक)"), form_title="Booking request"):
    uid = re.sub(r"[^a-z0-9]+", "-", service.lower()).strip("-")
    date_html = (f'<label for="{uid}-date">{L(("Preferred date", "पसंदीदा तारीख"))}'
                 f'<input id="{uid}-date" name="date" type="date"></label>') if date else ""
    return f"""<form class="wa-card wa-form" data-title="{esc(form_title)}" novalidate>
            <h3>{L(title)}</h3>
            <input type="hidden" name="service" value="{esc(service)}">
            <div class="row2">
              <label for="{uid}-name">{L(("Your name", "आपका नाम"))}<input id="{uid}-name" name="name" required autocomplete="name"></label>
              <label for="{uid}-phone">{L(("Phone number", "फ़ोन नंबर"))}<input id="{uid}-phone" name="phone" type="tel" required autocomplete="tel" inputmode="tel"></label>
            </div>
            {extra_fields}
            {date_html}
            <label for="{uid}-notes">{L(notes_label)}<textarea id="{uid}-notes" name="notes" rows="2" maxlength="300"></textarea></label>
            <p class="err" hidden>{L(("Please enter your name and a valid 10-digit phone number.", "कृपया नाम और सही 10 अंकों का फ़ोन नंबर लिखें।"))}</p>
            <button class="pill pill--wa" type="submit">{L(("Continue on WhatsApp", "व्हाट्सऐप पर आगे बढ़ें"))}</button>
            <small>{L(("WhatsApp opens with your details filled in. Our team will call to confirm.", "आपकी जानकारी के साथ व्हाट्सऐप खुलेगा। हमारी टीम कॉल करके पुष्टि करेगी।"))}</small>
          </form>"""


def select_field(uid, label, data_label, options):
    opts = "".join(f'<option value="{esc(text_en(o))}">{text_en(o)}{" · " + o[1] if isinstance(o, tuple) else ""}</option>' for o in options)
    return (f'<label for="{uid}">{L(label)}<select id="{uid}" data-label="{esc(data_label)}">{opts}</select></label>')


def text_field(uid, label, data_label, placeholder=""):
    return (f'<label for="{uid}">{L(label)}<input id="{uid}" data-label="{esc(data_label)}" placeholder="{esc(placeholder)}"></label>')


def cta_band(title, service):
    return section(f"""        <div class="cta-band">
          <h2>{L(title)}</h2>
          <div class="cta">{btn_book(service)}{btn_call()}</div>
        </div>""")


# ---------------------------------------------------------------- page types
# Shared defaults for treatment pages (a page can override any of them)
VISIT_FLOW = [
    (("Book or walk in", "बुक करें या सीधे आएँ"), ("Book on WhatsApp or call " + PHONE + ". Walk-ins are welcome; Emergency never needs a booking.", "व्हाट्सऐप पर बुक करें या " + PHONE + " पर कॉल करें। सीधे भी आ सकते हैं; इमरजेंसी के लिए बुकिंग नहीं चाहिए।")),
    (("Registration", "रजिस्ट्रेशन"), ("Register at reception with an ID. Ayushman card holders are guided to the Ayushman desk.", "पहचान पत्र के साथ रिसेप्शन पर रजिस्ट्रेशन। आयुष्मान कार्ड वालों को आयुष्मान डेस्क पर भेजा जाता है।")),
    (("Consultation", "डॉक्टर से परामर्श"), ("The doctor examines you, listens to your history and explains the next steps.", "डॉक्टर जाँच करते हैं, आपकी बात सुनते हैं और आगे के कदम समझाते हैं।")),
    (("Tests in-house", "अस्पताल में ही जाँच"), ("Lab, X-ray and ultrasound in the same building, so reports come quickly.", "लैब, एक्स-रे और अल्ट्रासाउंड उसी इमारत में, ताकि रिपोर्ट जल्दी मिले।")),
    (("Treatment &amp; follow-up", "इलाज व फ़ॉलो-अप"), ("Medicines from the 24×7 pharmacy, admission if needed, and a follow-up plan.", "24×7 फ़ार्मेसी से दवाएँ, ज़रूरत हो तो भर्ती, और फ़ॉलो-अप की योजना।")),
]
BRING = [("Aadhaar or another photo ID", "आधार या कोई फ़ोटो पहचान पत्र"),
         ("Ayushman card, if you have one", "आयुष्मान कार्ड, अगर हो"),
         ("Old prescriptions, reports and X-rays", "पुराने पर्चे, रिपोर्ट और एक्स-रे"),
         ("A list of medicines you take now", "अभी ली जा रही दवाओं की सूची"),
         ("A family member, if the patient is very unwell", "मरीज़ ज़्यादा बीमार हो तो परिवार का कोई सदस्य")]
PHOTOS = ["assets/img/ward-icu.jpg", "assets/img/hospital-team.jpg", "assets/img/icu-care.jpg"]


def about_block(p, idx=0):
    """Two-column 'about' write-up with a photo or quick-facts panel."""
    paras = "".join(f"<p>{L(x)}</p>" for x in p.get("about", []))
    if not paras:
        return ""
    side = p.get("about_side")
    if side == "facts":
        rows = "".join(f"<div><dt>{L(k)}</dt><dd>{L(v)}</dd></div>" for k, v in p.get("glance", []))
        aside = f'<div class="glance"><h3>{L(("At a glance", "एक नज़र में"))}</h3><dl>{rows}</dl></div>'
    else:
        photo = p.get("about_photo", PHOTOS[idx % len(PHOTOS)])
        aside = f'<div class="contact__photo"><img src="{photo}" alt="" loading="lazy"></div>'
    return section(f"""        <div class="two">
          <div class="prose">
            <span class="kicker">{L(p.get('about_kicker', ('About', 'परिचय')))}</span>
            <h2 class="h2">{L(p['about_title'])}</h2>
            {paras}
          </div>
          {aside}
        </div>""")


def two_lists(left_k, left_t, left, right_k, right_t, right, right_x=False):
    return section(f"""        <div class="two">
          <div><span class="kicker">{L(left_k)}</span><h2 class="h2">{L(left_t)}</h2>{ticks(left)}</div>
          <div><span class="kicker">{L(right_k)}</span><h2 class="h2">{L(right_t)}</h2>{ticks(right, right_x)}</div>
        </div>""")


def tips_block(p):
    if not p.get("tips"):
        return ""
    return section(head(("Health tips", "सेहत की सलाह"), p.get("tips_title", ("Simple steps that help", "आसान उपाय जो मदद करते हैं"))) + "\n" + cards(p["tips"]))


def render_treatment(p):
    idx = list(C.PAGES).index(p["slug"])
    hero = hero_copy(p, btn_book(p["book"]) + btn_call(("Call", "कॉल करें")))
    body = ""
    if p.get("redflags") and p.get("redflags_first"):
        body += warn(p)
    body += about_block(p, idx)
    body += section(head(("What we treat", "हम किसका इलाज करते हैं"), p["treat_title"]) + "\n" + chips(p["conditions"]))
    if p.get("see_doctor"):
        body += two_lists(("When to see a doctor", "डॉक्टर को कब दिखाएँ"), p.get("see_title", ("Book a visit if you notice", "ये दिखे तो डॉक्टर को दिखाएँ")), p["see_doctor"],
                          ("Before your visit", "आने से पहले"), ("What to bring", "क्या साथ लाएँ"), p.get("bring", BRING))
    body += section(head(("Care &amp; facilities", "इलाज व सुविधाएँ"), p["care_title"]) + "\n" + cards(p["care"]))
    body += section(head(("Your visit", "आपकी विज़िट"), ("What happens, step by step", "क्या होता है, कदम-दर-कदम"), "") + "\n" + flow(p.get("visit", VISIT_FLOW)), dark=True)
    if p.get("redflags") and not p.get("redflags_first"):
        body += warn(p)
    body += team(p)
    body += tips_block(p)
    body += ayushman_note(p)
    body += section(head(("Questions", "सवाल"), ("Frequently asked", "अक्सर पूछे जाने वाले सवाल")) + "\n" + faq(p["faq"]))
    body += section(head(("Related", "संबंधित"), ("You may also need", "यह भी देखें")) + "\n" + related(p["related"]))
    body += cta_band(p.get("cta", ("Talk to our team today.", "आज ही हमारी टीम से बात करें।")), p["book"])
    return shell(p, hero, body, scenes=p.get("visual") in ("ecg", "xray"))


def render_service(p):
    hero = hero_copy(p, btn_book(p["book"]) + btn_call())
    extra = "".join(p.get("form_fields", []))
    body = about_block(p)
    body += section(head(("What's included", "क्या शामिल है"), p["incl_title"]) + "\n" + cards(p["included"]))
    body += section(head(("How it works", "कैसे काम करता है"), ("Book in a few minutes", "कुछ ही मिनट में बुक करें")) + "\n" + flow(p["flow"]), dark=True)
    if p.get("ready"):
        body += two_lists(("Keep ready", "तैयार रखें"), ("Before we arrive", "हमारे आने से पहले"), p["ready"],
                          ("Our promise", "हमारा वादा"), ("How we keep it safe", "हम सुरक्षा कैसे रखते हैं"), p.get("safety", []))
    body += section(f"""        <div class="two">
          <div>
            <span class="kicker">{L(("Who it's for", "किसके लिए"))}</span>
            <h2 class="h2">{L(p['who_title'])}</h2>
            {ticks(p['who'])}
            <div class="prose" style="margin-top:22px">{''.join(f'<p>{L(x)}</p>' for x in p.get('notes', []))}</div>
          </div>
          {wa_form(p['book'], p['form_title'], extra)}
        </div>""")
    body += tips_block(p)
    body += section(head(("Questions", "सवाल"), ("Frequently asked", "अक्सर पूछे जाने वाले सवाल")) + "\n" + faq(p["faq"]))
    body += section(head(("Related", "संबंधित"), ("You may also need", "यह भी देखें")) + "\n" + related(p["related"]))
    return shell(p, hero, body, scenes=p.get("visual") in ("ecg", "xray"))


def render_custom(p):
    hero = hero_copy(p, p["ctas"](btn_book, btn_call) if callable(p.get("ctas")) else btn_book(p["book"]) + btn_call())
    body = p["body"](sys.modules[__name__])
    return shell(p, hero, body, scenes=p.get("visual") in ("ecg", "xray"))


RENDER = {"treatment": render_treatment, "service": render_service, "about": render_custom, "scheme": render_custom}


def refresh_index():
    path = os.path.join(ROOT, "index.html")
    s = open(path, encoding="utf-8").read()
    for key, val in (("header", header_for("index", None)), ("footer", read("footer.html")), ("tail", read("tail.html"))):
        s = re.sub(rf"(<!--cms:{key}-->\n).*?(\n\s*<!--/cms:{key}-->)", lambda m: m.group(1) + val + m.group(2), s, flags=re.S)
    open(path, "w", encoding="utf-8").write(s)


def main():
    for slug, p in C.PAGES.items():
        p["slug"] = slug
        out = RENDER[p["type"]](p)
        with open(os.path.join(ROOT, f"{slug}.html"), "w", encoding="utf-8") as f:
            f.write(out)
        print("built", f"{slug}.html")
    refresh_index()
    print("refreshed index.html")


if __name__ == "__main__":
    main()

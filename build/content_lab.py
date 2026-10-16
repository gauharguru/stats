"""24×7 Pathology Lab page, built around the integrated (trend) report."""

PHONE = "99428 15500"

# Sample integrated report: example values only, shown clearly as a sample on the page.
VISITS = [("Feb 2026", "फ़र॰ 2026", 0), ("Jun 2026", "जून 2026", 120), ("Today · Oct 2026", "आज · अक्टू॰ 2026", 247)]  # day offsets
SUGAR = [270, 260, 245]
REPORT = [
    # (test, unit, values, reference, trend key)
    (("Fasting blood sugar", "फ़ास्टिंग ब्लड शुगर"), "mg/dL", ["270", "260", "245"], "70 – 99", "down"),
    (("HbA1c", "HbA1c"), "%", ["9.8", "9.2", "8.6"], ("Below 5.7", "5.7 से कम"), "down"),
    (("Serum creatinine", "सीरम क्रिएटिनिन"), "mg/dL", ["1.0", "1.0", "1.0"], "0.6 – 1.2", "flat"),
    (("Total cholesterol", "टोटल कोलेस्ट्रॉल"), "mg/dL", ["232", "214", "198"], ("Below 200", "200 से कम"), "down"),
]
TREND = {"down": ("↓", ("Improving", "सुधार"), "good"), "flat": ("→", ("Stable", "स्थिर"), "ok"), "up": ("↑", ("Rising", "बढ़ रहा"), "bad")}


def sugar_chart(L):
    """Single-series line chart of fasting sugar across visits, with the normal and diabetes ranges as bands."""
    W, H, l, r, t, b = 640, 300, 56, 24, 20, 44
    y0, y1 = 60, 300
    days = [d for _, _, d in VISITS]
    xs = [l + (d - days[0]) / (days[-1] - days[0]) * (W - l - r) for d in days]
    ys = [t + (y1 - v) / (y1 - y0) * (H - t - b) for v in SUGAR]
    Y = lambda v: t + (y1 - v) / (y1 - y0) * (H - t - b)  # noqa: E731
    grid = "".join(f'<line x1="{l}" x2="{W - r}" y1="{Y(v):.1f}" y2="{Y(v):.1f}" class="ch-grid"/>'
                   f'<text x="{l - 10}" y="{Y(v) + 4:.1f}" class="ch-tick" text-anchor="end">{v}</text>' for v in (100, 150, 200, 250, 300))
    bands = (f'<rect x="{l}" width="{W - l - r}" y="{Y(99):.1f}" height="{Y(70) - Y(99):.1f}" class="ch-band ch-band--ok"/>'
             f'<text x="{W - r - 8}" y="{Y(99) + 16:.1f}" text-anchor="end" class="ch-band-label">{L(("Normal 70–99", "सामान्य 70–99"), "tspan")}</text>'
             f'<line x1="{l}" x2="{W - r}" y1="{Y(126):.1f}" y2="{Y(126):.1f}" class="ch-limit"/>'
             f'<text x="{W - r - 8}" y="{Y(126) - 6:.1f}" text-anchor="end" class="ch-band-label">{L(("Diabetes from 126", "126 से डायबिटीज़"), "tspan")}</text>')
    path = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in zip(xs, ys))
    pts = ""
    for i, (x, y) in enumerate(zip(xs, ys)):
        en, hi, _ = VISITS[i]
        anchor = "start" if i == 0 else ("end" if i == len(xs) - 1 else "middle")
        dx = 4 if i == 0 else (-4 if i == len(xs) - 1 else 0)
        pts += (f'<g class="ch-pt" tabindex="0" data-tip="{en}: {SUGAR[i]} mg/dL">'
                f'<circle cx="{x:.1f}" cy="{y:.1f}" r="16" class="ch-hit"/>'
                f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" class="ch-dot{" ch-dot--now" if i == len(xs) - 1 else ""}"/>'
                f'<text x="{x + dx:.1f}" y="{y - 14:.1f}" text-anchor="{anchor}" class="ch-val">{SUGAR[i]}</text>'
                f'<text x="{x + dx:.1f}" y="{H - 16}" text-anchor="{anchor}" class="ch-x">{L((en, hi), "tspan")}</text></g>')
    return f"""<figure class="chart">
            <figcaption>{L(("Fasting blood sugar (mg/dL)", "फ़ास्टिंग ब्लड शुगर (mg/dL)"))}</figcaption>
            <svg viewBox="0 0 {W} {H}" role="img" aria-label="Fasting blood sugar: Feb 2026 270, Jun 2026 260, today 245 mg/dL">
              {bands}{grid}
              <path d="{path}" class="ch-line"/>
              {pts}
            </svg>
            <div class="ch-tip" hidden></div>
          </figure>"""


def report_table(L):
    head = "".join(f"<th scope=\"col\">{L((en, hi))}</th>" for en, hi, _ in VISITS)
    rows = ""
    for name, unit, vals, ref, tr in REPORT:
        arrow, label, cls = TREND[tr]
        cells = "".join(f'<td{" class=\"now\"" if i == len(vals) - 1 else ""}><span class="lbl">{L((VISITS[i][0], VISITS[i][1]))}</span>{v}</td>' for i, v in enumerate(vals))
        rows += (f'<tr><th scope="row">{L(name)}<small>{unit}</small></th>{cells}<td class="ref"><span class="lbl">{L(("Reference", "सामान्य सीमा"))}</span>{L(ref)}</td>'
                 f'<td><span class="trend trend--{cls}"><b aria-hidden="true">{arrow}</b>{L(label)}</span></td></tr>')
    return f"""<div class="ireport">
            <div class="ireport__head">
              <div class="brand"><img src="assets/img/logo.png" alt="" width="26" height="30"><span>AHS Pathology Lab<small>{L(("Integrated report · Patient ID: AHS-000000 (sample)", "इंटीग्रेटेड रिपोर्ट · पेशेंट ID: AHS-000000 (नमूना)"))}</small></span></div>
              <span class="badge badge--amber">{L(("Sample · example values", "नमूना · उदाहरण के मान"))}</span>
            </div>
            <div class="tbl"><table>
              <thead><tr><th scope="col">{L(("Test", "जाँच"))}</th>{head}<th scope="col">{L(("Reference", "सामान्य सीमा"))}</th><th scope="col">{L(("Trend", "रुझान"))}</th></tr></thead>
              <tbody>{rows}</tbody>
            </table></div>
          </div>"""


def lab_body(b):
    L = b.L
    out = b.section(f"""        <div class="sec-head"><div><span class="kicker">{L(("The AHS integrated report", "AHS इंटीग्रेटेड रिपोर्ट"))}</span>
          <h2>{L(("Your past results, on today's report", "आपकी पुरानी रिपोर्ट, आज की रिपोर्ट में"))}</h2></div></div>
        <div class="prose" style="margin-bottom:24px"><p>{L(("Most labs give you a single report for a single day. At AHS, every test is saved under your Patient ID, and each new report prints your latest results next to your earlier ones — with the trend for each test. You see at a glance whether things are getting better, and you never need to dig out old reports.", "ज़्यादातर लैब एक दिन की एक रिपोर्ट देती हैं। AHS में हर जाँच आपकी पेशेंट ID में सेव होती है, और हर नई रिपोर्ट में ताज़ा नतीजे पिछले नतीजों के साथ छपते हैं — हर जाँच के रुझान के साथ। एक नज़र में दिखता है कि हालत सुधर रही है या नहीं, और पुरानी रिपोर्ट ढूँढनी नहीं पड़ती।"))}</p></div>
        <div class="ireport-grid">
          {report_table(L)}
          {sugar_chart(L)}
        </div>
        <div class="readout">
          <span class="trend trend--good"><b aria-hidden="true">↓</b>{L(("Improving", "सुधार"))}</span>
          <p>{L(("<b>What this tells you:</b> fasting sugar has come down from 270 in February to 245 today, and HbA1c from 9.8% to 8.6%. The medicines are working. It's still above the normal range, so your doctor may adjust the dose — and can see all of this on one page.", "<b>इससे क्या पता चलता है:</b> फ़ास्टिंग शुगर फ़रवरी में 270 से घटकर आज 245 हुई है, और HbA1c 9.8% से 8.6%। दवाएँ असर कर रही हैं। यह अभी भी सामान्य से ज़्यादा है, इसलिए डॉक्टर खुराक बदल सकते हैं — और यह सब एक ही पेज पर देख सकते हैं।"))}</p>
        </div>""")
    out += b.section(f"""        <div class="two">
          <div><span class="kicker">{L(("For you", "आपके लिए"))}</span><h2 class="h2">{L(("Understand your health at a glance", "एक नज़र में अपनी सेहत समझें"))}</h2>
            {b.ticks([("See whether your medicines are working", "देखें कि दवाएँ असर कर रही हैं या नहीं"), ("No need to keep and carry old reports", "पुरानी रिपोर्ट संभालने और लाने की ज़रूरत नहीं"), ("Arrows and plain words: improving, stable or rising", "तीर और आसान शब्द: सुधार, स्थिर या बढ़ रहा"), ("Report on WhatsApp, in your hand", "रिपोर्ट व्हाट्सऐप पर, आपके हाथ में")])}</div>
          <div><span class="kicker">{L(("For your doctor", "आपके डॉक्टर के लिए"))}</span><h2 class="h2">{L(("Your history on one page", "आपका इतिहास एक पेज पर"))}</h2>
            {b.ticks([("Months of results without searching through files", "फ़ाइलें खोजे बिना महीनों के नतीजे"), ("Faster, better-informed decisions about doses", "खुराक पर जल्दी और बेहतर फ़ैसले"), ("Early warning when a value starts rising", "कोई मान बढ़ने लगे तो जल्दी चेतावनी"), ("Useful for any doctor you visit, inside or outside AHS", "AHS के अंदर या बाहर किसी भी डॉक्टर के लिए उपयोगी")])}</div>
        </div>""")
    out += b.section(b.head(("Why AHS Lab", "AHS लैब क्यों"), ("What makes our lab different", "हमारी लैब को क्या अलग बनाता है")) + "\n" + b.cards([
        ("📈", ("Integrated trend report", "इंटीग्रेटेड ट्रेंड रिपोर्ट"), ("Today's results next to your earlier ones, with a trend for each test.", "आज के नतीजे पिछले नतीजों के साथ, हर जाँच के रुझान के साथ।")),
        ("🕐", ("Open 24×7", "24×7 खुली"), ("Tests any time of day or night, including emergencies.", "दिन-रात किसी भी समय जाँच, इमरजेंसी सहित।")),
        ("🏠", ("Samples from home", "घर से सैंपल"), ("Our team collects blood and urine at your home.", "हमारी टीम घर से खून व पेशाब का सैंपल लेती है।")),
        ("📱", ("Reports on WhatsApp", "रिपोर्ट व्हाट्सऐप पर"), ("No second trip just to collect a report.", "सिर्फ़ रिपोर्ट लेने के लिए दोबारा आना नहीं।")),
        ("🩺", ("Linked to your doctor", "डॉक्टर से जुड़ी"), ("AHS doctors see your reports and history straight away.", "AHS डॉक्टर आपकी रिपोर्ट और इतिहास तुरंत देखते हैं।")),
        ("🏥", ("Inside a 24×7 hospital", "24×7 अस्पताल के अंदर"), ("If a result is critical, Emergency is a few steps away.", "कोई नतीजा गंभीर हो तो इमरजेंसी कुछ ही कदम दूर।"))]))
    out += b.section(b.head(("Tests", "जाँचें"), ("Common tests at AHS Lab", "AHS लैब की आम जाँचें")) + "\n" + b.chips([
        ("Blood sugar (fasting, PP, random)", "ब्लड शुगर (फ़ास्टिंग, PP, रैंडम)"), "HbA1c", ("Complete blood count (CBC)", "कम्प्लीट ब्लड काउंट (CBC)"), ("Kidney function (KFT)", "किडनी जाँच (KFT)"),
        ("Liver function (LFT)", "लिवर जाँच (LFT)"), ("Lipid profile", "लिपिड प्रोफ़ाइल"), ("Thyroid (TSH, T3, T4)", "थायरॉइड (TSH, T3, T4)"), ("Urine routine", "पेशाब की जाँच"),
        ("Dengue NS1 &amp; antibodies", "डेंगू NS1 व एंटीबॉडी"), ("Malaria", "मलेरिया"), ("Typhoid", "टाइफ़ाइड"), ("Electrolytes", "इलेक्ट्रोलाइट"), ("Blood group", "ब्लड ग्रुप")]) +
        f'\n        <p class="note" style="margin-top:14px;color:var(--muted)">{L(("Call " + PHONE + " to ask about any test not listed here.", "जो जाँच यहाँ नहीं है, उसके बारे में " + PHONE + " पर पूछें।"))}</p>')
    out += b.section(b.head(("How it works", "कैसे काम करता है"), ("From sample to integrated report", "सैंपल से इंटीग्रेटेड रिपोर्ट तक")) + "\n" + b.flow([
        (("Give your sample", "सैंपल दें"), ("At the lab any time, or book collection at home.", "कभी भी लैब में, या घर से कलेक्शन बुक करें।")),
        (("Your AHS Patient ID", "आपकी AHS पेशेंट ID"), ("Every test is saved under your Patient ID, so all your results stay together.", "हर जाँच आपकी पेशेंट ID में सेव होती है, ताकि आपके सभी नतीजे एक साथ रहें।")),
        (("Testing", "जाँच"), ("Your sample is tested in our 24×7 lab.", "आपका सैंपल हमारी 24×7 लैब में जाँचा जाता है।")),
        (("Integrated report", "इंटीग्रेटेड रिपोर्ट"), ("Today's results with your earlier ones and the trend.", "आज के नतीजे पुराने नतीजों और रुझान के साथ।")),
        (("On WhatsApp", "व्हाट्सऐप पर"), ("Report sent to you and available to your AHS doctor.", "रिपोर्ट आपको भेजी जाती है और AHS डॉक्टर को उपलब्ध।"))]), dark=True)
    out += b.section(f"""        <div class="two">
          <div><span class="kicker">{L(("Before your test", "जाँच से पहले"))}</span><h2 class="h2">{L(("How to prepare", "कैसे तैयारी करें"))}</h2>
            {b.ticks([("Fasting tests (sugar, lipids): nothing to eat for 8–12 hours; water is fine", "फ़ास्टिंग जाँच (शुगर, लिपिड): 8–12 घंटे कुछ न खाएँ; पानी पी सकते हैं"), ("Post-meal sugar: test 2 hours after starting your meal", "खाने के बाद शुगर: खाना शुरू करने के 2 घंटे बाद जाँच"), ("Take your usual medicines unless the doctor says otherwise", "डॉक्टर मना न करें तो अपनी रोज़ की दवा लें"), ("Bring your AHS Patient ID (on your earlier report or card) each time", "हर बार अपनी AHS पेशेंट ID लाएँ (पुरानी रिपोर्ट या कार्ड पर)")])}</div>
          {b.wa_form("Lab test booking", ("Book a test or home collection", "जाँच या घर से कलेक्शन बुक करें"), b.text_field("lab-tests", ("Tests needed", "कौन सी जाँच"), "Tests", "e.g. sugar, HbA1c, thyroid") + b.select_field("lab-where", ("Where", "कहाँ"), "Collection", [("At the lab", "लैब में"), ("Home collection", "घर से कलेक्शन")]), form_title="Lab test booking")}
        </div>""")
    out += b.section(b.head(("Questions", "सवाल"), ("Frequently asked", "अक्सर पूछे जाने वाले सवाल")) + "\n" + b.faq([
        (("Do I get the integrated report automatically?", "क्या इंटीग्रेटेड रिपोर्ट अपने आप मिलती है?"), ("Yes, from your second test onwards. Your results are linked through your AHS Patient ID.", "हाँ, दूसरी जाँच से। आपके नतीजे आपकी AHS पेशेंट ID से जुड़े रहते हैं।")),
        (("What is my Patient ID? I've lost it.", "मेरी पेशेंट ID क्या है? खो गई है।"), ("It's printed on every AHS report and registration slip. If you can't find it, our front desk can look it up for you.", "यह हर AHS रिपोर्ट और रजिस्ट्रेशन पर्ची पर छपी होती है। न मिले तो रिसेप्शन पर हम ढूँढ देंगे।")),
        (("Can my old reports from another lab be added?", "क्या दूसरी लैब की पुरानी रिपोर्ट जोड़ी जा सकती है?"), ("The trend uses tests done at AHS Lab. Bring old reports to your doctor, who can compare them.", "रुझान AHS लैब की जाँचों से बनता है। पुरानी रिपोर्ट डॉक्टर को दिखाएँ, वे तुलना कर लेंगे।")),
        (("Is the lab really open at night?", "क्या लैब सच में रात में खुली रहती है?"), ("Yes. The pathology lab works 24×7, so emergency tests are never delayed.", "हाँ। पैथोलॉजी लैब 24×7 चलती है, ताकि इमरजेंसी जाँच में देरी न हो।"))]))
    out += b.cta_band(("Testing again? See your progress on one report.", "दोबारा जाँच? अपनी प्रगति एक ही रिपोर्ट में देखें।"), "Lab test booking")
    return out


PAGE = {
    "type": "about", "section": "serv", "icon": "🧪", "tone": "",
    "title": ("24×7 Pathology Lab", "24×7 पैथोलॉजी लैब"),
    "kicker": ("Services · Pathology", "सेवाएँ · पैथोलॉजी"),
    "h1": ("One report that shows <span class=\"fade\">your whole story.</span>", "एक रिपोर्ट जो दिखाए <span class=\"fade\">आपकी पूरी कहानी।</span>"),
    "lead": ("Our 24×7 lab gives you an integrated report: today's results printed next to your earlier ones, with the trend for each test. You and your doctor can see at a glance whether treatment is working.",
             "हमारी 24×7 लैब इंटीग्रेटेड रिपोर्ट देती है: आज के नतीजे पिछले नतीजों के साथ, हर जाँच के रुझान के साथ। आप और आपके डॉक्टर एक नज़र में देख सकते हैं कि इलाज असर कर रहा है या नहीं।"),
    "badges": [("red", ("Open 24×7", "24×7 खुली")), ("blue", ("Integrated trend report", "इंटीग्रेटेड ट्रेंड रिपोर्ट")), ("green", ("Home collection", "घर से कलेक्शन"))],
    "facts": [(("Hours", "समय"), "24×7"), (("Report", "रिपोर्ट"), ("Integrated, with trends", "इंटीग्रेटेड, रुझान के साथ")), (("Delivery", "भेजना"), "WhatsApp"), (("Home collection", "घर से कलेक्शन"), ("Available", "उपलब्ध"))],
    "book": "Lab test booking",
    "body": lab_body,
}

"""Animated 'A baby's first days at AHS' story for the NICU / PICU page.

Six illustrated scenes (inline SVG + CSS animation) with a step list; main.js plays them.
"""

BABY = """<g class="baby">
  <ellipse cx="0" cy="10" rx="34" ry="17" fill="#fde2cf"/>
  <path d="M-30 4c10-16 50-16 62 2 4 8 0 18-8 22-16 6-40 6-52-2-6-6-6-14-2-22z" fill="#cfe9ff"/>
  <circle cx="-30" cy="2" r="15" fill="#f6c9a8"/>
  <path d="M-36 -2c2-2 5-2 6 0M-28 -2c2-2 5-2 6 0" stroke="#7a4a2a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M-33 7c2 2 5 2 7 0" stroke="#c46f5a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M-42 -8c4-6 14-8 20-4" stroke="#b07a52" stroke-width="2" fill="none" stroke-linecap="round"/>
</g>"""

MONITOR = lambda x, y, rows: (  # noqa: E731
    f'<g transform="translate({x} {y})"><rect width="116" height="78" rx="8" fill="#04070c" stroke="#1c2736"/>'
    + "".join(f'<text x="10" y="{20 + i * 20}" class="mon-k">{k}</text><text x="106" y="{20 + i * 20}" text-anchor="end" class="mon-v mon-v--{c}"{a}>{v}</text>'
              for i, (k, v, c, a) in enumerate(rows))
    + '</g>')

SCENES = [
    # 1 operation theatre
    ("ot", ("Safe delivery", "सुरक्षित प्रसव"),
     ("In our operation theatre, the surgical team delivers the baby safely, with the newborn team ready.", "हमारे ऑपरेशन थिएटर में सर्जिकल टीम सुरक्षित प्रसव कराती है, नवजात टीम पहले से तैयार रहती है।"),
     """<g class="ot-light"><ellipse cx="200" cy="34" rx="70" ry="16" fill="#e8f3ff"/><ellipse cx="200" cy="34" rx="46" ry="9" fill="#fff"/>
        <path d="M150 50 L110 230 L290 230 L250 50 Z" class="beam"/></g>
      <rect x="90" y="196" width="220" height="12" rx="6" fill="#9db4cc"/><rect x="190" y="208" width="20" height="60" fill="#7f98b3"/>
      <circle cx="118" cy="180" r="15" fill="#f1c7a6"/><path d="M106 172c6-10 20-10 26 0" fill="#5a3a2a"/>
      <path d="M132 176 h150 a16 16 0 0 1 0 22 h-150 z" fill="#2fa36b"/>
      <path d="M176 176 v-30 h10 v30" fill="#2fa36b" opacity=".9"/>
      <g class="surgeon"><circle cx="250" cy="110" r="14" fill="#f1c7a6"/><path d="M236 104h28v-6a14 14 0 0 0-28 0z" fill="#2a63cc"/>
        <rect x="240" y="112" width="20" height="8" rx="3" fill="#cfe9ff"/><path d="M226 172c0-26 10-44 24-44s24 18 24 44z" fill="#2a63cc"/>
        <path d="M232 150 l-18 22 M268 150 l16 20" stroke="#cfe9ff" stroke-width="7" stroke-linecap="round"/></g>
      <g class="surgeon s2"><circle cx="140" cy="104" r="13" fill="#e4b896"/><path d="M127 98h26v-6a13 13 0 0 0-26 0z" fill="#19c3e6"/>
        <rect x="131" y="106" width="18" height="7" rx="3" fill="#e8f3ff"/><path d="M118 164c0-24 9-40 22-40s22 16 22 40z" fill="#19c3e6"/></g>
      <g class="beat-dot"><circle cx="330" cy="70" r="5" fill="#2fe08a"/></g>"""),
    # 2 first cry
    ("cry", ("First cry, first check", "पहली किलकारी, पहली जाँच"),
     ("The baby is dried, wrapped warmly and checked straight away by our nurses and doctors.", "बच्चे को सुखाकर गर्म कपड़े में लपेटा जाता है और नर्स व डॉक्टर तुरंत जाँच करते हैं।"),
     """<circle cx="200" cy="150" r="96" fill="#eaf6ff"/>
      <g transform="translate(206 162) scale(1.6)">""" + BABY + """</g>
      <path d="M120 210c20 24 140 24 160 0" stroke="#2a63cc" stroke-width="16" fill="none" stroke-linecap="round" opacity=".9"/>
      <g class="cry"><path d="M120 120c-10 10-10 26 0 36"/><path d="M106 110c-16 16-16 40 0 56"/><path d="M92 100c-22 22-22 54 0 76"/></g>
      <g class="heart-pop"><path d="M296 92c-8-12-28-4-20 10l20 18 20-18c8-14-12-22-20-10z" fill="#e5383b"/></g>"""),
    # 3 radiant warmer
    ("warmer", ("Radiant warmer", "रेडिएंट वार्मर"),
     ("Newborns lose heat fast. Under a radiant warmer, a skin probe keeps the baby's temperature in the safe range.", "नवजात जल्दी ठंडे हो जाते हैं। रेडिएंट वार्मर के नीचे स्किन प्रोब बच्चे का तापमान सुरक्षित सीमा में रखता है।"),
     """<rect x="60" y="30" width="200" height="22" rx="8" fill="#c9d6e3"/><rect x="74" y="50" width="172" height="8" rx="4" class="heater"/>
      <rect x="256" y="40" width="8" height="200" fill="#9db4cc"/>
      <g class="waves"><path d="M100 76c8 10-8 20 0 30s-8 20 0 30"/><path d="M160 76c8 10-8 20 0 30s-8 20 0 30"/><path d="M220 76c8 10-8 20 0 30s-8 20 0 30"/></g>
      <rect x="64" y="186" width="192" height="16" rx="8" fill="#e8f3ff" stroke="#9db4cc"/>
      <path d="M64 186 v-26 M256 186 v-26" stroke="#cfe9ff" stroke-width="4"/>
      <g transform="translate(166 172)">""" + BABY + """</g>
      <path d="M176 180 C 210 200, 250 210, 280 156" stroke="#ffd23f" stroke-width="2" fill="none"/><circle cx="176" cy="180" r="3" fill="#ffd23f"/>
      """ + MONITOR(276, 96, [("SKIN °C", '<tspan class="temp-count" data-from="35.9" data-to="36.8">36.8</tspan>', "y", ""), ("RANGE", "36.5–37.5", "w", ""), ("HEATER", "AUTO", "g", "")]) + """
      <rect x="306" y="182" width="56" height="18" rx="9" class="safe-pill"/><text x="334" y="195" text-anchor="middle" class="safe-txt">SAFE</text>"""),
    # 4 phototherapy
    ("photo", ("Phototherapy for jaundice", "पीलिया के लिए फ़ोटोथेरेपी"),
     ("If the baby has newborn jaundice, a special blue light helps clear it, with eye shields for protection.", "बच्चे को पीलिया हो तो विशेष नीली रोशनी उसे ठीक करने में मदद करती है, आँखों पर सुरक्षा पट्टी के साथ।"),
     """<rect x="70" y="40" width="220" height="26" rx="10" fill="#c9d6e3"/><rect x="84" y="64" width="192" height="8" rx="4" fill="#5aa9ff"/>
      <path d="M84 72 L60 200 L300 200 L276 72 Z" class="blue-glow"/>
      <rect x="70" y="200" width="220" height="16" rx="8" fill="#e8f3ff" stroke="#9db4cc"/>
      <g transform="translate(186 186)">""" + BABY + """<rect x="-42" y="-6" width="24" height="7" rx="3.5" fill="#1d3550"/></g>
      <g class="sparkle"><circle cx="120" cy="120" r="3"/><circle cx="240" cy="110" r="2.5"/><circle cx="200" cy="140" r="2"/><circle cx="150" cy="150" r="2.5"/></g>"""),
    # 5 monitoring
    ("monitor", ("Watched 24×7", "24×7 निगरानी"),
     ("Heart rate, oxygen, breathing and temperature are monitored round the clock by trained NICU nurses.", "धड़कन, ऑक्सीजन, सांस और तापमान पर प्रशिक्षित NICU नर्सें चौबीसों घंटे नज़र रखती हैं।"),
     """<rect x="40" y="40" width="200" height="140" rx="12" fill="#04070c" stroke="#1c2736"/>
      <path class="ecg-mini" d="M52 100 H96 l6 -18 l8 36 l6 -26 l5 8 H150 l6 -18 l8 36 l6 -26 l5 8 H228"/>
      <text x="56" y="62" class="mon-k">HR</text><text x="120" y="62" class="mon-v mon-v--g">142</text>
      <text x="56" y="160" class="mon-k">SpO₂</text><text x="110" y="160" class="mon-v mon-v--c">97%</text>
      <text x="150" y="160" class="mon-k">TEMP</text><text x="228" y="160" text-anchor="end" class="mon-v mon-v--y">36.8°</text>
      <g class="nurse"><circle cx="304" cy="96" r="16" fill="#e4b896"/><path d="M288 90h32v-6a16 16 0 0 0-32 0z" fill="#fff" stroke="#e5383b" stroke-width="2"/>
        <path d="M276 186c0-34 12-56 28-56s28 22 28 56z" fill="#fff"/><path d="M298 140h12M304 134v12" stroke="#e5383b" stroke-width="3"/>
        <path d="M282 150 l-26 -12" stroke="#fff" stroke-width="8" stroke-linecap="round"/></g>
      <rect x="40" y="232" width="320" height="14" rx="7" fill="#e8f3ff"/>
      <g transform="translate(220 222)">""" + BABY + """</g>"""),
    # 6 home
    ("home", ("Healthy and home", "स्वस्थ होकर घर"),
     ("Before discharge, we teach feeding, warmth and kangaroo care, and set the follow-up and vaccine dates.", "छुट्टी से पहले हम दूध पिलाना, गर्म रखना और कंगारू केयर सिखाते हैं, और फ़ॉलो-अप व टीकों की तारीख़ तय करते हैं।"),
     """<path d="M80 230 V140 L200 70 L320 140 V230 Z" fill="#eaf6ff"/><path d="M64 146 L200 64 L336 146" stroke="#2a63cc" stroke-width="10" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="200" cy="120" r="20" fill="#e4b896"/><path d="M180 116c0-18 40-18 40 0v-8c0-20-40-20-40 0z" fill="#3a2418"/>
      <path d="M160 230c0-50 18-82 40-82s40 32 40 82z" fill="#e5383b" opacity=".85"/>
      <g transform="translate(212 178) scale(.9)">""" + BABY + """</g>
      <g class="hearts"><path d="M262 92c-6-9-21-3-15 8l15 13 15-13c6-11-9-17-15-8z" fill="#e5383b"/><path d="M128 104c-4-6-14-2-10 5l10 9 10-9c4-7-6-11-10-5z" fill="#ff8fa3"/></g>"""),
]


def story_html(L):
    scenes = ""
    steps = ""
    for i, (key, title, cap, svg) in enumerate(SCENES):
        scenes += (f'<div class="nstory__scene nstory__scene--{key}{" on" if i == 0 else ""}" data-i="{i}">'
                   f'<svg viewBox="0 0 400 260" aria-hidden="true">{svg}</svg></div>')
        steps += (f'<li><button type="button" data-i="{i}"{" aria-current=\"step\"" if i == 0 else ""}>'
                  f'<span class="nstory__n">{i + 1}</span><span class="nstory__t"><b>{L(title)}</b><small>{L(cap)}</small></span>'
                  f'<span class="nstory__bar" aria-hidden="true"><i></i></span></button></li>')
    return f"""      <section class="panel panel--dark nstory" aria-label="A baby's first days at AHS">
        <div class="sec-head"><div><span class="kicker">{L(("A baby's first days at AHS", "AHS में बच्चे के पहले दिन"))}</span>
          <h2>{L(("From the first cry to going home", "पहली किलकारी से घर जाने तक"))}</h2></div>
          <button type="button" class="pill nstory__toggle" aria-pressed="false"><span class="nstory__pause">{L(("Pause", "रोकें"))}</span><span class="nstory__play">{L(("Play", "चलाएँ"))}</span></button></div>
        <div class="nstory__grid">
          <div class="nstory__stage">{scenes}</div>
          <ol class="nstory__steps">{steps}</ol>
        </div>
      </section>
"""

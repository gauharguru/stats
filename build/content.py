"""Page content for AHS Global Hospital inner pages (English, Hindi).

Each text value is either a plain string (same in both languages) or an (English, Hindi) tuple.
Edit this file and run `python3 build/build.py` to regenerate the pages.
"""

PHONE = "99428 15500"

import content_more as _more  # noqa: E402

# Ayushman Bharat coverage at AHS (confirmed by the hospital)
AB_YES = ("green", ("Covered under Ayushman Bharat", "आयुष्मान भारत में शामिल"))
OPEN_247 = ("red", ("Open 24×7", "24×7 खुला"))
OPD_CALL = (("OPD timings", "ओपीडी समय"), ("Call " + PHONE, "कॉल करें " + PHONE))
AB_FACT = (("Ayushman Bharat", "आयुष्मान भारत"), ("Covered", "शामिल"))

DIRECTOR = {
    "name": "Dr Kamran ul Haque",
    "photo": "assets/img/dr-kamran-ul-haque.jpg",
    "quals": "MBBS, MD (Emergency Medicine)",
    "role": ("Director · Emergency Medicine · Formerly at Max Hospital, Delhi", "निदेशक · इमरजेंसी मेडिसिन · पूर्व में मैक्स हॉस्पिटल, दिल्ली"),
    "opd": ("OPD: Mon – Fri, 11:30 AM – 3:00 PM", "ओपीडी: सोम – शुक्र, सुबह 11:30 – दोपहर 3:00"),
    "book": "OPD — Dr Kamran ul Haque (Emergency Medicine)",
}
OPD_ASK = ("OPD: call for timings", "ओपीडी: समय के लिए कॉल करें")


def doc(name, quals, dept, dept_hi):
    return {"name": name, "quals": quals, "role": (dept, dept_hi), "opd": OPD_ASK,
            "book": f"OPD — {name} ({dept})"}


DR_SHREYA = doc("Dr Shreya", "MBBS, MD (Medicine)", "General Medicine", "जनरल मेडिसिन")
DR_ARUN = doc("Dr Arun Kumar Thakur", "MBBS, MS (General Surgery)", "General Surgery", "जनरल सर्जरी")
DR_DEEPAK = doc("Dr Deepak", "MBBS, MD (Paediatrics)", "Paediatrics", "शिशु रोग")
DR_NAGMANI = doc("Dr Nag Mani", "MBBS, DCH", "Child Specialist", "शिशु रोग विशेषज्ञ")
DR_AURANJAN = doc("Dr Auranjan", "MBBS, D-Ortho", "Orthopaedics", "हड्डी रोग")
DR_ANWAR = doc("Dr Anwar", "MBBS, D-Ortho", "Orthopaedics", "हड्डी रोग")
DR_MERAJ = doc("Dr Meraj", "MBBS, D-ENT", "ENT (Ear, Nose &amp; Throat)", "ENT (नाक, कान, गला)")

# Order shown on the homepage
DOCTORS = [DIRECTOR, DR_SHREYA, DR_ARUN, DR_DEEPAK, DR_NAGMANI, DR_AURANJAN, DR_ANWAR, DR_MERAJ]

PAGES = {}

# =====================================================================
# TREATMENTS
# =====================================================================
PAGES["emergency"] = {
    "type": "treatment", "section": "treat", "icon": "🚑", "visual": "ecg",
    "title": ("24×7 Emergency", "24×7 इमरजेंसी"),
    "kicker": ("Emergency Medicine · Open 24×7", "आपातकालीन चिकित्सा · 24×7 खुला"),
    "h1": ("Emergency care, <span class=\"fade\">every minute of the day.</span>", "इमरजेंसी इलाज, <span class=\"fade\">दिन-रात हर मिनट।</span>"),
    "lead": ("Accidents, chest pain, breathing trouble, high fever or poisoning — come straight to AHS Emergency on Tajpur Road. Doctors are on duty round the clock, with ICU, portable X-ray, lab and pharmacy open 24×7.",
             "दुर्घटना, सीने में दर्द, सांस की तकलीफ़, तेज़ बुखार या ज़हर — सीधे ताजपुर रोड पर AHS इमरजेंसी आएँ। डॉक्टर चौबीसों घंटे ड्यूटी पर हैं, ICU, पोर्टेबल एक्स-रे, लैब और फ़ार्मेसी 24×7 खुले हैं।"),
    "badges": [OPEN_247, AB_YES, ("blue", ("PM-RAHAT: cashless for road accidents", "PM-RAHAT: सड़क दुर्घटना में कैशलेस"))],
    "book": "Emergency — call back",
    "redflags_first": True,
    "redflags": {
        "title": ("Come to Emergency immediately if there is", "इनमें से कुछ भी हो तो तुरंत इमरजेंसी आएँ"),
        "items": [("Chest pain or pressure", "सीने में दर्द या दबाव"), ("Difficulty breathing", "सांस लेने में तकलीफ़"),
                  ("Unconsciousness, fits or sudden weakness of one side", "बेहोशी, दौरा या शरीर के एक तरफ़ अचानक कमज़ोरी"),
                  ("Heavy bleeding or a serious injury", "ज़्यादा खून बहना या गंभीर चोट"),
                  ("Poisoning, snake bite or burns", "ज़हर, सांप का काटना या जलना")],
    },
    "treat_title": ("Every emergency, adult or child", "हर इमरजेंसी, बड़े या बच्चे"),
    "conditions": [("Road accidents &amp; trauma", "सड़क दुर्घटना व ट्रॉमा"), ("Chest pain", "सीने में दर्द"), ("Breathlessness &amp; asthma attacks", "सांस फूलना व अस्थमा"),
                   ("Stroke symptoms", "लकवे के लक्षण"), ("Fits / seizures", "दौरा / मिर्गी"), ("High fever", "तेज़ बुखार"),
                   ("Poisoning &amp; snake bite", "ज़हर व सांप का काटना"), ("Burns", "जलना"), ("Fractures", "फ्रैक्चर"),
                   ("Severe vomiting &amp; dehydration", "तेज़ उल्टी व पानी की कमी"), ("Sick newborns &amp; children", "बीमार नवजात व बच्चे")],
    "care_title": ("Everything an emergency needs, under one roof", "इमरजेंसी की हर ज़रूरत, एक ही छत के नीचे"),
    "care": [("🫀", ("ICU", "ICU"), ("Continuous monitoring for critically ill patients.", "गंभीर मरीज़ों की लगातार निगरानी।")),
             ("👶", ("NICU · PICU", "NICU · PICU"), ("Intensive care for newborns and children, 24×7.", "नवजात व बच्चों की गहन चिकित्सा, 24×7।")),
             ("🩻", ("Portable X-ray", "पोर्टेबल एक्स-रे"), ("X-ray at the bedside, without moving the patient.", "मरीज़ को हिलाए बिना बेड पर एक्स-रे।")),
             ("🧪", ("24×7 Pathology", "24×7 पैथोलॉजी"), ("Blood tests any time of the night.", "रात में किसी भी समय खून की जाँच।")),
             ("💊", ("24×7 Pharmacy", "24×7 फ़ार्मेसी"), ("Emergency medicines inside the hospital.", "अस्पताल के अंदर ही इमरजेंसी दवाएँ।")),
             ("🩺", ("Operation theatre", "ऑपरेशन थिएटर"), ("Emergency surgery, including laparoscopic surgery.", "इमरजेंसी सर्जरी, लैप्रोस्कोपिक सर्जरी सहित।"))],
    "team": "note",
    "ayushman": True,
    "faq": [(("Do I need an appointment for Emergency?", "क्या इमरजेंसी के लिए अपॉइंटमेंट चाहिए?"),
             ("No. Emergency is open 24×7 — just come in. You can call " + PHONE + " on the way so we're ready.", "नहीं। इमरजेंसी 24×7 खुली है — सीधे आएँ। रास्ते में " + PHONE + " पर कॉल करें ताकि हम तैयार रहें।")),
            (("Is a road accident treated free?", "क्या सड़क दुर्घटना का इलाज मुफ्त है?"),
             ("Under PM-RAHAT, road-accident victims get cashless treatment up to ₹1.5 lakh for 7 days from the accident. See the PM-RAHAT page for details.", "PM-RAHAT के तहत सड़क दुर्घटना पीड़ितों को दुर्घटना से 7 दिनों तक ₹1.5 लाख तक कैशलेस इलाज मिलता है। विवरण PM-RAHAT पेज पर देखें।")),
            (("Can I use my Ayushman card in Emergency?", "क्या इमरजेंसी में आयुष्मान कार्ड चलेगा?"),
             ("Yes. Emergency Medicine is covered under Ayushman Bharat at AHS. Bring your Ayushman card or Aadhaar.", "हाँ। AHS में आपातकालीन चिकित्सा आयुष्मान भारत में शामिल है। आयुष्मान कार्ड या आधार साथ लाएँ।"))],
    "related": ["pm-rahat", "nicu-picu", "doorstep-xray", "general-surgery"],
}

PAGES["nicu-picu"] = {
    "type": "treatment", "section": "treat", "icon": "👶", "tone": "", "story": True,
    "title": ("24×7 NICU / PICU", "24×7 NICU / PICU"),
    "kicker": ("Newborn &amp; Paediatric Intensive Care", "नवजात व शिशु गहन चिकित्सा"),
    "h1": ("Intensive care for the smallest patients, <span class=\"fade\">day and night.</span>", "सबसे नन्हे मरीज़ों की गहन देखभाल, <span class=\"fade\">दिन-रात।</span>"),
    "lead": ("Our NICU looks after newborns who are premature, underweight or unwell. Our PICU cares for older babies and children who need close monitoring. Both are open 24×7.",
             "हमारा NICU समय से पहले जन्मे, कम वज़न वाले या बीमार नवजातों की देखभाल करता है। PICU बड़े शिशुओं और बच्चों के लिए है जिन्हें लगातार निगरानी चाहिए। दोनों 24×7 खुले हैं।"),
    "badges": [OPEN_247, AB_YES],
    "facts": [(("NICU", "NICU"), ("Newborns", "नवजात")), (("PICU", "PICU"), ("Infants &amp; children", "शिशु व बच्चे")), (("Availability", "उपलब्धता"), ("24×7", "24×7")), AB_FACT],
    "book": "NICU / PICU enquiry",
    "redflags": {
        "title": ("Bring your baby to Emergency if you see", "ये लक्षण दिखें तो बच्चे को तुरंत लाएँ"),
        "items": [("Fast or difficult breathing, or bluish lips", "तेज़ या कठिन सांस, या होंठ नीले पड़ना"), ("Not feeding, or very sleepy and hard to wake", "दूध न पीना, या बहुत सुस्त रहना"),
                  ("Fits or stiffening", "दौरा या शरीर अकड़ना"), ("Yellow skin in the first days of life", "जन्म के शुरुआती दिनों में पीलिया"),
                  ("High fever in a baby under 3 months", "3 महीने से छोटे बच्चे को तेज़ बुखार")],
    },
    "treat_title": ("Common reasons for NICU / PICU care", "NICU / PICU में भर्ती के आम कारण"),
    "conditions": [("Premature birth", "समय से पहले जन्म"), ("Low birth weight", "कम जन्म वज़न"), ("Newborn jaundice", "नवजात पीलिया"),
                   ("Breathing difficulty", "सांस की तकलीफ़"), ("Infections &amp; sepsis", "संक्रमण व सेप्सिस"), ("Feeding problems", "दूध पीने में दिक्कत"),
                   ("Severe pneumonia", "गंभीर निमोनिया"), ("Dehydration", "पानी की कमी"), ("Fits in children", "बच्चों में दौरे")],
    "care_title": ("Round-the-clock care for your child", "आपके बच्चे की चौबीसों घंटे देखभाल"),
    "care": [("🌡️", ("Warmers &amp; incubation", "वार्मर व इन्क्यूबेशन"), ("Keeping small babies at the right temperature.", "छोटे बच्चों को सही तापमान में रखना।")),
             ("💡", ("Phototherapy", "फ़ोटोथेरेपी"), ("Light treatment for newborn jaundice.", "नवजात पीलिया के लिए लाइट थेरेपी।")),
             ("📈", ("Continuous monitoring", "लगातार निगरानी"), ("Heart rate, oxygen and breathing watched constantly.", "धड़कन, ऑक्सीजन और सांस पर लगातार नज़र।")),
             ("🫁", ("Oxygen support", "ऑक्सीजन सपोर्ट"), ("For babies and children who struggle to breathe.", "सांस में तकलीफ़ वाले बच्चों के लिए।")),
             ("🧪", ("24×7 lab &amp; X-ray", "24×7 लैब व एक्स-रे"), ("Tests and bedside X-ray without moving your child.", "बच्चे को हिलाए बिना जाँच व बेड पर एक्स-रे।"))],
    "team": "note",
    "ayushman": True,
    "faq": [(("Can parents stay with the baby?", "क्या माता-पिता बच्चे के पास रह सकते हैं?"),
             ("Parents can visit and feed their baby as the care team advises. Our nurses will explain visiting times when your baby is admitted.", "देखभाल टीम की सलाह के अनुसार माता-पिता मिल सकते हैं और दूध पिला सकते हैं। भर्ती के समय नर्स मिलने का समय बताएँगी।")),
            (("Is NICU care covered under Ayushman Bharat?", "क्या NICU आयुष्मान भारत में शामिल है?"),
             ("Yes. Neonatal care is covered under Ayushman Bharat at AHS for eligible families.", "हाँ। AHS में पात्र परिवारों के लिए नवजात देखभाल आयुष्मान भारत में शामिल है।")),
            (("My baby was born elsewhere. Can you admit them?", "बच्चा कहीं और पैदा हुआ है, क्या आप भर्ती करेंगे?"),
             ("Yes. Call " + PHONE + " and bring your baby to AHS Emergency. Carry any birth or discharge papers you have.", "हाँ। " + PHONE + " पर कॉल करें और बच्चे को AHS इमरजेंसी लाएँ। जन्म या डिस्चार्ज के कागज़ साथ लाएँ।"))],
    "related": ["paediatrics", "child-care", "emergency", "ayushman-bharat"],
}

PAGES["general-medicine"] = {
    "type": "treatment", "section": "treat", "icon": "🫀",
    "title": ("General Medicine", "जनरल मेडिसिन"),
    "kicker": ("Department of General Medicine", "जनरल मेडिसिन विभाग"),
    "h1": ("Fever, BP, sugar and everything in between.", "बुखार, बीपी, शुगर — <span class=\"fade\">और बहुत कुछ।</span>"),
    "lead": ("Our physicians diagnose and treat common and long-term illnesses in adults — from seasonal fevers to diabetes and heart problems — with lab and X-ray in the same building.",
             "हमारे फ़िज़िशियन वयस्कों की आम और लंबी बीमारियों का इलाज करते हैं — मौसमी बुखार से लेकर डायबिटीज़ और दिल की बीमारी तक — लैब और एक्स-रे उसी इमारत में।"),
    "badges": [AB_YES],
    "facts": [OPD_CALL, (("Admission", "भर्ती"), ("Wards &amp; ICU", "वार्ड व ICU")), (("Lab", "लैब"), ("24×7", "24×7")), AB_FACT],
    "book": "Appointment — General Medicine",
    "redflags": {
        "title": ("Don't wait for OPD if there is", "इनमें ओपीडी का इंतज़ार न करें"),
        "items": [("Chest pain or breathlessness", "सीने में दर्द या सांस फूलना"), ("Very high fever with confusion", "तेज़ बुखार के साथ बेहोशी जैसी हालत"),
                  ("Very high or very low sugar", "बहुत ज़्यादा या बहुत कम शुगर")],
    },
    "treat_title": ("Conditions we treat", "हम इनका इलाज करते हैं"),
    "conditions": [("Fever, typhoid, malaria, dengue", "बुखार, टाइफ़ाइड, मलेरिया, डेंगू"), ("Diabetes", "डायबिटीज़"), ("High blood pressure", "हाई ब्लड प्रेशर"),
                   ("Heart problems", "दिल की बीमारी"), ("Asthma &amp; chest infections", "अस्थमा व छाती का संक्रमण"), ("Thyroid", "थायरॉइड"),
                   ("Stomach &amp; liver problems", "पेट व लिवर की बीमारी"), ("Kidney problems", "किडनी की बीमारी"), ("Anaemia &amp; weakness", "खून की कमी व कमज़ोरी"),
                   ("Joint pain &amp; arthritis", "जोड़ों का दर्द"), ("Infections", "संक्रमण")],
    "care_title": ("Diagnosis and treatment in one place", "जाँच और इलाज एक ही जगह"),
    "care": [("🩺", ("OPD consultation", "ओपीडी परामर्श"), ("Check-up, diagnosis and a clear treatment plan.", "जाँच, निदान और साफ़ इलाज योजना।")),
             ("🧪", ("Blood tests", "खून की जाँच"), ("Sugar, kidney, liver, thyroid and more — 24×7.", "शुगर, किडनी, लिवर, थायरॉइड आदि — 24×7।")),
             ("🩻", ("X-ray &amp; ultrasound", "एक्स-रे व अल्ट्रासाउंड"), ("Imaging in-house, with portable X-ray for bed-bound patients.", "अस्पताल में ही इमेजिंग, बिस्तर वाले मरीज़ों के लिए पोर्टेबल एक्स-रे।")),
             ("🛏️", ("Admission &amp; ICU", "भर्ती व ICU"), ("Ward care, and ICU when illness becomes serious.", "वार्ड में इलाज, और गंभीर होने पर ICU।")),
             ("💻", ("Follow-up on video", "वीडियो पर फ़ॉलो-अप"), ("Review reports with your doctor without travelling.", "बिना आए डॉक्टर से रिपोर्ट दिखाएँ।"))],
    "team": "note",
    "ayushman": True,
    "faq": [(("Do I need to be fasting for blood tests?", "क्या खून की जाँच के लिए खाली पेट आना है?"),
             ("Some tests, like fasting sugar and lipid profile, need 8–12 hours of fasting. Call us and we'll tell you for your test.", "कुछ जाँचों (जैसे फ़ास्टिंग शुगर, लिपिड) के लिए 8–12 घंटे खाली पेट रहना होता है। कॉल करें, हम बता देंगे।")),
            (("Can I get my sugar and BP checked regularly?", "क्या मैं नियमित शुगर और बीपी जाँच करा सकता हूँ?"),
             ("Yes. Book an OPD visit, or ask for a home visit through our Home Care and Elder Care services.", "हाँ। ओपीडी बुक करें, या होम केयर व एल्डर केयर सेवा से घर पर जाँच कराएँ।"))],
    "related": ["emergency", "elder-care", "virtual-consultation", "home-care"],
}

PAGES["general-surgery"] = {
    "type": "treatment", "section": "treat", "icon": "🩺", "tone": "dark",
    "title": ("General Surgery", "जनरल सर्जरी"),
    "kicker": ("General &amp; Laparoscopic Surgery", "जनरल व लैप्रोस्कोपिक सर्जरी"),
    "h1": ("Smaller cuts, <span class=\"fade\">faster recovery.</span>", "छोटे चीरे, <span class=\"fade\">जल्दी रिकवरी।</span>"),
    "lead": ("Our surgeons perform planned and emergency operations, including laparoscopic (keyhole) surgery, which means less pain, smaller scars and a shorter hospital stay.",
             "हमारे सर्जन योजनाबद्ध और इमरजेंसी ऑपरेशन करते हैं, जिसमें लैप्रोस्कोपिक (दूरबीन) सर्जरी भी शामिल है — कम दर्द, छोटे निशान और कम दिन अस्पताल में।"),
    "badges": [AB_YES, ("blue", ("Laparoscopic surgery", "लैप्रोस्कोपिक सर्जरी"))],
    "facts": [OPD_CALL, (("Laparoscopy", "लैप्रोस्कोपी"), ("Available", "उपलब्ध")), (("Emergency surgery", "इमरजेंसी सर्जरी"), ("24×7", "24×7")), AB_FACT],
    "book": "Appointment — General Surgery",
    "treat_title": ("Common operations", "आम ऑपरेशन"),
    "conditions": [("Gall bladder stones", "पित्ताशय की पथरी"), ("Appendix", "अपेंडिक्स"), ("Hernia", "हर्निया"), ("Piles, fissure &amp; fistula", "बवासीर, फ़िशर व भगंदर"),
                   ("Hydrocele", "हाइड्रोसील"), ("Lumps &amp; cysts", "गाँठ व सिस्ट"), ("Abscess &amp; wounds", "फोड़ा व घाव"), ("Injuries after accidents", "दुर्घटना की चोटें")],
    "care_title": ("From first visit to recovery", "पहली मुलाक़ात से रिकवरी तक"),
    "care": [("🔬", ("Laparoscopic surgery", "लैप्रोस्कोपिक सर्जरी"), ("Keyhole surgery through 3 small ports with a camera.", "कैमरे के साथ 3 छोटे छेदों से दूरबीन सर्जरी।")),
             ("🏥", ("Operation theatre", "ऑपरेशन थिएटर"), ("For planned and emergency operations.", "योजनाबद्ध व इमरजेंसी ऑपरेशन के लिए।")),
             ("🧪", ("Pre-operative tests", "ऑपरेशन से पहले जाँच"), ("Blood tests, X-ray and ultrasound in-house.", "खून की जाँच, एक्स-रे व अल्ट्रासाउंड अस्पताल में ही।")),
             ("🩹", ("Dressing at home", "घर पर ड्रेसिंग"), ("Post-operative dressing through Home Care.", "होम केयर से ऑपरेशन के बाद ड्रेसिंग।"))],
    "team": "note",
    "ayushman": True,
    "faq": [(("What is laparoscopic surgery?", "लैप्रोस्कोपिक सर्जरी क्या है?"),
             ("The surgeon works through 3 small cuts using a camera and fine instruments, instead of one large cut. Most patients have less pain and go home sooner.", "बड़े चीरे की जगह सर्जन कैमरे और बारीक उपकरणों से 3 छोटे छेदों से ऑपरेशन करते हैं। ज़्यादातर मरीज़ों को कम दर्द होता है और जल्दी छुट्टी मिलती है।")),
            (("Is surgery covered under Ayushman Bharat?", "क्या सर्जरी आयुष्मान भारत में शामिल है?"),
             ("Yes. General Surgery is covered under Ayushman Bharat at AHS for eligible families.", "हाँ। AHS में पात्र परिवारों के लिए जनरल सर्जरी आयुष्मान भारत में शामिल है।")),
            (("Do you offer robotic surgery?", "क्या रोबोटिक सर्जरी होती है?"),
             ("Not yet. Robotic surgery is planned for the future; we will announce it here when it starts.", "अभी नहीं। रोबोटिक सर्जरी भविष्य की योजना है; शुरू होने पर यहाँ बताया जाएगा।"))],
    "related": ["emergency", "home-care", "orthopaedics", "ayushman-bharat"],
}

PAGES["ent"] = {
    "type": "treatment", "section": "treat", "icon": "👂",
    "title": ("ENT", "ENT"),
    "kicker": ("Ear, Nose &amp; Throat", "नाक, कान, गला"),
    "h1": ("Ear, nose and throat care <span class=\"fade\">for all ages.</span>", "हर उम्र के लिए <span class=\"fade\">नाक, कान, गले का इलाज।</span>"),
    "lead": ("From ear pain and blocked sinuses to tonsils and hearing problems, our ENT team treats adults and children, with surgery when it's needed.",
             "कान दर्द, बंद साइनस से लेकर टॉन्सिल और सुनने की समस्या तक, हमारी ENT टीम बड़ों और बच्चों का इलाज करती है, ज़रूरत पर सर्जरी भी।"),
    "badges": [AB_YES],
    "facts": [OPD_CALL, (("Adults &amp; children", "बड़े व बच्चे"), ("Yes", "हाँ")), AB_FACT],
    "book": "Appointment — ENT",
    "treat_title": ("Conditions we treat", "हम इनका इलाज करते हैं"),
    "conditions": [("Ear pain &amp; discharge", "कान दर्द व मवाद"), ("Hearing loss", "कम सुनाई देना"), ("Wax &amp; blocked ear", "कान में मैल"),
                   ("Sinusitis", "साइनस"), ("Nose bleeding", "नाक से खून"), ("Blocked nose &amp; allergies", "नाक बंद व एलर्जी"),
                   ("Tonsillitis", "टॉन्सिल"), ("Throat pain &amp; voice problems", "गले में दर्द व आवाज़ की समस्या"), ("Foreign body in ear or nose", "कान या नाक में कुछ फँसना")],
    "care_title": ("ENT care at AHS", "AHS में ENT इलाज"),
    "care": [("🩺", ("OPD examination", "ओपीडी जाँच"), ("Examination of ear, nose and throat.", "नाक, कान और गले की जाँच।")),
             ("🧹", ("Ear cleaning", "कान की सफ़ाई"), ("Safe removal of wax and foreign bodies.", "मैल व फँसी चीज़ को सुरक्षित निकालना।")),
             ("🏥", ("ENT surgery", "ENT सर्जरी"), ("Operations such as tonsil removal, when needed.", "ज़रूरत पर टॉन्सिल जैसे ऑपरेशन।"))],
    "team": "note",
    "ayushman": True,
    "faq": [(("My child keeps getting tonsillitis. What should I do?", "बच्चे को बार-बार टॉन्सिल होता है, क्या करें?"),
             ("Book an ENT visit. The doctor will check how often it happens and advise medicines or, in some cases, surgery.", "ENT ओपीडी बुक करें। डॉक्टर जाँच करके दवा या ज़रूरत हो तो सर्जरी की सलाह देंगे।")),
            (("Is ENT covered under Ayushman Bharat?", "क्या ENT आयुष्मान भारत में शामिल है?"),
             ("Yes. ENT is covered under Ayushman Bharat at AHS for eligible families.", "हाँ। AHS में पात्र परिवारों के लिए ENT आयुष्मान भारत में शामिल है।"))],
    "related": ["paediatrics", "general-surgery", "virtual-consultation", "ayushman-bharat"],
}

PAGES["paediatrics"] = {
    "type": "treatment", "section": "treat", "icon": "🧸",
    "title": ("Paediatrics", "शिशु रोग"),
    "kicker": ("Department of Paediatrics", "शिशु रोग विभाग"),
    "h1": ("Gentle care for babies <span class=\"fade\">and growing children.</span>", "शिशुओं और बढ़ते बच्चों की <span class=\"fade\">कोमल देखभाल।</span>"),
    "lead": ("Our paediatric team treats newborns, infants and children — from everyday fevers to serious illness — backed by a 24×7 NICU and PICU.",
             "हमारी शिशु रोग टीम नवजात, शिशुओं और बच्चों का इलाज करती है — रोज़मर्रा के बुखार से गंभीर बीमारी तक — 24×7 NICU और PICU के साथ।"),
    "badges": [AB_YES, ("red", ("NICU / PICU 24×7", "NICU / PICU 24×7"))],
    "facts": [OPD_CALL, (("NICU / PICU", "NICU / PICU"), ("24×7", "24×7")), (("Vaccination", "टीकाकरण"), ("Available", "उपलब्ध")), AB_FACT],
    "book": "Appointment — Paediatrics",
    "treat_title": ("Conditions we treat", "हम इनका इलाज करते हैं"),
    "conditions": [("Fever &amp; infections", "बुखार व संक्रमण"), ("Cough, cold &amp; pneumonia", "खांसी, ज़ुकाम व निमोनिया"), ("Diarrhoea &amp; vomiting", "दस्त व उल्टी"),
                   ("Newborn jaundice", "नवजात पीलिया"), ("Poor weight gain", "वज़न न बढ़ना"), ("Asthma &amp; wheezing", "अस्थमा व सांस में घरघराहट"),
                   ("Skin rashes", "त्वचा पर दाने"), ("Fits", "दौरे"), ("Malnutrition &amp; anaemia", "कुपोषण व खून की कमी")],
    "care_title": ("Care for every stage of childhood", "बचपन के हर पड़ाव की देखभाल"),
    "care": [("👶", ("Newborn check-ups", "नवजात जाँच"), ("Weight, feeding and jaundice checks.", "वज़न, दूध पीना और पीलिया की जाँच।")),
             ("💉", ("Vaccination", "टीकाकरण"), ("Routine childhood vaccines, on schedule.", "समय पर बच्चों के नियमित टीके।")),
             ("📏", ("Growth monitoring", "विकास की निगरानी"), ("Height, weight and development checks.", "लंबाई, वज़न और विकास की जाँच।")),
             ("🏥", ("Admission, NICU &amp; PICU", "भर्ती, NICU व PICU"), ("Ward care and intensive care, 24×7.", "वार्ड और गहन चिकित्सा, 24×7।"))],
    "team": "note",
    "ayushman": True,
    "faq": [(("When should I bring my child to Emergency instead of OPD?", "बच्चे को ओपीडी की जगह इमरजेंसी कब लाएँ?"),
             ("If your child has trouble breathing, a fit, is very drowsy, isn't drinking, or a baby under 3 months has fever — come to Emergency straight away.", "अगर बच्चे को सांस में तकलीफ़, दौरा, बहुत सुस्ती, पानी न पीना हो, या 3 महीने से छोटे बच्चे को बुखार हो — तुरंत इमरजेंसी लाएँ।")),
            (("Is Paediatrics covered under Ayushman Bharat?", "क्या शिशु रोग आयुष्मान भारत में शामिल है?"),
             ("Yes. Paediatrics and Neonatal care are covered under Ayushman Bharat at AHS.", "हाँ। AHS में शिशु रोग और नवजात देखभाल आयुष्मान भारत में शामिल हैं।"))],
    "related": ["nicu-picu", "child-care", "ent", "emergency"],
}

PAGES["orthopaedics"] = {
    "type": "treatment", "section": "treat", "icon": "🦴",
    "title": ("Orthopaedics", "हड्डी रोग"),
    "kicker": ("Bones, Joints &amp; Spine", "हड्डी, जोड़ व रीढ़"),
    "h1": ("Back on your feet, <span class=\"fade\">sooner.</span>", "फिर से अपने पैरों पर, <span class=\"fade\">जल्दी।</span>"),
    "lead": ("Fractures, sprains, joint pain and back pain — our orthopaedic team treats injuries and long-term bone problems, with X-ray available 24×7, even at your bedside or home.",
             "फ्रैक्चर, मोच, जोड़ों और कमर का दर्द — हमारी हड्डी रोग टीम चोट और लंबी हड्डी की बीमारियों का इलाज करती है, एक्स-रे 24×7, बेड या घर पर भी।"),
    "badges": [AB_YES, ("blue", ("X-ray 24×7", "एक्स-रे 24×7"))],
    "facts": [OPD_CALL, (("Fracture care", "फ्रैक्चर इलाज"), ("24×7 via Emergency", "इमरजेंसी से 24×7")), (("Portable X-ray", "पोर्टेबल एक्स-रे"), ("Home &amp; bedside", "घर व बेड पर")), AB_FACT],
    "book": "Appointment — Orthopaedics",
    "treat_title": ("Conditions we treat", "हम इनका इलाज करते हैं"),
    "conditions": [("Fractures", "फ्रैक्चर"), ("Sprains &amp; ligament injuries", "मोच व लिगामेंट की चोट"), ("Knee pain", "घुटने का दर्द"),
                   ("Back &amp; neck pain", "कमर व गर्दन दर्द"), ("Arthritis", "गठिया"), ("Shoulder pain", "कंधे का दर्द"),
                   ("Dislocations", "जोड़ उतरना"), ("Sports injuries", "खेल में चोट"), ("Bone infections", "हड्डी का संक्रमण")],
    "care_title": ("Fracture and joint care", "फ्रैक्चर व जोड़ों का इलाज"),
    "care": [("🩻", ("X-ray, any time", "एक्स-रे, कभी भी"), ("In-house and portable X-ray, 24×7.", "अस्पताल में व पोर्टेबल एक्स-रे, 24×7।")),
             ("🩼", ("Plaster &amp; splints", "प्लास्टर व स्प्लिंट"), ("For fractures and sprains.", "फ्रैक्चर और मोच के लिए।")),
             ("🏥", ("Fracture surgery", "फ्रैक्चर सर्जरी"), ("Operation when a fracture needs fixing.", "ज़रूरत पर फ्रैक्चर का ऑपरेशन।")),
             ("🏠", ("Physiotherapy at home", "घर पर फ़िज़ियोथेरेपी"), ("Recovery support through Home Care.", "होम केयर से रिकवरी में मदद।"))],
    "team": "note",
    "ayushman": True,
    "faq": [(("My elderly father fell and can't walk. Can you X-ray at home?", "बुज़ुर्ग पिता गिर गए और चल नहीं पा रहे, क्या घर पर एक्स-रे होगा?"),
             ("Yes. Our portable X-ray works 24×7 at home or bedside. Book Doorstep X-ray or call " + PHONE + ".", "हाँ। हमारा पोर्टेबल एक्स-रे 24×7 घर या बेड पर उपलब्ध है। डोरस्टेप एक्स-रे बुक करें या " + PHONE + " पर कॉल करें।")),
            (("Is Orthopaedics covered under Ayushman Bharat?", "क्या हड्डी रोग आयुष्मान भारत में शामिल है?"),
             ("Yes. Orthopaedics is covered under Ayushman Bharat at AHS for eligible families.", "हाँ। AHS में पात्र परिवारों के लिए हड्डी रोग आयुष्मान भारत में शामिल है।"))],
    "related": ["doorstep-xray", "emergency", "home-care", "elder-care"],
}

# =====================================================================
# SERVICES
# =====================================================================
AREA = (("Service area", "सेवा क्षेत्र"), ("Samastipur &amp; nearby", "समस्तीपुर व आसपास"))
CHARGES = (("Charges", "शुल्क"), ("Call for charges", "शुल्क के लिए कॉल करें"))

PAGES["virtual-consultation"] = {
    "type": "service", "section": "serv", "icon": "💻", "tone": "dark",
    "title": ("Virtual Consultation", "ऑनलाइन परामर्श"),
    "kicker": ("Services · Online", "सेवाएँ · ऑनलाइन"),
    "h1": ("See an AHS doctor <span class=\"fade\">without leaving home.</span>", "बिना घर से निकले <span class=\"fade\">AHS डॉक्टर से मिलें।</span>"),
    "lead": ("Talk to our doctors on a WhatsApp video call — for follow-ups, report reviews and problems that don't need an examination in person.",
             "व्हाट्सऐप वीडियो कॉल पर हमारे डॉक्टरों से बात करें — फ़ॉलो-अप, रिपोर्ट दिखाने और ऐसी समस्याओं के लिए जिनमें सामने जाँच ज़रूरी नहीं।"),
    "badges": [("blue", ("WhatsApp video", "व्हाट्सऐप वीडियो"))],
    "facts": [(("Mode", "माध्यम"), ("WhatsApp video call", "व्हाट्सऐप वीडियो कॉल")), (("Prescription", "पर्चा"), ("Sent on WhatsApp", "व्हाट्सऐप पर")), CHARGES],
    "book": "Virtual Consultation",
    "incl_title": ("A real consultation, on your phone", "आपके फ़ोन पर असली परामर्श"),
    "included": [("🎥", ("Video call with a doctor", "डॉक्टर से वीडियो कॉल"), ("At a booked time slot.", "तय समय पर।")),
                 ("📄", ("Report review", "रिपोर्ट दिखाना"), ("Share lab and X-ray reports before the call.", "कॉल से पहले लैब व एक्स-रे रिपोर्ट भेजें।")),
                 ("💊", ("Prescription", "पर्चा"), ("Sent to you on WhatsApp after the call.", "कॉल के बाद व्हाट्सऐप पर।")),
                 ("🏥", ("Next steps", "आगे क्या"), ("If you need tests or a visit, we'll book them.", "जाँच या मिलने की ज़रूरत हो तो हम बुक करेंगे।"))],
    "flow": [(("Book on WhatsApp", "व्हाट्सऐप पर बुक करें"), ("Tell us your problem and preferred time.", "समस्या और पसंदीदा समय बताएँ।")),
             (("Get a time slot", "समय तय होगा"), ("Our team confirms the doctor and time.", "टीम डॉक्टर व समय की पुष्टि करेगी।")),
             (("Video call", "वीडियो कॉल"), ("The doctor calls you on WhatsApp.", "डॉक्टर व्हाट्सऐप पर कॉल करेंगे।")),
             (("Prescription", "पर्चा"), ("Receive your prescription on WhatsApp.", "पर्चा व्हाट्सऐप पर पाएँ।"))],
    "who_title": ("Good for", "इनके लिए अच्छा"),
    "who": [("Follow-up after a hospital visit", "अस्पताल से लौटने के बाद फ़ॉलो-अप"), ("Showing test reports", "जाँच रिपोर्ट दिखाना"),
            ("Diabetes and BP check-ins", "शुगर व बीपी की नियमित सलाह"), ("Patients who live far away", "दूर रहने वाले मरीज़")],
    "notes": [("Not for emergencies. For chest pain, breathing trouble or injury, come to Emergency or call " + PHONE + ".", "इमरजेंसी के लिए नहीं। सीने में दर्द, सांस की तकलीफ़ या चोट में इमरजेंसी आएँ या " + PHONE + " पर कॉल करें।")],
    "form_title": ("Book a video consultation", "वीडियो परामर्श बुक करें"),
    "form_fields": ['<label for="vc-dept"><span class="en">Department</span><span class="hi">विभाग</span><select id="vc-dept" data-label="Department"><option>General Medicine</option><option>Paediatrics</option><option>General Surgery</option><option>Orthopaedics</option><option>ENT</option><option>Not sure</option></select></label>'],
    "faq": [(("Which app do I need?", "कौन सा ऐप चाहिए?"), ("Only WhatsApp. The doctor will video-call your WhatsApp number.", "सिर्फ़ व्हाट्सऐप। डॉक्टर आपके व्हाट्सऐप नंबर पर वीडियो कॉल करेंगे।")),
            (("Can the doctor prescribe medicines online?", "क्या डॉक्टर ऑनलाइन दवा लिख सकते हैं?"), ("Yes, where it's safe to do so without an examination. Otherwise the doctor will ask you to visit.", "हाँ, जहाँ बिना जाँच के सुरक्षित हो। वरना डॉक्टर अस्पताल आने को कहेंगे।"))],
    "related": ["general-medicine", "home-care", "elder-care", "paediatrics"],
}

PAGES["home-care"] = {
    "type": "service", "section": "serv", "icon": "🏠",
    "title": ("Home Care", "होम केयर"),
    "kicker": ("Services · At your home", "सेवाएँ · आपके घर पर"),
    "h1": ("Hospital care, <span class=\"fade\">at your doorstep.</span>", "अस्पताल जैसी देखभाल, <span class=\"fade\">आपके दरवाज़े पर।</span>"),
    "lead": ("Trained AHS nurses and staff visit your home for injections, dressings, catheter care, physiotherapy and more — so recovery can happen at home.",
             "प्रशिक्षित AHS नर्स व स्टाफ़ इंजेक्शन, ड्रेसिंग, कैथेटर केयर, फ़िज़ियोथेरेपी आदि के लिए घर आते हैं — ताकि रिकवरी घर पर ही हो सके।"),
    "badges": [("blue", ("Samastipur &amp; nearby", "समस्तीपुर व आसपास"))],
    "facts": [AREA, (("Booking", "बुकिंग"), ("WhatsApp or call", "व्हाट्सऐप या कॉल")), CHARGES],
    "book": "Home Care",
    "incl_title": ("What our team can do at home", "हमारी टीम घर पर क्या कर सकती है"),
    "included": [("💉", ("Injections &amp; IV drips", "इंजेक्शन व ड्रिप"), ("As prescribed by your doctor.", "डॉक्टर के पर्चे के अनुसार।")),
                 ("🩹", ("Wound dressing", "घाव की ड्रेसिंग"), ("After surgery or injury.", "ऑपरेशन या चोट के बाद।")),
                 ("🩺", ("Catheter &amp; tube care", "कैथेटर व ट्यूब केयर"), ("Changing and caring for catheters and feeding tubes.", "कैथेटर व फ़ीडिंग ट्यूब बदलना व देखभाल।")),
                 ("🏃", ("Physiotherapy", "फ़िज़ियोथेरेपी"), ("Exercises after fractures, surgery or stroke.", "फ्रैक्चर, सर्जरी या लकवे के बाद व्यायाम।")),
                 ("🧪", ("Sample collection", "सैंपल कलेक्शन"), ("Blood and urine samples collected at home.", "घर से खून व पेशाब का सैंपल।")),
                 ("👩‍⚕️", ("Nursing care", "नर्सिंग केयर"), ("Nurse visits for bed-bound patients.", "बिस्तर पर रहने वाले मरीज़ों के लिए नर्स।"))],
    "flow": [(("Book", "बुक करें"), ("Tell us the service, address and preferred time.", "सेवा, पता और समय बताएँ।")),
             (("We confirm", "हम पुष्टि करेंगे"), ("Our team calls to confirm details and charges.", "टीम कॉल करके विवरण व शुल्क बताएगी।")),
             (("We visit", "हम आएँगे"), ("A trained nurse or staff member visits your home.", "प्रशिक्षित नर्स या स्टाफ़ घर आएगा।")),
             (("Follow-up", "फ़ॉलो-अप"), ("Repeat visits and doctor review if needed.", "ज़रूरत हो तो दोबारा विज़िट व डॉक्टर सलाह।"))],
    "who_title": ("Helpful for", "इनके लिए मददगार"),
    "who": [("Patients recovering after surgery", "ऑपरेशन के बाद ठीक हो रहे मरीज़"), ("Bed-bound or elderly patients", "बिस्तर पर या बुज़ुर्ग मरीज़"),
            ("Long courses of injections", "लंबे समय तक इंजेक्शन"), ("Families who can't travel easily", "जिन परिवारों के लिए आना मुश्किल है")],
    "notes": [("Please keep your doctor's prescription ready for injections and medicines.", "इंजेक्शन व दवाओं के लिए डॉक्टर का पर्चा तैयार रखें।")],
    "form_title": ("Book a home visit", "होम विज़िट बुक करें"),
    "form_fields": ['<label for="hc-type"><span class="en">Service needed</span><span class="hi">कौन सी सेवा</span><select id="hc-type" data-label="Home care service"><option>Injection / IV drip</option><option>Wound dressing</option><option>Catheter / tube care</option><option>Physiotherapy</option><option>Sample collection</option><option>Nursing care</option><option>Other</option></select></label>',
                    '<label for="hc-addr"><span class="en">Address / area</span><span class="hi">पता / इलाका</span><input id="hc-addr" data-label="Address"></label>'],
    "faq": [(("Which areas do you cover?", "कौन से इलाकों में आते हैं?"), ("Samastipur and nearby areas. Call us to check your location.", "समस्तीपुर व आसपास के इलाके। अपना इलाका पूछने के लिए कॉल करें।")),
            (("How much does a visit cost?", "विज़िट का शुल्क कितना है?"), ("It depends on the service and distance. Our team will tell you the charges before confirming.", "यह सेवा और दूरी पर निर्भर है। पुष्टि से पहले टीम शुल्क बताएगी।"))],
    "related": ["elder-care", "doorstep-xray", "general-surgery", "virtual-consultation"],
}

PAGES["doorstep-xray"] = {
    "type": "service", "section": "serv", "icon": "🩻", "visual": "xray", "xray_story": True,
    "title": ("Doorstep X-ray", "घर पर एक्स-रे"),
    "kicker": ("Services · 24×7 portable X-ray", "सेवाएँ · 24×7 पोर्टेबल एक्स-रे"),
    "h1": ("The X-ray comes <span class=\"fade\">to the patient.</span>", "एक्स-रे मरीज़ के <span class=\"fade\">पास आता है।</span>"),
    "lead": ("Our portable X-ray unit reaches homes and hospital beds, 24×7 — for elderly, bed-ridden or injured patients who can't be moved. Lab samples can be collected on the same visit.",
             "हमारी पोर्टेबल एक्स-रे यूनिट घर और अस्पताल के बेड तक 24×7 पहुँचती है — उन बुज़ुर्ग, बिस्तर पर या घायल मरीज़ों के लिए जिन्हें हिलाया नहीं जा सकता। उसी विज़िट में लैब सैंपल भी लिया जा सकता है।"),
    "badges": [OPEN_247, ("blue", ("Samastipur &amp; nearby", "समस्तीपुर व आसपास"))],
    "book": "Doorstep X-ray",
    "incl_title": ("What's included", "क्या शामिल है"),
    "included": [("🩻", ("Digital X-ray at home", "घर पर डिजिटल एक्स-रे"), ("Chest, limbs, spine and more.", "छाती, हाथ-पैर, रीढ़ आदि।")),
                 ("🛏️", ("Bedside X-ray in hospital", "अस्पताल में बेड पर एक्स-रे"), ("For ICU and ward patients.", "ICU व वार्ड के मरीज़ों के लिए।")),
                 ("📱", ("Report on WhatsApp &amp; email", "रिपोर्ट व्हाट्सऐप व ईमेल पर"), ("Images and report sent to you.", "तस्वीरें व रिपोर्ट आपको भेजी जाएगी।")),
                 ("🧪", ("Lab samples too", "लैब सैंपल भी"), ("Blood and urine collected on the same visit.", "उसी विज़िट में खून व पेशाब का सैंपल।"))],
    "flow": [(("Call or WhatsApp", "कॉल या व्हाट्सऐप"), ("Share the doctor's advice and your address.", "डॉक्टर की सलाह और पता भेजें।")),
             (("Unit dispatched", "यूनिट रवाना"), ("Our team confirms timing and sets off.", "टीम समय बताकर निकलती है।")),
             (("X-ray taken", "एक्स-रे लिया गया"), ("At home or bedside, safely.", "घर या बेड पर, सुरक्षित।")),
             (("Report on WhatsApp &amp; email", "रिपोर्ट व्हाट्सऐप व ईमेल पर"), ("Share it with your doctor.", "अपने डॉक्टर को दिखाएँ।"))],
    "who_title": ("For patients who can't travel", "जो मरीज़ आ नहीं सकते"),
    "who": [("Elderly patients", "बुज़ुर्ग मरीज़"), ("Bed-ridden or paralysed patients", "बिस्तर पर या लकवाग्रस्त मरीज़"),
            ("Suspected fractures after a fall", "गिरने के बाद फ्रैक्चर का शक"), ("ICU and ward patients", "ICU व वार्ड के मरीज़")],
    "notes": [("Please share the doctor's advice slip if you have one. X-ray is not done during pregnancy unless a doctor advises it.", "डॉक्टर की पर्ची हो तो भेजें। गर्भावस्था में डॉक्टर की सलाह के बिना एक्स-रे नहीं किया जाता।")],
    "form_title": ("Book a home X-ray", "घर पर एक्स-रे बुक करें"),
    "form_fields": ['<label for="xr-part"><span class="en">X-ray of</span><span class="hi">किस हिस्से का एक्स-रे</span><input id="xr-part" data-label="X-ray of" placeholder="e.g. chest, hip, knee"></label>',
                    '<label for="xr-addr"><span class="en">Address / area</span><span class="hi">पता / इलाका</span><input id="xr-addr" data-label="Address"></label>'],
    "faq": [(("Is a home X-ray as good as one in hospital?", "क्या घर का एक्स-रे अस्पताल जितना अच्छा है?"), ("Portable X-ray gives clear images for most common needs such as chest and limb X-rays. Your doctor will advise if a hospital X-ray is needed.", "छाती, हाथ-पैर जैसे आम एक्स-रे के लिए पोर्टेबल एक्स-रे साफ़ तस्वीर देता है। ज़रूरत हो तो डॉक्टर अस्पताल में एक्स-रे की सलाह देंगे।")),
            (("Is it available at night?", "क्या रात में भी मिलता है?"), ("Yes, the portable X-ray service runs 24×7.", "हाँ, पोर्टेबल एक्स-रे सेवा 24×7 चलती है।"))],
    "related": ["orthopaedics", "elder-care", "home-care", "emergency"],
}

PAGES["elder-care"] = {
    "type": "service", "section": "serv", "icon": "🧓",
    "title": ("Elder Care", "बुज़ुर्गों की देखभाल"),
    "kicker": ("Services · For senior citizens", "सेवाएँ · वरिष्ठ नागरिकों के लिए"),
    "h1": ("Care for your parents, <span class=\"fade\">even when you're away.</span>", "आपके माता-पिता की देखभाल, <span class=\"fade\">आप दूर हों तब भी।</span>"),
    "lead": ("Regular health check-ups, nurse visits at home, physiotherapy and X-ray at home — booked in one place, with updates for the family on WhatsApp.",
             "नियमित हेल्थ चेकअप, घर पर नर्स, फ़िज़ियोथेरेपी और घर पर एक्स-रे — एक ही जगह बुकिंग, परिवार को व्हाट्सऐप पर अपडेट।"),
    "badges": [("green", ("Ayushman Vay Vandana for 70+", "70+ के लिए आयुष्मान वय वंदना"))],
    "facts": [AREA, (("Family updates", "परिवार को अपडेट"), ("On WhatsApp", "व्हाट्सऐप पर")), CHARGES],
    "book": "Elder Care",
    "incl_title": ("Support that fits your family", "आपके परिवार के अनुसार मदद"),
    "included": [("🩺", ("Regular check-ups", "नियमित चेकअप"), ("BP, sugar and general health at home.", "घर पर बीपी, शुगर व सामान्य जाँच।")),
                 ("👩‍⚕️", ("Nurse at home", "घर पर नर्स"), ("Injections, dressings and medicine support.", "इंजेक्शन, ड्रेसिंग व दवा में मदद।")),
                 ("🏃", ("Physiotherapy", "फ़िज़ियोथेरेपी"), ("For mobility, after falls or stroke.", "चलने-फिरने, गिरने या लकवे के बाद।")),
                 ("🩻", ("X-ray &amp; tests at home", "घर पर एक्स-रे व जाँच"), ("Portable X-ray 24×7 and sample collection.", "पोर्टेबल एक्स-रे 24×7 व सैंपल कलेक्शन।")),
                 ("💻", ("Video consultation", "वीडियो परामर्श"), ("Doctor advice without travelling.", "बिना आए डॉक्टर की सलाह।"))],
    "flow": [(("Tell us about your parent", "माता-पिता के बारे में बताएँ"), ("Health conditions, medicines and needs.", "बीमारी, दवाएँ और ज़रूरतें।")),
             (("We suggest a plan", "हम योजना सुझाएँगे"), ("One-time visit or regular visits.", "एक बार या नियमित विज़िट।")),
             (("Visits begin", "विज़िट शुरू"), ("Our team visits at the agreed times.", "तय समय पर टीम आएगी।")),
             (("Family stays informed", "परिवार को जानकारी"), ("Updates shared on WhatsApp.", "अपडेट व्हाट्सऐप पर।"))],
    "who_title": ("Especially helpful when", "ख़ास तौर पर तब"),
    "who": [("Children live in another city", "बच्चे दूसरे शहर में रहते हैं"), ("Parents can't travel easily", "माता-पिता के लिए आना मुश्किल है"),
            ("There are long-term illnesses like diabetes or BP", "डायबिटीज़ या बीपी जैसी लंबी बीमारी है"), ("Recovering after a fall, stroke or surgery", "गिरने, लकवे या ऑपरेशन के बाद रिकवरी")],
    "notes": [("Senior citizens aged 70 and above can get free treatment under Ayushman Bharat with the Ayushman Vay Vandana card, in the departments covered at AHS.", "70 वर्ष और उससे अधिक उम्र के बुज़ुर्ग आयुष्मान वय वंदना कार्ड से AHS के शामिल विभागों में आयुष्मान भारत के तहत मुफ्त इलाज पा सकते हैं।")],
    "form_title": ("Book elder care", "बुज़ुर्ग देखभाल बुक करें"),
    "form_fields": ['<label for="ec-type"><span class="en">What do you need?</span><span class="hi">क्या चाहिए?</span><select id="ec-type" data-label="Elder care need"><option>Health check-up at home</option><option>Regular nurse visits</option><option>Physiotherapy</option><option>X-ray / tests at home</option><option>Not sure — please call</option></select></label>',
                    '<label for="ec-age"><span class="en">Patient\'s age</span><span class="hi">मरीज़ की उम्र</span><input id="ec-age" data-label="Patient age" inputmode="numeric"></label>'],
    "faq": [(("Can I book for my parents from another city?", "क्या मैं दूसरे शहर से माता-पिता के लिए बुक कर सकता हूँ?"), ("Yes. Book with your number and add your parents' address and phone in the notes. We'll keep you updated on WhatsApp.", "हाँ। अपने नंबर से बुक करें और नोट में माता-पिता का पता व फ़ोन लिखें। हम व्हाट्सऐप पर अपडेट देंगे।")),
            (("What is the Ayushman Vay Vandana card?", "आयुष्मान वय वंदना कार्ड क्या है?"), ("It's the Ayushman Bharat card for all citizens aged 70+, regardless of income. See our Ayushman Bharat page for details.", "यह 70+ उम्र के सभी नागरिकों के लिए आयुष्मान भारत कार्ड है, आय चाहे जो हो। विवरण हमारे आयुष्मान भारत पेज पर।"))],
    "related": ["home-care", "doorstep-xray", "general-medicine", "ayushman-bharat"],
}

PAGES["child-care"] = {
    "type": "service", "section": "serv", "icon": "🍼", "tone": "red",
    "title": ("Child Care", "बच्चों की देखभाल"),
    "kicker": ("Services · For babies &amp; children", "सेवाएँ · शिशुओं व बच्चों के लिए"),
    "h1": ("Healthy beginnings, <span class=\"fade\">step by step.</span>", "स्वस्थ शुरुआत, <span class=\"fade\">कदम-दर-कदम।</span>"),
    "lead": ("Newborn check-ups, vaccinations, growth monitoring and care when your child is unwell — with a 24×7 NICU and PICU if more care is needed.",
             "नवजात जाँच, टीकाकरण, विकास की निगरानी और बीमारी में इलाज — ज़्यादा देखभाल चाहिए तो 24×7 NICU व PICU।"),
    "badges": [AB_YES, ("red", ("NICU / PICU 24×7", "NICU / PICU 24×7"))],
    "facts": [(("Vaccination", "टीकाकरण"), ("Available", "उपलब्ध")), (("NICU / PICU", "NICU / PICU"), ("24×7", "24×7")), AB_FACT],
    "book": "Child Care",
    "incl_title": ("Care for every stage", "हर पड़ाव की देखभाल"),
    "included": [("👶", ("Newborn check-ups", "नवजात जाँच"), ("Weight, feeding, jaundice and cord care.", "वज़न, दूध, पीलिया व नाल की देखभाल।")),
                 ("💉", ("Vaccinations", "टीकाकरण"), ("Routine childhood vaccines on schedule.", "समय पर बच्चों के नियमित टीके।")),
                 ("📏", ("Growth &amp; development", "विकास की निगरानी"), ("Height, weight and milestone checks.", "लंबाई, वज़न और विकास के पड़ाव।")),
                 ("🤒", ("Sick child visits", "बीमार बच्चे का इलाज"), ("Fever, cough, diarrhoea and more.", "बुखार, खांसी, दस्त आदि।")),
                 ("🥣", ("Nutrition advice", "पोषण सलाह"), ("Breastfeeding, weaning and diet.", "स्तनपान, ऊपरी आहार व खान-पान।"))],
    "flow": [(("Book", "बुक करें"), ("Tell us your child's age and need.", "बच्चे की उम्र और ज़रूरत बताएँ।")),
             (("Confirm a time", "समय तय करें"), ("Our team confirms the doctor and time.", "टीम डॉक्टर व समय बताएगी।")),
             (("Visit", "मिलें"), ("Bring the vaccination card if you have one.", "टीकाकरण कार्ड हो तो साथ लाएँ।")),
             (("Reminders", "याद दिलाना"), ("We remind you of the next vaccine on WhatsApp.", "अगला टीका व्हाट्सऐप पर याद दिलाएँगे।"))],
    "who_title": ("For", "किनके लिए"),
    "who": [("Newborns and infants", "नवजात व शिशु"), ("Children due for vaccines", "जिनका टीका बाकी है"), ("Children with fever, cough or tummy trouble", "बुखार, खांसी या पेट की तकलीफ़ वाले बच्चे"), ("Parents with questions about growth or feeding", "विकास या खान-पान के सवाल वाले माता-पिता")],
    "notes": [("If your child has trouble breathing, a fit, or is very drowsy, come to Emergency straight away.", "अगर बच्चे को सांस की तकलीफ़, दौरा या बहुत सुस्ती हो, तो तुरंत इमरजेंसी आएँ।")],
    "form_title": ("Book child care", "बच्चों की देखभाल बुक करें"),
    "form_fields": ['<label for="cc-type"><span class="en">Reason</span><span class="hi">कारण</span><select id="cc-type" data-label="Reason"><option>Newborn check-up</option><option>Vaccination</option><option>Child is unwell</option><option>Growth / nutrition advice</option></select></label>',
                    '<label for="cc-age"><span class="en">Child\'s age</span><span class="hi">बच्चे की उम्र</span><input id="cc-age" data-label="Child age" placeholder="e.g. 6 months"></label>'],
    "faq": [(("Which vaccines do you give?", "कौन से टीके लगते हैं?"), ("Routine childhood vaccines. Call us with your child's vaccination card and we'll tell you what's due.", "बच्चों के नियमित टीके। टीकाकरण कार्ड के साथ कॉल करें, हम बताएँगे कौन सा बाकी है।")),
            (("Is child care covered under Ayushman Bharat?", "क्या बच्चों का इलाज आयुष्मान में शामिल है?"), ("Treatment in Paediatrics and Neonatal care is covered under Ayushman Bharat at AHS for eligible families.", "AHS में पात्र परिवारों के लिए शिशु रोग व नवजात देखभाल का इलाज आयुष्मान भारत में शामिल है।"))],
    "related": ["paediatrics", "nicu-picu", "virtual-consultation", "emergency"],
}

# =====================================================================
# ABOUT US  (custom bodies)
# =====================================================================
def _about_body(b):
    L = b.L
    out = b.section(f"""        <div class="two">
          <div class="prose">
            <span class="kicker">{L(("Our story", "हमारी कहानी"))}</span>
            <h2 style="font-size:clamp(1.7rem,3.4vw,2.6rem);margin:10px 0 18px">{L(("Built so Samastipur doesn't have to travel far for care.", "ताकि समस्तीपुर को इलाज के लिए दूर न जाना पड़े।"))}</h2>
            <p>{L(("AHS Global Hospital is a multi-speciality hospital on Tajpur Road, Samastipur, run by the Sir Syed Educational &amp; Charitable Trust. We bring 24×7 emergency care, intensive care for adults, newborns and children, and modern diagnostics close to home.", "एएचएस ग्लोबल हॉस्पिटल समस्तीपुर के ताजपुर रोड पर एक मल्टी-स्पेशियलिटी अस्पताल है, जिसे सर सैयद एजुकेशनल एंड चैरिटेबल ट्रस्ट चलाता है। हम 24×7 इमरजेंसी, बड़ों, नवजातों व बच्चों की गहन चिकित्सा और आधुनिक जाँच घर के पास लाते हैं।"))}</p>
            <p>{L(("We are empanelled under Ayushman Bharat and PM-RAHAT, so families in need and road-accident victims can be treated without paying.", "हम आयुष्मान भारत और PM-RAHAT में सूचीबद्ध हैं, ताकि ज़रूरतमंद परिवारों और सड़क दुर्घटना पीड़ितों का इलाज बिना पैसे के हो सके।"))}</p>
            <p>{L(("AHS Global Hospital is also the parent teaching hospital of the AHS Nursing College, where nursing students train on our wards.", "एएचएस ग्लोबल हॉस्पिटल, एएचएस नर्सिंग कॉलेज का पैरेंट टीचिंग अस्पताल भी है, जहाँ नर्सिंग छात्र हमारे वार्डों में प्रशिक्षण लेते हैं।"))}</p>
          </div>
          <div class="contact__photo"><img src="assets/img/hospital-team.jpg" alt="AHS Global Hospital team" loading="lazy"></div>
        </div>""")
    out += b.section(b.head(("At a glance", "एक नज़र में"), ("AHS in numbers", "आंकड़ों में AHS")) + """
        <div class="stats">
          <div><b>100+</b><span>""" + L(("Beds", "बेड")) + """</span></div>
          <div><b>24×7</b><span>""" + L(("Emergency, ICU, NICU &amp; PICU", "इमरजेंसी, ICU, NICU व PICU")) + """</span></div>
          <div><b>24×7</b><span>""" + L(("Pharmacy &amp; pathology", "फ़ार्मेसी व पैथोलॉजी")) + """</span></div>
          <div><b>7</b><span>""" + L(("Specialities under Ayushman Bharat", "आयुष्मान भारत में शामिल विभाग")) + """</span></div>
        </div>""")
    out += b.section(b.head(("Facilities", "सुविधाएँ"), ("What's inside", "अस्पताल में क्या है")) + "\n" + b.cards([
        ("🚑", ("24×7 Emergency", "24×7 इमरजेंसी"), ("Trauma, accident and critical care.", "ट्रॉमा, दुर्घटना व क्रिटिकल केयर।")),
        ("🫀", ("ICU · NICU · PICU", "ICU · NICU · PICU"), ("Intensive care for adults, newborns and children.", "बड़ों, नवजातों व बच्चों की गहन चिकित्सा।")),
        ("🔬", ("Operation theatre", "ऑपरेशन थिएटर"), ("Including laparoscopic surgery.", "लैप्रोस्कोपिक सर्जरी सहित।")),
        ("🩻", ("X-ray &amp; ultrasound", "एक्स-रे व अल्ट्रासाउंड"), ("Plus portable X-ray at home and bedside, 24×7.", "साथ में घर व बेड पर पोर्टेबल एक्स-रे, 24×7।")),
        ("🧪", ("Pathology lab", "पैथोलॉजी लैब"), ("Open 24×7.", "24×7 खुली।")),
        ("💊", ("Pharmacy", "फ़ार्मेसी"), ("Open 24×7 inside the hospital.", "अस्पताल के अंदर 24×7।")),
        ("🤰", ("Labour room", "लेबर रूम"), ("Obstetrics &amp; Gynaecology department.", "स्त्री एवं प्रसूति रोग विभाग।")),
        ("🎓", ("Teaching hospital", "टीचिंग अस्पताल"), ("For AHS Nursing College students.", "एएचएस नर्सिंग कॉलेज के छात्रों के लिए।"))]))
    out += _more.EXTRA["about"](b)
    out += b.cta_band(("Need care today? We're open 24×7.", "आज इलाज चाहिए? हम 24×7 खुले हैं।"), "Appointment / OPD")
    return out


PAGES["about"] = {
    "type": "about", "section": "about", "icon": "🏥", "visual": "photo",
    "photo": "assets/img/ward-icu.jpg", "photo_alt": "ICU at AHS Global Hospital",
    "title": ("About Hospital", "अस्पताल के बारे में"),
    "kicker": ("About AHS Global Hospital", "एएचएस ग्लोबल हॉस्पिटल के बारे में"),
    "h1": ("Expert care, <span class=\"fade\">close to home.</span>", "विशेषज्ञ इलाज, <span class=\"fade\">घर के पास।</span>"),
    "lead": ("A 100+ bed multi-speciality hospital in Samastipur, Bihar, run by the Sir Syed Educational &amp; Charitable Trust.", "समस्तीपुर, बिहार में 100+ बेड का मल्टी-स्पेशियलिटी अस्पताल, सर सैयद एजुकेशनल एंड चैरिटेबल ट्रस्ट द्वारा संचालित।"),
    "facts": [(("Beds", "बेड"), "100+"), (("Emergency", "इमरजेंसी"), "24×7"), (("Empanelled", "सूचीबद्ध"), ("Ayushman · PM-RAHAT", "आयुष्मान · PM-RAHAT"))],
    "book": "Appointment / OPD",
    "body": _about_body,
}


def _director_body(b):
    L = b.L
    out = b.section(f"""        <div class="director__grid">
          <div class="director__photo"><img src="assets/img/dr-kamran-ul-haque.jpg" alt="Dr Kamran ul Haque" loading="lazy">
            <div class="opd"><small>{L(("OPD", "ओपीडी"))}</small><b>{L(("Mon – Fri", "सोम – शुक्र"))}</b><span>{L(("11:30 AM – 3:00 PM", "सुबह 11:30 – दोपहर 3:00"))}</span></div></div>
          <div>
            <span class="kicker">{L(("Director's message", "निदेशक का संदेश"))}</span>
            <blockquote>{L(("“In an emergency, the first hour decides everything. We built AHS so that no family in Samastipur has to travel far for that hour — or worry about whether they can afford it.”", "“इमरजेंसी में पहला घंटा सब कुछ तय करता है। हमने AHS इसलिए बनाया कि समस्तीपुर के किसी भी परिवार को उस घंटे के लिए दूर न जाना पड़े — और न ही खर्च की चिंता करनी पड़े।”"))}</blockquote>
            <div class="who"><b>Dr Kamran ul Haque</b><span>MBBS, MD (Emergency Medicine)</span><span>{L(("Director, AHS Global Hospital", "निदेशक, एएचएस ग्लोबल हॉस्पिटल"))}</span></div>
          </div>
        </div>""")
    out += b.section(b.head(("Profile", "परिचय"), ("Experience &amp; focus", "अनुभव व विशेषज्ञता")) + "\n" + b.cards([
        ("🎓", ("Qualifications", "योग्यता"), ("MBBS, MD (Emergency Medicine).", "MBBS, MD (इमरजेंसी मेडिसिन)।")),
        ("🏥", ("Experience", "अनुभव"), ("Formerly at Max Hospital, Delhi.", "पूर्व में मैक्स हॉस्पिटल, दिल्ली।")),
        ("🚑", ("Speciality", "विशेषज्ञता"), ("Emergency medicine, trauma and critical care.", "इमरजेंसी मेडिसिन, ट्रॉमा व क्रिटिकल केयर।")),
        ("🎓", ("Teaching", "शिक्षण"), ("Leads emergency and mass-casualty training for AHS Nursing College students.", "एएचएस नर्सिंग कॉलेज के छात्रों को इमरजेंसी व मास-कैज़ुअल्टी प्रशिक्षण।"))]))
    out += _more.EXTRA["director"](b)
    out += b.cta_band(("Book an OPD visit with Dr Kamran ul Haque", "डॉ कामरान उल हक़ से ओपीडी बुक करें"), "OPD — Dr Kamran ul Haque (Emergency Medicine)")
    return out


PAGES["director"] = {
    "type": "about", "section": "about", "icon": "🩺", "tone": "dark",
    "title": ("Know the Director", "निदेशक से मिलें"),
    "kicker": ("Director, AHS Global Hospital", "निदेशक, एएचएस ग्लोबल हॉस्पिटल"),
    "h1": ("Dr Kamran ul Haque", "डॉ कामरान उल हक़"),
    "lead": ("MBBS, MD (Emergency Medicine). Formerly at Max Hospital, Delhi. Sees patients in OPD Monday to Friday, 11:30 AM to 3:00 PM.", "MBBS, MD (इमरजेंसी मेडिसिन)। पूर्व में मैक्स हॉस्पिटल, दिल्ली। सोमवार से शुक्रवार, सुबह 11:30 से दोपहर 3:00 तक ओपीडी।"),
    "facts": [(("Speciality", "विशेषज्ञता"), ("Emergency Medicine", "इमरजेंसी मेडिसिन")), (("Formerly", "पूर्व में"), ("Max Hospital, Delhi", "मैक्स हॉस्पिटल, दिल्ली")), (("OPD", "ओपीडी"), ("Mon – Fri", "सोम – शुक्र")), (("Time", "समय"), ("11:30 AM – 3:00 PM", "11:30 – 3:00"))],
    "book": "OPD — Dr Kamran ul Haque (Emergency Medicine)",
    "body": _director_body,
}


def _careers_body(b):
    L = b.L
    roles = [("👨‍⚕️", ("Doctors", "डॉक्टर"), ("Medical officers and specialists.", "मेडिकल ऑफ़िसर व विशेषज्ञ।")),
             ("👩‍⚕️", ("Nurses", "नर्स"), ("Staff nurses for wards, ICU, NICU and PICU.", "वार्ड, ICU, NICU व PICU के लिए स्टाफ़ नर्स।")),
             ("🧪", ("Technicians", "टेक्नीशियन"), ("Lab, X-ray, OT and pharmacy.", "लैब, एक्स-रे, OT व फ़ार्मेसी।")),
             ("🗂️", ("Support &amp; admin", "सपोर्ट व एडमिन"), ("Front desk, billing, Ayushman desk and housekeeping.", "रिसेप्शन, बिलिंग, आयुष्मान डेस्क व हाउसकीपिंग।"))]
    form = b.wa_form("Job application", ("Apply on WhatsApp", "व्हाट्सऐप पर आवेदन करें"),
                     b.select_field("job-role", ("Role", "पद"), "Role", [("Doctor", "डॉक्टर"), ("Nurse", "नर्स"), ("Technician", "टेक्नीशियन"), ("Support / admin", "सपोर्ट / एडमिन"), ("Other", "अन्य")]) +
                     b.text_field("job-qual", ("Qualification &amp; experience", "योग्यता व अनुभव"), "Qualification & experience"),
                     date=False, notes_label=("Anything else (optional)", "और कुछ (वैकल्पिक)"), form_title="Job application")
    out = b.section(b.head(("Who we hire", "हम किसे रखते हैं"), ("Teams we're building", "हमारी टीमें")) + "\n" + b.cards(roles))
    out += b.section(f"""        <div class="two">
          <div>
            <span class="kicker">{L(("How to apply", "आवेदन कैसे करें"))}</span>
            <h2 style="font-size:clamp(1.7rem,3.4vw,2.6rem);margin:10px 0 18px">{L(("Send your details on WhatsApp", "व्हाट्सऐप पर अपनी जानकारी भेजें"))}</h2>
            {b.ticks([("Fill in the form and send it on WhatsApp", "फ़ॉर्म भरकर व्हाट्सऐप पर भेजें"), ("Attach your CV in the same WhatsApp chat", "उसी व्हाट्सऐप चैट में अपना CV भेजें"), ("Our HR team will contact shortlisted candidates", "चयनित उम्मीदवारों से HR टीम संपर्क करेगी")])}
            <div class="prose" style="margin-top:22px"><p>{L(("Current openings will be listed on this page. You can apply any time; we keep applications on file.", "मौजूदा रिक्तियाँ इस पेज पर दी जाएँगी। आप कभी भी आवेदन कर सकते हैं; हम आवेदन रिकॉर्ड में रखते हैं।"))}</p></div>
          </div>
          {form}
        </div>""")
    out += _more.EXTRA["careers"](b)
    return out


PAGES["careers"] = {
    "type": "about", "section": "about", "icon": "💼", "visual": "photo",
    "photo": "assets/img/icu-care.jpg", "photo_alt": "Nurse caring for a patient in the ICU", "photo_pos": "50% 30%",
    "title": ("Careers", "करियर"),
    "kicker": ("Join AHS Global Hospital", "एएचएस ग्लोबल हॉस्पिटल से जुड़ें"),
    "h1": ("Work where care <span class=\"fade\">never stops.</span>", "वहाँ काम करें जहाँ सेवा <span class=\"fade\">कभी नहीं रुकती।</span>"),
    "lead": ("We're growing our teams of doctors, nurses, technicians and support staff in Samastipur.", "हम समस्तीपुर में डॉक्टरों, नर्सों, टेक्नीशियनों और सपोर्ट स्टाफ़ की टीम बढ़ा रहे हैं।"),
    "facts": [(("Location", "स्थान"), ("Samastipur, Bihar", "समस्तीपुर, बिहार")), (("Apply via", "आवेदन"), "WhatsApp")],
    "book": "Job application",
    "ctas": lambda book, call: book("Job application", ("Apply on WhatsApp", "व्हाट्सऐप पर आवेदन करें")),
    "body": _careers_body,
}


def _contact_body(b):
    L = b.L
    form = b.wa_form("Enquiry", ("Send us a message", "हमें संदेश भेजें"),
                     b.select_field("ct-topic", ("Topic", "विषय"), "Topic", [("Appointment", "अपॉइंटमेंट"), ("Ayushman Bharat", "आयुष्मान भारत"), ("PM-RAHAT", "PM-RAHAT"), ("Home services", "होम सेवाएँ"), ("Other", "अन्य")]),
                     date=False, notes_label=("Message", "संदेश"), form_title="Enquiry")
    out = b.section(f"""        <div class="two">
          <div>
            <dl class="cinfo" style="margin-top:0">
              <div><dt>{L(("Emergency &amp; enquiries", "इमरजेंसी व पूछताछ"))}</dt><dd><a href="tel:+919942815500">99428 15500</a></dd></div>
              <div><dt>WhatsApp</dt><dd><a href="https://wa.me/919942815500" target="_blank" rel="noopener">99428 15500</a></dd></div>
              <div><dt>{L(("Email", "ईमेल"))}</dt><dd><a href="mailto:info@ahsglobalhospital.com">info@ahsglobalhospital.com</a></dd></div>
              <div><dt>{L(("Address", "पता"))}</dt><dd>{L(("AHS Building, Jail Chowk, Tajpur Road, Samastipur, Bihar 848129", "एएचएस बिल्डिंग, जेल चौक, ताजपुर रोड, समस्तीपुर, बिहार 848129"))}</dd></div>
            </dl>
            <h3 style="margin:26px 0 12px;font-size:1.2rem">{L(("Timings", "समय"))}</h3>
            {b.ticks([("Emergency, ICU, NICU &amp; PICU — 24×7", "इमरजेंसी, ICU, NICU व PICU — 24×7"), ("Pharmacy &amp; pathology lab — 24×7", "फ़ार्मेसी व पैथोलॉजी लैब — 24×7"), ("Portable X-ray — 24×7", "पोर्टेबल एक्स-रे — 24×7"), ("OPD — call for today's timings", "ओपीडी — आज के समय के लिए कॉल करें")])}
            <div class="cta"><a class="pill pill--blue pill--arrow" href="https://maps.app.goo.gl/kdE4Cmhwnu5Sk8F39" target="_blank" rel="noopener">{L(("Get directions", "रास्ता देखें"))}<i aria-hidden="true">↗</i></a></div>
          </div>
          {form}
        </div>""")
    out += _more.EXTRA["contact"](b)
    return out


PAGES["contact"] = {
    "type": "about", "section": "about", "icon": "📍", "visual": "photo",
    "photo": "assets/img/hospital-team.jpg", "photo_alt": "AHS Global Hospital team",
    "title": ("Contact us", "संपर्क करें"),
    "kicker": ("Contact AHS Global Hospital", "एएचएस ग्लोबल हॉस्पिटल से संपर्क"),
    "h1": ("We're on Tajpur Road, <span class=\"fade\">open 24×7.</span>", "ताजपुर रोड पर, <span class=\"fade\">24×7 खुला।</span>"),
    "lead": ("Call or WhatsApp 99428 15500, or visit us at Jail Chowk, Tajpur Road, Samastipur.", "99428 15500 पर कॉल या व्हाट्सऐप करें, या जेल चौक, ताजपुर रोड, समस्तीपुर आएँ।"),
    "facts": [(("Phone &amp; WhatsApp", "फ़ोन व व्हाट्सऐप"), PHONE), (("Emergency", "इमरजेंसी"), "24×7")],
    "book": "Enquiry",
    "body": _contact_body,
}

# =====================================================================
# EMPANELMENTS
# =====================================================================
AB_SPECIALITIES = [("General Surgery", "जनरल सर्जरी"), ("General Medicine", "जनरल मेडिसिन"), ("Paediatrics", "शिशु रोग"), "ENT",
                   ("Emergency Medicine", "आपातकालीन चिकित्सा"), ("Orthopaedics", "हड्डी रोग"), ("Neonatal care (NICU)", "नवजात देखभाल (NICU)")]


def _ayushman_body(b):
    L = b.L
    out = b.section(b.head(("Covered at AHS", "AHS में शामिल"), ("Specialities covered under Ayushman Bharat", "आयुष्मान भारत में शामिल विभाग")) + "\n" + b.chips(AB_SPECIALITIES) +
                    f'\n        <p class="note" style="margin-top:16px;color:var(--muted)">{L(("Obstetrics &amp; Gynaecology is not covered under Ayushman Bharat at AHS.", "स्त्री एवं प्रसूति रोग AHS में आयुष्मान भारत के अंतर्गत शामिल नहीं है।"))}</p>')
    out += b.section(f"""        <div class="two">
          <div>
            <span class="kicker">{L(("Who is eligible", "कौन पात्र है"))}</span>
            <h2 style="font-size:clamp(1.7rem,3.4vw,2.6rem);margin:10px 0 18px">{L(("Is my family covered?", "क्या मेरा परिवार शामिल है?"))}</h2>
            {b.ticks([("Families listed under Ayushman Bharat – PM-JAY", "आयुष्मान भारत – PM-JAY में सूचीबद्ध परिवार"), ("All senior citizens aged 70 and above, regardless of income (Ayushman Vay Vandana card)", "70 वर्ष और उससे अधिक उम्र के सभी बुज़ुर्ग, आय चाहे जो हो (आयुष्मान वय वंदना कार्ड)"), ("Cover of up to ₹5 lakh per family per year", "प्रति परिवार प्रति वर्ष ₹5 लाख तक का कवर")])}
            <div class="cta"><a class="pill pill--blue pill--arrow" href="https://beneficiary.nha.gov.in/" target="_blank" rel="noopener">{L(("Check eligibility (official portal)", "पात्रता जाँचें (आधिकारिक पोर्टल)"))}<i aria-hidden="true">↗</i></a></div>
            <p style="margin-top:12px;color:var(--muted);font-size:.9rem">{L(("National helpline: 14555", "राष्ट्रीय हेल्पलाइन: 14555"))}</p>
          </div>
          <div>
            <span class="kicker">{L(("Bring these documents", "ये दस्तावेज़ लाएँ"))}</span>
            <h2 style="font-size:clamp(1.7rem,3.4vw,2.6rem);margin:10px 0 18px">{L(("Documents checklist", "दस्तावेज़ सूची"))}</h2>
            {b.ticks([("Ayushman card (or Ayushman Vay Vandana card for 70+)", "आयुष्मान कार्ड (70+ के लिए आयुष्मान वय वंदना कार्ड)"), ("Aadhaar card of the patient", "मरीज़ का आधार कार्ड"), ("Ration card, if you have one", "राशन कार्ड, अगर हो"), ("Previous prescriptions and reports", "पुराने पर्चे और रिपोर्ट")])}
          </div>
        </div>""")
    out += _more.EXTRA["ayushman-bharat"](b)
    out += b.section(b.head(("How it works at AHS", "AHS में प्रक्रिया"), ("Treatment without paying, in 4 steps", "4 चरणों में बिना पैसे इलाज"), "") + "\n" + b.flow([
        (("Come to AHS", "AHS आएँ"), ("Visit the Ayushman help desk at reception, or come to Emergency.", "रिसेप्शन पर आयुष्मान हेल्प डेस्क पर जाएँ, या इमरजेंसी आएँ।")),
        (("Verification", "सत्यापन"), ("We verify your card and Aadhaar on the government system.", "हम सरकारी सिस्टम पर कार्ड व आधार सत्यापित करते हैं।")),
        (("Approval", "मंज़ूरी"), ("Your treatment is approved under the scheme.", "योजना के तहत आपका इलाज मंज़ूर होता है।")),
        (("Treatment", "इलाज"), ("You are treated in a covered department without paying.", "शामिल विभाग में बिना पैसे इलाज होता है।"))]), dark=True)
    out += b.section(b.head(("Questions", "सवाल"), ("Frequently asked", "अक्सर पूछे जाने वाले सवाल")) + "\n" + b.faq([
        (("Do I have to pay anything?", "क्या कुछ भुगतान करना होगा?"), ("Treatment covered under the scheme is cashless for eligible patients. If anything is not covered, our desk will tell you before it is done.", "पात्र मरीज़ों के लिए योजना में शामिल इलाज कैशलेस है। अगर कुछ शामिल नहीं है, तो डेस्क पहले बताएगा।")),
        (("Are medicines and tests included?", "क्या दवा और जाँच शामिल हैं?"), ("For an approved treatment, the scheme covers medicines, tests and stay, including 3 days before and 15 days after hospitalisation.", "मंज़ूर इलाज में दवा, जाँच और भर्ती शामिल है, भर्ती से 3 दिन पहले और 15 दिन बाद तक।")),
        (("I don't have an Ayushman card yet.", "मेरे पास अभी आयुष्मान कार्ड नहीं है।"), ("If you're eligible, our desk can help you check your name and apply for the card. Bring your Aadhaar and ration card.", "अगर आप पात्र हैं, तो हमारा डेस्क नाम जाँचने और कार्ड बनवाने में मदद करेगा। आधार और राशन कार्ड लाएँ।")),
        (("Is delivery (maternity) covered at AHS?", "क्या AHS में डिलीवरी आयुष्मान में शामिल है?"), ("No. Obstetrics &amp; Gynaecology is not covered under Ayushman Bharat at AHS.", "नहीं। AHS में स्त्री एवं प्रसूति रोग आयुष्मान भारत में शामिल नहीं है।"))]))
    out += b.cta_band(("Have a question about Ayushman? Ask us on WhatsApp.", "आयुष्मान के बारे में सवाल? व्हाट्सऐप पर पूछें।"), "Ayushman Bharat enquiry")
    return out


PAGES["ayushman-bharat"] = {
    "type": "scheme", "section": "emp", "icon": "🪪", "tone": "green",
    "title": ("Ayushman Bharat", "आयुष्मान भारत"),
    "kicker": ("Empanelment · AB-PMJAY", "सूचीबद्धता · AB-PMJAY"),
    "h1": ("Free treatment at AHS <span class=\"fade\">under Ayushman Bharat.</span>", "आयुष्मान भारत के तहत <span class=\"fade\">AHS में मुफ्त इलाज।</span>"),
    "lead": ("AHS Global Hospital is empanelled under Ayushman Bharat – PM-JAY. Eligible families get cashless treatment of up to ₹5 lakh per family per year in the covered departments.", "एएचएस ग्लोबल हॉस्पिटल आयुष्मान भारत – PM-JAY में सूचीबद्ध है। पात्र परिवारों को शामिल विभागों में प्रति परिवार प्रति वर्ष ₹5 लाख तक कैशलेस इलाज मिलता है।"),
    "badges": [AB_YES],
    "facts": [(("Cover", "कवर"), ("₹5 lakh / family / year", "₹5 लाख / परिवार / वर्ष")), (("Specialities at AHS", "AHS में विभाग"), "7"), (("Senior citizens 70+", "70+ बुज़ुर्ग"), ("Eligible", "पात्र"))],
    "book": "Ayushman Bharat enquiry",
    "body": _ayushman_body,
}


def _rahat_body(b):
    L = b.L
    out = b.section(b.head(("At the accident site", "दुर्घटना स्थल पर"), ("What to do after a road accident", "सड़क दुर्घटना के बाद क्या करें")) + "\n" + b.flow([
        (("Call for help", "मदद बुलाएँ"), ("Dial 112 for an ambulance and police, or call AHS on " + PHONE + ".", "एम्बुलेंस व पुलिस के लिए 112 डायल करें, या AHS को " + PHONE + " पर कॉल करें।")),
        (("Bring the victim to AHS", "पीड़ित को AHS लाएँ"), ("Come straight to AHS Emergency on Tajpur Road.", "सीधे ताजपुर रोड पर AHS इमरजेंसी आएँ।")),
        (("Treatment starts", "इलाज शुरू"), ("Our team starts treatment immediately.", "हमारी टीम तुरंत इलाज शुरू करती है।")),
        (("Verification by system", "सिस्टम से सत्यापन"), ("Police authentication happens on the government's digital system.", "पुलिस सत्यापन सरकार के डिजिटल सिस्टम पर होता है।"))]), dark=True)
    out += b.section(f"""        <div class="two">
          <div>
            <span class="kicker">{L(("What the scheme covers", "योजना में क्या शामिल है"))}</span>
            <h2 style="font-size:clamp(1.7rem,3.4vw,2.6rem);margin:10px 0 18px">{L(("Cashless treatment for road-accident victims", "सड़क दुर्घटना पीड़ितों का कैशलेस इलाज"))}</h2>
            {b.ticks([("Up to ₹1.5 lakh per victim", "प्रति पीड़ित ₹1.5 लाख तक"), ("For 7 days from the date of the accident", "दुर्घटना की तारीख़ से 7 दिनों तक"), ("Any road-accident victim, on any category of road", "किसी भी सड़क पर, किसी भी दुर्घटना पीड़ित के लिए"), ("Stabilisation care for up to 24 hours (48 hours if life-threatening), subject to police authentication", "24 घंटे तक स्थिरीकरण इलाज (जानलेवा मामलों में 48 घंटे), पुलिस सत्यापन के अधीन"), ("The hospital is paid by the government's Motor Vehicle Accident Fund — not the family", "अस्पताल को सरकार के मोटर वाहन दुर्घटना कोष से भुगतान होता है — परिवार से नहीं")])}
          </div>
          <div>
            <span class="kicker">{L(("Helping a victim?", "पीड़ित की मदद कर रहे हैं?"))}</span>
            <h2 style="font-size:clamp(1.7rem,3.4vw,2.6rem);margin:10px 0 18px">{L(("Good Samaritans (Rah-Veer) are protected", "मददगार (राह-वीर) सुरक्षित हैं"))}</h2>
            {b.ticks([("You don't have to pay for the victim's treatment", "आपको पीड़ित के इलाज का भुगतान नहीं करना है"), ("You can leave after bringing the victim; you won't be held at the hospital", "पीड़ित को लाने के बाद आप जा सकते हैं; आपको रोका नहीं जाएगा"), ("Indian law protects people who help accident victims in good faith", "भारतीय क़ानून नेक नीयत से मदद करने वालों की रक्षा करता है")])}
          </div>
        </div>""")
    out += _more.EXTRA["pm-rahat"](b)
    out += b.section(b.head(("Questions", "सवाल"), ("Frequently asked", "अक्सर पूछे जाने वाले सवाल")) + "\n" + b.faq([
        (("Do we need an FIR before treatment starts?", "क्या इलाज से पहले FIR ज़रूरी है?"), ("No. Treatment starts first. Police authentication is done through the scheme's digital system.", "नहीं। पहले इलाज शुरू होता है। पुलिस सत्यापन योजना के डिजिटल सिस्टम से होता है।")),
        (("What if the victim has no ID?", "अगर पीड़ित के पास पहचान पत्र न हो?"), ("Bring them anyway. Emergency treatment does not wait for documents.", "फिर भी लाएँ। इमरजेंसी इलाज दस्तावेज़ों का इंतज़ार नहीं करता।")),
        (("What happens after 7 days or ₹1.5 lakh?", "7 दिन या ₹1.5 लाख के बाद क्या होगा?"), ("Our desk will explain the options, including Ayushman Bharat if the patient is eligible.", "हमारा डेस्क विकल्प बताएगा, पात्र होने पर आयुष्मान भारत भी।"))]))
    out += b.cta_band(("Road accident? Call AHS Emergency now.", "सड़क दुर्घटना? अभी AHS इमरजेंसी को कॉल करें।"), "Emergency — road accident (PM-RAHAT)")
    return out


PAGES["pm-rahat"] = {
    "type": "scheme", "section": "emp", "icon": "🚑", "tone": "red",
    "title": ("PM-RAHAT", "PM-RAHAT"),
    "kicker": ("Empanelment · Road Accident Victims", "सूचीबद्धता · सड़क दुर्घटना पीड़ित"),
    "h1": ("Road accident? <span class=\"fade\">Treatment is cashless.</span>", "सड़क दुर्घटना? <span class=\"fade\">इलाज कैशलेस है।</span>"),
    "lead": ("Under PM-RAHAT (Prime Minister – Road Accident Victims' Hospitalisation and Assured Treatment), victims get cashless treatment of up to ₹1.5 lakh for 7 days. AHS Global Hospital is a PM-RAHAT hospital.", "PM-RAHAT (प्रधानमंत्री – सड़क दुर्घटना पीड़ित अस्पताल भर्ती एवं सुनिश्चित उपचार) के तहत पीड़ितों को 7 दिनों तक ₹1.5 लाख तक कैशलेस इलाज मिलता है। एएचएस ग्लोबल हॉस्पिटल PM-RAHAT अस्पताल है।"),
    "badges": [OPEN_247, ("blue", ("Dial 112", "112 डायल करें"))],
    "facts": [(("Cover", "कवर"), ("Up to ₹1.5 lakh", "₹1.5 लाख तक")), (("Duration", "अवधि"), ("7 days from accident", "दुर्घटना से 7 दिन")), (("Emergency", "इमरजेंसी"), "24×7")],
    "book": "Emergency — road accident (PM-RAHAT)",
    "ctas": lambda book, call: call(("Call Emergency", "इमरजेंसी कॉल करें"), "pill--red") + '<a class="pill" href="tel:112">112</a>',
    "body": _rahat_body,
}


_more.extend(PAGES)

# Condition pages under General Medicine
import content_conditions as _cond  # noqa: E402
PAGES.update(_cond.PAGES)
PAGES["general-medicine"]["expertise"] = _cond.ORDER
PAGES["general-medicine"]["expertise_title"] = ("Conditions we treat every day", "जिन बीमारियों का हम रोज़ इलाज करते हैं")

# 24×7 Pathology Lab (integrated trend report)
import content_lab as _lab  # noqa: E402
PAGES["pathology-lab"] = _lab.PAGE

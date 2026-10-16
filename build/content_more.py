"""Longer content for the inner pages: department write-ups, when to see a doctor,
health tips and extra FAQs. Merged into content.PAGES by content.py.

Every medical statement here is general patient information; the hospital's doctors
should review it before the site goes live.
"""

PHONE = "99428 15500"


def extend(pages):
    def add(slug, **kw):
        p = pages[slug]
        for k, v in kw.items():
            if k in ("faq_more", "conditions_more", "care_more"):
                p[k.replace("_more", "")] = p[k.replace("_more", "")] + v
            else:
                p[k] = v

    # ------------------------------------------------------------ EMERGENCY
    add("emergency",
        about_title=("The first hour matters most", "पहला घंटा सबसे ज़रूरी है"),
        about=[("In a medical emergency, every minute counts. AHS Emergency on Tajpur Road is open day and night, all year, with doctors on duty and trained nurses ready to start treatment the moment a patient arrives.",
                "मेडिकल इमरजेंसी में हर मिनट क़ीमती है। ताजपुर रोड पर AHS इमरजेंसी साल भर दिन-रात खुली है — डॉक्टर ड्यूटी पर और प्रशिक्षित नर्सें मरीज़ के पहुँचते ही इलाज शुरू करने को तैयार।"),
               ("The emergency team is led by our Director, Dr Kamran ul Haque, a specialist in Emergency Medicine (MD) who previously worked at Max Hospital, Delhi. Patients are assessed by how serious their condition is, so the sickest are treated first.",
                "इमरजेंसी टीम का नेतृत्व हमारे निदेशक डॉ कामरान उल हक़ करते हैं, जो इमरजेंसी मेडिसिन (MD) के विशेषज्ञ हैं और पहले मैक्स हॉस्पिटल, दिल्ली में काम कर चुके हैं। मरीज़ों की हालत की गंभीरता के अनुसार जाँच होती है, ताकि सबसे गंभीर मरीज़ का इलाज पहले हो।"),
               ("Everything an emergency needs is under one roof: ICU, NICU and PICU, an operation theatre, portable X-ray, ultrasound, a 24×7 pathology lab and a 24×7 pharmacy. Road-accident victims are treated cashless under PM-RAHAT, and Emergency Medicine is covered under Ayushman Bharat.",
                "इमरजेंसी की हर ज़रूरत एक ही छत के नीचे: ICU, NICU व PICU, ऑपरेशन थिएटर, पोर्टेबल एक्स-रे, अल्ट्रासाउंड, 24×7 पैथोलॉजी लैब और 24×7 फ़ार्मेसी। सड़क दुर्घटना पीड़ितों का इलाज PM-RAHAT के तहत कैशलेस है, और आपातकालीन चिकित्सा आयुष्मान भारत में शामिल है।")],
        see_title=("Also come to Emergency for", "इनके लिए भी इमरजेंसी आएँ"),
        see_doctor=[("Fever with stiff neck, confusion or rash", "बुखार के साथ गर्दन अकड़ना, बेहोशी या दाने"), ("Severe stomach pain", "पेट में तेज़ दर्द"),
                    ("Vomiting blood or black stools", "खून की उल्टी या काला मल"), ("A head injury, even if the person seems fine", "सिर में चोट, भले ही व्यक्ति ठीक लगे"),
                    ("Very high or very low blood sugar", "बहुत ज़्यादा या बहुत कम शुगर")],
        bring=[("Come first — documents can follow", "पहले आएँ — कागज़ बाद में भी आ सकते हैं"), ("The patient's medicines or their strips", "मरीज़ की दवाएँ या उनके पत्ते"),
               ("In poisoning, the bottle or packet", "ज़हर के मामले में बोतल या पैकेट"), ("Ayushman card or Aadhaar, if at hand", "आयुष्मान कार्ड या आधार, अगर पास हो"),
               ("A family member who knows the history", "परिवार का कोई सदस्य जो बीमारी जानता हो")],
        visit=[(("Arrive", "पहुँचें"), ("Come straight to Emergency. Call " + PHONE + " on the way if you can.", "सीधे इमरजेंसी आएँ। हो सके तो रास्ते में " + PHONE + " पर कॉल करें।")),
               (("Triage", "ट्राइएज"), ("A doctor or nurse checks breathing, pulse, BP and oxygen at once.", "डॉक्टर या नर्स तुरंत सांस, नब्ज़, बीपी और ऑक्सीजन जाँचते हैं।")),
               (("Stabilise", "स्थिर करना"), ("Life-saving treatment starts before any paperwork.", "कागज़ी कार्रवाई से पहले जान बचाने वाला इलाज शुरू।")),
               (("Tests", "जाँच"), ("Bedside X-ray, ECG and blood tests, day or night.", "दिन हो या रात, बेड पर एक्स-रे, ECG और खून की जाँच।")),
               (("Next step", "अगला कदम"), ("Admission to a ward, ICU, surgery, or home with advice.", "वार्ड, ICU, सर्जरी में भर्ती, या सलाह के साथ घर।"))],
        tips_title=("Until you reach the hospital", "अस्पताल पहुँचने तक"),
        tips=[("🩸", ("Bleeding", "खून बहना"), ("Press firmly on the wound with a clean cloth and keep pressing.", "साफ़ कपड़े से घाव पर ज़ोर से दबाएँ और दबाए रखें।")),
              ("🔥", ("Burns", "जलना"), ("Cool the burn under running tap water for 20 minutes. Don't apply toothpaste or oil.", "जली जगह पर 20 मिनट तक नल का पानी डालें। टूथपेस्ट या तेल न लगाएँ।")),
              ("🐍", ("Snake bite", "सांप का काटना"), ("Keep the person still and calm, keep the limb still, and come immediately. Don't cut or suck the bite.", "व्यक्ति को शांत और स्थिर रखें, अंग न हिलाएँ, तुरंत आएँ। काटे हुए स्थान को न काटें, न चूसें।")),
              ("🧍", ("Accident", "दुर्घटना"), ("If a neck or back injury is possible, don't twist the person; move them with the head and body in line.", "गर्दन या कमर में चोट हो सकती है तो व्यक्ति को मोड़ें नहीं; सिर और शरीर को सीध में रखकर उठाएँ।"))],
        faq_more=[(("Can I bring a patient at night?", "क्या रात में मरीज़ ला सकते हैं?"), ("Yes. Emergency, ICU, lab, X-ray and pharmacy all work through the night.", "हाँ। इमरजेंसी, ICU, लैब, एक्स-रे और फ़ार्मेसी पूरी रात चलते हैं।")),
                  (("Do you treat children in Emergency?", "क्या इमरजेंसी में बच्चों का इलाज होता है?"), ("Yes. Sick newborns and children are treated in Emergency and moved to NICU or PICU if they need intensive care.", "हाँ। बीमार नवजात व बच्चों का इलाज इमरजेंसी में होता है और ज़रूरत हो तो NICU या PICU में भेजा जाता है।")),
                  (("Will I have to pay before treatment starts?", "क्या इलाज से पहले भुगतान करना होगा?"), ("Life-saving treatment starts first. Our desk will explain Ayushman Bharat, PM-RAHAT or other payment options afterwards.", "पहले जान बचाने वाला इलाज शुरू होता है। बाद में हमारा डेस्क आयुष्मान, PM-RAHAT या भुगतान के विकल्प बताएगा।"))],
        cta=("Emergency? Don't wait. Call or come now.", "इमरजेंसी? इंतज़ार न करें। अभी कॉल करें या आएँ।"))

    # ------------------------------------------------------------ NICU / PICU
    add("nicu-picu",
        about_title=("Specialised care when your child needs it most", "जब बच्चे को सबसे ज़्यादा ज़रूरत हो, तब विशेष देखभाल"),
        about=[("Some babies need extra help in their first days — because they arrived early, are very small, have jaundice or an infection, or have trouble breathing or feeding. Our Neonatal Intensive Care Unit (NICU) gives them warmth, monitoring and treatment around the clock.",
                "कुछ बच्चों को शुरुआती दिनों में ज़्यादा मदद चाहिए — समय से पहले जन्म, बहुत कम वज़न, पीलिया, संक्रमण, या सांस लेने और दूध पीने में दिक्कत के कारण। हमारा NICU उन्हें चौबीसों घंटे गर्माहट, निगरानी और इलाज देता है।"),
               ("Our Paediatric Intensive Care Unit (PICU) is for older babies and children who are seriously ill — with severe pneumonia, dehydration, fits or infections — and need close watching that a normal ward can't give.",
                "हमारा PICU उन बड़े शिशुओं व बच्चों के लिए है जो गंभीर रूप से बीमार हैं — गंभीर निमोनिया, पानी की कमी, दौरे या संक्रमण — और जिन्हें सामान्य वार्ड से ज़्यादा निगरानी चाहिए।"),
               ("Both units are open 24×7, linked to our Emergency, lab and portable X-ray, and covered under Ayushman Bharat for eligible families. Our nurses keep parents informed and involved, and teach feeding and home care before discharge.",
                "दोनों यूनिट 24×7 खुली हैं, इमरजेंसी, लैब और पोर्टेबल एक्स-रे से जुड़ी हैं, और पात्र परिवारों के लिए आयुष्मान भारत में शामिल हैं। हमारी नर्सें माता-पिता को जानकारी देती रहती हैं और छुट्टी से पहले दूध पिलाना व घर पर देखभाल सिखाती हैं।")],
        see_title=("Watch for these signs in a newborn", "नवजात में ये लक्षण देखें"),
        see_doctor=[("Yellow eyes or skin, especially in the first week", "आँखें या त्वचा पीली, ख़ासकर पहले हफ़्ते में"), ("Too cold or too hot to touch", "छूने पर बहुत ठंडा या बहुत गर्म"),
                    ("Fewer wet nappies than usual", "सामान्य से कम पेशाब"), ("Swelling or redness around the cord", "नाल के आसपास सूजन या लाली"), ("Weak cry or poor sucking", "कमज़ोर रोना या ठीक से न चूसना")],
        bring=[("Birth papers and discharge summary", "जन्म के कागज़ और डिस्चार्ज समरी"), ("Mother's pregnancy reports, if available", "माँ की गर्भावस्था की रिपोर्ट, अगर हो"),
               ("Ayushman card or Aadhaar of a parent", "माता या पिता का आयुष्मान कार्ड या आधार"), ("Clean clothes and a soft cloth for the baby", "बच्चे के लिए साफ़ कपड़े और मुलायम कपड़ा")],
        tips=[("🤱", ("Breastfeed early and often", "जल्दी और बार-बार स्तनपान"), ("Start within the first hour if possible, then every 2–3 hours.", "हो सके तो पहले घंटे में शुरू करें, फिर हर 2–3 घंटे पर।")),
              ("🧣", ("Keep the baby warm", "बच्चे को गर्म रखें"), ("Skin-to-skin contact (kangaroo care) helps small babies stay warm.", "त्वचा से त्वचा का संपर्क (कंगारू केयर) छोटे बच्चों को गर्म रखता है।")),
              ("🧼", ("Wash hands", "हाथ धोएँ"), ("Everyone should wash hands before touching the baby.", "बच्चे को छूने से पहले सभी हाथ धोएँ।")),
              ("💉", ("Don't miss vaccines", "टीके न छूटें"), ("Birth-dose vaccines protect from day one.", "जन्म के समय के टीके पहले दिन से बचाते हैं।"))],
        faq_more=[(("How long will my baby stay in NICU?", "बच्चा NICU में कितने दिन रहेगा?"), ("It depends on the reason for admission. Many babies with jaundice go home in a few days; premature babies may stay until they feed well and gain weight.", "यह भर्ती के कारण पर निर्भर है। पीलिया वाले कई बच्चे कुछ दिनों में घर जाते हैं; समय से पहले जन्मे बच्चे तब तक रह सकते हैं जब तक ठीक से दूध पीना और वज़न बढ़ना शुरू न हो।")),
                  (("What is the difference between NICU and PICU?", "NICU और PICU में क्या अंतर है?"), ("NICU is for newborns, usually in the first 28 days. PICU is for older babies and children.", "NICU नवजातों के लिए है, आमतौर पर पहले 28 दिन। PICU बड़े शिशुओं व बच्चों के लिए है।"))],
        cta=("Worried about your baby? Call us any time.", "बच्चे को लेकर चिंता? कभी भी कॉल करें।"))

    # ------------------------------------------------------------ GENERAL MEDICINE
    add("general-medicine",
        about_title=("Your first stop for most illnesses", "ज़्यादातर बीमारियों के लिए पहला पड़ाव"),
        about=[("General Medicine looks after adults with illnesses that don't need an operation — from a few days of fever to long-term conditions like diabetes, high blood pressure, thyroid and heart disease.",
                "जनरल मेडिसिन उन वयस्कों का इलाज करता है जिनकी बीमारी में ऑपरेशन की ज़रूरत नहीं — कुछ दिनों के बुखार से लेकर डायबिटीज़, हाई बीपी, थायरॉइड और दिल की बीमारी जैसी लंबी बीमारियों तक।"),
               ("In Bihar, seasonal fevers such as typhoid, malaria and dengue are common, and many people live with sugar or BP without knowing it. Our physicians find the cause with the right tests, explain the treatment clearly, and plan follow-up so the illness stays under control.",
                "बिहार में टाइफ़ाइड, मलेरिया और डेंगू जैसे मौसमी बुखार आम हैं, और बहुत लोग बिना जाने शुगर या बीपी के साथ जीते हैं। हमारे फ़िज़िशियन सही जाँच से कारण ढूँढते हैं, इलाज साफ़ समझाते हैं, और फ़ॉलो-अप तय करते हैं ताकि बीमारी नियंत्रण में रहे।"),
               ("When illness becomes serious, patients are admitted to our wards or ICU without leaving the hospital. Lab tests run 24×7, and X-ray and ultrasound are in the same building.",
                "बीमारी गंभीर होने पर मरीज़ अस्पताल छोड़े बिना वार्ड या ICU में भर्ती होते हैं। लैब जाँच 24×7 होती है, और एक्स-रे व अल्ट्रासाउंड उसी इमारत में हैं।")],
        see_doctor=[("Fever for more than 3 days", "3 दिन से ज़्यादा बुखार"), ("Constant tiredness, weight loss or loss of appetite", "लगातार थकान, वज़न घटना या भूख न लगना"),
                    ("Frequent thirst and urination", "बार-बार प्यास और पेशाब"), ("Headaches or dizziness with high BP readings", "हाई बीपी के साथ सिरदर्द या चक्कर"),
                    ("Cough for more than 2 weeks", "2 हफ़्ते से ज़्यादा खांसी"), ("Swelling of feet or breathlessness on walking", "पैरों में सूजन या चलने पर सांस फूलना")],
        conditions_more=[("Tuberculosis (TB) screening", "टीबी (TB) की जाँच"), ("Jaundice", "पीलिया"), ("Urine infections", "पेशाब का संक्रमण"), ("Heat stroke", "लू लगना")],
        care_more=[("🫀", ("ECG", "ECG"), ("Heart tracing for chest pain and heart check-ups.", "सीने में दर्द व दिल की जाँच के लिए ECG।"))],
        tips=[("🩸", ("Check sugar and BP yearly", "हर साल शुगर व बीपी जाँचें"), ("After 30, a yearly check catches problems early.", "30 के बाद हर साल की जाँच से बीमारी जल्दी पकड़ में आती है।")),
              ("💧", ("Safe water", "साफ़ पानी"), ("Boiled or filtered water prevents typhoid and diarrhoea.", "उबला या फ़िल्टर पानी टाइफ़ाइड और दस्त से बचाता है।")),
              ("🦟", ("Stop mosquito bites", "मच्छरों से बचें"), ("Use nets and remove standing water to prevent dengue and malaria.", "मच्छरदानी लगाएँ और जमा पानी हटाएँ, डेंगू-मलेरिया से बचें।")),
              ("💊", ("Don't stop medicines on your own", "दवा अपने आप बंद न करें"), ("BP and sugar medicines work only when taken every day.", "बीपी और शुगर की दवा तभी असर करती है जब रोज़ ली जाए।"))],
        faq_more=[(("Do you treat dengue and typhoid?", "क्या डेंगू और टाइफ़ाइड का इलाज होता है?"), ("Yes. We test for them in our 24×7 lab and admit patients who need fluids or close monitoring.", "हाँ। हमारी 24×7 लैब में जाँच होती है और जिन्हें ड्रिप या निगरानी चाहिए उन्हें भर्ती करते हैं।")),
                  (("Is General Medicine covered under Ayushman Bharat?", "क्या जनरल मेडिसिन आयुष्मान भारत में शामिल है?"), ("Yes. General Medicine is covered under Ayushman Bharat at AHS for eligible families.", "हाँ। AHS में पात्र परिवारों के लिए जनरल मेडिसिन आयुष्मान भारत में शामिल है।"))],
        cta=("Feeling unwell? Book a visit today.", "तबियत ठीक नहीं? आज ही दिखाएँ।"))

    # ------------------------------------------------------------ GENERAL SURGERY
    add("general-surgery",
        about_title=("Safe surgery, explained clearly", "सुरक्षित सर्जरी, साफ़-साफ़ समझाकर"),
        about=[("Our General Surgery department treats problems that need an operation — gall bladder stones, appendix, hernia, piles and fistula, lumps, abscesses and injuries. Planned operations are scheduled after tests; emergencies are operated on day or night.",
                "हमारा जनरल सर्जरी विभाग उन बीमारियों का इलाज करता है जिनमें ऑपरेशन चाहिए — पित्ताशय की पथरी, अपेंडिक्स, हर्निया, बवासीर व भगंदर, गाँठ, फोड़ा और चोट। योजनाबद्ध ऑपरेशन जाँच के बाद तय होते हैं; इमरजेंसी ऑपरेशन दिन-रात होते हैं।"),
               ("Wherever it is suitable, our surgeons use laparoscopic (keyhole) surgery. Instead of one long cut, the operation is done through small ports with a camera, which usually means less pain, smaller scars, fewer wound infections and an earlier return home.",
                "जहाँ उपयुक्त हो, हमारे सर्जन लैप्रोस्कोपिक (दूरबीन) सर्जरी करते हैं। एक लंबे चीरे की जगह कैमरे के साथ छोटे छेदों से ऑपरेशन होता है, जिससे आमतौर पर कम दर्द, छोटे निशान, कम संक्रमण और जल्दी घर वापसी होती है।"),
               ("Before surgery, the surgeon explains the operation, the risks and the expected recovery, and you sign a consent form only when you understand it. After you go home, our Home Care team can do your dressings.",
                "ऑपरेशन से पहले सर्जन ऑपरेशन, जोखिम और रिकवरी समझाते हैं, और समझने के बाद ही आप सहमति पत्र पर हस्ताक्षर करते हैं। घर जाने के बाद हमारी होम केयर टीम ड्रेसिंग कर सकती है।")],
        see_doctor=[("Pain in the upper right stomach after meals", "खाने के बाद पेट के दाहिने ऊपरी हिस्से में दर्द"), ("A bulge in the groin or near the navel", "जांघ के जोड़ या नाभि के पास उभार"),
                    ("Bleeding or pain while passing stool", "मल त्याग के समय खून या दर्द"), ("A lump that is growing", "बढ़ती हुई गाँठ"),
                    ("Pain in the lower right stomach with fever or vomiting (come to Emergency)", "पेट के दाहिने निचले हिस्से में दर्द के साथ बुखार या उल्टी (इमरजेंसी आएँ)")],
        conditions_more=[("Breast lumps", "स्तन में गाँठ"), ("Varicose veins", "नसों का फूलना"), ("Circumcision", "ख़तना"), ("Diabetic foot wounds", "डायबिटीज़ में पैर के घाव")],
        care_more=[("🛏️", ("Post-operative ward", "ऑपरेशन के बाद वार्ड"), ("Nursing care and pain control after surgery.", "सर्जरी के बाद नर्सिंग व दर्द नियंत्रण।")),
                   ("🫀", ("ICU backup", "ICU सहायता"), ("ICU support for high-risk patients.", "ज़्यादा जोखिम वाले मरीज़ों के लिए ICU।"))],
        visit=[(("Consultation", "परामर्श"), ("The surgeon examines you and explains whether you need an operation.", "सर्जन जाँच कर बताते हैं कि ऑपरेशन चाहिए या नहीं।")),
               (("Tests", "जाँच"), ("Blood tests, ultrasound or X-ray, and a fitness check.", "खून की जाँच, अल्ट्रासाउंड या एक्स-रे, और फ़िटनेस जाँच।")),
               (("Plan &amp; consent", "योजना व सहमति"), ("Date, type of surgery, anaesthesia and costs or Ayushman cover explained.", "तारीख़, सर्जरी का प्रकार, बेहोशी और ख़र्च या आयुष्मान कवर समझाया जाता है।")),
               (("Operation", "ऑपरेशन"), ("Done in our operation theatre; laparoscopic when suitable.", "हमारे ऑपरेशन थिएटर में; उपयुक्त हो तो दूरबीन से।")),
               (("Recovery", "रिकवरी"), ("Ward care, discharge advice, stitch removal and dressings.", "वार्ड में देखभाल, छुट्टी की सलाह, टाँके खुलना और ड्रेसिंग।"))],
        tips_title=("Before and after an operation", "ऑपरेशन से पहले और बाद"),
        tips=[("🍽️", ("Fasting", "खाली पेट"), ("Don't eat or drink for the hours the team advises before surgery.", "ऑपरेशन से पहले टीम द्वारा बताए घंटों तक कुछ न खाएँ-पिएँ।")),
              ("💊", ("Tell us your medicines", "अपनी दवाएँ बताएँ"), ("Especially blood thinners, diabetes and BP medicines.", "ख़ासकर खून पतला करने, शुगर और बीपी की दवाएँ।")),
              ("🚶", ("Walk early", "जल्दी चलें"), ("Gentle walking after surgery helps recovery and prevents clots.", "सर्जरी के बाद हल्का चलना रिकवरी में मदद करता है।")),
              ("🩹", ("Keep the wound clean", "घाव साफ़ रखें"), ("Come back if it becomes red, swollen or starts discharging.", "लाल, सूजा या मवाद आए तो दोबारा दिखाएँ।"))],
        faq_more=[(("How long will I stay in hospital?", "कितने दिन अस्पताल में रहना होगा?"), ("After many laparoscopic operations, patients go home in 1–3 days. Your surgeon will tell you what to expect for your operation.", "कई दूरबीन ऑपरेशन के बाद मरीज़ 1–3 दिन में घर जाते हैं। आपके ऑपरेशन के बारे में सर्जन बताएँगे।"))],
        cta=("Need an operation? Talk to our surgeons first.", "ऑपरेशन की ज़रूरत है? पहले हमारे सर्जन से बात करें।"))

    # ------------------------------------------------------------ ENT
    add("ent",
        about_title=("Small organs, big impact", "छोटे अंग, बड़ा असर"),
        about=[("Ears, nose and throat affect how we hear, breathe, eat and speak. Problems here are very common, especially in children, and are often easy to treat when caught early.",
                "कान, नाक और गला हमारे सुनने, सांस लेने, खाने और बोलने को प्रभावित करते हैं। यहाँ की समस्याएँ बहुत आम हैं, ख़ासकर बच्चों में, और जल्दी पकड़ में आने पर आसानी से ठीक होती हैं।"),
               ("Our ENT team examines and treats ear infections, wax, hearing difficulty, sinus and allergy problems, nose bleeds, tonsils and throat infections. When medicines aren't enough, operations such as tonsil removal can be done in our operation theatre.",
                "हमारी ENT टीम कान का संक्रमण, मैल, कम सुनाई देना, साइनस व एलर्जी, नाक से खून, टॉन्सिल और गले के संक्रमण की जाँच व इलाज करती है। दवा से ठीक न हो तो टॉन्सिल जैसे ऑपरेशन हमारे ऑपरेशन थिएटर में हो सकते हैं।"),
               ("Children who swallow or push something into the ear or nose are seen urgently. Please don't try to remove it at home, as this can push it deeper.",
                "जिन बच्चों ने कुछ निगल लिया हो या कान-नाक में डाल लिया हो, उन्हें तुरंत देखा जाता है। घर पर निकालने की कोशिश न करें, इससे वह और अंदर जा सकता है।")],
        see_doctor=[("Ear pain, discharge or reduced hearing", "कान दर्द, मवाद या कम सुनाई देना"), ("Ringing in the ears", "कान में आवाज़ आना"),
                    ("Blocked nose or sinus pain for weeks", "हफ़्तों से नाक बंद या साइनस दर्द"), ("Repeated sore throats or tonsils", "बार-बार गला ख़राब या टॉन्सिल"),
                    ("Hoarse voice for more than 3 weeks", "3 हफ़्ते से ज़्यादा आवाज़ बैठना"), ("Snoring with pauses in breathing", "खर्राटे के साथ सांस रुकना")],
        conditions_more=[("Vertigo / dizziness", "चक्कर आना"), ("Ear drum perforation", "कान के पर्दे में छेद"), ("Adenoids in children", "बच्चों में एडेनॉइड")],
        tips=[("🦻", ("No cotton buds deep inside", "कान में गहराई तक बड्स नहीं"), ("They push wax in and can hurt the ear drum.", "इनसे मैल अंदर जाता है और पर्दा फट सकता है।")),
              ("💧", ("Keep ears dry", "कान सूखे रखें"), ("If you've had an ear infection, avoid water entering the ear.", "कान में संक्रमण रहा हो तो पानी जाने से बचाएँ।")),
              ("🔊", ("Lower the volume", "आवाज़ कम रखें"), ("Loud music through earphones damages hearing over time.", "ईयरफ़ोन पर तेज़ आवाज़ धीरे-धीरे सुनने की क्षमता घटाती है।")),
              ("🩸", ("Nose bleed first aid", "नाक से खून में"), ("Sit up, lean forward and pinch the soft part of the nose for 10 minutes.", "बैठें, आगे झुकें और नाक के नरम हिस्से को 10 मिनट दबाएँ।"))],
        faq_more=[(("Can you check my child's hearing?", "क्या बच्चे की सुनने की जाँच होगी?"), ("Book an ENT visit; the doctor will examine your child's ears and advise further hearing tests if needed.", "ENT ओपीडी बुक करें; डॉक्टर कान की जाँच करेंगे और ज़रूरत हो तो आगे की जाँच बताएँगे।"))],
        cta=("Ear, nose or throat trouble? Book an ENT visit.", "नाक, कान या गले में तकलीफ़? ENT ओपीडी बुक करें।"))

    # ------------------------------------------------------------ PAEDIATRICS
    add("paediatrics",
        about_title=("Children aren't small adults", "बच्चे छोटे बड़े नहीं होते"),
        about=[("Children fall sick differently from adults, need different doses and need gentle handling. Our Paediatrics department cares for newborns, infants, children and teenagers — from routine check-ups and vaccines to serious illness.",
                "बच्चे बड़ों से अलग तरह से बीमार पड़ते हैं, उन्हें अलग खुराक और कोमल देखभाल चाहिए। हमारा शिशु रोग विभाग नवजात, शिशुओं, बच्चों और किशोरों की देखभाल करता है — नियमित जाँच और टीकों से लेकर गंभीर बीमारी तक।"),
               ("Common problems like fever, cough, diarrhoea and skin rashes are treated in OPD. Children who need admission are cared for in our ward, and those who are very sick move to our 24×7 PICU — or NICU for newborns — without leaving the hospital.",
                "बुखार, खांसी, दस्त और दाने जैसी आम बीमारियों का इलाज ओपीडी में होता है। भर्ती की ज़रूरत वाले बच्चों की देखभाल वार्ड में, और बहुत बीमार बच्चे अस्पताल छोड़े बिना हमारे 24×7 PICU — या नवजात NICU — में जाते हैं।"),
               ("We also track growth and nutrition, because poor weight gain and anaemia are common and treatable. Paediatrics and Neonatal care are covered under Ayushman Bharat at AHS.",
                "हम विकास और पोषण पर भी नज़र रखते हैं, क्योंकि कम वज़न और खून की कमी आम हैं और इलाज योग्य हैं। AHS में शिशु रोग और नवजात देखभाल आयुष्मान भारत में शामिल हैं।")],
        see_doctor=[("Fever for more than 2 days", "2 दिन से ज़्यादा बुखार"), ("Loose motions with fewer wet nappies", "दस्त के साथ कम पेशाब"),
                    ("Fast breathing or chest indrawing", "तेज़ सांस या पसली चलना"), ("Not gaining weight or not eating", "वज़न न बढ़ना या खाना न खाना"),
                    ("Rash with fever", "बुखार के साथ दाने"), ("Ear pain or pulling at the ear", "कान दर्द या कान खींचना")],
        bring=[("Vaccination card", "टीकाकरण कार्ड"), ("Birth papers for newborns", "नवजात के जन्म के कागज़"), ("Previous prescriptions and reports", "पुराने पर्चे और रिपोर्ट"),
               ("Ayushman card or Aadhaar of a parent", "माता या पिता का आयुष्मान कार्ड या आधार"), ("Extra clothes, nappies and water", "अतिरिक्त कपड़े, डायपर और पानी")],
        tips=[("🧂", ("ORS for loose motions", "दस्त में ORS"), ("Give ORS after every loose stool and continue feeding.", "हर दस्त के बाद ORS दें और खिलाना जारी रखें।")),
              ("🌡️", ("Fever care", "बुखार में देखभाल"), ("Light clothes, plenty of fluids and paracetamol in the right dose for weight.", "हल्के कपड़े, ख़ूब तरल और वज़न के अनुसार सही खुराक में पैरासिटामोल।")),
              ("💉", ("Vaccines on time", "टीके समय पर"), ("Follow the vaccination card; we can remind you on WhatsApp.", "टीकाकरण कार्ड के अनुसार लगवाएँ; हम व्हाट्सऐप पर याद दिला सकते हैं।")),
              ("🥗", ("Iron-rich food", "आयरन वाला खाना"), ("Green vegetables, dal, eggs and jaggery help prevent anaemia.", "हरी सब्ज़ी, दाल, अंडा और गुड़ खून की कमी से बचाते हैं।"))],
        faq_more=[(("Can I get my child vaccinated here?", "क्या यहाँ बच्चे को टीका लग सकता है?"), ("Yes. Bring the vaccination card and we'll give the vaccines that are due. See our Child Care page.", "हाँ। टीकाकरण कार्ड लाएँ, जो टीका बाकी है वह लगेगा। चाइल्ड केयर पेज देखें।"))],
        cta=("Is your child unwell? Book a visit today.", "बच्चा बीमार है? आज ही दिखाएँ।"))

    # ------------------------------------------------------------ ORTHOPAEDICS
    add("orthopaedics",
        about_title=("From the fracture to full movement", "फ्रैक्चर से लेकर पूरी तरह चलने तक"),
        about=[("Orthopaedics treats bones, joints, muscles and the spine. A large part of our work is injuries — from falls at home to road accidents — which are seen 24×7 through Emergency, with X-ray available at any hour.",
                "हड्डी रोग विभाग हड्डियों, जोड़ों, मांसपेशियों और रीढ़ का इलाज करता है। हमारे काम का बड़ा हिस्सा चोटें हैं — घर में गिरने से लेकर सड़क दुर्घटना तक — जिन्हें इमरजेंसी में 24×7 देखा जाता है, एक्स-रे किसी भी समय उपलब्ध।"),
               ("Fractures are treated with plaster, splints or surgery depending on the break. We also treat long-term problems like knee arthritis, back and neck pain, and shoulder stiffness with medicines, injections, physiotherapy and surgery when needed.",
                "फ्रैक्चर का इलाज टूटन के अनुसार प्लास्टर, स्प्लिंट या सर्जरी से होता है। घुटने का गठिया, कमर-गर्दन दर्द और कंधे की जकड़न जैसी लंबी समस्याओं का इलाज दवा, इंजेक्शन, फ़िज़ियोथेरेपी और ज़रूरत हो तो सर्जरी से होता है।"),
               ("For elderly or bed-ridden patients who have fallen, our portable X-ray can come to your home, so you know whether there's a fracture before moving them.",
                "गिरे हुए बुज़ुर्ग या बिस्तर पर रहने वाले मरीज़ों के लिए हमारा पोर्टेबल एक्स-रे घर आ सकता है, ताकि हिलाने से पहले पता चल जाए कि फ्रैक्चर है या नहीं।")],
        see_doctor=[("Pain and swelling after a fall or injury", "गिरने या चोट के बाद दर्द और सूजन"), ("Can't put weight on a leg", "पैर पर वज़न न डाल पाना"),
                    ("Knee pain when climbing stairs", "सीढ़ी चढ़ते समय घुटने में दर्द"), ("Back pain spreading down the leg", "पैर तक जाता कमर दर्द"),
                    ("Joint stiffness in the morning", "सुबह जोड़ों में जकड़न"), ("Numbness or tingling in hands or feet", "हाथ-पैरों में सुन्नपन या झनझनाहट")],
        conditions_more=[("Frozen shoulder", "फ्रोज़न शोल्डर"), ("Osteoporosis (weak bones)", "हड्डियों का कमज़ोर होना"), ("Tennis elbow", "टेनिस एल्बो"), ("Heel pain", "एड़ी का दर्द")],
        tips=[("🧊", ("First aid for sprains", "मोच में प्राथमिक उपचार"), ("Rest, ice wrapped in cloth, a firm bandage and keep the limb raised.", "आराम, कपड़े में लपेटकर बर्फ़, कसी पट्टी और अंग ऊपर रखें।")),
              ("🪵", ("Splint before moving", "हिलाने से पहले सहारा"), ("Support a suspected fracture with a stick or cardboard before travelling.", "फ्रैक्चर का शक हो तो सफ़र से पहले लकड़ी या गत्ते से सहारा दें।")),
              ("🥛", ("Calcium and sunlight", "कैल्शियम और धूप"), ("Milk, curd and some morning sun keep bones strong.", "दूध, दही और सुबह की धूप हड्डियाँ मज़बूत रखते हैं।")),
              ("🏠", ("Prevent falls at home", "घर में गिरने से बचाएँ"), ("Good lighting and no loose mats help elderly people stay safe.", "अच्छी रोशनी और फिसलने वाली चटाई हटाकर बुज़ुर्गों को सुरक्षित रखें।"))],
        faq_more=[(("How long does a plaster stay on?", "प्लास्टर कितने दिन रहता है?"), ("Usually 3–6 weeks, depending on the bone and the age of the patient. Your doctor will check with a follow-up X-ray.", "आमतौर पर 3–6 हफ़्ते, हड्डी और उम्र के अनुसार। डॉक्टर फ़ॉलो-अप एक्स-रे से जाँचेंगे।"))],
        cta=("Injury or joint pain? Get it checked today.", "चोट या जोड़ों का दर्द? आज ही जाँच कराएँ।"))

    extend_services(pages)


def extend_services(pages):
    def add(slug, **kw):
        p = pages[slug]
        for k, v in kw.items():
            if k == "faq_more":
                p["faq"] = p["faq"] + v
            elif k == "included_more":
                p["included"] = p["included"] + v
            else:
                p[k] = v

    BOOKING = (("Booking", "बुकिंग"), ("WhatsApp or call " + PHONE, "व्हाट्सऐप या कॉल " + PHONE))
    AREA = (("Service area", "सेवा क्षेत्र"), ("Samastipur &amp; nearby areas", "समस्तीपुर व आसपास"))
    CHARGES = (("Charges", "शुल्क"), ("Told before confirming", "पुष्टि से पहले बताया जाएगा"))

    add("virtual-consultation", about_side="facts",
        about_title=("Doctor's advice, without the journey", "बिना सफ़र के डॉक्टर की सलाह"),
        about=[("Travelling to a hospital for a short follow-up can take a whole day for families outside town. A virtual consultation lets you talk to an AHS doctor on a WhatsApp video call from home.",
                "शहर से बाहर के परिवारों के लिए छोटे से फ़ॉलो-अप के लिए अस्पताल आना पूरा दिन ले लेता है। ऑनलाइन परामर्श से आप घर से व्हाट्सऐप वीडियो कॉल पर AHS डॉक्टर से बात कर सकते हैं।"),
               ("It works best for follow-ups after a hospital visit, reviewing reports, adjusting diabetes or BP medicines, and deciding whether you need to come in. The doctor sends the prescription on WhatsApp after the call.",
                "यह अस्पताल से लौटने के बाद फ़ॉलो-अप, रिपोर्ट दिखाने, शुगर या बीपी की दवा बदलने, और यह तय करने के लिए सबसे अच्छा है कि अस्पताल आना है या नहीं। कॉल के बाद डॉक्टर पर्चा व्हाट्सऐप पर भेजते हैं।"),
               ("Some problems need an examination in person. If the doctor feels that's the case, we'll book an OPD visit for you.",
                "कुछ समस्याओं में सामने जाँच ज़रूरी है। डॉक्टर को ऐसा लगे तो हम आपके लिए ओपीडी बुक करेंगे।")],
        glance=[(("Mode", "माध्यम"), ("WhatsApp video call", "व्हाट्सऐप वीडियो कॉल")), (("Prescription", "पर्चा"), ("On WhatsApp", "व्हाट्सऐप पर")),
                (("Departments", "विभाग"), ("Medicine, Paediatrics, Surgery, Ortho, ENT", "मेडिसिन, शिशु रोग, सर्जरी, हड्डी, ENT")), BOOKING, CHARGES],
        ready=[("A phone with WhatsApp and good network", "व्हाट्सऐप और अच्छे नेटवर्क वाला फ़ोन"), ("Recent reports, sent on WhatsApp before the call", "हाल की रिपोर्ट, कॉल से पहले व्हाट्सऐप पर भेजें"),
               ("Your current medicines, to show on camera", "अभी ली जा रही दवाएँ, कैमरे पर दिखाने के लिए"), ("BP or sugar readings, if you check at home", "घर पर जाँची गई बीपी या शुगर रीडिंग"),
               ("A quiet, well-lit place", "शांत और रोशनी वाली जगह")],
        safety=[("Only your doctor and our team see your reports", "आपकी रिपोर्ट सिर्फ़ डॉक्टर व हमारी टीम देखती है"), ("Medicines are prescribed only when safe without an examination", "दवा तभी लिखी जाती है जब बिना जाँच के सुरक्षित हो"),
                ("If it's an emergency, we'll tell you to come in immediately", "इमरजेंसी हो तो हम तुरंत आने को कहेंगे")],
        faq_more=[(("Can someone else talk on behalf of the patient?", "क्या मरीज़ की जगह कोई और बात कर सकता है?"), ("A family member can join, but the doctor should be able to see and speak to the patient.", "परिवार का सदस्य साथ रह सकता है, पर डॉक्टर को मरीज़ को देखना और उससे बात करनी चाहिए।")),
                  (("What if the call drops?", "अगर कॉल कट जाए?"), ("The doctor will call back. If the network is poor, a voice call can be used.", "डॉक्टर दोबारा कॉल करेंगे। नेटवर्क कमज़ोर हो तो वॉइस कॉल से बात हो सकती है।"))])

    add("home-care", about_side="facts",
        about_title=("Recovery is easier at home", "घर पर ठीक होना आसान है"),
        about=[("After an operation, a long illness or a stroke, many patients don't need to stay in hospital but still need nursing — injections, dressings, catheter care or exercises. Travelling for these every day is hard on the patient and the family.",
                "ऑपरेशन, लंबी बीमारी या लकवे के बाद कई मरीज़ों को अस्पताल में रहने की ज़रूरत नहीं होती, पर नर्सिंग चाहिए होती है — इंजेक्शन, ड्रेसिंग, कैथेटर केयर या व्यायाम। इसके लिए रोज़ आना मरीज़ और परिवार दोनों के लिए मुश्किल है।"),
               ("AHS Home Care sends trained nurses and staff to your home in Samastipur and nearby areas. They follow your doctor's prescription, use sterile supplies, and report back to the doctor if anything changes.",
                "AHS होम केयर समस्तीपुर व आसपास के इलाकों में प्रशिक्षित नर्स व स्टाफ़ आपके घर भेजता है। वे डॉक्टर के पर्चे के अनुसार काम करते हैं, साफ़-सुथरी (स्टेराइल) सामग्री इस्तेमाल करते हैं, और कुछ बदले तो डॉक्टर को बताते हैं।"),
               ("Visits can be one-time or regular. Our team tells you the charges before confirming, so there are no surprises.",
                "विज़िट एक बार या नियमित हो सकती है। पुष्टि से पहले हमारी टीम शुल्क बताती है, ताकि कोई अचानक ख़र्च न हो।")],
        glance=[AREA, (("Visits", "विज़िट"), ("One-time or regular", "एक बार या नियमित")), (("Staff", "स्टाफ़"), ("Trained nurses &amp; physiotherapy", "प्रशिक्षित नर्स व फ़िज़ियोथेरेपी")), BOOKING, CHARGES],
        ready=[("Doctor's prescription for injections or drips", "इंजेक्शन या ड्रिप के लिए डॉक्टर का पर्चा"), ("The medicines and injections, if bought already", "दवाएँ और इंजेक्शन, अगर पहले से ख़रीदे हों"),
               ("Discharge summary after an operation", "ऑपरेशन के बाद डिस्चार्ज समरी"), ("A clean table and good light near the patient", "मरीज़ के पास साफ़ मेज़ और अच्छी रोशनी")],
        safety=[("Sterile, single-use supplies for injections and dressings", "इंजेक्शन व ड्रेसिंग में स्टेराइल, एक बार इस्तेमाल होने वाली सामग्री"), ("Staff carry AHS identification", "स्टाफ़ के पास AHS पहचान पत्र"),
                ("Any warning signs are reported to the doctor the same day", "कोई चेतावनी संकेत हो तो उसी दिन डॉक्टर को सूचना")],
        tips=[("🛏️", ("Prevent bed sores", "बेड सोर से बचाव"), ("Change the patient's position every 2 hours and keep the skin dry.", "हर 2 घंटे में करवट बदलें और त्वचा सूखी रखें।")),
              ("🧴", ("Hand hygiene", "हाथों की सफ़ाई"), ("Wash hands before and after caring for the patient.", "देखभाल से पहले और बाद में हाथ धोएँ।")),
              ("🥤", ("Fluids and food", "तरल और भोजन"), ("Bed-bound patients need regular water and soft, nutritious food.", "बिस्तर पर रहने वाले मरीज़ को नियमित पानी और नरम पौष्टिक भोजन चाहिए।"))],
        faq_more=[(("Can you visit every day?", "क्या रोज़ आ सकते हैं?"), ("Yes, for courses of injections, dressings or physiotherapy we can plan daily visits.", "हाँ, इंजेक्शन, ड्रेसिंग या फ़िज़ियोथेरेपी के कोर्स के लिए रोज़ की विज़िट तय कर सकते हैं।"))])

    add("doorstep-xray", about_side="facts",
        about_title=("When moving the patient is the problem", "जब मरीज़ को हिलाना ही मुश्किल हो"),
        about=[("Getting an X-ray usually means lifting the patient, travelling and waiting. For an elderly person with a suspected hip fracture, a bed-ridden patient with a chest infection or someone who has just been injured, that journey can be painful or risky.",
                "एक्स-रे के लिए आमतौर पर मरीज़ को उठाना, सफ़र करना और इंतज़ार करना पड़ता है। कूल्हे में फ्रैक्चर के शक वाले बुज़ुर्ग, छाती में संक्रमण वाले बिस्तर पर पड़े मरीज़ या अभी घायल हुए व्यक्ति के लिए यह सफ़र दर्दनाक या ख़तरनाक हो सकता है।"),
               ("Our portable digital X-ray unit comes to the patient instead — to the bedside in our wards and ICU, and to homes across Samastipur and nearby areas, 24×7. A trained technician takes the X-ray with proper radiation safety, and the images and report are shared on WhatsApp.",
                "हमारी पोर्टेबल डिजिटल एक्स-रे यूनिट इसके बजाय मरीज़ के पास आती है — हमारे वार्ड और ICU में बेड तक, और समस्तीपुर व आसपास के घरों तक, 24×7। प्रशिक्षित टेक्नीशियन विकिरण सुरक्षा के साथ एक्स-रे लेते हैं, और तस्वीरें व रिपोर्ट व्हाट्सऐप पर भेजी जाती हैं।"),
               ("On the same visit, our team can also collect blood and urine samples for the 24×7 lab, so you don't need a second trip.",
                "उसी विज़िट में हमारी टीम 24×7 लैब के लिए खून और पेशाब का सैंपल भी ले सकती है, ताकि दूसरी बार आना न पड़े।")],
        glance=[(("Availability", "उपलब्धता"), ("24×7", "24×7")), AREA, (("Report", "रिपोर्ट"), ("On WhatsApp", "व्हाट्सऐप पर")), (("Lab samples", "लैब सैंपल"), ("Same visit", "उसी विज़िट में")), CHARGES],
        ready=[("Doctor's advice slip, if you have one", "डॉक्टर की पर्ची, अगर हो"), ("Space around the bed for the unit", "यूनिट के लिए बेड के आसपास जगह"),
               ("Remove metal items like chains from the area to be X-rayed", "एक्स-रे वाले हिस्से से चेन जैसी धातु की चीज़ें हटाएँ"), ("Tell us if the patient may be pregnant", "मरीज़ गर्भवती हो सकती हो तो बताएँ")],
        safety=[("Low-dose digital X-ray", "कम डोज़ वाला डिजिटल एक्स-रे"), ("Other family members step away during the exposure", "एक्स-रे के समय परिवार के अन्य सदस्य दूर रहें"),
                ("Trained radiology technician on every visit", "हर विज़िट पर प्रशिक्षित रेडियोलॉजी टेक्नीशियन")],
        faq_more=[(("How quickly can you come?", "कितनी जल्दी आ सकते हैं?"), ("It depends on distance and how many calls we have. Our team will give you an expected time when you book.", "यह दूरी और उस समय की बुकिंग पर निर्भर है। बुक करते समय टीम अनुमानित समय बताएगी।")),
                  (("Who reads the X-ray?", "एक्स-रे कौन पढ़ता है?"), ("The images are reported and shared with you; please show them to your treating doctor.", "तस्वीरों की रिपोर्ट बनाकर आपको भेजी जाती है; अपने डॉक्टर को दिखाएँ।"))])

    add("elder-care", about_side="facts",
        about_title=("Peace of mind for the whole family", "पूरे परिवार के लिए निश्चिंतता"),
        about=[("Many parents in Samastipur live at home while their children work in other cities. Small problems — a missed medicine, rising BP, a fall — can become serious when no one is nearby.",
                "समस्तीपुर में कई माता-पिता घर पर रहते हैं और बच्चे दूसरे शहरों में काम करते हैं। छोटी समस्याएँ — छूटी दवा, बढ़ता बीपी, गिरना — पास कोई न हो तो गंभीर हो सकती हैं।"),
               ("AHS Elder Care brings regular check-ups, nursing, physiotherapy, X-ray and lab tests to your parents' home, and keeps the family updated on WhatsApp. If something needs a doctor's attention, we arrange a video consultation or an OPD visit.",
                "AHS एल्डर केयर नियमित जाँच, नर्सिंग, फ़िज़ियोथेरेपी, एक्स-रे और लैब जाँच आपके माता-पिता के घर पहुँचाता है, और परिवार को व्हाट्सऐप पर अपडेट देता है। डॉक्टर की ज़रूरत हो तो हम वीडियो परामर्श या ओपीडी तय करते हैं।"),
               ("Since 2024, all citizens aged 70 and above can get the Ayushman Vay Vandana card, which gives free hospital treatment under Ayushman Bharat in the departments covered at AHS.",
                "2024 से 70 वर्ष और उससे अधिक उम्र के सभी नागरिक आयुष्मान वय वंदना कार्ड बनवा सकते हैं, जिससे AHS के शामिल विभागों में आयुष्मान भारत के तहत मुफ्त भर्ती इलाज मिलता है।")],
        glance=[AREA, (("Visits", "विज़िट"), ("One-time or regular", "एक बार या नियमित")), (("Family updates", "परिवार को अपडेट"), ("On WhatsApp", "व्हाट्सऐप पर")), BOOKING, CHARGES],
        ready=[("List of medicines and their timings", "दवाओं और उनके समय की सूची"), ("Old reports and prescriptions in one folder", "पुरानी रिपोर्ट और पर्चे एक फ़ोल्डर में"),
               ("BP machine or glucometer, if you have one", "बीपी मशीन या ग्लूकोमीटर, अगर हो"), ("A family contact number for updates", "अपडेट के लिए परिवार का संपर्क नंबर")],
        safety=[("Same small team visits, so your parents know who's coming", "वही छोटी टीम आती है, ताकि माता-पिता पहचानें"), ("Staff carry AHS identification", "स्टाफ़ के पास AHS पहचान पत्र"),
                ("Any warning sign is shared with the family and doctor at once", "कोई चेतावनी संकेत हो तो तुरंत परिवार व डॉक्टर को सूचना")],
        tips=[("💊", ("Pill organiser", "दवा का डिब्बा"), ("A weekly pill box helps avoid missed or double doses.", "हफ़्ते वाला दवा का डिब्बा दवा छूटने या दो बार लेने से बचाता है।")),
              ("🚶", ("Daily walk", "रोज़ टहलना"), ("Gentle walking keeps joints and heart healthy.", "हल्का टहलना जोड़ों और दिल को स्वस्थ रखता है।")),
              ("💡", ("Night light", "रात में रोशनी"), ("A small light on the way to the bathroom prevents falls.", "बाथरूम के रास्ते में छोटी रोशनी गिरने से बचाती है।")),
              ("🩺", ("Yearly check-up", "साल में एक बार जाँच"), ("Sugar, BP, eyes, kidneys and bones.", "शुगर, बीपी, आँखें, किडनी और हड्डियाँ।"))],
        faq_more=[(("Can you help us get the Vay Vandana card?", "क्या वय वंदना कार्ड बनवाने में मदद करेंगे?"), ("Yes. Bring your parent's Aadhaar to our Ayushman desk and we'll guide you.", "हाँ। माता-पिता का आधार लेकर हमारे आयुष्मान डेस्क पर आएँ, हम मदद करेंगे।"))])

    add("child-care", about_side="facts",
        about_title=("Growing up healthy", "स्वस्थ बचपन"),
        about=[("The first five years shape a child's health for life. Regular check-ups, vaccines on time and good nutrition prevent many illnesses before they start.",
                "पहले पाँच साल बच्चे की ज़िंदगी भर की सेहत तय करते हैं। नियमित जाँच, समय पर टीके और अच्छा पोषण कई बीमारियों को शुरू होने से पहले रोकते हैं।"),
               ("AHS Child Care brings these together: newborn check-ups, routine vaccinations, growth and development checks, nutrition advice for parents, and prompt treatment when your child is unwell.",
                "AHS चाइल्ड केयर ये सब एक साथ देता है: नवजात जाँच, नियमित टीकाकरण, विकास की जाँच, माता-पिता के लिए पोषण सलाह, और बच्चा बीमार हो तो तुरंत इलाज।"),
               ("If your child ever needs more care, our Paediatrics team, 24×7 NICU and PICU are in the same hospital.",
                "बच्चे को कभी ज़्यादा देखभाल चाहिए हो तो हमारी शिशु रोग टीम, 24×7 NICU और PICU उसी अस्पताल में हैं।")],
        glance=[(("Ages", "उम्र"), ("Newborn to teens", "नवजात से किशोर")), (("Vaccination", "टीकाकरण"), ("Available", "उपलब्ध")), (("NICU / PICU", "NICU / PICU"), ("24×7", "24×7")),
                (("Ayushman Bharat", "आयुष्मान भारत"), ("Paediatrics covered", "शिशु रोग शामिल")), BOOKING],
        ready=[("Vaccination card", "टीकाकरण कार्ड"), ("Birth papers for a newborn", "नवजात के जन्म के कागज़"), ("Notes on feeding, sleep or any worries", "दूध, नींद या किसी चिंता के बारे में नोट"),
               ("A spare set of clothes and nappies", "अतिरिक्त कपड़े और डायपर")],
        safety=[("Vaccines stored in a temperature-controlled fridge", "टीके तापमान-नियंत्रित फ्रिज में रखे जाते हैं"), ("Child-friendly, gentle handling", "बच्चों के अनुकूल, कोमल व्यवहार"),
                ("Next vaccine date written on the card and reminded on WhatsApp", "अगले टीके की तारीख़ कार्ड पर और व्हाट्सऐप पर याद")],
        tips=[("🤱", ("Only breast milk for 6 months", "6 महीने तक सिर्फ़ माँ का दूध"), ("No water, honey or other milk unless the doctor advises.", "डॉक्टर की सलाह के बिना पानी, शहद या दूसरा दूध नहीं।")),
              ("🥣", ("Start solids at 6 months", "6 महीने पर ऊपरी आहार"), ("Mashed dal, rice, khichdi and fruits, alongside breast milk.", "माँ के दूध के साथ मसली दाल, चावल, खिचड़ी और फल।")),
              ("🧼", ("Clean hands, clean water", "साफ़ हाथ, साफ़ पानी"), ("Prevents most diarrhoea in children.", "बच्चों में ज़्यादातर दस्त से बचाता है।")),
              ("📏", ("Track growth", "विकास पर नज़र"), ("Weigh your child regularly in the first two years.", "पहले दो साल नियमित वज़न कराएँ।"))],
        faq_more=[(("Do you see children on weekends?", "क्या सप्ताहांत में बच्चों को देखते हैं?"), ("Emergency, NICU and PICU are open 24×7. For OPD and vaccination timings, please call " + PHONE + ".", "इमरजेंसी, NICU और PICU 24×7 खुले हैं। ओपीडी और टीकाकरण के समय के लिए " + PHONE + " पर कॉल करें।"))])


# ---------------------------------------------------------------- extra sections for custom pages
def extra_about(b):
    L = b.L
    out = b.section(b.head(("What we stand for", "हमारे मूल्य"), ("Our mission", "हमारा मिशन")) + "\n" + b.cards([
        ("⏱️", ("No delay in emergencies", "इमरजेंसी में देरी नहीं"), ("Treatment starts first; paperwork can wait.", "पहले इलाज; कागज़ी काम बाद में।")),
        ("🤝", ("Care for those in need", "ज़रूरतमंदों का इलाज"), ("Cashless treatment through Ayushman Bharat and PM-RAHAT.", "आयुष्मान भारत व PM-RAHAT से कैशलेस इलाज।")),
        ("🗣️", ("Explain clearly", "साफ़ समझाना"), ("Patients and families understand the treatment and the cost before it starts.", "इलाज शुरू होने से पहले मरीज़ व परिवार इलाज और ख़र्च समझें।")),
        ("🏠", ("Care beyond the hospital", "अस्पताल से आगे देखभाल"), ("Home care, doorstep X-ray, elder care and video consultations.", "होम केयर, घर पर एक्स-रे, बुज़ुर्ग देखभाल और वीडियो परामर्श।"))]))
    out += b.section(f"""        <div class="two">
          <div class="prose">
            <span class="kicker">{L(("The AHS family", "AHS परिवार"))}</span>
            <h2 class="h2">{L(("A hospital and a nursing college, side by side", "एक अस्पताल और एक नर्सिंग कॉलेज, साथ-साथ"))}</h2>
            <p>{L(("The Sir Syed Educational &amp; Charitable Trust runs both AHS Global Hospital and AHS Nursing College in Samastipur. The college is approved by the Indian Nursing Council and trains ANM, GNM and B.Sc Nursing students.", "सर सैयद एजुकेशनल एंड चैरिटेबल ट्रस्ट समस्तीपुर में एएचएस ग्लोबल हॉस्पिटल और एएचएस नर्सिंग कॉलेज दोनों चलाता है। कॉलेज भारतीय नर्सिंग परिषद से मान्यता प्राप्त है और ANM, GNM व B.Sc नर्सिंग के छात्रों को प्रशिक्षित करता है।"))}</p>
            <p>{L(("Students train on our wards, in the ICU and in Emergency under our doctors and nursing staff, and our doctors lead training such as emergency and mass-casualty drills. For patients, this means more trained hands at the bedside.", "छात्र हमारे डॉक्टरों व नर्सिंग स्टाफ़ की देखरेख में वार्ड, ICU और इमरजेंसी में प्रशिक्षण लेते हैं, और हमारे डॉक्टर इमरजेंसी व मास-कैज़ुअल्टी ड्रिल जैसे प्रशिक्षण कराते हैं। मरीज़ों के लिए इसका मतलब है बेड के पास ज़्यादा प्रशिक्षित हाथ।"))}</p>
            <div class="cta"><a class="pill pill--ghost pill--arrow" href="https://ahscollege.ac.in/" target="_blank" rel="noopener">{L(("Visit AHS Nursing College", "एएचएस नर्सिंग कॉलेज देखें"))}<i aria-hidden="true">↗</i></a></div>
          </div>
          <div class="contact__photo"><img src="assets/img/icu-care.jpg" alt="Nursing student caring for a patient in the ICU" loading="lazy" style="object-position:50% 30%"></div>
        </div>""")
    out += b.section(b.head(("Departments", "विभाग"), ("Treatments at AHS", "AHS में इलाज")) + "\n" +
                     b.related(["emergency", "nicu-picu", "general-medicine", "general-surgery", "ent", "paediatrics", "orthopaedics"]))
    return out


def extra_director(b):
    L = b.L
    out = b.section(f"""        <div class="two">
          <div class="prose">
            <span class="kicker">{L(("About Dr Kamran ul Haque", "डॉ कामरान उल हक़ के बारे में"))}</span>
            <h2 class="h2">{L(("An emergency physician leading the hospital", "अस्पताल का नेतृत्व करते एक इमरजेंसी चिकित्सक"))}</h2>
            <p>{L(("Dr Kamran ul Haque completed his MBBS and an MD in Emergency Medicine, and worked in emergency medicine at Max Hospital, Delhi, before returning to lead AHS Global Hospital as its Director.", "डॉ कामरान उल हक़ ने MBBS और इमरजेंसी मेडिसिन में MD किया, और AHS ग्लोबल हॉस्पिटल के निदेशक बनने से पहले मैक्स हॉस्पिटल, दिल्ली में इमरजेंसी मेडिसिन में काम किया।"))}</p>
            <p>{L(("His focus is on the first hour of care: quick assessment, early treatment, and systems that work at night as well as during the day. Under his leadership AHS runs 24×7 Emergency, ICU, NICU and PICU, a portable X-ray service, and cashless care under Ayushman Bharat and PM-RAHAT.", "उनका ध्यान इलाज के पहले घंटे पर है: जल्दी जाँच, जल्दी इलाज, और ऐसी व्यवस्था जो दिन की तरह रात में भी चले। उनके नेतृत्व में AHS 24×7 इमरजेंसी, ICU, NICU व PICU, पोर्टेबल एक्स-रे सेवा, और आयुष्मान भारत व PM-RAHAT के तहत कैशलेस इलाज चलाता है।"))}</p>
            <p>{L(("He also teaches. He has led mass-casualty training camps and mental-health awareness sessions for students of AHS Nursing College.", "वे पढ़ाते भी हैं। उन्होंने एएचएस नर्सिंग कॉलेज के छात्रों के लिए मास-कैज़ुअल्टी प्रशिक्षण शिविर और मानसिक स्वास्थ्य जागरूकता सत्र कराए हैं।"))}</p>
          </div>
          <div class="glance"><h3>{L(("OPD with Dr Kamran ul Haque", "डॉ कामरान उल हक़ की ओपीडी"))}</h3><dl>
            <div><dt>{L(("Days", "दिन"))}</dt><dd>{L(("Monday – Friday", "सोमवार – शुक्रवार"))}</dd></div>
            <div><dt>{L(("Time", "समय"))}</dt><dd>{L(("11:30 AM – 3:00 PM", "सुबह 11:30 – दोपहर 3:00"))}</dd></div>
            <div><dt>{L(("Speciality", "विशेषज्ञता"))}</dt><dd>{L(("Emergency Medicine", "इमरजेंसी मेडिसिन"))}</dd></div>
            <div><dt>{L(("Booking", "बुकिंग"))}</dt><dd>{L(("WhatsApp or call " + PHONE, "व्हाट्सऐप या कॉल " + PHONE))}</dd></div>
          </dl></div>
        </div>""")
    return out


def extra_careers(b):
    L = b.L
    out = b.section(b.head(("Why AHS", "AHS क्यों"), ("Why work with us", "हमारे साथ क्यों काम करें")) + "\n" + b.cards([
        ("🚑", ("Real, varied experience", "असली और विविध अनुभव"), ("24×7 emergency, ICU, NICU, PICU, surgery and wards under one roof.", "24×7 इमरजेंसी, ICU, NICU, PICU, सर्जरी और वार्ड एक ही छत के नीचे।")),
        ("🎓", ("A teaching hospital", "टीचिंग अस्पताल"), ("Teach and mentor students of AHS Nursing College.", "एएचएस नर्सिंग कॉलेज के छात्रों को पढ़ाएँ और मार्गदर्शन दें।")),
        ("📈", ("A growing hospital", "बढ़ता हुआ अस्पताल"), ("New services like doorstep X-ray, home care and elder care.", "घर पर एक्स-रे, होम केयर और बुज़ुर्ग देखभाल जैसी नई सेवाएँ।")),
        ("🤝", ("Serve your own community", "अपने समाज की सेवा"), ("Work close to home and care for families in Samastipur.", "घर के पास काम करें और समस्तीपुर के परिवारों की सेवा करें।"))]))
    out += b.section(b.head(("Hiring process", "भर्ती प्रक्रिया"), ("What happens after you apply", "आवेदन के बाद क्या होता है"), "") + "\n" + b.flow([
        (("Apply", "आवेदन"), ("Send your details and CV on WhatsApp.", "व्हाट्सऐप पर जानकारी व CV भेजें।")),
        (("Shortlist", "चयन सूची"), ("HR reviews applications for open roles.", "HR खुले पदों के लिए आवेदन देखता है।")),
        (("Interview", "इंटरव्यू"), ("Meet the department head at the hospital.", "अस्पताल में विभाग प्रमुख से मिलें।")),
        (("Documents", "दस्तावेज़"), ("Certificates, registration and ID are verified.", "प्रमाणपत्र, रजिस्ट्रेशन व पहचान पत्र की जाँच।")),
        (("Join", "जॉइन करें"), ("Induction and department orientation.", "इंडक्शन और विभाग का परिचय।"))]), dark=True)
    out += b.section(b.head(("Questions", "सवाल"), ("Frequently asked", "अक्सर पूछे जाने वाले सवाल")) + "\n" + b.faq([
        (("Do nurses need state registration?", "क्या नर्सों को राज्य रजिस्ट्रेशन चाहिए?"), ("Yes. Nursing staff need a valid registration with the State Nursing Council.", "हाँ। नर्सिंग स्टाफ़ के पास राज्य नर्सिंग परिषद का वैध रजिस्ट्रेशन होना चाहिए।")),
        (("Can freshers apply?", "क्या फ़्रेशर आवेदन कर सकते हैं?"), ("Yes, for suitable roles. Mention your training and any internships in the form.", "हाँ, उपयुक्त पदों के लिए। फ़ॉर्म में अपना प्रशिक्षण और इंटर्नशिप लिखें।"))]))
    return out


def extra_contact(b):
    L = b.L
    out = b.section(b.head(("Which number for what", "किस काम के लिए कहाँ"), ("Reach the right team", "सही टीम तक पहुँचें")) + "\n" + b.cards([
        ("🚑", ("Emergency", "इमरजेंसी"), ("Call " + PHONE + " any time, or dial 112 for an ambulance.", "कभी भी " + PHONE + " पर कॉल करें, या एम्बुलेंस के लिए 112 डायल करें।")),
        ("📅", ("Appointments &amp; OPD", "अपॉइंटमेंट व ओपीडी"), ("WhatsApp " + PHONE + " with the department and preferred date.", "विभाग और तारीख़ के साथ " + PHONE + " पर व्हाट्सऐप करें।")),
        ("🪪", ("Ayushman Bharat &amp; PM-RAHAT", "आयुष्मान भारत व PM-RAHAT"), ("Ask at the help desk at reception, or WhatsApp us.", "रिसेप्शन पर हेल्प डेस्क से पूछें, या व्हाट्सऐप करें।")),
        ("🏠", ("Home services", "होम सेवाएँ"), ("Home care, doorstep X-ray and elder care: book on WhatsApp.", "होम केयर, घर पर एक्स-रे और बुज़ुर्ग देखभाल: व्हाट्सऐप पर बुक करें।")),
        ("💼", ("Careers", "करियर"), ("Apply through the Careers page.", "करियर पेज से आवेदन करें।")),
        ("✉️", ("Email", "ईमेल"), ("info@ahsglobalhospital.com for non-urgent questions.", "ग़ैर-ज़रूरी सवालों के लिए info@ahsglobalhospital.com"))]))
    out += b.section(f"""        <div class="two">
          <div class="prose">
            <span class="kicker">{L(("Finding us", "हम तक पहुँचें"))}</span>
            <h2 class="h2">{L(("Jail Chowk, Tajpur Road", "जेल चौक, ताजपुर रोड"))}</h2>
            <p>{L(("AHS Global Hospital is in the AHS Building at Jail Chowk on Tajpur Road, Samastipur — the same campus as AHS Nursing College. Ask any auto or e-rickshaw for “AHS Hospital, Jail Chowk”.", "एएचएस ग्लोबल हॉस्पिटल समस्तीपुर में ताजपुर रोड पर जेल चौक के पास एएचएस बिल्डिंग में है — एएचएस नर्सिंग कॉलेज के ही परिसर में। किसी भी ऑटो या ई-रिक्शा से “AHS हॉस्पिटल, जेल चौक” कहें।"))}</p>
            <p>{L(("For an emergency, come straight to the Emergency entrance. Staff at reception will guide OPD patients and visitors.", "इमरजेंसी में सीधे इमरजेंसी गेट पर आएँ। ओपीडी मरीज़ों और मिलने वालों को रिसेप्शन का स्टाफ़ रास्ता बताएगा।"))}</p>
          </div>
          <div>
            <span class="kicker">{L(("Visiting patients", "मरीज़ से मिलने आएँ"))}</span>
            <h2 class="h2">{L(("Guidelines for visitors", "मिलने वालों के लिए नियम"))}</h2>
            {b.ticks([("One attendant can stay with an admitted patient", "भर्ती मरीज़ के साथ एक अटेंडेंट रह सकता है"), ("ICU, NICU and PICU visits only as the nurses allow", "ICU, NICU व PICU में नर्स की अनुमति से ही मिलें"), ("Please wash hands before and after visiting", "मिलने से पहले और बाद में हाथ धोएँ"), ("Children and people with fever or cough should avoid visiting", "बच्चे और बुखार-खांसी वाले लोग मिलने न आएँ")])}
          </div>
        </div>""")
    return out


def extra_ayushman(b):
    L = b.L
    return b.section(f"""        <div class="two">
          <div><span class="kicker">{L(("Covered", "शामिल"))}</span><h2 class="h2">{L(("What the scheme pays for", "योजना में क्या मिलता है"))}</h2>
            {b.ticks([("Hospital admission in the covered specialities", "शामिल विभागों में अस्पताल में भर्ती"), ("Surgery, ICU and NICU care", "सर्जरी, ICU और NICU देखभाल"), ("Medicines, tests and X-rays during the stay", "भर्ती के दौरान दवाएँ, जाँच और एक्स-रे"), ("Food and bed charges during admission", "भर्ती के दौरान खाना और बेड शुल्क"), ("Tests and medicines 3 days before and 15 days after admission", "भर्ती से 3 दिन पहले और 15 दिन बाद तक जाँच व दवाएँ")])}</div>
          <div><span class="kicker">{L(("Not covered", "शामिल नहीं"))}</span><h2 class="h2">{L(("What it usually doesn't cover", "आमतौर पर क्या शामिल नहीं"))}</h2>
            {b.ticks([("OPD visits without admission", "बिना भर्ती के ओपीडी"), ("Obstetrics &amp; Gynaecology at AHS", "AHS में स्त्री एवं प्रसूति रोग"), ("Cosmetic treatment", "कॉस्मेटिक इलाज"), ("Treatment in departments not covered at AHS", "AHS में जो विभाग शामिल नहीं, वहाँ इलाज")], True)}
            <p style="margin-top:16px;color:var(--muted);font-size:.92rem">{L(("Scheme rules are set by the National Health Authority and can change. Our desk will confirm your cover before treatment.", "योजना के नियम राष्ट्रीय स्वास्थ्य प्राधिकरण तय करता है और बदल सकते हैं। इलाज से पहले हमारा डेस्क आपका कवर पक्का करेगा।"))}</p></div>
        </div>""")


def extra_rahat(b):
    L = b.L
    out = b.section(b.head(("First aid at the scene", "मौके पर प्राथमिक उपचार"), ("While you wait for help", "मदद आने तक")) + "\n" + b.cards([
        ("🚧", ("Make the scene safe", "जगह सुरक्षित करें"), ("Switch on hazard lights and keep traffic away before helping.", "मदद से पहले हैज़र्ड लाइट जलाएँ और ट्रैफ़िक दूर रखें।")),
        ("🩸", ("Stop the bleeding", "खून रोकें"), ("Press firmly on the wound with a clean cloth.", "साफ़ कपड़े से घाव पर ज़ोर से दबाएँ।")),
        ("🧍", ("Protect the neck", "गर्दन बचाएँ"), ("Don't twist the head or neck; move the person only if there's danger.", "सिर या गर्दन न मोड़ें; ख़तरा हो तभी व्यक्ति को हिलाएँ।")),
        ("🪖", ("Leave the helmet on", "हेलमेट न उतारें"), ("Unless the person can't breathe, let the hospital remove it.", "जब तक सांस में दिक्कत न हो, हेलमेट अस्पताल में उतरवाएँ।")),
        ("🗣️", ("Talk to them", "बात करते रहें"), ("Keep the person calm and awake, and note the time of the accident.", "व्यक्ति को शांत और जागा हुआ रखें, दुर्घटना का समय नोट करें।")),
        ("🚫", ("No food or water", "खाना-पानी नहीं"), ("They may need surgery; give nothing by mouth.", "सर्जरी की ज़रूरत हो सकती है; मुँह से कुछ न दें।"))]))
    out += b.section(f"""        <div class="two">
          <div class="prose"><span class="kicker">{L(("For families", "परिवार के लिए"))}</span><h2 class="h2">{L(("What happens at AHS", "AHS में क्या होता है"))}</h2>
            <p>{L(("Our emergency team starts treatment as soon as the patient arrives. The hospital registers the case on the scheme's system, and the police verify the accident digitally. The family does not have to arrange money for treatment covered by the scheme.", "मरीज़ के पहुँचते ही हमारी इमरजेंसी टीम इलाज शुरू करती है। अस्पताल केस को योजना के सिस्टम पर दर्ज करता है, और पुलिस दुर्घटना का डिजिटल सत्यापन करती है। योजना में शामिल इलाज के लिए परिवार को पैसे का इंतज़ाम नहीं करना पड़ता।"))}</p>
            <p>{L(("Our desk keeps the family informed about the treatment, the cover used, and the options if treatment continues beyond 7 days or ₹1.5 lakh.", "हमारा डेस्क परिवार को इलाज, इस्तेमाल हुए कवर, और 7 दिन या ₹1.5 लाख के बाद इलाज जारी रहने पर विकल्पों की जानकारी देता है।"))}</p></div>
          <div class="glance"><h3>{L(("PM-RAHAT at a glance", "PM-RAHAT एक नज़र में"))}</h3><dl>
            <div><dt>{L(("Cover", "कवर"))}</dt><dd>{L(("Up to ₹1.5 lakh per victim", "प्रति पीड़ित ₹1.5 लाख तक"))}</dd></div>
            <div><dt>{L(("Period", "अवधि"))}</dt><dd>{L(("7 days from the accident", "दुर्घटना से 7 दिन"))}</dd></div>
            <div><dt>{L(("Who", "कौन"))}</dt><dd>{L(("Any road-accident victim", "कोई भी सड़क दुर्घटना पीड़ित"))}</dd></div>
            <div><dt>{L(("Helpline", "हेल्पलाइन"))}</dt><dd>112</dd></div>
            <div><dt>{L(("Paid by", "भुगतान"))}</dt><dd>{L(("Motor Vehicle Accident Fund", "मोटर वाहन दुर्घटना कोष"))}</dd></div>
          </dl></div>
        </div>""")
    return out


EXTRA = {"about": extra_about, "director": extra_director, "careers": extra_careers,
         "contact": extra_contact, "ayushman-bharat": extra_ayushman, "pm-rahat": extra_rahat}

# AHS Nursing College website

A plain HTML/CSS/JS website for AHS Nursing College & Hospital, Samastipur. The design mixes the colours of the college brochure (bright green, pink, yellow, orange) and bento colour tiles with editorial serif headlines, arched photos and outlined cards. Early design concepts are kept in `concepts/`.

There is no build step. Upload the whole folder to any web host (cPanel, Netlify, GitHub Pages and so on) and it works. Open `index.html` in a browser to preview it locally.

## Structure

| Menu | Pages |
|---|---|
| About Us | `about.html`, `contact.html`, `affiliation.html` (→ `affiliation-inc.html`, `affiliation-bnrc.html`), `anti-ragging.html` |
| Academics | `courses.html` (→ `course-anm.html`, `course-gnm.html`, `course-bsc-nursing.html`), `faculty.html`, `exam-calendar.html`, `academic-calendar.html`, `placement.html` |
| Gallery | `gallery-buildings.html`, `gallery-labs-libraries.html` |
| Testimonials | `testimonials-students.html`, `testimonials-faculty.html`, `testimonials-visitors.html` |
| Admission | `admission.html` (How to Apply), `eligibility.html` (Eligibility Check), `admission-bscc.html` (BSCC & Scholarships), `fee-structure.html` |
| News Notification | Scrolling ticker on every page + `news.html` |

- `assets/css/style.css`: all styling. The brand colour is `--accent` at the top of the file.
- `assets/js/interactive.js` + `assets/css/interactive.css`: DNA helix, cursor tilt/spotlight, bed chart, deadline countdown, scrolling journey, eligibility & fee calculator, curriculum explorer and story carousel. Course rules and fees for the calculator are in `COURSES`; the syllabus is in `CURRICULUM`.
- `assets/js/site.js`: header menu, news ticker, footer, floating call/WhatsApp buttons and contact details. **Edit the `SITE`, `NAV` and `NEWS` lists at the top to update every page at once.**

## Content sources

Course fees, eligibility, vision/mission, the Chairman's and MD's messages, guest faculty, the hospital network, labs, careers, admission procedure, scholarships and anti-ragging contacts come from the college brochure (`assets/brochure.pdf`). Photos in `assets/img/` were cropped from the brochure.

## Still to fill in

- **More photos:** the main building, classrooms, hostel and campus entrance (Gallery → Academic Buildings), and nursing faculty portraits.
- **Student stories:** the homepage story cards are prompts — replace them with real students' words.
- **Content marked "To update":** nursing faculty, exam and academic calendar dates, testimonials, anti-ragging committee members, and hostel or other fees.
- **Links in `site.js`:** add the social media URLs and confirm the BNRC and BUHS website addresses.

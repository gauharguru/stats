# AHS Nursing College website

A plain HTML/CSS/JS website for AHS Nursing College & Hospital, Samastipur. The design takes cues from squareup.com: bold headlines, a black-and-white base with one brand colour, large rounded cards and "choose your path" course tiles.

There is no build step. Upload the whole folder to any web host (cPanel, Netlify, GitHub Pages and so on) and it works. Open `index.html` in a browser to preview it locally.

## Structure

| Menu | Pages |
|---|---|
| About Us | `about.html`, `contact.html`, `affiliation.html` (→ `affiliation-inc.html`, `affiliation-bnrc.html`), `anti-ragging.html` |
| Academics | `courses.html` (→ `course-anm.html`, `course-gnm.html`, `course-bsc-nursing.html`), `faculty.html`, `exam-calendar.html`, `academic-calendar.html`, `placement.html` |
| Gallery | `gallery-buildings.html`, `gallery-labs-libraries.html` |
| Testimonials | `testimonials-students.html`, `testimonials-faculty.html`, `testimonials-visitors.html` |
| Admission | `admission-bscc.html`, `fee-structure.html` |
| News Notification | Scrolling ticker on every page + `news.html` |

- `assets/css/style.css`: all styling. The brand colour is `--accent` at the top of the file.
- `assets/js/site.js`: header menu, news ticker, footer, floating call/WhatsApp buttons and contact details. **Edit the `SITE`, `NAV` and `NEWS` lists at the top to update every page at once.**

## Still to fill in

- **Photos:** each green/coloured box labelled "Photo: …" is a placeholder. Put images in `assets/img/` and add `<img src="assets/img/name.jpg" alt="…">` inside the `.ph` box.
- **Logo:** the header uses a drawn shield-and-cross mark. To use the official logo image, replace `LOGO` in `site.js`.
- **Content marked "To update":** fees, faculty, exam and academic calendar dates, placement list, testimonials, Chairman and Principal messages, and anti-ragging committee members.
- **Brochure:** add `assets/brochure.pdf`.
- **Links in `site.js`:** add the social media URLs and confirm the external council/university URLs.

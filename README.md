# Nursing College Website

A static website (HTML/CSS/JS, no build step) for a nursing college.

## Menu structure

| Menu | Sub-menu | Page |
|---|---|---|
| About Us | About College, Contact Details, Affiliation Disclosure | `about.html` |
| Academics | Courses (ANM, GNM, B.Sc), Faculty, Exam Calendar, Academic Calendar, Placement | `courses.html`, `faculty.html`, `exam-calendar.html`, `academic-calendar.html`, `placement.html` |
| Gallery | Academics, Buildings, Labs & Libraries (tabs) | `gallery.html` |
| Testimonials | Student, Faculty, Visitors (tabs) | `testimonials.html` |
| Admission | BSCC, Fee Structure | `admission.html` |
| News & Notifications | Scrolling ticker on every page plus a full list | `news.html` |

## Customising

- **College name, contact info, menu and news items**: edit `SITE` and `MENU` at the top of `assets/js/site.js`. The header, footer, menu and news ticker are built from these values on every page.
- **Page content**: edit the HTML files directly. Values shown as `[xx]` / `[Name]` are placeholders.
- **Photos**: put images in `assets/img/`. Add `assets/img/campus.jpg` to use as the home page hero background.
- **Colours**: change the CSS variables at the top of `assets/css/style.css`.

## Running

Open `index.html` in a browser, or host the folder on any static host (for example GitHub Pages).

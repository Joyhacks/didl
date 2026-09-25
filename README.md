# Student Attendance Register: Best Solution Polytechnic

A web-based attendance register for the **Department of Computer Science, Best Solution Polytechnic, Akure**.

**Project by:** Awodosu Ibrahim Olamilekan, **BSP/CSC/ND/24/010**, National Diploma in Computer Science

Lecturers take the register for each lecture. The HOD sees the whole department in one place. Students check their own attendance with their matric number. The system automatically flags anyone below the **75% attendance needed to sit the exam**.

> This is a front-end prototype with no backend yet. All data is stored in the browser (`localStorage`); use **Settings → Backup & restore** to move it to another device. Passwords are stored as salted SHA-256 hashes, but because everything runs in the browser this is still not production security. It is a student project, not the official school portal.

## Run it

You don't need to install anything.

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

You can also double-click `index.html`.

### Demo accounts

| Role | Login | Password |
|---|---|---|
| HOD / Admin | `hod@csc.demo` or `CSC/STAFF/001` | `admin123` |
| Lecturer | `adeleke@csc.demo` or `CSC/STAFF/014` | `lecturer123` |
| Student check | Matric `BSP/CSC/ND/24/010` | No password needed |

The sign-in page also has one-click demo buttons.

The app comes with sample data: two levels (ND I and ND II), six courses, four lecturers, 32 students and about seven weeks of lectures. Today is left unmarked so you can take a register live. To start the demo over, go to **Settings → Reset demo data**.

## Who uses what

| User | Screens |
|---|---|
| **Lecturer** | Overview (today's lectures, course cards, students to watch) · Take attendance (per lecture, with keyboard shortcuts) · Course register (grid, chart, CSV, print) · Student lookup |
| **HOD / Admin** | Department overview (weekly chart, courses, students at risk, lecturer activity) · Courses (add, edit, assign lecturers, set lecture days) · Students (register, edit, remove, **import a class list from Excel/CSV**) · Lecturers (add, edit, reset password) · Exam eligibility report (per level, CSV, print) · Settings (incl. **backup & restore**) |
| **Every staff member** | My account: view details and change password |
| **Students and parents** | Check attendance with a matric number: rate per course, exam status, printable slip |

## Branding

The design follows the school's website (bestpotech.edu.ng): the school seal, forest and bright greens, amber accents, Montserrat headings and Roboto body text.

- **Logo:** `assets/logo.png`. This was cut from a phone screenshot, so replace it with the original file if you can get one, for a sharper image.
- **Colours:** the "School brand" block at the top of `css/styles.css`.

## Project structure

```
index.html            page shell and script tags
css/styles.css        all styling: brand tokens, light/dark mode, mobile, print
js/store.js           data layer: seed data, users, courses, students, lectures, statistics
js/ui.js              shared helpers: icons, chart, rate bars, toasts, CSV download
js/views/public.js    sign in, student attendance check, about the project
js/views/lecturer.js  lecturer overview, take attendance, course register, student page
js/views/admin.js     HOD overview, courses, students, lecturers, eligibility report, settings
js/views/manage.js    edit pages, class-list import, my account, backup & restore
js/app.js             router, sidebar shell, click and form handling
docs/PLAN.md          project plan and presentation guide
```

`store.js` is the only file that reads or writes data. Moving to a real database later means rewriting that one file. The screens stay the same.

## Tech

Plain HTML, CSS and JavaScript, with no framework and no build step. The fonts are Montserrat, Roboto and IBM Plex Mono, from Google Fonts.

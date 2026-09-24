# Rollbook: Student Attendance Register

Rollbook is a web-based attendance register for class teachers. It replaces the paper register book: you take the roll in about a minute, see the month at a glance, and spot the students who keep missing school.

This is a **front-end prototype**. It has no backend yet, and every record is saved in the browser (`localStorage`).

## Run it

You don't need to install anything.

- **Easiest:** double-click `index.html`.
- **Local server (recommended for demos):**
  ```bash
  python3 -m http.server 8000
  # then open http://localhost:8000
  ```

The first time it opens, it loads two demo classes with about six weeks of made-up attendance, so every screen has something to show. To start the demo over, click **Reset demo data** in the footer.

## What it does

| Screen | Purpose |
|---|---|
| **Today** | Take the register for a day. Mark each student **P**resent, **L**ate, **A**bsent or **E**xcused. Use *Mark rest present* to finish in one click. It works from the keyboard too: ↑ ↓ to move, P / L / A / E to mark. |
| **Register** | The month as a grid, like the paper register book: `/` for present, `O` for absent. Click a square to change it. You can print it or export it as CSV. |
| **Students** | Add or remove students, create classes, and see each student's attendance rate. |
| **Insights** | The class attendance rate for the month, a day-by-day chart, students below 85% ("Needs follow-up"), and students with full attendance. |

## Project structure

```
index.html        page shell: header, navigation, footer
css/styles.css    all styling (light + dark mode, print, mobile)
js/store.js       data layer: classes, students, marks, stats, CSV export
js/app.js         screens, routing and interactions
docs/PLAN.md      project plan and presentation outline
```

`store.js` is the only file that knows where data is kept. When a backend is added, only that file has to change. The screens stay as they are.

## Tech

It uses plain HTML, CSS and JavaScript, with no frameworks and no build step. The fonts are Newsreader and IBM Plex, loaded from Google Fonts.

# Rollbook: Project Plan & Presentation Guide

## 1. The problem

In most schools, attendance still goes into a paper register:

- Taking the roll by hand eats into lesson time.
- Totals and percentages are worked out by hand at the end of the month, and mistakes creep in.
- A student who keeps missing school often goes unnoticed until the end of term.
- If the book is lost or damaged, the record is gone.

## 2. The solution

Rollbook is a digital attendance register that:

1. Lets a teacher take the roll in under a minute, on a phone or a laptop.
2. Keeps the familiar look of the paper register, so teachers don't have to relearn anything.
3. Works out totals and percentages automatically.
4. Flags students whose attendance drops below 85%.
5. Exports the register to CSV (Excel) or prints it.

## 3. Who uses it

| User | Need |
|---|---|
| Class teacher | Mark attendance quickly each morning |
| Form master / Head of year | See which students need follow-up |
| School admin | Monthly records for reports and inspections |

## 4. Features (prototype scope)

- **Today:** mark Present / Late / Absent / Excused, a live summary, *mark rest present*, search, and keyboard shortcuts
- **Register:** a monthly grid with daily and student totals, editable cells, print, and CSV export
- **Students:** add and remove students, create classes, and see each student's attendance rate
- **Insights:** the monthly rate, a daily chart, the follow-up list, and the full-attendance list
- Works on mobile, supports dark mode, and has a clean print layout

## 5. How it's built

```
 ┌─────────────────────┐
 │  Screens (app.js)   │  Today · Register · Students · Insights
 └─────────┬───────────┘
           │ calls
 ┌─────────▼───────────┐
 │  Data layer         │  store.js: add student, set mark, tallies, CSV
 └─────────┬───────────┘
           │ saves to
 ┌─────────▼───────────┐
 │  Browser storage    │  localStorage (today)  →  database/API (later)
 └─────────────────────┘
```

**Data model**

- **Class:** id, name, code
- **Student:** id, class, first name, surname, admission number
- **Record:** class + date → { student → P | L | A | E }

**Attendance rate** = (Present + Late) ÷ (days marked − Excused days)

## 6. Design decisions

- **Paper-register look.** Warm paper colours, navy ink, a red margin line, and the traditional `/` and `O` marks. Teachers recognise it straight away.
- **Colour plus a letter.** Every status has its own letter (P, L, A, E), so the app still works for colour-blind users and on black-and-white printouts.
- **Speed first.** The most common action, marking everyone present, takes one click.

## 7. Roadmap (after the presentation)

| Phase | What gets added |
|---|---|
| 1. Backend | A database (e.g. Supabase or Firebase) so data is kept safely and shared between devices |
| 2. Accounts | Teacher and admin logins, so each teacher sees only their own classes |
| 3. Parents | An automatic SMS or email to a parent when a student is absent |
| 4. Reports | Term reports as PDF, and school-wide dashboards |
| 5. Offline | Take the register with no internet and sync it later |

## 8. Presentation outline (8–10 minutes)

| # | Slide / Segment | Time | Notes |
|---|---|---|---|
| 1 | Title: *Rollbook: Student Attendance Register* | 0:30 | Name, class, date |
| 2 | The problem with paper registers | 1:00 | Use the four points in section 1 |
| 3 | Our solution | 1:00 | The five points in section 2 |
| 4 | **Live demo: Today** | 2:00 | Mark a few students with the keyboard (P, L, A), then click *Mark rest present* |
| 5 | **Live demo: Register** | 1:00 | Show the month grid, change a square, click *Export CSV* |
| 6 | **Live demo: Insights** | 1:00 | Point out the students in "Needs follow-up" |
| 7 | How it's built | 1:00 | The diagram and data model in section 5 |
| 8 | Design choices | 0:45 | Section 6 |
| 9 | What's next | 0:45 | The roadmap in section 7 |
| 10 | Questions | — | |

### Demo checklist

- [ ] Open the app the day before and click **Reset demo data**, so today is still unmarked
- [ ] Use Chrome or Edge at full screen, with the zoom at 110–125% so the back of the room can read it
- [ ] Have `index.html` open locally too, in case the internet goes down (the fonts fall back to built-in ones)
- [ ] Practise the keyboard flow: ↓ ↓ P L A, then *Mark rest present*

### Likely questions

- **Where is the data stored?** For now, in the browser. The next phase moves it to a database, and only one file (`store.js`) has to change.
- **Can two teachers use it at the same time?** Not yet. That comes with the backend and logins in phases 1 and 2.
- **What if a student is sick?** Mark them Excused (E). Excused days don't count against their rate.

# Project Plan & Presentation Guide

**Topic:** Design and Implementation of a Web-Based Student Attendance Register
**Student:** Awodosu Ibrahim Olamilekan, BSP/CSC/ND/24/010
**Programme:** National Diploma, Computer Science
**Institution:** Best Solution Polytechnic, Akure, Ondo State

---

## 1. Background and problem

In most Nigerian polytechnics, attendance is taken on a sheet of paper passed round the lecture hall. This causes real problems:

- **Proxy signing:** students sign for absent friends.
- **Lost sheets:** if a sheet goes missing, that lecture's record is gone.
- **Late discovery:** the rule that a student needs **75% attendance to sit the exam** is checked by hand at the end of the semester, when it is too late for the student or lecturer to do anything about it.
- **No overview:** the HOD cannot easily see which courses have poor attendance, or whether lecturers are taking attendance at all.

## 2. Aim and objectives

**Aim:** to design and implement a web-based attendance register for the Department of Computer Science.

**Objectives:**
1. Let lecturers record attendance for each lecture quickly, on a phone or laptop.
2. Calculate each student's attendance rate per course automatically.
3. Flag students below the 75% exam-eligibility threshold as early as possible.
4. Give the HOD a department-wide view and an exam eligibility report.
5. Let students and parents check attendance with a matric number.

## 3. Review of similar projects

Similar attendance systems built by Nigerian students were reviewed:

- **[Plateau State Polytechnic attendance system](https://github.com/Dotun-Balogun/plaploy-student-attendance-management-system)** has student, lecturer and admin roles, attendance per class session, 75% exam eligibility, and CSV/PDF export.
- **[Development of a web-based student attendance management system](https://fnasjournals.com/index.php/FNAS-JCA/article/view/839)** (FNAS Journal) is a web-based design for a Nigerian department.
- **[Design and implementation of a students' attendance management system](https://ijariie.com/AdminUploadPdf/DESIGN_AND_IMPLEMENTATION_OF_STUDENTS%E2%80%99_ATTENDANCE_MANAGEMENT_SYSTEM_ijariie21587.pdf)** (IJARIIE, 2023) covers an admin dashboard and student search by matric number.

**What this project does differently:**
- A student check needs only a matric number. There is no student account to create or forget.
- **Early warning:** lecturers see each student's running percentage *while they take attendance*, and the HOD dashboard lists students at risk.
- **Lecturer activity:** the HOD can see who is taking registers and when.
- A design that feels like the familiar paper register, so there is almost nothing to learn.

## 4. System design

### Users and roles

| Role | Can do |
|---|---|
| HOD / Admin | Everything: add, edit and remove courses, lecturers and students; import a class list from Excel; view all registers; print the eligibility report; reset passwords; back up and restore; change settings |
| Lecturer | Take and edit attendance for their own courses, view registers, look up students, change their own password |
| Student / Parent | Check attendance by matric number (read-only, no login) |

### Architecture

```
 ┌──────────────────────────────┐
 │ Screens (js/views/*.js)      │  sign in · dashboards · take attendance · reports
 └──────────────┬───────────────┘
                │ calls
 ┌──────────────▼───────────────┐
 │ Data layer (js/store.js)     │  sign in, courses, students, lectures, statistics
 └──────────────┬───────────────┘
                │ reads and writes
 ┌──────────────▼───────────────┐
 │ Browser storage (prototype)  │  →  database server (next stage)
 └──────────────────────────────┘
```

### Data model

| Entity | Fields |
|---|---|
| Staff | id, role (admin / lecturer), title, name, position, staff ID, email, password |
| Course | id, code (e.g. COM 221), title, level, units, lecturer |
| Student | id, matric number, surname, first name, other name, level, gender |
| Lecture | id, course, date, time, topic, marks { student → P / L / A / E } |
| Settings | institution, department, session, semester, threshold (75%) |

### Attendance formula

```
rate = (Present + Late) ÷ (Lectures held − Excused)
eligible = rate ≥ 75%
```

A student with no mark for a lecture counts as absent. Excused absences (for example a sick note) are not counted against the student.

## 5. Implementation

- **Language:** HTML, CSS, JavaScript, with no framework, so the code is easy to explain and runs anywhere.
- **Storage:** browser localStorage for the prototype.
- **Design:** follows the school website: the Best Solution Polytechnic seal, green and amber colours, and Montserrat and Roboto fonts. It also borrows from the paper register (red margin line, `/` for present, `O` for absent).
- **Works on:** desktop, tablet and phone, with light and dark mode and printable reports.

## 6. Limitations and future work

| Limitation now | Next stage |
|---|---|
| Data is kept in one browser (a backup file can move it to another device) | A database server (e.g. PostgreSQL via Supabase), so everyone shares the same data live |
| Passwords are hashed, but checked in the browser | Server-side authentication, with password reset by email |
| A student could sit in for a friend | QR code or fingerprint check-in |
| No notifications | SMS or email to students and parents when they drop below 75% |
| — | Integration with the school's course registration portal |

## 7. Presentation outline (10 minutes)

| # | Segment | Time | What to show or say |
|---|---|---|---|
| 1 | Title slide | 0:30 | Topic, your name, matric number, supervisor |
| 2 | The problem | 1:00 | Section 1: proxy signing, lost sheets, the 75% rule found out too late |
| 3 | Aim and objectives | 0:45 | Section 2 |
| 4 | Similar projects | 0:45 | Section 3, and what is different about yours |
| 5 | **Demo: student check** | 1:00 | Sign-in page → "Are you a student?" → type `BSP/CSC/ND/24/010` → your own attendance slip |
| 6 | **Demo: lecturer** | 2:00 | Sign in as Mr. Adeleke → "Take attendance" on today's lecture (on a Friday or weekend, click "Start a register" instead) → press P, P, L, A → "Mark rest present" → open the course register |
| 7 | **Demo: HOD** | 1:30 | Sign in as the HOD → overview: weekly chart, students at risk, lecturer activity → exam eligibility report → Print |
| 8 | System design | 1:00 | Section 4: roles, architecture diagram, formula |
| 9 | Limitations and future work | 0:30 | Section 6 |
| 10 | Questions | — | |

### Before the presentation

- [ ] Open the app the day before and use **Settings → Reset demo data**, so today's lectures are still unmarked
- [ ] Add your supervisor's name in **Settings**
- [ ] Use Chrome or Edge at full screen, zoomed to 110–125%
- [ ] Have a copy of the project folder on the laptop in case the internet fails

### Likely questions

- **"Where is the data stored?"** In the browser for this prototype. All data access goes through one file (`store.js`), so moving to a database server does not change the screens.
- **"Are the passwords safe?"** They are never stored as typed. Each one is salted and hashed with SHA-256. In the full version the check moves to a server.
- **"How does the HOD add 200 students?"** Students → Import class list. Paste the columns from Excel, and the system flags duplicates and mistakes before importing.
- **"How do you stop proxy attendance?"** The lecturer marks attendance while looking at the class, instead of passing a sheet round. QR code or fingerprint check-in is planned for the next stage.
- **"What happens if a student is sick?"** The lecturer marks them **E (Excused)**. That lecture does not count against them.
- **"Can the 75% be changed?"** Yes. The HOD sets it in Settings, and every screen updates.

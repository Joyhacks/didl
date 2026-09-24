/*
 * Admin (HOD / exams officer) screens:
 *   #/dashboard   department overview
 *   #/courses     courses and lecturer assignment
 *   #/students    student list (lecturers get a read-only version)
 *   #/lecturers   staff accounts
 *   #/reports     exam eligibility report per level
 *   #/settings    session, semester, threshold, institution
 */
(function () {
  'use strict';

  var S = window.RollStore, UI = window.UI, V = window.Views, A = window.Actions, F = window.Forms;
  var esc = UI.esc;
  var fig = function () { return V.fig.apply(null, arguments); };

  function avg(list) { return list.length ? list.reduce(function (a, b) { return a + b; }, 0) / list.length : null; }

  // Students who are below the line in at least one course.
  function atRiskStudents() {
    var map = {};
    S.courses().forEach(function (c) {
      S.courseStat(c.id).atRisk.forEach(function (r) {
        (map[r.student.id] = map[r.student.id] || { student: r.student, courses: [] }).courses.push({ course: c, stat: r.stat });
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.courses.length - a.courses.length || a.student.matric.localeCompare(b.student.matric); });
  }

  /* ---------------- overview ---------------- */

  V.adminDashboard = function () {
    var st = S.settings();
    var courses = S.courses();
    var lectures = S.lectures();
    var cstats = courses.map(function (c) { return S.courseStat(c.id); });
    var inClass = 0, counted = 0;
    lectures.forEach(function (l) { var r = S.lectureRate(l); inClass += r.inClass; counted += r.counted; });
    var rate = counted ? inClass / counted : null;
    var risk = atRiskStudents();

    // Group lectures into semester weeks for the chart.
    var start = S.parse(st.semesterStart || (lectures[0] && lectures[0].date) || S.todayKey());
    var weeks = [];
    lectures.forEach(function (l) {
      var w = Math.floor((S.parse(l.date) - start) / (7 * 864e5));
      var r = S.lectureRate(l);
      var b = weeks[w] || (weeks[w] = { inClass: 0, counted: 0, n: 0 });
      b.inClass += r.inClass; b.counted += r.counted; b.n++;
    });
    var items = [];
    for (var i = 0; i < weeks.length; i++) {
      var b = weeks[i] || { inClass: 0, counted: 0, n: 0 };
      var v = b.counted ? b.inClass / b.counted : null;
      items.push({ value: v, label: 'Wk ' + (i + 1), tip: 'Week ' + (i + 1) + ' · ' + b.n + ' lectures · ' + UI.pct(v) + ' attendance' });
    }

    var lecturers = S.users('lecturer');

    return UI.head(esc(st.department) + ' &middot; ' + esc(st.session) + ' &middot; ' + esc(st.semester), 'Department <em>overview</em>',
      '<a class="btn btn--quiet" href="#/reports">' + UI.icon('report') + 'Eligibility report</a>') +

      '<section class="figs figs--hero">' +
        '<div class="fig fig--hero"><span class="fig__n ' + UI.rateClass(rate) + '">' + UI.pct(rate) + '</span><span class="fig__l">Attendance this semester</span><span class="fig__s">Present or late, across every lecture held</span></div>' +
        fig(S.students().length, 'Students') + fig(lecturers.length, 'Lecturers') + fig(lectures.length, 'Lectures held') +
        fig(risk.length, 'Students below ' + st.threshold + '%', risk.length ? 'is-bad' : '') +
      '</section>' +

      (items.length ? '<section class="panel pad"><header class="panel__head"><h2>Weekly attendance</h2><p>All courses, all levels</p></header>' +
        UI.barChart(items, 'Department attendance by week') + '</section>' : '') +

      '<section class="block"><header class="block__head"><h2 class="section-h">Courses</h2><a class="linklike" href="#/courses">Manage courses</a></header>' +
        '<div class="panel table-wrap"><table class="table table--hover">' +
        '<thead><tr><th>Course</th><th class="hide-sm">Lecturer</th><th>Level</th><th class="num hide-sm">Lectures</th><th>Attendance</th><th class="num">Below line</th></tr></thead><tbody>' +
        courses.map(function (c, i) {
          var cs = cstats[i];
          return '<tr data-href="#/course/' + c.id + '"><td><a href="#/course/' + c.id + '" class="code">' + esc(c.code) + '</a><span class="sub">' + esc(c.title) + '</span></td>' +
            '<td class="hide-sm">' + (c.lecturerId ? esc(UI.staffName(S.user(c.lecturerId))) : '<span class="muted">Unassigned</span>') + '</td>' +
            '<td><span class="chip">' + esc(c.level) + '</span></td>' +
            '<td class="num mono hide-sm">' + cs.held + '</td>' +
            '<td>' + UI.rateBar(cs.rate) + '</td>' +
            '<td class="num mono ' + (cs.atRisk.length ? 'is-bad' : '') + '">' + cs.atRisk.length + '</td></tr>';
        }).join('') + '</tbody></table></div></section>' +

      '<div class="split split--even">' +
        '<section class="panel pad"><header class="panel__head"><h2>Students at risk</h2><p>Below ' + st.threshold + '% in at least one course</p></header>' +
          (risk.length ? '<ul class="people">' + risk.slice(0, 8).map(function (r) {
            return '<li><a href="#/student/' + r.student.id + '">' + UI.avatar(r.student.first, r.student.surname) +
              '<span class="people__who"><b>' + esc(r.student.first + ' ' + r.student.surname) + '</b><small><span class="mono">' + esc(r.student.matric) + '</span> &middot; ' + esc(r.student.level) + '</small></span>' +
              '<span class="people__tags">' + r.courses.map(function (x) { return '<span class="badge badge--bad">' + esc(x.course.code) + ' ' + UI.pct(x.stat.rate) + '</span>'; }).join('') + '</span></a></li>';
          }).join('') + '</ul>' + (risk.length > 8 ? '<p class="more"><a class="linklike" href="#/reports">See all ' + risk.length + ' in the eligibility report</a></p>' : '')
            : '<p class="empty-inline">No student is below the line.</p>') +
        '</section>' +
        '<section class="panel pad"><header class="panel__head"><h2>Lecturer activity</h2><p>Registers taken this semester</p></header>' +
          '<ul class="people">' + lecturers.map(function (u) {
            var cs = S.courses({ lecturerId: u.id });
            var ls = [];
            cs.forEach(function (c) { ls = ls.concat(S.lectures(c.id)); });
            ls.sort(function (a, b) { return b.date.localeCompare(a.date); });
            return '<li>' + UI.avatar(u.name.split(' ')[0], u.name.split(' ').slice(-1)[0]) +
              '<span class="people__who"><b>' + esc(UI.staffName(u)) + '</b><small>' + (cs.length ? cs.map(function (c) { return esc(c.code); }).join(', ') : 'No courses') + '</small></span>' +
              '<span class="people__stat"><b>' + ls.length + '</b><small>' + (ls[0] ? 'last ' + UI.shortDate(ls[0].date) : 'none yet') + '</small></span></li>';
          }).join('') + '</ul>' +
        '</section>' +
      '</div>';
  };

  /* ---------------- courses ---------------- */

  V.courses = function () {
    var lecturers = S.users('lecturer').concat(S.users('admin'));
    var courses = S.courses();
    var opts = function (sel) {
      return '<option value="">Unassigned</option>' + lecturers.map(function (u) {
        return '<option value="' + u.id + '"' + (u.id === sel ? ' selected' : '') + '>' + esc(UI.staffName(u)) + '</option>';
      }).join('');
    };
    return UI.head('Admin', 'Courses') +
      '<div class="split">' +
        '<section class="panel table-wrap">' +
          (courses.length ? '<table class="table"><thead><tr><th>Course</th><th>Level</th><th>Lecturer</th><th class="num hide-sm">Lectures</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
          courses.map(function (c) {
            return '<tr><td><a class="code" href="#/course/' + c.id + '">' + esc(c.code) + '</a><span class="sub">' + esc(c.title) + ' &middot; ' + c.units + ' units</span></td>' +
              '<td><span class="chip">' + esc(c.level) + '</span></td>' +
              '<td><select class="select select--sm" data-change="assign" data-course="' + c.id + '" aria-label="Lecturer for ' + esc(c.code) + '">' + opts(c.lecturerId) + '</select></td>' +
              '<td class="num mono hide-sm">' + S.lectures(c.id).length + '</td>' +
              '<td class="actions"><button class="linklike linklike--danger" data-act="remove-course" data-id="' + c.id + '">Remove</button></td></tr>';
          }).join('') + '</tbody></table>' : UI.empty('No courses yet.')) +
        '</section>' +
        '<aside class="panel pad form-panel"><form class="form" data-form="add-course" autocomplete="off">' +
          '<h2 class="form__title">Add a course</h2>' +
          '<div class="form__row"><label>Code<input name="code" required maxlength="10" placeholder="COM 226"></label>' +
          '<label>Units<input name="units" type="number" min="1" max="6" value="2" required></label></div>' +
          '<label>Title<input name="title" required maxlength="80" placeholder="Computer Project"></label>' +
          '<div class="form__row"><label>Level<select name="level" class="select">' + S.LEVELS.map(function (l) { return '<option>' + l + '</option>'; }).join('') + '</select></label>' +
          '<label>Usual time<input name="time" type="time" value="08:00"></label></div>' +
          '<label>Lecturer<select name="lecturerId" class="select">' + opts('') + '</select></label>' +
          '<p class="form__error" hidden></p>' +
          '<button class="btn btn--ink btn--block">' + UI.icon('plus') + 'Add course</button>' +
        '</form></aside>' +
      '</div>';
  };

  A.assign = function (el) {
    S.updateCourse(el.dataset.course, { lecturerId: el.value });
    UI.toast('Lecturer updated');
  };
  A['remove-course'] = function (btn) {
    var c = S.course(btn.dataset.id);
    if (!c || !confirm('Remove ' + c.code + ' and all ' + S.lectures(c.id).length + ' of its lecture registers?')) return;
    S.removeCourse(c.id); window.App.render(); UI.toast(c.code + ' removed');
  };
  F['add-course'] = function (form) {
    try {
      var c = S.addCourse(UI.formData(form));
      window.App.render(); UI.toast(c.code + ' added');
    } catch (err) { showError(form, err.message); }
  };

  function showError(form, msg) {
    var e = form.querySelector('.form__error');
    e.textContent = msg; e.hidden = false;
  }

  /* ---------------- students ---------------- */

  var stu = { q: '', level: '' };

  V.students = function (p, user) {
    var isAdmin = user.role === 'admin';
    var q = stu.q.trim().toLowerCase();
    var all = S.students(stu.level);
    var list = all.filter(function (s) {
      return !q || (s.surname + ' ' + s.first + ' ' + s.other + ' ' + s.matric).toLowerCase().indexOf(q) > -1;
    });
    var levels = S.LEVELS.filter(function (l) { return S.students(l).length; });

    var table = '<div class="toolbar toolbar--tight">' +
        '<div class="chips" role="group" aria-label="Filter by level">' +
          ['', ].concat(levels).map(function (l) {
            return '<button class="chip-btn" data-act="stu-level" data-level="' + l + '" aria-pressed="' + (stu.level === l) + '">' + (l || 'All levels') + '</button>';
          }).join('') + '</div>' +
        '<label class="search">' + UI.icon('search') + '<input id="stuSearch" type="search" value="' + esc(stu.q) + '" placeholder="Search name or matric" aria-label="Search students"></label>' +
      '</div>' +
      '<section class="panel table-wrap">' +
      (list.length ? '<table class="table table--hover"><thead><tr><th class="hide-sm">S/N</th><th>Student</th><th>Level</th><th>Attendance</th><th class="num">Below line</th>' + (isAdmin ? '<th><span class="sr-only">Actions</span></th>' : '') + '</tr></thead><tbody>' +
        list.map(function (s, i) {
          var rep = S.studentReport(s.id), att = 0, cnt = 0, bad = 0;
          rep.forEach(function (r) { att += r.stat.attended; cnt += r.stat.held - r.stat.E; if (!r.stat.eligible) bad++; });
          var rate = cnt ? att / cnt : null;
          return '<tr data-href="#/student/' + s.id + '"><td class="mono muted hide-sm">' + String(i + 1).padStart(2, '0') + '</td>' +
            '<td><a class="person" href="#/student/' + s.id + '">' + UI.avatar(s.first, s.surname) + '<span><span class="person__name">' + UI.nameHTML(s) + '</span><span class="mono sub">' + esc(s.matric) + '</span></span></a></td>' +
            '<td><span class="chip">' + esc(s.level) + '</span></td>' +
            '<td>' + UI.rateBar(rate) + '</td>' +
            '<td class="num mono ' + (bad ? 'is-bad' : '') + '">' + bad + '</td>' +
            (isAdmin ? '<td class="actions"><button class="linklike linklike--danger" data-act="remove-student" data-id="' + s.id + '">Remove</button></td>' : '') + '</tr>';
        }).join('') + '</tbody></table>'
        : UI.empty(all.length ? 'No student matches “' + esc(stu.q) + '”.' : 'No students registered yet.')) +
      '</section>' +
      '<p class="footnote">' + list.length + ' of ' + S.students().length + ' students' + (stu.level ? ' in ' + esc(stu.level) : '') + '.</p>';

    if (!isAdmin) return UI.head('Student lookup', 'Students') + table;

    return UI.head('Admin', 'Students') +
      '<div class="split"><div>' + table + '</div>' +
        '<aside class="panel pad form-panel"><form class="form" data-form="add-student" autocomplete="off">' +
          '<h2 class="form__title">Register a student</h2>' +
          '<label>Matric number<input name="matric" required maxlength="30" placeholder="BSP/CSC/ND/24/019" autocapitalize="characters" spellcheck="false"></label>' +
          '<label>Surname<input name="surname" required maxlength="40"></label>' +
          '<div class="form__row"><label>First name<input name="first" required maxlength="40"></label>' +
          '<label>Other name <span class="opt">optional</span><input name="other" maxlength="40"></label></div>' +
          '<div class="form__row"><label>Level<select name="level" class="select">' + S.LEVELS.map(function (l) { return '<option' + (l === 'ND II' ? ' selected' : '') + '>' + l + '</option>'; }).join('') + '</select></label>' +
          '<label>Gender<select name="gender" class="select"><option value="">—</option><option value="F">Female</option><option value="M">Male</option></select></label></div>' +
          '<p class="form__error" hidden></p>' +
          '<button class="btn btn--ink btn--block">' + UI.icon('plus') + 'Register student</button>' +
        '</form></aside>' +
      '</div>';
  };

  A['stu-level'] = function (btn) { stu.level = btn.dataset.level; window.App.render(); };
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'stuSearch') return;
    stu.q = e.target.value;
    var pos = e.target.selectionStart;
    window.App.render();
    var f = document.getElementById('stuSearch');
    f.focus(); f.setSelectionRange(pos, pos);
  });
  A['remove-student'] = function (btn) {
    var s = S.student(btn.dataset.id);
    if (!s || !confirm('Remove ' + s.first + ' ' + s.surname + ' (' + s.matric + ') and their attendance records?')) return;
    S.removeStudent(s.id); window.App.render(); UI.toast(s.first + ' removed');
  };
  F['add-student'] = function (form) {
    var d = UI.formData(form);
    if (!d.surname || !d.first) return showError(form, 'Surname and first name are required.');
    try {
      var s = S.addStudent(d);
      window.App.render(); UI.toast(s.first + ' ' + s.surname + ' registered');
      var m = document.querySelector('[data-form="add-student"] [name=matric]');
      if (m) m.focus();
    } catch (err) { showError(form, err.message); }
  };

  /* ---------------- lecturers ---------------- */

  V.lecturers = function (p, user) {
    var staff = S.users('admin').concat(S.users('lecturer'));
    return UI.head('Admin', 'Lecturers &amp; staff') +
      '<div class="split">' +
        '<section class="panel table-wrap"><table class="table">' +
          '<thead><tr><th>Name</th><th class="hide-sm">Staff ID</th><th>Courses</th><th class="num hide-sm">Registers</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
          staff.map(function (u) {
            var cs = S.courses({ lecturerId: u.id }), n = 0;
            cs.forEach(function (c) { n += S.lectures(c.id).length; });
            return '<tr><td><span class="person">' + UI.avatar(u.name.split(' ')[0], u.name.split(' ').slice(-1)[0]) +
              '<span><span class="person__name"><b>' + esc(UI.staffName(u)) + '</b>' + (u.role === 'admin' ? ' <span class="chip chip--accent">Admin</span>' : '') + '</span>' +
              '<span class="sub">' + esc(u.position || '') + ' &middot; ' + esc(u.email) + '</span></span></span></td>' +
              '<td class="mono hide-sm">' + esc(u.staffId) + '</td>' +
              '<td>' + (cs.length ? cs.map(function (c) { return '<a class="code code--sm" href="#/course/' + c.id + '">' + esc(c.code) + '</a>'; }).join(' ') : '<span class="muted">None</span>') + '</td>' +
              '<td class="num mono hide-sm">' + n + '</td>' +
              '<td class="actions">' + (u.id === user.id ? '<span class="muted">You</span>' : '<button class="linklike linklike--danger" data-act="remove-staff" data-id="' + u.id + '">Remove</button>') + '</td></tr>';
          }).join('') + '</tbody></table></section>' +
        '<aside class="panel pad form-panel"><form class="form" data-form="add-staff" autocomplete="off">' +
          '<h2 class="form__title">Add a lecturer</h2>' +
          '<div class="form__row form__row--title"><label>Title<select name="title" class="select"><option>Mr.</option><option>Mrs.</option><option>Miss</option><option>Dr.</option><option>Engr.</option><option>Prof.</option></select></label>' +
          '<label>Full name<input name="name" required maxlength="60" placeholder="First name Surname"></label></div>' +
          '<label>Position<input name="position" maxlength="40" placeholder="Lecturer II"></label>' +
          '<div class="form__row"><label>Staff ID<input name="staffId" required maxlength="20" placeholder="CSC/STAFF/020"></label>' +
          '<label>Email<input name="email" type="email" required maxlength="60"></label></div>' +
          '<p class="form__hint">Their first password is <span class="mono">lecturer123</span>. In the full version they would set their own.</p>' +
          '<p class="form__error" hidden></p>' +
          '<button class="btn btn--ink btn--block">' + UI.icon('plus') + 'Add lecturer</button>' +
        '</form></aside>' +
      '</div>';
  };

  F['add-staff'] = function (form) {
    var d = UI.formData(form);
    if (!d.name || !d.staffId || !d.email) return showError(form, 'Name, staff ID and email are required.');
    try {
      var u = S.addLecturer(d);
      window.App.render(); UI.toast(UI.staffName(u) + ' added');
    } catch (err) { showError(form, err.message); }
  };
  A['remove-staff'] = function (btn) {
    var u = S.user(btn.dataset.id);
    if (!u || !confirm('Remove ' + UI.staffName(u) + '? Their courses will become unassigned. Registers they took are kept.')) return;
    S.removeUser(u.id); window.App.render(); UI.toast(UI.staffName(u) + ' removed');
  };

  /* ---------------- eligibility report ---------------- */

  var rep = { level: 'ND II' };

  V.reports = function () {
    var st = S.settings();
    var levels = S.LEVELS.filter(function (l) { return S.courses({ level: l }).length; });
    if (levels.indexOf(rep.level) < 0) rep.level = levels[0] || 'ND I';
    var courses = S.courses({ level: rep.level });
    var students = S.students(rep.level);
    var matrix = students.map(function (s) {
      var cells = courses.map(function (c) { return S.stat(s.id, c.id); });
      return { s: s, cells: cells, barred: cells.filter(function (t) { return !t.eligible; }).length };
    });
    var clear = matrix.filter(function (m) { return !m.barred; }).length;

    return UI.head(esc(st.session) + ' &middot; ' + esc(st.semester), 'Exam eligibility <em>report</em>',
      '<button class="btn btn--quiet" data-act="report-csv">' + UI.icon('download') + 'CSV</button>' +
      '<button class="btn btn--ink" data-act="print">' + UI.icon('print') + 'Print</button>') +
      '<div class="print-only print-head"><b>' + esc(st.institution || '') + '</b> ' + esc(st.department) + ' &middot; ' + esc(rep.level) + ' exam eligibility (' + st.threshold + '% attendance) &middot; ' + UI.longDate(S.todayKey()) + '</div>' +
      '<div class="toolbar toolbar--tight no-print"><div class="chips" role="group" aria-label="Level">' +
        levels.map(function (l) { return '<button class="chip-btn" data-act="rep-level" data-level="' + l + '" aria-pressed="' + (rep.level === l) + '">' + l + '</button>'; }).join('') +
      '</div></div>' +
      '<section class="figs">' + fig(students.length, rep.level + ' students') + fig(courses.length, 'Courses') +
        fig(clear, 'Eligible in all courses', 'is-good') + fig(students.length - clear, 'Barred from 1+ course', students.length - clear ? 'is-bad' : '') + '</section>' +
      (students.length && courses.length ?
      '<div class="sheet-wrap"><table class="sheet sheet--matrix"><thead><tr><th class="sheet__name" scope="col">Student</th>' +
        courses.map(function (c) { return '<th scope="col" class="sheet__course" title="' + esc(c.title) + '">' + esc(c.code) + '</th>'; }).join('') +
        '<th scope="col" class="sheet__sum sheet__status">Status</th></tr></thead><tbody>' +
        matrix.map(function (m) {
          return '<tr><th scope="row" class="sheet__name"><a href="#/student/' + m.s.id + '">' + UI.nameHTML(m.s) + '</a><span class="mono">' + esc(m.s.matric) + '</span></th>' +
            m.cells.map(function (t) { return '<td class="sheet__pct ' + UI.rateClass(t.rate) + '">' + UI.pct(t.rate) + '</td>'; }).join('') +
            '<td class="sheet__sum sheet__status">' + (m.barred ? '<span class="badge badge--bad">Barred: ' + m.barred + '</span>' : '<span class="badge badge--good">Eligible</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        : UI.empty('Nothing to report for ' + esc(rep.level) + ' yet.')) +
      '<p class="footnote">Figures in red are below the ' + st.threshold + '% required to sit the examination for that course. Excused absences are not counted against the student.</p>';
  };

  A['rep-level'] = function (btn) { rep.level = btn.dataset.level; window.App.render(); };
  A['report-csv'] = function () {
    var courses = S.courses({ level: rep.level });
    var rows = [['S/N', 'Matric number', 'Name'].concat(courses.map(function (c) { return c.code; }), ['Courses barred', 'Status'])];
    S.students(rep.level).forEach(function (s, i) {
      var cells = courses.map(function (c) { return S.stat(s.id, c.id); });
      var barred = cells.filter(function (t) { return !t.eligible; }).length;
      rows.push([i + 1, s.matric, UI.fullName(s)].concat(cells.map(function (t) { return UI.pct(t.rate); }), [barred, barred ? 'Not eligible' : 'Eligible']));
    });
    UI.download(rep.level + '-exam-eligibility.csv', S.toCSV(rows));
    UI.toast('CSV downloaded');
  };

  /* ---------------- settings ---------------- */

  V.settings = function () {
    var st = S.settings();
    var field = function (name, label, attrs, hint) {
      return '<label>' + label + '<input name="' + name + '" value="' + esc(st[name] == null ? '' : st[name]) + '" ' + (attrs || '') + '>' + (hint ? '<span class="form__hint">' + hint + '</span>' : '') + '</label>';
    };
    return UI.head('Admin', 'Settings') +
      '<div class="settings">' +
        '<form class="panel pad form" data-form="settings">' +
          '<h2 class="form__title">Department</h2>' +
          field('institution', 'Institution name', 'maxlength="80" placeholder="e.g. Plateau State Polytechnic"', 'Shown on printouts and the about page.') +
          field('department', 'Department', 'maxlength="80" required') +
          field('supervisor', 'Project supervisor', 'maxlength="60" placeholder="e.g. Mr. John Doe"', 'Shown on the about page.') +
          '<h2 class="form__title">Academic calendar</h2>' +
          '<div class="form__row">' + field('session', 'Session', 'maxlength="9" required placeholder="2025/2026"') +
          '<label>Semester<select name="semester" class="select">' + ['First Semester', 'Second Semester'].map(function (x) { return '<option' + (x === st.semester ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label></div>' +
          field('threshold', 'Minimum attendance for exams (%)', 'type="number" min="0" max="100" required', 'Students below this in a course are flagged as not eligible.') +
          '<button class="btn btn--ink">Save settings</button>' +
        '</form>' +
        '<section class="panel pad danger">' +
          '<h2 class="form__title">Demo data</h2>' +
          '<p>Put back the sample department, lecturers, students and seven weeks of lectures. Anything you have added will be lost.</p>' +
          '<button class="btn btn--danger" data-act="reset">Reset demo data</button>' +
        '</section>' +
      '</div>';
  };

  F.settings = function (form) {
    var d = UI.formData(form);
    d.threshold = Math.max(0, Math.min(100, Number(d.threshold) || 75));
    S.saveSettings(d);
    window.App.render(); UI.toast('Settings saved');
  };
  A.reset = function () {
    if (!confirm('Reset everything to the demo data?')) return;
    S.reset(); S.signInAs('u-hod');
    window.App.render(); UI.toast('Demo data restored');
  };
})();

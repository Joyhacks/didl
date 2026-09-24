/*
 * Lecturer screens (also open to the admin):
 *   #/dashboard            lecturer overview
 *   #/take                 choose a course and start a lecture register
 *   #/take/:course/:lecture  mark attendance for one lecture
 *   #/course/:id           course register, lectures held, eligibility
 *   #/student/:id          one student's attendance across courses
 */
(function () {
  'use strict';

  var S = window.RollStore, UI = window.UI, V = window.Views, A = window.Actions, F = window.Forms;
  var esc = UI.esc;

  function greeting() {
    var h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 16 ? 'Good afternoon' : 'Good evening';
  }
  function shortStaff(u) { return (u.title ? u.title + ' ' : '') + u.name.split(' ').slice(-1)[0]; }

  function myCourses(user) { return user.role === 'admin' ? S.courses() : S.courses({ lecturerId: user.id }); }
  function canEdit(user, course) { return user.role === 'admin' || course.lecturerId === user.id; }
  function todaysLecture(courseId) {
    var t = S.todayKey();
    return S.lectures(courseId).filter(function (l) { return l.date === t; })[0] || null;
  }

  /* ---------------- lecturer dashboard ---------------- */

  V.lecturerDashboard = function (p, user) {
    var st = S.settings();
    var courses = myCourses(user);
    var today = S.todayKey(), wd = S.parse(today).getDay();
    var scheduled = courses.filter(function (c) { return (c.days || []).indexOf(wd) > -1 || todaysLecture(c.id); });

    var held = 0, rates = [], watch = [];
    var stats = courses.map(function (c) {
      var cs = S.courseStat(c.id);
      held += cs.held;
      if (cs.rate != null) rates.push(cs.rate);
      cs.atRisk.forEach(function (r) { watch.push({ course: c, student: r.student, stat: r.stat }); });
      return cs;
    });
    var avg = rates.length ? rates.reduce(function (a, b) { return a + b; }, 0) / rates.length : null;
    watch.sort(function (a, b) { return a.stat.rate - b.stat.rate; });

    var recent = [];
    courses.forEach(function (c) { S.lectures(c.id).forEach(function (l) { recent.push(l); }); });
    recent.sort(function (a, b) { return (b.date + b.time).localeCompare(a.date + a.time); });
    recent = recent.slice(0, 6);

    return UI.head(esc(st.session) + ' &middot; ' + esc(st.semester), greeting() + ', <em>' + esc(shortStaff(user)) + '</em>') +

      (scheduled.length ? '<section class="today">' +
        '<h2 class="today__h">' + UI.icon('clock') + 'Today, ' + UI.fmt(today, { weekday: 'long', day: 'numeric', month: 'long' }) + '</h2>' +
        scheduled.map(function (c) {
          var l = todaysLecture(c.id);
          var r = l ? S.lectureRate(l) : null;
          return '<div class="today__item"><span class="code">' + esc(c.code) + '</span>' +
            '<span class="today__what">' + esc(c.title) + '<small>' + esc(c.level) + ' &middot; ' + UI.time12(l ? l.time : c.time) + '</small></span>' +
            (l ? '<span class="today__state">' + r.marked + ' of ' + r.total + ' marked</span><a class="btn btn--quiet btn--sm" href="#/take/' + c.id + '/' + l.id + '">Continue</a>'
               : '<button class="btn btn--ink btn--sm" data-act="quick-start" data-course="' + c.id + '">Take attendance</button>') +
            '</div>';
        }).join('') + '</section>' : '') +

      '<section class="figs">' +
        fig(courses.length, 'Courses') + fig(held, 'Lectures held') +
        fig(UI.pct(avg), 'Average attendance', UI.rateClass(avg)) +
        fig(watch.length, 'Below ' + st.threshold + '%', watch.length ? 'is-bad' : '') +
      '</section>' +

      '<h2 class="section-h">My courses</h2>' +
      (courses.length ? '<div class="cards">' + courses.map(function (c, i) { return courseCard(c, stats[i]); }).join('') + '</div>'
        : UI.empty('No courses are assigned to you yet. The HOD assigns courses from the admin panel.')) +

      '<div class="split split--even">' +
        '<section class="panel pad"><header class="panel__head"><h2>Recent lectures</h2></header>' +
          (recent.length ? '<ul class="list-rows">' + recent.map(function (l) {
            var c = S.course(l.courseId), r = S.lectureRate(l);
            return '<li><a href="#/take/' + c.id + '/' + l.id + '"><span class="list-rows__date"><b>' + UI.fmt(l.date, { day: 'numeric' }) + '</b>' + UI.fmt(l.date, { month: 'short' }) + '</span>' +
              '<span class="list-rows__main"><b>' + esc(c.code) + '</b> ' + esc(l.topic || 'Lecture') + '<small>' + UI.time12(l.time) + ' &middot; ' + r.inClass + ' of ' + r.total + ' in class</small></span>' +
              '<span class="list-rows__n ' + UI.rateClass(r.rate) + '">' + UI.pct(r.rate) + '</span></a></li>';
          }).join('') + '</ul>' : '<p class="muted">No lectures yet.</p>') +
        '</section>' +
        '<section class="panel pad"><header class="panel__head"><h2>Students to watch</h2><p>Below the ' + st.threshold + '% exam line</p></header>' +
          (watch.length ? '<ul class="people">' + watch.slice(0, 8).map(function (w) {
            return '<li><a href="#/student/' + w.student.id + '">' + UI.avatar(w.student.first, w.student.surname) +
              '<span class="people__who"><b>' + esc(w.student.first + ' ' + w.student.surname) + '</b><small>' + esc(w.course.code) + ' &middot; <span class="mono">' + esc(w.student.matric) + '</span></small></span>' +
              '<span class="badge badge--bad">' + UI.pct(w.stat.rate) + '</span></a></li>';
          }).join('') + '</ul>' : '<p class="empty-inline">Everyone is above the line.</p>') +
        '</section>' +
      '</div>';
  };

  function fig(n, label, cls) {
    return '<div class="fig"><span class="fig__n ' + (cls || '') + '">' + n + '</span><span class="fig__l">' + label + '</span></div>';
  }
  V.fig = fig;

  function courseCard(c, cs) {
    return '<article class="card">' +
      '<a class="card__link" href="#/course/' + c.id + '" aria-label="Open ' + esc(c.code) + '"></a>' +
      '<header class="card__top"><span class="code">' + esc(c.code) + '</span><span class="chip">' + esc(c.level) + '</span></header>' +
      '<h3 class="card__title">' + esc(c.title) + '</h3>' +
      '<div class="card__rate">' + UI.rateBar(cs.rate) + '</div>' +
      '<dl class="card__meta"><div><dt>Students</dt><dd>' + cs.students + '</dd></div><div><dt>Lectures</dt><dd>' + cs.held + '</dd></div>' +
      '<div><dt>Below line</dt><dd class="' + (cs.atRisk.length ? 'is-bad' : '') + '">' + cs.atRisk.length + '</dd></div></dl>' +
      '</article>';
  }
  V.courseCard = courseCard;

  /* ---------------- start a lecture ---------------- */

  V.takePick = function (p, user) {
    var courses = myCourses(user);
    var today = S.todayKey(), wd = S.parse(today).getDay();
    courses = courses.slice().sort(function (a, b) {
      var x = (a.days || []).indexOf(wd) > -1 ? 0 : 1, y = (b.days || []).indexOf(wd) > -1 ? 0 : 1;
      return x - y || a.code.localeCompare(b.code);
    });
    return UI.head('Take attendance', 'Start a <em>lecture register</em>') +
      (courses.length ? '<div class="starts">' + courses.map(function (c) {
        var l = todaysLecture(c.id);
        var isToday = (c.days || []).indexOf(wd) > -1;
        return '<form class="start" data-form="start" data-course="' + c.id + '">' +
          '<div class="start__course"><span class="code">' + esc(c.code) + '</span>' + (isToday ? '<span class="chip chip--accent">On today</span>' : '') +
          '<h3>' + esc(c.title) + '</h3><p>' + esc(c.level) + ' &middot; ' + S.courseStudents(c.id).length + ' students &middot; ' + S.lectures(c.id).length + ' lectures held</p></div>' +
          (l ? '<div class="start__go"><p class="muted">A register for today was started at ' + UI.time12(l.time) + '.</p><a class="btn btn--ink" href="#/take/' + c.id + '/' + l.id + '">Continue register</a></div>'
             : '<div class="start__fields">' +
                '<label>Date<input type="date" name="date" value="' + today + '" max="' + today + '" required></label>' +
                '<label>Time<input type="time" name="time" value="' + esc(c.time || '08:00') + '" required></label>' +
                '<label class="start__topic">Topic <span class="opt">optional</span><input name="topic" maxlength="80" placeholder="e.g. Exception handling"></label>' +
                '<button class="btn btn--ink">Start register</button></div>') +
          '</form>';
      }).join('') + '</div>' : UI.empty('No courses are assigned to you yet.'));
  };

  F.start = function (form) {
    var d = UI.formData(form);
    var l = S.startLecture(form.dataset.course, d.date, d.time, d.topic);
    location.hash = '#/take/' + form.dataset.course + '/' + l.id;
  };
  A['quick-start'] = function (btn) {
    var c = S.course(btn.dataset.course);
    // Reuse today's register if one was already started.
    var l = todaysLecture(c.id) || S.startLecture(c.id, S.todayKey(), c.time || '08:00', '');
    location.hash = '#/take/' + c.id + '/' + l.id;
  };

  /* ---------------- mark a lecture ---------------- */

  var take = { filter: '', focus: 0, lectureId: null };

  function counts(students, marks) {
    var c = { P: 0, L: 0, A: 0, E: 0, open: 0 };
    students.forEach(function (s) { var m = marks[s.id]; if (m) c[m]++; else c.open++; });
    return c;
  }

  function tallyHTML(students, marks) {
    var c = counts(students, marks), n = students.length, done = n - c.open;
    var f = function (key, label) {
      return '<div class="tally__fig tally__fig--' + key + '"><span class="tally__n">' + c[key] + '</span><span class="tally__l">' + label + '</span></div>';
    };
    return '<div class="tally">' + f('P', 'Present') + f('L', 'Late') + f('A', 'Absent') + f('E', 'Excused') + f('open', 'Not marked') + '</div>' +
      '<div class="meter" role="img" aria-label="' + done + ' of ' + n + ' marked">' +
      ['P', 'L', 'A', 'E', 'open'].map(function (k) {
        return c[k] ? '<span class="meter__seg meter__seg--' + k + '" style="flex-grow:' + c[k] + '"></span>' : '';
      }).join('') + '</div>' +
      '<p class="meter__caption">' + (c.open ? done + ' of ' + n + ' marked. Unmarked students count as absent.' : 'Register complete.') + '</p>';
  }

  function rowHTML(s, i, mark, stat, editable) {
    return '<li class="row' + (mark ? ' is-marked row--' + mark : '') + '" data-sid="' + s.id + '">' +
      '<span class="row__no">' + String(i + 1).padStart(2, '0') + '</span>' +
      UI.avatar(s.first, s.surname) +
      '<span class="row__who"><span class="row__name">' + UI.nameHTML(s) + '</span><span class="row__adm">' + esc(s.matric) + '</span></span>' +
      '<span class="row__hist ' + UI.rateClass(stat.rate) + '" title="Attendance so far in this course">' + UI.pct(stat.rate) + '</span>' +
      '<span class="marks" role="radiogroup" aria-label="Attendance for ' + esc(s.first + ' ' + s.surname) + '">' +
      S.MARKS.map(function (m) {
        return '<button type="button" role="radio" class="mark mark--' + m + '" data-act="mark" data-mark="' + m + '" aria-checked="' + (mark === m) + '"' + (editable ? '' : ' disabled') +
          ' title="' + UI.LABEL[m] + ' (' + m + ')"><span aria-hidden="true">' + m + '</span><span class="sr-only">' + UI.LABEL[m] + '</span></button>';
      }).join('') + '</span></li>';
  }

  V.takeLecture = function (p, user) {
    var c = S.course(p[0]), l = S.lecture(p[1]);
    if (!c || !l || l.courseId !== c.id) return UI.empty('That lecture register could not be found.', '<a class="btn btn--ink" href="#/take">Back</a>');
    if (take.lectureId !== l.id) { take = { filter: '', focus: 0, lectureId: l.id }; }
    var editable = canEdit(user, c);
    var students = S.courseStudents(c.id);
    var all = S.lectures(c.id), idx = all.indexOf(l) + 1;
    var q = take.filter.trim().toLowerCase();
    var shown = students.filter(function (s) {
      return !q || (s.surname + ' ' + s.first + ' ' + s.other + ' ' + s.matric).toLowerCase().indexOf(q) > -1;
    });

    return '<a class="back" href="#/course/' + c.id + '">' + UI.icon('left') + esc(c.code) + ' register</a>' +
      UI.head(esc(c.code) + ' &middot; ' + esc(c.level) + ' &middot; Lecture ' + idx + ' of ' + all.length,
        UI.fmt(l.date, { weekday: 'long' }) + ' <em>' + UI.fmt(l.date, { day: 'numeric', month: 'long' }) + '</em>',
        '<a class="btn btn--ink" href="#/course/' + c.id + '">Done</a>') +
      '<div class="lecture-meta">' +
        '<span>' + UI.icon('clock') + UI.time12(l.time) + '</span>' +
        '<label class="lecture-meta__topic">' + UI.icon('book') +
          '<input id="topic" value="' + esc(l.topic) + '" placeholder="Add the topic taught" aria-label="Topic"' + (editable ? '' : ' disabled') + '></label>' +
      '</div>' +
      '<section id="tally" aria-label="Summary">' + tallyHTML(students, l.marks) + '</section>' +
      '<div class="toolbar">' +
        '<label class="search">' + UI.icon('search') +
          '<input id="filter" type="search" placeholder="Find by name or matric number" value="' + esc(take.filter) + '" aria-label="Find a student"></label>' +
        (editable ? '<div class="toolbar__actions">' +
          '<button class="btn btn--quiet" data-act="rest" data-mark="A">Mark rest absent</button>' +
          '<button class="btn btn--ink" data-act="rest" data-mark="P">Mark rest present</button></div>' : '') +
      '</div>' +
      (students.length
        ? '<ol class="roll" id="roll">' + shown.map(function (s) {
            return rowHTML(s, students.indexOf(s), l.marks[s.id], S.stat(s.id, c.id), editable);
          }).join('') + '</ol>' +
          (shown.length ? '' : '<p class="empty-inline">No one matches “' + esc(take.filter) + '”.</p>')
        : UI.empty('No ' + esc(c.level) + ' students are registered yet.')) +
      (editable ? '<p class="keys"><kbd>↑</kbd><kbd>↓</kbd> move &nbsp; <kbd>P</kbd><kbd>L</kbd><kbd>A</kbd><kbd>E</kbd> mark &nbsp; <kbd>⌫</kbd> clear &nbsp; <kbd>/</kbd> search</p>' : '');
  };
  V.takeLecture.mount = function () { focusRow(take.focus, false); };

  function rows() { return Array.prototype.slice.call(document.querySelectorAll('#roll .row')); }
  function focusRow(i, scroll) {
    var list = rows();
    if (!list.length) return;
    take.focus = Math.max(0, Math.min(i, list.length - 1));
    list.forEach(function (r, j) { r.classList.toggle('is-focus', j === take.focus); });
    if (scroll !== false) list[take.focus].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function setRow(row, mark, toggle) {
    var l = S.lecture(take.lectureId);
    if (!l) return;
    var sid = row.dataset.sid;
    var next = toggle && l.marks[sid] === mark ? null : mark;
    S.setMark(l.id, sid, next);
    row.className = 'row' + (next ? ' is-marked row--' + next : '') + (row.classList.contains('is-focus') ? ' is-focus' : '');
    row.querySelectorAll('.mark').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.mark === next)); });
    var hist = row.querySelector('.row__hist'), st = S.stat(sid, l.courseId);
    hist.className = 'row__hist ' + UI.rateClass(st.rate);
    hist.textContent = UI.pct(st.rate);
    document.getElementById('tally').innerHTML = tallyHTML(S.courseStudents(l.courseId), l.marks);
  }

  A.mark = function (btn) {
    var row = btn.closest('.row');
    focusRow(rows().indexOf(row), false);
    setRow(row, btn.dataset.mark, true);
  };
  A.rest = function (btn) {
    var l = S.lecture(take.lectureId), n = 0;
    S.courseStudents(l.courseId).forEach(function (s) { if (!l.marks[s.id]) { S.setMark(l.id, s.id, btn.dataset.mark); n++; } });
    window.App.render();
    UI.toast(n ? n + ' marked ' + UI.LABEL[btn.dataset.mark].toLowerCase() : 'Everyone is already marked');
  };

  // Topic and search typing.
  document.addEventListener('input', function (e) {
    if (e.target.id === 'filter' && document.body.dataset.route === 'take') {
      take.filter = e.target.value;
      var pos = e.target.selectionStart;
      window.App.render();
      var f = document.getElementById('filter');
      f.focus(); f.setSelectionRange(pos, pos);
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'topic' && take.lectureId) {
      S.updateLecture(take.lectureId, { topic: e.target.value.trim() });
      UI.toast('Topic saved');
    }
  });

  // Keyboard marking.
  document.addEventListener('keydown', function (e) {
    if (document.body.dataset.route !== 'take' || !take.lectureId || !document.getElementById('roll')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') {
      if (e.key === 'Escape' || (e.key === 'ArrowDown' && e.target.id === 'filter')) { e.preventDefault(); e.target.blur(); focusRow(take.focus); }
      return;
    }
    var list = rows();
    if (!list.length || list[0].querySelector('.mark').disabled) return;
    var k = e.key.toLowerCase();
    if (k === 'arrowdown' || k === 'j') { e.preventDefault(); focusRow(take.focus + 1); }
    else if (k === 'arrowup' || k === 'k') { e.preventDefault(); focusRow(take.focus - 1); }
    else if ('plae'.indexOf(k) > -1 && k.length === 1) {
      e.preventDefault();
      setRow(list[take.focus], k.toUpperCase(), false);
      focusRow(take.focus + 1);
    } else if (k === 'backspace' || k === 'delete') {
      e.preventDefault();
      var r = list[take.focus];
      S.setMark(take.lectureId, r.dataset.sid, null);
      setRow(r, null, false);
    } else if (k === '/') {
      e.preventDefault(); document.getElementById('filter').focus();
    }
  });

  /* ---------------- course page ---------------- */

  V.course = function (p, user) {
    var c = S.course(p[0]);
    if (!c) return UI.empty('Course not found.', '<a class="btn btn--ink" href="#/dashboard">Back</a>');
    var st = S.settings();
    var edit = canEdit(user, c);
    var lecturer = S.user(c.lecturerId);
    var students = S.courseStudents(c.id);
    var lectures = S.lectures(c.id);
    var cs = S.courseStat(c.id);
    var stats = students.map(function (s) { return S.stat(s.id, c.id); });

    var chart = lectures.length ? UI.barChart(lectures.map(function (l, i) {
      var r = S.lectureRate(l);
      return {
        value: r.rate,
        label: (i === 0 || i === lectures.length - 1 || i % 4 === 0) ? UI.shortDate(l.date) : '',
        tip: UI.fmt(l.date, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + r.inClass + ' of ' + r.counted + ' in class (' + UI.pct(r.rate) + ')'
      };
    }), 'Attendance for each ' + c.code + ' lecture') : '';

    var head = '<tr><th class="sheet__name" scope="col">Student</th>' +
      lectures.map(function (l, i) {
        return '<th scope="col" class="sheet__day' + (i && S.parse(l.date).getDay() <= S.parse(lectures[i - 1].date).getDay() ? ' is-week' : '') + '" title="' + esc(l.topic) + '">' +
          '<span>' + UI.fmt(l.date, { month: 'short' }) + '</span>' + UI.fmt(l.date, { day: 'numeric' }) + '</th>';
      }).join('') +
      '<th scope="col" class="sheet__sum">Att.</th><th scope="col" class="sheet__sum">Rate</th><th scope="col" class="sheet__sum sheet__status">Status</th></tr>';

    var body = students.map(function (s, si) {
      var t = stats[si];
      return '<tr><th scope="row" class="sheet__name"><a href="#/student/' + s.id + '">' + UI.nameHTML(s) + '</a><span class="mono">' + esc(s.matric) + '</span></th>' +
        lectures.map(function (l, i) {
          var m = l.marks[s.id];
          var wk = i && S.parse(l.date).getDay() <= S.parse(lectures[i - 1].date).getDay() ? ' class="is-week"' : '';
          var label = esc(s.first + ' ' + s.surname) + ', ' + UI.shortDate(l.date) + ': ' + (m ? UI.LABEL[m] : 'not marked');
          return '<td' + wk + '>' + (edit
            ? '<button class="cell' + (m ? ' cell--' + m : '') + '" data-act="cycle" data-lecture="' + l.id + '" data-sid="' + s.id + '" aria-label="' + label + '">' + (m ? UI.GLYPH[m] : '') + '</button>'
            : '<span class="cell' + (m ? ' cell--' + m : '') + '" aria-label="' + label + '">' + (m ? UI.GLYPH[m] : '') + '</span>') + '</td>';
        }).join('') +
        '<td class="sheet__sum">' + t.attended + '</td>' +
        '<td class="sheet__sum ' + UI.rateClass(t.rate) + '">' + UI.pct(t.rate) + '</td>' +
        '<td class="sheet__sum sheet__status">' + UI.status(t) + '</td></tr>';
    }).join('');

    return '<a class="back" href="#/' + (user.role === 'admin' ? 'courses' : 'dashboard') + '">' + UI.icon('left') + (user.role === 'admin' ? 'All courses' : 'Overview') + '</a>' +
      UI.head(esc(c.code) + ' &middot; ' + esc(c.level) + ' &middot; ' + c.units + ' units &middot; ' + esc(UI.staffName(lecturer)), esc(c.title),
        (edit ? '<button class="btn btn--ink" data-act="quick-start" data-course="' + c.id + '">' + UI.icon('take') + 'Take attendance</button>' : '') +
        '<button class="btn btn--quiet" data-act="course-csv" data-course="' + c.id + '">' + UI.icon('download') + 'CSV</button>' +
        '<button class="btn btn--quiet" data-act="print">' + UI.icon('print') + 'Print</button>') +

      '<section class="figs">' +
        fig(students.length, 'Students') + fig(lectures.length, 'Lectures held') +
        fig(UI.pct(cs.rate), 'Average attendance', UI.rateClass(cs.rate)) +
        fig(students.length - cs.atRisk.length, 'Eligible for exam', 'is-good') +
        fig(cs.atRisk.length, 'Not eligible', cs.atRisk.length ? 'is-bad' : '') +
      '</section>' +

      (lectures.length ? '<section class="panel pad no-print"><header class="panel__head"><h2>Attendance per lecture</h2><p>Share of the class present or late</p></header>' + chart + '</section>' : '') +

      '<section class="block"><header class="block__head"><h2 class="section-h">Course register</h2>' +
        '<ul class="legend" aria-label="Key">' + S.MARKS.map(function (m) { return '<li><span class="cell cell--' + m + '">' + UI.GLYPH[m] + '</span>' + UI.LABEL[m] + '</li>'; }).join('') +
        (edit ? '<li class="legend__hint no-print">Click a square to change it</li>' : '') + '</ul></header>' +
        (students.length && lectures.length
          ? '<div class="sheet-wrap"><table class="sheet"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>'
          : UI.empty(lectures.length ? 'No students registered for ' + esc(c.level) + ' yet.' : 'No lectures held yet.', edit ? '<button class="btn btn--ink" data-act="quick-start" data-course="' + c.id + '">Take the first register</button>' : '')) +
      '</section>' +

      (lectures.length ? '<section class="block no-print"><h2 class="section-h">Lectures held</h2><div class="panel table-wrap"><table class="table">' +
        '<thead><tr><th>Date</th><th>Topic</th><th class="num">In class</th><th class="num">Rate</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
        lectures.slice().reverse().map(function (l) {
          var r = S.lectureRate(l);
          return '<tr><td class="nowrap">' + UI.fmt(l.date, { weekday: 'short', day: 'numeric', month: 'short' }) + '<span class="sub">' + UI.time12(l.time) + '</span></td>' +
            '<td>' + (l.topic ? esc(l.topic) : '<span class="muted">No topic</span>') + '</td>' +
            '<td class="num mono">' + r.inClass + ' / ' + r.total + '</td>' +
            '<td class="num mono ' + UI.rateClass(r.rate) + '">' + UI.pct(r.rate) + '</td>' +
            '<td class="actions"><a class="linklike" href="#/take/' + c.id + '/' + l.id + '">' + (edit ? 'Edit' : 'View') + '</a>' +
            (edit ? '<button class="linklike linklike--danger" data-act="delete-lecture" data-id="' + l.id + '">Delete</button>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div></section>' : '');
  };

  A.cycle = function (btn) {
    var order = [undefined, 'P', 'L', 'A', 'E'];
    var l = S.lecture(btn.dataset.lecture), sid = btn.dataset.sid;
    var next = order[(order.indexOf(l.marks[sid]) + 1) % order.length];
    S.setMark(l.id, sid, next || null);
    var wrap = document.querySelector('.sheet-wrap'), x = wrap ? wrap.scrollLeft : 0;
    window.App.render();
    wrap = document.querySelector('.sheet-wrap');
    if (wrap) wrap.scrollLeft = x;
    var again = document.querySelector('.cell[data-lecture="' + l.id + '"][data-sid="' + sid + '"]');
    if (again) again.focus();
  };

  A['delete-lecture'] = function (btn) {
    var l = S.lecture(btn.dataset.id);
    if (!l || !confirm('Delete the register for ' + UI.longDate(l.date) + '? This cannot be undone.')) return;
    S.deleteLecture(l.id);
    window.App.render();
    UI.toast('Lecture deleted');
  };

  A['course-csv'] = function (btn) {
    var c = S.course(btn.dataset.course);
    var lectures = S.lectures(c.id);
    var rows = [['S/N', 'Matric number', 'Name'].concat(lectures.map(function (l) { return l.date; }), ['Attended', 'Held (excl. excused)', 'Rate', 'Exam status'])];
    S.courseStudents(c.id).forEach(function (s, i) {
      var t = S.stat(s.id, c.id);
      rows.push([i + 1, s.matric, UI.fullName(s)]
        .concat(lectures.map(function (l) { return l.marks[s.id] || ''; }))
        .concat([t.attended, t.held - t.E, UI.pct(t.rate), t.eligible ? 'Eligible' : 'Not eligible']));
    });
    UI.download(c.code + '-attendance-register.csv', S.toCSV(rows));
    UI.toast('CSV downloaded');
  };

  /* ---------------- one student ---------------- */

  V.student = function (p, user) {
    var s = S.student(p[0]);
    if (!s) return UI.empty('Student not found.', '<a class="btn btn--ink" href="#/students">Back</a>');
    return '<a class="back" href="#/students">' + UI.icon('left') + 'Students</a>' +
      V.studentReport(s) +
      '<div class="actions-row no-print"><button class="btn btn--quiet" data-act="print">' + UI.icon('print') + 'Print attendance slip</button></div>';
  };
})();

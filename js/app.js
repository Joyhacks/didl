/*
 * Rollbook UI. A tiny hash router with four views:
 *   #/today     take the register for one day
 *   #/register  the month sheet, like the paper register book
 *   #/students  manage the class list
 *   #/insights  monthly figures and who needs follow-up
 */
(function () {
  'use strict';

  var S = window.RollStore;
  var view = document.getElementById('view');
  var classSelect = document.getElementById('classSelect');

  var LABEL = { P: 'Present', L: 'Late', A: 'Absent', E: 'Excused' };
  // The glyphs a paper register uses: a stroke for present, a nought for absent.
  var GLYPH = { P: '/', L: 'L', A: 'O', E: 'E' };
  var FOLLOW_UP = 0.85;

  var ui = {
    date: S.todayKey(),
    month: S.todayKey().slice(0, 7),
    filter: '',
    focus: 0
  };

  /* ---------- helpers ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pct(r) { return r == null ? '—' : Math.round(r * 100) + '%'; }
  function fmt(k, opts) { return S.parse(k).toLocaleDateString('en-GB', opts); }
  function shiftDay(k, n) { var d = S.parse(k); d.setDate(d.getDate() + n); return S.keyOf(d); }
  function shiftMonth(m, n) { var d = S.parse(m + '-01'); d.setMonth(d.getMonth() + n); return S.keyOf(d).slice(0, 7); }
  function monthLabel(m) { return fmt(m + '-01', { month: 'long', year: 'numeric' }); }
  function initials(s) { return (s.first[0] || '') + (s.last[0] || ''); }

  var toastTimer;
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2400);
  }

  function download(name, text) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function renderClassPicker() {
    var cur = S.currentClass();
    classSelect.innerHTML = S.classes().map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === cur.id ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');
  }

  function monthNav(label) {
    return '<div class="stepper" role="group" aria-label="Choose month">' +
      '<button class="icon-btn" data-act="month" data-n="-1" aria-label="Previous month">' + chevron('l') + '</button>' +
      '<span class="stepper__label">' + esc(label) + '</span>' +
      '<button class="icon-btn" data-act="month" data-n="1" aria-label="Next month">' + chevron('r') + '</button>' +
      '</div>';
  }
  function chevron(dir) {
    return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="' + (dir === 'l' ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5') + '"/></svg>';
  }

  /* ---------- Today ---------- */

  function counts(students, day) {
    var c = { P: 0, L: 0, A: 0, E: 0, open: 0 };
    students.forEach(function (s) { var m = day[s.id]; if (m) c[m]++; else c.open++; });
    return c;
  }

  function tallyHTML(students, day) {
    var c = counts(students, day), n = students.length || 1;
    var done = n - c.open;
    var fig = function (key, label) {
      return '<div class="fig fig--' + key + '"><span class="fig__n">' + c[key] + '</span><span class="fig__l">' + label + '</span></div>';
    };
    return '<div class="tally">' +
      fig('P', 'Present') + fig('L', 'Late') + fig('A', 'Absent') + fig('E', 'Excused') + fig('open', 'Not marked') +
      '</div>' +
      '<div class="meter" aria-label="' + done + ' of ' + students.length + ' marked">' +
      ['P', 'L', 'A', 'E'].map(function (k) {
        return c[k] ? '<span class="meter__seg meter__seg--' + k + '" style="flex-grow:' + c[k] + '"></span>' : '';
      }).join('') +
      (c.open ? '<span class="meter__seg meter__seg--open" style="flex-grow:' + c.open + '"></span>' : '') +
      '</div>' +
      '<p class="meter__caption">' + (c.open ? done + ' of ' + students.length + ' marked' : 'Register complete') + '</p>';
  }

  function rowHTML(s, i, mark) {
    return '<li class="row' + (mark ? ' is-marked row--' + mark : '') + '" data-sid="' + s.id + '" data-i="' + i + '">' +
      '<span class="row__no">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span class="avatar" aria-hidden="true">' + esc(initials(s)) + '</span>' +
      '<span class="row__who"><span class="row__name"><b>' + esc(s.last) + '</b>, ' + esc(s.first) + '</span>' +
      '<span class="row__adm">' + esc(s.adm) + '</span></span>' +
      '<span class="marks" role="radiogroup" aria-label="Attendance for ' + esc(s.first + ' ' + s.last) + '">' +
      S.MARKS.map(function (m) {
        return '<button type="button" role="radio" class="mark mark--' + m + '" data-mark="' + m + '" aria-checked="' + (mark === m) + '" title="' + LABEL[m] + ' (' + m + ')">' +
          '<span aria-hidden="true">' + m + '</span><span class="sr-only">' + LABEL[m] + '</span></button>';
      }).join('') +
      '</span></li>';
  }

  function viewToday() {
    var cls = S.currentClass();
    var students = S.students(cls.id);
    var day = S.day(cls.id, ui.date);
    var q = ui.filter.trim().toLowerCase();
    var shown = students.filter(function (s) {
      return !q || (s.first + ' ' + s.last + ' ' + s.adm).toLowerCase().indexOf(q) > -1;
    });
    var isToday = ui.date === S.todayKey();

    view.innerHTML =
      '<section class="head">' +
        '<div>' +
          '<p class="eyebrow">' + esc(cls.name) + ' &middot; ' + students.length + ' on roll' + (isToday ? '' : ' &middot; <span class="eyebrow__warn">Back-dated entry</span>') + '</p>' +
          '<h1 class="display">' + fmt(ui.date, { weekday: 'long' }) + '<br><em>' + fmt(ui.date, { day: 'numeric', month: 'long' }) + '</em></h1>' +
        '</div>' +
        '<div class="stepper" role="group" aria-label="Choose date">' +
          '<button class="icon-btn" data-act="day" data-n="-1" aria-label="Previous day">' + chevron('l') + '</button>' +
          '<input type="date" id="dateInput" class="date" value="' + ui.date + '" max="' + S.todayKey() + '" aria-label="Date">' +
          '<button class="icon-btn" data-act="day" data-n="1" aria-label="Next day"' + (isToday ? ' disabled' : '') + '>' + chevron('r') + '</button>' +
          (isToday ? '' : '<button class="btn btn--quiet" data-act="today">Today</button>') +
        '</div>' +
      '</section>' +

      (S.isWeekday(ui.date) ? '' : '<p class="notice">This is a weekend. Only mark it if the class met.</p>') +

      '<section id="tally" aria-label="Summary">' + tallyHTML(students, day) + '</section>' +

      '<div class="toolbar">' +
        '<label class="search"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></svg>' +
          '<input id="filter" type="search" placeholder="Find a student" value="' + esc(ui.filter) + '" aria-label="Find a student"></label>' +
        '<div class="toolbar__actions">' +
          '<button class="btn btn--quiet" data-act="clear-day">Clear day</button>' +
          '<button class="btn btn--ink" data-act="rest-present">Mark rest present</button>' +
        '</div>' +
      '</div>' +

      (students.length
        ? '<ol class="roll" id="roll">' + shown.map(function (s) { return rowHTML(s, students.indexOf(s), day[s.id]); }).join('') + '</ol>' +
          (shown.length ? '' : '<p class="empty">No one matches “' + esc(ui.filter) + '”.</p>')
        : '<div class="empty"><p>This class has no students yet.</p><a class="btn btn--ink" href="#/students">Add students</a></div>') +

      '<p class="keys"><kbd>↑</kbd><kbd>↓</kbd> move &nbsp; <kbd>P</kbd><kbd>L</kbd><kbd>A</kbd><kbd>E</kbd> mark &nbsp; <kbd>⌫</kbd> clear</p>';

    focusRow(ui.focus, false);
  }

  function rows() { return Array.prototype.slice.call(view.querySelectorAll('.row')); }

  function focusRow(i, scroll) {
    var list = rows();
    if (!list.length) return;
    ui.focus = Math.max(0, Math.min(i, list.length - 1));
    list.forEach(function (r, j) { r.classList.toggle('is-focus', j === ui.focus); });
    if (scroll !== false) list[ui.focus].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function markRow(row, mark) {
    var cls = S.currentClass();
    var sid = row.dataset.sid;
    var current = S.day(cls.id, ui.date)[sid];
    var next = current === mark ? null : mark;
    S.setMark(cls.id, ui.date, sid, next);
    row.className = 'row' + (next ? ' is-marked row--' + next : '') + (row.classList.contains('is-focus') ? ' is-focus' : '');
    row.querySelectorAll('.mark').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.mark === next)); });
    document.getElementById('tally').innerHTML = tallyHTML(S.students(cls.id), S.day(cls.id, ui.date));
  }

  /* ---------- Register (month sheet) ---------- */

  function viewRegister() {
    var cls = S.currentClass();
    var students = S.students(cls.id);
    var today = S.todayKey();
    var days = S.schoolDays(ui.month);
    var past = days.filter(function (k) { return k <= today; });

    var head = '<tr><th class="sheet__name" scope="col">Student</th>' +
      days.map(function (k) {
        var d = S.parse(k);
        return '<th scope="col" class="sheet__day' + (k === today ? ' is-today' : '') + (d.getDay() === 1 ? ' is-mon' : '') + '">' +
          '<span>' + 'MTWTF'[d.getDay() - 1] + '</span>' + d.getDate() + '</th>';
      }).join('') +
      '<th scope="col" class="sheet__sum">Pres.</th><th scope="col" class="sheet__sum">Abs.</th><th scope="col" class="sheet__sum">Rate</th></tr>';

    var body = students.map(function (s) {
      var t = S.tally(cls.id, s.id, past);
      return '<tr><th scope="row" class="sheet__name"><b>' + esc(s.last) + '</b>, ' + esc(s.first) + '</th>' +
        days.map(function (k) {
          var m = S.day(cls.id, k)[s.id];
          var future = k > today;
          return '<td class="' + (k === today ? 'is-today ' : '') + (S.parse(k).getDay() === 1 ? 'is-mon' : '') + '">' +
            (future ? '' : '<button class="cell' + (m ? ' cell--' + m : '') + '" data-act="cycle" data-sid="' + s.id + '" data-date="' + k + '" ' +
              'aria-label="' + esc(s.first + ' ' + s.last) + ', ' + fmt(k, { day: 'numeric', month: 'short' }) + ': ' + (m ? LABEL[m] : 'not marked') + '">' +
              (m ? GLYPH[m] : '') + '</button>') +
            '</td>';
        }).join('') +
        '<td class="sheet__sum">' + (t.P + t.L) + '</td><td class="sheet__sum">' + t.A + '</td>' +
        '<td class="sheet__sum' + (t.rate != null && t.rate < FOLLOW_UP ? ' is-low' : '') + '">' + pct(t.rate) + '</td></tr>';
    }).join('');

    var foot = '<tr><th scope="row" class="sheet__name">In class</th>' +
      days.map(function (k) {
        if (k > today) return '<td></td>';
        var d = S.day(cls.id, k), n = 0;
        students.forEach(function (s) { if (d[s.id] === 'P' || d[s.id] === 'L') n++; });
        return '<td class="sheet__total">' + (Object.keys(d).length ? n : '') + '</td>';
      }).join('') + '<td colspan="3"></td></tr>';

    view.innerHTML =
      '<section class="head">' +
        '<div><p class="eyebrow">' + esc(cls.name) + ' &middot; Register</p>' +
        '<h1 class="display">' + fmt(ui.month + '-01', { month: 'long' }) + ' <em>' + ui.month.slice(0, 4) + '</em></h1></div>' +
        '<div class="head__tools">' + monthNav(monthLabel(ui.month)) +
          '<button class="btn btn--quiet" data-act="print">Print</button>' +
          '<button class="btn btn--ink" data-act="csv">Export CSV</button></div>' +
      '</section>' +
      '<ul class="legend" aria-label="Key">' +
        S.MARKS.map(function (m) { return '<li><span class="cell cell--' + m + '">' + GLYPH[m] + '</span>' + LABEL[m] + '</li>'; }).join('') +
        '<li class="legend__hint">Click a square to change it</li>' +
      '</ul>' +
      (students.length
        ? '<div class="sheet-wrap"><table class="sheet"><thead>' + head + '</thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table></div>'
        : '<div class="empty"><p>No students in this class yet.</p><a class="btn btn--ink" href="#/students">Add students</a></div>');
  }

  /* ---------- Students ---------- */

  function viewStudents() {
    var cls = S.currentClass();
    var students = S.students(cls.id);
    var today = S.todayKey();
    var dates = S.schoolDays(shiftMonth(today.slice(0, 7), -1)).concat(S.schoolDays(today.slice(0, 7), today));

    view.innerHTML =
      '<section class="head">' +
        '<div><p class="eyebrow">' + esc(cls.name) + '</p><h1 class="display">Class <em>list</em></h1></div>' +
      '</section>' +
      '<div class="split">' +
        '<div class="panel panel--list">' +
          (students.length
            ? '<table class="list"><thead><tr><th>#</th><th>Name</th><th>Adm. no</th><th class="num">Rate <small>(2 mo.)</small></th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
              students.map(function (s, i) {
                var t = S.tally(cls.id, s.id, dates);
                return '<tr><td class="list__no">' + String(i + 1).padStart(2, '0') + '</td>' +
                  '<td><span class="avatar" aria-hidden="true">' + esc(initials(s)) + '</span><b>' + esc(s.last) + '</b>, ' + esc(s.first) + '</td>' +
                  '<td class="mono">' + esc(s.adm || '—') + '</td>' +
                  '<td class="num' + (t.rate != null && t.rate < FOLLOW_UP ? ' is-low' : '') + '">' + pct(t.rate) + '</td>' +
                  '<td class="list__act"><button class="linklike linklike--danger" data-act="remove" data-sid="' + s.id + '">Remove</button></td></tr>';
              }).join('') + '</tbody></table>'
            : '<p class="empty">No students yet. Add the first one using the form.</p>') +
        '</div>' +
        '<aside class="panel panel--form">' +
          '<form id="addStudent" class="form" autocomplete="off">' +
            '<h2 class="form__title">Add a student</h2>' +
            '<label>First name<input name="first" required maxlength="40"></label>' +
            '<label>Surname<input name="last" required maxlength="40"></label>' +
            '<label><span>Admission number <span class="opt">optional</span></span><input name="adm" maxlength="20" placeholder="' + esc(cls.code) + '/0000"></label>' +
            '<button class="btn btn--ink btn--block">Add to ' + esc(cls.name) + '</button>' +
          '</form>' +
          '<form id="addClass" class="form form--secondary" autocomplete="off">' +
            '<h2 class="form__title">New class</h2>' +
            '<label>Class name<input name="name" required maxlength="30" placeholder="e.g. SS 1 Arts"></label>' +
            '<button class="btn btn--quiet btn--block">Create class</button>' +
          '</form>' +
        '</aside>' +
      '</div>';
  }

  /* ---------- Insights ---------- */

  function viewInsights() {
    var cls = S.currentClass();
    var students = S.students(cls.id);
    var today = S.todayKey();
    var days = S.schoolDays(ui.month, today).filter(function (k) { return Object.keys(S.day(cls.id, k)).length; });

    var all = { P: 0, L: 0, A: 0, E: 0 };
    var per = students.map(function (s) {
      var t = S.tally(cls.id, s.id, days);
      ['P', 'L', 'A', 'E'].forEach(function (k) { all[k] += t[k]; });
      return { s: s, t: t };
    });
    var counted = all.P + all.L + all.A;
    var rate = counted ? (all.P + all.L) / counted : null;
    var flagged = per.filter(function (x) { return x.t.rate != null && x.t.rate < FOLLOW_UP; })
      .sort(function (a, b) { return a.t.rate - b.t.rate; });
    var perfect = per.filter(function (x) { return x.t.marked && x.t.A === 0 && x.t.L === 0; });

    view.innerHTML =
      '<section class="head">' +
        '<div><p class="eyebrow">' + esc(cls.name) + ' &middot; Insights</p>' +
        '<h1 class="display">How the month <em>went</em></h1></div>' +
        '<div class="head__tools">' + monthNav(monthLabel(ui.month)) + '</div>' +
      '</section>' +

      (days.length ? (
      '<section class="stats">' +
        '<div class="stat stat--hero"><span class="stat__n">' + pct(rate) + '</span><span class="stat__l">Attendance rate</span>' +
          '<span class="stat__s">Present or late, out of all unexcused days</span></div>' +
        '<div class="stat"><span class="stat__n">' + days.length + '</span><span class="stat__l">Days recorded</span></div>' +
        '<div class="stat"><span class="stat__n">' + all.L + '</span><span class="stat__l">Late arrivals</span></div>' +
        '<div class="stat"><span class="stat__n">' + all.A + '</span><span class="stat__l">Absences</span></div>' +
      '</section>' +

      '<section class="card">' +
        '<header class="card__head"><h2>Daily attendance</h2><p>Share of the class in school each day</p></header>' +
        chartHTML(cls, students, days) +
      '</section>' +

      '<div class="split split--even">' +
        '<section class="card">' +
          '<header class="card__head"><h2>Needs follow-up</h2><p>Below ' + Math.round(FOLLOW_UP * 100) + '% this month</p></header>' +
          (flagged.length
            ? '<ul class="people">' + flagged.map(function (x) {
                return '<li><span class="avatar" aria-hidden="true">' + esc(initials(x.s)) + '</span>' +
                  '<span class="people__who"><b>' + esc(x.s.first + ' ' + x.s.last) + '</b><small>' + x.t.A + ' absent &middot; ' + x.t.L + ' late</small></span>' +
                  '<span class="badge badge--warn">' + pct(x.t.rate) + '</span></li>';
              }).join('') + '</ul>'
            : '<p class="empty empty--inline">Everyone is above the line. Nothing to chase.</p>') +
        '</section>' +
        '<section class="card">' +
          '<header class="card__head"><h2>Full attendance</h2><p>Never absent or late this month</p></header>' +
          (perfect.length
            ? '<ul class="people">' + perfect.map(function (x) {
                return '<li><span class="avatar" aria-hidden="true">' + esc(initials(x.s)) + '</span>' +
                  '<span class="people__who"><b>' + esc(x.s.first + ' ' + x.s.last) + '</b><small>' + x.t.P + ' of ' + x.t.marked + ' days</small></span>' +
                  '<span class="badge badge--good">100%</span></li>';
              }).join('') + '</ul>'
            : '<p class="empty empty--inline">No one has a clean month yet.</p>') +
        '</section>' +
      '</div>'
      ) : '<div class="empty"><p>Nothing recorded for ' + esc(monthLabel(ui.month)) + ' yet.</p><a class="btn btn--ink" href="#/today">Take today’s register</a></div>');
  }

  function chartHTML(cls, students, days) {
    var W = 720, H = 220, padL = 36, padB = 26, padT = 10;
    var innerW = W - padL - 8, innerH = H - padB - padT;
    var step = innerW / days.length;
    var bw = Math.max(4, Math.min(14, step - 8));
    var y = function (v) { return padT + innerH * (1 - v); };

    var grid = [0, 0.5, 1].map(function (v) {
      return '<line class="chart__grid" x1="' + padL + '" x2="' + (W - 8) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>' +
        '<text class="chart__axis" x="' + (padL - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + (v * 100) + '%</text>';
    }).join('');

    var bars = days.map(function (k, i) {
      var d = S.day(cls.id, k), inClass = 0, counted = 0;
      students.forEach(function (s) {
        var m = d[s.id];
        if (m && m !== 'E') { counted++; if (m !== 'A') inClass++; }
      });
      var r = counted ? inClass / counted : 0;
      var x = padL + i * step + (step - bw) / 2;
      var h = Math.max(2, innerH * r);
      var top = y(r);
      var rad = Math.min(4, bw / 2, h);
      // Rounded top, square base sitting on the axis.
      var path = 'M' + x + ',' + (padT + innerH) + 'V' + (top + rad) + 'Q' + x + ',' + top + ' ' + (x + rad) + ',' + top +
        'H' + (x + bw - rad) + 'Q' + (x + bw) + ',' + top + ' ' + (x + bw) + ',' + (top + rad) + 'V' + (padT + innerH) + 'Z';
      var tip = fmt(k, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + inClass + ' of ' + counted + ' in class (' + pct(r) + ')';
      var label = (i === 0 || i === days.length - 1 || S.parse(k).getDay() === 1)
        ? '<text class="chart__axis" x="' + (x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + S.parse(k).getDate() + '</text>' : '';
      return '<g class="chart__bar" data-tip="' + esc(tip) + '">' +
        '<rect class="chart__hit" x="' + (padL + i * step) + '" y="' + padT + '" width="' + step + '" height="' + innerH + '"/>' +
        '<path class="chart__mark' + (r < FOLLOW_UP ? ' is-low' : '') + '" d="' + path + '"/>' + label + '</g>';
    }).join('');

    return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Daily attendance rate for ' + days.length + ' school days">' +
      grid + '<line class="chart__base" x1="' + padL + '" x2="' + (W - 8) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>' + bars +
      '</svg><div class="chart__tip" hidden></div></div>' +
      '<p class="chart__note">Days below ' + Math.round(FOLLOW_UP * 100) + '% are shown in red. Excused absences are left out.</p>';
  }

  /* ---------- router ---------- */

  var routes = { today: viewToday, register: viewRegister, students: viewStudents, insights: viewInsights };

  function route() {
    var name = (location.hash.replace(/^#\/?/, '') || 'today').split('/')[0];
    if (!routes[name]) name = 'today';
    document.querySelectorAll('.tabs a').forEach(function (a) {
      if (a.dataset.route === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.body.dataset.route = name;
    renderClassPicker();
    routes[name]();
  }

  function rerender() { route(); }

  /* ---------- events ---------- */

  window.addEventListener('hashchange', function () { route(); window.scrollTo(0, 0); });

  classSelect.addEventListener('change', function () {
    S.setCurrentClass(classSelect.value);
    ui.focus = 0; ui.filter = '';
    rerender();
  });

  document.getElementById('resetDemo').addEventListener('click', function () {
    if (!confirm('Replace everything with fresh demo data?')) return;
    S.reset(); ui.date = S.todayKey(); ui.month = ui.date.slice(0, 7); ui.focus = 0;
    rerender(); toast('Demo data restored');
  });

  view.addEventListener('click', function (e) {
    var markBtn = e.target.closest('.mark');
    if (markBtn) {
      var row = markBtn.closest('.row');
      focusRow(rows().indexOf(row), false);
      markRow(row, markBtn.dataset.mark);
      return;
    }
    var rowHit = e.target.closest('.row');
    if (rowHit) { focusRow(rows().indexOf(rowHit), false); }

    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var cls = S.currentClass();
    var act = btn.dataset.act;

    if (act === 'day') {
      var next = shiftDay(ui.date, Number(btn.dataset.n));
      // Skip weekends when stepping through days.
      while (!S.isWeekday(next)) next = shiftDay(next, Number(btn.dataset.n));
      if (next > S.todayKey()) next = S.todayKey();
      ui.date = next; ui.focus = 0; viewToday();
    } else if (act === 'today') {
      ui.date = S.todayKey(); ui.focus = 0; viewToday();
    } else if (act === 'month') {
      ui.month = shiftMonth(ui.month, Number(btn.dataset.n)); rerender();
    } else if (act === 'rest-present') {
      var day = S.day(cls.id, ui.date), n = 0;
      S.students(cls.id).forEach(function (s) { if (!day[s.id]) { S.setMark(cls.id, ui.date, s.id, 'P'); n++; } });
      viewToday(); toast(n ? n + ' marked present' : 'Everyone is already marked');
    } else if (act === 'clear-day') {
      if (!confirm('Clear every mark for ' + fmt(ui.date, { day: 'numeric', month: 'long' }) + '?')) return;
      S.students(cls.id).forEach(function (s) { S.setMark(cls.id, ui.date, s.id, null); });
      viewToday(); toast('Day cleared');
    } else if (act === 'cycle') {
      var order = [undefined, 'P', 'L', 'A', 'E'];
      var cur = S.day(cls.id, btn.dataset.date)[btn.dataset.sid];
      var nextMark = order[(order.indexOf(cur) + 1) % order.length];
      S.setMark(cls.id, btn.dataset.date, btn.dataset.sid, nextMark || null);
      var sid = btn.dataset.sid, date = btn.dataset.date;
      var scroll = view.querySelector('.sheet-wrap').scrollLeft;
      viewRegister();
      view.querySelector('.sheet-wrap').scrollLeft = scroll;
      var again = view.querySelector('.cell[data-sid="' + sid + '"][data-date="' + date + '"]');
      if (again) again.focus();
    } else if (act === 'csv') {
      var dates = S.schoolDays(ui.month, S.todayKey());
      download(cls.code + '-register-' + ui.month + '.csv', S.exportCSV(cls.id, dates));
      toast('CSV downloaded');
    } else if (act === 'print') {
      window.print();
    } else if (act === 'remove') {
      var st = S.students(cls.id).find(function (s) { return s.id === btn.dataset.sid; });
      if (st && confirm('Remove ' + st.first + ' ' + st.last + ' and their attendance history?')) {
        S.removeStudent(st.id); viewStudents(); toast(st.first + ' removed');
      }
    }
  });

  view.addEventListener('input', function (e) {
    if (e.target.id === 'filter') {
      ui.filter = e.target.value;
      var pos = e.target.selectionStart;
      viewToday();
      var f = document.getElementById('filter');
      f.focus(); f.setSelectionRange(pos, pos);
    }
  });

  view.addEventListener('change', function (e) {
    if (e.target.id === 'dateInput' && e.target.value) {
      ui.date = e.target.value > S.todayKey() ? S.todayKey() : e.target.value;
      ui.focus = 0; viewToday();
    }
  });

  view.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, cls = S.currentClass();
    if (f.id === 'addStudent') {
      var first = f.first.value.trim(), last = f.last.value.trim();
      if (!first || !last) return;
      S.addStudent(cls.id, first, last, f.adm.value.trim());
      viewStudents(); toast(first + ' ' + last + ' added');
      document.querySelector('#addStudent [name=first]').focus();
    } else if (f.id === 'addClass') {
      var name = f.name.value.trim();
      if (!name) return;
      S.addClass(name);
      rerender(); toast(name + ' created');
    }
  });

  // Chart hover tooltip.
  view.addEventListener('mousemove', function (e) {
    var chart = e.target.closest('.chart');
    if (!chart) return;
    var tip = chart.querySelector('.chart__tip');
    var bar = e.target.closest('.chart__bar');
    chart.querySelectorAll('.chart__bar.is-hover').forEach(function (b) { if (b !== bar) b.classList.remove('is-hover'); });
    if (!bar) { tip.hidden = true; return; }
    bar.classList.add('is-hover');
    var box = chart.getBoundingClientRect();
    tip.textContent = bar.dataset.tip;
    tip.hidden = false;
    var x = Math.min(Math.max(e.clientX - box.left, 90), box.width - 90);
    tip.style.left = x + 'px';
    tip.style.top = (e.clientY - box.top - 44) + 'px';
  });
  view.addEventListener('mouseleave', function () {
    var tip = view.querySelector('.chart__tip');
    if (tip) tip.hidden = true;
  }, true);

  // Keyboard marking on the Today view.
  document.addEventListener('keydown', function (e) {
    if (document.body.dataset.route !== 'today') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') {
      if (e.key === 'Escape' || e.key === 'ArrowDown') { e.target.blur(); if (e.key === 'ArrowDown') { e.preventDefault(); focusRow(ui.focus); } }
      return;
    }
    var list = rows();
    if (!list.length) return;
    var k = e.key.toLowerCase();
    if (k === 'arrowdown' || k === 'j') { e.preventDefault(); focusRow(ui.focus + 1); }
    else if (k === 'arrowup' || k === 'k') { e.preventDefault(); focusRow(ui.focus - 1); }
    else if (['p', 'l', 'a', 'e'].indexOf(k) > -1) {
      e.preventDefault();
      var row = list[ui.focus];
      if (S.day(S.currentClass().id, ui.date)[row.dataset.sid] !== k.toUpperCase()) markRow(row, k.toUpperCase());
      focusRow(ui.focus + 1);
    } else if (k === 'backspace' || k === 'delete') {
      e.preventDefault();
      var r = list[ui.focus], m = S.day(S.currentClass().id, ui.date)[r.dataset.sid];
      if (m) markRow(r, m);
    } else if (k === '/') {
      e.preventDefault(); document.getElementById('filter').focus();
    }
  });

  route();
})();

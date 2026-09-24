/*
 * Screens anyone can open without signing in:
 *   #/login   staff sign in
 *   #/check   students (or parents) check attendance with a matric number
 *   #/about   project information for the presentation
 */
(function () {
  'use strict';

  var S = window.RollStore, UI = window.UI, V = window.Views, A = window.Actions, F = window.Forms;
  var esc = UI.esc;

  function brand(light) {
    var st = S.settings();
    return '<a class="brand' + (light ? ' brand--light' : '') + '" href="#/login">' + crest() +
      '<span class="brand__text"><b>' + esc(st.institution || 'Attendance Register') + '</b><small>Attendance Register</small></span></a>';
  }

  // The school seal from assets/logo.png, on a white disc. If the file is
  // missing, a drawn "BSP" shield is shown instead.
  function crest(big) {
    return '<span class="crest' + (big ? ' crest--lg' : '') + '" aria-hidden="true">' +
      '<img src="assets/logo.png" alt="" onerror="this.parentNode.classList.add(\'crest--svg\');this.remove()">' +
      '<svg viewBox="0 0 48 56"><path class="crest__shield" d="M24 2 44 8v19c0 13-8.5 22.5-20 27C12.5 49.5 4 40 4 27V8z"/>' +
      '<text class="crest__text" x="24" y="33" text-anchor="middle">BSP</text></svg></span>';
  }
  V.crest = crest;
  V.brand = brand;

  function publicBar() {
    return '<header class="public-bar"><div class="public-bar__in">' + brand() +
      '<nav class="public-bar__nav"><a href="#/check">Check attendance</a><a href="#/about">About</a>' +
      '<a class="btn btn--quiet btn--sm" href="#/login">Staff sign in</a></nav></div></header>';
  }
  function publicFoot() {
    var st = S.settings();
    return '<footer class="colophon"><span>' + UI.credit() + '</span><span>' + esc(st.department) + (st.institution ? ', ' + esc(st.institution) : '') + '</span></footer>';
  }

  /* ---------------- sign in ---------------- */

  V.login = function () {
    var st = S.settings();
    var sample = [['Abubakar, Aisha', 'P'], ['Adeyemi, Funmilayo', 'P'], ['Ajayi, Temitope', 'L'], ['Babatunde, Joseph', 'A'], ['Bello, Zainab', 'P']];
    var demo = [S.user('u-hod'), S.user('u-l1')].filter(Boolean);

    return '<div class="auth">' +
      '<section class="auth__brand">' +
        brand(true) +
        '<div class="auth__pitch">' +
          '<p class="pill"><span class="pill__dot"></span>' + esc(st.department) + ' &middot; ' + esc(st.session) + '</p>' +
          '<h1 class="auth__title">The class register, <em>without the paper.</em></h1>' +
          '<p class="auth__lede">Lecturers take attendance in under a minute. The department can see who is falling below the ' + st.threshold + '% exam line before it is too late.</p>' +
          (st.motto ? '<p class="auth__motto">' + esc(st.motto) + '</p>' : '') +
        '</div>' +
        '<div class="specimen" aria-hidden="true">' +
          '<div class="specimen__head"><span>COM 221</span><span>' + UI.fmt(S.todayKey(), { weekday: 'short', day: 'numeric', month: 'short' }) + '</span></div>' +
          sample.map(function (r, i) {
            return '<div class="specimen__row"><span class="specimen__no">0' + (i + 1) + '</span><span>' + r[0] + '</span><span class="specimen__mark specimen__mark--' + r[1] + '">' + UI.GLYPH[r[1]] + '</span></div>';
          }).join('') +
        '</div>' +
        '<p class="auth__credit">' + UI.credit() + '</p>' +
      '</section>' +

      '<section class="auth__panel"><div class="auth__box">' +
        '<h2 class="auth__h">Staff sign in</h2>' +
        '<p class="auth__sub">For lecturers and department administrators.</p>' +
        '<form class="form" data-form="signin" novalidate>' +
          '<label>Email or staff ID<input name="login" autocomplete="username" required placeholder="you@csc.demo"></label>' +
          '<label>Password<input name="password" type="password" autocomplete="current-password" required></label>' +
          '<p class="form__error" id="signinError" role="alert" hidden></p>' +
          '<button class="btn btn--ink btn--block btn--lg">Sign in</button>' +
        '</form>' +
        '<div class="divider"><span>or use a demo account</span></div>' +
        '<div class="demo">' + demo.map(function (u) {
          var courses = S.courses({ lecturerId: u.id }).map(function (c) { return c.code; }).join(', ');
          return '<button type="button" class="demo__btn" data-act="demo" data-id="' + u.id + '">' +
            UI.avatar(u.name.split(' ')[0], u.name.split(' ')[1]) +
            '<span class="demo__who"><b>' + esc(UI.staffName(u)) + '</b><small>' +
            (u.role === 'admin' ? 'Head of Department &middot; Admin' : 'Lecturer &middot; ' + esc(courses)) + '</small></span>' +
            UI.icon('arrow') + '</button>';
        }).join('') + '</div>' +
        '<a class="callout" href="#/check">' + UI.icon('student') +
          '<span><b>Are you a student?</b><small>Check your attendance with your matric number. No password needed.</small></span>' + UI.icon('right') + '</a>' +
        '<p class="auth__foot"><a href="#/about">About this project</a><span>Student project prototype, not the official school portal.</span></p>' +
      '</div></section>' +
    '</div>';
  };

  A.demo = function (btn) {
    S.signInAs(btn.dataset.id);
    location.hash = '#/dashboard';
  };

  F.signin = function (form) {
    var d = UI.formData(form);
    var err = document.getElementById('signinError');
    var u = S.signIn(d.login, d.password);
    if (!u) {
      err.textContent = 'That email/staff ID and password do not match. Try a demo account below.';
      err.hidden = false;
      return;
    }
    location.hash = '#/dashboard';
  };

  /* ---------------- student report (shared) ---------------- */

  // Used by the public check page and by staff viewing a student.
  V.studentReport = function (s, opts) {
    opts = opts || {};
    var rows = S.studentReport(s.id);
    var rated = rows.filter(function (r) { return r.stat.rate != null; });
    var att = 0, cnt = 0;
    rated.forEach(function (r) { att += r.stat.attended; cnt += r.stat.held - r.stat.E; });
    var overall = cnt ? att / cnt : null;
    var barred = rows.filter(function (r) { return !r.stat.eligible; });
    var st = S.settings();

    return '<section class="profile">' +
        '<div class="profile__id">' + UI.avatar(s.first, s.surname, 'avatar--lg') +
          '<div><h2 class="profile__name">' + UI.nameHTML(s) + '</h2>' +
          '<p class="profile__meta"><span class="mono">' + esc(s.matric) + '</span><span class="chip">' + esc(s.level) + '</span><span>' + esc(st.session) + ' &middot; ' + esc(st.semester) + '</span></p></div>' +
        '</div>' +
        '<div class="profile__figs">' +
          '<div class="fig"><span class="fig__n ' + UI.rateClass(overall) + '">' + UI.pct(overall) + '</span><span class="fig__l">Overall attendance</span></div>' +
          '<div class="fig"><span class="fig__n">' + (rows.length - barred.length) + '<small>/' + rows.length + '</small></span><span class="fig__l">Courses eligible</span></div>' +
        '</div>' +
      '</section>' +

      (barred.length
        ? '<p class="notice notice--bad">' + (opts.self ? 'You are' : 'This student is') + ' below ' + st.threshold + '% in ' +
          barred.map(function (r) { return '<b>' + esc(r.course.code) + '</b>'; }).join(', ') +
          '. ' + (opts.self ? 'Speak to the course lecturer or your level adviser.' : 'Consider contacting the student or their level adviser.') + '</p>'
        : '<p class="notice notice--good">' + (opts.self ? 'You are' : 'This student is') + ' above ' + st.threshold + '% in every course.</p>') +

      '<div class="panel table-wrap"><table class="table">' +
        '<thead><tr><th>Course</th><th class="hide-sm">Lecturer</th><th class="num">Attended</th><th>Rate</th><th>Exam status</th></tr></thead><tbody>' +
        rows.map(function (r) {
          return '<tr><td><span class="code">' + esc(r.course.code) + '</span><span class="sub">' + esc(r.course.title) + '</span></td>' +
            '<td class="hide-sm">' + esc(UI.staffName(r.lecturer)) + '</td>' +
            '<td class="num mono">' + r.stat.attended + ' / ' + (r.stat.held - r.stat.E) + (r.stat.E ? '<span class="sub">' + r.stat.E + ' excused</span>' : '') + '</td>' +
            '<td>' + UI.rateBar(r.stat.rate) + '</td>' +
            '<td>' + UI.status(r.stat) + '</td></tr>';
        }).join('') +
        '</tbody></table></div>' +
      '<p class="footnote">Rate = lectures attended (present or late) &divide; lectures held, not counting excused absences. ' +
        'At least ' + st.threshold + '% is required to sit the examination.</p>';
  };

  /* ---------------- public attendance check ---------------- */

  V.check = function (p) {
    var q = decodeURIComponent(p[0] || '');
    var s = q ? S.studentByMatric(q) : null;
    return '<div class="public">' + publicBar() +
      '<main class="page page--narrow">' +
        UI.head('Student attendance check', 'How is my <em>attendance?</em>') +
        '<form class="lookup" data-form="check" role="search">' +
          '<label class="lookup__field">' + UI.icon('search') +
            '<input name="matric" value="' + esc(q) + '" placeholder="Matric number, e.g. BSP/CSC/ND/24/010" aria-label="Matric number" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>' +
          '<button class="btn btn--ink btn--lg">Check</button>' +
        '</form>' +
        (!q ? '<p class="footnote">Enter your matric number exactly as it appears on your ID card. Try <a href="#/check/BSP%2FCSC%2FND%2F24%2F010">BSP/CSC/ND/24/010</a>.</p>'
          : s ? '<div class="result">' + V.studentReport(s, { self: true }) +
                '<div class="actions-row"><button class="btn btn--quiet" data-act="print">' + UI.icon('print') + 'Print attendance slip</button></div></div>'
              : '<p class="notice notice--bad">No student found with matric number <b>' + esc(q.toUpperCase()) + '</b>. Check it and try again.</p>') +
      '</main>' + publicFoot() + '</div>';
  };

  F.check = function (form) {
    var m = UI.formData(form).matric;
    location.hash = '#/check/' + encodeURIComponent(m.toUpperCase());
  };

  /* ---------------- about the project ---------------- */

  V.about = function () {
    var st = S.settings();
    return '<div class="public">' + publicBar() +
      '<main class="page page--narrow about">' +
        UI.head('Project', 'Design and implementation of a web-based <em>student attendance register</em>') +
        '<dl class="facts">' +
          '<div><dt>Student</dt><dd>Awodosu Ibrahim Olamilekan</dd></div>' +
          '<div><dt>Matric number</dt><dd class="mono">BSP/CSC/ND/24/010</dd></div>' +
          '<div><dt>Programme</dt><dd>National Diploma, Computer Science</dd></div>' +
          '<div><dt>Department</dt><dd>' + esc(st.department) + (st.institution ? ', ' + esc(st.institution) : '') + '</dd></div>' +
          (st.supervisor ? '<div><dt>Supervisor</dt><dd>' + esc(st.supervisor) + '</dd></div>' : '') +
          '<div><dt>Session</dt><dd>' + esc(st.session) + '</dd></div>' +
        '</dl>' +

        '<h2 class="section-h">The problem</h2>' +
        '<p>Most departments still record attendance on paper sheets passed round the lecture hall. Sheets get lost, names are signed for absent friends, ' +
        'and adding up who has reached the ' + st.threshold + '% needed to sit the exam is done by hand at the end of the semester, when it is too late to act.</p>' +

        '<h2 class="section-h">What this system does</h2>' +
        '<div class="roles">' +
          '<div class="role"><h3>' + UI.icon('take') + 'Lecturers</h3><ul><li>Take attendance for each lecture in under a minute</li><li>See every lecture held and who was there</li><li>Know which students are below the exam line</li><li>Export or print the course register</li></ul></div>' +
          '<div class="role"><h3>' + UI.icon('staff') + 'HOD / Admin</h3><ul><li>Department-wide attendance at a glance</li><li>Manage courses, lecturers and students</li><li>Exam eligibility report for each level</li><li>Set the session, semester and threshold</li></ul></div>' +
          '<div class="role"><h3>' + UI.icon('student') + 'Students &amp; parents</h3><ul><li>Check attendance with a matric number</li><li>See the rate for every course</li><li>Get warned before falling below ' + st.threshold + '%</li><li>Print an attendance slip</li></ul></div>' +
        '</div>' +

        '<h2 class="section-h">How it is built</h2>' +
        '<p>HTML, CSS and plain JavaScript, with no framework and no build step. This prototype keeps its data in the browser. ' +
        'All data access goes through one file (<code>js/store.js</code>), so the next stage can move the data to a database server without changing the screens.</p>' +
        '<p class="actions-row"><a class="btn btn--ink" href="#/login">Open the demo</a><a class="btn btn--quiet" href="#/check">Student check</a></p>' +
      '</main>' + publicFoot() + '</div>';
  };
})();

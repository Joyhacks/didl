/*
 * App shell and router.
 * Reads the part of the URL after "#/", checks who is signed in, picks a
 * screen from js/views/*, and wires up clicks, forms and the chart tooltip.
 */
(function () {
  'use strict';

  var S = window.RollStore, UI = window.UI, V = window.Views, A = window.Actions, F = window.Forms;
  var esc = UI.esc;
  var root = document.getElementById('app');

  var PUBLIC = { login: V.login, check: V.check, about: V.about };

  // [route, label, icon] for each role's sidebar.
  var NAV = {
    admin: [
      ['dashboard', 'Overview', 'home'],
      ['courses', 'Courses', 'book'],
      ['students', 'Students', 'users'],
      ['lecturers', 'Lecturers', 'staff'],
      ['reports', 'Eligibility report', 'report'],
      ['take', 'Take attendance', 'take'],
      ['settings', 'Settings', 'settings']
    ],
    lecturer: [
      ['dashboard', 'Overview', 'home'],
      ['take', 'Take attendance', 'take'],
      ['students', 'Students', 'users']
    ]
  };
  var ADMIN_ONLY = { courses: 1, lecturers: 1, reports: 1, settings: 1 };

  var TITLES = {
    login: 'Sign in', check: 'Check attendance', about: 'About the project', dashboard: 'Overview',
    take: 'Take attendance', course: 'Course register', student: 'Student', students: 'Students',
    courses: 'Courses', lecturers: 'Lecturers', reports: 'Eligibility report', settings: 'Settings'
  };

  function parseHash() {
    var parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    return { name: parts[0] || '', params: parts.slice(1) };
  }

  function privateView(name, params, user) {
    switch (name) {
      case 'dashboard': return user.role === 'admin' ? V.adminDashboard(params, user) : V.lecturerDashboard(params, user);
      case 'take': return params.length >= 2 ? V.takeLecture(params, user) : V.takePick(params, user);
      case 'course': return V.course(params, user);
      case 'student': return V.student(params, user);
      case 'students': return V.students(params, user);
      case 'courses': return V.courses(params, user);
      case 'lecturers': return V.lecturers(params, user);
      case 'reports': return V.reports(params, user);
      case 'settings': return V.settings(params, user);
    }
    return null;
  }

  // Which sidebar item to highlight for pages that are not in the menu.
  function navKey(name, user) {
    if (name === 'course') return user.role === 'admin' ? 'courses' : 'dashboard';
    if (name === 'student') return 'students';
    return name;
  }

  function shell(user, name, html) {
    var st = S.settings();
    var active = navKey(name, user);
    var first = user.name.split(' ')[0], last = user.name.split(' ').slice(-1)[0];
    return '<div class="shell">' +
      '<aside class="side" id="side" aria-label="Main menu">' +
        '<div class="side__top">' + V.brand(true) +
          '<button class="icon-btn icon-btn--ghost side__close" data-act="close-nav" aria-label="Close menu">' + UI.icon('close') + '</button></div>' +
        '<p class="side__ctx">' + esc(st.department) + '<span>' + esc(st.session) + ' &middot; ' + esc(st.semester) + '</span></p>' +
        '<nav class="side__nav">' + NAV[user.role].map(function (n) {
          return '<a href="#/' + n[0] + '"' + (n[0] === active ? ' aria-current="page"' : '') + '>' + UI.icon(n[2]) + '<span>' + n[1] + '</span></a>';
        }).join('') + '</nav>' +
        '<div class="side__foot">' +
          '<div class="me">' + UI.avatar(first, last) + '<span><b>' + esc(UI.staffName(user)) + '</b><small>' + (user.role === 'admin' ? esc(user.position || 'Administrator') : 'Lecturer') + '</small></span></div>' +
          '<button class="icon-btn icon-btn--ghost" data-act="signout" aria-label="Sign out" title="Sign out">' + UI.icon('logout') + '</button>' +
        '</div>' +
      '</aside>' +
      '<div class="scrim" data-act="close-nav"></div>' +
      '<div class="main">' +
        '<header class="topbar"><button class="icon-btn" data-act="open-nav" aria-label="Open menu">' + UI.icon('menu') + '</button>' + V.brand() + '</header>' +
        '<main id="view" class="page">' + html + '</main>' +
        '<footer class="colophon"><span>' + UI.credit() + '</span><span>Prototype: data is stored in this browser.</span></footer>' +
      '</div>' +
    '</div>';
  }

  function render() {
    var r = parseHash();
    var user = S.currentUser();
    document.body.classList.remove('nav-open');

    if (PUBLIC[r.name]) {
      if (r.name === 'login' && user) { location.replace('#/dashboard'); return; }
      document.body.dataset.route = r.name;
      root.innerHTML = PUBLIC[r.name](r.params);
    } else {
      if (!user) { location.replace('#/login'); return; }
      if (!r.name || (ADMIN_ONLY[r.name] && user.role !== 'admin')) { location.replace('#/dashboard'); return; }
      var html = privateView(r.name, r.params, user);
      if (html == null) { location.replace('#/dashboard'); return; }
      document.body.dataset.route = r.name;
      root.innerHTML = shell(user, r.name, html);
      if (r.name === 'take' && r.params.length >= 2 && V.takeLecture.mount) V.takeLecture.mount();
    }
    document.title = (TITLES[r.name] || 'Attendance') + ' · ' + (S.settings().institution || 'Student Attendance Register');
  }

  window.App = { render: render };

  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });

  /* ---------------- shared actions ---------------- */

  A.print = function () { window.print(); };
  A.signout = function () { S.signOut(); location.hash = '#/login'; };
  A['open-nav'] = function () { document.body.classList.add('nav-open'); };
  A['close-nav'] = function () { document.body.classList.remove('nav-open'); };

  /* ---------------- delegated events ---------------- */

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (el && A[el.dataset.act] && !el.disabled) {
      if (el.tagName === 'A') e.preventDefault();
      A[el.dataset.act](el, e);
      return;
    }
    // Whole table rows that link somewhere.
    var tr = e.target.closest('tr[data-href]');
    if (tr && !e.target.closest('a, button, select, input')) location.hash = tr.dataset.href;
  });

  document.addEventListener('change', function (e) {
    var el = e.target.closest('[data-change]');
    if (el && A[el.dataset.change]) A[el.dataset.change](el, e);
  });

  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-form]');
    if (!form || !F[form.dataset.form]) return;
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    F[form.dataset.form](form);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.body.classList.remove('nav-open');
  });

  // Chart tooltip: follows the mouse, and a tap shows it on phones.
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.chart')) showTip(e); });
  document.addEventListener('mousemove', showTip);
  function showTip(e) {
    var chart = e.target.closest && e.target.closest('.chart');
    document.querySelectorAll('.chart__tip:not([hidden])').forEach(function (t) { if (!chart || !chart.contains(t)) t.hidden = true; });
    if (!chart) return;
    var tip = chart.querySelector('.chart__tip');
    var bar = e.target.closest('.chart__bar');
    chart.querySelectorAll('.chart__bar.is-hover').forEach(function (b) { if (b !== bar) b.classList.remove('is-hover'); });
    if (!bar) { tip.hidden = true; return; }
    bar.classList.add('is-hover');
    var box = chart.getBoundingClientRect();
    tip.textContent = bar.dataset.tip;
    tip.hidden = false;
    var half = tip.offsetWidth / 2 + 4;
    tip.style.left = Math.min(Math.max(e.clientX - box.left, half), box.width - half) + 'px';
    tip.style.top = (e.clientY - box.top - 44) + 'px';
  }

  render();
})();

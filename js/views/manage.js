/*
 * Editing and housekeeping screens:
 *   #/edit/student/:id   #/edit/course/:id   #/edit/staff/:id   (admin)
 *   #/import             add a whole class list from Excel/CSV   (admin)
 *   #/account            change your own password                (all staff)
 * plus backup and restore, shown on the Settings page.
 */
(function () {
  'use strict';

  var S = window.RollStore, UI = window.UI, V = window.Views, A = window.Actions, F = window.Forms;
  var esc = UI.esc;

  function showError(form, msg) {
    var e = form.querySelector('.form__error');
    e.textContent = msg; e.hidden = false;
  }
  function options(list, selected) {
    return list.map(function (o) {
      var v = typeof o === 'string' ? o : o[0], label = typeof o === 'string' ? o : o[1];
      return '<option value="' + esc(v) + '"' + (v === selected ? ' selected' : '') + '>' + esc(label) + '</option>';
    }).join('');
  }
  function field(label, name, value, attrs) {
    return '<label>' + label + '<input name="' + name + '" value="' + esc(value == null ? '' : value) + '" ' + (attrs || '') + '></label>';
  }
  function editPage(back, backLabel, eyebrow, title, form) {
    return '<a class="back" href="' + back + '">' + UI.icon('left') + backLabel + '</a>' +
      UI.head(eyebrow, title) + '<div class="edit">' + form + '</div>';
  }

  /* ---------------- edit a student ---------------- */

  V.editStudent = function (p) {
    var s = S.student(p[0]);
    if (!s) return UI.empty('Student not found.', '<a class="btn btn--ink" href="#/students">Back</a>');
    return editPage('#/student/' + s.id, UI.fullName(s), 'Edit student', UI.nameHTML(s),
      '<form class="panel pad form" data-form="edit-student" data-id="' + s.id + '" autocomplete="off">' +
        field('Matric number', 'matric', s.matric, 'required maxlength="30" autocapitalize="characters" spellcheck="false"') +
        field('Surname', 'surname', s.surname, 'required maxlength="40"') +
        '<div class="form__row">' + field('First name', 'first', s.first, 'required maxlength="40"') +
        field('Other name <span class="opt">optional</span>', 'other', s.other, 'maxlength="40"') + '</div>' +
        '<div class="form__row"><label>Level<select name="level" class="select">' + options(S.LEVELS, s.level) + '</select></label>' +
        '<label>Gender<select name="gender" class="select">' + options([['', '—'], ['F', 'Female'], ['M', 'Male']], s.gender) + '</select></label></div>' +
        '<p class="form__hint">Changing the level moves the student to that level’s courses. Attendance already taken is kept.</p>' +
        '<p class="form__error" hidden></p>' +
        '<div class="form__actions"><a class="btn btn--quiet" href="#/student/' + s.id + '">Cancel</a><button class="btn btn--ink">Save changes</button></div>' +
      '</form>');
  };

  F['edit-student'] = function (form) {
    var d = UI.formData(form);
    if (!d.surname || !d.first) return showError(form, 'Surname and first name are required.');
    try {
      var s = S.updateStudent(form.dataset.id, d);
      UI.toast('Saved');
      location.hash = '#/student/' + s.id;
    } catch (err) { showError(form, err.message); }
  };

  /* ---------------- edit a course ---------------- */

  V.editCourse = function (p) {
    var c = S.course(p[0]);
    if (!c) return UI.empty('Course not found.', '<a class="btn btn--ink" href="#/courses">Back</a>');
    var staff = [['', 'Unassigned']].concat(S.users('lecturer').concat(S.users('admin')).map(function (u) { return [u.id, UI.staffName(u)]; }));
    return editPage('#/course/' + c.id, esc(c.code), 'Edit course', esc(c.code) + ' <em>' + esc(c.title) + '</em>',
      '<form class="panel pad form" data-form="edit-course" data-id="' + c.id + '" autocomplete="off">' +
        '<div class="form__row">' + field('Code', 'code', c.code, 'required maxlength="10"') +
        field('Units', 'units', c.units, 'type="number" min="1" max="6" required') + '</div>' +
        field('Title', 'title', c.title, 'required maxlength="80"') +
        '<div class="form__row"><label>Level<select name="level" class="select">' + options(S.LEVELS, c.level) + '</select></label>' +
        field('Usual time', 'time', c.time, 'type="time"') + '</div>' +
        '<label>Lecturer<select name="lecturerId" class="select">' + options(staff, c.lecturerId) + '</select></label>' +
        '<fieldset class="days"><legend>Lecture days</legend>' +
          ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(function (d, i) {
            return '<label class="day"><input type="checkbox" name="days" value="' + (i + 1) + '"' + ((c.days || []).indexOf(i + 1) > -1 ? ' checked' : '') + '><span>' + d + '</span></label>';
          }).join('') + '</fieldset>' +
        '<p class="form__error" hidden></p>' +
        '<div class="form__actions"><a class="btn btn--quiet" href="#/course/' + c.id + '">Cancel</a><button class="btn btn--ink">Save changes</button></div>' +
      '</form>');
  };

  F['edit-course'] = function (form) {
    var d = UI.formData(form);
    if (!d.code || !d.title) return showError(form, 'Code and title are required.');
    try {
      S.updateCourse(form.dataset.id, d);
      UI.toast('Saved');
      location.hash = '#/course/' + form.dataset.id;
    } catch (err) { showError(form, err.message); }
  };

  /* ---------------- edit a staff member ---------------- */

  V.editStaff = function (p, user) {
    var u = S.user(p[0]);
    if (!u) return UI.empty('Staff member not found.', '<a class="btn btn--ink" href="#/lecturers">Back</a>');
    var titles = ['Mr.', 'Mrs.', 'Miss', 'Dr.', 'Engr.', 'Prof.'];
    if (titles.indexOf(u.title) < 0 && u.title) titles.unshift(u.title);
    return editPage('#/lecturers', 'Lecturers &amp; staff', 'Edit staff', esc(UI.staffName(u)),
      '<form class="panel pad form" data-form="edit-staff" data-id="' + u.id + '" autocomplete="off">' +
        '<div class="form__row form__row--title"><label>Title<select name="title" class="select">' + options(titles, u.title) + '</select></label>' +
        field('Full name', 'name', u.name, 'required maxlength="60"') + '</div>' +
        field('Position', 'position', u.position, 'maxlength="40"') +
        '<div class="form__row">' + field('Staff ID', 'staffId', u.staffId, 'required maxlength="20"') +
        field('Email', 'email', u.email, 'type="email" required maxlength="60"') + '</div>' +
        '<p class="form__error" hidden></p>' +
        '<div class="form__actions"><a class="btn btn--quiet" href="#/lecturers">Cancel</a><button class="btn btn--ink">Save changes</button></div>' +
      '</form>' +
      (u.id === user.id ? '' :
        '<section class="panel pad">' +
          '<h2 class="form__title">Password</h2>' +
          '<p class="muted">If ' + esc(u.name.split(' ')[0]) + ' has forgotten their password, set a temporary one and tell them to change it from <b>My account</b>.</p>' +
          '<button class="btn btn--quiet" data-act="reset-password" data-id="' + u.id + '">Reset to a temporary password</button>' +
        '</section>'));
  };

  F['edit-staff'] = function (form) {
    var d = UI.formData(form);
    if (!d.name || !d.staffId || !d.email) return showError(form, 'Name, staff ID and email are required.');
    try {
      S.updateUser(form.dataset.id, d);
      UI.toast('Saved');
      location.hash = '#/lecturers';
    } catch (err) { showError(form, err.message); }
  };

  A['reset-password'] = function (btn) {
    var u = S.user(btn.dataset.id);
    // Easy to read aloud: no 0/O or 1/l.
    var chars = 'abcdefghjkmnpqrstuvwxyz23456789', temp = '';
    for (var i = 0; i < 8; i++) temp += chars[Math.floor(Math.random() * chars.length)];
    S.resetPassword(u.id, temp).then(function () {
      var box = document.createElement('p');
      box.className = 'notice notice--good';
      box.innerHTML = 'Temporary password for ' + esc(UI.staffName(u)) + ': <b class="mono">' + esc(temp) + '</b>. It is shown once, so write it down.';
      btn.replaceWith(box);
    });
  };

  /* ---------------- import a class list ---------------- */

  var imp = { text: '', level: 'ND I', result: null };

  V.importStudents = function () {
    var r = imp.result;
    return '<a class="back" href="#/students">' + UI.icon('left') + 'Students</a>' +
      UI.head('Admin', 'Import a <em>class list</em>',
        '<button class="btn btn--quiet" data-act="import-template">' + UI.icon('download') + 'Download template</button>') +
      '<div class="split">' +
        '<section class="panel pad form">' +
          '<h2 class="form__title">1. Add the list</h2>' +
          '<p class="form__hint">Copy the columns from Excel and paste them below, or choose a CSV file. Columns: <b>Matric number, Surname, First name, Other name, Level, Gender</b>. Other name, level and gender can be left empty.</p>' +
          '<label class="file"><input type="file" accept=".csv,text/csv,text/plain" data-change="import-file"><span>' + UI.icon('upload') + 'Choose a CSV file</span></label>' +
          '<label>Or paste here<textarea id="importText" rows="10" spellcheck="false" placeholder="BSP/CSC/ND/25/015, Adewale, Tobi, Samuel, ND I, M">' + esc(imp.text) + '</textarea></label>' +
          '<label>Level for rows without one<select id="importLevel" class="select">' + options(S.LEVELS, imp.level) + '</select></label>' +
          '<button class="btn btn--ink" data-act="import-check">Check the list</button>' +
        '</section>' +
        '<aside class="panel pad">' +
          '<h2 class="form__title">2. Review and import</h2>' +
          (!r ? '<p class="muted">Nothing checked yet. Paste a list and press <b>Check the list</b>.</p>' :
            '<p class="import__sum"><b>' + r.rows.length + '</b> ready to import' + (r.errors.length ? ' &middot; <b class="is-bad">' + r.errors.length + '</b> need fixing' : '') + '</p>' +
            (r.errors.length ? '<ul class="import__errors">' + r.errors.slice(0, 12).map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') +
              (r.errors.length > 12 ? '<li>…and ' + (r.errors.length - 12) + ' more</li>' : '') + '</ul>' : '') +
            (r.rows.length ? '<ul class="import__rows">' + r.rows.slice(0, 8).map(function (d) {
                return '<li><span class="mono">' + esc(d.matric) + '</span><span>' + esc(d.surname.toUpperCase() + ', ' + d.first) + '</span><span class="chip">' + esc(d.level) + '</span></li>';
              }).join('') + (r.rows.length > 8 ? '<li class="muted">…and ' + (r.rows.length - 8) + ' more</li>' : '') + '</ul>' +
              '<button class="btn btn--ink btn--block" data-act="import-go">Import ' + r.rows.length + ' student' + (r.rows.length === 1 ? '' : 's') + '</button>' +
              (r.errors.length ? '<p class="form__hint">Rows with problems are skipped. Fix them and import again.</p>' : '')
              : '')) +
        '</aside>' +
      '</div>';
  };

  function readImportInputs() {
    var t = document.getElementById('importText'), l = document.getElementById('importLevel');
    if (t) imp.text = t.value;
    if (l) imp.level = l.value;
  }
  A['import-check'] = function () {
    readImportInputs();
    imp.result = S.parseClassList(imp.text, imp.level);
    window.App.render();
  };
  A['import-go'] = function () {
    if (!imp.result || !imp.result.rows.length) return;
    try {
      var n = S.importStudents(imp.result.rows);
      imp = { text: '', level: imp.level, result: null };
      UI.toast(n + ' student' + (n === 1 ? '' : 's') + ' imported');
      location.hash = '#/students';
    } catch (err) { UI.toast(err.message); }
  };
  A['import-file'] = function (input) {
    var f = input.files && input.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      readImportInputs();
      imp.text = String(reader.result).replace(/^﻿/, '');
      imp.result = S.parseClassList(imp.text, imp.level);
      window.App.render();
    };
    reader.readAsText(f);
  };
  A['import-template'] = function () {
    UI.download('class-list-template.csv', S.toCSV([
      ['Matric number', 'Surname', 'First name', 'Other name', 'Level', 'Gender'],
      ['BSP/CSC/ND/25/015', 'Adewale', 'Tobi', 'Samuel', 'ND I', 'M'],
      ['BSP/CSC/ND/25/016', 'Olaniyan', 'Deborah', '', 'ND I', 'F']
    ]));
  };

  /* ---------------- my account ---------------- */

  V.account = function (p, user) {
    return UI.head('My account', esc(UI.staffName(user))) +
      '<div class="edit">' +
        '<section class="panel pad">' +
          '<dl class="facts facts--tight">' +
            '<div><dt>Role</dt><dd>' + (user.role === 'admin' ? 'Administrator' : 'Lecturer') + '</dd></div>' +
            '<div><dt>Position</dt><dd>' + esc(user.position || '—') + '</dd></div>' +
            '<div><dt>Staff ID</dt><dd class="mono">' + esc(user.staffId) + '</dd></div>' +
            '<div><dt>Email</dt><dd>' + esc(user.email) + '</dd></div>' +
          '</dl>' +
          (user.role === 'admin' ? '' : '<p class="form__hint">To change your name or email, ask the HOD.</p>') +
        '</section>' +
        '<form class="panel pad form" data-form="password" autocomplete="off">' +
          '<h2 class="form__title">Change password</h2>' +
          '<label>Current password<input name="current" type="password" required autocomplete="current-password"></label>' +
          '<label>New password<input name="next" type="password" required minlength="6" autocomplete="new-password"></label>' +
          '<label>Repeat new password<input name="again" type="password" required minlength="6" autocomplete="new-password"></label>' +
          '<p class="form__error" hidden></p>' +
          '<button class="btn btn--ink">Update password</button>' +
        '</form>' +
      '</div>';
  };

  F.password = function (form) {
    var d = UI.formData(form);
    if (d.next !== d.again) return showError(form, 'The new passwords do not match.');
    var user = S.currentUser();
    S.changePassword(user.id, d.current, d.next).then(function () {
      form.reset();
      form.querySelector('.form__error').hidden = true;
      UI.toast('Password updated');
    }, function (err) { showError(form, err.message); });
  };

  /* ---------------- backup and restore (Settings page) ---------------- */

  V.backupPanel = function () {
    var st = S.settings();
    return '<section class="panel pad">' +
      '<h2 class="form__title">Backup &amp; restore</h2>' +
      '<p class="muted">Everything is saved in this browser. To move the register to another laptop, download a backup here and restore it there.</p>' +
      '<div class="form__actions form__actions--start">' +
        '<button class="btn btn--ink" data-act="backup">' + UI.icon('download') + 'Download backup</button>' +
        '<label class="file file--inline"><input type="file" accept=".json,application/json" data-change="restore-file"><span>' + UI.icon('upload') + 'Restore from file</span></label>' +
      '</div>' +
      (st.lastBackup ? '<p class="form__hint">Last backup: ' + esc(UI.longDate(st.lastBackup)) + '</p>' : '') +
    '</section>';
  };

  A.backup = function () {
    UI.download('attendance-backup-' + S.todayKey() + '.json', S.backup(), 'application/json');
    S.saveSettings({ lastBackup: S.todayKey() });
    window.App.render();
    UI.toast('Backup downloaded');
  };
  A['restore-file'] = function (input) {
    var f = input.files && input.files[0];
    if (!f) return;
    if (!confirm('Replace everything in this browser with the backup "' + f.name + '"?')) { input.value = ''; return; }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var r = S.restore(String(reader.result));
        window.App.render();
        UI.toast('Restored ' + r.students + ' students and ' + r.lectures + ' lectures');
      } catch (err) { UI.toast(err.message); input.value = ''; }
    };
    reader.readAsText(f);
  };
})();

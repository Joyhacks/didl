/*
 * Rollbook data layer.
 * Everything lives in the browser (localStorage) for now. When a backend is
 * added later, only this file needs to change: the UI calls these functions
 * and never touches storage directly.
 */
(function () {
  'use strict';

  var KEY = 'rollbook.v1';
  var MARKS = ['P', 'L', 'A', 'E'];

  var pad = function (n) { return String(n).padStart(2, '0'); };
  var keyOf = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var parse = function (k) { var p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2] || 1); };
  var uid = function () { return Math.random().toString(36).slice(2, 10); };
  var isWeekday = function (k) { var g = parse(k).getDay(); return g !== 0 && g !== 6; };

  // Small seeded random generator so the demo data is the same every time.
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function seed() {
    var rand = rng(20260924);
    var classes = [
      { id: 'c-ss2s', name: 'SS 2 Science', code: 'SS2S' },
      { id: 'c-jss3g', name: 'JSS 3 Gold', code: 'J3G' }
    ];
    var roster = {
      'c-ss2s': ['Adaeze Okafor', 'Tunde Bakare', 'Chioma Nwosu', 'Ibrahim Musa', 'Funmilayo Adeyemi',
        'Emeka Eze', 'Zainab Bello', 'David Olawale', 'Blessing Etim', 'Samuel Ogunleye',
        'Aisha Abubakar', 'Kelechi Obi', 'Temitope Ajayi', 'Grace Udoh'],
      'c-jss3g': ['Daniel Akande', 'Halima Yusuf', 'Chinedu Okeke', 'Esther Oladipo', 'Yusuf Garba',
        'Precious Johnson', 'Michael Adebayo', 'Ngozi Onyeka', 'Seun Afolabi', 'Fatima Sani',
        'Victor Ekpo', 'Ruth Danjuma']
    };

    var students = [];
    classes.forEach(function (c) {
      roster[c.id].forEach(function (full, i) {
        var parts = full.split(' ');
        students.push({
          id: 's-' + uid(),
          classId: c.id,
          first: parts[0],
          last: parts.slice(1).join(' '),
          adm: c.code + '/' + String(140 + i * 3).padStart(4, '0'),
          // How reliable this student is in the demo data. Two per class struggle.
          _r: i === 3 || i === 9 ? 0.68 : 0.9 + rand() * 0.09
        });
      });
    });

    // Fill every school day from the start of last month up to yesterday.
    // Today is left blank so it can be marked live during a demo.
    var records = {};
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    while (d < today) {
      var k = keyOf(d);
      if (isWeekday(k)) {
        classes.forEach(function (c) {
          var day = {};
          students.forEach(function (s) {
            if (s.classId !== c.id) return;
            var r = rand();
            day[s.id] = r < s._r ? (rand() < 0.07 ? 'L' : 'P') : (rand() < 0.2 ? 'E' : 'A');
          });
          records[c.id + '|' + k] = day;
        });
      }
      d.setDate(d.getDate() + 1);
    }
    students.forEach(function (s) { delete s._r; });

    return { version: 1, currentClassId: classes[0].id, classes: classes, students: students, records: records };
  }

  var state = null;

  function load() {
    try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
    if (!state || !Array.isArray(state.classes)) { state = seed(); save(); }
    return state;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: keep working in memory */ }
  }

  var byName = function (a, b) { return a.last.localeCompare(b.last) || a.first.localeCompare(b.first); };

  var Store = {
    MARKS: MARKS,
    keyOf: keyOf,
    parse: parse,
    isWeekday: isWeekday,
    todayKey: function () { return keyOf(new Date()); },

    classes: function () { return state.classes.slice(); },
    currentClass: function () {
      return state.classes.find(function (c) { return c.id === state.currentClassId; }) || state.classes[0];
    },
    setCurrentClass: function (id) { state.currentClassId = id; save(); },
    addClass: function (name, code) {
      var c = { id: 'c-' + uid(), name: name, code: code || name.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase() };
      state.classes.push(c); state.currentClassId = c.id; save();
      return c;
    },

    students: function (classId) {
      return state.students.filter(function (s) { return s.classId === classId; }).sort(byName);
    },
    addStudent: function (classId, first, last, adm) {
      var s = { id: 's-' + uid(), classId: classId, first: first, last: last, adm: adm || '' };
      state.students.push(s); save();
      return s;
    },
    removeStudent: function (id) {
      state.students = state.students.filter(function (s) { return s.id !== id; });
      Object.keys(state.records).forEach(function (k) { delete state.records[k][id]; });
      save();
    },

    day: function (classId, dateKey) { return state.records[classId + '|' + dateKey] || {}; },
    setMark: function (classId, dateKey, studentId, mark) {
      var k = classId + '|' + dateKey;
      var day = state.records[k] || (state.records[k] = {});
      if (mark) day[studentId] = mark; else delete day[studentId];
      if (!Object.keys(day).length) delete state.records[k];
      save();
    },

    // Weekdays of a month ("YYYY-MM"), optionally cut off at a date.
    schoolDays: function (monthKey, until) {
      var d = parse(monthKey + '-01'), out = [], m = d.getMonth();
      while (d.getMonth() === m) {
        var k = keyOf(d);
        if (isWeekday(k) && (!until || k <= until)) out.push(k);
        d.setDate(d.getDate() + 1);
      }
      return out;
    },

    // Tally marks for one student across a list of dates.
    tally: function (classId, studentId, dates) {
      var t = { P: 0, L: 0, A: 0, E: 0, marked: 0 };
      dates.forEach(function (k) {
        var m = Store.day(classId, k)[studentId];
        if (m) { t[m]++; t.marked++; }
      });
      // Excused absences don't count against the student.
      var counted = t.marked - t.E;
      t.rate = counted ? (t.P + t.L) / counted : null;
      return t;
    },

    exportCSV: function (classId, dates) {
      var rows = [['Admission no', 'Surname', 'First name'].concat(dates, ['Present', 'Late', 'Absent', 'Excused', 'Rate'])];
      Store.students(classId).forEach(function (s) {
        var t = Store.tally(classId, s.id, dates);
        rows.push([s.adm, s.last, s.first]
          .concat(dates.map(function (k) { return Store.day(classId, k)[s.id] || ''; }))
          .concat([t.P, t.L, t.A, t.E, t.rate == null ? '' : Math.round(t.rate * 100) + '%']));
      });
      return rows.map(function (r) {
        return r.map(function (v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',');
      }).join('\n');
    },

    reset: function () { state = seed(); save(); }
  };

  load();
  window.RollStore = Store;
})();

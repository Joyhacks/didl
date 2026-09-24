/*
 * Data layer for the Student Attendance Register.
 *
 * Everything is kept in the browser (localStorage) for this prototype.
 * The screens only ever call the functions exported at the bottom of this
 * file, so moving to a real backend later means rewriting this file only.
 *
 * NOTE: passwords here are demo values stored in plain text. That is fine
 * for a front-end prototype and must be replaced by real authentication
 * (hashed passwords on a server) before any real use.
 */
(function () {
  'use strict';

  var KEY = 'rollbook.v2';
  var AUTH_KEY = 'rollbook.auth';
  var MARKS = ['P', 'L', 'A', 'E'];
  var LEVELS = ['ND I', 'ND II', 'HND I', 'HND II'];

  var pad = function (n) { return String(n).padStart(2, '0'); };
  var keyOf = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var parse = function (k) { var p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2] || 1); };
  var uid = function (p) { return p + '-' + Math.random().toString(36).slice(2, 10); };
  var normMatric = function (m) { return String(m || '').trim().toUpperCase().replace(/\s+/g, ''); };

  // Seeded random numbers so the demo data is identical on every machine.
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------------------------------------------------------------- seed */

  function seed() {
    var rand = rng(24010);

    var settings = {
      institution: 'Best Solution Polytechnic',
      location: 'Km 12, Ondo Road, Akure, Ondo State',
      motto: 'Technology: Skill for Self Reliance',
      department: 'Department of Computer Science',
      supervisor: '',
      session: '2025/2026',
      semester: 'Second Semester',
      threshold: 75
    };

    var users = [
      { id: 'u-hod', role: 'admin', title: 'Dr.', name: 'Folake Adebayo', position: 'Head of Department', staffId: 'CSC/STAFF/001', email: 'hod@csc.demo', password: 'admin123' },
      { id: 'u-l1', role: 'lecturer', title: 'Mr.', name: 'Emmanuel Adeleke', position: 'Lecturer II', staffId: 'CSC/STAFF/014', email: 'adeleke@csc.demo', password: 'lecturer123' },
      { id: 'u-l2', role: 'lecturer', title: 'Mrs.', name: 'Grace Okonkwo', position: 'Senior Lecturer', staffId: 'CSC/STAFF/009', email: 'okonkwo@csc.demo', password: 'lecturer123' },
      { id: 'u-l3', role: 'lecturer', title: 'Mr.', name: 'Oluwaseun Akinola', position: 'Lecturer I', staffId: 'CSC/STAFF/017', email: 'akinola@csc.demo', password: 'lecturer123' },
      { id: 'u-l4', role: 'lecturer', title: 'Dr.', name: 'Chinedu Eze', position: 'Principal Lecturer', staffId: 'CSC/STAFF/005', email: 'eze@csc.demo', password: 'lecturer123' }
    ];

    // days: 1 = Monday ... 5 = Friday
    var courses = [
      { id: 'k-221', code: 'COM 221', title: 'Programming Language Using Java II', level: 'ND II', units: 3, lecturerId: 'u-l1', days: [1, 3], time: '08:00',
        topics: ['Review of OOP in Java', 'Inheritance and polymorphism', 'Interfaces and abstract classes', 'Exception handling', 'Collections framework', 'File input and output', 'GUI with Swing', 'Event handling', 'Threads', 'Database access with JDBC', 'Packaging and JAR files', 'Revision'] },
      { id: 'k-224', code: 'COM 224', title: 'Management Information Systems', level: 'ND II', units: 2, lecturerId: 'u-l2', days: [2], time: '10:00',
        topics: ['Information and organisations', 'Types of information systems', 'Decision support systems', 'Systems development life cycle', 'Databases in organisations', 'Security and ethics', 'Case study: banking MIS'] },
      { id: 'k-225', code: 'COM 225', title: 'Web Design and Development', level: 'ND II', units: 3, lecturerId: 'u-l3', days: [2, 4], time: '12:00',
        topics: ['How the web works', 'HTML document structure', 'Forms and tables', 'CSS selectors and the box model', 'Layout with Flexbox', 'Responsive design', 'JavaScript basics', 'DOM manipulation', 'Hosting a website', 'Project clinic'] },
      { id: 'k-223', code: 'COM 223', title: 'Basic Hardware Maintenance', level: 'ND II', units: 2, lecturerId: 'u-l4', days: [5], time: '10:00',
        topics: ['Workshop safety', 'PC components', 'Power supply units', 'Motherboard and BIOS', 'Storage devices', 'Troubleshooting procedure', 'Preventive maintenance'] },
      { id: 'k-121', code: 'COM 121', title: 'Programming Using C Language', level: 'ND I', units: 3, lecturerId: 'u-l1', days: [2, 4], time: '14:00',
        topics: ['Structure of a C program', 'Data types and variables', 'Operators and expressions', 'Control statements', 'Loops', 'Functions', 'Arrays', 'Strings', 'Pointers', 'Structures'] },
      { id: 'k-124', code: 'COM 124', title: 'Data Structures and Algorithms', level: 'ND I', units: 2, lecturerId: 'u-l2', days: [3], time: '12:00',
        topics: ['Algorithms and complexity', 'Arrays and records', 'Stacks', 'Queues', 'Linked lists', 'Searching', 'Sorting'] }
    ];

    // Surname, first name, other name. Sorted by matric number like a real class list.
    var nd2 = [
      ['Abubakar', 'Aisha', 'Hadiza', 'F'], ['Adeyemi', 'Funmilayo', 'Grace', 'F'], ['Ajayi', 'Temitope', 'Samuel', 'M'],
      ['Babatunde', 'Joseph', 'Ayomide', 'M'], ['Bello', 'Zainab', 'Ladi', 'F'], ['Chukwu', 'Ifeanyi', 'Paul', 'M'],
      ['Daramola', 'Ruth', 'Oluwakemi', 'F'], ['Eze', 'Emeka', 'Daniel', 'M'], ['Fashola', 'Oluwadamilare', 'Kehinde', 'M'],
      ['Awodosu', 'Ibrahim', 'Olamilekan', 'M'], ['Ibrahim', 'Musa', 'Sani', 'M'], ['Nwosu', 'Chioma', 'Blessing', 'F'],
      ['Obi', 'Kelechi', 'Victor', 'M'], ['Ogunleye', 'Samuel', 'Oluwaseun', 'M'], ['Okafor', 'Adaeze', 'Mary', 'F'],
      ['Olawale', 'David', 'Tunde', 'M'], ['Oyelaran', 'Lydia', 'Titilope', 'F'], ['Udoh', 'Grace', 'Ekaette', 'F']
    ];
    var nd1 = [
      ['Akande', 'Daniel', 'Oluwafemi', 'M'], ['Yusuf', 'Halima', 'Binta', 'F'], ['Okeke', 'Chinedu', 'Anthony', 'M'],
      ['Oladipo', 'Esther', 'Bukola', 'F'], ['Garba', 'Yusuf', 'Aliyu', 'M'], ['Johnson', 'Precious', 'Ima', 'F'],
      ['Adebayo', 'Michael', 'Kayode', 'M'], ['Onyeka', 'Ngozi', 'Ifeoma', 'F'], ['Afolabi', 'Seun', 'Joshua', 'M'],
      ['Sani', 'Fatima', 'Zara', 'F'], ['Ekpo', 'Victor', 'Etim', 'M'], ['Fagbemi', 'Rhoda', 'Naomi', 'F'],
      ['Ilesanmi', 'Jonathan', 'Tobi', 'M'], ['Mohammed', 'Amina', 'Kulu', 'F']
    ];

    var students = [];
    function addSet(list, level, year, weak) {
      list.forEach(function (n, i) {
        students.push({
          id: uid('s'),
          matric: 'BSP/CSC/ND/' + year + '/' + String(i + 1).padStart(3, '0'),
          surname: n[0], first: n[1], other: n[2], gender: n[3], level: level,
          _r: weak.indexOf(i) > -1 ? 0.6 + rand() * 0.1 : 0.86 + rand() * 0.13
        });
      });
    }
    addSet(nd2, 'ND II', '24', [5, 13]);
    addSet(nd1, 'ND I', '25', [4, 10]);

    // Lectures for the last seven weeks, up to yesterday. Today is left
    // empty so attendance can be taken live during a demo.
    var lectures = [];
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var start = new Date(today); start.setDate(start.getDate() - 49);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // back to Monday
    settings.semesterStart = keyOf(start);

    var count = {};
    for (var d = new Date(start); d < today; d.setDate(d.getDate() + 1)) {
      var wd = d.getDay();
      courses.forEach(function (c) {
        if (c.days.indexOf(wd) < 0) return;
        // Now and then a lecture does not hold (public holiday, strike day...).
        if (rand() < 0.06) return;
        var n = count[c.id] = (count[c.id] || 0);
        var marks = {};
        students.forEach(function (s) {
          if (s.level !== c.level) return;
          var r = rand();
          marks[s.id] = r < s._r ? (rand() < 0.08 ? 'L' : 'P') : (rand() < 0.2 ? 'E' : 'A');
        });
        lectures.push({ id: uid('l'), courseId: c.id, date: keyOf(d), time: c.time, topic: c.topics[n] || (n % 2 ? 'Practical session' : 'Tutorial and class exercise'), marks: marks });
        count[c.id]++;
      });
    }

    students.forEach(function (s) { delete s._r; });
    courses.forEach(function (c) { delete c.topics; });

    return { version: 2, settings: settings, users: users, courses: courses, students: students, lectures: lectures };
  }

  /* ------------------------------------------------------------ storage */

  var state = null;

  function load() {
    try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
    if (!state || state.version !== 2) { state = seed(); save(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: keep going in memory */ }
  }

  var byMatric = function (a, b) { return a.matric.localeCompare(b.matric); };
  var find = function (list, id) { return list.find(function (x) { return x.id === id; }) || null; };

  /* ---------------------------------------------------------------- api */

  var S = {
    MARKS: MARKS,
    LEVELS: LEVELS,
    keyOf: keyOf,
    parse: parse,
    todayKey: function () { return keyOf(new Date()); },
    isWeekday: function (k) { var g = parse(k).getDay(); return g !== 0 && g !== 6; },

    /* settings */
    settings: function () { return Object.assign({}, state.settings); },
    threshold: function () { return (Number(state.settings.threshold) || 75) / 100; },
    saveSettings: function (patch) { Object.assign(state.settings, patch); save(); },

    /* auth */
    currentUser: function () {
      var id; try { id = localStorage.getItem(AUTH_KEY); } catch (e) { id = S._auth; }
      return find(state.users, id || S._auth);
    },
    signIn: function (login, password) {
      var l = String(login || '').trim().toLowerCase();
      var u = state.users.find(function (x) {
        return (x.email.toLowerCase() === l || x.staffId.toLowerCase() === l) && x.password === password;
      });
      if (u) S.signInAs(u.id);
      return u || null;
    },
    signInAs: function (id) { S._auth = id; try { localStorage.setItem(AUTH_KEY, id); } catch (e) { /* ignore */ } },
    signOut: function () { S._auth = null; try { localStorage.removeItem(AUTH_KEY); } catch (e) { /* ignore */ } },

    /* staff */
    users: function (role) { return state.users.filter(function (u) { return !role || u.role === role; }); },
    user: function (id) { return find(state.users, id); },
    addLecturer: function (d) {
      if (state.users.some(function (u) { return u.email.toLowerCase() === d.email.toLowerCase() || u.staffId.toLowerCase() === d.staffId.toLowerCase(); })) {
        throw new Error('A staff member with that email or staff ID already exists.');
      }
      var u = Object.assign({ id: uid('u'), role: 'lecturer', password: 'lecturer123' }, d);
      state.users.push(u); save(); return u;
    },
    removeUser: function (id) {
      state.users = state.users.filter(function (u) { return u.id !== id; });
      state.courses.forEach(function (c) { if (c.lecturerId === id) c.lecturerId = ''; });
      save();
    },

    /* courses */
    courses: function (filter) {
      return state.courses.filter(function (c) {
        return !filter || ((!filter.lecturerId || c.lecturerId === filter.lecturerId) && (!filter.level || c.level === filter.level));
      }).sort(function (a, b) { return a.code.localeCompare(b.code); });
    },
    course: function (id) { return find(state.courses, id); },
    addCourse: function (d) {
      var code = d.code.trim().toUpperCase().replace(/\s+/g, ' ');
      if (state.courses.some(function (c) { return c.code === code; })) throw new Error(code + ' already exists.');
      var c = { id: uid('k'), code: code, title: d.title.trim(), level: d.level, units: Number(d.units) || 2, lecturerId: d.lecturerId || '', days: [], time: d.time || '08:00' };
      state.courses.push(c); save(); return c;
    },
    updateCourse: function (id, patch) { Object.assign(find(state.courses, id), patch); save(); },
    removeCourse: function (id) {
      state.courses = state.courses.filter(function (c) { return c.id !== id; });
      state.lectures = state.lectures.filter(function (l) { return l.courseId !== id; });
      save();
    },

    /* students */
    students: function (level) {
      return state.students.filter(function (s) { return !level || s.level === level; }).sort(byMatric);
    },
    student: function (id) { return find(state.students, id); },
    studentByMatric: function (m) {
      var n = normMatric(m);
      return state.students.find(function (s) { return s.matric === n; }) || null;
    },
    courseStudents: function (courseId) { var c = S.course(courseId); return c ? S.students(c.level) : []; },
    addStudent: function (d) {
      var matric = normMatric(d.matric);
      if (!matric) throw new Error('Matric number is required.');
      if (S.studentByMatric(matric)) throw new Error(matric + ' is already registered.');
      var s = { id: uid('s'), matric: matric, surname: d.surname.trim(), first: d.first.trim(), other: (d.other || '').trim(), gender: d.gender || '', level: d.level };
      state.students.push(s); save(); return s;
    },
    removeStudent: function (id) {
      state.students = state.students.filter(function (s) { return s.id !== id; });
      state.lectures.forEach(function (l) { delete l.marks[id]; });
      save();
    },

    /* lectures (one class meeting = one register) */
    lectures: function (courseId) {
      return state.lectures.filter(function (l) { return !courseId || l.courseId === courseId; })
        .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    },
    lecture: function (id) { return find(state.lectures, id); },
    startLecture: function (courseId, date, time, topic) {
      var l = { id: uid('l'), courseId: courseId, date: date, time: time, topic: topic || '', marks: {} };
      state.lectures.push(l); save(); return l;
    },
    updateLecture: function (id, patch) { Object.assign(find(state.lectures, id), patch); save(); },
    deleteLecture: function (id) { state.lectures = state.lectures.filter(function (l) { return l.id !== id; }); save(); },
    setMark: function (lectureId, studentId, mark) {
      var l = find(state.lectures, lectureId);
      if (!l) return;
      if (mark) l.marks[studentId] = mark; else delete l.marks[studentId];
      save();
    },

    /* numbers */

    // One student in one course. A lecture with no mark for the student
    // counts as absent; excused lectures are left out of the rate.
    stat: function (studentId, courseId) {
      var t = { P: 0, L: 0, A: 0, E: 0, held: 0 };
      S.lectures(courseId).forEach(function (l) {
        t.held++;
        t[l.marks[studentId] || 'A']++;
      });
      t.attended = t.P + t.L;
      var counted = t.held - t.E;
      t.rate = counted > 0 ? t.attended / counted : null;
      t.eligible = t.rate == null || t.rate >= S.threshold();
      return t;
    },

    // Summary for a whole course.
    courseStat: function (courseId) {
      var students = S.courseStudents(courseId);
      var held = S.lectures(courseId).length;
      var rates = [], atRisk = [];
      students.forEach(function (s) {
        var t = S.stat(s.id, courseId);
        if (t.rate != null) rates.push(t.rate);
        if (!t.eligible) atRisk.push({ student: s, stat: t });
      });
      var avg = rates.length ? rates.reduce(function (a, b) { return a + b; }, 0) / rates.length : null;
      return { students: students.length, held: held, rate: avg, atRisk: atRisk };
    },

    // Every course a student takes, with their numbers.
    studentReport: function (studentId) {
      var s = S.student(studentId);
      if (!s) return [];
      return S.courses({ level: s.level }).map(function (c) {
        return { course: c, lecturer: S.user(c.lecturerId), stat: S.stat(s.id, c.id) };
      });
    },

    // Present-or-late share for one lecture.
    lectureRate: function (l) {
      var students = S.courseStudents(l.courseId), inClass = 0, counted = 0, marked = 0;
      students.forEach(function (s) {
        var m = l.marks[s.id];
        if (m) marked++;
        if (m === 'E') return;
        counted++;
        if (m === 'P' || m === 'L') inClass++;
      });
      return { inClass: inClass, counted: counted, marked: marked, total: students.length, rate: counted ? inClass / counted : null };
    },

    /* export */
    toCSV: function (rows) {
      return rows.map(function (r) {
        return r.map(function (v) {
          v = v == null ? '' : String(v);
          return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
        }).join(',');
      }).join('\n');
    },

    reset: function () { state = seed(); save(); }
  };

  load();
  window.RollStore = S;
})();

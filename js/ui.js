/*
 * Small shared helpers used by every screen: escaping, formatting,
 * icons, the bar chart, toasts and file downloads.
 */
(function () {
  'use strict';

  var S = window.RollStore;

  var ICONS = {
    home: '<path d="M3.5 10.5 12 3.5l8.5 7V20a.5.5 0 0 1-.5.5h-5v-6h-6v6H4a.5.5 0 0 1-.5-.5z"/>',
    take: '<rect x="4.5" y="3.5" width="15" height="17" rx="2"/><path d="M9 3.5h6v2.5H9z"/><path d="m8.5 13 2.5 2.5 4.5-5"/>',
    book: '<path d="M4.5 5A1.5 1.5 0 0 1 6 3.5h13.5v14H6A1.5 1.5 0 0 0 4.5 19z"/><path d="M4.5 19A1.5 1.5 0 0 0 6 20.5h13.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18.2 14.2A6.5 6.5 0 0 1 21.5 20"/>',
    staff: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 16.5a3.5 3.5 0 0 1 7 0M15 10h3.5M15 13.5h3.5"/>',
    report: '<path d="M14 3.5H6.5a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8z"/><path d="M14 3.5V8h4.5M9 17v-3M12 17v-6M15 17v-4.5"/>',
    settings: '<path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1"/><circle cx="15" cy="6.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17.5" r="2"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    logout: '<path d="M14.5 4H19a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4.5"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H16"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    left: '<path d="m14.5 6-6 6 6 6"/>',
    right: '<path d="m9.5 6 6 6-6 6"/>',
    print: '<path d="M7 9V3.5h10V9"/><rect x="3" y="9" width="18" height="8" rx="1.5"/><path d="M7 14h10v6.5H7z"/>',
    download: '<path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 20h14"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    student: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-5M21.5 9v5"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'
  };

  var UI = {
    LABEL: { P: 'Present', L: 'Late', A: 'Absent', E: 'Excused' },
    GLYPH: { P: '/', L: 'L', A: 'O', E: 'E' },

    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    pct: function (r) { return r == null ? '—' : Math.round(r * 100) + '%'; },
    fmt: function (k, o) { return S.parse(k).toLocaleDateString('en-GB', o); },
    shortDate: function (k) { return UI.fmt(k, { day: 'numeric', month: 'short' }); },
    longDate: function (k) { return UI.fmt(k, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); },
    time12: function (t) {
      if (!t) return '';
      var p = t.split(':').map(Number), h = p[0] % 12 || 12;
      return h + ':' + String(p[1]).padStart(2, '0') + (p[0] < 12 ? ' am' : ' pm');
    },
    icon: function (name) { return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || '') + '</svg>'; },

    fullName: function (s) { return s.surname.toUpperCase() + ', ' + s.first + (s.other ? ' ' + s.other : ''); },
    nameHTML: function (s) { return '<b>' + UI.esc(s.surname) + '</b>, ' + UI.esc(s.first) + (s.other ? ' ' + UI.esc(s.other) : ''); },
    staffName: function (u) { return u ? (u.title ? u.title + ' ' : '') + u.name : 'Unassigned'; },
    initials: function (a, b) { return ((a || '')[0] || '') + ((b || '')[0] || ''); },
    avatar: function (a, b, cls) { return '<span class="avatar' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + UI.esc(UI.initials(a, b)) + '</span>'; },

    rateClass: function (r) {
      if (r == null) return '';
      var t = S.threshold();
      return r < t ? 'is-bad' : r < t + 0.1 ? 'is-warn' : 'is-good';
    },
    status: function (stat) {
      if (stat.rate == null) return '<span class="badge">No lectures</span>';
      return stat.eligible
        ? '<span class="badge badge--good">Eligible</span>'
        : '<span class="badge badge--bad">Not eligible</span>';
    },
    // A slim bar with a tick at the eligibility threshold.
    rateBar: function (r) {
      var t = S.threshold() * 100;
      return '<span class="ratebar ' + UI.rateClass(r) + '">' +
        '<span class="ratebar__track"><span class="ratebar__fill" style="width:' + (r == null ? 0 : Math.round(r * 100)) + '%"></span>' +
        '<span class="ratebar__tick" style="left:' + t + '%"></span></span>' +
        '<span class="ratebar__n">' + UI.pct(r) + '</span></span>';
    },

    head: function (eyebrow, title, tools) {
      return '<section class="head"><div class="head__text">' +
        (eyebrow ? '<p class="eyebrow">' + eyebrow + '</p>' : '') +
        '<h1 class="display">' + title + '</h1></div>' +
        (tools ? '<div class="head__tools">' + tools + '</div>' : '') + '</section>';
    },
    empty: function (text, action) {
      return '<div class="empty"><p>' + text + '</p>' + (action || '') + '</div>';
    },

    /*
     * Single-series bar chart. items: [{ value: 0..1 | null, tip, label }]
     * Bars below the eligibility threshold are drawn in the warning colour,
     * and the threshold itself is a dashed reference line.
     */
    barChart: function (items, aria) {
      var W = 720, H = 220, padL = 40, padR = 8, padB = 28, padT = 12;
      var innerW = W - padL - padR, innerH = H - padB - padT;
      var step = innerW / Math.max(items.length, 1);
      var bw = Math.max(6, Math.min(26, step - 10));
      var y = function (v) { return padT + innerH * (1 - v); };
      var t = S.threshold();

      var grid = [0, 0.5, 1].map(function (v) {
        return '<line class="chart__grid" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>' +
          '<text class="chart__axis" x="' + (padL - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v * 100 + '%</text>';
      }).join('');

      var bars = items.map(function (it, i) {
        var r = it.value == null ? 0 : it.value;
        var x = padL + i * step + (step - bw) / 2;
        var h = Math.max(2, innerH * r), top = padT + innerH - h;
        var rad = Math.min(4, bw / 2, h);
        var base = padT + innerH;
        var d = 'M' + x + ',' + base + 'V' + (top + rad) + 'Q' + x + ',' + top + ' ' + (x + rad) + ',' + top +
          'H' + (x + bw - rad) + 'Q' + (x + bw) + ',' + top + ' ' + (x + bw) + ',' + (top + rad) + 'V' + base + 'Z';
        return '<g class="chart__bar" data-tip="' + UI.esc(it.tip) + '">' +
          '<rect class="chart__hit" x="' + (padL + i * step) + '" y="' + padT + '" width="' + step + '" height="' + innerH + '"/>' +
          '<path class="chart__mark' + (it.value != null && it.value < t ? ' is-low' : '') + '" d="' + d + '"/>' +
          (it.label ? '<text class="chart__axis" x="' + (x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + UI.esc(it.label) + '</text>' : '') +
          '</g>';
      }).join('');

      var ref = '<line class="chart__ref" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>';

      return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + UI.esc(aria) + '">' +
        grid + '<line class="chart__base" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>' +
        bars + ref + '</svg><div class="chart__tip" hidden></div>' +
        '<p class="chart__key"><span class="chart__key-bar"></span>Attendance <span class="chart__key-bar is-low"></span>Below the line <span class="chart__key-ref"></span>' + Math.round(t * 100) + '% exam line</p></div>';
    },

    toast: function (msg) {
      var t = document.getElementById('toast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('is-on');
      clearTimeout(UI._toast);
      UI._toast = setTimeout(function () { t.classList.remove('is-on'); }, 2600);
    },

    download: function (name, text) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
      a.download = name.replace(/[\\/:*?"<>| ]+/g, '-');
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    },

    // Keep a form's values between re-renders when validation fails.
    formData: function (form) {
      var o = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name) return;
        if (el.type === 'checkbox') { (o[el.name] = o[el.name] || []); if (el.checked) o[el.name].push(el.value); }
        else o[el.name] = el.value.trim();
      });
      return o;
    },

    credit: function () {
      return 'Designed and built by <b>Awodosu Ibrahim Olamilekan</b> &middot; <span class="mono">BSP/CSC/ND/24/010</span>';
    }
  };

  window.UI = UI;
  window.Views = {};
  window.Actions = {};
  window.Forms = {};
})();

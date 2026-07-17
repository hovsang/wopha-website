// Facility booking page (/amenities/book/). Fetches busy/free availability
// from /api/bookings and books grid slots with name + email + address. All
// dynamic text goes through textContent, never innerHTML. A load sequence
// counter (the capture-guard convention) keeps a slow response for one
// facility from clobbering a newer selection.
(function () {
  var facilitySelect = document.getElementById("facility-select");
  var statusEl = document.getElementById("calendar-status");
  var windowNote = document.getElementById("window-note");
  var table = document.getElementById("avail-table");
  var caption = document.getElementById("avail-caption");
  var thead = document.getElementById("avail-head");
  var tbody = document.getElementById("avail-body");
  var bookSection = document.getElementById("book");
  var confirmSection = document.getElementById("confirmation");
  var form = document.getElementById("book-form");
  var errorEl = document.getElementById("book-error");
  if (!facilitySelect || !table) return;

  var data = null;
  var chosen = null; // { facility, date, start, end }
  var labels = {};
  var loadSeq = 0;

  /* MIRROR of fmtTime in src/assets/js/booking-cancel.js and the portal
     bookings page. Keep in sync. */
  function fmtTime(hhmm) {
    var h = Number(hhmm.slice(0, 2));
    var suffix = h >= 12 ? " p.m." : " a.m.";
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ":" + hhmm.slice(3, 5) + suffix;
  }
  function fmtDate(iso) {
    return new Date(iso + "T12:00:00").toLocaleDateString("en-US",
      { weekday: "short", month: "short", day: "numeric" });
  }
  function fmtDateLong(iso) {
    return new Date(iso + "T12:00:00").toLocaleDateString("en-US",
      { weekday: "long", month: "long", day: "numeric" });
  }

  function load(facility) {
    var seq = ++loadSeq;
    statusEl.textContent = "Loading availability…";
    var qs = facility ? "?facility=" + encodeURIComponent(facility) : "";
    fetch("/api/bookings" + qs).then(function (r) {
      if (!r.ok) throw new Error("bad status");
      return r.json();
    }).then(function (d) {
      if (seq !== loadSeq) return; // a newer load superseded this one
      data = d;
      labels = {};
      d.facilities.forEach(function (f) { labels[f.id] = f.label; });
      fillSelect(d.facilities, d.facility);
      windowNote.textContent = "Times open up " + d.window_hours + " hours ahead.";
      render();
      statusEl.textContent = "";
      table.hidden = false;
    }).catch(function () {
      if (seq !== loadSeq) return;
      table.hidden = true;
      statusEl.textContent = "Could not load availability. Please try again in a minute.";
    });
  }

  var selectFilled = false;
  function fillSelect(facilities, current) {
    if (!selectFilled) {
      selectFilled = true;
      facilities.forEach(function (f) {
        var o = document.createElement("option");
        o.value = f.id;
        o.textContent = f.label;
        facilitySelect.appendChild(o);
      });
    }
    facilitySelect.value = current;
  }

  function render() {
    caption.textContent = "Availability for " + (labels[data.facility] || data.facility);
    thead.textContent = "";
    tbody.textContent = "";

    var hr = document.createElement("tr");
    var timeTh = document.createElement("th");
    timeTh.scope = "col";
    timeTh.textContent = "Time";
    hr.appendChild(timeTh);
    data.days.forEach(function (day) {
      var th = document.createElement("th");
      th.scope = "col";
      th.textContent = fmtDate(day.date);
      hr.appendChild(th);
    });
    thead.appendChild(hr);

    // Earliest bookable slot, to tell "Past" apart from "Not open yet".
    var firstBookable = null;
    data.days.forEach(function (day) {
      day.slots.forEach(function (s) {
        var k = day.date + " " + s.start;
        if (s.bookable && (firstBookable === null || k < firstBookable)) firstBookable = k;
      });
    });

    data.days[0].slots.forEach(function (rowSlot, i) {
      var tr = document.createElement("tr");
      var th = document.createElement("th");
      th.scope = "row";
      th.textContent = fmtTime(rowSlot.start) + " to " + fmtTime(rowSlot.end);
      tr.appendChild(th);
      data.days.forEach(function (day) {
        var td = document.createElement("td");
        var s = day.slots[i];
        if (s.busy) {
          var busySpan = document.createElement("span");
          busySpan.className = "slot-status";
          busySpan.textContent = "Reserved";
          td.appendChild(busySpan);
        } else if (s.bookable) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn btn--outline slot-btn";
          btn.textContent = "Book";
          btn.setAttribute("aria-label", "Book " + (labels[data.facility] || data.facility) +
            ", " + fmtDateLong(day.date) + ", " + fmtTime(s.start) + " to " + fmtTime(s.end));
          btn.addEventListener("click", function () { choose(day.date, s); });
          td.appendChild(btn);
        } else {
          var muted = document.createElement("span");
          muted.className = "slot-status";
          muted.textContent = (firstBookable !== null && day.date + " " + s.start < firstBookable)
            ? "Past" : "Not open yet";
          td.appendChild(muted);
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  function choose(date, slot) {
    chosen = { facility: data.facility, date: date, start: slot.start, end: slot.end };
    document.getElementById("slot-summary").textContent =
      (labels[data.facility] || data.facility) + ", " + fmtDateLong(date) +
      ", " + fmtTime(slot.start) + " to " + fmtTime(slot.end) + ".";
    errorEl.hidden = true;
    confirmSection.hidden = true;
    bookSection.hidden = false;
    document.getElementById("book-heading").focus();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!chosen) return;
    errorEl.hidden = true;
    var btn = document.getElementById("book-btn");
    btn.disabled = true;
    var booked = chosen; // capture: `chosen` may change while in flight
    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facility: booked.facility,
        date: booked.date,
        start: booked.start,
        name: document.getElementById("book-name").value.trim(),
        email: document.getElementById("book-email").value.trim(),
        address: document.getElementById("book-address").value.trim(),
        botcheck: document.getElementById("botcheck").checked ? "1" : "",
      }),
    }).then(function (r) {
      return r.json().then(function (body) { return { ok: r.ok, body: body }; });
    }).then(function (res) {
      btn.disabled = false;
      if (!res.ok) {
        errorEl.textContent = (res.body && res.body.error) || "Something went wrong. Try again.";
        errorEl.hidden = false;
        load(booked.facility); // the slot may have just been taken: refresh
        return;
      }
      form.reset();
      bookSection.hidden = true;
      document.getElementById("confirm-summary").textContent =
        (labels[booked.facility] || booked.facility) + " is yours on " + fmtDateLong(booked.date) +
        ", " + fmtTime(booked.start) + " to " + fmtTime(booked.end) + ".";
      document.getElementById("confirm-cancel-link").href = res.body.cancel_url;
      confirmSection.hidden = false;
      document.getElementById("confirm-heading").focus();
      chosen = null;
      load(booked.facility);
    }).catch(function () {
      btn.disabled = false;
      errorEl.textContent = "Could not reach the booking service. Try again in a minute.";
      errorEl.hidden = false;
    });
  });

  document.getElementById("book-cancel-btn").addEventListener("click", function () {
    bookSection.hidden = true;
    chosen = null;
    facilitySelect.focus();
  });

  facilitySelect.addEventListener("change", function () {
    bookSection.hidden = true;
    chosen = null;
    load(facilitySelect.value);
  });

  var params = new URLSearchParams(location.search);
  load(params.get("facility") || "");
})();

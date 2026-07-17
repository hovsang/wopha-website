// Cancel-link landing page (/amenities/booking-cancel/?id=N&token=T).
// Token-gated lookup, then one-click cancel. All dynamic text uses
// textContent only.
(function () {
  var summary = document.getElementById("cancel-summary");
  var actions = document.getElementById("cancel-actions");
  var errorEl = document.getElementById("cancel-error");
  var done = document.getElementById("cancel-done");
  var btn = document.getElementById("cancel-btn");
  var heading = document.getElementById("cancel-action-heading");
  if (!summary || !btn) return;

  var params = new URLSearchParams(location.search);
  var id = params.get("id") || "";
  var token = params.get("token") || "";

  /* MIRROR of fmtTime in src/assets/js/book.js. Keep in sync. */
  function fmtTime(hhmm) {
    var h = Number(hhmm.slice(0, 2));
    var suffix = h >= 12 ? " p.m." : " a.m.";
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ":" + hhmm.slice(3, 5) + suffix;
  }

  function invalid() {
    summary.textContent = "This cancel link is not valid.";
    errorEl.textContent = "Check the link from your booking confirmation, or reach the board through the contact page.";
    errorEl.hidden = false;
  }

  // Reveal the done state (booking cancelled, or already cancelled),
  // relabel the shared section heading so a heading-navigating screen
  // reader user doesn't hear the stale "Confirm cancellation" text, and
  // move focus to the done message so keyboard/screen reader users land
  // on the outcome instead of a disabled button.
  function showDone(headingText) {
    heading.textContent = headingText;
    done.hidden = false;
    done.focus();
  }

  fetch("/api/bookings/cancel?id=" + encodeURIComponent(id) + "&token=" + encodeURIComponent(token))
    .then(function (r) {
      if (!r.ok) throw new Error("bad status");
      return r.json();
    }).then(function (b) {
      if (b.status === "cancelled") {
        summary.textContent = b.label + " on " + b.date + " is already cancelled.";
        showDone("Booking already cancelled");
        return;
      }
      summary.textContent = "Your booking: " + b.label + " on " + b.date + ", " +
        fmtTime(b.start) + " to " + fmtTime(b.end) + ".";
      actions.hidden = false;
    }).catch(invalid);

  btn.addEventListener("click", function () {
    btn.disabled = true;
    errorEl.hidden = true;
    fetch("/api/bookings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(id), token: token }),
    }).then(function (r) {
      if (!r.ok) throw new Error("bad status");
      actions.hidden = true;
      summary.textContent = "Your booking is cancelled.";
      showDone("Booking cancelled");
    }).catch(function () {
      btn.disabled = false;
      errorEl.textContent = "Could not cancel right now. Try again in a minute.";
      errorEl.hidden = false;
    });
  });
})();

// Stickshot site: the top bar's edge once the page scrolls, and WHAT'S NEW from the latest GitHub release notes.
(function () {
  var bar = document.getElementById("topbar");
  if (bar) {
    var onScroll = function () { bar.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var list = document.getElementById("news-list");
  if (!list) return;
  var esc = function (s) {
    return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  };
  fetch("https://api.github.com/repos/JudeCJz/stickshot-releases/releases/latest")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (rel) {
      var lines = String(rel.body || "").split(/\r?\n/)
        .map(function (l) { return l.trim(); })
        .filter(function (l) { return /^[-*] /.test(l) && !/never released/i.test(l); })
        .map(function (l) { return l.slice(2); });
      if (!lines.length) return;
      list.innerHTML = lines.slice(0, 9).map(function (l) {
        var t = esc(l).replace(/^(NEW|Fixed):/, "<b>$1:</b>");
        return "<li>" + t + "</li>";
      }).join("");
    })
    .catch(function () {});
})();

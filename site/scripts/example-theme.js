(function () {
  var KEY = "pico-reforged-site";
  var stems = ["pico.classless", "pico"];
  function read() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "null");
    } catch (e) {
      return null;
    }
  }
  function restore(original) {
    return function () {
      this.onerror = null;
      this.setAttribute("href", original);
    };
  }
  function apply(state) {
    var theme = state && state.theme && state.theme !== "azure" ? "." + state.theme : "";
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      if (href.indexOf("/css/") !== 0 || !/\.min\.css$/.test(href)) continue;
      var name = href.slice(5, -8);
      for (var j = 0; j < stems.length; j++) {
        var stem = stems[j];
        if (name === stem || name.indexOf(stem + ".") === 0) {
          var rest = name.slice(stem.length + 1);
          if (stem === "pico" && (rest === "colors" || rest === "extras" || rest.indexOf("classless") === 0)) break;
          // An unknown theme has no stylesheet, so fall back to the page's own one
          links[i].onerror = restore(href);
          links[i].setAttribute("href", "/css/" + stem + theme + ".min.css");
          break;
        }
      }
    }
    var root = document.documentElement;
    if (state && (state.scheme === "light" || state.scheme === "dark")) root.setAttribute("data-theme", state.scheme);
    else root.removeAttribute("data-theme");
  }
  apply(read());
  window.addEventListener("storage", function () {
    apply(read());
  });
})();

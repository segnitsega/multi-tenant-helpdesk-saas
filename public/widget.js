(function () {
  "use strict";

  var script =
    document.currentScript ||
    document.querySelector("script[data-key][src*='widget.js']");
  if (!script) return;

  var key = script.getAttribute("data-key");
  if (!key) return;

  var src = script.getAttribute("src") || "";
  var base = src.replace(/\/widget\.js(?:\?.*)?$/, "");
  if (!base) {
    base = window.location.origin;
  }

  var open = false;
  var color = "#2563eb";

  var launcher = document.createElement("button");
  launcher.type = "button";
  launcher.setAttribute("aria-label", "Open chat");
  launcher.style.cssText =
    "position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:999px;border:0;cursor:pointer;z-index:2147483000;box-shadow:0 8px 24px rgba(0,0,0,.18);color:#fff;font:600 22px/1 system-ui,sans-serif;";
  launcher.style.background = color;
  launcher.textContent = "💬";

  var frameWrap = document.createElement("div");
  frameWrap.style.cssText =
    "position:fixed;right:20px;bottom:88px;width:360px;height:560px;max-width:calc(100vw - 24px);max-height:calc(100vh - 110px);display:none;z-index:2147483000;border-radius:16px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.22);background:#fff;";

  var iframe = document.createElement("iframe");
  iframe.title = "Support chat";
  iframe.src = base + "/widget/" + encodeURIComponent(key);
  iframe.style.cssText = "width:100%;height:100%;border:0;display:block;";
  iframe.allow = "clipboard-write";
  frameWrap.appendChild(iframe);

  function setOpen(next) {
    open = next;
    frameWrap.style.display = open ? "block" : "none";
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    launcher.textContent = open ? "×" : "💬";
  }

  launcher.addEventListener("click", function () {
    setOpen(!open);
  });

  window.addEventListener("message", function (event) {
    if (!event.data || event.data.source !== "relay-widget") return;
    if (event.data.type === "relay-widget:close") setOpen(false);
    if (event.data.type === "relay-widget:theme" && event.data.color) {
      color = event.data.color;
      launcher.style.background = color;
    }
    if (event.data.type === "relay-widget:resize" && event.data.height) {
      frameWrap.style.height = Math.min(560, Number(event.data.height)) + "px";
    }
  });

  document.body.appendChild(frameWrap);
  document.body.appendChild(launcher);
})();

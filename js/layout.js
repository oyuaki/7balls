// 縦画面では「盤面以外が使う高さ」を実測し、盤面を入るかぎり大きく保つ。
(function initializeLayout() {
  const app = document.querySelector(".app");
  const frame = document.querySelector(".board-wrap");
  const sidebar = document.querySelector(".sidebar");

  if (!app || !frame || !sidebar) {
    return;
  }

  const STACK_VARIABLE = "--stack-height";
  let lastValue = null;

  function isSyncEnabled() {
    return getComputedStyle(app).getPropertyValue("--stack-sync").trim() === "1";
  }

  function sync() {
    if (!isSyncEnabled()) {
      return;
    }

    // 盤面は常に「app の高さ - 盤面の高さ」だけ余白を必要とするので、
    // 現在の設定値に関係なく一度の計測で確定できる。
    const extra = Math.ceil(
      app.getBoundingClientRect().height - frame.getBoundingClientRect().height
    );

    if (extra <= 0 || Math.abs(extra - lastValue) < 1) {
      return;
    }

    lastValue = extra;
    app.style.setProperty(STACK_VARIABLE, `${extra}px`);
  }

  const schedule = () => requestAnimationFrame(sync);

  schedule();
  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", schedule);

  if (window.ResizeObserver) {
    new ResizeObserver(schedule).observe(sidebar);
  }

  document.fonts?.ready.then(schedule);
})();

(() => {
  const $ = (id) => document.getElementById(id);
  const key = "cubeTimer.studio.appearance.v1";
  const DARK_THEMES = new Set(["obsidian", "carbon", "midnight"]);
  const themeColors = {
    obsidian: "#0b0e14",
    carbon: "#0c0d0e",
    midnight: "#090b16",
    mist: "#edf1f7",
    sand: "#f6f1e8",
    forest: "#ebf3ee",
  };
  let settings = {
    theme: "mist",
    lastDark: "obsidian",
    lastLight: "mist",
    wallpaper: "",
    shade: 35,
  };
  try {
    Object.assign(settings, JSON.parse(localStorage.getItem(key)) || {});
  } catch {}
  if (!themeColors[settings.theme]) settings.theme = "mist";

  function apply() {
    const isDark = DARK_THEMES.has(settings.theme);
    document.body.dataset.theme = settings.theme;
    document.body.dataset.mode = isDark ? "dark" : "light";
    if (isDark) settings.lastDark = settings.theme;
    else settings.lastLight = settings.theme;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = themeColors[settings.theme] || themeColors.mist;

    document.body.classList.toggle("has-wallpaper", !!settings.wallpaper);
    document.body.style.setProperty(
      "--wallpaper",
      settings.wallpaper ? `url("${settings.wallpaper}")` : "none",
    );
    document.body.style.setProperty("--wallpaper-shade", settings.shade / 100);

    const shadeSlider = $("wallpaperShade");
    if (shadeSlider) {
      shadeSlider.value = settings.shade;
      shadeSlider.style.setProperty(
        "--slider-pct",
        `${(settings.shade / 80) * 100}%`,
      );
    }
    if ($("shadeValue")) $("shadeValue").value = `${settings.shade}%`;

    const modeBtn = $("themeModeBtn");
    if (modeBtn) {
      const label = isDark ? "切换到浅色工作台" : "切换到深色工作室";
      modeBtn.title = label;
      modeBtn.setAttribute("aria-label", label);
    }

    document.querySelectorAll("[data-theme]").forEach((btn) => {
      if (btn.tagName === "BUTTON")
        btn.setAttribute(
          "aria-pressed",
          String(btn.dataset.theme === settings.theme),
        );
    });
  }

  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(settings));
      $("appearanceMessage").textContent = "已保存到本机";
      return true;
    } catch {
      $("appearanceMessage").textContent = "存储空间不足，当前设置仅本次生效。";
      return false;
    }
  }

  const modeBtn = $("themeModeBtn");
  if (modeBtn) {
    modeBtn.addEventListener("click", () => {
      const isDark = DARK_THEMES.has(settings.theme);
      settings.theme = isDark
        ? settings.lastLight || "mist"
        : settings.lastDark || "obsidian";
      apply();
      save();
      modeBtn.blur();
    });
  }

  $("appearanceBtn").addEventListener("click", () =>
    $("appearanceDialog").showModal(),
  );
  $("closeAppearanceBtn").addEventListener("click", () =>
    $("appearanceDialog").close(),
  );
  $("appearanceDialog").addEventListener("click", (e) => {
    if (e.target === $("appearanceDialog")) {
      const r = e.target.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        e.target.close();
    }
  });
  document.querySelectorAll("button[data-theme]").forEach((btn) =>
    btn.addEventListener("click", () => {
      settings.theme = btn.dataset.theme;
      settings.wallpaper = "";
      apply();
      save();
    }),
  );
  $("wallpaperShade").addEventListener("input", () => {
    settings.shade = Number($("wallpaperShade").value);
    apply();
  });
  $("wallpaperShade").addEventListener("change", save);
  $("removeWallpaperBtn").addEventListener("click", () => {
    settings.wallpaper = "";
    apply();
    save();
  });
  $("wallpaperInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 15 * 1024 * 1024
    ) {
      $("appearanceMessage").textContent =
        "请选择 15 MB 以内的 JPG、PNG 或 WebP 图片。";
      e.target.value = "";
      return;
    }
    $("appearanceMessage").textContent = "正在处理图片…";
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas
        .getContext("2d")
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      settings.wallpaper = canvas.toDataURL("image/jpeg", 0.85);
      apply();
      save();
    } catch {
      $("appearanceMessage").textContent = "图片读取失败，请换一张图片。";
    }
    e.target.value = "";
  });

  apply();
})();

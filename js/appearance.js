(() => {
  const $ = (id) => document.getElementById(id);
  const key = "cubeTimer.appearance.v1";
  let settings = { theme: "mist", wallpaper: "", shade: 35 };
  try {
    Object.assign(settings, JSON.parse(localStorage.getItem(key)) || {});
  } catch {}
  function apply() {
    document.body.dataset.theme = settings.theme;
    document.body.classList.toggle("has-wallpaper", !!settings.wallpaper);
    document.body.style.setProperty(
      "--wallpaper",
      settings.wallpaper ? `url("${settings.wallpaper}")` : "none",
    );
    document.body.style.setProperty("--wallpaper-shade", settings.shade / 100);
    $("wallpaperShade").value = settings.shade;
    $("shadeValue").value = `${settings.shade}%`;
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

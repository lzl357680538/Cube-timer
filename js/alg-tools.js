import { invertAlgorithm, parseMoves } from "./moves.js";

const $ = (id) => document.getElementById(id);
const drawer = $("algorithmTools");
const input = $("inverseInput");
const output = $("inverseOutput");
const status = $("inverseStatus");
const trigger = $("openAlgToolsBtn");

trigger.addEventListener("click", () => {
  drawer.showModal();
  trigger.setAttribute("aria-expanded", "true");
});
$("closeAlgToolsBtn").addEventListener("click", () => drawer.close());
drawer.addEventListener("close", () =>
  trigger.setAttribute("aria-expanded", "false"),
);
drawer.addEventListener("click", (event) => {
  if (event.target !== drawer) return;
  const rect = drawer.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    drawer.close();
});

function updateInverse() {
  try {
    output.value = invertAlgorithm(input.value);
    $("copyInverseBtn").disabled = !output.value;
    status.dataset.error = "false";
    status.textContent = output.value
      ? `${parseMoves(input.value).length} 步 · 已自动生成逆公式`
      : "支持宽转、转体、中层与紧凑写法，最多 500 步。";
  } catch (error) {
    output.value = "";
    $("copyInverseBtn").disabled = true;
    status.dataset.error = "true";
    status.textContent = error.message;
  }
}
input.addEventListener("input", updateInverse);
$("clearInverseBtn").addEventListener("click", () => {
  input.value = "";
  updateInverse();
  input.focus();
});
$("copyInverseBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(output.value);
    status.textContent = "逆公式已复制。";
  } catch {
    output.focus();
    output.select();
    status.textContent = "无法访问剪贴板，已选中逆公式，请手动复制。";
  }
});

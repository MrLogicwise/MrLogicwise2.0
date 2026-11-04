const NUM = "917599469752";
document.getElementById("yr").textContent = new Date().getFullYear();
document.getElementById("waForm").addEventListener("submit", e => {
  e.preventDefault();
  const t = document.getElementById("waText").value.trim();
  if (!t) return;
  const out = document.getElementById("outMsg");
  out.textContent = t; out.hidden = false;
  setTimeout(() => window.open("https://wa.me/" + NUM + "?text=" + encodeURIComponent(t), "_blank", "noopener"), 500);
});

"use strict";
const C = window.ALMA_CONFIG || {};
document.querySelectorAll("[data-cfg]").forEach((el) => { el.textContent = C[el.dataset.cfg] || ""; });
document.querySelectorAll("[data-if]").forEach((el) => { if (!C[el.dataset.if]) el.hidden = true; });
const w = document.getElementById("todo");
if (w && C.OWNER_NAME && C.OWNER_EMAIL) w.hidden = true;

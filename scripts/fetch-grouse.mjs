// TO RUN - node scripts/fetch-grouse.mjs
// TO SERVER - python -m http.server

import fs from "node:fs/promises";
import * as cheerio from "cheerio";

console.log("Grouse script is running ✅");

const URL = "https://www.grousemountain.com/current_conditions";

function normalizeStatusFromClass(cls = "") {
  const v = String(cls).toLowerCase();

  // Grouse uses these for sure:
  if (v.includes("open")) return "open";
  if (v.includes("closed")) return "closed";

  // Sometimes websites add states like "on-hold", "scheduled", etc
  if (v.includes("hold")) return "on-hold";
  if (v.includes("scheduled")) return "scheduled";

  return "unknown";
}

function cleanText(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function parseTable($, tabId) {
  const out = {};
  const $tab = $(`div.tab#${tabId}`);

  // Each row is an <li>
  $tab.find("ul.data-table > li").each((_, li) => {
    const $li = $(li);

    // First <span> contains the name (but runs include a little colored <span> inside)
    const name = cleanText($li.children("span").first().text());

    // Last <span> contains status text and has class open/closed/etc.
    const $status = $li.children("span").last();
    const statusClass = $status.attr("class") || "";
    const status = normalizeStatusFromClass(statusClass);

    if (name) out[name] = status;
  });

  return out;
}

const res = await fetch(URL, {
  headers: { "user-agent": "Mozilla/5.0", "accept": "text/html" }
});
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const html = await res.text();

const $ = cheerio.load(html);

// Parse
const lifts = parseTable($, "lifts");
const runs = parseTable($, "runs");

// Time: Grouse has a "Report" time in the weather section (like “2:00 PM”)
// This is optional, but we can grab it:
const reportTime = cleanText($(".current_status .time").first().text()); // e.g. "Report" span contains text; may need adjustment
const reportTimeLabel = cleanText($(".current_status p").eq(1).text());  // sometimes includes time + "Report"

const out = {
  fetched_at: new Date().toISOString(),
  source: URL,
  report_time_text: reportTimeLabel || reportTime || null,
  lifts,
  trails: runs // keep same shape as your Cypress code uses (trails)
};

await fs.writeFile("status.json", JSON.stringify(out, null, 2));
console.log("Wrote status.json");

// TO RUN - node scripts/fetch-grouse.mjs
// TO SERVER - python -m http.server

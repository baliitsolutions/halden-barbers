/* ==========================================================
   Halden Barbers — main.js
   No dependencies. Edit the settings below for your shop.
   ========================================================== */

// ---------- SETTINGS ----------
const CURRENCY = "$";

// Services: group (heading on the price list), name, length in minutes, price, short description.
const SERVICES = [
  { group: "Cuts", name: "Classic cut", mins: 30, price: 35, desc: "Scissor or clipper cut, wash and style." },
  { group: "Cuts", name: "Skin fade", mins: 45, price: 40, desc: "Fade down to the skin, blended by hand." },
  { group: "Cuts", name: "Buzz cut", mins: 15, price: 22, desc: "One length all over, lined up." },
  { group: "Cuts", name: "Kids' cut (under 12)", mins: 30, price: 25, desc: "Any style. Weekdays before 3pm: $20." },
  { group: "Beard & shave", name: "Beard trim", mins: 15, price: 20, desc: "Shaped, lined and oiled." },
  { group: "Beard & shave", name: "Hot-towel shave", mins: 45, price: 45, desc: "Straight razor, two hot towels, cold finish." },
  { group: "Beard & shave", name: "Cut & beard", mins: 60, price: 52, desc: "Any cut plus a full beard trim." },
  { group: "Extras", name: "Hair & scalp wash", mins: 15, price: 10, desc: "Add to any service." }
];

// Barbers: days they work (0 = Sunday ... 6 = Saturday).
// Add photo: "assets/img/leo.jpg" to show a photo instead of initials.
const BARBERS = [
  { name: "Leo Hart", initials: "LH", role: "Owner · classic cuts & shaves", days: [2, 3, 4, 5, 6] },
  { name: "Marcus Reid", initials: "MR", role: "Fades, curls & textured hair", days: [1, 2, 4, 5, 6] },
  { name: "Tomás Vega", initials: "TV", role: "Beards & scissor work", days: [1, 3, 5, 6, 0] }
];

// Shop opening hours. null = closed. 24h "HH:MM".
const OPENING_HOURS = {
  1: ["10:00", "19:00"], // Monday
  2: ["09:00", "19:00"], // Tuesday
  3: ["09:00", "19:00"], // Wednesday
  4: ["09:00", "20:00"], // Thursday
  5: ["09:00", "20:00"], // Friday
  6: ["08:00", "17:00"], // Saturday
  0: ["10:00", "15:00"]  // Sunday
};

const SLOT_STEP = 15;        // minutes between start times
const DAYS_AHEAD = 14;       // how far ahead people can book
const DEMO_BUSY = true;      // show some slots as already booked (turn off when connected to a real calendar)

// Optional: send confirmed bookings to a form service (e.g. "https://formspree.io/f/your-id").
const FORM_ENDPOINT = "";
// ------------------------------

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const clock = (m) => { const h = Math.floor(m / 60), mm = m % 60, s = h >= 12 ? "pm" : "am", h12 = ((h + 11) % 12) + 1; return mm ? `${h12}:${String(mm).padStart(2, "0")}${s}` : `${h12}${s}`; };
const pretty = (t) => clock(toMin(t));
const money = (n) => `${CURRENCY}${n}`;
const now = new Date();
const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const nowMin = now.getHours() * 60 + now.getMinutes();
const dateAt = (offset) => { const d = new Date(today0); d.setDate(d.getDate() + offset); return d; };
const key = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/* ---------- Availability ---------- */
const extraBooked = new Set(); // bookings made on this page (demo)
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
function isTaken(bi, d, m) {
  const block = m - (m % 30);
  if (extraBooked.has(`${bi}|${key(d)}|${m}`)) return true;
  return DEMO_BUSY && hash(`${bi}|${key(d)}|${block}`) < 0.38;
}
function slotsFor(bi, d, mins) {
  const hours = OPENING_HOURS[d.getDay()];
  if (!hours || !BARBERS[bi].days.includes(d.getDay())) return [];
  const isToday = key(d) === key(today0);
  const out = [];
  for (let m = toMin(hours[0]); m + mins <= toMin(hours[1]); m += SLOT_STEP) {
    if (isToday && m < nowMin + 30) continue;
    let free = true;
    for (let x = m; x < m + mins; x += SLOT_STEP) if (isTaken(bi, d, x)) { free = false; break; }
    if (free) out.push(m);
  }
  return out;
}
// For "first available": every start time any barber can take, with the barber who'd take it
function slotsAny(d, mins) {
  const map = new Map();
  BARBERS.forEach((_, bi) => slotsFor(bi, d, mins).forEach((m) => { if (!map.has(m)) map.set(m, bi); }));
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

/* ---------- Mobile navigation ---------- */
const toggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("site-nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    nav.classList.toggle("open", !open);
  });
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) { toggle.setAttribute("aria-expanded", "false"); nav.classList.remove("open"); }
  });
}

/* ---------- Next free chair (hero) ---------- */
function renderNextFree() {
  const el = document.querySelector("[data-next-free]");
  if (!el) return;
  const classic = SERVICES[0];
  for (let i = 0; i < 7; i++) {
    const d = dateAt(i);
    const any = slotsAny(d, classic.mins);
    if (any.length) {
      const [m, bi] = any[0];
      const when = i === 0 ? "today" : i === 1 ? "tomorrow" : DAY_LONG[d.getDay()];
      el.textContent = `Next free chair: ${when} at ${clock(m)} with ${BARBERS[bi].name.split(" ")[0]}`;
      return;
    }
  }
  el.textContent = "";
}

/* ---------- Price board ---------- */
const board = document.querySelector("[data-price-board]");
if (board) {
  const groups = [...new Set(SERVICES.map((s) => s.group))];
  board.innerHTML = groups.map((g) => `
    <div class="price-group"><h3>${g}</h3><ul>
      ${SERVICES.filter((s) => s.group === g).map((s) => `
        <li><span class="p-name">${s.name}</span><span class="p-price">${money(s.price)}</span>
        <span class="p-desc">${s.desc} <span>· ${s.mins} min</span></span></li>`).join("")}
    </ul></div>`).join("");
}

/* ---------- Barber cards ---------- */
const cards = document.querySelector("[data-barber-cards]");
if (cards) {
  const dayList = (days) => WEEK_ORDER.filter((d) => days.includes(d)).map((d) => DAY[d]).join(", ");
  cards.innerHTML = BARBERS.map((b) => `
    <figure class="barber">
      <div class="portrait" data-initials="${b.initials}" role="img" aria-label="Photo of ${b.name}" ${b.photo ? `style="background-image:url('${b.photo}')"` : ""}></div>
      <figcaption><h3>${b.name}</h3><p>${b.role}</p><p class="days-in">In the shop: ${dayList(b.days)}</p></figcaption>
    </figure>`).join("");
}

/* ---------- Opening hours table ---------- */
const tbody = document.querySelector("[data-hours-table] tbody");
if (tbody) {
  WEEK_ORDER.forEach((d) => {
    const h = OPENING_HOURS[d];
    const tr = document.createElement("tr");
    if (d === now.getDay()) tr.className = "today";
    tr.innerHTML = `<th scope="row">${DAY_LONG[d]}</th><td>${h ? `${pretty(h[0])} – ${pretty(h[1])}` : "Closed"}</td>`;
    tbody.appendChild(tr);
  });
}

/* ---------- Booking flow ---------- */
const booking = document.querySelector("[data-booking]");
if (booking) {
  const $ = (s) => booking.querySelector(s);
  const state = { step: 1, service: null, barber: null, dayOffset: null, time: null, timeBarber: null };

  // Step 1: services
  $("[data-services]").innerHTML = SERVICES.map((s, i) => `
    <label class="opt"><input type="radio" name="service" value="${i}"><span><b>${s.name}</b><i>${money(s.price)}</i><small>${s.mins} min</small></span></label>`).join("");
  // Step 2: barbers (+ first available)
  $("[data-barbers]").innerHTML = `<label class="opt"><input type="radio" name="barber" value="any"><span><b>First available</b><small>Whoever is free soonest</small></span></label>` +
    BARBERS.map((b, i) => `<label class="opt"><input type="radio" name="barber" value="${i}"><span><b>${b.name}</b><small>${b.role}</small></span></label>`).join("");

  const service = () => SERVICES[state.service];
  const slotsForDay = (offset) => {
    const d = dateAt(offset), mins = service().mins;
    return state.barber === "any" ? slotsAny(d, mins) : slotsFor(Number(state.barber), d, mins).map((m) => [m, Number(state.barber)]);
  };

  function go(step) {
    state.step = step;
    booking.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = Number(p.dataset.panel) !== step));
    booking.querySelectorAll("[data-step-label]").forEach((li) => {
      const n = Number(li.dataset.stepLabel);
      li.classList.toggle("is-current", n === step);
      li.classList.toggle("is-done", n < step);
    });
    $("[data-back]").hidden = step === 1 || step === 5;
    if (step === 3) renderDays();
    summary();
  }

  function summary() {
    const s = state.service != null ? service() : null;
    $('[data-sum="service"]').textContent = s ? s.name : "—";
    const bName = state.timeBarber != null ? BARBERS[state.timeBarber].name : state.barber === "any" ? "First available" : state.barber != null ? BARBERS[state.barber].name : "—";
    $('[data-sum="barber"]').textContent = bName;
    const d = state.dayOffset != null ? dateAt(state.dayOffset) : null;
    $('[data-sum="when"]').textContent = d && state.time != null ? `${DAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}, ${clock(state.time)}` : "—";
    $('[data-sum="length"]').textContent = s ? `${s.mins} min` : "—";
    $('[data-sum="total"]').textContent = s ? money(s.price) : "—";
  }

  function renderDays() {
    const wrap = $("[data-days]");
    wrap.innerHTML = "";
    let firstOpen = null;
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const d = dateAt(i), count = slotsForDay(i).length;
      if (count && firstOpen === null) firstOpen = i;
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "radio");
      b.disabled = !count;
      b.innerHTML = `${i === 0 ? "Today" : DAY[d.getDay()]}<span>${d.getDate()}</span>`;
      b.setAttribute("aria-label", `${DAY_LONG[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}${count ? "" : ", no times available"}`);
      b.addEventListener("click", () => { state.dayOffset = i; state.time = null; state.timeBarber = null; renderDays(); });
      wrap.appendChild(b);
    }
    if (state.dayOffset == null || !slotsForDay(state.dayOffset).length) state.dayOffset = firstOpen;
    [...wrap.children].forEach((b, i) => b.setAttribute("aria-checked", String(i === state.dayOffset)));
    renderSlots();
  }

  function renderSlots() {
    const wrap = $("[data-slots]"), empty = $("[data-slots-empty]");
    wrap.innerHTML = "";
    if (state.dayOffset == null) { empty.hidden = false; empty.textContent = `No free times in the next ${DAYS_AHEAD} days. Try "First available" or call us.`; return; }
    empty.hidden = true;
    slotsForDay(state.dayOffset).forEach(([m, bi]) => {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(state.time === m));
      b.textContent = clock(m);
      b.addEventListener("click", () => { state.time = m; state.timeBarber = bi; summary(); go(4); $("#b-name").focus(); });
      wrap.appendChild(b);
    });
    summary();
  }

  booking.addEventListener("change", (e) => {
    if (e.target.name === "service") { state.service = Number(e.target.value); state.time = null; state.timeBarber = null; go(2); }
    if (e.target.name === "barber") { state.barber = e.target.value === "any" ? "any" : Number(e.target.value); state.dayOffset = null; state.time = null; state.timeBarber = null; go(3); }
  });
  $("[data-back]").addEventListener("click", () => {
    if (state.step === 4) { state.time = null; state.timeBarber = null; }
    go(state.step - 1);
  });

  // Step 4: details + confirm
  const form = $("[data-book-form]");
  const rules = { name: (v) => v.trim().length >= 2, phone: (v) => v.replace(/\D/g, "").length >= 7 };
  const check = (n) => { const el = form.elements[n], ok = rules[n](el.value); el.closest(".field").classList.toggle("invalid", !ok); el.setAttribute("aria-invalid", String(!ok)); return ok; };
  ["name", "phone"].forEach((n) => form.elements[n].addEventListener("input", () => {
    if (form.elements[n].closest(".field").classList.contains("invalid")) check(n);
  }));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const bad = ["name", "phone"].map((n) => [n, check(n)]).find(([, ok]) => !ok);
    if (bad) { form.elements[bad[0]].focus(); return; }
    const d = dateAt(state.dayOffset), s = service(), b = BARBERS[state.timeBarber];
    const when = `${DAY_LONG[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]} at ${clock(state.time)}`;
    if (FORM_ENDPOINT) {
      try {
        const data = new FormData();
        data.append("Service", `${s.name} (${s.mins} min, ${money(s.price)})`);
        data.append("Barber", b.name); data.append("When", when);
        data.append("Name", form.elements.name.value.trim()); data.append("Phone", form.elements.phone.value.trim());
        data.append("Reminder", form.elements.remind.checked ? "Yes" : "No");
        await fetch(FORM_ENDPOINT, { method: "POST", body: data, headers: { Accept: "application/json" } });
      } catch (err) { /* still show confirmation; the shop can follow up by phone */ }
    }
    for (let x = state.time; x < state.time + s.mins; x += SLOT_STEP) extraBooked.add(`${state.timeBarber}|${key(d)}|${x}`);
    $("[data-done-text]").textContent = `${s.name} with ${b.name}, ${when}. We'll text ${form.elements.phone.value.trim()} to confirm.`;
    go(5);
    $('[data-panel="5"]').focus();
    renderNextFree();
  });
  $("[data-restart]").addEventListener("click", () => {
    booking.querySelectorAll("input[type=radio]").forEach((r) => (r.checked = false));
    form.reset();
    Object.assign(state, { service: null, barber: null, dayOffset: null, time: null, timeBarber: null });
    go(1);
  });

  go(1);
}

renderNextFree();

/* ---------- Footer year ---------- */
document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = now.getFullYear()));

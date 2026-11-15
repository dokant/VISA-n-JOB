/* VISANJOB — app.js */
(() => {
  const D = window.VJ;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = (n) => n.toLocaleString("ko-KR");

  /* ---------------- NAV ---------------- */
  const nav = $("#nav");
  const onScroll = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* language menu */
  const lang = $("#lang");
  const langMenu = $("#langMenu");
  const langBtn = $("#langBtn");
  const langCur = $("#langCur");
  langMenu.innerHTML = D.langs
    .map(
      (l, i) =>
        `<button class="lang__item" role="menuitemradio" aria-checked="${i === 0}" data-code="${l.tag}">
          <span>${l.native}</span><code>${l.tag}</code>
        </button>`
    )
    .join("");
  langBtn.addEventListener("click", () => {
    const open = lang.classList.toggle("is-open");
    langBtn.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => {
    if (!lang.contains(e.target)) {
      lang.classList.remove("is-open");
      langBtn.setAttribute("aria-expanded", "false");
    }
  });
  langMenu.addEventListener("click", (e) => {
    const b = e.target.closest(".lang__item");
    if (!b) return;
    $$(".lang__item", langMenu).forEach((x) => x.setAttribute("aria-checked", "false"));
    b.setAttribute("aria-checked", "true");
    langCur.textContent = b.dataset.code;
    lang.classList.remove("is-open");
    langBtn.setAttribute("aria-expanded", "false");
  });

  /* drawer */
  const burger = $("#burger");
  const drawer = $("#drawer");
  const setDrawer = (open) => {
    drawer.classList.toggle("is-open", open);
    nav.classList.toggle("nav__menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    drawer.setAttribute("aria-hidden", String(!open));
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => setDrawer(!drawer.classList.contains("is-open")));
  $$(".drawer__link, .drawer__foot a").forEach((a) => a.addEventListener("click", () => setDrawer(false)));

  /* ---------------- REVEAL (fail-open, no IntersectionObserver) ---------------- */
  const revealEls = $$(".reveal");
  const revealAll = () => {
    revealEls.forEach((el) => el.classList.add("is-in"));
    document.documentElement.classList.remove("js-reveal");
  };

  const checkReveal = () => {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    revealEls.forEach((el) => {
      if (el.classList.contains("is-in")) return;
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.94 && r.bottom > -40) el.classList.add("is-in");
    });
  };

  const watchReveals = () => {
    // Arming happens inline in <head>. Here we evaluate what is in view, retrying a
    // few times because geometry can be unreliable right after parse.
    const attempts = [0, 60, 180, 400, 800];
    attempts.forEach((delay) => {
      setTimeout(() => {
        checkReveal();
        if (revealEls.filter((el) => el.classList.contains("is-in")).length === 0 && delay === 800) {
          revealAll(); // JS alive but could not reveal anything → show everything
        }
      }, delay);
    });
  };

  if (!reduce) {
    let rafR;
    const onScrollReveal = () => {
      cancelAnimationFrame(rafR);
      rafR = requestAnimationFrame(checkReveal);
    };
    window.addEventListener("scroll", onScrollReveal, { passive: true });
    window.addEventListener("resize", onScrollReveal);
    watchReveals();
  } else {
    revealAll();
  }

  /* ---------------- COUNTERS (seeded, fail-open) ---------------- */
  const countEls = $$("[data-count]");
  const seedCounters = () => {
    countEls.forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || "0", 10);
      const suffix = el.dataset.suffix || "";
      el.innerHTML =
        target.toLocaleString("ko-KR", { minimumFractionDigits: dec, maximumFractionDigits: dec }) +
        `<span class="suffix">${suffix}</span>`;
    });
  };
  const runCount = (el) => {
    if (el.dataset.done === "1") return;
    el.dataset.done = "1";
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || "0", 10);
    const suffix = el.dataset.suffix || "";
    const final = target.toLocaleString("ko-KR", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + `<span class="suffix">${suffix}</span>`;
    const dur = 1400;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3.2);
      const v = target * e;
      el.innerHTML =
        v.toLocaleString("ko-KR", { minimumFractionDigits: dec, maximumFractionDigits: dec }) +
        `<span class="suffix">${suffix}</span>`;
      if (p < 1) requestAnimationFrame(tick);
      else el.innerHTML = final;
    };
    el.innerHTML = `0<span class="suffix">${suffix}</span>`;
    requestAnimationFrame(tick);
  };
  const checkCounters = () => {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    countEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) runCount(el);
    });
  };

  // Seed real values immediately: "0" must never be the resting state.
  seedCounters();

  if (!reduce) {
    let rafC;
    window.addEventListener("scroll", () => { cancelAnimationFrame(rafC); rafC = requestAnimationFrame(checkCounters); }, { passive: true });
    window.addEventListener("resize", checkCounters);
    [0, 200, 600, 1200].forEach((d) => setTimeout(checkCounters, d));
  }

  /* ---------------- AUDIENCE SELECTOR ---------------- */
  const audPanel = $("#audPanel");
  const audCards = $$(".acard");
  const audTabs = $$(".aud__tab");

  const renderPanel = (key) => {
    const a = D.audiences[key];
    audPanel.innerHTML = `
      <div class="aud__panel-title">
        <span class="idx">→</span>
        <div>
          <h3>${a.panelTitle}</h3>
          <p>${a.panelDesc}</p>
        </div>
      </div>
      <ul class="aud__list">
        ${a.list.map((t) => `<li><svg width="15" height="15" aria-hidden="true"><use href="#i-check"/></svg><span>${t}</span></li>`).join("")}
      </ul>
      <div class="aud__panel-cta">
        <a class="btn btn--ink btn--block" href="${key === "seeker" ? "#seekers" : key === "partner" ? "#partners" : "#estimator"}" data-magnetic>
          ${a.cta}
          <svg class="icon icon--arrow" width="16" height="16" aria-hidden="true"><use href="#i-arrow"/></svg>
        </a>
        <a class="btn btn--ghost btn--sm" href="#contact" style="justify-content:center">${a.cta2}</a>
      </div>`;
    bindMagnetic();
  };

  const selectAud = (key, scroll = false) => {
    audCards.forEach((c) => {
      const on = c.dataset.aud === key;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-pressed", String(on));
    });
    audTabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.audTab === key)));
    renderPanel(key);
    if (scroll) {
      const y = audPanel.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
    }
  };
  audCards.forEach((c) => {
    c.addEventListener("click", () => selectAud(c.dataset.aud));
    c.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectAud(c.dataset.aud);
      }
    });
  });
  audTabs.forEach((t) => t.addEventListener("click", () => selectAud(t.dataset.audTab)));
  selectAud("employer");

  /* ---------------- FLOW RAIL ---------------- */
  const rail = $("#rail");
  const railFill = $(".rail__track i", rail);
  const steps = $$(".step", rail);
  const isNarrow = () => window.matchMedia("(max-width:1024px)").matches;

  const updateRail = () => {
    if (!rail) return;
    const r = rail.getBoundingClientRect();
    const start = window.innerHeight * 0.82;
    const span = r.height * 0.86;
    let p = (start - r.top) / span;
    p = Math.max(0, Math.min(1, p));
    railFill.style.setProperty("--p", p.toFixed(3));
    const n = Math.ceil(p * steps.length);
    steps.forEach((s, i) => s.classList.toggle("is-on", i < n || p > 0.98));
  };
  if (!reduce) {
    let raf;
    window.addEventListener(
      "scroll",
      () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(updateRail);
      },
      { passive: true }
    );
    window.addEventListener("resize", updateRail);
    updateRail();
  } else {
    steps.forEach((s) => s.classList.add("is-on"));
    railFill.style.setProperty("--p", 1);
  }

  /* ---------------- ESTIMATOR ---------------- */
  const est = {
    industry: $("#estIndustry"),
    count: $("#estCount"),
    countOut: $("#estCountOut"),
    region: $("#estRegion"),
    chips: $$(".chip[data-visa]"),
    weeks: $("#estWeeks"),
    delta: $("#estDelta"),
    fee: $("#estFee"),
    total: $("#estTotal"),
    date: $("#estDate"),
    countLabel: $("#estCountLabel"),
    bars: { visa: $("#barVisa"), match: $("#barMatch"), onb: $("#barOnb") },
    fills: { visa: $("#barVisaFill"), match: $("#barMatchFill"), onb: $("#barOnbFill") },
    base: { "E-9": 1.12, "E-7": 0.74, "H-2": -0.44, "F-2": -0.62 },
    feeFactor: { "E-9": 1, "E-7": 1.42, "H-2": 0.82, "F-2": 1.05 }
  };
  let estVisa = "E-9";

  const calcEst = () => {
    const opt = est.industry.selectedOptions[0];
    const w = parseFloat(opt.dataset.w);
    const t = parseFloat(opt.dataset.t);
    const r = parseFloat(est.region.selectedOptions[0].dataset.r);
    const n = parseInt(est.count.value, 10);
    let weeks = t * r + est.base[estVisa];
    if (n >= 10) weeks -= 0.5;
    if (n >= 25) weeks -= 0.4;
    weeks = Math.max(2.4, weeks);

    const fee = Math.round((760000 * w * est.feeFactor[estVisa]) / 10000) * 10000;
    const total = fee * n;

    const d = new Date(2026, 10, 15);
    d.setDate(d.getDate() + Math.round(weeks * 7));
    const dateStr = `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;

    est.weeks.textContent = weeks.toFixed(1);
    est.delta.textContent = n >= 25 ? "분할 입국" : n >= 10 ? "일정 단축" : "표준 일정";
    est.fee.textContent = "₩ " + fmt(fee);
    est.total.textContent = "₩ " + fmt(total);
    est.date.textContent = dateStr;
    est.countLabel.textContent = n;
    est.countOut.textContent = n + "명";

    const vPct = Math.round(46 + (estVisa === "E-9" ? 6 : estVisa === "E-7" ? 2 : -6));
    const mPct = Math.round(28 - (n >= 10 ? 4 : 0));
    const oPct = 100 - vPct - mPct;
    est.bars.visa.textContent = vPct + "%";
    est.bars.match.textContent = mPct + "%";
    est.bars.onb.textContent = oPct + "%";
    est.fills.visa.style.width = vPct + "%";
    est.fills.match.style.width = mPct + "%";
    est.fills.onb.style.width = oPct + "%";

    const pct = ((n - 1) / 49) * 100;
    est.count.style.setProperty("--fill", pct + "%");
  };

  est.chips.forEach((c) =>
    c.addEventListener("click", () => {
      est.chips.forEach((x) => x.setAttribute("aria-pressed", "false"));
      c.setAttribute("aria-pressed", "true");
      estVisa = c.dataset.visa;
      calcEst();
    })
  );
  [est.industry, est.region].forEach((el) => el.addEventListener("change", calcEst));
  est.count.addEventListener("input", calcEst);
  calcEst();

  /* ---------------- VISA EXPLORER ---------------- */
  const vChips = $("#visaChips");
  const vPanel = $("#visaPanel");
  vChips.innerHTML = D.visas
    .map(
      (v, i) =>
        `<button class="vchip" role="tab" aria-selected="${i === 0}" data-i="${i}">
          <span class="code">${v.code}</span>${v.name}
        </button>`
    )
    .join("");

  const renderVisa = (i) => {
    const v = D.visas[i];
    vPanel.innerHTML = `
      <div class="visa__side">
        <div>
          <div class="visa__code-big">${v.code}</div>
          <div class="visa__name" style="margin-top:14px">${v.name}</div>
          <div class="visa__name-en">${v.en}</div>
        </div>
        <p>${v.desc}</p>
        <div class="visa__facts">
          ${v.facts.map((f) => `<div class="visa__fact"><span>${f[0]}</span><b>${f[1]}</b></div>`).join("")}
        </div>
      </div>
      <div class="visa__main">
        <div class="vgroup">
          <span class="vgroup__label">Eligible industries · 취업 가능 업종</span>
          <div class="cluster" style="gap:6px">
            ${v.industries.map((x) => `<span class="badge badge--outline">${x}</span>`).join("")}
          </div>
        </div>
        <div class="vgroup">
          <span class="vgroup__label">Typical roles · 대표 직무</span>
          <div class="vroles">
            ${v.roles
              .map(
                (r) =>
                  `<div class="vrole"><svg width="15" height="15" aria-hidden="true"><use href="#i-check"/></svg>${r}</div>`
              )
              .join("")}
          </div>
        </div>
        <div class="vgroup">
          <span class="vgroup__label">Hiring notes · 채용 시 유의사항</span>
          <div class="vnotes">
            ${v.notes
              .map(
                (n) =>
                  `<div class="vnote"><span class="mk"><svg width="11" height="11" aria-hidden="true"><use href="#i-check"/></svg></span><p><b>${n[0]}</b> — ${n[1]}</p></div>`
              )
              .join("")}
          </div>
        </div>
        <div class="visa__actions">
          <a class="btn btn--ink" href="#estimator" data-magnetic>
            ${v.code} 인력 요청
            <svg class="icon icon--arrow" width="16" height="16" aria-hidden="true"><use href="#i-arrow"/></svg>
          </a>
          <a class="btn btn--outline" href="#contact">상담 가능 여부 확인</a>
        </div>
      </div>`;
    bindMagnetic();
  };
  vChips.addEventListener("click", (e) => {
    const b = e.target.closest(".vchip");
    if (!b) return;
    $$(".vchip", vChips).forEach((x) => x.setAttribute("aria-selected", "false"));
    b.setAttribute("aria-selected", "true");
    renderVisa(parseInt(b.dataset.i, 10));
  });
  renderVisa(0);

  /* ---------------- MAP ---------------- */
  const PROVINCES = [
    { id: "gyeonggi", name: "경기 · 서울 · 인천", pts: "150,152 238,142 248,196 240,232 200,250 166,238 146,200 142,172" },
    { id: "gangwon", name: "강원", pts: "240,140 330,132 368,168 356,215 318,240 270,228 248,196" },
    { id: "chungbuk", name: "충북", pts: "248,196 270,228 318,240 306,286 268,300 238,272 240,232" },
    { id: "chungnam", name: "충남 · 대전 · 세종", pts: "166,238 200,250 240,232 238,272 222,306 186,310 158,288 150,258" },
    { id: "gyeongbuk", name: "경북 · 대구", pts: "318,240 356,215 382,250 392,320 368,360 330,352 306,300 306,286" },
    { id: "jeonbuk", name: "전북", pts: "222,306 238,272 268,300 266,342 250,372 216,366 200,338" },
    { id: "gyeongnam", name: "경남 · 부산 · 울산", pts: "330,352 368,360 392,320 404,392 392,442 352,458 316,432 306,392 306,360" },
    { id: "jeonnam", name: "전남 · 광주", pts: "186,310 222,306 200,338 216,366 250,372 258,420 232,470 196,478 162,440 150,392 156,344" },
    { id: "jeju", name: "제주", pts: "178,556 218,552 234,570 222,592 188,596 170,578" }
  ];

  const mapRegions = $("#mapRegions");
  const mapLinks = $("#mapLinks");
  const mapTip = $("#mapTip");
  const mapWrap = $("#mapWrap");
  const hub = D.regions.find((r) => r.hub);

  mapRegions.innerHTML =
    PROVINCES.map(
      (p) => `
      <g class="map__region" data-prov="${p.id}" tabindex="0" role="button" aria-label="${p.name} 협력 현황">
        <polygon class="map__land" points="${p.pts}"></polygon>
      </g>`
    ).join("") +
    D.regions
      .map(
        (r) => `
      <g class="map__region ${r.hub ? "is-hub" : ""}" data-region="${r.id}" tabindex="0" role="button" aria-label="${r.name} 협력기관 ${r.partners}곳, 진행 공고 ${r.jobs}건">
        ${r.hub ? `<circle class="map__hub-halo" cx="${r.x}" cy="${r.y}" r="10" fill="rgba(47,107,255,.3)"></circle>` : ""}
        <circle class="map__node" cx="${r.x}" cy="${r.y}" r="${r.hub ? 6 : r.partners >= 5 ? 4.4 : 3.2}"
          fill="${r.hub ? "#2F6BFF" : r.partners >= 10 ? "#22D3EE" : "rgba(255,255,255,.55)"}"
          ${r.hub ? 'filter="url(#softGlow)"' : ""}></circle>
        <circle cx="${r.x}" cy="${r.y}" r="12" fill="transparent"></circle>
      </g>`
      )

  // city labels
  const LABELS = [
    ["서울", 205, 176], ["인천", 146, 196], ["강원", 312, 186], ["경기", 214, 216],
    ["충남", 196, 278], ["대전", 234, 300], ["충북", 264, 264], ["경북", 336, 292],
    ["대구", 322, 356], ["전북", 224, 344], ["광주", 186, 418], ["전남", 176, 462],
    ["울산", 382, 404], ["부산", 386, 462], ["경남", 330, 428], ["제주", 200, 610]
  ];
  mapRegions.insertAdjacentHTML(
    "beforeend",
    LABELS.map(([t, x, y]) => `<text class="map__lbl" x="${x}" y="${y}" text-anchor="middle">${t}</text>`).join("")
  );

  // links from hub to each partner node
  mapLinks.innerHTML = D.regions
    .filter((r) => !r.hub)
    .map((r) => {
      const mx = (hub.x + r.x) / 2 + (r.y - hub.y) * 0.09;
      const my = (hub.y + r.y) / 2 - (r.x - hub.x) * 0.09;
      return `<path class="map__link" d="M${hub.x},${hub.y} Q${mx},${my} ${r.x},${r.y}" style="animation-delay:${(Math.random() * 3).toFixed(2)}s"></path>`;
    })
    .join("");

  const showTip = (region, evtEl) => {
    const rect = mapWrap.getBoundingClientRect();
    const svg = $("#krMap").getBoundingClientRect();
    const sx = svg.width / 460;
    const px = (region.x / 460) * svg.width + (svg.left - rect.left);
    const py = (region.y / 640) * svg.height + (svg.top - rect.top);
    mapTip.innerHTML = `
      <div class="maptip__name">${region.name} ${region.hub ? '<span class="badge badge--blue">본사</span>' : ""}</div>
      <div class="maptip__rows">
        <div class="maptip__row"><span>협력기관</span><b>${region.partners}곳</b></div>
        <div class="maptip__row"><span>진행 중 공고</span><b>${region.jobs}건</b></div>
        <div class="maptip__row"><span>평균 매칭</span><b>${(2.8 + (region.id.length % 4) * 0.7).toFixed(1)}주</b></div>
      </div>`;
    mapTip.style.left = Math.max(110, Math.min(rect.width - 20, px)) + "px";
    mapTip.style.top = py + "px";
    mapTip.classList.add("is-on");
  };
  const hideTip = () => mapTip.classList.remove("is-on");

  const regionBlob = (id) => {
    // aggregate partner/job data for a province shape
    const map = {
      gyeonggi: ["seoul", "incheon", "gyeonggi"],
      gangwon: ["gangwon"],
      chungbuk: ["chungbuk"],
      chungnam: ["chungnam", "daejeon"],
      gyeongbuk: ["gyeongbuk", "daegu"],
      jeonbuk: ["jeonbuk"],
      gyeongnam: ["gyeongnam", "busan", "ulsan"],
      jeonnam: ["jeonnam", "gwangju"],
      jeju: ["jeju"]
    };
    const ids = map[id] || [];
    const rs = D.regions.filter((r) => ids.includes(r.id));
    return {
      name: PROVINCES.find((p) => p.id === id).name,
      partners: rs.reduce((a, r) => a + r.partners, 0),
      jobs: rs.reduce((a, r) => a + r.jobs, 0),
      x: rs.reduce((a, r) => a + r.x, 0) / rs.length,
      y: rs.reduce((a, r) => a + r.y, 0) / rs.length,
      hub: false
    };
  };

  $$("#mapRegions .map__region").forEach((g) => {
    const data = g.dataset.region
      ? D.regions.find((r) => r.id === g.dataset.region)
      : regionBlob(g.dataset.prov);
    const enter = () => showTip(data);
    g.addEventListener("mouseenter", enter);
    g.addEventListener("focus", enter);
    g.addEventListener("mouseleave", hideTip);
    g.addEventListener("blur", hideTip);
    g.addEventListener("click", () => {
      showTip(data);
      setTimeout(hideTip, 2600);
    });
  });

  /* ---------------- TALENT ---------------- */
  const talentCard = (c) => `
    <article class="tcard">
      <div class="tcard__top">
        <span class="tcard__av">${c.flag}<i>${c.flag}</i></span>
        <div class="tcard__id">
          <strong>${c.job}</strong>
          <span>${c.country} · ${c.exp} 경력</span>
        </div>
      </div>
      <div class="tcard__rows">
        <div class="tcard__row"><span>비자</span><b>${c.visa}</b></div>
        <div class="tcard__row"><span>한국어</span><b>${c.korean}</b></div>
        <div class="tcard__row"><span>보유 기술</span><b>${c.skills.join(" · ")}</b></div>
      </div>
      <div class="tcard__foot">
        <span class="lvl" aria-label="한국어 능력 ${c.koreanLvl}/5">
          ${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= c.koreanLvl ? "on" : ""}"></i>`).join("")}
        </span>
        <span class="tcard__anon">VERIFIED · ${c.id}</span>
      </div>
    </article>`;

  const row1 = D.candidates.slice(0, 5).map(talentCard).join("");
  const row2 = D.candidates.slice(5).map(talentCard).join("");
  $("#talentRow1").innerHTML = row1 + row1;
  $("#talentRow2").innerHTML = row2 + row2;

  /* ---------------- JOB SEEKERS ---------------- */
  const seekVisas = $("#seekVisas");
  const seekRegion = $("#seekRegion");
  const seekIndustry = $("#seekIndustry");
  const seekJobs = $("#seekJobs");
  const seekCount = $("#seekCount");
  let seekVisa = "E-9";

  const renderJobs = () => {
    const r = seekRegion.value;
    const ind = seekIndustry.value;
    let list = D.jobs.filter(
      (j) => j.visas.includes(seekVisa) && (r === "all" || j.region === r) && (ind === "all" || j.industry === ind)
    );
    if (!list.length) {
      seekJobs.innerHTML = `<p class="t-cap" style="padding:14px 0">선택하신 조건의 공고가 아직 없습니다. 조건을 바꾸시거나 카카오톡으로 문의해 주세요.</p>`;
      seekCount.textContent = "0";
      return;
    }
    list = list.slice(0, 3);
    seekJobs.innerHTML = list
      .map(
        (j) => `
      <a class="jobrow" href="#contact">
        <span class="jobrow__ic"><svg width="16" height="16" aria-hidden="true"><use href="#i-${
          j.industry === "manufacturing" ? "factory" : j.industry === "logistics" ? "doc" : "pin"
        }"/></svg></span>
        <span class="jobrow__t"><strong>${j.t}</strong><span>${j.co} · ${j.note}</span></span>
        <span class="jobrow__pay">${j.pay}</span>
      </a>`
      )
      .join("");
    const total = D.jobs.filter(
      (j) => j.visas.includes(seekVisa) && (r === "all" || j.region === r) && (ind === "all" || j.industry === ind)
    ).length;
    seekCount.textContent = total;
  };

  seekVisas.addEventListener("click", (e) => {
    const b = e.target.closest(".vbox");
    if (!b) return;
    $$(".vbox", seekVisas).forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true");
    seekVisa = b.dataset.v;
    renderJobs();
  });
  seekRegion.addEventListener("change", renderJobs);
  seekIndustry.addEventListener("change", renderJobs);
  renderJobs();

  /* ---------------- CASES / TESTI / INSIGHTS / LOGOS ---------------- */
  $("#caseGrid").innerHTML = D.cases
    .map(
      (c) => `
    <article class="case reveal">
      <div class="case__thumb ${c.warm ? "case__thumb--warm" : ""}">
        <span class="case__kicker"><span class="badge badge--dark">${c.tag}</span></span>
      </div>
      <div class="case__body">
        <h3 class="case__title">${c.title}</h3>
        <div class="case__metrics">
          ${c.metrics
            .map((m, i) => `<div class="case__metric"><b>${m[0]}</b><span>${m[1]}</span></div>`)
            .join("")}
        </div>
      </div>
    </article>`
    )
    .join("");

  $("#testiGrid").innerHTML = D.testimonials
    .map(
      (t) => `
    <button class="vtesti reveal js-open-film" aria-label="${t.name} 인터뷰 영상 재생">
      <span class="vtesti__bg"></span>
      <span class="vtesti__play"><svg width="17" height="17" aria-hidden="true" style="margin-left:2px"><use href="#i-play"/></svg></span>
      <span class="vtesti__meta">
        <span>
          <strong>${t.name}</strong>
          <span>${t.meta}</span>
          <span class="vtesti__quote">“${t.quote}”</span>
        </span>
        <span class="vtesti__time">${t.time}</span>
      </span>
    </button>`
    )
    .join("");

  $("#insightGrid").innerHTML = D.insights
    .map(
      (i) => `
    <article class="icard reveal">
      <div class="icard__top">
        <span class="badge ${i.catClass}">${i.cat}</span>
        <span class="t-cap">${i.date}</span>
      </div>
      <h3>${i.title}</h3>
      <p>${i.desc}</p>
      <div class="icard__foot">
        <span>읽는 시간 ${i.read}</span>
        <span class="rd">읽기 <svg width="13" height="13" aria-hidden="true"><use href="#i-arrow"/></svg></span>
      </div>
    </article>`
    )
    .join("");

  const logoHTML = D.logos
    .map(
      (l) => `<span class="logoitem"><span class="mk ${l.k === "ci" ? "mk--c" : l.k === "di" ? "mk--d" : ""}"></span>${l.n}</span>`
    )
    .join("");
  $("#logoTrack").innerHTML = logoHTML + logoHTML;

  watchReveals();

  /* ---------------- MAGNETIC ---------------- */
  function bindMagnetic() {
    if (reduce) return;
    $$("[data-magnetic]").forEach((el) => {
      if (el.dataset.magBound) return;
      el.dataset.magBound = "1";
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = `translate(${(dx * 7).toFixed(2)}px, ${(dy * 5 - 1).toFixed(2)}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    });
  }
  bindMagnetic();

  /* ---------------- FILM MODAL + PLAYER ---------------- */
  const modal = $("#filmModal");
  const player = $("#player");
  const subs = $("#playerSubs");
  const fill = $("#playerFill");
  const thumb = $("#playerThumb");
  const cur = $("#playerCur");
  const toggle = $("#playerToggle");
  const cc = $("#playerCC");
  const bar = $("#playerBar");
  const dur = D.player.duration;
  let playing = false;
  let t = 0;
  let last = 0;
  let ccOn = true;
  let raf = null;
  let lastFocus = null;

  const timeStr = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const paint = () => {
    const p = t / dur;
    fill.style.transform = `scaleX(${p})`;
    thumb.style.left = p * 100 + "%";
    cur.textContent = timeStr(t);
    bar.setAttribute("aria-valuenow", Math.round(t));
    const cue = [...D.player.cues].reverse().find((c) => t >= c.at);
    subs.textContent = cue ? cue.text : "";
    subs.classList.toggle("is-on", ccOn && !!cue && playing);
  };

  const setPlaying = (on) => {
    playing = on;
    player.classList.toggle("is-playing", on);
    toggle.innerHTML = `<svg width="18" height="18" aria-hidden="true"><use href="#i-${on ? "pause" : "play"}"/></svg>`;
    toggle.setAttribute("aria-label", on ? "일시정지" : "재생");
    if (on) {
      last = performance.now();
      loop();
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    paint();
  };

  const loop = () => {
    const now = performance.now();
    const d = (now - last) / 1000;
    last = now;
    t = Math.min(dur, t + d);
    paint();
    if (t >= dur) {
      setPlaying(false);
      player.classList.remove("is-playing");
      return;
    }
    raf = requestAnimationFrame(loop);
  };

  const openFilm = () => {
    lastFocus = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => $("#bigPlay").focus(), 240);
  };
  const closeFilm = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    setPlaying(false);
    player.classList.remove("is-playing");
    t = 0;
    paint();
    if (lastFocus) lastFocus.focus();
  };

  $$("[data-open-film], .js-open-film").forEach((b) => b.addEventListener("click", openFilm));
  $("#modalClose").addEventListener("click", closeFilm);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeFilm();
  });
  $("#bigPlay").addEventListener("click", () => setPlaying(true));
  player.addEventListener("click", (e) => {
    if (e.target.closest(".player__controls") || e.target.closest("#bigPlay")) return;
    setPlaying(!playing);
  });
  toggle.addEventListener("click", () => setPlaying(!playing));
  cc.addEventListener("click", () => {
    ccOn = !ccOn;
    cc.classList.toggle("is-on", ccOn);
    cc.setAttribute("aria-pressed", String(ccOn));
    paint();
  });
  const seek = (e) => {
    const r = bar.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    t = p * dur;
    paint();
  };
  bar.addEventListener("click", seek);
  bar.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { t = Math.min(dur, t + 5); paint(); }
    if (e.key === "ArrowLeft") { t = Math.max(0, t - 5); paint(); }
  });
  const muteBtn = $("#playerMute2");
  let muted = true;
  muteBtn.addEventListener("click", () => {
    muted = !muted;
    muteBtn.innerHTML = `<svg width="18" height="18" aria-hidden="true"><use href="#i-${muted ? "mute" : "volume"}"/></svg>`;
    muteBtn.setAttribute("aria-label", muted ? "소리 켜기" : "소리 끄기");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (modal.classList.contains("is-open")) closeFilm();
      if (drawer.classList.contains("is-open")) setDrawer(false);
      if (document.getElementById("fabWrap").classList.contains("is-open")) toggleFab(false);
    }
    if (e.code === "Space" && modal.classList.contains("is-open") && document.activeElement !== bar) {
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag !== "INPUT" && tag !== "SELECT" && tag !== "TEXTAREA") {
        e.preventDefault();
        setPlaying(!playing);
      }
    }
  });
  paint();

  /* ---------------- FLOATING CHAT ---------------- */
  const fabWrap = $("#fabWrap");
  const fab = $("#fab");
  const toggleFab = (open) => {
    fabWrap.classList.toggle("is-open", open);
    fab.setAttribute("aria-expanded", String(open));
    fab.setAttribute("aria-label", open ? "상담 채널 닫기" : "상담 채널 열기");
    $("#fabIcon").innerHTML = `<use href="#i-${open ? "close" : "chat"}"/>`;
  };
  fab.addEventListener("click", () => toggleFab(!fabWrap.classList.contains("is-open")));
  document.addEventListener("click", (e) => {
    if (!fabWrap.contains(e.target) && fabWrap.classList.contains("is-open")) toggleFab(false);
  });

  /* ---------------- SMOOTH ANCHORS + NAV STATE ---------------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      const y = el.getBoundingClientRect().top + window.scrollY - (id === "#top" ? 0 : 70);
      window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
      if (drawer.classList.contains("is-open")) setDrawer(false);
    });
  });

  const sections = ["employers", "partners", "seekers", "about", "insights", "contact"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const linkFor = (id) => $(`.nav__link[href="#${id}"]`);

  const syncNav = () => {
    if (!sections.length) return;
    const line = (window.innerHeight || 800) * 0.42;
    let current = sections[0];
    sections.forEach((s) => {
      if (s.getBoundingClientRect().top <= line) current = s;
    });
    if ((window.scrollY || 0) < 80) current = sections[0];
    $$(".nav__link").forEach((l) => l.setAttribute("aria-current", "false"));
    const l = linkFor(current.id);
    if (l) l.setAttribute("aria-current", "true");
  };
  window.addEventListener("scroll", () => requestAnimationFrame(syncNav), { passive: true });
  window.addEventListener("resize", syncNav);
  syncNav();
})();

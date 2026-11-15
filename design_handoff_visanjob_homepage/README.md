# Handoff: VISANJOB Homepage

## Overview

VISANJOB is a licensed private employment agency (유료직업소개소) in Songpa-gu, Seoul, that connects foreign workers with Korean companies. This design is the **public marketing homepage** — a single long-scroll page that serves three distinct audiences from one URL.

The page has to do something unusual: speak to a Korean SME factory owner, a regional agency owner in Jeonju, and a Vietnamese worker holding an E-9 visa — all on the same page, without any of them feeling like they're on someone else's website. The design solves this with an explicit **audience selector** near the top that lets visitors self-identify, then a personalized panel beneath it. Everything below is ordered for employers (the primary B2B audience), with a mobile-first block carved out specifically for job seekers.

Thirteen sections: sticky nav, cinematic hero, audience selector, trust metrics, employer service flow, cost/timeline estimator, visa type explorer, nationwide network map, talent showcase, job-seeker search, case studies + video testimonials, insights, split final CTA, footer.

**Brand promise:** "The most trusted bridge between global talent and Korean industry."

---

## About the Design Files

⚠️ **The files in `reference/` are design references created in HTML.** They are prototypes demonstrating the intended look, layout, and behavior — **not production code to copy directly.**

`reference/index.html` opens in any browser with no build step. It is a complete, working implementation of the design, but it is deliberately self-contained and dependency-free so it could be produced in a design tool. Treat it as a **living specification**: when there's ambiguity about spacing, color, or interaction, read the file and take the exact value.

**Your task is to recreate these designs in the target codebase's existing environment** — using its established component library, styling approach (Tailwind, CSS Modules, styled-components, vanilla CSS), routing, and state management. Do not ship the HTML file as-is, and do not paste its `<script>` block wholesale into a component.

**If no environment exists yet:** the reference is plain HTML/CSS/JS with zero dependencies, so **Astro is the closest structural match** (near 1:1 absorption of the markup, islands for the interactive parts). Next.js is appropriate if the roadmap includes authenticated dashboards, job listings CRUD, or admin tooling. Both are reasonable; pick based on what comes after the homepage.

**Do not rewrite the markup structure while porting.** Multiple sections depend on specific class-based CSS contracts (the `.reveal` transform system, the `.rail__track` scroll-progress variable, the estimator's `--fill` variable). Restructuring divs casually will break them.

---

## Fidelity

**High-fidelity (hifi).** The prototypes use final colors, final typography, final spacing on an 8pt system, and working interactions. Recreate the UI **pixel-perfectly**, substituting the codebase's own primitives (Button, Card, Badge) where they exist — but match the measurements in this document where they don't.

Two exceptions, called out explicitly, are **not** at production fidelity:

1. **The hero "film plate."** The hero currently renders the background video as layered CSS gradients, animated light beams, a rotating conic glow, and a grain overlay. This is a *deliberate placeholder for a real promotional video*. Replace it with an actual `<video>` element (see Assets).
2. **The brand film modal player.** The player is a simulation — it advances a fake timeline with hardcoded subtitle cues and does not play media. Wire it to a real `<video>` or a YouTube/Vimeo embed.

Everything else — type, color, spacing, all fourteen interactive behaviors — is final.

---

## Screens / Views

This is a single-page design with thirteen vertical sections. Measurements below are **desktop at 1440px viewport**. Container is `max-width: 1320px`, centered, with horizontal padding `clamp(20px, 4.4vw, 64px)` (64px at 1440).

---

### 1. Sticky Navigation

**Purpose:** Persistent wayfinding + the primary "Request Talent" conversion action + a 10-language switcher.

**Layout:** Fixed to top, full width. Height **76px** at rest, **compresses to 66px** once scrolled past 24px. Inner row: `max-width 1320px`, centered, flex with `gap: 28px`. Three groups — logo (flex none), nav links (flex: 1, centered), right cluster (flex none, `gap: 14px`).

**Behavior:** Transparent over the hero with white text. On scroll (`scrollY > 24`) it gains `background: rgba(255,255,255,0.82)`, `backdrop-filter: blur(22px) saturate(160%)`, navy text, `border-bottom: 1px solid rgba(11,27,63,0.08)`, and a soft shadow. Transition 0.4s.

**Components:**

- **Logo** — 30×30 mark (SVG arch + three legs + cyan dot; gradient stroke `#2F6BFF → #22D3EE`) plus wordmark "VISANJOB" at 17px/700, `letter-spacing: 0.06em`, with a small "GLOBAL TALENT" label at 11px/500, 0.14em, 55% opacity (hidden below 760px).
- **Nav links** — "For Employers / For Partners / For Job Seekers / About / Insights / Contact". 14.5px/500, `-0.01em`, 82% opacity, 26px gap. Hover: opacity → 1 and a 1.5px underline scaling from the left over 0.4s. Active link (`aria-current="true"`) is 600 weight, 100% opacity, underline shown.
- **Language switcher** — 38px pill, `border: 1px solid rgba(255,255,255,0.22)`, `background: rgba(255,255,255,0.07)`, 13px/600 with 0.04em tracking. Shows globe icon + current code ("KO") + chevron. Opens a 236px dropdown (white, 14px radius, `--shadow-2`) listing 10 languages — 한국어, English, Tiếng Việt, ภาษาไทย, Bahasa Indonesia, Oʻzbekcha, नेपाली, ភាសាខ្មែរ, Монгол, Bahasa Melayu — each row `9px 11px` padding with a 10.5px code at 50% opacity on the right. Selected row: `rgba(47,107,255,0.08)` background, blue text, 600 weight.
- **CTA button** — "인력 요청" (Request Talent), 42px height, pill, gradient `linear-gradient(100deg,#2F6BFF,#22D3EE)`, white 14px/600, `box-shadow: 0 12px 30px -12px rgba(47,107,255,0.7)`, trailing arrow that shifts +3px on hover. Has a magnetic pointer-follow effect (see Interactions).
- **Burger** — hidden above 1024px. 42×42, 3 lines at 1.5px; morphs to an X when open.

**Mobile drawer:** full-screen white overlay, `padding: 100px <gutter> 40px`, slides down 12px with a 0.35s fade. Each link is 22px/600 with a right-aligned 11px English label, 18px vertical padding, 1px `#E5E7EB` dividers. Footer of drawer: full-width primary CTA, phone button, and address/hours caption.

---

### 2. Hero

**Purpose:** Establish credibility in one screen and offer two actions — request talent, or watch the 92-second brand film.

**Layout:** `min-height: 100svh`, flex column, `justify-content: flex-end`, `padding-top: 120px`, `overflow: hidden`. Three stacked layers: the film plate (absolute, z-index −3), corner metadata frame (absolute, z-index 2), the copy block (relative, z-index 3), then a stat strip pinned to the bottom.

**The film plate (placeholder — replace with video):** dark base `#050d24` with four stacked radial gradients — blue at 74%/26% (`rgba(47,107,255,0.5)`), cyan at 18%/66%, orange at 50%/108% (`rgba(255,138,61,0.13)`), over `linear-gradient(168deg, #0a1b3f, #061231 46%, #03081a)`. Plus: a 96px grid masked by a radial ellipse, a 46vw conic-gradient glow blurred 60px rotating over 52s, three blurred light beams drifting on 18–28s loops, an inline-SVG turbulence grain at 14% opacity in `overlay` blend, and a bottom horizon fade to `rgba(3,8,26,0.96)`.

**Corner metadata frame:** 10.5px uppercase, 0.2em tracking, `rgba(255,255,255,0.5)`, with bold values at 0.86 opacity. Top-left: pulsing orange dot + "VISANJOB FILM — 01". Top-right: "SEOUL · SONGPA-GU / 37.5145°N 127.1059°E". A hairline rule separates the copy from a bottom strip reading "16 COUNTRIES · 68 REGIONAL PARTNERS" (left) and "LICENSED AGENCY / 유료직업소개소 제 2026-0000호" (right).

**Copy block** (`max-width: 940px`):

- **Badge** — inline pill, `padding: 7px 14px 7px 8px`, `background: rgba(255,255,255,0.07)`, `border: 1px solid rgba(255,255,255,0.16)`, `backdrop-filter: blur(16px)`. Contains a "2026" chip (`rgba(34,211,238,0.16)` background, `#7ff0ff` text, 10.5px/700) and the text "외국인 고용, 법적 리스크까지 함께 설계합니다" at 12.5px/500. 26px below it.
- **H1** — `clamp(38px, 5.9vw, 80px)`, line-height 1.06, `letter-spacing: -0.042em`, weight 700, white. Two forced lines: "글로벌 인재와 대한민국 산업을" / "잇는 **가장 확실한 다리**". The emphasized phrase is gradient-filled via `background-clip: text` using `linear-gradient(96deg,#7ea6ff,#22d3ee 58%,#a8f0fb)`.
- **Subhead** — 24px below H1, `max-width: 620px`, `clamp(15px,1.3vw,18.5px)`, line-height 1.65, `rgba(255,255,255,0.66)`. Two lines: "Trusted global workforce solutions, from Seoul to every region." then a `<br>`, then "비자 적합성 검토부터 매칭·입국·정착까지, 15년간 16개국 인재와 1,240개 기업을 연결해 왔습니다."
- **Actions** — 36px below, flex, 12px gap. Primary: "인력 요청하기" (60px tall, gradient, magnetic). Secondary: a custom play button — 52px pill, glass background, containing a 36px white disc with a navy play triangle, the label "브랜드 필름 보기", and a monospace "1:32" at 45% opacity.
- **Scroll cue** — centered at `bottom: 128px`, 10px/0.2em uppercase "SCROLL" over a 46px vertical hairline with a cyan highlight traveling downward on a 2.4s loop. Hidden below 760px.

**Stat strip:** 4 equal columns separated by 1px `rgba(255,255,255,0.1)` rules, each cell `18px 22px` padding. Label at 10.5px/0.16em uppercase `rgba(255,255,255,0.42)` over a 14px/500 value at 0.9 opacity, with a 11.5px sub-note at 0.42. Values: "Since / 2011 / 송파 본사 설립" · "Talent pool / 12,400명 / 비자별 검증 인재" · "Avg. matching / 5.8주 / 상담 → 입국 기준" · "Retention / 94.2% / 90일 정착률".

---

### 3. Audience Selector

**Purpose:** The page's key interactive moment. Let the visitor declare who they are, and personalize the guidance beneath.

**Layout:** Section padding `clamp(64px, 8vw, 132px)` vertical. Header row is flex, space-between, aligned to the bottom — left is an eyebrow + H2 + lead (`max-width: 720px`), right is a segmented tab control. Below: three cards in a 3-column grid, `gap: 20px`. Below that: a full-width personalization panel.

**Header:** Eyebrow "CHOOSE YOUR PATH" (11.5px/600, 0.16em, with a 22px hairline before it). H2 "어떤 위치에서 오셨습니까?" at `clamp(27px,3.2vw,42px)`. Lead: "사업주, 지역 협력기관, 구직자 — 세 가지 길에 맞춰 안내가 달라집니다. 선택하시면 아래 내용이 그에 맞게 정리됩니다."

**Tab control:** inline-flex pill on `#F1F3F6` with a 1px `#E5E7EB` border, 4px inner padding. Three buttons (사업주 / 지역기관 / 구직자), 38px tall, 13px/600. Selected: white background, navy text, `box-shadow: 0 2px 8px rgba(11,27,63,0.09)`.

**The three cards** — each is a `<div role="button" tabindex="0" aria-pressed>` at `min-height: 486px`, `padding: 26px`, `border-radius: 22px`, `border: 1px solid #E5E7EB`, `background: #F7F8FA`, `overflow: hidden`, `isolation: isolate`. An absolutely-positioned art layer sits at z-index −2 with `opacity: 0` and `transform: scale(1.06)`; on hover or active it fades to 1 and scales to 1 over 0.6s/0.9s.

Three distinct art recipes, each a stack of two radial gradients plus a linear base and a `::after` scrim fading to `rgba(6,18,43,0.94)` at the bottom:
- **Employer (blue):** `radial-gradient(circle at 78% 18%, rgba(47,107,255,0.85), transparent 55%)`, `radial-gradient(circle at 20% 78%, rgba(34,211,238,0.5), transparent 55%)`, base `linear-gradient(150deg,#0d2255,#050f2b)`.
- **Partner (cyan), skewed opposite:** cyan first at 25%/20%, then blue at 82%/74%, base `linear-gradient(210deg,#0a2047,#04102a)`.
- **Seeker (warm):** orange at 70%/26% (`rgba(255,138,61,0.55)`), blue at 20%/72%, base `linear-gradient(160deg,#102048,#050f2b)`.

Each art layer also carries a `.lines` overlay — 64px vertical hairlines at `rgba(255,255,255,0.09)`, masked to fade upward.

Card internals: top row with a 52×52 icon tile (15px radius, white background, 1px `#E5E7EB` border, navy 24px 1.5px-stroke icon) and a `01 / EMPLOYER` label at 11px/600, 0.16em, `#9AA2AF`. Then `margin-top: auto` pushes the content down: eyebrow (`FOR EMPLOYERS`, 11px/600/0.14em), title at 25px/700 `-0.028em` navy with a 14px/500 subtitle line, description at 14px/1.62 `#6B7280` (`max-width: 30ch`), and a footer row with a hairline top border containing a stat ("1,240개" at 15px bold + "협력 기업 · 최근 12개월" at 11px `#9AA2AF`) and a 38px circular arrow button.

**Hover/active states:** card lifts `translateY(-6px)` with `--shadow-2` and a `rgba(47,107,255,0.35)` border over 0.55s. Every text element switches to white/`rgba(255,255,255,0.72)`; sub-labels go to `rgba(255,255,255,0.62)`; the icon tile becomes `rgba(255,255,255,0.14)` with a `rgba(255,255,255,0.28)` border; the arrow button inverts to white. The icon also does a small `translateY(-2px) rotate(-3deg)`. **Active** card (the selected one) holds the art at full opacity permanently and gets `box-shadow: 0 0 0 2px #2F6BFF` on top of `--shadow-2`.

**Personalization panel** — below the cards, `margin-top: 24px`, 22px radius, 1px `#E5E7EB`, `linear-gradient(180deg,#fff,#F7F8FA)`, 26px padding. Three columns `1fr 1.22fr 0.8fr` with 34px gap, animating in with a 0.5s fade + 8px rise. Column 1: an arrow glyph at 11px/700 blue, a heading at 18px/600 navy, and body at 13.5px/1.6 `#6B7280`. Column 2: a checklist, each item a 15px blue check plus 13.5px `#3F4859` text. Column 3: a full-width navy CTA pill and a centered ghost secondary link.

**Copy per state** (all three must be implemented):

| | Employer | Partner | Seeker |
|---|---|---|---|
| Heading | 사업주님이 지금 확인하실 내용 | 지역 협력기관과 함께하는 방식 | 내 비자에 맞는 일자리 찾기 |
| Body | 인력 부족 현장의 평균 채용 소요 기간은 5.8주입니다. 상담 한 번으로 예상 일정과 비용을 받아보세요. | 서울 본사가 법무·비자 리스크를 지고, 지역 기관은 현장과 인재를 잇습니다. 수익 배분은 계약서에 명시됩니다. | 비자·지역·업종을 고르면 지원 가능한 공고만 보여드립니다. 서류는 사진 한 장으로 시작할 수 있습니다. |
| Bullets | 비자 유형별 적법성 사전 검토 / 산업별 인력 풀 12,400명 보유 / 입국 후 90일 정착 케어 포함 | 구인·구직 풀 실시간 공유 / 매칭 수수료 최대 6:4 배분 / 비자 서류 검토 본사 지원 | 비자별 지원 가능 공고만 필터링 / 10개 언어 모국어 상담 / 소개 수수료 근로자 부담 없음 |
| CTA | 인력 요청하기 → `#estimator` | 파트너 신청 → `#partners` | 일자리 찾기 → `#seekers` |

---

### 4. Trust Metrics

**Purpose:** Replace claims with auditable numbers. Deliberately adjacent to the license badge so the numbers and the credential read together.

**Layout:** Dark section, background `#06122B`, with two soft radial washes (blue at 82%/10%, cyan at 8%/90%). Inner grid `gap: 56px`. Top row: `1fr auto` — a heading block and the license card, aligned to the bottom. Below: a 5-column metric row with a 1px `rgba(255,255,255,0.14)` top border; each metric has a `1px rgba(255,255,255,0.1)` right border except the last, and `28px 24px` padding (left padding only from the second onward).

**Heading:** eyebrow "PROOF, NOT PROMISES", H2 "숫자로 남는 결과" (`max-width: 15ch`), lead "2026년 10월 기준, VISANJOB이 직접 수행한 매칭과 사후관리 데이터입니다. 모든 수치는 분기별로 검증됩니다."

**License card:** flex row, 14px/18px padding, 14px radius, `border: 1px solid rgba(255,255,255,0.16)`, `background: rgba(255,255,255,0.05)`, `backdrop-filter: blur(10px)`. A 38px circular seal (`rgba(34,211,238,0.12)` fill, `rgba(34,211,238,0.3)` border, `#7ff0ff` shield icon) beside "정식 유료직업소개소" at 12.5px/600 and "등록번호 제 2026-0000호 · 고용노동부" at 10.5px/0.06em `rgba(255,255,255,0.42)`.

**Metrics:** number at `clamp(34px,3.6vw,50px)`/700, `-0.04em`, `line-height: 1`, tabular numerals, white. Suffix (`명`/`개`/`개국`/`%`) rendered as a `<span>` at `0.5em`, superscript-aligned, cyan. Label 13px `rgba(255,255,255,0.55)`; note 11px/0.04em `rgba(255,255,255,0.32)`.

| Value | Label | Note |
|---|---|---|
| 12,480명 | 누적 매칭 인원 | 2011 — 2026.10 |
| 1,240개 | 협력 기업 | 제조 62% · 건설 14% |
| 68개 | 지역 협력기관 | 16개 시·도 |
| 16개국 | 인재 출신국 | VN · TH · ID · NP · UZ · KH · MN |
| 94.2% | 90일 정착률 | 업계 평균 81% 대비 +13.2%p |

**Count-up animation:** see Interactions. Critically, **seed each element with its final value on first render**, then animate from 0 only when it enters the viewport. Never leave `0` as the resting state.

---

### 5. Employer Service Flow

**Purpose:** De-risk the process by showing it as five concrete, time-boxed steps.

**Layout:** Header grid `1.1fr 0.9fr` with 48px gap, `margin-bottom: 64px`; left heading block, right lead paragraph aligned to the bottom. Below, a `.rail` containing an absolutely positioned 2px track at `top: 31px` and a 5-column grid of steps.

**The rail:** the track is `#E5E7EB`; inside it a `<i>` filled with `linear-gradient(100deg,#2F6BFF,#22D3EE)`, `transform-origin: left`, scaled on X by a CSS variable `--p` (0→1) computed from scroll position. This is the section's signature motion — the timeline draws itself as you scroll.

**Step anatomy** (each `padding-right: 22px`): a 62px circular node (white, 1px `#E5E7EB`, `#9AA2AF` icon) that turns navy with a white 8px ring and `0 16px 30px -16px rgba(11,27,63,0.5)` when reached; a 10.5px/700/0.16em index; a 17px/600 title; a 13px/1.6 description (`max-width: 24ch`); and a duration chip — inline pill, 4px/9px padding, `border: 1px dashed #E5E7EB`, 11px/600, `white-space: nowrap`.

| | Step | Duration | Description |
|---|---|---|---|
| 01 | 현장 상담 | 1–3일 | 업종·공정·인원·숙소 여건을 확인합니다. 필요 서류 목록과 예상 일정을 같은 날 전달합니다. |
| 02 | 비자 적합 매칭 | 1–2주 | 직무에 맞는 비자 유형을 먼저 정하고, 검증된 인재 풀에서 3배수 후보를 제안합니다. |
| 03 | 서류 · 비자 지원 | 2–3주 | 계약서, 고용허가 신청, 번역 공증, 사증 발급까지 전 과정을 대행하고 반려 리스크를 사전 점검합니다. |
| 04 | 입국 · 온보딩 | 4주 | 공항 픽업, 기숙사 세팅, 4주 현장 적응 프로그램과 안전교육을 함께 운영합니다. |
| 05 | 사후관리 | 90일 + | 90일 정착 모니터링, 갱신·체류 지원, 사업장 변경 대응까지 근속 기간 내내 함께합니다. |

Reached state: node navy, index blue `#2F6BFF`, title and description at full navy/`#6B7280`, chip becomes `#1F4FC4` on `rgba(47,107,255,0.06)` with a solid `rgba(47,107,255,0.3)` border. A `.ring` child pings outward on a 2.6s loop once active.

**Below 1024px** the rail rotates: the track becomes vertical on the left at `left: 30px` and scales on Y, and each step becomes a two-column grid `62px 1fr` with the node spanning four rows.

---

### 6. Cost & Timeline Estimator

**Purpose:** The highest-intent tool on the page. Let an employer price their hire before talking to a human. **Currently a UI mock with real arithmetic but no backend.**

**Layout:** `#F7F8FA` section. A 1.06fr / 0.94fr split with no gap — left form (`border-radius: 22px 0 0 22px`, white, 1px `#E5E7EB`, right border removed) and right result card (`border-radius: 0 22px 22px 0`, dark). Both `clamp(24px,3vw,40px)` padding.

**Form fields** (22px vertical gap, each a `.field` with 7px internal gap):

1. **업종** — native `<select>`, 48px, 10px radius, 15px/500 navy. Options with weights: 제조·정밀가공 (1, 5.4) · 건설 (1.18, 7.0) · 농축산 (0.92, 5.0) · 조선·해양 (1.26, 7.6) · 서비스·F&B (0.95, 4.6) · 물류 (0.88, 3.8).
2. **필요 인원** — range slider, 1–50. Custom thumb: 22px white circle, 2px blue border, `0 4px 12px rgba(47,107,255,0.35)`; track 5px, filled portion blue via a `--fill` percentage variable. Live `<output>` shows "8명".
3. **비자 유형** — four toggle chips (E-9, E-7, H-2, F-2·F-4), 34px pill, 12.5px/500. Selected: navy fill, white text, `0 8px 18px -10px rgba(11,27,63,0.6)`.
4. **지역** — select with multipliers: 경기·인천 ×1 · 서울 ×1.04 · 충청 ×0.96 · 전라·광주 ×0.94 · 경상·대구 ×0.98 · 부산·울산·경남 ×1.02 · 강원·제주 ×1.08.

**Result card:** dark navy with radial blue at top-right and cyan at bottom-left, plus two decorative concentric circles at bottom-right. Contains, in order: a 10.5px/600/0.16em amber-free label "예상 총 소요 기간"; a huge number at `clamp(48px,5.4vw,74px)`/700 `-0.05em` with a 15px "주" and a status pill to the right; three phase bars (label left, percentage right in white, 5px track at `rgba(255,255,255,0.12)` with a gradient fill); a 1px divider; three rows (label at 60% white / value bold white, tabular numerals); then the CTA and a disclaimer at 11px/1.34 `rgba(255,255,255,0.34)`.

**The calculation** (implement as a pure function, unit-testable):

```
weeks = industryBaseWeeks × regionMultiplier + visaOffset
if (count >= 10) weeks -= 0.5
if (count >= 25) weeks -= 0.4
weeks = max(2.4, weeks)

visaOffset = { "E-9": +1.12, "E-7": -0.74, "H-2": -0.44, "F-2": -0.62 }
feeFactor  = { "E-9": 1, "E-7": 1.42, "H-2": 0.82, "F-2": 1.05 }

fee   = round(760000 × industryWeight × feeFactor[visa] / 10000) × 10000
total = fee × count
arrival = 2026-11-15 + round(weeks × 7) days
```

Status pill text: "분할 입국" at count ≥ 25, "일정 단축" at ≥ 10, otherwise "표준 일정". Phase bar split: visa = `46 + (E-9 ? 6 : E-7 ? 2 : -6)`, match = `28 - (count>=10 ? 4 : 0)`, onboarding = remainder. Format money as `₩ ` + `toLocaleString('ko-KR')` (e.g. `₩ 6,240,000`).

**Disclaimer (must ship verbatim):** "표시된 금액은 2026년 4분기 기준 평균 소개 수수료이며, 실제 계약 금액은 직무·지역·인원에 따라 달라집니다. 근로자에게 소개 수수료를 받지 않습니다."

---

### 7. Visa Type Explorer

**Purpose:** Differentiate the six visa classes, because the same factory floor has different rules depending on a worker's status.

**Layout:** Header grid `1fr auto`, 40px gap, bottom-aligned, 40px bottom margin. A wrapping chip row (8px gap, 28px bottom margin). Then a two-column panel `0.86fr 1.14fr`, 22px radius, 1px `#E5E7EB`, `overflow: hidden`, `--shadow-1`, re-animating on each tab change.

**Chips:** 46px pill, 18px horizontal padding, 14px/600 navy, 1px `#E5E7EB`. Each contains a 10.5px/700 code chip (`rgba(47,107,255,0.1)` on `#2F6BFF` text, 3px/6px padding, 5px radius) plus the Korean name. Selected: navy fill, white text, `0 14px 28px -16px rgba(11,27,63,0.7)`, code chip becomes `rgba(255,255,255,0.14)` on `#9fe9ff`. Hover: `translateY(-1px)`, `#9AA2AF` border.

**Left panel:** dark `linear-gradient(165deg,#0b1b3f,#071531)` with a cyan radial bloom at top-right. Stack: the visa code at `clamp(40px,4.4vw,58px)`/700 filled with the `--grad-text` gradient; Korean name 16px/600 white; English name 12px/0.02em `rgba(255,255,255,0.45)`; a 13px/1.65 description at 0.62 white; then `margin-top: auto` a facts table — 1px `rgba(255,255,255,0.1)` gaps over a 12px radius, each row `12px 14px` on `rgba(7,21,49,0.72)` with an 11.5px label at 0.45 white and a 12.5px/600 value.

**Right panel** (`clamp(24px,3vw,38px)` padding, 26px gap, three groups):

- **Eligible industries** — 10.5px/700/0.16em `#9AA2AF` label, then wrapping outline badges (11.5px/600, 26px tall, 1px `#E5E7EB`, `#6B7280`).
- **Typical roles** — 2-column grid, 8px gap, each a `#F7F8FA` tile with a 1px `#F1F3F6` border, 12px/13px padding, 11px radius, a 15px blue check, 13px/500 navy.
- **Hiring notes** — stacked rows, 10px vertical padding, 1px `#F1F3F6` dividers, each with a 20px circular blue-tinted marker and 13.5px/1.55 `#3F4859` text where the lead phrase is 600-weight navy.

Then two actions: a navy pill "`{code}` 인력 요청" with an arrow, and an outline pill "상담 가능 여부 확인".

**Content for all six tabs** — read `reference/assets/js/data.js` → `VJ.visas`. Each record has `code`, `name`, `en`, `desc`, `facts` (3 rows), `industries` (6), `roles` (4) and `notes` (3 pairs of lead-phrase + explanation). Transcribe verbatim; the legal nuances in the notes are the reason this section exists. Codes: `E-7` 특정활동, `E-9` 비전문취업, `H-2` 방문취업, `F-2` 거주, `F-4` 재외동포, `F-5·F-6` 영주·결혼이민.

---

### 8. Nationwide Network Map

**Purpose:** Prove geographic reach and recruit local agencies. Seoul HQ as the hub, 68 partners radiating outward.

**Layout:** `#071531` background with two radial washes. Two columns `0.9fr 1.1fr`, 56px gap, vertically centered. Left: heading block, a 3-up stat row, a legend, and the partner CTA. Right: the map at `aspect-ratio: 1 / 1.02`, max 626px.

**Left column:** eyebrow "NATIONWIDE NETWORK", H2 "서울 송파에서,<br>전국 16개 시·도로", lead "본사가 비자·법무 리스크를 전담하고, 지역 협력기관이 현장과 인재를 잇습니다. 지도에서 지역을 선택해 협력 현황을 확인하세요." Stat row is 3 cells over a 1px `rgba(255,255,255,0.1)` grid on a 14px radius: **68** 지역 협력기관 · **924** 진행 중 공고 · **16** 시·도 커버리지 (values 22px/700 `-0.03em`, labels 11px at 0.48 white). Legend: three dots — `#2F6BFF` 본사·허브, `#22D3EE` 협력기관 (10개 이상), `rgba(255,255,255,0.35)` 협력기관 (10개 미만) — at 11px/0.42 white. CTA: glass pill "지역 협력기관 되기".

**The map is a stylized SVG at `viewBox="0 0 460 640"`** — a hand-drawn arrangement of 9 province polygons, not geographically precise. **This is intentional** (a brand diagram, not a GIS map). If the product needs real region selection with accurate boundaries, substitute GeoJSON — but preserve the visual language: `rgba(255,255,255,0.045)` land fill, `rgba(160,200,255,0.3)` 1.1px stroke. Hover a province: fill to `rgba(47,107,255,0.2)`, stroke to `rgba(140,190,255,0.7)`.

Province paths, plus 16 region nodes with `x`/`y` coordinates, 16 text labels, and hub-to-node dashed connector paths — all in `reference/index.html` (search for `PROVINCES` / `LABELS` in `assets/js/app.js`, and the static SVG in the HTML). Dashed links are `rgba(47,107,255,0.55)` at 1px with `stroke-dasharray: 3 5` animating `stroke-dashoffset` over 3.6s.

**Node encoding:** radius 6 for the hub (plus a pulsing halo, `#2F6BFF` with a glow filter), 4.4 for regions with ≥5 partners, 3.2 for the rest. Fill: hub `#2F6BFF`, ≥10 partners `#22D3EE`, otherwise `rgba(255,255,255,0.55)`. Each node has a transparent 12px-radius hit circle for a comfortable pointer target.

**Tooltip:** absolutely positioned, `min-width: 196px`, white at 97%, 13px radius, `--shadow-3`, `transform: translate(-50%,-12px) scale(0.96)` → on hover `translate(-50%,-18px) scale(1)` over 0.3s. A 10px rotated square tail at the bottom center. Content: region name at 13px/700 with an optional 본사 badge, then three rows (협력기관 / 진행 중 공고 / 평균 매칭) at 11.5px with bold tabular values. Position is clamped to stay 110px from either edge. Visible on hover **and** on keyboard focus; clicking pins it for 2.6s.

Region data (`VJ.regions`): id, name, x, y, partners, jobs. Provinces aggregate their member regions; e.g. 경기·서울·인천 = seoul(12) + incheon(5) + gyeonggi(9) = 26 partners.

---

### 9. Talent Showcase

**Purpose:** Make an abstract "12,400-person talent pool" feel like real people you could interview Monday.

**Layout:** `#F7F8FA`, tight vertical padding. Header flex, bottom-aligned, 40px bottom margin — heading left, a live-count badge + outline button right. Then **two full-bleed marquee rows**, the second reversed and offset `margin-top: 18px`.

**Marquee mechanics:** `display: flex`, `width: max-content`, `gap: 18px`. Each row duplicates its card set so a `translateX(-50%)` loop is seamless. Row 1: 68s linear infinite; row 2: 82s, `animation-direction: reverse`. Both pause on hover. Both are edge-masked with `linear-gradient(to right, transparent, #000 3%, #000 97%, transparent)`.

**Card:** 302px wide, white, 1px `#E5E7EB`, 16px radius, 20px padding, 16px internal gap. Hover: `translateY(-4px)`, `--shadow-2`, `rgba(47,107,255,0.28)` border.

- **Header:** 46×46 avatar tile (13px radius, `linear-gradient(150deg,#23407f,#0b1b3f)`, 12px/700 white country code) with an 18px country flag disc overlapping its bottom-right at −3px. Beside it the job title at 14.5px/600 navy and "`{country}` · `{exp}` 경력" at 11.5px `#6B7280`.
- **Attribute table:** 1px `#F1F3F6` gaps over a 9px radius; three rows on white (`8px 11px` padding, 12px): 비자 / 한국어 / 보유 기술, label at `#9AA2AF`, value at 12px/600 navy, `-0.01em`.
- **Footer:** a 5-segment Korean-level meter (14×3px bars, 2px radius, `#E5E7EB` off / `#2F6BFF` on) and a right-aligned `VERIFIED · VN-2418` at 9.5px/600/0.1em `#9AA2AF`.

**Ten candidate records** are in `VJ.candidates` — Vietnamese CNC operator, Nepali welder, Uzbek PLC engineer, Cambodian food-packing, Thai hotel F&B, Korean-Chinese plumber (H-2, native-level Korean), Indonesian assembler, Mongolian agricultural worker, Vietnamese production manager (F-2, TOPIK 5), Filipino QC inspector. Show the job title, country, years of experience, visa, Korean level label, and a 0–5 skill array — **never a full name or photo**. Anonymization is a privacy requirement, not a stylistic choice.

---

### 10. Job Seekers (mobile-first)

**Purpose:** The one section written for the worker, not the employer. It must feel safe, simple, and free of jargon — and it must work perfectly on a 390px phone.

**Layout:** A soft blue wash (`linear-gradient(180deg,#f2f6ff,#eef3ff 60%,#f7f9fd)` plus cyan and orange radials). Two columns `0.94fr 1.06fr`, 56px gap, centered. **Below 1024px this stacks, copy first** — and all touch targets grow.

**Left column:**
- A greeting pill: white, `--shadow-1`, 12.5px/600, containing a small Vietnam flag (18×13, two-tone `#da251d`/`#ffcd00`) and "Xin chào! 지금 428개의 새 공고가 올라와 있습니다".
- H2 at `clamp(27px,3.2vw,42px)`: "내 비자로 갈 수 있는 일,<br>여기서 바로 찾으세요".
- A lead paragraph at `#3F4859` ending in a bold navy promise: "**소개 수수료는 근로자에게 받지 않습니다.**" (Placement fees are never charged to the worker — this is a legal and ethical commitment, keep it prominent.)
- A flag row: six 26px white discs (VN, TH, ID, NP, UZ, KH) plus "+ 10개 언어로 상담 가능".
- Four messenger buttons — 카카오톡 (TALK, `#FEE500` on `#3A1D1D`), WhatsApp (`#25D366`), Zalo (`#0068FF`), Messenger (`#0084FF`). 46px tall, pill, 13px/600, 22px colored tile. Hover lifts 2px.

**Right column — the search card:** white, `--r-xl` (28px), `padding: 24px`, and a heavy shadow `0 40px 90px -50px rgba(11,27,63,0.5)`.

1. Header: "내 비자로 일자리 찾기" at 16px/600, plus a cyan badge "428개 공고".
2. **Visa boxes** — 5-column grid, 6px gap. Each 54px tall, 12px radius, 1px `#E5E7EB`, showing the code at 12.5px/700 and a Korean gloss at 8.5px/500/0.6 opacity. Selected: navy fill, white text, `0 10px 22px -12px rgba(11,27,63,0.7)`. Below 400px this becomes 2 columns.
3. **Two selects** — 지역 and 업종, side by side, 48px, stacking below 760px.
4. **Results** — up to 3 job rows, 8px gap. Each is a full-width `<a>` at `min-height: 56px`, `#F7F8FA`, 12px radius, 12px/14px padding. Contains a 34px icon tile, a two-line text block (title 13.5px/600 navy truncating with ellipsis, meta 11.5px `#6B7280` also truncating), and a right-aligned pay figure at 12px/600. Hover: white background, `#E5E7EB` border, `translateX(3px)`.
5. **Primary action** — 56px navy pill: a search icon + "`{n}`개 공고 모두 보기" with a live count.
6. **Language row** — eight quiet chips at 11px on `rgba(11,27,63,0.05)`: 한국어, Tiếng Việt, ภาษาไทย, Bahasa Indonesia, Oʻzbekcha, नेपाली, ភាសាខ្មែរ, Монгол.

**Filter logic:** a job matches if its `visas` array contains the selected visa AND the region and industry match (or are `all`). Nine jobs in `VJ.jobs`. When nothing matches, replace the list with: "선택하신 조건의 공고가 아직 없습니다. 조건을 바꾸시거나 카카오톡으로 문의해 주세요." and set the count to 0.

**Models note:** the visa list here is deliberately narrow (5 boxes) for cognitive load; the explorer section carries the full 6-class taxonomy. Since the copy is multilingual, add ~30% horizontal slack — **no fixed widths on text containers.**

---

### 11. Case Studies & Testimonials

**Purpose:** Social proof in two registers — hard before/after numbers for the employer, human voices for the worker.

**Layout:** Header flex with heading and an outline "사례 전체 보기" button. Then a 3-column case grid (20px gap). Then a labelled 3-column testimonial grid. Then a logo marquee under a `1px #E5E7EB` rule.

**Case card:** white, 1px `#E5E7EB`, 22px radius, `overflow: hidden`, flex column. Hover: `translateY(-5px)`, `--shadow-2`, `rgba(47,107,255,0.25)` border.

- **Thumbnail** at `aspect-ratio: 16/10` — a navy radial-gradient plate with a 40px grid overlay masked by a radial ellipse. Two variants: default (blue at 70%/24%) and `--warm` (orange at 30%/26% over a warmer base). A dark badge with the sector/location sits at top-left.
- **Body** at 20px padding, 14px gap: a 18px/600 `-0.024em` `1.38` navy title, then a 3-column metric row (1px `#F1F3F6` gaps, 10px/11px cells) with values at 16px/700 `-0.025em` navy and labels at 9.5px/0.04em uppercase `#9AA2AF`.

| Tag | Title | Metrics |
|---|---|---|
| 제조 · 경기 화성 | 3개월째 라인이 비던 정밀가공 공장, 6주 만에 12명 충원 | 12명 충원 인원 · 6주 소요 기간 · 96% 90일 정착률 |
| 조선 · 울산 (warm) | 용접 숙련 인력 8명, E-7로 장기 고용 전환 | 8명 E-7 전환 · 2.1년 평균 근속 · −38% 재채용 비용 |
| 농축산 · 전남 나주 | 지역 협력기관과 함께 성수기 인력 40명 매칭 | 40명 성수기 매칭 · 9일 최단 매칭 · 4곳 협력기관 |

**Testimonial card:** a `<button>` at `aspect-ratio: 16/11`, 22px radius, dark navy gradient plate that scales to 1.06 over 0.9s on hover. A 58px white play disc at 44% vertical, scaling to 1.1. Bottom overlay with the worker's name (14.5px/600 white), a visa/country/region line (11.5px `rgba(255,255,255,0.55)`), a quote at 12.5px/1.5 `rgba(255,255,255,0.8)` (`max-width: 30ch`), and a duration chip top-right of the meta block with `backdrop-filter: blur(6px)`. Three records in `VJ.testimonials` (Nguyễn Văn Nam / VN / E-9 / Gyeonggi; Sukhbaatar Bulgan / MN / E-9 / Cheonan; Santos Maria / PH / E-7 / Busan), each with a quote and 2:14 / 1:48 / 3:02 durations. Clicking opens the video modal.

**Logo marquee:** 46s infinite, 46px gaps, duplicated set, 8% edge masking. Each item is 15px/600 `-0.02em`, fully grayscale at 0.72 opacity, returning to navy and full color on hover. A 22px shape mark precedes each name (`sq` square, `ci` circle, `di` rotated 45° with 4px radius). Label above: "1,240개 기업이 VISANJOB과 함께합니다".

---

### 12. Insights

**Purpose:** Demonstrate regulatory fluency — the thing that separates a real agency from a broker.

**Layout:** `#F7F8FA`, header flex with a ghost "전체 글 보기" link, then a 3-column grid (20px gap) on 22px padding cards. Hover: `translateY(-4px)`, `--shadow-2`, title turns blue.

Each card: a top row with a category badge (노동법 → blue tint, 비자 정책 → cyan tint, 채용 가이드 → orange tint) and a date at 13px `#6B7280`; a 17.5px/600 `-0.024em` `1.42` navy title; a 13px/1.62 `#6B7280` description; a footer row with a hairline `#F1F3F6` top border showing "읽는 시간 `{n}`" and a "읽기 →" affordance.

| Category | Title | Description | Date | Read |
|---|---|---|---|---|
| 노동법 | 2026년 외국인 고용 사업장 변경 사유, 무엇이 달라졌나 | 사업장 변경 허용 사유가 5개 항목으로 정비되었습니다. 현장에서 자주 발생하는 계약 종료·임금 체불 케이스를 정리했습니다. | 2026.11.04 | 6분 |
| 비자 정책 | E-7-1 첨단산업 직종 확대, 제조업 적용 범위 | 첨단산업·신산업 분야 E-7 직종이 확대되면서 중소 제조기업의 전문인력 채용 문턱이 낮아졌습니다. | 2026.10.22 | 4분 |
| 채용 가이드 | 외국인 근로자 온보딩 첫 4주, 정착률을 결정한다 | 입국 직후 4주간의 기숙사·식사·직무교육 설계가 90일 정착률에 미치는 영향을 데이터로 확인했습니다. | 2026.10.09 | 8분 |

---

### 13. Final CTA + Footer

**Final CTA:** `#050d22` with an animated mesh — three blurred circles (blue, cyan, orange) on `screen` blend, drifting on 22s/27s/24s alternating loops. H2 "오늘 상담하면, 이번 분기에 채용합니다" (`max-width: 20ch`), lead, then a 1fr/1fr split of two glass cards, 18px gap, 30px padding, 22px radius, `rgba(255,255,255,0.06)` on `rgba(255,255,255,0.14)` border, `blur(20px)`.

- **Employers:** "FOR EMPLOYERS" kicker, "인력 요청하기", body, gradient CTA "견적 요청" + glass phone button.
- **Partners:** warm variant — `linear-gradient(150deg, rgba(255,138,61,0.2), rgba(255,138,61,0.06))`, `rgba(255,138,61,0.32)` border. "지역 협력기관 신청", body, **orange** CTA "파트너 신청" + glass email button.

**Footer:** `#040a1a`, 64px top padding, 13px base. A 5-column grid `1.5fr 1fr 1fr 1fr 1.2fr` with 34px gap: brand block (logo in white, mission sentence, three 34px social squares for LinkedIn/YouTube/Instagram), then Services / Network / Company link columns (11px/700/0.14em headings, 13px links at 0.66 white), then a Registration column.

**Registration block (placeholders — must be replaced before launch):** 상호 비전잡 주식회사 (VISANJOB Co., Ltd.) · 대표 김도현 · 사업자등록 000-00-00000 · 직업소개 제 2026-0000호 · 주소 서울특별시 송파구 올림픽로 300, 12층 · 연락 02-1234-5678 · hello@visanjob.co.kr

> **Legal requirement:** under Korea's 직업안정법, a fee-charging employment agency must display its registration number. Keep this visible in the footer.

Bottom bar: `1px rgba(255,255,255,0.09)` top border, 22px padding, flex space-between — copyright, links (개인정보처리방침 / 이용약관 / 윤리강령 / Sitemap), and language shortcuts.

---

## Interactions & Behavior

### Scroll reveals

**Critical constraint — do not change this pattern.** Eleven sections' children carry `.reveal`.

```css
.reveal { opacity: 1; transform: none; }
.js-reveal .reveal:not(.is-in) { transform: translateY(var(--reveal-y, 18px)); }
.js-reveal .reveal { transition: transform 0.78s cubic-bezier(0.16,1,0.3,1); }
.reveal.is-in { transform: none; }
```

**Opacity is never animated.** Content is always fully opaque; only a transform offset animates. This was a hard-won fix: an earlier version animated opacity 0→1 gated on an `IntersectionObserver`, and in one rendering environment the observer's callbacks never fired — 54 elements including the H1 and all five metrics stayed permanently invisible. **If you port this to a framework, keep the same guarantee:** if JS fails, the page must still be fully readable. A CSS `@keyframes` entry animation is fine; a JS-gated `opacity: 0` initial state is not.

**Related trap — `@keyframes panelIn` must never contain an opacity keyframe.** `.visa__panel` and `.aud__panel` run `panelIn` on every re-render (tab switch, audience change). An early version animated `from { opacity: 0 }`, which overrode the `.reveal` opacity contract and left the entire 600px visa panel invisible even when revealed. The keyframes now animate `transform` only. If you add an entry animation anywhere, animate transform — never opacity — on elements that also carry `.reveal` or are swapped by state.

Stagger siblings by 60–80ms via `transition-delay`.

### Scroll triggers — use position math, not IntersectionObserver

This project deliberately avoids `IntersectionObserver`. Reveals, metrics, and nav scroll-spy all use `getBoundingClientRect()` on scroll (throttled with `requestAnimationFrame`). Element is revealed when `rect.top < viewportHeight * 0.94 && rect.bottom > -40`.

If you're implementing in React/Next, a `useEffect` + scroll listener (or a battle-tested library that falls back gracefully) is fine — but **verify content is visible with JS disabled** before shipping.

### Count-up numbers

Five metrics. **Seed the DOM with the final formatted value on first render**, then on first intersection animate 0 → target over 1400ms with an ease-out cubic (`1 - (1-p)^3.2`), formatting each frame with `toLocaleString('ko-KR', { minimumFractionDigits: decimals })` and re-appending the suffix span. Guard with a `done` flag so it runs once. `0` must never be the resting state — a fetch failure or JS error must not leave "0명".

### Magnetic primary CTAs

Elements with `data-magnetic` (hero primary, nav CTA, estimator submit, partner CTA, map CTA). On `pointermove`, offset the button by `dx/width * 7px`, `dy/height * 5 - 1px`; reset on `pointerleave`. Disabled under reduced motion. Use `transform` only, never `left/top`.

### Service flow progress

On scroll: `p = (viewportHeight * 0.82 - railRect.top) / (railRect.height * 0.86)`, clamped 0–1, written to `--p` on the fill element (which is scaled on X, or Y on mobile). Steps light up when `index < ceil(p * 5)`.

### Film modal player

Opens from the hero play button and all three testimonial cards. Full-screen scrim `rgba(3,8,22,0.86)` + `blur(14px)`, fading over 0.35s. The shell is 1160px max, 20px radius, entering with `translateY(18px) scale(0.98)` → identity over 0.5s.

Controls: play/pause toggle, seek bar (`role="slider"`, click-to-seek, ←/→ ±5s, `aria-valuenow` synced), time readout `m:ss`, mute toggle, CC toggle, fullscreen. Subtitle cues appear per the timeline and hide when CC is off. Space toggles playback (unless focus is in an input); `Esc` closes. **Return focus to the trigger on close.** Body scroll locks while open.

For production, replace the simulated timeline with a real `<video>`: `<video controls playsinline poster="…"><track kind="subtitles" …></video>`, or a third-party embed. Preserve the custom chrome only if you also wire real `<track>` caption events.

### Floating chat

Bottom-right, 58px gradient circle with a pinging ring and an orange "1" badge. Click expands a 328px card (origin bottom-right, `translateY(10px) scale(0.94)` → identity over 0.42s) containing a gradient header with an online dot, a greeting bubble, six language quick-picks, and a 2×2 channel grid. The FAB icon swaps to an X. Closes on outside click or `Esc`.

### Language switcher

Label-only in the prototype; the current language code updates but content does not translate. **Production requires real i18n.** Ten locales: ko, en, vi, th, id, uz, ne, km, mn, my.

### Smooth anchors

All `href="#…"` links intercept, scroll to `targetTop - 70px` (70px = nav height) via `window.scrollTo({behavior:'smooth'})`. **Do not use `scrollIntoView`** — it can scroll ancestor containers and break app shells.

### Nav scroll-spy

On scroll, pick the last section whose `top <= viewportHeight * 0.42` and set its nav link to `aria-current="true"`.

---

## State Management

Minimal — this is a marketing page, and most of it is declarative.

| State | Type | Initial | Transitions |
|---|---|---|---|
| `audience` | `'employer' \| 'partner' \| 'seeker'` | `'employer'` | Set by card click, card Enter/Space, or tab click. Drives card active styling and swaps the panel's heading/body/bullets/CTA. |
| `lang` | locale code (10) | `'ko'` | Language menu selection. Prototype: label only. |
| `drawerOpen` | boolean | `false` | Burger toggle; closed on link click, `Esc`, or resize above 1024px. Locks body scroll. |
| `navScrolled` | boolean | `false` | `scrollY > 24`. |
| `estVisa` | `'E-9' \| 'E-7' \| 'H-2' \| 'F-2'` | `'E-9'` | Chip click. Recomputes the estimate. |
| `estCount` | number 1–50 | `8` | Slider input. |
| `filmOpen` | boolean | `false` | Hero play button or any testimonial card. |
| `playerPlaying` | boolean | `false` | Play/pause, `Esc`, backdrop click. |
| `playerTime` | seconds 0–92 | `0` | `requestAnimationFrame` advance; seek bar drag/click/arrow keys. |
| `ccOn` | boolean | `true` | CC button. |
| `muted` | boolean | `true` | Mute button. |
| `visaTab` | index 0–5 | `0` | Vis a chip click. Re-renders the panel. |
| `seekVisa` | visa code | `'E-9'` | Visa box click. Re-filters jobs. |
| `seekRegion` / `seekIndustry` | string | `'all'` | Select change. |
| `chatOpen` | boolean | `false` | FAB click; outside click; `Esc`. |

**Data fetching:** none in the prototype. Everything is static in `assets/js/data.js`. Production will need: job listings (with visa/region/industry facets), talent pool profiles, partner counts by region, published insights, testimonials with video URLs. The estimator should stay client-side (it's a lead magnet) but log submissions server-side.

**URL state (recommended addition):** persist `audience` and `seekVisa` in the query string (`?for=employer`, `?visa=E-9`) so campaigns and the language switcher can deep-link. The current design does not do this.

---

## Design Tokens

### Colors

| Token | Hex | Use |
|---|---|---|
| `--navy` | `#0B1B3F` | Primary text, dark surfaces, employer CTAs |
| `--navy-deep` | `#06122B` | Metrics section, dark sections |
| `--navy-soft` | `#122A5C` | Hover state for navy buttons |
| `--navy-ink` | `#0A1836` | Nav background variant |
| `--blue` | `#2F6BFF` | Accent, focus rings, links, primary gradient start |
| `--blue-600` | `#245AE0` | Blue pressed state |
| `--cyan` | `#22D3EE` | Primary gradient end, metric suffixes, live indicators |
| `--orange` | `#FF8A3D` | **Partner & worker CTAs only** |
| `--orange-ink` | `#351703` | Text on orange |
| `--n50` | `#F7F8FA` | Section background |
| `--n100` | `#F1F3F6` | Table gaps, hover backgrounds |
| `--n200` | `#E5E7EB` | Borders, dividers |
| `--n400` | `#9AA2AF` | Meta text, placeholders |
| `--n500` | `#6B7280` | Body copy |
| `--n700` | `#3F4859` | Dense text, list items |
| `--ink` | `#111827` | Base text |
| `--white` | `#FFFFFF` | Surfaces |

**Gradients**
```css
--grad:      linear-gradient(100deg, #2F6BFF 0%, #22D3EE 100%);   /* CTAs, rails, progress */
--grad-text: linear-gradient(96deg, #7EA6FF 0%, #22D3EE 58%, #A8F0FB 100%); /* headline accent */
--grad-soft: linear-gradient(135deg, rgba(47,107,255,.12), rgba(34,211,238,.12));
```

**Usage ratio:** 70% neutral, 20% navy, 8% blue→cyan, 2% orange.

### Typography

```
Korean:  Pretendard Variable  (CDN: cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9)
Latin:   Inter 400/500/600/700
Fallback: "Noto Sans Thai", "Apple SD Gothic Neo", "Noto Sans Khmer",
          "Noto Sans Myanmar", "Noto Sans Devanagari", system-ui
```

Body: 17px / 1.65, `font-feature-settings: "ss01" on, "cv11" on`, antialiased.

| Role | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|
| Display | `clamp(38px, 5.9vw, 80px)` | 700 | 1.06 | −0.042em |
| H1 | `clamp(32px, 4vw, 56px)` | 700 | 1.14 | −0.032em |
| H2 | `clamp(27px, 3.2vw, 42px)` | 700 | 1.20 | −0.030em |
| H3 | `clamp(20px, 1.8vw, 27px)` | 600 | 1.35 | −0.022em |
| Lead | `clamp(16px, 1.25vw, 19px)` | 400 | 1.70 | −0.012em |
| Body | 16px (mobile) / 17px | 400 | 1.72 | — |
| Caption | 13px | 400 | 1.50 | 0.01em |
| Eyebrow | 11.5px | 600 | — | 0.16em (uppercase) |
| Metric | `clamp(34px, 3.6vw, 50px)` | 700 | 1.0 | −0.040em, tabular |

**Korean typesetting — do not omit:** Korean paragraphs use `word-break: keep-all` with `text-wrap: pretty` so particles (조사) never orphan onto their own line. Latin and Vietnamese headings use `text-wrap: balance`.

### Spacing (8pt)

`4 · 8 · 12 · 16 · 24 · 32 · 40 · 56 · 72 · 96 · 128` → `--s1` … `--s11`

Section vertical rhythm: `clamp(64px, 8vw, 132px)`. Tight variant: `clamp(48px, 5.5vw, 88px)`.
Container: `max-width: 1320px`, gutter `clamp(20px, 4.4vw, 64px)`.
Grid: 12 columns, 24px gap.

### Radius

`--r-xs: 8px` (chips, small tiles) · `--r-sm: 10px` (inputs) · `--r-md: 16px` (cards) · `--r-lg: 22px` (panels, large cards) · `--r-xl: 28px` (search card) · `--r-pill: 999px` (all buttons, badges)

### Shadows

```css
--shadow-1: 0 1px 2px rgba(11,27,63,.05), 0 10px 26px -14px rgba(11,27,63,.16);   /* resting card */
--shadow-2: 0 2px 6px rgba(11,27,63,.06), 0 28px 60px -26px rgba(11,27,63,.30);  /* hover / menu */
--shadow-3: 0 40px 110px -40px rgba(11,27,63,.45);                              /* modal / tooltip */
--shadow-glow: 0 18px 44px -14px rgba(47,107,255,.55);                          /* primary CTA */
```

### Motion

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);   /* reveals, lifts */
--ease:     cubic-bezier(0.22, 0.61, 0.36, 1); /* color, opacity */
```

Reveals 620–780ms · card lift 450–550ms · button press `scale(0.975)` · tab/panel swap ~450ms · marquee 46–82s linear.

### Breakpoints

`1180px` — nav tightens, metrics to 3 columns, estimator stacks, map narrows
`1024px` — nav links hidden → burger, audience cards stack, rail becomes vertical, visa panel stacks, cases/insights to 2 columns
`760px` — body 16px, hero shortens, single-column grids, footer to 2 columns
`400px` — visa boxes to 2 columns

---

## Assets

### Icons
Fourteen inline SVG symbols in a sprite at the top of `index.html`, all referenced via `<use href="#i-…">`. Style: 24px canvas, **1.5px stroke**, round caps and joins, `currentColor`, no fills except the play triangle and status dots.

`i-arrow` `i-arrow-up` `i-play` `i-pause` `i-globe` `i-chevron` `i-close` `i-check` `i-factory` `i-network` `i-user` `i-shield` `i-chat` `i-doc` `i-search` `i-pin` `i-clock` `i-handshake` `i-volume` `i-mute` `i-cc` `i-expand` `i-linkedin` `i-youtube` `i-instagram`

Substitute the codebase's icon library (Lucide, Heroicons, Phosphor) where equivalents exist, but keep the **1.5px stroke** so the visual weight matches.

### Logo
Inline SVG, 30×30. A navy 31×31 rounded square at 10% opacity, over which sits an upside-down arch (`#2F6BFF → #22D3EE` gradient stroke, 2.2px, round caps) with three vertical legs at `x=10, 16, 22`, and a cyan dot (`#22D3EE`, r=1.9) at the apex. Reads as a bridge/arch — the brand metaphor. Wordmark in Pretendard 700 with 0.06em tracking.

### Photography & Video — **all missing, intentionally**
No real imagery ships in this bundle. Every image is a CSS gradient plate with a grid overlay. Replace, in priority order:

1. **Hero background video** — 1920×1080, ≤3MB, muted loop. Mobile (<760px): poster image + explicit play button instead of autoplay (data cost). `prefers-reduced-motion`: static poster.
2. **Brand film** — 92s, 16:9, with KO/EN/VI subtitle tracks.
3. **Three worker testimonial videos** — 16:9 or 16:11 thumbnails, 1:48–3:14 runtime.
4. **Case study thumbnails** — 16:10, factory/worksite imagery.
5. **OG image** — 1200×630.

**Do not use generic stock photos of "diverse office workers."** The brief explicitly rejects that look. Real worksite photography (a welding bay in Ulsan, a packing line in Naju) outperforms anything staged.

### Fonts
Currently CDN-loaded (Pretendard via jsDelivr, Inter + Noto Sans Thai via Google Fonts). For Korea-facing production, **self-host Pretendard as woff2 subsets** — the CDN is occasionally slow from Korean networks and it's the single largest render-blocking asset.

### Data
All copy and records live in `reference/assets/js/data.js` under `window.VJ`: `langs` (10), `audiences` (3), `visas` (6), `regions` (16), `candidates` (10), `jobs` (9), `cases` (3), `testimonials` (3), `insights` (3), `logos` (9), `player` (4 subtitle cues). **Transcribe Korean copy verbatim** — it was written for this brand, not machine-translated.

---

## Files

```
design_handoff_visanjob_homepage/
├── README.md                       ← this document
└── reference/
    ├── index.html                  ← primary design reference (13 sections, all interactions)
    ├── Design System.html          ← token/component reference page
    └── assets/
        ├── css/
        │   ├── tokens.css          ← all design tokens + reset + type scale + reveal contract
        │   ├── site.css            ← nav, hero, audience selector, trust metrics
        │   ├── site2.css           ← service flow, estimator, visa explorer, network map
        │   └── site3.css           ← talent, job seekers, cases, insights, CTA, footer,
        │                             modal, chat, and ALL responsive breakpoints
        └── js/
            ├── data.js             ← every string and record (window.VJ)
            └── app.js              ← all interaction logic (~880 lines, vanilla)
```

Open `reference/index.html` directly in a browser — no server or build step required.

### Where to look for what

| Need | File |
|---|---|
| Colors, type, spacing, shadows, reveal contract | `assets/css/tokens.css` |
| Hero gradients, audience card art recipes | `assets/css/site.css` |
| Estimator math, map node coordinates | `assets/css/site2.css` + `assets/js/app.js` |
| Every responsive breakpoint | `assets/css/site3.css` (bottom third) |
| All Korean copy | `assets/js/data.js` |
| Reveal / counter / scroll logic | `assets/js/app.js` (lines 60–190) |
| Estimator calculation | `assets/js/app.js` (`calcEst`) |
| Map province paths & node data | `assets/js/app.js` (`PROVINCES`, `LABELS`, `VJ.regions`) |
| Film player simulation | `assets/js/app.js` (player block, ~line 700) |

---

## Before You Ship — Checklist

**Blockers (legally or functionally required):**

- [ ] Replace `000-00-00000` and `제 2026-0000호` with real registration numbers — display is mandatory for a 유료직업소개소
- [ ] Replace placeholder address, phone (`02-1234-5678`), emails
- [ ] Wire all forms to a real endpoint + add 개인정보 수집·이용 동의 checkbox (PIPA requirement)
- [ ] Connect the hero video and the brand film player to real media
- [ ] Write real 개인정보처리방침 and 이용약관 pages

**Strongly recommended:**

- [ ] Self-host Pretendard woff2
- [ ] Real i18n for all 10 locales (currently label-only)
- [ ] Verify the fee-free promise for workers is accurate for every engagement type
- [ ] Test on real iOS Safari and a low-end Android device
- [ ] Test with JS disabled — the page must remain fully readable
- [ ] Screen-reader pass on the map, modal focus return, and the estimator's live region
- [ ] `<title>`, meta description, OG image, `JobPosting` structured data for listings

**Verified in the prototype:** no console errors · no horizontal overflow at 1440/768/390 · exactly one H1 · zero elements left at opacity 0 · all 14 interactions working · reduced-motion path complete.

**Not verified:** real screen-reader usability · physical device testing · actual form submission · real video playback.

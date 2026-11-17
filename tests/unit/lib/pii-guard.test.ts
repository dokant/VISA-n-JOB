/**
 * R-012: contact pattern detection / masking (WO §11 PII 가드, BR-14).
 * Each category has positive cases (must be detected) and negative cases (must not be).
 */
import { describe, expect, it } from "vitest";

import {
  ContactInfoError,
  type ContactType,
  assertNoContacts,
  detectContacts,
  hasContacts,
  maskContacts,
} from "@/lib/pii-guard";

/** [input, expected type of the (single) detected span] */
const POSITIVE: Record<string, [string, ContactType][]> = {
  "domestic phone": [
    ["010-1234-5678", "PHONE_LOCAL"],
    ["01012345678", "PHONE_LOCAL"],
    ["010 1234 5678", "PHONE_LOCAL"],
    ["010.1234.5678", "PHONE_LOCAL"],
    ["010-1234 5678번으로 문자 주세요", "PHONE_LOCAL"],
    ["0 1 0 1 2 3 4 5 6 7 8", "PHONE_LOCAL"],
    ["연락처010-123-4567", "PHONE_LOCAL"],
    ["02-123-4567", "PHONE_LOCAL"],
    ["(02) 1234-5678", "PHONE_LOCAL"],
    ["031-123-4567", "PHONE_LOCAL"],
    ["070-1234-5678", "PHONE_LOCAL"],
    ["대표번호 1588-1234", "PHONE_LOCAL"],
    ["10-1234-5678", "PHONE_LOCAL"],
    ["공일공-1234-5678", "PHONE_LOCAL"],
    ["영일영 일이삼사 오육칠팔", "PHONE_LOCAL"],
    ["０１０－１２３４－５６７８", "PHONE_LOCAL"],
    ["(우) 06236 / 02-123-4567", "PHONE_LOCAL"],
  ],
  "international phone": [
    ["+82 10-1234-5678", "PHONE_INTL"],
    ["+82-10-1234-5678", "PHONE_INTL"],
    ["+84 912 345 678", "PHONE_INTL"],
    ["(+84) 912-345-678", "PHONE_INTL"],
    ["+7 912 345-67-89", "PHONE_INTL"],
    ["+998 90 123 45 67", "PHONE_INTL"],
    ["+86 138 0013 8000", "PHONE_INTL"],
    ["0084 912 345 678", "PHONE_INTL"],
    ["82 10 1234 5678", "PHONE_INTL"],
    ["84 912 345 678", "PHONE_INTL"],
    ["＋８２ １０ １２３４ ５６７８", "PHONE_INTL"],
  ],
  // P2a run 4 (QA run 3 D-4, O-1): numbers written to look like dates or amount ranges stay positive
  "P2a D-4 / O-1 phones disguised as dates or amounts": [
    ["010.12.01.5678", "PHONE_LOCAL"], // MM.DD is not a date form
    ["010/12/01/5678", "PHONE_LOCAL"], // a date (12/01) inside other groups
    ["010/12/1/5678", "PHONE_LOCAL"],
    ["010 2026.12.01", "PHONE_LOCAL"], // tail written as a date
    ["010-2026.12.01", "PHONE_LOCAL"],
    ["010 2026 12 01", "PHONE_LOCAL"],
    ["01/01 2345 678", "PHONE_LOCAL"],
    ["2010.1234.5678", "PHONE_LOCAL"], // one digit glued in front of 010
    ["2010-1234-5678", "PHONE_LOCAL"],
    ["0082 2026.12.01", "PHONE_INTL"],
    ["+82 2026.12.01", "PHONE_INTL"],
    ["월급 010~1234~5678원", "PHONE_LOCAL"],
    ["₩010-1234-5678", "PHONE_LOCAL"],
    ["일당 +82 10 1234 5678", "PHONE_INTL"],
    ["일당 82 10-1234-5678", "PHONE_INTL"],
    ["0082 10 1234 5678원", "PHONE_INTL"],
    ["82101-2345678", "PHONE_INTL"], // dash without an amount cue is not a range
    ["82101~2345678", "PHONE_INTL"], // ~ but the numbers do not end in 0
    ["2026.12.01→010→1234→5678", "PHONE_LOCAL"],
    ["2026. 12. 01 ~ 2027. 01. 31 문의 010 1234 5678", "PHONE_LOCAL"],
    ["일당 820000 ~ 950000, 010-1234-5678", "PHONE_LOCAL"],
  ],
  email: [
    ["hong@naver.com", "EMAIL"],
    ["hong.gd@gmail.co.kr", "EMAIL"],
    ["hong @ naver . com", "EMAIL"],
    ["메일 hong@naver 로", "EMAIL"],
    ["hong(at)gmail(dot)com", "EMAIL"],
    ["hong [at] gmail [dot] com", "EMAIL"],
    ["hong at gmail dot com", "EMAIL"],
    ["hong 골뱅이 naver 점 com", "EMAIL"],
    ["hong앳naver닷com", "EMAIL"],
    ["hong＠gmail.com", "EMAIL"],
  ],
  url: [
    ["https://example.com/a", "URL"],
    ["http://bit.ly/abc", "URL"],
    ["hxxps://evil.example.org", "URL"],
    ["www.example.co.kr", "URL"],
    ["www . example . com", "URL"],
    ["example.com", "URL"],
    ["open.kakao.com/o/abc", "URL"],
    ["t.me/hong", "URL"],
    ["zalo.me/0912345678", "URL"],
    ["wa.me/84912345678", "URL"],
    ["example(dot)com", "URL"],
    ["회사 홈페이지 visa-job.kr 참고", "URL"],
  ],
  "@handle": [
    ["@hong_gd", "HANDLE"],
    ["연락은 @hongjob 으로", "HANDLE"],
    ["SNS @hong_job99", "HANDLE"],
  ],
  "messenger id": [
    ["카톡 아이디 hong123", "MESSENGER_ID"],
    ["카톡: hong_123", "MESSENGER_ID"],
    ["카톡아이디는 hongjob입니다", "MESSENGER_ID"],
    ["카카오톡 ID hong123", "MESSENGER_ID"],
    ["kakao id: hong.gd", "MESSENGER_ID"],
    ["KakaoTalk hong123", "MESSENGER_ID"],
    ["katalk hong77", "MESSENGER_ID"],
    ["zalo 0912 345 678", "MESSENGER_ID"],
    ["Zalo: hong123", "MESSENGER_ID"],
    ["잘로 hong123", "MESSENGER_ID"],
    ["telegram @hongjob", "MESSENGER_ID"],
    ["텔레그램 hongjob", "MESSENGER_ID"],
    ["wechat: hong_wx", "MESSENGER_ID"],
    ["微信 hongwx", "MESSENGER_ID"],
    ["위챗 hongwx", "MESSENGER_ID"],
    ["viber 84912345678", "MESSENGER_ID"],
    ["whatsapp +84 912 345 678", "MESSENGER_ID"],
    ["WhatsApp: hong99", "MESSENGER_ID"],
    ["왓츠앱 hong99", "MESSENGER_ID"],
    ["телеграм hongjob", "MESSENGER_ID"],
    ["아이디 hong123", "MESSENGER_ID"],
    ["ID: hong123", "MESSENGER_ID"],
    ["hong123 (카톡)", "MESSENGER_ID"],
    ["hong123 [zalo id]", "MESSENGER_ID"],
    // P0c QA P-5: spaced letters, other SNS / messengers
    ["카 톡 abc123", "MESSENGER_ID"],
    ["k a k a o abc123", "MESSENGER_ID"],
    ["instagram hong.job", "MESSENGER_ID"],
    ["인스타 @hong.job99", "MESSENGER_ID"],
    ["fb: hong.job", "MESSENGER_ID"],
    ["skype: hong.gd", "MESSENGER_ID"],
    ["discord hong#1234", "MESSENGER_ID"],
    ["line id hong123", "MESSENGER_ID"],
    ["line id: hong123", "MESSENGER_ID"],
    ["라인 아이디 hong123", "MESSENGER_ID"],
  ],
  // P0c QA P-2 ~ P-4
  "spelled-out contacts": [
    ["naver dot com", "URL"],
    ["hong 점 naver 점 com", "URL"],
    ["대표번호 15881234", "PHONE_LOCAL"],
    ["전화: 16441234", "PHONE_LOCAL"],
    ["공1공-1234-5678", "PHONE_LOCAL"],
    ["o1o-1234-5678", "PHONE_LOCAL"],
    ["O1O 1234 5678", "PHONE_LOCAL"],
    ["010-I234-5678", "PHONE_LOCAL"],
    ["01O-l234-5678", "PHONE_LOCAL"],
    ["제로원제로 1234 5678", "PHONE_LOCAL"],
    ["zero one zero 1234 5678", "PHONE_LOCAL"],
    ["전화번호는 공일공에 일이삼사 오육칠팔", "PHONE_LOCAL"],
  ],
  // P2a QA D-1: invisible characters (Unicode Cf / default-ignorable) and other separators
  "invisible characters and other separators": [
    ["010\u200B1234\u200B5678", "PHONE_LOCAL"],
    ["010\u200C1234\u200C5678", "PHONE_LOCAL"],
    ["010\u200D1234\u200D5678", "PHONE_LOCAL"],
    ["010\u20601234\u20605678", "PHONE_LOCAL"],
    ["010\uFEFF1234\uFEFF5678", "PHONE_LOCAL"],
    ["010\u00AD1234\u00AD5678", "PHONE_LOCAL"],
    ["010\u200E1234\u200F5678", "PHONE_LOCAL"],
    ["0\u200B1\u200B0\u200B1\u200B2\u200B3\u200B4\u200B5\u200B6\u200B7\u200B8", "PHONE_LOCAL"],
    ["010\u31641234\u31645678", "PHONE_LOCAL"],
    ["생산직 010\u200B1234\u200B5678", "PHONE_LOCAL"],
    ["010_1234_5678", "PHONE_LOCAL"],
    ["010~1234~5678", "PHONE_LOCAL"],
    ["010*1234*5678", "PHONE_LOCAL"],
    ["010/1234/5678", "PHONE_LOCAL"],
    ["010+1234+5678", "PHONE_LOCAL"],
    ["010=1234=5678", "PHONE_LOCAL"],
    ["010|1234|5678", "PHONE_LOCAL"],
    ["010\\1234\\5678", "PHONE_LOCAL"],
    ["010\u22121234\u22125678", "PHONE_LOCAL"],
    ["010\u301C1234\u301C5678", "PHONE_LOCAL"],
    ["010\u00A01234\u00A05678", "PHONE_LOCAL"],
    ["010 _ 1234 _ 5678", "PHONE_LOCAL"],
    ["02_123_4567", "PHONE_LOCAL"],
    ["+84\u200B912\u200B345\u200B678", "PHONE_INTL"],
    ["⓪①⓪-1234-5678", "PHONE_LOCAL"],
    ["hong\u200B@\u200Bnaver.com", "EMAIL"],
    ["카\u200B톡 hong123", "MESSENGER_ID"],
  ],
  // P2a QA D-3: separators by Unicode category (punctuation, symbols, marks, ㅡ) and keycap digits
  "P2a D-3 separators by category and keycap digits": [
    ["010ㅡ1234ㅡ5678", "PHONE_LOCAL"],
    ["문의 010ㅡ1234ㅡ5678", "PHONE_LOCAL"],
    ["010•1234•5678", "PHONE_LOCAL"],
    ["생산직 010•1234•5678", "PHONE_LOCAL"],
    ["010・1234・5678", "PHONE_LOCAL"],
    ["010●1234●5678", "PHONE_LOCAL"],
    ["010→1234→5678", "PHONE_LOCAL"],
    ["0️⃣1️⃣0️⃣1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣", "PHONE_LOCAL"],
    ["010★1234★5678", "PHONE_LOCAL"],
    ["010 · 1234 · 5678", "PHONE_LOCAL"],
    ["010—1234—5678", "PHONE_LOCAL"],
    ["010ー1234ー5678", "PHONE_LOCAL"],
    ["010、1234、5678", "PHONE_LOCAL"],
    ["010⃣1234⃣5678", "PHONE_LOCAL"],
    ["0⃣1⃣0⃣ 1234 5678", "PHONE_LOCAL"],
    ["010※1234※5678", "PHONE_LOCAL"],
    ["010♥1234♥5678", "PHONE_LOCAL"],
    ["010»1234»5678", "PHONE_LOCAL"],
    ["＋８２　１０•１２３４•５６７８", "PHONE_INTL"],
    ["+84→912→345→678", "PHONE_INTL"],
    ["공 일 공 ㅡ 일이삼사 ㅡ 오육칠팔", "PHONE_LOCAL"],
  ],
  // P2a QA O-1: other decimal digit systems, Han numerals, jamo / NFD Hangul, English digit words
  "P2a O-1 digit systems, Han numerals, jamo and spelled numbers": [
    ["٠١٠-١٢٣٤-٥٦٧٨", "PHONE_LOCAL"],
    ["०१०-१२३४-५६७८", "PHONE_LOCAL"],
    ["۰۱۰-۱۲۳۴-۵۶۷۸", "PHONE_LOCAL"],
    ["๐๑๐-๑๒๓๔-๕๖๗๘", "PHONE_LOCAL"],
    ["٠١٠•١٢٣٤•٥٦٧٨", "PHONE_LOCAL"],
    ["零一零 一二三四 五六七八", "PHONE_LOCAL"],
    ["〇一〇-一二三四-五六七八", "PHONE_LOCAL"],
    ["010一1234一5678", "PHONE_LOCAL"],
    ["ㄱㅗㅇㅇㅣㄹㄱㅗㅇ ㅇㅣㄹㅇㅣㅅㅏㅁㅅㅏ ㅇㅗㅇㅠㄱㅊㅣㄹㅍㅏㄹ", "PHONE_LOCAL"],
    ["공일공 일이삼사 오육칠팔".normalize("NFD"), "PHONE_LOCAL"],
    ["zero one zero one two three four five six seven eight", "PHONE_LOCAL"],
    ["Zero One Zero - 1234 - five six seven eight", "PHONE_LOCAL"],
  ],
};

/** Ordinary job / profile text that must not be flagged. */
const NEGATIVE: Record<string, string[]> = {
  "pay amounts": [
    "월 2,500,000원",
    "월급 250만원",
    "연봉 3,000만원~3,500만원",
    "2,500,000-3,000,000원",
    "시급 10,030원",
    "주휴수당 포함 월 2,800,000원",
    "월 300 - 350 만원",
    "1500-2000만원",
    "연봉 36000000원",
  ],
  dates: [
    "2026-11-16",
    "2026.11.16",
    "2026/11/16",
    "2026년 11월 16일",
    "모집 기간 2026.11.16 ~ 2026.12.31",
    "2025년 3월~2026년 2월",
    "2026-11-16 09:00",
  ],
  times: [
    "근무시간 09:00-18:00",
    "08:30~17:30",
    "근무 0830 - 1730, 휴게 1200 - 1300",
    "주 5일 근무, 1일 8시간",
    "잔업 월 40시간",
  ],
  "head counts and sizes": [
    "채용 인원 3명",
    "인원 10 명",
    "기숙사 2인 1실",
    "사업장 규모 50~299인",
    "제조업(C) 10-29인",
    "만 19세 ~ 45세",
    "경력 1~3년",
  ],
  "visa codes": ["E-7-4 비자", "F-2-R 가능", "D-10, E-9, H-2", "E-9 → E-7-4 전환"],
  "postal codes and addresses": [
    "우편번호 06236",
    "서울 강남구 테헤란로 123",
    "1층 2호",
    "(우) 06236 서울특별시",
  ],
  "messenger words without an id": [
    "카톡으로 연락 주세요",
    "카톡 상담 가능",
    "카카오 페이 지급",
    "zalo 사용 가능",
    "telegram 가능",
    "라인 작업, 생산 라인 2개",
    "아이디어가 좋은 분",
    "kakaopay 결제",
    "생산 line 작업",
    "line work 경험",
    "Zalo: Nguyễn Văn An",
  ],
  // P2a QA D-1: the wider separator set must not turn dates, fractions or formulas into phones
  "dates, fractions and formulas with the wider separators": [
    "2026/11/17",
    "2026/11/17 ~ 2026/12/31",
    "기간: 2026_11_17 ~ 2027_02_28",
    "1/2",
    "3/4 + 1/2 = 5/4",
    "2 * 3 = 6",
    "10+20=30",
    "250000*12=3000000",
    "근무 09:00~18:00 | 주 5일",
    "월 250만원 | 상여 400%",
    "x_1 = 2, y_2 = 3",
    "E-9 | H-2 | F-4",
    "kakao\u200Bpay 결제",
    "생산\u200B직 3\u200B명",
    "Nguye\u0302\u0303n Va\u0306n An",
    "#1 라인 #2 라인",
  ],
  "look-alike letters and numbers without a phone keyword": [
    "주문번호 15881234",
    "Node 18 사용",
    "IoT 장비 10년",
    "No. 1 기업, Lot 2026",
    "영업 1년, 공정 2개",
    "TOPIK 1급 l 2급",
  ],
  // P2a run 3: the category-based separators must not join dates, times, amounts, lists or codes
  "P2a D-3 dates with the new separators": [
    "2026.11.17",
    "2026-11-17",
    "2026/11/17",
    "11·17",
    "11·17(화) 면접",
    "2026·11·17",
    "입사일 2026.11.17 · 교육 2026.11.24",
    "교육 2026/11/17 → 2026/11/21",
    "20261117 공고",
  ],
  "P2a D-3 times and ranges": [
    "09:00~18:00",
    "근무 09:00~18:00 (휴게 12:00~13:00)",
    "9시→18시",
    "오전 9시 → 오후 6시",
    "1일 2교대 (주간 08:00~20:00 / 야간 20:00~08:00)",
    "월~금 08:30 ~ 17:30",
    "2025~2026",
    "2025 → 2026 계약",
    "Làm việc 08:00 – 17:00",
  ],
  "P2a D-3 amounts": [
    "250만원·300만 원",
    "월 2,500,000원",
    "2,500,000원 ~ 3,000,000원",
    "₩2,500,000 × 12개월",
    "급여: 2,800,000~3,200,000원",
    "식비 ₩200,000 지원",
    "시급 10,030원 × 209시간",
    "상여 200%·성과급 별도",
    "Lương 2.500.000 KRW/tháng",
    "Зарплата 2 500 000 вон",
    "工资 二百五十万韩元",
    "٢٥٠٠٠٠٠ وون",
  ],
  "P2a D-3 list symbols, arrows, visa codes, head counts, postal codes": [
    "• 숙소 제공 • 식사 3끼",
    "● 4대보험 ● 퇴직금 ● 상여 200%",
    "★ 급구 ★ 2명 ★",
    "※ 1일 8시간 ※ 주 5일",
    "① 생산 ② 포장 ③ 검사",
    "1️⃣ 생산 2️⃣ 포장 3️⃣ 검사",
    "E-9 · H-2 · F-4",
    "E-9 • H-2 • F-4 • F-5",
    "주간 → 야간 교대",
    "E-9 → E-7-4 전환",
    "3명/5명",
    "10~20명 · 30~50명",
    "모집 3/5/10명",
    "우편번호 06236",
    "(우)06236 · 서울",
  ],
  "P2a D-3 ordinary posting phrases": [
    "정년 60세 · 경력 3~5년 우대",
    "연차 15일 · 주 52시간",
    "ISO 9001 · 14001 · 45001 인증",
    "ISO 9001:2015",
    "24시간 3조 2교대",
    "주 5일(월~금) · 토 격주",
    "제1공장 · 제2공장",
    "기숙사 2인 1실 → 1인 1실 가능",
    "잔업 월 20~40시간 ±",
    "키 170cm↑ 우대",
    "1차 · 2차 · 3차 협력사",
    "자동차 부품 3종·5종 생산",
    "No.1 → No.2 라인",
    "면적 84㎡ 기숙사",
    "График 5/2, 8 часов",
    "一二三四 공정",
    "ㅎㅎ 감사합니다 ㅋㅋㅋ",
    "ㅡㅡ 3교대 아님",
    "Tel 없음, 상담은 비자앤잡",
    "one or two shifts, five days a week",
  ],
  // P2a run 4: QA run 3 D-4 — date ranges were read as "01" + "2027" + "01" + "31"
  "P2a D-4 date ranges reported by QA run 3": [
    "근무 2026.12.01~2027.01.31",
    "2026.12.01 ~ 2027.01.31 단기",
    "2026-12-01~2027-01-31 근무",
    "2026. 12. 01 ~ 2027. 01. 31",
    "2026/12/01→2027/01/31",
    "2026.12.01-2027.01.31",
    "2026.12.01 / 2027.01.31",
    "2026.01.01~2026.03.31",
  ],
  "P2a D-4 dates in other forms": [
    "2026.01.15~2027.01.31 / 3명",
    "2026.12~2027.01",
    "2026.12 ~ 2027.01 계약",
    "2026-12 → 2027-03",
    "12/1~1/31 단기",
    "12/01 ~ 01/31",
    "1/5→2/28 교육",
    "2026.01.05 — 2026.02.28",
    "2026.01.05 – 2026.02.28",
    "2026 12 01 ~ 2027 01 31",
    "2026년 12월 1일~2027년 1월 31일",
    "2026년 12월~2027년 2월",
    "2026. 1. 5 〜 2026. 2. 28",
    "2026.12.01부터 2027.01.31까지",
    "1999.01.01~2099.12.31",
    "계약 2026/01/02~2026/12/31, 갱신 2027/01/02~2027/12/31",
    "２０２６．１２．０１～２０２７．０１．３１",
    "2019-2020-2021 수상",
    "입사 2026.12.01 · 수습 3개월 · 2027.03.01 정규직",
    "08:00~17:00 (2026.12.01~2027.01.31)",
    "면접 10:00 2026.12.01 본사",
  ],
  "P2a O-1 amount ranges without commas": [
    "일당 820000 ~ 950000",
    "일당 820000~950000원",
    "일당 820000 ~ 950000원",
    "월급 2500000-3100000원",
    "월급 2500000 ~ 3100000",
    "₩820000~₩950000",
    "82000 ~ 95000",
    "시급 10030~12000원",
    "연봉 36000000 → 42000000",
    "급여 2800000〜3200000",
    "일당 82000 – 95000원",
  ],
  "other text": [
    "Node.js 경험",
    "settings 변경",
    "연락 주세요 at 5pm. Thanks",
    "4대보험 가입",
    "TOPIK 3급 이상",
    "3.5배",
    "No. 1 기업",
    "",
  ],
};

describe("R-012 pii-guard", () => {
  for (const [category, cases] of Object.entries(POSITIVE)) {
    it(`R-012 positive: ${category} (${cases.length})`, () => {
      for (const [text, type] of cases) {
        const found = detectContacts(text);
        expect(found, text).toHaveLength(1);
        expect(found[0].type, text).toBe(type);
        expect(hasContacts(text), text).toBe(true);
        expect(maskContacts(text), text).toContain("***");
      }
    });
  }

  for (const [category, cases] of Object.entries(NEGATIVE)) {
    it(`R-012 negative: ${category} (${cases.length})`, () => {
      for (const text of cases) {
        expect(detectContacts(text), text).toEqual([]);
        expect(maskContacts(text)).toBe(text);
        expect(() => assertNoContacts(text)).not.toThrow();
      }
    });
  }

  it("finds several contacts in one text with correct offsets and masks only them", () => {
    const text = "급여 월 2,500,000원. 전화 010-1234-5678 또는 hong@naver.com, 카톡 hongjob";
    const found = detectContacts(text);
    expect(found.map((f) => f.type)).toEqual(["PHONE_LOCAL", "EMAIL", "MESSENGER_ID"]);
    for (const f of found) expect(text.slice(f.start, f.end)).toBe(f.value);
    expect(maskContacts(text)).toBe("급여 월 2,500,000원. 전화 *** 또는 ***, ***");
    expect(maskContacts(text, "[삭제]")).toContain("[삭제]");
  });

  it("P0c QA P-1: a Vietnamese name after 'Zalo:' is kept whole, only the number is masked", () => {
    const text = "Liên hệ Zalo: Nguyễn 0912-345-678";
    const found = detectContacts(text);
    expect(found.map((f) => f.type)).toEqual(["PHONE_LOCAL"]);
    expect(maskContacts(text)).toBe("Liên hệ Zalo: Nguyễn ***");
    // a real id right after the keyword is still an id
    expect(maskContacts("Liên hệ Zalo: nguyen99 nhé")).toBe("Liên hệ *** nhé");
  });

  it("P0c QA P-4: look-alike characters keep the original text in the reported value", () => {
    const [m] = detectContacts("문의 o1o-I234-5678 주세요");
    expect(m).toMatchObject({ type: "PHONE_LOCAL", value: "o1o-I234-5678" });
    expect(maskContacts("문의 o1o-I234-5678 주세요")).toBe("문의 *** 주세요");
  });

  it("P2a QA D-1: invisible characters are masked with the number, offsets refer to the input", () => {
    const text = "생산직 010\u200B1234\u200B5678 연락, 메일 hong\u200B@naver.com 끝";
    const found = detectContacts(text);
    expect(found.map((f) => f.type)).toEqual(["PHONE_LOCAL", "EMAIL"]);
    for (const f of found) expect(text.slice(f.start, f.end)).toBe(f.value);
    expect(found[0].value).toBe("010\u200B1234\u200B5678");
    expect(maskContacts(text)).toBe("생산직 *** 연락, 메일 *** 끝");
    // a character that NFKC expands (㈜ → "(주)") keeps later offsets on the input
    const wide = "㈜ 공장 ０１０－１２３４－５６７８ 문의";
    expect(maskContacts(wide)).toBe("㈜ 공장 *** 문의");
    // astral characters before the number do not shift the mask
    expect(maskContacts("😀 010_1234_5678 😀")).toBe("😀 *** 😀");
  });

  it("P2a QA D-3 / O-1: masks keep the input offsets after jamo composition, keycaps and digit mapping", () => {
    const keycap = "0️⃣1️⃣0️⃣1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣";
    const jamo = "ㄱㅗㅇㅇㅣㄹㄱㅗㅇ ㅇㅣㄹㅇㅣㅅㅏㅁㅅㅏ ㅇㅗㅇㅠㄱㅊㅣㄹㅍㅏㄹ";
    const nfd = "공일공 일이삼사 오육칠팔".normalize("NFD");
    const text = `• 숙소 제공 문의 010ㅡ1234ㅡ5678 / ${keycap} 끝 ${jamo} 그리고 ${nfd} · ٠١٠-١٢٣٤-٥٦٧٨ 월 2,500,000원 09:00~18:00`;
    const found = detectContacts(text);
    expect(found.map((f) => f.type)).toEqual(Array(5).fill("PHONE_LOCAL"));
    for (const f of found) expect(text.slice(f.start, f.end)).toBe(f.value);
    expect(found.map((f) => f.value)).toEqual([
      "010ㅡ1234ㅡ5678",
      keycap,
      jamo,
      nfd,
      "٠١٠-١٢٣٤-٥٦٧٨",
    ]);
    expect(maskContacts(text)).toBe(
      "• 숙소 제공 문의 *** / *** 끝 *** 그리고 *** · *** 월 2,500,000원 09:00~18:00",
    );
    // a jamo word next to the number is not swallowed into the mask
    expect(maskContacts("ㅎㅎ 010•1234•5678 ㅋㅋ")).toBe("ㅎㅎ *** ㅋㅋ");
  });

  it("P2a QA O-3 (design limit, kept): commas, colons, letters or 4+ separators between groups", () => {
    // Widening these would turn amounts ("1,500,2,000"), times ("09:00:00") and numbered text into
    // phone numbers, so they stay undetected on purpose (pii-guard SEP comment).
    for (const text of [
      "010,1234,5678",
      "010:1234:5678",
      "010번 1234번 5678",
      "010 -_ 1234 -_ 5678",
    ]) {
      expect(detectContacts(text), text).toEqual([]);
    }
  });

  it("P2a QA run 3 D-4: date tokens use the same input offsets as the phone they sit next to", () => {
    const text =
      "２０２６．１２．０１～２０２７．０１．３１ 문의 ０１０ 1234 5678, 일당 820000~950000원";
    const found = detectContacts(text);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ type: "PHONE_LOCAL", value: "０１０ 1234 5678" });
    expect(text.slice(found[0].start, found[0].end)).toBe("０１０ 1234 5678");
    expect(maskContacts(text)).toBe(
      "２０２６．１２．０１～２０２７．０１．３１ 문의 ***, 일당 820000~950000원",
    );
    // a date glued to a number is masked with it
    expect(maskContacts("앞 010 2026.12.01 뒤 2026.12.01~2027.01.31")).toBe(
      "앞 *** 뒤 2026.12.01~2027.01.31",
    );
  });

  it("an e-mail is reported once, not also as URL / handle", () => {
    const found = detectContacts("문의: hong@naver.com");
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ type: "EMAIL", value: "hong@naver.com" });
  });

  it("assertNoContacts throws a 422 CONTACT_INFO_DETECTED error with the types found", () => {
    try {
      assertNoContacts("010-1234-5678 / https://example.com", "detail");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ContactInfoError);
      const err = e as ContactInfoError;
      expect(err.status).toBe(422);
      expect(err.code).toBe("CONTACT_INFO_DETECTED");
      expect(err.field).toBe("detail");
      expect(err.types.sort()).toEqual(["PHONE_LOCAL", "URL"]);
      expect(err.toBody().error.code).toBe("CONTACT_INFO_DETECTED");
      expect(err.message).not.toContain("1234");
    }
    expect(() => assertNoContacts("hong@naver.com")).toThrow(/contact information is not allowed:/);
  });
});

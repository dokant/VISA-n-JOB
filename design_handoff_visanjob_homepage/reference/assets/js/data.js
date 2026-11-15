/* VISANJOB — content data */
window.VJ = {
  langs: [
    { code: "ko", label: "한국어", native: "한국어", tag: "KO" },
    { code: "en", label: "English", native: "English", tag: "EN" },
    { code: "vi", label: "Tiếng Việt", native: "Tiếng Việt", tag: "VI" },
    { code: "th", label: "ภาษาไทย", native: "ภาษาไทย", tag: "TH" },
    { code: "id", label: "Bahasa Indonesia", native: "Bahasa Indonesia", tag: "ID" },
    { code: "uz", label: "Oʻzbekcha", native: "Oʻzbekcha", tag: "UZ" },
    { code: "ne", label: "नेपाली", native: "नेपाली", tag: "NE" },
    { code: "km", label: "ភាសាខ្មែរ", native: "ភាសាខ្មែរ", tag: "KM" },
    { code: "mn", label: "Монгол", native: "Монгол", tag: "MN" },
    { code: "my", label: "Bahasa Melayu", native: "Bahasa Melayu", tag: "MY" }
  ],

  audiences: {
    employer: {
      kicker: "For Employers",
      title: "기업을 위한 채용",
      sub: "For Employers · B2B",
      desc: "제조·건설·농축산·조선 현장에 맞는 외국인 인력을 비자 적합성 검토부터 사후관리까지 한 곳에서.",
      stat: "1,240",
      statLabel: "협력 기업",
      panelTitle: "사업주님이 지금 확인하실 내용",
      panelDesc: "인력 부족 현장의 평균 채용 소요 기간은 5.8주입니다. 상담 한 번으로 예상 일정과 비용을 받아보세요.",
      list: ["비자 유형별 적법성 사전 검토", "산업별 인력 풀 12,400명 보유", "입국 후 90일 정착 케어 포함"],
      cta: "인력 요청하기",
      cta2: "비용·기간 계산"
    },
    partner: {
      kicker: "For Regional Partners",
      title: "지역 협력기관",
      sub: "For Partners · B2B Network",
      desc: "전국 68개 지역 유료직업소개소와 구인·구직 풀을 공유합니다. 수수료 정산은 투명하게, 매칭은 빠르게.",
      stat: "68",
      statLabel: "지역 협력기관",
      panelTitle: "지역 협력기관과 함께하는 방식",
      panelDesc: "서울 본사가 법무·비자 리스크를 지고, 지역 기관은 현장과 인재를 잇습니다. 수익 배분은 계약서에 명시됩니다.",
      list: ["구인·구직 풀 실시간 공유", "매칭 수수료 최대 6:4 배분", "비자 서류 검토 본사 지원"],
      cta: "파트너 신청",
      cta2: "배분 구조 보기"
    },
    seeker: {
      kicker: "For Job Seekers",
      title: "일자리를 찾는 분들께",
      sub: "For Job Seekers · B2C",
      desc: "내 비자로 지원할 수 있는 일자리만 모았습니다. 모국어로 확인하고, 카카오톡·왓츠앱으로 바로 문의하세요.",
      stat: "10개 언어",
      statLabel: "모국어 상담",
      panelTitle: "내 비자에 맞는 일자리 찾기",
      panelDesc: "비자·지역·업종을 고르면 지원 가능한 공고만 보여드립니다. 서류는 사진 한 장으로 시작할 수 있습니다.",
      list: ["비자별 지원 가능 공고만 필터링", "10개 언어 모국어 상담", "소개 수수료 근로자 부담 없음"],
      cta: "일자리 찾기",
      cta2: "상담 채널 열기"
    }
  },

  visas: [
    {
      code: "E-7",
      name: "특정활동",
      en: "Professional / Specially Designated Activities",
      desc: "전문 인력과 준전문 인력을 위한 비자입니다. 학력·경력 요건을 충족하면 제조·IT·서비스 전반에 걸쳐 장기 고용이 가능합니다.",
      facts: [["체류 기간", "최대 3년 + 연장"], ["고용 허가", "사업장별 사전 승인"], ["평균 매칭", "5.4주"]],
      industries: ["정밀 제조", "IT·소프트웨어", "조선·해양", "호텔·F&B", "엔지니어링", "물류"],
      roles: ["기계설비 엔지니어", "CNC·용접 기술자", "전기·제어 엔지니어", "호텔 F&B 매니저"],
      notes: [
        ["학력·경력 증빙이 핵심", "관련 학위 또는 5년 이상 경력 증명서가 필요합니다. 번역 공증은 저희가 대행합니다."],
        ["직무와 학력의 일치", "법무부 심사에서 직무-전공 불일치는 주요 반려 사유입니다. 사전 적합성 검토를 거칩니다."],
        ["가족 동반 가능", "숙련도·소득 요건 충족 시 배우자(F-3)와 자녀 동반이 가능합니다."]
      ]
    },
    {
      code: "E-9",
      name: "비전문취업",
      en: "Non-professional Employment (EPS)",
      desc: "고용허가제(EPS)를 통해 제조·건설·농축산·어업 현장에 투입되는 인력입니다. 16개국 송출기관과 연계합니다.",
      facts: [["체류 기간", "최대 4년 10개월"], ["고용 허가", "고용센터 허가 필수"], ["평균 매칭", "7.2주"]],
      industries: ["일반 제조", "건설", "농축산", "어업", "서비스(음식점)", "포장·물류"],
      roles: ["생산·조립 인력", "건설 보조", "농업 작업자", "주방 보조"],
      notes: [
        ["사업장 변경 제한", "원칙적으로 최초 허가 사업장에서 근무해야 하며, 변경은 법정 사유에 한합니다."],
        ["EPS 한국어시험", "선발 단계에서 EPS-TOPIK 응시가 필요합니다. 사전 학습 지원을 제공합니다."],
        ["정착률 관리", "기숙사·식사·현장 적응까지 온보딩 4주 프로그램을 운영합니다."]
      ]
    },
    {
      code: "H-2",
      name: "방문취업",
      en: "Working Visit (Overseas Korean)",
      desc: "재외동포를 위한 취업 비자입니다. 건설·제조·서비스·물류 현장에서 즉시 투입 가능한 경우가 많습니다.",
      facts: [["체류 기간", "최대 3년"], ["고용 허가", "취업 가능 업종 한정"], ["평균 매칭", "3.1주"]],
      industries: ["건설", "제조 가공", "서비스", "물류·운송", "식품 가공", "청소·시설"],
      roles: ["현장 기능 인력", "용접·배관 보조", "물류 상하차", "서비스 스태프"],
      notes: [
        ["즉시 투입 가능", "국내 체류 중인 경우가 많아 매칭 후 2~3주 내 근무 시작이 가능합니다."],
        ["업종 제한 확인", "법무부 고시 업종만 취업할 수 있어 사전 확인이 필요합니다."],
        ["동포 네트워크", "중국·CIS 지역 동포 커뮤니티와 직접 연결되어 있어 현장 적응이 빠릅니다."]
      ]
    },
    {
      code: "F-2",
      name: "거주",
      en: "Residence",
      desc: "체류 자격이 안정된 거주 비자로, 업종·사업장 제한 없이 자유롭게 취업할 수 있습니다.",
      facts: [["체류 기간", "3년 단위 갱신"], ["고용 허가", "불필요"], ["평균 매칭", "2.4주"]],
      industries: ["전 업종", "전문직", "사무·영업", "제조 관리", "서비스 관리"],
      roles: ["생산 관리자", "통역·코디네이터", "영업·CS", "기술 지원"],
      notes: [
        ["업종 제한 없음", "고용허가 절차가 없어 채용 절차가 가장 짧습니다."],
        ["장기 고용에 유리", "정주 의사가 있는 인력이 많아 장기 근속률이 높습니다."],
        ["관리자급 매칭", "통역·현장 관리·품질 관리 포지션에 특히 강점이 있습니다."]
      ]
    },
    {
      code: "F-4",
      name: "재외동포",
      en: "Overseas Korean",
      desc: "외국 국적 재외동포 대상 비자입니다. 단순 노무 일부 업종을 제외하고 폭넓게 취업할 수 있습니다.",
      facts: [["체류 기간", "최대 2년 + 연장"], ["고용 허가", "일부 업종 제외"], ["평균 매칭", "3.6주"]],
      industries: ["제조", "건설", "IT", "서비스", "무역", "교육"],
      roles: ["기술 인력", "통역·번역", "사무 보조", "현장 관리"],
      notes: [
        ["단순 노무 제한", "일부 단순 노무 업종은 취업이 제한되므로 사전 확인이 필요합니다."],
        ["언어 강점", "한국어 의사소통이 가능한 경우가 많아 관리 포지션 매칭이 활발합니다."],
        ["가족 초청 연계", "장기 체류 요건 충족 시 가족 초청 절차를 함께 안내합니다."]
      ]
    },
    {
      code: "F-5·F-6",
      name: "영주·결혼이민",
      en: "Permanent Residence / Marriage Immigrant",
      desc: "영주권자와 결혼이민자는 취업 제한이 사실상 없습니다. 장기 근속과 관리자 승진에 가장 적합한 인력입니다.",
      facts: [["체류 기간", "영구 / 3년 갱신"], ["고용 허가", "불필요"], ["평균 매칭", "2.0주"]],
      industries: ["전 업종", "생산 관리", "유통·물류", "돌봄·서비스", "교육"],
      roles: ["현장 관리자", "품질·공정 관리", "고객 응대", "물류 운영"],
      notes: [
        ["채용 리스크 최소", "체류 자격이 안정적이어서 장기 고용 리스크가 가장 낮습니다."],
        ["승진 트랙 운영", "관리자·반장 승진 사례가 많아 조직 안정화에 기여합니다."],
        ["지역 정착 지원", "주거·자녀 교육 정보까지 정착 패키지로 안내합니다."]
      ]
    }
  ],

  regions: [
    { id: "seoul", name: "서울 · 송파", x: 200, y: 182, partners: 12, jobs: 184, hub: true, note: "본사" },
    { id: "incheon", name: "인천", x: 146, y: 188, partners: 5, jobs: 62 },
    { id: "gyeonggi", name: "경기 남부", x: 218, y: 214, partners: 9, jobs: 148 },
    { id: "gangwon", name: "강원", x: 300, y: 168, partners: 4, jobs: 31 },
    { id: "chungbuk", name: "충북", x: 252, y: 262, partners: 5, jobs: 57 },
    { id: "chungnam", name: "충남", x: 200, y: 274, partners: 6, jobs: 73 },
    { id: "daejeon", name: "대전", x: 234, y: 296, partners: 3, jobs: 44 },
    { id: "jeonbuk", name: "전북", x: 214, y: 366, partners: 5, jobs: 51 },
    { id: "gwangju", name: "광주", x: 194, y: 416, partners: 3, jobs: 38 },
    { id: "jeonnam", name: "전남", x: 160, y: 470, partners: 4, jobs: 36 },
    { id: "gyeongbuk", name: "경북", x: 328, y: 288, partners: 6, jobs: 88 },
    { id: "daegu", name: "대구", x: 320, y: 352, partners: 3, jobs: 46 },
    { id: "ulsan", name: "울산", x: 384, y: 408, partners: 3, jobs: 52 },
    { id: "gyeongnam", name: "경남", x: 344, y: 434, partners: 5, jobs: 79 },
    { id: "busan", name: "부산", x: 392, y: 470, partners: 4, jobs: 96 },
    { id: "jeju", name: "제주", x: 196, y: 592, partners: 2, jobs: 17 }
  ],

  candidates: [
    { id: "VN-2418", flag: "VN", country: "베트남", visa: "E-9", job: "CNC 선반 오퍼레이터", exp: "4년", korean: "EPS 2급", koreanLvl: 3, skills: ["CNC", "도면 해독", "품질 검사"] },
    { id: "NP-1907", flag: "NP", country: "네팔", visa: "E-9", job: "용접 보조 · 구조물", exp: "5년", korean: "EPS 3급", koreanLvl: 4, skills: ["CO2 용접", "안전관리"] },
    { id: "UZ-3302", flag: "UZ", country: "우즈베키스탄", visa: "E-7", job: "전기 제어 엔지니어", exp: "7년", korean: "TOPIK 4급", koreanLvl: 4, skills: ["PLC", "전기기사", "CAD"] },
    { id: "KH-1122", flag: "KH", country: "캄보디아", visa: "E-9", job: "식품 포장 라인", exp: "3년", korean: "EPS 2급", koreanLvl: 2, skills: ["HACCP", "포장 설비"] },
    { id: "TH-2055", flag: "TH", country: "태국", visa: "E-7", job: "호텔 F&B 스태프", exp: "6년", korean: "TOPIK 5급", koreanLvl: 5, skills: ["서비스", "영어·태국어"] },
    { id: "CN-0918", flag: "CN", country: "중국(조선족)", visa: "H-2", job: "배관 · 설비 시공", exp: "9년", korean: "원어민 수준", koreanLvl: 5, skills: ["배관", "용접", "현장 관리"] },
    { id: "ID-4471", flag: "ID", country: "인도네시아", visa: "E-9", job: "조립 · 생산직", exp: "2년", korean: "EPS 2급", koreanLvl: 2, skills: ["조립", "검사"] },
    { id: "MN-2733", flag: "MN", country: "몽골", visa: "E-9", job: "농축산 작업", exp: "4년", korean: "EPS 3급", koreanLvl: 3, skills: ["축산", "트랙터"] },
    { id: "VN-3180", flag: "VN", country: "베트남", visa: "F-2", job: "생산 관리자", exp: "8년", korean: "TOPIK 5급", koreanLvl: 5, skills: ["공정관리", "통역", "품질"] },
    { id: "PH-2251", flag: "PH", country: "필리핀", visa: "E-7", job: "품질 검사원", exp: "5년", korean: "TOPIK 3급", koreanLvl: 3, skills: ["QC", "측정", "리포트"] }
  ],

  jobs: [
    { t: "CNC 선반 오퍼레이터", co: "한성정밀", region: "gyeonggi", industry: "manufacturing", visas: ["E-9", "E-7", "H-2", "F-2"], pay: "월 320만원", note: "경기 화성 · 기숙사 제공" },
    { t: "조선 블록 용접", co: "태평양조선", region: "ulsan", industry: "shipbuilding", visas: ["E-7", "H-2", "F-4"], pay: "월 410만원", note: "울산 동구 · 숙련 우대" },
    { t: "농산물 선별·포장", co: "그린팜 영농조합", region: "jeonnam", industry: "agriculture", visas: ["E-9", "H-2", "F-2"], pay: "월 265만원", note: "전남 나주 · 통근 버스" },
    { t: "자동차 부품 조립", co: "대양기계", region: "gyeongnam", industry: "manufacturing", visas: ["E-9", "H-2", "F-2", "F-5·F-6"], pay: "월 305만원", note: "경남 창원 · 주 5일" },
    { t: "호텔 조식 조리 보조", co: "노보텔 스위트", region: "busan", industry: "service", visas: ["E-7", "F-2", "F-4", "F-5·F-6"], pay: "월 290만원", note: "부산 해운대 · 조식조" },
    { t: "건설 철근·형틀 보조", co: "부광산업", region: "incheon", industry: "construction", visas: ["H-2", "E-9", "F-4"], pay: "일 19만원", note: "인천 송도 · 현장 3곳" },
    { t: "물류 상하차·피킹", co: "한백물류", region: "chungbuk", industry: "logistics", visas: ["H-2", "F-2", "F-4", "F-5·F-6"], pay: "월 295만원", note: "충북 청주 · 야간 선택" },
    { t: "식품 가공 라인", co: "아름식품", region: "chungnam", industry: "manufacturing", visas: ["E-9", "H-2", "F-2"], pay: "월 278만원", note: "충남 천안 · 기숙사" },
    { t: "스마트팜 운영 보조", co: "그린팜 영농조합", region: "gangwon", industry: "agriculture", visas: ["E-9", "F-2", "F-4"], pay: "월 272만원", note: "강원 평창 · 주거 제공" }
  ],

  cases: [
    {
      tag: "제조 · 경기 화성",
      title: "3개월째 라인이 비던 정밀가공 공장, 6주 만에 12명 충원",
      metrics: [["12명", "충원 인원"], ["6주", "소요 기간"], ["96%", "90일 정착률"]],
      warm: false
    },
    {
      tag: "조선 · 울산",
      title: "용접 숙련 인력 8명, E-7로 장기 고용 전환",
      metrics: [["8명", "E-7 전환"], ["2.1년", "평균 근속"], ["-38%", "재채용 비용"]],
      warm: true
    },
    {
      tag: "농축산 · 전남 나주",
      title: "지역 협력기관과 함께 성수기 인력 40명 매칭",
      metrics: [["40명", "성수기 매칭"], ["9일", "최단 매칭"], ["4곳", "협력기관"]],
      warm: false
    }
  ],

  testimonials: [
    { name: "응우옌 반 남", meta: "베트남 · E-9 · 경기 화성", quote: "처음엔 한국어가 두려웠는데, 통역 선생님과 함께 첫 주를 보내니 마음이 놓였어요.", time: "2:14", cap: "VN" },
    { name: "수흐바타르 벌간", meta: "몽골 · E-9 · 충남 천안", quote: "기숙사와 식사까지 미리 확인하고 왔습니다. 가족에게 보낼 돈을 계산할 수 있었어요.", time: "1:48", cap: "MN" },
    { name: "산토스 마리아", meta: "필리핀 · E-7 · 부산 해운대", quote: "제 비자에 맞는 일만 보여줘서 시간을 아꼈습니다. 지금은 팀 리더로 일하고 있어요.", time: "3:02", cap: "PH" }
  ],

  insights: [
    { cat: "노동법", catClass: "badge--blue", title: "2026년 외국인 고용 사업장 변경 사유, 무엇이 달라졌나", desc: "사업장 변경 허용 사유가 5개 항목으로 정비되었습니다. 현장에서 자주 발생하는 계약 종료·임금 체불 케이스를 정리했습니다.", date: "2026.11.04", read: "6분" },
    { cat: "비자 정책", catClass: "badge--cyan", title: "E-7-1 첨단산업 직종 확대, 제조업 적용 범위", desc: "첨단산업·신산업 분야 E-7 직종이 확대되면서 중소 제조기업의 전문인력 채용 문턱이 낮아졌습니다.", date: "2026.10.22", read: "4분" },
    { cat: "채용 가이드", catClass: "badge--orange", title: "외국인 근로자 온보딩 첫 4주, 정착률을 결정한다", desc: "입국 직후 4주간의 기숙사·식사·직무교육 설계가 90일 정착률에 미치는 영향을 데이터로 확인했습니다.", date: "2026.10.09", read: "8분" }
  ],

  logos: [
    { n: "한성정밀", k: "sq" }, { n: "대양기계", k: "ci" }, { n: "SUNJIN STEEL", k: "di" },
    { n: "태평양조선", k: "sq" }, { n: "NEXA ROBOTICS", k: "ci" }, { n: "부광산업", k: "di" },
    { n: "그린팜", k: "ci" }, { n: "한백물류", k: "sq" }, { n: "아름식품", k: "di" }
  ],

  player: {
    title: "VISANJOB — Bridging Global Talent",
    sub: "2026 브랜드 필름 · 1분 32초",
    duration: 92,
    cues: [
      { at: 0, text: "지금, 대한민국의 산업 현장은 새로운 인력을 기다리고 있습니다." },
      { at: 16, text: "VISANJOB은 16개국 인재와 1,240개 기업을 연결해 왔습니다." },
      { at: 36, text: "비자 적합성 검토부터 입국, 정착까지 — 한 곳에서." },
      { at: 58, text: "서울 송파에서, 전국 68개 지역 협력기관과 함께." },
      { at: 78, text: "가장 확실한 다리, VISANJOB." }
    ]
  }
};

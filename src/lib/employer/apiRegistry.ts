/**
 * Registry of everything an employer can call (PRD R-206, WO §15-2, PLAN P2b 위험 "기업용 API
 * 전수"). The leak test (tests/unit/lib/employer/employerApiLeak.test.ts) calls every entry and
 * scans each response for phone / e-mail patterns, and it fails when a Route Handler under
 * `src/app/api/employer/**` or a server action file under `src/server/actions/employer/**` is not
 * listed here. Adding an employer endpoint therefore means adding it here (and to the test).
 */
export const EMPLOYER_ROUTE_HANDLERS = [
  {
    file: "src/app/api/employer/candidates/route.ts",
    path: "/api/employer/candidates",
    methods: ["GET"],
  },
] as const;

export const EMPLOYER_SERVER_ACTIONS = [
  { file: "src/server/actions/employer/account.ts", exports: ["signUpEmployer", "signInEmployer"] },
  { file: "src/server/actions/employer/diagnosis.ts", exports: ["submitDiagnosis"] },
  { file: "src/server/actions/employer/request.ts", exports: ["submitJobRequestAction"] },
  {
    file: "src/server/actions/employer/candidates.ts",
    exports: ["requestCandidateInterviewAction"],
  },
  { file: "src/server/actions/employer/contract.ts", exports: ["signContractAction"] },
] as const;

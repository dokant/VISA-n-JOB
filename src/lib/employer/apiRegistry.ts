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
  {
    file: "src/app/api/employer/requests/route.ts",
    path: "/api/employer/requests",
    methods: ["GET"],
  },
] as const;

/**
 * The one exception to "no seeker personal data in employer responses" (PRD R-211 v1.1, PC-1):
 * the real name of a seeker who gave THIRD_PARTY_INTERVIEW consent for a confirmed interview of the
 * asking company. It may appear ONLY
 * - in the responses of the `entry` listed here,
 * - at the JSON path `path` (`[]` = any array element), as the value built by
 *   src/lib/serializers/interviewDisclosure.ts (key set `INTERVIEW_DISCLOSURE_FIELDS`),
 * - for interviews whose consent is active (the leak harness checks the name against the consented
 *   seekers of the test and requires null everywhere else).
 * Phone numbers and e-mail addresses have no exception: the harness still scans the whole body
 * (the name included) for them, and contacts are never selected for employers.
 */
export const EMPLOYER_NAME_DISCLOSURE = [
  {
    entry: "src/app/api/employer/requests/route.ts",
    path: "recommendations[].interviews[].disclosure.legalName",
    condition:
      "THIRD_PARTY_INTERVIEW consent active for this interview + CONFIRMED + no final result (Q-25) + same company",
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

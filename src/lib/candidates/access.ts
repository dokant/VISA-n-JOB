/**
 * Who may see the blind candidate list (WO §9.3, PRD R-205, R-218).
 *
 * `LIST`: the company is verified by staff (`verified`, R-218) and has a service contract
 * (`contractSignedAt`, R-208 / R-218). Anything else is `STATS`: the summary counts only (PC-11).
 */
import { db } from "@/lib/db";

export type CandidateAccess = {
  level: "LIST" | "STATS";
  verified: boolean;
  contracted: boolean;
};

type Client = Pick<typeof db, "company">;

export async function candidateAccessOf(
  companyId: string,
  client: Client = db,
): Promise<CandidateAccess> {
  const company = await client.company.findUnique({
    where: { id: companyId },
    select: { verified: true, contractSignedAt: true },
  });
  const verified = company?.verified === true;
  const contracted = company?.contractSignedAt != null;
  return { level: verified && contracted ? "LIST" : "STATS", verified, contracted };
}

/**
 * R-009: `*Enc` fields (+ User.totpSecret) are encrypted by the Prisma extension in src/lib/db.ts.
 * Raw SQL sees only ciphertext; app queries get plaintext back. Covers nested writes and createMany.
 */
import { inject } from "vitest";
import { afterAll, describe, expect, it } from "vitest";

import { db, encryptArgs, encryptedFieldsOf, withEncryption } from "@/lib/db";

import { testPrisma, uniq } from "../db/helpers";

const base = testPrisma();
const prisma = withEncryption(base);
afterAll(async () => {
  await base.$disconnect();
});

const CIPHER = /^v[0-9]+:[A-Za-z0-9_-]+$/;

type RawRow = Record<string, string | null>;

/** Reads columns with raw SQL (bypasses the extension). Table / column names are test constants. */
async function raw(table: string, id: string, columns: string[]): Promise<RawRow> {
  const cols = columns.map((c) => `"${c}"`).join(", ");
  const rows = await base.$queryRawUnsafe<RawRow[]>(
    `SELECT ${cols} FROM "${table}" WHERE "id" = $1`,
    id,
  );
  expect(rows).toHaveLength(1);
  return rows[0];
}

function expectCipher(row: RawRow, plain: Record<string, string>): void {
  for (const [col, value] of Object.entries(plain)) {
    expect(row[col]).toMatch(CIPHER);
    expect(row[col]).not.toContain(value);
  }
}

function seekerData(phone: string) {
  return {
    sido: "SEOUL",
    visaCode: "F-4",
    skills: [],
    licenses: [],
    desiredIndustries: [],
    desiredRegions: [],
    consultTime: [],
    track: "JOB_MATCH" as const,
    referralCode: uniq("ref"),
    legalNameEnc: "홍길동",
    messengerIdEnc: `zalo-${phone}`,
    emailEnc: "hong@example.com",
    schoolNameEnc: "하노이대학교",
  };
}

describe("R-009 *Enc auto-encryption extension", () => {
  it("knows the encrypted fields, including User.totpSecret", () => {
    expect(encryptedFieldsOf("User").sort()).toEqual(["phoneEnc", "totpSecret"]);
    expect(encryptedFieldsOf("SeekerProfile").sort()).toEqual([
      "emailEnc",
      "legalNameEnc",
      "messengerIdEnc",
      "schoolNameEnc",
    ]);
    expect(encryptedFieldsOf("Company").sort()).toEqual(["bizRegNoEnc", "nameEnc"]);
    expect(encryptedFieldsOf("JobLead").sort()).toEqual([
      "contactEmailEnc",
      "contactNameEnc",
      "contactPhoneEnc",
    ]);
    expect(encryptedFieldsOf("WorkExperience")).toEqual(["employerNameEnc"]);
    expect(encryptedFieldsOf("AuditLog")).toEqual([]);
    expect(encryptedFieldsOf("NoSuchModel")).toEqual([]);
  });

  it("R-009: create with nested create / createMany — raw SQL has no plaintext, app reads plaintext", async () => {
    const phone = "+821012345678";
    const user = await prisma.user.create({
      data: {
        role: "SEEKER",
        phoneEnc: phone,
        phoneHash: uniq("hash"),
        totpSecret: "JBSWY3DPEHPK3PXP",
        seeker: {
          create: {
            ...seekerData(phone),
            experiences: {
              create: [
                {
                  country: "VN",
                  industryCode: "C",
                  role: "용접",
                  months: 24,
                  employerNameEnc: "Công ty A",
                },
              ],
              createMany: {
                data: [
                  {
                    country: "KR",
                    industryCode: "C",
                    role: "조립",
                    months: 6,
                    employerNameEnc: "대한산업",
                  },
                ],
              },
            },
          },
        },
      },
      include: { seeker: { include: { experiences: true } } },
    });

    // returned values are plaintext
    expect(user.phoneEnc).toBe(phone);
    expect(user.totpSecret).toBe("JBSWY3DPEHPK3PXP");
    expect(user.seeker?.legalNameEnc).toBe("홍길동");
    expect(user.seeker?.experiences.map((w) => w.employerNameEnc).sort()).toEqual([
      "Công ty A",
      "대한산업",
    ]);

    // database holds ciphertext only
    expectCipher(await raw("User", user.id, ["phoneEnc", "totpSecret"]), {
      phoneEnc: phone,
      totpSecret: "JBSWY3DPEHPK3PXP",
    });
    const seekerId = user.seeker?.id as string;
    expectCipher(
      await raw("SeekerProfile", seekerId, [
        "legalNameEnc",
        "messengerIdEnc",
        "emailEnc",
        "schoolNameEnc",
      ]),
      {
        legalNameEnc: "홍길동",
        messengerIdEnc: "zalo",
        emailEnc: "hong@example.com",
        schoolNameEnc: "하노이대학교",
      },
    );
    for (const w of user.seeker?.experiences ?? []) {
      const row = await raw("WorkExperience", w.id, ["employerNameEnc"]);
      expect(row.employerNameEnc).toMatch(CIPHER);
    }
    // full-table scan: no plaintext anywhere in the encrypted columns
    const leaks = await base.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*)::bigint AS n FROM "SeekerProfile"
       WHERE "legalNameEnc" LIKE '%홍길동%' OR "emailEnc" LIKE '%@%' OR "messengerIdEnc" LIKE '%zalo%'`,
    );
    expect(Number(leaks[0].n)).toBe(0);

    // find* with include / select decrypts nested relations
    const found = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { phoneEnc: true, seeker: { select: { emailEnc: true, experiences: true } } },
    });
    expect(found.phoneEnc).toBe(phone);
    expect(found.seeker?.emailEnc).toBe("hong@example.com");
    const many = await prisma.workExperience.findMany({ where: { seekerId } });
    expect(many.every((w) => w.employerNameEnc && !CIPHER.test(w.employerNameEnc))).toBe(true);
    const first = await prisma.seekerProfile.findFirst({
      where: { id: seekerId },
      include: { user: true },
    });
    expect(first?.user.phoneEnc).toBe(phone);
  });

  it("R-009: update ({set}), nested update / upsert / updateMany are encrypted", async () => {
    const user = await prisma.user.create({
      data: {
        role: "SEEKER",
        phoneEnc: "+821000000001",
        phoneHash: uniq("hash"),
        seeker: {
          create: {
            ...seekerData("1"),
            experiences: {
              create: { country: "VN", industryCode: "C", role: "a", months: 1 },
            },
          },
        },
      },
      include: { seeker: true },
    });
    const seekerId = user.seeker?.id as string;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneEnc: { set: "+821099999999" },
        totpSecret: null,
        seeker: {
          update: {
            legalNameEnc: "김철수",
            experiences: {
              updateMany: { where: { seekerId }, data: { employerNameEnc: "변경회사" } },
            },
          },
        },
      },
      include: { seeker: { include: { experiences: true } } },
    });
    expect(updated.phoneEnc).toBe("+821099999999");
    expect(updated.totpSecret).toBeNull();
    expect(updated.seeker?.legalNameEnc).toBe("김철수");
    expect(updated.seeker?.experiences[0].employerNameEnc).toBe("변경회사");
    expectCipher(await raw("User", user.id, ["phoneEnc"]), { phoneEnc: "+821099999999" });
    expectCipher(await raw("SeekerProfile", seekerId, ["legalNameEnc"]), {
      legalNameEnc: "김철수",
    });
    expect((await raw("User", user.id, ["totpSecret"])).totpSecret).toBeNull();

    // nested to-one update with { data } wrapper and nested upsert
    await prisma.user.update({
      where: { id: user.id },
      data: { seeker: { update: { data: { emailEnc: "new@example.com" } } } },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        seeker: {
          upsert: {
            create: seekerData("x"),
            update: { schoolNameEnc: "서울대학교" },
          },
        },
      },
    });
    expectCipher(await raw("SeekerProfile", seekerId, ["emailEnc", "schoolNameEnc"]), {
      emailEnc: "new@example.com",
      schoolNameEnc: "서울대학교",
    });
    const check = await prisma.seekerProfile.findUniqueOrThrow({ where: { id: seekerId } });
    expect(check.emailEnc).toBe("new@example.com");
    expect(check.schoolNameEnc).toBe("서울대학교");

    // to-many nested update { where, data } and upsert array
    const exp = await prisma.workExperience.findFirstOrThrow({ where: { seekerId } });
    await prisma.seekerProfile.update({
      where: { id: seekerId },
      data: {
        experiences: {
          update: [{ where: { id: exp.id }, data: { employerNameEnc: "업데이트회사" } }],
          upsert: [
            {
              where: { id: "no-such-id" },
              create: {
                country: "KR",
                industryCode: "F",
                role: "b",
                months: 2,
                employerNameEnc: "새회사",
              },
              update: { employerNameEnc: "x" },
            },
          ],
        },
      },
    });
    const rows = await base.workExperience.findMany({ where: { seekerId } });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => CIPHER.test(r.employerNameEnc ?? ""))).toBe(true);
    const plain = await prisma.workExperience.findMany({ where: { seekerId } });
    expect(plain.map((r) => r.employerNameEnc).sort()).toEqual(["새회사", "업데이트회사"]);

    // delete returns the decrypted record
    const removed = await prisma.workExperience.delete({ where: { id: exp.id } });
    expect(removed.employerNameEnc).toBe("업데이트회사");
  });

  it("R-009: top-level upsert, createMany, createManyAndReturn, updateMany, connectOrCreate", async () => {
    const id = uniq("company");
    const created = await prisma.company.upsert({
      where: { id },
      create: {
        id,
        nameEnc: "(주)비자산업",
        bizRegNoEnc: "123-45-67890",
        industryCode: "C",
        sido: "SEOUL",
      },
      update: { nameEnc: "unused" },
    });
    expect(created.nameEnc).toBe("(주)비자산업");
    const again = await prisma.company.upsert({
      where: { id },
      create: { id, nameEnc: "unused", industryCode: "C", sido: "SEOUL" },
      update: { nameEnc: "(주)비자산업2" },
    });
    expect(again.nameEnc).toBe("(주)비자산업2");
    expectCipher(await raw("Company", id, ["nameEnc", "bizRegNoEnc"]), {
      nameEnc: "비자산업",
      bizRegNoEnc: "67890",
    });

    const tag = uniq("many");
    const count = await prisma.company.createMany({
      data: [
        { nameEnc: `${tag}-A`, industryCode: "C", sido: "BUSAN" },
        { nameEnc: `${tag}-B`, industryCode: "C", sido: "BUSAN" },
      ],
    });
    expect(count.count).toBe(2);
    const leak = await base.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*)::bigint AS n FROM "Company" WHERE "nameEnc" LIKE $1`,
      `%${tag}%`,
    );
    expect(Number(leak[0].n)).toBe(0);

    const returned = await prisma.company.createManyAndReturn({
      data: [{ nameEnc: `${tag}-C`, industryCode: "C", sido: "JEJU" }],
    });
    expect(returned[0].nameEnc).toBe(`${tag}-C`);
    expect((await raw("Company", returned[0].id, ["nameEnc"])).nameEnc).toMatch(CIPHER);

    const sourceRef = uniq("lead");
    const lead = await prisma.jobLead.create({
      data: {
        source: "MANUAL",
        sourceRef,
        companyName: "공개 회사명",
        sido: "SEOUL",
        title: "용접공",
        rawJson: {},
        contactNameEnc: "담당자",
        contactPhoneEnc: "010-1111-2222",
        contactEmailEnc: "hr@example.com",
      },
    });
    expect(lead.contactPhoneEnc).toBe("010-1111-2222");
    await prisma.jobLead.updateMany({
      where: { sourceRef },
      data: { contactPhoneEnc: "010-3333-4444" },
    });
    expectCipher(await raw("JobLead", lead.id, ["contactPhoneEnc", "contactEmailEnc"]), {
      contactPhoneEnc: "3333",
      contactEmailEnc: "hr@example.com",
    });
    expect(
      (await prisma.jobLead.findUniqueOrThrow({ where: { id: lead.id } })).contactPhoneEnc,
    ).toBe("010-3333-4444");

    // nested connectOrCreate + nested create from the other side
    const employer = await prisma.user.create({
      data: {
        role: "EMPLOYER",
        email: `${uniq("e")}@example.test`,
        company: {
          connectOrCreate: {
            where: { id: uniq("nope") },
            create: { nameEnc: "연결생성회사", industryCode: "C", sido: "SEOUL" },
          },
        },
      },
      include: { company: true },
    });
    expect(employer.company?.nameEnc).toBe("연결생성회사");
    expect((await raw("Company", employer.companyId as string, ["nameEnc"])).nameEnc).toMatch(
      CIPHER,
    );
    const company = await prisma.company.create({
      data: {
        nameEnc: "역방향회사",
        industryCode: "C",
        sido: "SEOUL",
        users: { create: { role: "EMPLOYER", phoneEnc: "+821055556666" } },
      },
      include: { users: true },
    });
    expect(company.users[0].phoneEnc).toBe("+821055556666");
    expect((await raw("User", company.users[0].id, ["phoneEnc"])).phoneEnc).toMatch(CIPHER);
  });

  it("works inside interactive transactions", async () => {
    const created = await prisma.$transaction(async (tx) =>
      tx.company.create({ data: { nameEnc: "트랜잭션회사", industryCode: "C", sido: "SEOUL" } }),
    );
    expect(created.nameEnc).toBe("트랜잭션회사");
    expect((await raw("Company", created.id, ["nameEnc"])).nameEnc).toMatch(CIPHER);
  });

  it("refuses to filter on encrypted columns and rejects unsupported writes", async () => {
    await expect(prisma.user.findFirst({ where: { phoneEnc: "+821012345678" } })).rejects.toThrow(
      /use the …Hash column/,
    );
    await expect(
      prisma.seekerProfile.findMany({ where: { OR: [{ user: { phoneEnc: "x" } }] } }),
    ).rejects.toThrow(/phoneEnc/);
    expect(() => encryptArgs("Company", "create", { data: { nameEnc: { increment: 1 } } })).toThrow(
      /unsupported write/,
    );
    // pass-through for args without data and for non-record operations
    expect(encryptArgs("Company", "count", undefined)).toBeUndefined();
    expect(await prisma.company.count({ where: { sido: "SEOUL" } })).toBeGreaterThan(0);
  });

  it("the app singleton `db` points at the test DB and encrypts too", async () => {
    expect(process.env.DATABASE_URL).toBe(inject("databaseUrl"));
    const c = await db.company.create({
      data: { nameEnc: "싱글턴회사", industryCode: "C", sido: "SEOUL" },
    });
    expect(c.nameEnc).toBe("싱글턴회사");
    expect((await raw("Company", c.id, ["nameEnc"])).nameEnc).toMatch(CIPHER);
    await db.$disconnect();
  });
});

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const COURSES = [
  { title: "Submit the thesis chapter", description: "The one with the bibliography that grew on its own.", days: 3, chaos: 4, personality: "METHODICAL_MASOCHIST" },
  { title: "Reply to the landlord about the lease", description: "It has been sitting in drafts since March.", days: 1, chaos: 2, personality: "SILENT_SLOBBER" },
  { title: "Book the dentist appointment", description: "Apparently this is a thing adults do.", days: 9, chaos: 1, personality: "OVERCONFIDENT_OPTIMIST" },
  { title: "Fix the leaking tap", description: "Bucket under it is at 60%. Do not check.", days: 0, chaos: 5, personality: "LAST_MINUTE_PANIC" },
];

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const people = [
    { email: "ada@panicplan.local", name: "Ada Nkemelu", role: "ADMIN" as const },
    { email: "morgan@panicplan.local", name: "Morgan Reyes", role: "MODERATOR" as const },
    { email: "sam@panicplan.local", name: "Sam Okafor", role: "MEMBER" as const },
    { email: "riley@panicplan.local", name: "Riley Chen", role: "MEMBER" as const },
  ];

  const users: Record<string, { id: string; name: string }> = {};
  for (const p of people) {
    const u = await prisma.user.upsert({
      where: { email: p.email },
      update: { role: p.role, passwordHash, emailVerified: true },
      create: { ...p, passwordHash, emailVerified: true, showOnWall: p.email === "riley@panicplan.local" },
    });
    users[p.email] = { id: u.id, name: u.name };
  }

  const existing = await prisma.target.count();
  if (existing === 0) {
    const owner = users["sam@panicplan.local"];
    for (const c of COURSES) {
      const dueAt = new Date(Date.now() + c.days * 86400000);
      const target = await prisma.target.create({
        data: {
          ownerId: owner.id,
          title: c.title,
          description: c.description,
          dueAt,
          chaosLevel: c.chaos,
          personality: c.personality as never,
        },
      });
      await prisma.step.createMany({
        data: [
          { targetId: target.id, userId: owner.id, label: "Open the document", sortOrder: 0 },
          { targetId: target.id, userId: owner.id, label: "Panic appropriately", sortOrder: 1 },
        ],
      });
    }
  }

  console.log("Seeded demo accounts (password: Password123!)");
  for (const p of people) console.log(`  ${p.role.padEnd(9)} ${p.email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

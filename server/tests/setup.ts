import { prisma } from "../src/db.js";

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  await prisma.roast.deleteMany();
  await prisma.buddyLink.deleteMany();
  await prisma.step.deleteMany();
  await prisma.target.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.tidecloakToken.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

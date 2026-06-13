import { prisma } from "../infrastructure/database/client.js";
import { hashPassword } from "../domain/services/auth.service.js";

type Args = {
  email?: string;
  password?: string;
  displayName?: string;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.email) throw new Error("Missing --email");

  const existing = await prisma.user.findUnique({ where: { email: args.email } });
  if (existing) {
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: { role: "ADMIN" },
      select: { id: true, email: true, role: true }
    });
    console.info(JSON.stringify({ status: "promoted", user }, null, 2));
    return;
  }

  if (!args.password) throw new Error("Missing --password for a new admin user");

  const user = await prisma.user.create({
    data: {
      email: args.email,
      passwordHash: await hashPassword(args.password),
      displayName: args.displayName ?? "Admin",
      role: "ADMIN"
    },
    select: { id: true, email: true, displayName: true, role: true }
  });
  console.info(JSON.stringify({ status: "created", user }, null, 2));
}

function parseArgs(values: string[]): Args {
  return Object.fromEntries(
    values
      .filter((value) => value.startsWith("--") && value.includes("="))
      .map((value) => {
        const [key, ...rest] = value.slice(2).split("=");
        return [key, rest.join("=")];
      })
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import 'dotenv/config';
import argon2 from 'argon2';
import { prisma } from '../config/prisma.js';
import { UserRole, Unit } from '../generated/prisma/enums.js';

const ADMIN_USERS: { name: string; cardNumber: number; unit: Unit }[] = [
  {
    name: 'JOAO GUILHERME HERREIRA GARNICA',
    cardNumber: 8139,
    unit: Unit.PEDERTRACTOR,
  },
  {
    name: 'TOMAS MORAIS NOGUEIRA',
    cardNumber: 8138,
    unit: Unit.PEDERTRACTOR,
  },
  {
    name: 'PEDRO HENRIQUE ALEIXO DO PRADO',
    cardNumber: 5487,
    unit: Unit.PEDERTRACTOR,
  },
  { name: 'NICOLAS SOUSA HERMOSO', cardNumber: 2282, unit: Unit.TRACTOR },
  { name: 'VANDERLEI TORTORA JUNIOR', cardNumber: 2287, unit: Unit.TRACTOR },
];

async function main() {
  for (const spec of ADMIN_USERS) {
    const cardNumber = String(spec.cardNumber);

    const existingUser = await prisma.user.findUnique({
      where: {
        cardNumber_unit: {
          cardNumber,
          unit: spec.unit,
        },
      },
      select: { id: true },
    });

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: spec.name,
          role: UserRole.ADMIN,
          status: true,
          deletedAt: null,
        },
      });
    } else {
      const passwordHash = await argon2.hash(cardNumber);

      await prisma.user.create({
        data: {
          cardNumber,
          unit: spec.unit,
          employeeId: spec.cardNumber,
          name: spec.name,
          role: UserRole.ADMIN,
          password: passwordHash,
          firstLogin: true,
          status: true,
        },
      });
    }

    console.log(`OK admin ${spec.unit} cartão ${spec.cardNumber}`);
  }
}

main()
  .then(() => {
    console.log('Seed completed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import type { PrismaClient, User } from '../generated/prisma/client.js';
import { UserRole } from '../generated/prisma/enums.js';
import argon2 from 'argon2';
import { AppError } from '../lib/errors.js';
import { infoByCardAndUnit } from '../integrations/employee-by-card-api.js';
import type { CreateUserBody, PublicUser } from '../schemas/user.schemas.js';

const userPublicSelect = {
  id: true,
  email: true,
  cardNumber: true,
  unit: true,
  employeeId: true,
  name: true,
  firstLogin: true,
  status: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

export function toPublicUser(user: Omit<User, 'password'>): PublicUser {
  return {
    id: user.id,
    email: user.email,
    cardNumber: user.cardNumber,
    unit: user.unit,
    employeeId: user.employeeId,
    name: user.name,
    firstLogin: user.firstLogin,
    status: user.status,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    deletedAt: user.deletedAt?.toISOString() ?? null,
  };
}

export class UserService {
  constructor(private readonly prisma: PrismaClient) {}

  async login(
    cardNumber: string,
    unit: 'PEDERTRACTOR' | 'TRACTOR',
    password: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        cardNumber,
        unit,
        deletedAt: null,
        status: true,
      },
    });

    if (!user) {
      throw new AppError('Credenciais inválidas', 401);
    }

    let passwordValid = false;
    try {
      passwordValid = await argon2.verify(user.password, password);
    } catch {
      passwordValid = false;
    }

    if (!passwordValid) {
      throw new AppError('Credenciais inválidas', 401);
    }

    const { password: _password, ...safeUser } = user;
    return toPublicUser(safeUser);
  }

  async findById(id: number) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: userPublicSelect,
    });
  }

  async getUserById(id: number) {
    if (!id || id <= 0) {
      throw new AppError('Id do usuário inválido', 400);
    }

    const user = await this.findById(id);

    if (!user) {
      throw new AppError('Usuário não encontrado', 404);
    }

    return toPublicUser(user);
  }

  async getUserByEmployeeId(employeeId: number) {
    if (!employeeId || employeeId <= 0) {
      throw new AppError('Id do funcionário inválido', 400);
    }

    const user = await this.prisma.user.findFirst({
      where: { employeeId, deletedAt: null },
      select: userPublicSelect,
    });

    if (!user) {
      throw new AppError('Usuário não encontrado', 404);
    }

    if (!user.status) {
      throw new AppError('Usuário inativo', 400);
    }

    return toPublicUser(user);
  }

  async listAllUsers() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: userPublicSelect,
      orderBy: { id: 'asc' },
    });

    return users.map(toPublicUser);
  }

  async createUser(data: CreateUserBody) {
    const cardNumber = data.cardNumber.trim();
    const employee = await infoByCardAndUnit(data.unit, cardNumber);

    if (!employee) {
      throw new AppError(
        'Não foi possível obter o colaborador na API base.',
        400,
      );
    }

    if (employee.cardNumber.trim() !== cardNumber) {
      throw new AppError(
        'O cartão retornado pela API não confere com o cartão informado.',
        400,
      );
    }

    if (employee.status === false) {
      throw new AppError('Colaborador inativo na API base.', 400);
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        cardNumber,
        unit: data.unit,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new AppError(
        'Já existe usuário cadastrado com este cartão e unidade.',
        400,
      );
    }

    const passwordHash = await argon2.hash(cardNumber);

    const user = await this.prisma.user.create({
      data: {
        cardNumber,
        unit: data.unit,
        employeeId: employee.id,
        name: employee.name,
        role: data.role,
        password: passwordHash,
        firstLogin: true,
        status: true,
      },
      select: userPublicSelect,
    });

    return toPublicUser(user);
  }

  async changePassword(id: number, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new AppError('Usuário não encontrado', 404);
    }

    if (!user.firstLogin) {
      throw new AppError('Troca de senha de primeiro acesso já realizada', 400);
    }

    const passwordHash = await argon2.hash(password);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        password: passwordHash,
        firstLogin: false,
      },
      select: userPublicSelect,
    });

    return toPublicUser(updated);
  }

  async resetPassword(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new AppError('Usuário não encontrado', 404);
    }

    const passwordHash = await argon2.hash(user.cardNumber);

    await this.prisma.user.update({
      where: { id },
      data: {
        password: passwordHash,
        firstLogin: true,
      },
    });
  }

  async inactivate(id: number) {
    await this.getUserById(id);

    await this.prisma.user.update({
      where: { id },
      data: { status: false },
    });
  }

  async activate(id: number) {
    await this.getUserById(id);

    await this.prisma.user.update({
      where: { id },
      data: { status: true },
    });
  }

  async updateUserRole(id: number, role: UserRole) {
    await this.getUserById(id);

    await this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }
}

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';

import { Agency } from '../agencies/entities/agency.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { FindUsersQueryDto } from './dto/find-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Agency)
    private readonly agenciesRepository: Repository<Agency>,
  ) {}

  async findAll(query: FindUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [users, totalItems] = await this.usersRepository.findAndCount({
      relations: {
        agency: true,
      },
      order: {
        createdAt: 'DESC',
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: users.map((user) => this.buildSafeUser(user)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  async findOne(uuid: string) {
    const user = await this.findUserEntityOrFail(uuid, true);

    return this.buildSafeUser(user);
  }

  async create(dto: CreateUserDto) {
    const email = this.normalizeEmail(dto.email);
    const username = this.normalizeText(dto.username);

    await this.ensureUserFieldIsAvailable('email', email);
    await this.ensureUserFieldIsAvailable('username', username);
    await this.findAgencyEntityOrFail(dto.agencyId);

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.usersRepository.create({
      email,
      username,
      passwordHash,
      firstName: this.normalizeText(dto.firstName),
      lastName: this.normalizeText(dto.lastName),
      dateOfBirth: dto.dateOfBirth ?? null,
      phoneNumber: dto.phoneNumber ?? null,
      role: dto.role,
      agencyId: dto.agencyId,
      isActive: dto.isActive ?? true,
    });

    const savedUser = await this.usersRepository.save(user);

    return this.buildSafeUser(savedUser);
  }

  async update(uuid: string, dto: UpdateUserDto) {
    const user = await this.findUserEntityOrFail(uuid);

    const updatePayload: Partial<User> = {};

    if (dto.email !== undefined) {
      const email = this.normalizeEmail(dto.email);

      if (email !== user.email) {
        await this.ensureUserFieldIsAvailable('email', email, user.id);
      }

      updatePayload.email = email;
    }

    if (dto.username !== undefined) {
      const username = this.normalizeText(dto.username);

      if (username !== user.username) {
        await this.ensureUserFieldIsAvailable('username', username, user.id);
      }

      updatePayload.username = username;
    }

    if (dto.password !== undefined) {
      updatePayload.passwordHash = await bcrypt.hash(dto.password, 10);
      updatePayload.refreshTokenHash = null;
    }

    if (dto.firstName !== undefined) {
      updatePayload.firstName = this.normalizeText(dto.firstName);
    }

    if (dto.lastName !== undefined) {
      updatePayload.lastName = this.normalizeText(dto.lastName);
    }

    if (dto.dateOfBirth !== undefined) {
      updatePayload.dateOfBirth = dto.dateOfBirth;
    }

    if (dto.phoneNumber !== undefined) {
      updatePayload.phoneNumber = dto.phoneNumber;
    }

    if (dto.role !== undefined) {
      updatePayload.role = dto.role;
    }

    if (dto.agencyId !== undefined) {
      await this.findAgencyEntityOrFail(dto.agencyId);
      updatePayload.agencyId = dto.agencyId;
    }

    if (dto.isActive !== undefined) {
      updatePayload.isActive = dto.isActive;

      if (!dto.isActive) {
        updatePayload.refreshTokenHash = null;
      }
    }

    const updatedUser = this.usersRepository.merge(user, updatePayload);
    const savedUser = await this.usersRepository.save(updatedUser);

    return this.buildSafeUser(savedUser);
  }

  async remove(uuid: string) {
    const user = await this.findUserEntityOrFail(uuid);

    await this.usersRepository.remove(user);

    return {
      message: 'User was deleted successfully',
    };
  }

  private async findUserEntityOrFail(uuid: string, withAgency = false): Promise<User> {
    try {
      return await this.usersRepository.findOneOrFail({
        where: { uuid },
        relations: withAgency
          ? {
              agency: true,
            }
          : undefined,
      });
    } catch {
      throw new NotFoundException('User was not found');
    }
  }

  private async findAgencyEntityOrFail(id: number): Promise<Agency> {
    try {
      return await this.agenciesRepository.findOneOrFail({
        where: { id },
      });
    } catch {
      throw new NotFoundException('Agency was not found');
    }
  }

  private async ensureUserFieldIsAvailable(
    field: 'email' | 'username',
    value: string,
    ignoredUserId?: number,
  ) {
    const existingUser = await this.usersRepository.findOne({
      where: {
        [field]: value,
      },
      select: {
        id: true,
      },
    });

    if (!existingUser) {
      return;
    }

    if (ignoredUserId && existingUser.id === ignoredUserId) {
      return;
    }

    throw new ConflictException(`User with this ${field} already exists`);
  }

  private normalizeEmail(email: string) {
    return email.toLowerCase().trim();
  }

  private normalizeText(value: string) {
    return value.trim();
  }

  private buildSafeUser(user: User) {
    return {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      phoneNumber: user.phoneNumber,
      role: user.role,
      agencyId: user.agencyId,
      isActive: user.isActive,
      agency: user.agency
        ? {
            id: user.agency.id,
            uuid: user.agency.uuid,
            name: user.agency.name,
            slug: user.agency.slug,
          }
        : undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

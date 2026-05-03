import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { StringValue } from 'ms';

import { Agency } from '../agencies/entities/agency.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Agency)
    private readonly agenciesRepository: Repository<Agency>,
  ) {}

  async signup(dto: SignupDto) {
    const email = dto.email.toLowerCase().trim();
    const username = dto.username.trim();

    const existingUser = await this.usersRepository.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      throw new ConflictException('User with this email or username already exists');
    }

    const agency = await this.agenciesRepository.findOne({
      where: { id: dto.agencyId },
    });

    if (!agency) {
      throw new NotFoundException('Agency was not found');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.usersRepository.create({
      email,
      username,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: dto.dateOfBirth ?? null,
      phoneNumber: dto.phoneNumber ?? null,
      agencyId: dto.agencyId,
      role: dto.role ?? UserRole.MANAGER,
      isActive: true,
    });

    const savedUser = await this.usersRepository.save(user);

    const tokens = await this.generateTokens(savedUser);
    await this.saveRefreshTokenHash(savedUser.id, tokens.refreshToken);

    return {
      ...tokens,
      user: this.buildSafeUser(savedUser),
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user);
    await this.saveRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: this.buildSafeUser(user),
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'refresh_secret',
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersRepository.findOne({
      where: {
        id: payload.sub,
        isActive: true,
      },
    });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);

    // Refresh token rotation:
    // every refresh creates a new refresh token and replaces the old one.
    await this.saveRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: this.buildSafeUser(user),
    };
  }

  async logout(userId: number) {
    await this.usersRepository.update(userId, {
      refreshTokenHash: null,
    });

    return {
      message: 'Logged out successfully',
    };
  }

  private async generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      uuid: user.uuid,
      email: user.email,
      agencyId: user.agencyId,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<StringValue>('JWT_ACCESS_SECRET') ?? 'access_secret',
      expiresIn: this.configService.get<StringValue>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<StringValue>('JWT_REFRESH_SECRET') ?? 'refresh_secret',
      expiresIn: this.configService.get<StringValue>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async saveRefreshTokenHash(userId: number, refreshToken: string) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.usersRepository.update(userId, {
      refreshTokenHash,
    });
  }

  private buildSafeUser(user: User) {
    return {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      agencyId: user.agencyId,
    };
  }
}

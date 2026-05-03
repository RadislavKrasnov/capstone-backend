import { UserRole } from '../../users/entities/user.entity';

export type JwtPayload = {
  sub: number;
  uuid: string;
  email: string;
  agencyId: number;
  role: UserRole;
};

export type RoleTypes = "agent" | "admiin";

export type User = {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: RoleTypes;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export interface IUserCreateDto {
  firstName: string;
  lastName: string;
  password: string;
  email: string;
  role?: RoleTypes;
}

export type loginDto = {
  email: string;
  password: string;
};

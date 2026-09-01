export interface ILoginUserBodyDto {
  email: string;
  password: string;
}

export type UserRole = "customer" | "agent" | "admin";

export interface ILoginUserResponseDto {
  message?: string;
  token: string;
  refreshToken: string;
}
/**
 * Payload structure for registering user and responding to the registered user
 */
export interface IRegisterUserDto {
  firstName: string;
  lastName: string;
  password: string;
  email: string;
  role?: UserRole;
}

export interface IRegisterUserResponseDto {
  message?: string;
  token: string;
}

/**
 * Payload structure for validating user email and responding to the validated user
 */
export interface IValidateEmailDto {
  token: string;
}

export interface IValidateEmailResponse {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  id: string | number | undefined;
  role: string | undefined;
}

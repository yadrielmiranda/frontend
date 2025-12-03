import { apiFetch } from '../../_base';
import type { CreateUserDto, User } from '../../types';

type RegisterUserData = Omit<CreateUserDto, 'idRole'>;

/**
 * Registra un nuevo usuario (signup público).
 */
export function registerUser(userData: RegisterUserData) {
  return apiFetch<User>('/api/auth/register', {
    method: 'POST',
    body: userData,
  });
}

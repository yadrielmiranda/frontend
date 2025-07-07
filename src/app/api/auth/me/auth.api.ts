import { CreateUserDto, User } from "../../types";


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type RegisterUserData = Omit<CreateUserDto, 'idRole'>;

export async function registerUser(userData: RegisterUserData): Promise<User> {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Error al registrar el usuario');
  }
  return res.json();
}
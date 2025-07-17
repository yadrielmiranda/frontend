import { User, Role, CreateUserDto, UpdateUserDto } from "@/app/api/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Función auxiliar para generar las cabeceras de autenticación para llamadas desde el servidor.
const getAuthHeaders = (token?: string): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Cookie'] = `access_token=${token}`;
  }
  return headers;
};

// --- Funciones CRUD para Usuarios (usadas en el panel de admin) ---

export async function getUsers(token?: string): Promise<User[]> {
  const res = await fetch(`${API_URL}/api/users`, {
    cache: "no-store",
    headers: getAuthHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function getUser(id: number, token?: string): Promise<User> {
  const res = await fetch(`${API_URL}/api/users/${id}`, {
    cache: "no-store",
    headers: getAuthHeaders(token),
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

// Las llamadas desde el cliente usan 'credentials: include' para enviar la cookie automáticamente.
export async function createUser(userData: CreateUserDto): Promise<User> {
  const res = await fetch(`${API_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to create user');
  }
  return res.json();
}

export async function updateUser(id: number, userData: UpdateUserDto): Promise<User> {
  const res = await fetch(`${API_URL}/api/users/${id}`, {
    method: "PATCH",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to update user');
  }
  return res.json();
}

export async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/users/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to delete user');
  }
}

interface LoginData {
  identifier: string;
  password: string;
}

interface LoginResponse {
  message?: string;
}

interface LogoutResponse {
  message?: string;
}

export async function loginUser(userData: LoginData): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      credentials: 'include',
    });

    const data: LoginResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Invalid credentials or server error.');
    }
    return data;
  } catch (error) {
    console.error('Error in the login API call:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<LogoutResponse> {
  try {
    const response = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    const data: LogoutResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unknown error when logging out.');
    }
    return data;
  } catch (error: any) {
    console.error('Error in call to logout API:', error);
    throw error;
  }    
}

export async function updateMyProfile(userData: Omit<UpdateUserDto, 'idRole'>): Promise<User> {
  const res = await fetch(`${API_URL}/api/auth/profile`, { // Llama al nuevo endpoint
    method: "PATCH",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
    credentials: 'include', // Envía la cookie de sesión
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to update profile');
  }
  return res.json();
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export async function changePassword(data: ChangePasswordData): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/api/auth/change-password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });

  const responseData = await res.json();

  if (!res.ok) {
    throw new Error(responseData.message || 'Error al cambiar la contraseña.');
  }

  return responseData;
}


interface LoginData {
  username: string;
  password: string;
}

interface LoginResponse {
  message?: string; // Opcional, si tu backend devuelve un mensaje de éxito (ej. { message: 'Login exitoso' })

}

interface LogoutResponse {
  message?: string;
}
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'; // Default para desarrollo

export async function getUsers() {
  const data = await fetch(`${API_URL}/api/users`, {
    cache: "no-store"
  });
  return await data.json()
}

export async function getUser(id: any) {
  const data = await fetch(`${API_URL}/api/users/${id}`, {
    cache: "no-store"
  });
  return await data.json()
}

export async function createUser(userData: any) {

  const res = await fetch(`${API_URL}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData)
  });
  const data = await res.json()
  console.log(data)
}

export async function updateUser(id: any, userData: any) {
  const res = await fetch(`${API_URL}/api/users/${id}`, {
    method: "PATCH",
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData)
  })
}

export async function deleteUser(id: any) {
  const res = await fetch(`${API_URL}/api/users/${id}`, {
    method: 'DELETE',
  });
  const data = await res.json()
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
      
      throw new Error(data.message || 'Error desconocido al iniciar sesión.');
    }

    console.log("Respuesta de login (sin token en el cuerpo):", data);

    return data;

  } catch (error) {
    console.error('Error en la llamada a la API de login:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<LogoutResponse> {
  try {
    const response = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include', // Asegúrate de enviar las cookies con la solicitud de logout
    });

    const data: LogoutResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error desconocido al cerrar sesión.');
    }

    console.log("Logout exitoso:", data);
    return data;

  } catch (error: any) {
    console.error('Error en la llamada a la API de logout:', error);
    throw error;
  }
}
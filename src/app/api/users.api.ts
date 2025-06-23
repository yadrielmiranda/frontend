
interface LoginData {
  username: string;
  password: string;
}

interface LoginResponse {
  message?: string; // Opcional, si tu backend devuelve un mensaje de éxito (ej. { message: 'Login exitoso' })

 

}

export async function getUsers() {
  const data = await fetch('http://localhost:4000/api/users', {
    cache: "no-store"
  });
  return await data.json()
}

export async function getUser(id: any) {
  const data = await fetch(`http://localhost:4000/api/users/${id}`);
  return await data.json()
}

export async function createUser(userData: any) {

  const res = await fetch('http://localhost:4000/api/users', {
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
  const res = await fetch(`http://localhost:4000/api/users/${id}`, {
    method: "PATCH",
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData)
  })
}

export async function deleteUser(id: any) {
  const res = await fetch(`http://localhost:4000/api/users/${id}`, {
    method: 'DELETE',
  });
  const data = await res.json()
}


export async function loginUser(userData: LoginData): Promise<LoginResponse> {
  try {
    const response = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      credentials: 'include',
    });

    const data: LoginResponse = await response.json();

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error desconocido al iniciar sesión.');
    }

    console.log("Respuesta de login (sin token en el cuerpo):", data);

    return data;

  } catch (error) {
    console.error('Error en la llamada a la API de login:', error);
    throw error;
  }
}
const API_URL = process.env.NEXT_PUBLIC_API_URL; // Ajustado a tu patrón

// Tipos para los datos y respuestas
type SystemData = {
    name: string;
    idBrand: number;
    idProduct: number;
}
type UpdateSystemData = Partial<SystemData>; // Para actualizar, los campos son opcionales

// Obtener todos los sistemas (con filtros opcionales)
export async function getSystems(params?: { idBrand?: number; idProduct?: number }) {
    const query = new URLSearchParams();
    if (params?.idBrand) query.append('brand', String(params.idBrand));
    if (params?.idProduct) query.append('product', String(params.idProduct));
    
    const response = await fetch(`${API_URL}/api/systems?${query.toString()}`, {
        cache: "no-store",
    });
    if (!response.ok) throw new Error('Error al obtener los sistemas');
    return await response.json();
}

// Obtener un único sistema por su ID
export async function getSystem(id: number) {
    const response = await fetch(`${API_URL}/api/systems/${id}`, {
        cache: "no-store",
    });
    if (!response.ok) throw new Error('Error al obtener el sistema');
    return await response.json();
}

// Crear un nuevo sistema
export async function createSystem(data: SystemData) {
    const response = await fetch(`${API_URL}/api/systems`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear el sistema');
    }

    return await response.json();
}

// Actualizar un sistema existente
export async function updateSystem(id: number, data: UpdateSystemData) {
    const response = await fetch(`${API_URL}/api/systems/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el sistema');
    }

    return await response.json();
}

// Eliminar un sistema
export async function deleteSystem(id: number) {
    const response = await fetch(`${API_URL}/api/systems/${id}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar el sistema');
    }
    // El DELETE exitoso a menudo no devuelve cuerpo, así que no intentamos parsear JSON.
    return { success: true }; 
}

export async function getSystemWithConfigs(systemId: number) {
    const response = await fetch(`${API_URL}/api/systems/${systemId}/configs`);
    if (!response.ok) throw new Error("Error al obtener las configuraciones del sistema");
    return response.json();
}

export async function getAvailableConfigs(systemId: number) {
    const response = await fetch(`${API_URL}/api/systems/${systemId}/available-configs`);
    if (!response.ok) throw new Error("Error al obtener las configuraciones disponibles");
    return response.json();
}

export async function addConfigToSystem(systemId: number, configId: number) {
    const response = await fetch(`${API_URL}/api/systems/${systemId}/configs/${configId}`, { method: 'POST' });
    if (!response.ok) throw new Error("Error al asociar la configuración");
    return response.json();
}

export async function removeConfigFromSystem(systemId: number, configId: number) {
    const response = await fetch(`${API_URL}/api/systems/${systemId}/configs/${configId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error("Error al desasociar la configuración");
    return response.json();
}
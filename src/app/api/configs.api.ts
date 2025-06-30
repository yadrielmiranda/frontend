const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Tipos para los datos que se envían y reciben
type CreateConfigData = {
    conf: string;
    idProduct: number;
}
type UpdateConfigData = Partial<CreateConfigData>; // Para actualizar, los campos son opcionales

// Obtiene todas las configuraciones (incluye el producto asociado)
export async function getConfigs() {
    const response = await fetch(`${API_URL}/api/configs`, {
        cache: "no-store",
    });
    if (!response.ok) throw new Error('Error al obtener las configuraciones');
    return await response.json();
}

// Obtiene una configuración específica (sin el producto, para edición)
export async function getConfig(id: number) {
    const response = await fetch(`${API_URL}/api/configs/${id}`, {
        cache: "no-store",
    });
    if (!response.ok) throw new Error('Error al obtener la configuración');
    return await response.json();
}

// Crea una nueva configuración
export async function createConfig(data: CreateConfigData) {
    const response = await fetch(`${API_URL}/api/configs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la configuración');
    }
    return await response.json();
}

// Actualiza una configuración existente
export async function updateConfig(id: number, data: UpdateConfigData) {
    const response = await fetch(`${API_URL}/api/configs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar la configuración');
    }
    return await response.json();
}

// Elimina una configuración
export async function deleteConfig(id: number) {
    const response = await fetch(`${API_URL}/api/configs/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar la configuración');
    }
    return { success: true }; 
}
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// --- Definición de Tipos para el Frontend ---

// Datos para crear una nueva pieza (lo que manda el frontend)
export type CreatePieceData = {
    mark: string;
    idProd: number;
    idBrand: number;
    idSyst: number;
    idConf: number;
    idFC: number;
    width: string;
    height: string;
    idCryst: number;
    idTint: number;
    privacy: boolean;
    idCoat: number;
    screen: boolean;
    muntin: boolean;
    qty: number;
};

// Datos para crear un nuevo presupuesto
export type CreateEstimateData = {
    number: string;
    name: string;
    project: string;
    idUser: number;
    pieces: CreatePieceData[];
};

// Datos para actualizar la cabecera de un presupuesto
export type UpdateEstimateData = {
    number?: string;
    name?: string;
    project?: string;
};

// --- Funciones de API para Presupuestos (Estimates) ---

/** Obtiene una lista de todos los presupuestos. */
export async function getEstimates() {
    const response = await fetch(`${API_URL}/api/estimates`, { cache: "no-store" });
    if (!response.ok) throw new Error('Failed to fetch estimates');
    return await response.json();
}

/** Obtiene un único presupuesto por su ID, incluyendo sus piezas. */
export async function getEstimate(id: number) {
    const response = await fetch(`${API_URL}/api/estimates/${id}`, { cache: "no-store" });
    if (!response.ok) throw new Error('Failed to fetch estimate');
    return await response.json();
}

/** Crea un nuevo presupuesto con su lista de piezas. */
export async function createEstimate(data: CreateEstimateData) {
    const response = await fetch(`${API_URL}/api/estimates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create estimate');
    }
    return await response.json();
}

/** Actualiza los datos de la cabecera de un presupuesto (nombre, proyecto, etc.). */
export async function updateEstimate(id: number, data: UpdateEstimateData) {
    const response = await fetch(`${API_URL}/api/estimates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update estimate');
    }
    return await response.json();
}

/** Elimina un presupuesto y todas sus piezas asociadas. */
export async function deleteEstimate(id: number) {
    const response = await fetch(`${API_URL}/api/estimates/${id}`, { method: 'DELETE' });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete estimate');
    }
    return await response.json();
}

// --- Funciones de API para Piezas (anidadas en Presupuestos) ---

/** Añade una nueva pieza a un presupuesto existente. */
export async function addPieceToEstimate(estimateId: number, data: CreatePieceData) {
    const response = await fetch(`${API_URL}/api/estimates/${estimateId}/pieces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add piece');
    }
    return await response.json();
}

/** Elimina una pieza de un presupuesto existente. */
export async function removePieceFromEstimate(estimateId: number, pieceId: number) {
    const response = await fetch(`${API_URL}/api/estimates/${estimateId}/pieces/${pieceId}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove piece');
    }
    return await response.json();
}
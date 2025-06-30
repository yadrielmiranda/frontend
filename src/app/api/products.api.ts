const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function getProducts() {
    const data = await fetch(`${API_URL}/api/products`, {
        cache: "no-store"
    });
    return await data.json()
}

export async function getProduct(id: number) {
    const data = await fetch(`${API_URL}/api/products/${id}`, {
        cache: "no-store"
    });
    return await data.json()
}

export async function createProduct(productData: any) {

    const res = await fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData)
    });
    const data = await res.json()
    console.log(data)
}

export async function updateProduct(id: number, productData: any) {
    const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: "PATCH",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData)
    })
}

export async function deleteProduct(id: number) {
    const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'DELETE',
    });

    // 1. Comprobar si la petición falló
    if (!res.ok) {
        // Si hay un error en el servidor, lo lanzamos para que el cliente lo sepa
        throw new Error("Error al eliminar el producto");
    }
}
const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function getFColors() {
    const data = await fetch(`${API_URL}/api/framecolors`,{
        cache: "no-store"
    });
    return await data.json()
}

export async function getFColor(id : any) {
    const data = await fetch(`${API_URL}/api/framecolors/${id}`, {
        cache: "no-store"
    });
    return await data.json()
}

export async function createFColor(colorData: any) {

    const res = await fetch(`${API_URL}/api/framecolors`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(colorData)
    });
    const data = await res.json()
    console.log(data)
}


export async function updateFColor(id: any, productData: any) {
    const res = await fetch(`${API_URL}/api/framecolors/${id}`,{
        method: "PATCH",
        headers: {
           'Content-Type': 'application/json',
        },
         body: JSON.stringify(productData)
    })  
}

export async function deleteFColor(id: any) {
    const res = await fetch(`${API_URL}/api/framecolors/${id}`, {
        method: 'DELETE',
    });
   const data = await res.json()
}
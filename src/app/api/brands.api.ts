export async function getBrands() {
    const data = await fetch('http://localhost:4000/api/brands',{
        cache: "no-store"
    });
    return await data.json()
}

export async function getBrand(id : any) {
    const data = await fetch(`http://localhost:4000/api/brands/${id}`);
    return await data.json()
}

export async function createBrand(productData: any) {

    const res = await fetch('http://localhost:4000/api/brands', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData)
    });
    const data = await res.json()
    console.log(data)
}

export async function updateBrand(id: any, productData: any) {
    const res = await fetch(`http://localhost:4000/api/brands/${id}`,{
        method: "PATCH",
        headers: {
           'Content-Type': 'application/json',
        },
         body: JSON.stringify(productData)
    })  
}

export async function deleteBrand(id: any) {
    const res = await fetch(`http://localhost:4000/api/brands/${id}`, {
        method: 'DELETE',
    });
   const data = await res.json()
}
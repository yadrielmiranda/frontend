
export interface Role {
  id: number;
  name: string;
}


export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  idRole: number;
  role: Role;
}

export interface Brand {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
}

export interface System {
    id: number;
    name: string;
    idProduct: number;
    idBrand: number;
}

export interface Config {
    id: number;
    conf: string;
}

export interface FrameColor {
    id: number;
    color: string;
}

export interface Crystal {
    id: number;
    glass: string;
}

export interface Tint {
    id: number;
    color: string;
}

export interface Coating {
    id: number;
    name: string;
}

export interface Piece {
  id: number;
  idEst: number;
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
  rate: number;
  price: number;
  markup: number;
  subtotal: number;
  netProfit: number;
}

export interface Estimate {
  id: number;
  number: string;
  name: string;
  project: string;
  date: string;
  units: number;
  rateT: number;
  priceT: number;
  netProfit: number;
  idUser: number;
  active: boolean;
}


// --- Tipos con Relaciones (Para Obtener y Mostrar Datos) ---

export interface PieceWithRelations extends Piece {
  prod: Product;
  bran: Brand;
  syst: System;
  conf: Config;
  fColor: FrameColor;
  cryst: Crystal;
  tin: Tint;
  coat: Coating;
}

export interface BrandProduct {
  idBrand: number;
  idProduct: number;
  product?: Product;
  brand?: Brand;
}

export interface SysConf {
  idSystem: number;
  idConfig: number;
  config: Config;
}

export interface ProductWithBrands extends Product {
  brandProducts: {
    brand: Brand;
  }[];
}

export interface SystemWithConfigs extends System {
  sysconfs: SysConf[];
}

export type EstimateWithRelations = Estimate & {
  pieces: PieceWithRelations[];
  user: User;
};


// --- Tipos para Creación y Actualización (DTOs) ---

export type CreateProductData = Omit<Product, 'id'>;

export interface CreatePieceData {
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
}

export interface CreateEstimateData extends Omit<Estimate, 'id' | 'date' | 'units' | 'rateT' | 'priceT' | 'netProfit' | 'active' | 'idUser'> {
  pieces: CreatePieceData[];
}

export type UpdateEstimateData = Partial<Omit<CreateEstimateData, 'pieces'>> & {
    pieces?: (CreatePieceData & { id?: number })[];
};

// ✅ CORRECCIÓN: Se utiliza Omit para derivar el DTO de la interfaz User, haciéndolo más conciso.
// Se omiten 'id' y el objeto 'role', y se añade 'password'.
export interface CreateUserDto {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  address: string;
  idRole: number; // Requerido para la creación por admin, omitido para registro público
}

export type UpdateUserDto = Partial<CreateUserDto>;

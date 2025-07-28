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
  markupD: number;      
  netProfitD: number;   
}

export interface Estimate {
  id: number;
  number: string;
  name: string;  
  date: string;
  units: number;
  rateT: number;
  priceT: number;
  netProfit: number;
  total: number;        
  netProfitD: number;   
  idUser: number;
  active: boolean;
  order?: Order | null;
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

export interface OrderStatus {
  id: number;
  name: string;
}

export interface Order {
  id: number;
  number: string;
  date: string;
  units: number;
  amount: number;
  idEst: number;
  statusId: number;
  userId: number;
}

// Tipo de orden con relaciones para mostrar datos completos
export type OrderWithRelations = Order & {
  estimate: Estimate; // La orden incluye los datos básicos del estimado
  status: OrderStatus;
  user: User;
};

// Tipo para el DTO de actualización
export interface UpdateOrderData {
  statusId: number;
}


// No es necesario cambiar los DTOs de creación, ya que los nuevos campos se calculan en el backend.
export interface CreateEstimateData extends Omit<Estimate, 'id' | 'date' | 'units' | 'rateT' | 'priceT' | 'netProfit' | 'total' | 'netProfitD' | 'active' | 'idUser'> {
  pieces: CreatePieceData[];
}

export type UpdateEstimateData = Partial<Omit<CreateEstimateData, 'pieces'>> & {
    pieces?: (CreatePieceData & { id?: number })[];
};


export interface CreateUserDto {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  address: string;
  idRole: number;
}

export type UpdateUserDto = Partial<CreateUserDto>;
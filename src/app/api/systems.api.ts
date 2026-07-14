import { apiFetch } from './_base';
import type {
  System,
  SystemWithConfigs,
  Crystal,
  FrameColor,
  DimensionMode,
  PricingComponentType,
  PricingSourceConfig,
} from "../../lib/types";

export type SystemData = {
  name: string;
  idBrand: number;
  idProduct: number;
  isActive?: boolean;
  allowHighBottom?: boolean;
};

export type UpdateSystemData = Partial<SystemData>;

export type UpdateSystemConfigData = {
  allowScreen?: boolean;
  sortOrder?: number;
  isDefault?: boolean;
};

export type UpdateSystemConfigOptionsData = {
  activeOptionIds: number[];
  preparationOptionIds: number[];
  sillOptionIds: number[];
  reinforcementOptionIds: number[];

  defaultActiveOptionId?: number | null;
  defaultPreparationOptionId?: number | null;
  defaultSillOptionId?: number | null;
  defaultReinforcementOptionId?: number | null;

  dimensionMode?: DimensionMode;

  requiresWidth?: boolean;
  requiresHeight?: boolean;
  requiresHeightLeft?: boolean;
  requiresHeightRight?: boolean;
  requiresLegHeight?: boolean;
  requiresDoorWidth?: boolean;
  requiresDoorHeight?: boolean;
  requiresLeftSideliteWidth?: boolean;
  requiresRightSideliteWidth?: boolean;
  requiresLeftPanels?: boolean;
  requiresRightPanels?: boolean;
  requiresPanelCount?: boolean;
  requiresHorizontalHeights?: boolean;
};

export type UpdateSystemConfigPricingComponentsData = {
  components: {
    componentType: PricingComponentType;
    sourceConfigId: number;
    quantity?: number | null;
  }[];
};

export type UpdateSystemCrystalsData = {
  crystalIds: number[];
  defaultCrystalId?: number | null;
};

export type UpdateSystemFrameColorsData = {
  frameColorIds: number[];
};

export type SystemCrystalsManage = {
  system: {
    id: number;
    name: string;
    idBrand: number;
    idProduct: number;
    brand: { id: number; name: string };
    product: { id: number; name: string };
  };
  selectedCrystalIds: number[];
  defaultCrystalId: number | null;
  crystalsCatalog: Crystal[];
};

export type SystemFrameColorsManage = {
  system: {
    id: number;
    name: string;
    idBrand: number;
    idProduct: number;
    brand: { id: number; name: string };
    product: { id: number; name: string };
  };
  selectedFrameColorIds: number[];
  frameColorsCatalog: FrameColor[];
};

export type SystemConfigOptionsManage = {
  idSystem: number;
  idConfig: number;
  system: { id: number; name: string };
  config: { id: number; conf: string };
  allowScreen: boolean;

  dimensionMode: DimensionMode;

  requiresWidth: boolean;
  requiresHeight: boolean;
  requiresHeightLeft: boolean;
  requiresHeightRight: boolean;
  requiresLegHeight: boolean;
  requiresDoorWidth: boolean;
  requiresDoorHeight: boolean;
  requiresLeftSideliteWidth: boolean;
  requiresRightSideliteWidth: boolean;
  requiresLeftPanels: boolean;
  requiresRightPanels: boolean;
  requiresPanelCount: boolean;
  requiresHorizontalHeights: boolean;

  selectedActiveOptionIds: number[];
  selectedPreparationOptionIds: number[];
  selectedSillOptionIds: number[];
  selectedReinforcementOptionIds: number[];

  defaultActiveOptionId: number | null;
  defaultPreparationOptionId: number | null;
  defaultSillOptionId: number | null;
  defaultReinforcementOptionId: number | null;

  pricingComponents: {
    componentType: PricingComponentType;
    sourceConfigId: number;
    quantity: number | null;
    sourceConfig: PricingSourceConfig;
  }[];

  pricingSourceConfigsCatalog: {
    idConfig: number;
    config: PricingSourceConfig;
  }[];

  activeOptionsCatalog: {
    id: number;
    name: string;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }[];

  preparationOptionsCatalog: {
    id: number;
    name: string;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }[];

  sillOptionsCatalog: {
    id: number;
    name: string;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }[];

  reinforcementOptionsCatalog: {
    id: number;
    name: string;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }[];
};

/**
 * ✅ Obtiene todos los sistemas y precarga las configuraciones asociadas.
 */
export function getSystemsWithConfigs() {
  return apiFetch<SystemWithConfigs[]>('/api/systems/with-configs');
}

/**
 * Obtiene sistemas, opcionalmente filtrados por marca y producto.
 */
export function getSystems(params?: { idBrand?: number; idProduct?: number }) {
  const query = new URLSearchParams();
  if (params?.idBrand) query.append('brand', String(params.idBrand));
  if (params?.idProduct) query.append('product', String(params.idProduct));
  const q = query.toString();
  return apiFetch<System[]>(`/api/systems${q ? `?${q}` : ''}`);
}

/**
 * Obtiene un único sistema por su ID.
 */
export function getSystem(id: number) {
  return apiFetch<System>(`/api/systems/${id}`);
}

/**
 * Crea un nuevo sistema.
 */
export function createSystem(data: SystemData) {
  return apiFetch<System>('/api/systems', {
    method: 'POST',
    body: data,
  });
}

/**
 * Actualiza un sistema existente.
 */
export function updateSystem(id: number, data: UpdateSystemData) {
  return apiFetch<System>(`/api/systems/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

/**
 * Elimina un sistema por su ID.
 */
export function deleteSystem(id: number) {
  return apiFetch<{ success: boolean }>(`/api/systems/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Obtiene un sistema con sus configuraciones asociadas.
 */
export function getSystemWithConfigs(systemId: number) {
  return apiFetch<SystemWithConfigs>(`/api/systems/${systemId}/configs`);
}

/**
 * Obtiene las configuraciones disponibles para un sistema.
 */
export function getAvailableConfigs(systemId: number) {
  return apiFetch<any[]>(`/api/systems/${systemId}/available-configs`);
}

/**
 * Asocia una configuración a un sistema.
 */
export function addConfigToSystem(systemId: number, configId: number) {
  return apiFetch<SystemWithConfigs>(
    `/api/systems/${systemId}/configs/${configId}`,
    { method: 'POST' }
  );
}

/**
 * Actualiza opciones de la relación System ⇄ Config.
 */
export function updateSystemConfig(
  systemId: number,
  configId: number,
  data: UpdateSystemConfigData
) {
  return apiFetch<SystemWithConfigs>(
    `/api/systems/${systemId}/configs/${configId}`,
    {
      method: 'PATCH',
      body: data,
    }
  );
}

/**
 * Desasocia una configuración de un sistema.
 */
export function removeConfigFromSystem(systemId: number, configId: number) {
  return apiFetch<SystemWithConfigs>(
    `/api/systems/${systemId}/configs/${configId}`,
    { method: 'DELETE' }
  );
}

/**
 * Obtiene la data de options para administrar un SysConf.
 */
export function getSystemConfigOptionsForManage(
  systemId: number,
  configId: number
) {
  return apiFetch<SystemConfigOptionsManage>(
    `/api/systems/${systemId}/configs/${configId}/options/manage`
  );
}

/**
 * Actualiza las options asociadas a un SysConf.
 */
export function updateSystemConfigOptions(
  systemId: number,
  configId: number,
  data: UpdateSystemConfigOptionsData
) {
  return apiFetch<SystemConfigOptionsManage>(
    `/api/systems/${systemId}/configs/${configId}/options/manage`,
    {
      method: "PATCH",
      body: data,
    }
  );
}

export function getSystemCrystalsForManage(systemId: number) {
  return apiFetch<SystemCrystalsManage>(
    `/api/systems/${systemId}/crystals/manage`
  );
}

export function updateSystemCrystals(
  systemId: number,
  data: UpdateSystemCrystalsData
) {
  return apiFetch<SystemCrystalsManage>(
    `/api/systems/${systemId}/crystals/manage`,
    {
      method: "PATCH",
      body: data,
    }
  );
}

export function getSystemFrameColorsForManage(systemId: number) {
  return apiFetch<SystemFrameColorsManage>(
    `/api/systems/${systemId}/frame-colors/manage`
  );
}

export function updateSystemFrameColors(
  systemId: number,
  data: UpdateSystemFrameColorsData
) {
  return apiFetch<SystemFrameColorsManage>(
    `/api/systems/${systemId}/frame-colors/manage`,
    {
      method: "PATCH",
      body: data,
    }
  );
}

export function updateSystemConfigPricingComponents(
  systemId: number,
  configId: number,
  data: UpdateSystemConfigPricingComponentsData,
) {
  return apiFetch<SystemConfigOptionsManage>(
    `/api/systems/${systemId}/configs/${configId}/pricing-components`,
    {
      method: "PATCH",
      body: data,
    },
  );
}


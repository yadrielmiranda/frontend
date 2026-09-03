import { apiFetch } from "./_base";
import type {
  CreatePieceData,
  EstimateRevisionChangeReason,
  EstimateRevisionItemAction,
  InstallationBillingUnit,
  InstallationAppointmentType,
  InstallationJob,
  InstallationJobsPage,
  InstallationListQuery,
  InstallationLineOrigin,
  InstallationPermitStatus,
  InstallationPriceProfile,
  InstallationRuleMetric,
  InstallationService,
} from "@/lib/types";

export type InstallationRuleInput = {
  minValue?: number | null;
  minInclusive?: boolean;
  maxValue?: number | null;
  maxInclusive?: boolean;
  rate: number;
  sortOrder?: number;
  isActive?: boolean;
};

export type InstallationServiceInput = {
  name: string;
  description?: string | null;
  billingUnit: InstallationBillingUnit;
  ruleMetric: InstallationRuleMetric;
  baseRate: number;
  minimumCharge: number;
  availableForRequest?: boolean;
  availableForField?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  rules?: InstallationRuleInput[];
};

export type InstallationProfileInput = {
  name: string;
  adjustmentPercent: number;
  minimumCharge: number;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

export type InstallationMeasurementInput = {
  label: string;
  unitIndex?: number;
  widthIn?: number;
  heightIn?: number;
  heightLeftIn?: number;
  heightRightIn?: number;
  legHeightIn?: number;
  sashHeightIn?: number;
  windowHeightIn?: number;
  doorWidthIn?: number;
  doorHeightIn?: number;
  leftSideliteWidthIn?: number;
  rightSideliteWidthIn?: number;
  leftPanels?: number;
  rightPanels?: number;
  panelCount?: number;
  horizontalHeights?: number[];
  lengthIn?: number;
  notes?: string;
};

export type InstallationLineInput = {
  serviceId: number;
  widthIn?: number;
  heightIn?: number;
  areaSqFt?: number;
  panelCount?: number;
  lengthIn?: number;
  occurrences?: number;
  description?: string;
  origin?: InstallationLineOrigin;
};

export type SysConfInstallationServices = {
  idSystem: number;
  idConfig: number;
  system: { id: number; name: string };
  config: { id: number; conf: string };
  pricingComponents: Array<{
    componentType: string;
    sourceConfigId: number;
  }>;
  installationServices: Array<{
    idSystem: number;
    idConfig: number;
    serviceId: number;
    sortOrder: number;
    service: InstallationService;
  }>;
};

export type BulkSysConfInstallationMappingsResult = {
  serviceId: number;
  serviceName: string;
  selectedTargets: number;
  createdMappings: number;
  alreadyMapped: number;
};

export type RemoveBulkSysConfInstallationMappingsResult = {
  serviceId: number;
  serviceName: string;
  selectedTargets: number;
  removedMappings: number;
  notMapped: number;
};

export type DirectSysConfInstallationMapping = {
  idSystem: number;
  idConfig: number;
  idBrand: number;
  idProduct: number;
  brandName: string;
  productName: string;
  systemName: string;
  configName: string;
  isActive: boolean;
  serviceIds: number[];
};

export const getInstallationServices = (includeInactive = false) =>
  apiFetch<InstallationService[]>("/api/installation-services", {
    query: { includeInactive },
  });

export const getInstallationService = (id: number) =>
  apiFetch<InstallationService>(`/api/installation-services/${id}`);

export const createInstallationService = (data: InstallationServiceInput) =>
  apiFetch<InstallationService>("/api/installation-services", {
    method: "POST",
    body: data,
  });

export const updateInstallationService = (
  id: number,
  data: Partial<InstallationServiceInput>,
) =>
  apiFetch<InstallationService>(`/api/installation-services/${id}`, {
    method: "PATCH",
    body: data,
  });

export const deleteInstallationService = (id: number) =>
  apiFetch<{ deleted?: boolean; id: number } | InstallationService>(
    `/api/installation-services/${id}`,
    { method: "DELETE" },
  );

export const getSysConfInstallationServices = (
  idSystem: number,
  idConfig: number,
) =>
  apiFetch<SysConfInstallationServices>(
    `/api/systems/${idSystem}/configs/${idConfig}/installation-services`,
  );

export const setSysConfInstallationServices = (
  idSystem: number,
  idConfig: number,
  serviceIds: number[],
) =>
  apiFetch<SysConfInstallationServices>(
    `/api/systems/${idSystem}/configs/${idConfig}/installation-services`,
    { method: "PUT", body: { serviceIds } },
  );

export const getDirectSysConfInstallationServiceMappings = () =>
  apiFetch<DirectSysConfInstallationMapping[]>(
    "/api/installation-service-mappings/direct",
    { cache: "no-store" },
  );

export const addBulkSysConfInstallationServiceMappings = (
  serviceId: number,
  targets: Array<{ idSystem: number; idConfig: number }>,
) =>
  apiFetch<BulkSysConfInstallationMappingsResult>(
    "/api/installation-services/sysconf-mappings/bulk",
    {
      method: "POST",
      body: { serviceId, targets },
    },
  );

export const removeBulkSysConfInstallationServiceMappings = (
  serviceId: number,
  targets: Array<{ idSystem: number; idConfig: number }>,
) =>
  apiFetch<RemoveBulkSysConfInstallationMappingsResult>(
    "/api/installation-services/sysconf-mappings/bulk",
    {
      method: "DELETE",
      body: { serviceId, targets },
    },
  );

export const getInstallationProfiles = (includeInactive = true) =>
  apiFetch<InstallationPriceProfile[]>("/api/installation-price-profiles", {
    query: { includeInactive },
  });

export const createInstallationProfile = (data: InstallationProfileInput) =>
  apiFetch<InstallationPriceProfile>("/api/installation-price-profiles", {
    method: "POST",
    body: data,
  });

export const updateInstallationProfile = (
  id: number,
  data: Partial<InstallationProfileInput>,
) =>
  apiFetch<InstallationPriceProfile>(`/api/installation-price-profiles/${id}`, {
    method: "PATCH",
    body: data,
  });

export const deleteInstallationProfile = (id: number) =>
  apiFetch<{ deleted?: boolean; id: number } | InstallationPriceProfile>(
    `/api/installation-price-profiles/${id}`,
    { method: "DELETE" },
  );

export const getInstallations = (query: InstallationListQuery = {}) =>
  apiFetch<InstallationJobsPage>("/api/installations", {
    query: {
      page: query.page,
      pageSize: query.pageSize,
      scope: query.scope,
      status: query.status,
      search: query.search,
    },
    cache: "no-store",
  });

export const getInstallation = (id: number) =>
  apiFetch<InstallationJob>(`/api/installations/${id}`);

export async function getEstimateInstallation(
  estimateId: number,
): Promise<InstallationJob | null> {
  const installation = await apiFetch<InstallationJob | null | string>(
    `/api/estimates/${estimateId}/installation`,
    { cache: "no-store" },
  );

  return installation && typeof installation === "object" ? installation : null;
}

export const requestInstallation = (
  estimateId: number,
  data: {
    permitRequested: boolean;
    selectedServices?: InstallationLineInput[];
  },
) =>
  apiFetch<InstallationJob>(`/api/estimates/${estimateId}/installation`, {
    method: "POST",
    body: data,
  });

export const updateInstallationRequest = (
  jobId: number,
  data: {
    permitRequested: boolean;
    selectedServices?: InstallationLineInput[];
  },
) =>
  apiFetch<InstallationJob>(`/api/installations/${jobId}/request`, {
    method: "PATCH",
    body: data,
  });

export const cancelInstallation = (jobId: number, reason?: string) =>
  apiFetch<InstallationJob | null>(`/api/installations/${jobId}/cancel`, {
    method: "POST",
    body: { reason },
  });

export const addInstallationMeasurement = (
  jobId: number,
  data: InstallationMeasurementInput,
) =>
  apiFetch<InstallationJob>(`/api/installations/${jobId}/measurements`, {
    method: "POST",
    body: data,
  });

export const updateInstallationMeasurement = (
  jobId: number,
  measurementId: number,
  data: Partial<InstallationMeasurementInput>,
) =>
  apiFetch<InstallationJob>(
    `/api/installations/${jobId}/measurements/${measurementId}`,
    { method: "PATCH", body: data },
  );

export const proposeInstallationMeasurementPiece = (
  jobId: number,
  measurementId: number,
  data: {
    action: Extract<EstimateRevisionItemAction, "REPLACE" | "REMOVE">;
    reason: EstimateRevisionChangeReason;
    piece?: CreatePieceData;
    note?: string;
  },
) =>
  apiFetch<InstallationJob>(
    `/api/installations/${jobId}/measurements/${measurementId}/piece`,
    { method: "PATCH", body: data },
  );

export const addInstallationLine = (
  jobId: number,
  data: InstallationLineInput,
) =>
  apiFetch<InstallationJob>(`/api/installations/${jobId}/lines`, {
    method: "POST",
    body: data,
  });

export const deleteInstallationLine = (jobId: number, lineId: number) =>
  apiFetch<InstallationJob>(`/api/installations/${jobId}/lines/${lineId}`, {
    method: "DELETE",
  });

export const recalculateInstallationQuote = (jobId: number) =>
  apiFetch<InstallationJob>(`/api/installations/${jobId}/rebuild`, {
    method: "POST",
  });

export const submitInstallationQuote = (jobId: number, notes?: string) =>
  apiFetch<InstallationJob>(`/api/installations/${jobId}/submit`, {
    method: "POST",
    body: { notes },
  });

export const decideInstallationQuoteAsAdmin = (
  jobId: number,
  decision: "APPROVED" | "REJECTED",
  comment?: string,
) =>
  apiFetch<InstallationJob>(`/api/installations/${jobId}/admin-decision`, {
    method: "POST",
    body: { decision, comment },
  });

export const decideInstallationQuoteAsCustomer = (
  jobId: number,
  decision: "APPROVED" | "REJECTED",
  comment?: string,
) =>
  apiFetch<InstallationJob>(`/api/installations/${jobId}/customer-decision`, {
    method: "POST",
    body: { decision, comment },
  });

export const updateInstallationPermit = (
  jobId: number,
  data: {
    status: InstallationPermitStatus;
    cityFee?: number | null;
    notes?: string;
  },
) =>
  apiFetch<InstallationJob>(`/api/installations/${jobId}/permit`, {
    method: "PATCH",
    body: data,
  });

export const proposeInstallationAppointment = (
  jobId: number,
  data: {
    type: InstallationAppointmentType;
    startsAt: string;
    endsAt?: string;
    note?: string;
  },
) =>
  apiFetch<InstallationJob>(`/api/installations/${jobId}/appointments`, {
    method: "POST",
    body: data,
  });

export const respondInstallationAppointment = (
  appointmentId: number,
  response: "ACCEPT" | "REQUEST_RESCHEDULE",
  note?: string,
) =>
  apiFetch<InstallationJob>(
    `/api/installation-appointments/${appointmentId}/respond`,
    { method: "POST", body: { response, note } },
  );

export const completeInstallation = (jobId: number) =>
  apiFetch<InstallationJob>(`/api/installations/${jobId}/complete`, {
    method: "POST",
  });

export const startInstallation = (jobId: number) =>
  apiFetch<InstallationJob>(`/api/installations/${jobId}/start`, {
    method: "POST",
  });

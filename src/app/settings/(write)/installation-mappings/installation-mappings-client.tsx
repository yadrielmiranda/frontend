"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { InstallationService } from "@/lib/types";
import {
  addBulkSysConfInstallationServiceMappings,
  getDirectSysConfInstallationServiceMappings,
  removeBulkSysConfInstallationServiceMappings,
  type DirectSysConfInstallationMapping,
} from "@/app/api/installations.api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MappingAction = "add" | "remove";
type MappingStatusFilter = "all" | "mapped" | "unmapped";
type ServiceStatusFilter = "all" | "has" | "missing";

const mappingKey = (
  row: Pick<DirectSysConfInstallationMapping, "idSystem" | "idConfig">,
) => `${row.idSystem}:${row.idConfig}`;

export function InstallationMappingsClient({
  initialMappings,
  services,
  canEdit,
}: {
  initialMappings: DirectSysConfInstallationMapping[];
  services: InstallationService[];
  canEdit: boolean;
}) {
  const firstActiveService = services.find((service) => service.isActive);
  const [mappings, setMappings] = useState(initialMappings);
  const [action, setAction] = useState<MappingAction>("add");
  const [serviceId, setServiceId] = useState(
    firstActiveService ? String(firstActiveService.id) : "",
  );
  const [productId, setProductId] = useState("all");
  const [systemId, setSystemId] = useState("all");
  const [search, setSearch] = useState("");
  const [mappingStatus, setMappingStatus] =
    useState<MappingStatusFilter>("all");
  const [serviceStatus, setServiceStatus] =
    useState<ServiceStatusFilter>("all");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [removeConfirmationOpen, setRemoveConfirmationOpen] = useState(false);

  const servicesById = useMemo(
    () => new Map(services.map((service) => [service.id, service])),
    [services],
  );
  const activeServices = useMemo(
    () => services.filter((service) => service.isActive),
    [services],
  );
  const serviceOptions = action === "add" ? activeServices : services;
  const selectedServiceId = serviceId ? Number(serviceId) : null;
  const selectedService =
    selectedServiceId === null
      ? null
      : (servicesById.get(selectedServiceId) ?? null);

  const productOptions = useMemo(
    () =>
      Array.from(
        new Map(
          mappings.map((row) => [
            row.idProduct,
            { id: row.idProduct, name: row.productName },
          ]),
        ).values(),
      ).sort((left, right) => left.name.localeCompare(right.name)),
    [mappings],
  );

  const systemOptions = useMemo(
    () =>
      Array.from(
        new Map(
          mappings
            .filter(
              (row) =>
                productId === "all" || row.idProduct === Number(productId),
            )
            .map((row) => [
              row.idSystem,
              {
                id: row.idSystem,
                name: row.systemName,
                brandName: row.brandName,
              },
            ]),
        ).values(),
      ).sort(
        (left, right) =>
          left.name.localeCompare(right.name) ||
          left.brandName.localeCompare(right.brandName),
      ),
    [mappings, productId],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    return mappings.filter((row) => {
      if (productId !== "all" && row.idProduct !== Number(productId)) {
        return false;
      }
      if (systemId !== "all" && row.idSystem !== Number(systemId)) {
        return false;
      }
      if (
        normalizedSearch &&
        ![row.brandName, row.productName, row.systemName, row.configName].some(
          (value) => value.toLocaleLowerCase().includes(normalizedSearch),
        )
      ) {
        return false;
      }

      const isMapped = row.serviceIds.length > 0;
      if (mappingStatus === "mapped" && !isMapped) return false;
      if (mappingStatus === "unmapped" && isMapped) return false;

      if (selectedServiceId !== null && serviceStatus !== "all") {
        const hasSelectedService = row.serviceIds.includes(selectedServiceId);
        if (serviceStatus === "has" && !hasSelectedService) return false;
        if (serviceStatus === "missing" && hasSelectedService) return false;
      }

      return true;
    });
  }, [
    mappingStatus,
    mappings,
    productId,
    search,
    selectedServiceId,
    serviceStatus,
    systemId,
  ]);

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const isEligible = (row: DirectSysConfInstallationMapping) => {
    if (selectedServiceId === null) return false;
    const hasSelectedService = row.serviceIds.includes(selectedServiceId);
    return action === "add" ? !hasSelectedService : hasSelectedService;
  };

  const eligibleFilteredRows = filteredRows.filter(isEligible);
  const eligibleFilteredKeys = eligibleFilteredRows.map(mappingKey);
  const selectedEligibleCount = eligibleFilteredKeys.filter((key) =>
    selectedSet.has(key),
  ).length;
  const allFilteredSelected =
    eligibleFilteredKeys.length > 0 &&
    selectedEligibleCount === eligibleFilteredKeys.length;

  const selectedTargets = filteredRows
    .filter((row) => selectedSet.has(mappingKey(row)) && isEligible(row))
    .map((row) => ({
      idSystem: row.idSystem,
      idConfig: row.idConfig,
    }));

  const mappedCount = mappings.filter(
    (row) => row.serviceIds.length > 0,
  ).length;
  const assignedToSelectedService =
    selectedServiceId === null
      ? 0
      : mappings.filter((row) => row.serviceIds.includes(selectedServiceId))
          .length;

  const changeAction = (value: string) => {
    const nextAction = value as MappingAction;
    setAction(nextAction);
    setSelectedKeys([]);
    setServiceStatus("all");

    if (nextAction === "add" && !selectedService?.isActive) {
      setServiceId(activeServices[0] ? String(activeServices[0].id) : "");
    } else if (nextAction === "remove" && !serviceId && services[0]) {
      setServiceId(String(services[0].id));
    }
  };

  const changeService = (value: string) => {
    setServiceId(value);
    setSelectedKeys([]);
    setServiceStatus("all");
  };

  const toggleAllFiltered = () => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (allFilteredSelected) {
        eligibleFilteredKeys.forEach((key) => next.delete(key));
      } else {
        eligibleFilteredKeys.forEach((key) => next.add(key));
      }
      return Array.from(next);
    });
  };

  const toggleRow = (key: string, checked: boolean) => {
    setSelectedKeys((current) =>
      checked
        ? Array.from(new Set([...current, key]))
        : current.filter((item) => item !== key),
    );
  };

  const refreshMappings = async () => {
    setBusy(true);
    try {
      const nextMappings = await getDirectSysConfInstallationServiceMappings();
      setMappings(nextMappings);
      setSelectedKeys([]);
      toast.success("Mappings refreshed.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runBulkOperation = async () => {
    if (selectedServiceId === null || !selectedService) {
      toast.error("Select an installation service.");
      return;
    }
    if (selectedTargets.length === 0) {
      toast.error("Select at least one eligible configuration.");
      return;
    }

    const targetKeys = new Set(
      selectedTargets.map((target) => `${target.idSystem}:${target.idConfig}`),
    );

    setBusy(true);
    try {
      if (action === "add") {
        const result = await addBulkSysConfInstallationServiceMappings(
          selectedServiceId,
          selectedTargets,
        );
        setMappings((current) =>
          current.map((row) =>
            targetKeys.has(mappingKey(row)) &&
            !row.serviceIds.includes(selectedServiceId)
              ? { ...row, serviceIds: [...row.serviceIds, selectedServiceId] }
              : row,
          ),
        );
        toast.success(
          `${result.createdMappings} mappings added; ${result.alreadyMapped} already existed.`,
        );
      } else {
        const result = await removeBulkSysConfInstallationServiceMappings(
          selectedServiceId,
          selectedTargets,
        );
        setMappings((current) =>
          current.map((row) =>
            targetKeys.has(mappingKey(row))
              ? {
                  ...row,
                  serviceIds: row.serviceIds.filter(
                    (currentServiceId) =>
                      currentServiceId !== selectedServiceId,
                  ),
                }
              : row,
          ),
        );
        toast.success(
          `${result.removedMappings} mappings removed; ${result.notMapped} were already absent.`,
        );
      }

      setSelectedKeys([]);
      setRemoveConfirmationOpen(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Installation Service Mappings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Audit and manage automatic services for direct System + Config
          records. Composite configurations are excluded by the backend.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Direct configuration mappings</CardTitle>
          <CardDescription>
            In Add mode, configurations that already have the selected service
            are checked and locked. Removing a mapping is a separate action and
            always requires confirmation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Action
              </p>
              <Select value={action} onValueChange={changeAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add service</SelectItem>
                  <SelectItem value="remove">Remove service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Service
              </p>
              <Select value={serviceId} onValueChange={changeService}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {serviceOptions.map((service) => (
                    <SelectItem key={service.id} value={String(service.id)}>
                      {service.name}
                      {!service.isActive ? " (inactive)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Product
              </p>
              <Select
                value={productId}
                onValueChange={(value) => {
                  setProductId(value);
                  setSystemId("all");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All products</SelectItem>
                  {productOptions.map((product) => (
                    <SelectItem key={product.id} value={String(product.id)}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                System
              </p>
              <Select value={systemId} onValueChange={setSystemId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All systems</SelectItem>
                  {systemOptions.map((system) => (
                    <SelectItem key={system.id} value={String(system.id)}>
                      {system.name} · {system.brandName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Configuration
              </p>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search configuration"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Overall mapping state
              </p>
              <Select
                value={mappingStatus}
                onValueChange={(value) =>
                  setMappingStatus(value as MappingStatusFilter)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  <SelectItem value="mapped">Mapped</SelectItem>
                  <SelectItem value="unmapped">Unmapped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Selected service state
              </p>
              <Select
                disabled={selectedServiceId === null}
                value={serviceStatus}
                onValueChange={(value) =>
                  setServiceStatus(value as ServiceStatusFilter)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="has">Has selected service</SelectItem>
                  <SelectItem value="missing">
                    Missing selected service
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{mappings.length} direct</Badge>
            <Badge variant="secondary">{mappedCount} mapped</Badge>
            <Badge variant="outline">
              {mappings.length - mappedCount} unmapped
            </Badge>
            {selectedService && (
              <Badge variant="outline">
                {selectedService.name}: {assignedToSelectedService} assigned ·{" "}
                {mappings.length - assignedToSelectedService} missing
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {filteredRows.length} visible · {eligibleFilteredRows.length}{" "}
              available for this action · {selectedTargets.length} selected
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={toggleAllFiltered}
                disabled={eligibleFilteredRows.length === 0 || busy || !canEdit}
              >
                {allFilteredSelected
                  ? "Unselect filtered"
                  : "Select all filtered"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedKeys([])}
                disabled={selectedKeys.length === 0 || busy}
              >
                Clear selection
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void refreshMappings()}
                disabled={busy}
              >
                Refresh
              </Button>
            </div>
          </div>

          <div className="max-h-[36rem] overflow-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>System / Config</TableHead>
                  <TableHead>Associated services</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No direct configurations match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => {
                    const key = mappingKey(row);
                    const hasSelectedService =
                      selectedServiceId !== null &&
                      row.serviceIds.includes(selectedServiceId);
                    const eligible = isEligible(row);
                    const lockedAsMapped =
                      action === "add" && hasSelectedService;
                    const checked = lockedAsMapped || selectedSet.has(key);

                    return (
                      <TableRow
                        key={key}
                        data-state={
                          selectedSet.has(key) ? "selected" : undefined
                        }
                        className={
                          !eligible && !lockedAsMapped
                            ? "opacity-70"
                            : undefined
                        }
                      >
                        <TableCell>
                          <Checkbox
                            aria-label={`Select ${row.systemName} / ${row.configName}`}
                            checked={checked}
                            disabled={!canEdit || busy || !eligible}
                            onCheckedChange={(value) =>
                              toggleRow(key, value === true)
                            }
                          />
                        </TableCell>
                        <TableCell className="min-w-44 whitespace-normal">
                          <div className="font-medium">{row.productName}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.brandName}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-48 whitespace-normal">
                          <div className="font-medium">{row.systemName}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.configName}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-64 whitespace-normal">
                          {row.serviceIds.length === 0 ? (
                            <span className="text-sm text-muted-foreground">
                              No services
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {row.serviceIds.map((currentServiceId) => {
                                const service =
                                  servicesById.get(currentServiceId);
                                return (
                                  <Badge
                                    key={currentServiceId}
                                    variant={
                                      currentServiceId === selectedServiceId
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {service?.name ??
                                      `Service #${currentServiceId}`}
                                    {service && !service.isActive
                                      ? " (inactive)"
                                      : ""}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge
                              variant={
                                row.serviceIds.length > 0
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {row.serviceIds.length > 0
                                ? "Mapped"
                                : "Unmapped"}
                            </Badge>
                            {!row.isActive && (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {canEdit && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant={action === "remove" ? "destructive" : "default"}
                onClick={() =>
                  action === "add"
                    ? void runBulkOperation()
                    : setRemoveConfirmationOpen(true)
                }
                disabled={
                  busy ||
                  selectedServiceId === null ||
                  selectedTargets.length === 0
                }
              >
                {busy
                  ? "Working…"
                  : action === "add"
                    ? `Add service to ${selectedTargets.length} selected`
                    : `Remove service from ${selectedTargets.length} selected`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={removeConfirmationOpen}
        onOpenChange={setRemoveConfirmationOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove service mappings?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {selectedService?.name ?? "the selected service"} from{" "}
              {selectedTargets.length} direct configurations. This does not
              delete the service or affect any other mappings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void runBulkOperation()}
            >
              Remove mappings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

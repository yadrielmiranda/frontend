export function dealerRegistrationRequestId(value: string | string[] | undefined): number | undefined {
  if (typeof value !== 'string' || !/^[1-9]\d{0,9}$/.test(value)) return undefined;
  const id = Number(value);
  return id <= 2147483647 ? id : undefined;
}

export function registrationLoginDestination(role: string | undefined, requestId?: number) {
  if (role === 'technician') return '/technician';
  if (requestId && (role === 'admin' || role === 'dealer')) return `/dealers?registrationRequest=${requestId}`;
  return '/';
}

import AsyncStorage from '@react-native-async-storage/async-storage';

// Locally-persisted delivery addresses. Stored per-device via AsyncStorage so the
// feature works with no extra backend setup; the chosen address is still written
// into each order's `address` jsonb on checkout (server-side), which is the source
// of truth for fulfilment. Keyed by user id so addresses don't leak across accounts.

export type Address = {
  id: string;
  name: string;
  phone: string;
  flat: string;
  street: string;
  city: string;
  state: string;
  pin: string;
  isDefault?: boolean;
};

export type AddressInput = Omit<Address, 'id' | 'isDefault'>;

const keyFor = (userId: string | null | undefined) => `aec:addresses:${userId ?? 'guest'}`;

// Stable-ish id without Date.now()/Math.random() reliance issues in app runtime
// (those are fine in the app; only workflow scripts forbid them).
function newId(): string {
  return 'addr_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36);
}

export async function loadAddresses(userId: string | null | undefined): Promise<Address[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Address[]) : [];
  } catch {
    return [];
  }
}

async function persist(userId: string | null | undefined, list: Address[]): Promise<void> {
  try {
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(list));
  } catch {
    /* ignore write errors – non-critical convenience cache */
  }
}

export function formatAddress(a: Address | AddressInput): string {
  return [a.flat, a.street, a.city, a.state, a.pin].filter(Boolean).join(', ');
}

export function isComplete(a: Partial<AddressInput>): boolean {
  return Boolean(
    a.name?.trim() && a.phone?.trim() && a.flat?.trim() && a.street?.trim() &&
    a.city?.trim() && a.state?.trim() && a.pin?.trim()
  );
}

export async function addAddress(userId: string | null | undefined, input: AddressInput): Promise<Address[]> {
  const list = await loadAddresses(userId);
  const address: Address = { ...input, id: newId(), isDefault: list.length === 0 };
  const next = [...list, address];
  await persist(userId, next);
  return next;
}

export async function updateAddress(userId: string | null | undefined, id: string, input: AddressInput): Promise<Address[]> {
  const list = await loadAddresses(userId);
  const next = list.map(a => (a.id === id ? { ...a, ...input } : a));
  await persist(userId, next);
  return next;
}

export async function removeAddress(userId: string | null | undefined, id: string): Promise<Address[]> {
  const list = await loadAddresses(userId);
  let next = list.filter(a => a.id !== id);
  // Keep a default if any remain.
  if (next.length > 0 && !next.some(a => a.isDefault)) next = next.map((a, i) => ({ ...a, isDefault: i === 0 }));
  await persist(userId, next);
  return next;
}

export async function setDefaultAddress(userId: string | null | undefined, id: string): Promise<Address[]> {
  const list = await loadAddresses(userId);
  const next = list.map(a => ({ ...a, isDefault: a.id === id }));
  await persist(userId, next);
  return next;
}

export async function getDefaultAddress(userId: string | null | undefined): Promise<Address | null> {
  const list = await loadAddresses(userId);
  return list.find(a => a.isDefault) ?? list[0] ?? null;
}

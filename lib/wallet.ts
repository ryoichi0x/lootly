export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function isValidEvmAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function normalizeWalletAddress(address: string) {
  return address.trim().toLowerCase();
}

export const BASE_CHAIN_ID = 8453;

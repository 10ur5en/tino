const STORAGE_PREFIX = "tino_commented_";

function storageKey(address: string): string {
  return `${STORAGE_PREFIX}${address.toLowerCase()}`;
}

export function getCommentedPostKeys(address: string): string[] {
  if (!address) return [];
  try {
    const raw = localStorage.getItem(storageKey(address));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

export function addCommentedPostKey(address: string, postKey: string): void {
  if (!address || !postKey) return;
  try {
    const key = storageKey(address);
    const current = getCommentedPostKeys(address);
    if (current.includes(postKey)) return;
    const next = [...current, postKey];
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function postKeyFromPost(author: string, blobName: string): string {
  return `${author}-${blobName}`;
}

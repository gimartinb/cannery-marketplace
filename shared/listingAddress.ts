// Checks that a maker page address (/vendors/<address>) matches the business name.

// Apostrophes are dropped (Gilbert's becomes gilberts); accents are simplified (Café becomes cafe).
const toAddress = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/['’‘`]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const oldStyleAddress = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** True when the address is the name's address, or the name's address with a number (two makers with one name). */
export function addressMatchesName(name: string, slug: string) {
  // "&" may be written as "and" in an address (Moss & Marrow at moss-and-marrow).
  const withAnd = name.replace(/&/g, " and ");
  const bases = [toAddress(name), oldStyleAddress(name), toAddress(withAnd), oldStyleAddress(withAnd)].filter(Boolean);
  if (!bases.length) return true;
  return bases.some((base) => slug === base || (slug.startsWith(`${base}-`) && /^\d+$/.test(slug.slice(base.length + 1))));
}

export { toAddress as addressFromName };

/** The address a listing would get from its name. */
export function suggestedAddress(name: string) {
  return toAddress(name) || "maker";
}

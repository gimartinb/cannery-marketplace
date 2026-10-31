// Older category names that now map to a renamed category, so spreadsheets,
// saved drafts, and old links keep working after a rename.
export const RENAMED_CATEGORIES: Record<string, string> = { "Coffee & Bakery": "Coffee, Matcha & Bakery" };

export function currentCategory(category: string) {
  return RENAMED_CATEGORIES[category.trim()] ?? category;
}

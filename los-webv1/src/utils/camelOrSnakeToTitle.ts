export function camelOrSnakeToTitle(text: string): string {
  return text
    .replace(/[_\-]+/g, ' ')               // replace _ or - with space
    .replace(/([a-z])([A-Z])/g, '$1 $2')   // camelCase to space
    .replace(/\b\w/g, c => c.toUpperCase())// capitalize each word
    .trim();
}

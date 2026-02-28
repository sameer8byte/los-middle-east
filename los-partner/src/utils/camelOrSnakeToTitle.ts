export function camelOrSnakeToTitle(text: string): string {
  return text
    .replace(/[_\-]+/g, ' ')                   // Replace snake/kebab with space
    .replace(/([a-z])([A-Z])/g, '$1 $2')       // Split camelCase
    .toLowerCase()                             // Convert to lowercase
    .replace(/\b\w/g, c => c.toUpperCase())    // Capitalize each word
    .trim();
}

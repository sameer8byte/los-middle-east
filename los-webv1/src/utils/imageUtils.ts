/**
 * Utility functions for image handling in the carousel
 */

export interface ImageLoadState {
  loading: boolean;
  error: boolean;
  loaded: boolean;
}

/**
 * Preload images to improve carousel performance
 */
export const preloadImages = (imageUrls: string[]): Promise<void[]> => {
  const promises = imageUrls.map((url) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  });

  return Promise.allSettled(promises).then(() => []);
};

/**
 * Create a responsive image URL with optimization parameters
 */
export const createOptimizedImageUrl = (
  originalUrl: string,
  width?: number,
  height?: number,
  quality = 80
): string => {
  // If the image is from a CDN that supports optimization, add parameters
  // This is a generic implementation - you might need to adjust for your specific CDN
  try {
    const url = new URL(originalUrl);
    
    // Add optimization parameters if supported
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('q', quality.toString());
    url.searchParams.set('f', 'auto'); // auto format (webp, avif if supported)
    
    return url.toString();
  } catch {
    // If URL parsing fails, return original
    return originalUrl;
  }
};

/**
 * Generate placeholder image URL
 */
export const createPlaceholderImage = (
  width = 400,
  height = 300,
  text = 'Loading...'
): string => {
  // Using a simple colored background as placeholder
  // You could also use a service like placeholder.com or unsplash
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" 
            fill="#9ca3af" text-anchor="middle" dy=".3em">${text}</text>
    </svg>
  `)}`;
};

/**
 * Check if image URL is valid and accessible
 */
// export const validateImageUrl = (url: string): Promise<boolean> => {
//   return new Promise((resolve) => {
//     const img = new Image();
//     img.onload = () => resolve(true);
//     img.onerror = () => resolve(false);
//     img.src = url;
//   });
// };

/**
 * Create different sized versions of an image for responsive loading
 */
// export const createResponsiveImageSet = (originalUrl: string) => {
//   return {
//     small: createOptimizedImageUrl(originalUrl, 300, 200, 70),
//     medium: createOptimizedImageUrl(originalUrl, 600, 400, 80),
//     large: createOptimizedImageUrl(originalUrl, 1200, 800, 85),
//     original: originalUrl
//   };
// };

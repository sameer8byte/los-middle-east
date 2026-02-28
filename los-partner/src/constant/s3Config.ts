// S3 Bucket Configuration based on Brand Name
export const S3_BUCKET_CONFIG: Record<string, string> = {
  // Add more brands as needed
  "1ef804d8-6d25-463a-81c2-6b34e0bc3571": "https://prod-zepoto-bucket.s3.ap-south-1.amazonaws.com/",
};

// Helper function to ensure URL has proper S3 bucket prefix
export const ensureS3Url = (url: string | undefined, brandName?: string): string => {
  if (!url) return "";

  // If URL already has https:// or http://, return as is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  // Get the appropriate bucket URL based on brand name
  const bucketUrl =
    S3_BUCKET_CONFIG[brandName || "default"] || S3_BUCKET_CONFIG.default;

  // Append the URL to the bucket if it doesn't already start with it
  return `${bucketUrl}${url}`;
};

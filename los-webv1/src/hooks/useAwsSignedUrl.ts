import { useCallback, useState } from "react";
import { getAwsSignedUrl } from "../services/api/common.api";

export const useAwsSignedUrl = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSignedUrl = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = await getAwsSignedUrl(key);
      if (!url) {
        throw new Error("No URL returned from the server");
      }
   
      window.open(url.url, "_blank");
      return url;
    } catch (err) {
      setError(
        new Error(
          (err as Error).message ||
            "An error occurred while fetching the signed URL"
        )
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchSignedUrl, loading, error };
};

export async function getPdfVersionFromUrl(url: string): Promise<string | null> {
    try {
        console.log(`Fetching PDF version from URL: ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Range: 'bytes=0-20', // Only get the first 20 bytes
        },
      });
  
      if (!response.ok) throw new Error('Failed to fetch PDF');
  
      const buffer = await response.arrayBuffer();
      const text = new TextDecoder().decode(buffer);
      const match = text.match(/%PDF-(\d\.\d)/);
  
      return match ? `PDF Version: ${match[1]}` : 'Version not found';
    } catch (error) {
      console.error(error);
      return null;
    }
  }
  
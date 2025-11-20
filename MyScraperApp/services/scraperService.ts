import { ScrapeResult } from "../types";

const PROXIES = [
  {
    name: 'Direct',
    url: (target: string) => target, 
    extract: async (res: Response) => {
        if (!res.ok) throw new Error("Direct fetch failed");
        return res.text();
    },
    supportsBinary: true
  },
  {
    name: 'CorsProxy',
    url: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
    extract: async (res: Response) => res.text(),
    supportsBinary: true
  },
  {
    name: 'AllOrigins',
    url: (target: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`,
    extract: async (res: Response) => {
      const data = await res.json();
      if (!data.contents) throw new Error("No content in AllOrigins response");
      return data.contents;
    },
    supportsBinary: false
  }
];

const UNIVERSAL_URL_REGEX = /(https?:\\?\/\\?\/[^"'\s<>\)\(]+?\.(?:jpg|jpeg|png|gif|webp|svg|mp4|webm|mov|m4v|avi|mkv))/gi;

const fetchWithTimeout = async (url: string, options = {}, timeout = 15000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

const resolveUrl = (path: string | null | undefined, baseUrl: string): string | null => {
  if (!path) return null;
  path = path.trim().replace(/\\/g, '/');
  if (path.length === 0 || path.startsWith('data:')) return null;

  try {
    const cleanPath = path.split(/\s+/)[0];
    if (cleanPath.startsWith('//')) {
        const protocol = new URL(baseUrl).protocol;
        return `${protocol}${cleanPath}`;
    }
    if (cleanPath.startsWith('http')) return cleanPath;
    return new URL(cleanPath, baseUrl).href;
  } catch (e) {
    return null;
  }
};

const fetchViaProxy = async (targetUrl: string): Promise<string | null> => {
    const isElectron = navigator.userAgent.toLowerCase().includes(' electron/');
    
    for (const proxy of PROXIES) {
        // If we are in a browser (not electron), skip 'Direct' to avoid CORS errors
        if (!isElectron && proxy.name === 'Direct') continue;

        try {
            const res = await fetchWithTimeout(proxy.url(targetUrl));
            if (res.ok) {
                return await proxy.extract(res);
            }
        } catch (e) { continue; }
    }
    return null;
};

export const scrapeWebPage = async (url: string): Promise<ScrapeResult> => {
  let htmlContent = "";
  
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  htmlContent = await fetchViaProxy(url) || "";

  if (!htmlContent) {
    throw new Error("Failed to fetch page content. The website may be blocking access.");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");
  const images = new Set<string>();
  const videos = new Set<string>();

  const addAsset = (rawUrl: string | null | undefined, type: 'image' | 'video', contextBaseUrl: string) => {
      const resolved = resolveUrl(rawUrl, contextBaseUrl);
      if (!resolved) return;
      if (resolved.match(/\.(html|htm|css|js|json|xml)$/i)) return;
      if (type === 'image') images.add(resolved);
      if (type === 'video') videos.add(resolved);
  };

  doc.querySelectorAll("img").forEach((img) => {
    addAsset(img.getAttribute("src"), 'image', url);
    addAsset(img.getAttribute("data-src"), 'image', url);
    Array.from(img.attributes).forEach(attr => {
        if (attr.name.startsWith('data-') && attr.value.match(/\.(jpg|png|webp|gif)/i)) {
            addAsset(attr.value, 'image', url);
        }
    });
    const srcset = img.getAttribute("srcset");
    if (srcset) srcset.split(',').forEach(s => addAsset(s, 'image', url));
  });

  doc.querySelectorAll("source").forEach((source) => {
    addAsset(source.getAttribute("srcset"), 'image', url);
    addAsset(source.getAttribute("src"), 'video', url);
  });

  doc.querySelectorAll("video").forEach((video) => {
    addAsset(video.getAttribute("src"), 'video', url);
    addAsset(video.getAttribute("poster"), 'image', url);
  });

  doc.querySelectorAll("a").forEach(a => {
      const href = a.getAttribute("href");
      if (href?.match(/\.(mp4|webm|mov|m4v)$/i)) addAsset(href, 'video', url);
      if (href?.match(/\.(jpg|jpeg|png|webp|gif)$/i)) addAsset(href, 'image', url);
  });

  doc.querySelectorAll('*').forEach(el => {
      const style = el.getAttribute('style');
      if (style) {
          const match = style.match(/url\(['"]?([^'"\)]+)['"]?\)/i);
          if (match) addAsset(match[1], 'image', url);
      }
  });

  const scanTextForUrls = (text: string) => {
      const matches = text.match(UNIVERSAL_URL_REGEX);
      if (matches) {
          matches.forEach(match => {
              const clean = match.replace(/\\/g, '');
              if (clean.match(/\.(mp4|webm|mov|mkv)$/i)) addAsset(clean, 'video', url);
              else addAsset(clean, 'image', url);
          });
      }
  };
  scanTextForUrls(htmlContent);

  return {
    images: Array.from(images),
    videos: Array.from(videos),
    title: doc.title || new URL(url).hostname,
  };
};

export const fetchRemoteBlob = async (url: string): Promise<{ blob: Blob; mimeType: string }> => {
    const isElectron = navigator.userAgent.toLowerCase().includes(' electron/');

    for (const proxy of PROXIES) {
        if (!proxy.supportsBinary) continue;
        if (!isElectron && proxy.name === 'Direct') continue;

        try {
            const res = await fetchWithTimeout(proxy.url(url));
            if (res.ok) {
                const blob = await res.blob();
                let mimeType = blob.type;
                if (!mimeType || mimeType === 'text/plain' || mimeType === 'application/octet-stream') {
                    if (url.match(/\.mp4$/i)) mimeType = 'video/mp4';
                    else if (url.match(/\.jpe?g$/i)) mimeType = 'image/jpeg';
                    else if (url.match(/\.png$/i)) mimeType = 'image/png';
                }
                return { blob, mimeType };
            }
        } catch (e) {}
    }
    throw new Error("Unable to retrieve media file.");
}

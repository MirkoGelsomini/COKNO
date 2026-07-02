// Unsplash API integration — live search, no local storage

export interface UnsplashPhoto {
  id: string;
  description: string | null;
  alt_description: string | null;
  urls: {
    small: string;
    regular: string;
  };
  user: {
    name: string;
    username: string;
    links: { html: string };
  };
  tags: { title: string }[];
  links: { html: string };
  width: number;
  height: number;
}

export interface UnsplashSearchResult {
  results: UnsplashPhoto[];
  total: number;
  totalPages: number;
}

const BASE_URL = "https://api.unsplash.com";

export async function searchPhotos(
  query: string,
  page = 1,
  perPage = 12
): Promise<UnsplashSearchResult> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    throw new Error("UNSPLASH_ACCESS_KEY not configured in .env");
  }

  const url = `${BASE_URL}/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;

  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Unsplash error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    results: UnsplashPhoto[];
    total: number;
    total_pages: number;
  };

  return {
    results: data.results,
    total: data.total,
    totalPages: data.total_pages,
  };
}

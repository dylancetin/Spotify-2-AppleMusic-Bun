import { AppleSession } from "./appleSession";
import { AppleSong } from "../domain/types";
import { callApi } from "./limiter";

export async function searchByIsrc(
  session: AppleSession,
  isrc: string,
  countryCode: string,
): Promise<AppleSong[]> {
  const url = `https://amp-api.music.apple.com/v1/catalog/${countryCode}/songs?filter[isrc]=${encodeURIComponent(isrc)}`;

  try {
    const response = await callApi(() => session.get(url));

    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    } else {
      console.error(
        `Error ${response.status} while searching by ISRC: ${isrc}`,
      );
      return [];
    }
  } catch (error) {
    console.error(
      `An error occurred with the ISRC based search request: ${error}`,
    );
    return [];
  }
}

export async function getEquivalentSongId(
  session: AppleSession,
  songId: string,
  countryCode: string,
): Promise<string> {
  const url = `https://amp-api.music.apple.com/v1/catalog/${encodeURIComponent(countryCode)}/songs?filter[equivalents]=${encodeURIComponent(songId)}`;

  try {
    const response = await callApi(() => session.get(url));

    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return data.data[0].id;
      }
    }

    // If we can't find an equivalent, return the original ID
    return songId;
  } catch (error) {
    console.error(`Error fetching equivalent song ID: ${error}`);
    return songId;
  }
}

export async function textSearch(
  session: AppleSession,
  url: string,
): Promise<any> {
  try {
    const response = await callApi(() => session.get(url));

    if (response.ok) {
      return await response.json();
    } else if (response.status === 404) {
      console.log(`404 Not Found for ${url} — skipping.`);
      return { results: [] }; // Return results as empty to avoid breaking the flow
    } else {
      console.log(`Error ${response.status} while calling API, retrying...`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error in text search: ${error}:`, error);
    throw error;
  }
}

export async function searchByText(
  session: AppleSession,
  title: string,
  artist: string,
  album: string,
  countryCode: string,
): Promise<any> {
  // Build the search URL with proper encoding
  const baseUrl = `https://itunes.apple.com/search?country=${countryCode}&media=music&entity=song&limit=15&term=${encodeURIComponent(title)}`;
  const artistTerm = `&artistTerm=${encodeURIComponent(artist)}`;
  const albumTerm = `&albumTerm=${encodeURIComponent(album)}`;

  // Try different search combinations
  const urls = [
    `${baseUrl}${artistTerm}${albumTerm}`, // title + artist + album
    `${baseUrl}${artistTerm}`, // title + artist
    `${baseUrl}${albumTerm}`, // title + album
    baseUrl, // title only
  ];

  for (const url of urls) {
    try {
      const response = await callApi(() => session.get(url));

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          return data;
        }
      } else if (response.status === 404) {
        console.log(`404 Not Found for ${url} — skipping.`);
        return { results: [] }; // Return results as empty to avoid breaking the flow
      } else {
        console.log(`Error ${response.status} while calling API, retrying...`);
      }
    } catch (error) {
      console.error(`Error searching by text: ${error}`);
    }
  }

  return { results: [] };
}

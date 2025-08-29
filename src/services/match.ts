import { AppleSession } from "./appleSession";
import { textSearch } from "./appleCatalog";
import { fetchAndVerifyReleaseDate } from "../services/html";
import { Config } from "../config";

export async function tryTextMatch(
  session: AppleSession,
  url: string,
  title: string,
  artist: string,
  album: string,
  date: string,
): Promise<string | null> {
  try {
    const data = await textSearch(session, url);

    for (const each of data.results) {
      if (
        // Trying to match with the exact track name, the artist name and the album name
        (each.trackName?.toLowerCase() === title.toLowerCase() &&
          each.artistName?.toLowerCase() === artist.toLowerCase() &&
          each.collectionName?.toLowerCase() === album.toLowerCase()) ||
        // Trying to match with the release date, this is another accurate way.
        // It's really rare to have the same release date for two different songs with the same information.
        (await verifyReleaseDate(each, date)) ||
        // Trying to match with the exact track name and the artist name
        (each.trackName?.toLowerCase() === title.toLowerCase() &&
          each.artistName?.toLowerCase() === artist.toLowerCase()) ||
        // Trying to match with the exact track name and the artist name, in the case artist name are different between Spotify and Apple Music
        (each.trackName?.toLowerCase() === title.toLowerCase() &&
          (each.artistName?.toLowerCase().replace(/\s/g, "") ===
            artist.toLowerCase().replace(/\s/g, "") ||
            artist.toLowerCase().replace(/\s/g, "") ===
              each.artistName?.toLowerCase().replace(/\s/g, ""))) ||
        // Trying to match with the exact artist name and the track name, in the case track name are different between Spotify and Apple Music
        (each.artistName?.toLowerCase() === title.toLowerCase() &&
          (each.trackName?.toLowerCase().replace(/\s/g, "") ===
            artist.toLowerCase().replace(/\s/g, "") ||
            artist.toLowerCase().replace(/\s/g, "") ===
              each.trackName?.toLowerCase().replace(/\s/g, "")))
      ) {
        return each.trackId;
      }
    }
  } catch (error) {
    console.error(`Error in tryTextMatch: ${error}`);
  }

  return null;
}

async function verifyReleaseDate(item: any, date: string): Promise<boolean> {
  if (!item.trackViewUrl) return false;
  return fetchAndVerifyReleaseDate(item.trackViewUrl, date);
}

export async function getItunesId(
  session: AppleSession,
  title: string,
  artist: string,
  album: string,
  date: string,
  config: Config,
): Promise<string | null> {
  console.log({ title, artist, album, date });

  // Base URL object
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("country", config.countryCode.toLowerCase());
  url.searchParams.set("media", "music");
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", "15");
  url.searchParams.set("term", title);

  // Helper to clone base URL and add extra params
  function buildUrl(extraParams: Record<string, string>): string {
    const u = new URL(url.toString());
    for (const [key, value] of Object.entries(extraParams)) {
      u.searchParams.set(key, value);
    }
    return u.toString();
  }

  try {
    // Search for the title + artist + album
    let result = await tryTextMatch(
      session,
      buildUrl({ artistTerm: artist, albumTerm: album }),
      title,
      artist,
      album,
      date,
    );

    // If no result, search for the title + artist
    if (result === null) {
      result = await tryTextMatch(
        session,
        buildUrl({ artistTerm: artist }),
        title,
        artist,
        album,
        date,
      );

      // If no result, search for the title + album
      if (result === null) {
        result = await tryTextMatch(
          session,
          buildUrl({ albumTerm: album }),
          title,
          artist,
          album,
          date,
        );

        // If no result, search for the title only
        if (result === null) {
          result = await tryTextMatch(
            session,
            url.toString(),
            title,
            artist,
            album,
            date,
          );
        }
      }
    }

    return result;
  } catch (error) {
    console.error(
      `An error occurred with the text based search request: ${error}`,
    );
    throw error;
  }
}


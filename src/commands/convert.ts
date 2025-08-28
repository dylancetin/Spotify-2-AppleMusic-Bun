import { Config } from "../config";
import { createAppleSession } from "../services/appleSession";
import {
  getOrCreatePlaylist,
  getPlaylistCatalogIds,
  addSongToPlaylist,
} from "../services/playlists";
import { searchByIsrc, getEquivalentSongId } from "../services/appleCatalog";
import { getItunesId } from "../services/match";
import { readCsv, appendLineToFile } from "../services/csv";
import { escapeApostrophes } from "../utils/string";
import { Stats } from "../domain/types";

function derivePlaylistName(filePath: string): string {
  // Extract filename without extension
  let playlistName = filePath.split("/").pop() || filePath;
  playlistName = playlistName.split(".")[0];
  // Replace underscores with spaces and capitalize
  playlistName = playlistName.replace(/_/g, " ");
  return playlistName.charAt(0).toUpperCase() + playlistName.slice(1);
}

export async function convertPlaylist(
  filePath: string,
  config: Config,
): Promise<Stats> {
  // Open Apple Music session
  const session = createAppleSession(config);

  // Derive playlist name from CSV filename
  const playlistName = derivePlaylistName(filePath);
  console.log(`Processing playlist: ${playlistName}`);

  // Create or get playlist
  const playlistId = await getOrCreatePlaylist(session, playlistName);

  // Get existing track IDs in playlist
  const existingTrackIds = await getPlaylistCatalogIds(session, playlistId);

  // Read CSV file
  const { rows } = await readCsv(filePath);

  // Initialize stats
  const stats: Stats = {
    total: rows.length,
    converted: 0,
    failed: 0,
    isrcBased: 0,
    textBased: 0,
  };
  const BATCH_SIZE = config.batchSize;

  // Process each track
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const now = Date.now();
    const batch = rows.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (row, j) => {
        const n = i * BATCH_SIZE + j + 1;
        // Normalize fields
        const title = escapeApostrophes(row.title);
        const artist = escapeApostrophes(row.artist);
        const album = escapeApostrophes(row.album);
        const albumArtist = escapeApostrophes(row.albumArtist);
        const date = escapeApostrophes(row.date);
        const isrc = escapeApostrophes(row.isrc);

        let trackId: string | null = null;

        // Try ISRC-based search first
        if (isrc) {
          const results = await searchByIsrc(session, isrc, config.countryCode);
          if (results.length > 0) {
            // Apply matching heuristics
            for (const song of results) {
              const isrcAlbumName = escapeApostrophes(
                song.attributes.albumName.toLowerCase(),
              );
              const isrcArtistName = escapeApostrophes(
                song.attributes.artistName.toLowerCase(),
              );

              if (
                isrcAlbumName === album.toLowerCase() &&
                isrcArtistName === albumArtist.toLowerCase()
              ) {
                trackId = song.id;
                break;
              } else if (
                isrcAlbumName === album.toLowerCase() &&
                (isrcArtistName.includes(albumArtist.toLowerCase()) ||
                  albumArtist.toLowerCase().includes(isrcArtistName))
              ) {
                trackId = song.id;
                break;
              } else if (
                isrcAlbumName.startsWith(album.toLowerCase().substring(0, 7)) &&
                isrcArtistName.startsWith(
                  albumArtist.toLowerCase().substring(0, 7),
                )
              ) {
                trackId = song.id;
                break;
              } else if (isrcAlbumName === album.toLowerCase()) {
                trackId = song.id;
                break;
              }
            }

            if (trackId) {
              stats.isrcBased += 1;
            }
          }
        }

        // If no ISRC match, try text-based search
        if (!trackId) {
          console.log(
            `No result found for ${title} | ${artist} | ${album} | ${date} with ${isrc}. Trying text based search...`,
          );
          trackId = await getItunesId(session, title, artist, album, date);
          if (trackId) {
            stats.textBased += 1;
          }
        }

        // If track is found, add it to playlist
        if (trackId) {
          console.log(`N°${n} | ${title} | ${artist} | ${album} => ${trackId}`);

          // Check for equivalent song ID
          const equivalentSongId = await getEquivalentSongId(
            session,
            trackId,
            config.countryCode,
          );
          if (equivalentSongId !== trackId) {
            console.log(
              `${trackId} switched to equivalent -> ${equivalentSongId}`,
            );
            trackId = equivalentSongId;
          }

          // Check if track already exists in playlist
          if (existingTrackIds.includes(trackId)) {
            console.log(
              `Song ${trackId} already in playlist ${playlistName}!\n`,
            );
            stats.failed += 1;
            return;
          }

          // Add delay between calls to avoid rate limiting
          const delay = Math.max(0.5, config.delay);
          await new Promise((resolve) => setTimeout(resolve, delay * 1000));

          // Add song to playlist
          const result = await addSongToPlaylist(
            session,
            trackId,
            playlistId,
            existingTrackIds,
            playlistName,
          );

          if (result === "OK") {
            stats.converted += 1;
            // Add to existing track IDs to prevent duplicates
            existingTrackIds.push(trackId);
          } else if (result === "ERROR") {
            const failureLine = `${title} | ${artist} | ${album} => UNABLE TO ADD TO PLAYLIST`;
            await appendLineToFile(`${playlistName}_noresult.txt`, failureLine);
            stats.failed += 1;
          } else if (result === "DUPLICATE") {
            stats.failed += 1;
          }
        } else {
          // Track not found
          console.log(
            `N°${n} | ${title} | ${artist} | ${album} => NOT FOUND\n`,
          );
          const failureLine = `${title} | ${artist} | ${album} => NOT FOUND`;
          await appendLineToFile(`${playlistName}_noresult.txt`, failureLine);
          stats.failed += 1;
        }
      }),
    );

    // Add delay between tracks

    const finish = Date.now();
    const delay = Math.max(0.5, config.delay);
    if (delay > finish - now) {
      await new Promise((resolve) => setTimeout(resolve, finish - now));
    }
    await new Promise((resolve) => setTimeout(resolve, delay * 1000));
  }

  return stats;
}


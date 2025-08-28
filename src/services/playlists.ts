import { AppleSession } from "./appleSession";
import { callApi } from "./limiter";

export async function getOrCreatePlaylist(
  session: AppleSession,
  playlistName: string,
): Promise<string> {
  const url = "https://amp-api.music.apple.com/v1/me/library/playlists";
  const data = {
    attributes: {
      name: playlistName,
      description: "A new playlist created via API using Spotify-2-AppleMusic",
    },
  };

  try {
    // Test if playlist exists
    const response = await callApi(() => session.get(url));

    if (response.ok) {
      const result = await response.json();
      if (result.data) {
        for (const playlist of result.data) {
          if (
            playlist.attributes &&
            playlist.attributes.name === playlistName
          ) {
            console.log(`Playlist ${playlistName} already exists!`);
            return playlist.id;
          }
        }
      }
    }

    // Create playlist if not found
    const createResponse = await callApi(() => session.post(url, data));

    if (createResponse.ok) {
      // Small delay to ensure playlist is created
      await new Promise((resolve) => setTimeout(resolve, 200));
      const result = await createResponse.json();
      return result.data[0].id;
    } else if (createResponse.status === 400) {
      try {
        const errorData = await createResponse.json();
        for (const error of errorData.errors || []) {
          console.error(
            `\nError 400: Bad Request. ${error.code}: ${error.messageForDisplay}`,
          );
          console.error(`\n${error.title}: ${error.detail}`);
        }
      } catch (e) {
        console.error(
          `Error 400: 'Bad Request' while creating playlist ${playlistName}!`,
        );
      }
      process.exit(1);
    } else if (createResponse.status === 401) {
      console.error(
        "\nError 401: Unauthorized. Please refer to the README and check you have entered your Bearer Token, Media-User-Token and session cookies.\n",
      );
      process.exit(1);
    } else if (createResponse.status === 403) {
      console.error(
        "\nError 403: Forbidden. Please refer to the README and check you have entered your Bearer Token, Media-User-Token and session cookies.\n",
      );
      process.exit(1);
    } else {
      throw new Error(
        `Error ${createResponse.status} while creating playlist ${playlistName}!`,
      );
    }
  } catch (error) {
    console.error(`Error creating/getting playlist: ${error}`);
    process.exit(1);
  }
}

export async function getPlaylistCatalogIds(
  session: AppleSession,
  playlistId: string,
): Promise<string[]> {
  try {
    const url = `https://amp-api.music.apple.com/v1/me/library/playlists/${encodeURIComponent(playlistId)}/tracks`;
    const response = await callApi(() => session.get(url));

    if (response.ok) {
      const result = await response.json();
      if (result.data) {
        return result.data
          .filter(
            (track: any) =>
              track.attributes &&
              track.attributes.playParams &&
              track.attributes.playParams.catalogId,
          )
          .map((track: any) => track.attributes.playParams.catalogId);
      }
      return [];
    } else if (response.status === 404) {
      return [];
    } else {
      throw new Error(
        `Error ${response.status} while getting playlist ${playlistId}!`,
      );
    }
  } catch (error) {
    console.error(`Error while getting playlist ${playlistId}: ${error}`);
    throw error;
  }
}

export async function addSongToPlaylist(
  session: AppleSession,
  songId: string,
  playlistId: string,
  playlistTrackIds: string[],
  playlistName: string,
): Promise<"OK" | "ERROR" | "DUPLICATE"> {
  try {
    // First check if song is already in playlist
    if (playlistTrackIds.includes(songId)) {
      console.log(`Song ${songId} already in playlist ${playlistName}!\n`);
      return "DUPLICATE";
    }

    const url = `https://amp-api.music.apple.com/v1/me/library/playlists/${playlistId}/tracks`;
    const data = { data: [{ id: songId, type: "songs" }] };

    const response = await callApi(() => session.post(url, data));

    // Checking if the request is successful
    if (response.ok || response.status === 201 || response.status === 204) {
      console.log(`Song ${songId} added successfully!\n\n`);
      return "OK";
    } else {
      console.error(
        `Error ${response.status} while adding song ${songId}: ${response.statusText}\n`,
      );
      return "ERROR";
    }
  } catch (error) {
    console.error(
      `HOST ERROR: Apple Music might have blocked the connection during the add of ${songId}!\nPlease wait a few minutes and try again.\nIf the problem persists, please contact the developer.\n`,
    );
    return "ERROR";
  }
}


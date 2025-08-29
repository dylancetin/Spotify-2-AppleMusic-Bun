import { readFile } from "fs/promises";
import {
  validTrackNamesColumns,
  validArtistNamesColumns,
  validAlbumNamesColumns,
} from "../domain/csvColumns";
import { TrackRow } from "../domain/types";
import { CsvFormatError } from "../domain/errors";
import { parse } from "csv-parse/sync";

export async function readCsv(
  filePath: string,
): Promise<{ headers: string[]; rows: TrackRow[] }> {
  try {
    const content = await readFile(filePath, "utf-8");

    // Parse CSV into rows (arrays, not objects)
    const records: string[][] = parse(content, {
      skip_empty_lines: true,
      relax_quotes: true,
    });
    await Bun.write("./log", JSON.stringify(records[1]));

    if (records.length < 1) {
      throw new CsvFormatError("CSV file is empty");
    }

    const headers = records[0];
    validateHeaders(headers);

    const rows: TrackRow[] = [];

    for (let i = 1; i < records.length; i++) {
      const values = records[i];

      // Pad values array to ensure it has enough elements
      while (values.length < 17) {
        values.push("");
      }

      rows.push({
        title: values[1] || "",
        artist: values[3] || "",
        album: values[5] || "",
        albumArtist: values[7] || "",
        date: values[8] || "",
        isrc: values[16] || "",
      });
    }

    return { headers, rows };
  } catch (error) {
    if (error instanceof CsvFormatError) {
      throw error;
    }
    throw new CsvFormatError(`Error reading CSV file: ${error}`);
  }
}

function validateHeaders(headers: string[]): void {
  if (headers.length < 17) {
    throw new CsvFormatError(
      "\nThe CSV file is not in the correct format!\nPlease be sure to download the CSV file(s) only from https://watsonbox.github.io/exportify/.\n\n",
    );
  }

  if (
    !validTrackNamesColumns.includes(headers[1]) ||
    !validArtistNamesColumns.includes(headers[3]) ||
    !validAlbumNamesColumns.includes(headers[5]) ||
    headers[16] !== "ISRC"
  ) {
    throw new CsvFormatError(
      "\nThe CSV file is not in the correct format!\nPlease be sure to download the CSV file(s) only from https://watsonbox.github.io/exportify/.\n\n",
    );
  }
}

export async function appendLineToFile(
  filePath: string,
  line: string,
): Promise<void> {
  try {
    // Read the existing content
    let existingContent = "";
    try {
      existingContent = await Bun.file(filePath).text();
    } catch (e) {
      // File doesn't exist yet, that's fine
    }

    // Append the new line
    await Bun.write(filePath, existingContent + line + "\n");
  } catch (error) {
    console.error(`Error writing to file ${filePath}: ${error}`);
  }
}

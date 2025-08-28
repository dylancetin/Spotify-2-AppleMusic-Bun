import { readFile } from "fs/promises";
import {
  validTrackNamesColumns,
  validArtistNamesColumns,
  validAlbumNamesColumns,
} from "../domain/csvColumns";
import { TrackRow } from "../domain/types";
import { CsvFormatError } from "../domain/errors";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Handle escaped quotes ("")
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);

  // Trim surrounding whitespace and quotes
  return result.map((val) => val.trim().replace(/^"|"$/g, ""));
}

export async function readCsv(
  filePath: string,
): Promise<{ headers: string[]; rows: TrackRow[] }> {
  try {
    const content = await readFile(filePath, "utf-8");
    const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");

    if (lines.length < 1) {
      throw new CsvFormatError("CSV file is empty");
    }

    const headers = parseCsvLine(lines[0]);
    validateHeaders(headers);

    const rows: TrackRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === "") continue;

      const values = parseCsvLine(line);

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
  // Ensure the CSV file has the correct format by checking specific column positions
  if (headers.length < 17) {
    console.log("hi ?=");
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


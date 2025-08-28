#!/usr/bin/env bun

import { existsSync } from "fs";
import { readdir } from "fs/promises";
import { loadConfig } from "./config";
import { convertPlaylist } from "./commands/convert";

async function main() {
  const args = process.argv.slice(2);

  // Check if the command is correct
  if (args.length === 0) {
    console.log(
      "\nCommand usage:\nbun run src/cli.ts yourplaylist.csv\nMore info at https://github.com/therealmarius/Spotify-2-AppleMusic",
    );
    process.exit(1);
  }

  const path = args[0];

  // Load configuration
  const config = await loadConfig();

  if (existsSync(path)) {
    if (path.endsWith(".csv")) {
      // Process single CSV file
      const stats = await convertPlaylist(path, config);
      printStats(stats);
    } else {
      // Process directory with CSV files
      try {
        const files = await readdir(path);
        const csvFiles = files.filter((file) => file.endsWith(".csv"));

        if (csvFiles.length === 0) {
          console.log("No CSV files found in directory");
          process.exit(1);
        }

        // Process each CSV file
        for (const file of csvFiles) {
          const fullPath = `${path}/${file}`;
          console.log(`\nProcessing file: ${file}`);
          const stats = await convertPlaylist(fullPath, config);
          printStats(stats);
        }
      } catch (error) {
        console.error(`Error reading directory ${path}: ${error}`);
        process.exit(1);
      }
    }
  } else {
    console.log(`Path ${path} does not exist`);
    process.exit(1);
  }
}

function printStats(stats: any) {
  const convertedPercentage =
    stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 100;

  console.log(
    `\n - STAT REPORT -\n` +
      `Playlist Songs: ${stats.total}\n` +
      `Converted Songs: ${stats.converted}\n` +
      `Failed Songs: ${stats.failed}\n` +
      `Playlist converted at ${convertedPercentage}%\n\n` +
      `Converted using ISRC: ${stats.isrcBased}\n` +
      `Converted using text based search: ${stats.textBased}\n\n`,
  );
}

// Run the main function
main().catch((error) => {
  console.error("An unexpected error occurred:", error, error.stack);
  process.exit(1);
});


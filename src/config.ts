import { existsSync, readFileSync } from "fs";
import { exit } from "process";
import * as readline from "readline";

export interface Config {
  authorization: string;
  mediaUserToken: string;
  cookies: string;
  countryCode: string;
  delay: number;
  interactive: boolean;
  batchSize: number;
}

function askUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question + " ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function getConnectionData(
  filename: string,
  envName: string,
  prompt: string,
): Promise<string> {
  // First try environment variable
  const envValue = process.env[envName];
  if (envValue) {
    return envValue;
  }

  // Then try .dat file
  if (existsSync(filename)) {
    return readFileSync(filename, "utf-8").trim();
  }
  console.log(process.env.INTERACTIVE_MODE);
  // If interactive mode is enabled, prompt user
  if (process.env.INTERACTIVE_MODE === "false") {
    // If neither env nor file exists and INTERACTIVE_MODE is disabled exit with error
    console.error(`Missing required configuration: ${envName}`);
    console.error(
      "Please provide this value via environment variable or .dat file",
    );
    exit(1);
  }

  return await askUser(prompt);
}

export async function loadConfig(): Promise<Config> {
  const authorization = await getConnectionData(
    "token.dat",
    "APPLE_AUTHORIZATION",
    "\nPlease enter your Apple Music Authorization (Bearer token):\n",
  );

  const mediaUserToken = await getConnectionData(
    "media_user_token.dat",
    "APPLE_MEDIA_USER_TOKEN",
    "\nPlease enter your media user token:\n",
  );

  const cookies = await getConnectionData(
    "cookies.dat",
    "APPLE_COOKIES",
    "\nPlease enter your cookies:\n",
  );

  const countryCode = await getConnectionData(
    "country_code.dat",
    "APPLE_COUNTRY_CODE",
    "\nPlease enter the country code (e.g., FR, UK, US etc.): ",
  );

  const batchSize = Number(
    await getConnectionData(
      "batch_size.dat",
      "BATCH_SIZE",
      "\nPlease enter the batch size (e.g. 5): ",
    ),
  );

  // Default delay is 1 second, minimum 0.5 seconds
  const delay = Math.max(0.5, parseFloat(process.env.DELAY || "1"));

  // Interactive mode flag
  const interactive = process.env.INTERACTIVE_MODE === "true";

  return {
    authorization,
    mediaUserToken,
    cookies,
    countryCode,
    delay,
    interactive,
    batchSize,
  };
}

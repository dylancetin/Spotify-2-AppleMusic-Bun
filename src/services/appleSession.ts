import { Config } from "../config";

export interface AppleSession {
  headers: Record<string, string>;
  get(url: string, opt?: BunFetchRequestInit): Promise<Response>;
  post(url: string, data?: any): Promise<Response>;
}

export function createAppleSession(config: Config): AppleSession {
  const headers = {
    Authorization: config.authorization,
    "media-user-token": config.mediaUserToken,
    Cookie: config.cookies,
    Referer: "https://music.apple.com/",
    Origin: "https://music.apple.com",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.3",
    "Content-Type": "application/json",
  };

  return {
    headers,

    async get(url: string, opt: RequestInit): Promise<Response> {
      return fetch(url, {
        method: "GET",
        headers,
        ...opt,
      });
    },

    async post(url: string, data?: any): Promise<Response> {
      return fetch(url, {
        method: "POST",
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });
    },
  };
}

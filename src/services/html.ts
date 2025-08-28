import * as cheerio from "cheerio";
import { parse } from "date-fns";

export async function fetchAndVerifyReleaseDate(trackViewUrl: string, targetDate: string): Promise<boolean> {
  console.log(`Verifying release date: ${trackViewUrl}`);
  
  try {
    const response = await fetch(trackViewUrl);
    if (!response.ok) {
      return false;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const element = $("p[data-testid='tracklist-footer-description']");
    if (!element || element.length === 0) {
      return false;
    }
    
    const dateStr = element.text().split("\n")[0];
    if (!dateStr) {
      return false;
    }
    
    // Parse dates using date-fns
    // Try different formats that might be used
    const formats = [
      "yyyy-MM-dd",
      "MMM d, yyyy",
      "MMMM d, yyyy",
      "d MMM yyyy",
      "d MMMM yyyy"
    ];
    
    let parsedTargetDate: Date | null = null;
    let parsedDateStr: Date | null = null;
    
    // Try to parse target date
    for (const format of formats) {
      const date = parse(targetDate, format, new Date());
      if (date.toString() !== "Invalid Date") {
        parsedTargetDate = date;
        break;
      }
    }
    
    // Try to parse date from HTML
    for (const format of formats) {
      const date = parse(dateStr, format, new Date());
      if (date.toString() !== "Invalid Date") {
        parsedDateStr = date;
        break;
      }
    }
    
    // If we couldn't parse either date, return false
    if (!parsedTargetDate || !parsedDateStr) {
      return false;
    }
    
    // Compare only the date portion (year, month, day)
    return (
      parsedTargetDate.getFullYear() === parsedDateStr.getFullYear() &&
      parsedTargetDate.getMonth() === parsedDateStr.getMonth() &&
      parsedTargetDate.getDate() === parsedDateStr.getDate()
    );
  } catch (error) {
    console.error(`Error verifying release date: ${error}`);
    return false;
  }
}
import { marked } from "marked";

export function mdAHtml(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

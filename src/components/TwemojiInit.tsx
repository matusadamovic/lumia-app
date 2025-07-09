"use client";

import { useEffect } from "react";
import twemoji from "twemoji";

export default function TwemojiInit() {
  useEffect(() => {
    const config = {
      base: "/twemoji/",
      folder: "svg",
      ext: ".svg",
    } as const;

    const parse = () => twemoji.parse(document.body, config);
    parse();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            twemoji.parse(node as HTMLElement, config);
          }
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);
  return null;
}

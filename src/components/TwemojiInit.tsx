"use client";

import { useEffect } from "react";
import twemoji from "twemoji";

export default function TwemojiInit() {
  useEffect(() => {
    twemoji.parse(document.body, {
      base: "/twemoji/",
      folder: "svg",
      ext: ".svg",
    });
  }, []);
  return null;
}

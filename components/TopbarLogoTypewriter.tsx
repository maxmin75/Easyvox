"use client";

import { useEffect, useState } from "react";

type TypingPhase = "typing" | "holding" | "deleting";

const logoWords = ["EasyVox", "your AI."];

export default function TopbarLogoTypewriter() {
  const [wordIndex, setWordIndex] = useState(0);
  const [typedWord, setTypedWord] = useState("");
  const [typingPhase, setTypingPhase] = useState<TypingPhase>("typing");

  useEffect(() => {
    const currentWord = logoWords[wordIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (typingPhase === "typing") {
      if (typedWord.length < currentWord.length) {
        timer = setTimeout(() => {
          setTypedWord(currentWord.slice(0, typedWord.length + 1));
        }, 220);
      } else {
        timer = setTimeout(() => {
          setTypingPhase("holding");
        }, 4000);
      }
    } else if (typingPhase === "holding") {
      timer = setTimeout(() => {
        setTypingPhase("deleting");
      }, 0);
    } else if (typedWord.length > 0) {
      timer = setTimeout(() => {
        setTypedWord(currentWord.slice(0, typedWord.length - 1));
      }, 140);
    } else {
      timer = setTimeout(() => {
        setWordIndex((previous) => (previous + 1) % logoWords.length);
        setTypingPhase("typing");
      }, 350);
    }

    return () => clearTimeout(timer);
  }, [typedWord, typingPhase, wordIndex]);

  return (
    <span className="topbar-logo-typewriter">
      {typedWord}
      <span className="topbar-logo-cursor" aria-hidden="true">
        _
      </span>
    </span>
  );
}

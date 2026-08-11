"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("hischoir-theme") ?? localStorage.getItem("service-set-theme");
    const isLight = saved === "light";
    document.documentElement.classList.toggle("light", isLight);
    setLight(isLight);
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("hischoir-theme", next ? "light" : "dark");
  }

  return (
    <Button variant="secondary" size="icon" onClick={toggle} aria-label={`Use ${light ? "dark" : "light"} mode`}>
      {light ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  );
}

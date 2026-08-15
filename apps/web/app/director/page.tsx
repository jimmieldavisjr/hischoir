import type { Metadata } from "next";
import { DirectorPlanner } from "@/components/director-planner";

export const metadata: Metadata = { title: "Director" };

export default function DirectorPage() {
  return <DirectorPlanner />;
}

import type { Metadata } from "next";
import { TeamPortal } from "@/components/team-portal";

export const metadata: Metadata = { title: "Team Schedule" };

export default function TeamPage() {
  return <TeamPortal />;
}

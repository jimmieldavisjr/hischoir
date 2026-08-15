import type { Metadata } from "next";
import { TeamPortal } from "@/components/team-portal";

export const metadata: Metadata = { title: "Sabbath Plan" };

export default async function ServicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <TeamPortal token={token} />;
}

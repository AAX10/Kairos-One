import { AppShell } from "@/components/layout/app-shell";
import { MissionControl } from "@/components/dashboard/mission-control";

export default function Home() {
  return (
    <AppShell>
      <MissionControl />
    </AppShell>
  );
}

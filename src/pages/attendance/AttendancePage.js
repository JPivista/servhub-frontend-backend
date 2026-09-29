import GlassPanel, { PageIntro } from "../../components/ui/GlassPanel";

export default function AttendancePage() {
  return (
    <div className="space-y-5">
      <PageIntro kicker="People" title="Attendance" />
      <GlassPanel as="article" className="p-8 text-center">
        <p className="text-lg font-semibold">We're working on it</p>
        <p className="mt-2 text-sm text-white/55">We'll update you soon.</p>
      </GlassPanel>
    </div>
  );
}

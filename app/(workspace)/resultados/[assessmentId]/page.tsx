import { notFound } from "next/navigation";
import { z } from "zod";
import { AssessmentResultDashboard } from "@/components/results/AssessmentResultDashboard";
import { loadAssessmentReport } from "@/lib/assessment-report";

export default async function AssessmentResultPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = await params;
  const parsed = z.string().uuid().safeParse(assessmentId);
  if (!parsed.success) notFound();

  const report = await loadAssessmentReport(parsed.data);
  if (!report) notFound();

  return <AssessmentResultDashboard report={report} />;
}

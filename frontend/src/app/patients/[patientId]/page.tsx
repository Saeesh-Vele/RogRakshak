"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Sparkles,
  Clock,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Patient } from "@/types/patient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RiskBadge } from "@/components/ui/risk-badge";
import { LabReportCard } from "@/components/labs/lab-report-card";
import {
  formatDateOnly,
  formatDateTime,
  getStatusBadgeVariant,
} from "@/lib/formatters";

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = Number(params?.patientId) || 1;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await apiClient.getPatientById(patientId);
        if (res && res.patient) {
          setPatient(res.patient);
        }
      } catch (err) {
        console.error("Failed to load patient:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm font-semibold text-slate-500 bg-white rounded-xl border border-slate-200">
        Loading clinical patient file...
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-3">
        <AlertCircle className="size-8 text-rose-500 mx-auto" />
        <h3 className="text-sm font-bold text-slate-900">Patient not found</h3>
        <Link
          href="/dashboard"
          className="inline-block px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const statusStyle = getStatusBadgeVariant(patient.status);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Patient Electronic Medical File
              </h1>
              <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {patient.mrn}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive clinical profile, movement audit, and microbiological AST antibiograms
            </p>
          </div>
        </div>

        <div>
          <Link
            href={`/investigate/${patient.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold hover:bg-teal-800 transition-all shadow-xs"
          >
            <Sparkles className="size-3.5 text-teal-300" />
            <span>Launch Outbreak Investigation</span>
          </Link>
        </div>
      </div>

      {/* Patient Core Summary Card */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 text-teal-400 font-bold text-xl shadow-md shrink-0">
                <User className="size-7" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{patient.name}</h2>
                  {patient.id === 1 && (
                    <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-extrabold">
                      INDEX CASE
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                  >
                    <span className={`size-1.5 rounded-full ${statusStyle.dot}`} />
                    {patient.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span>
                    <strong>Demographics:</strong> {patient.gender}, {patient.age} yrs
                  </span>
                  <span>
                    <strong>Current Unit:</strong> {patient.currentWard} {patient.currentBed ? `(${patient.currentBed})` : ""}
                  </span>
                  <span>
                    <strong>Admitted:</strong> {formatDateOnly(patient.admissionDate)}
                  </span>
                  <span>
                    <strong>Primary Diagnosis:</strong> {patient.primaryDiagnosis || "Acute Sepsis"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-right space-y-0.5">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  Assigned Risk Tier
                </div>
                <RiskBadge risk={patient.priority} size="md" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movement Journey History */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="size-4 text-teal-600" />
            <span>Admission, Transfer & Movement Audit Trail</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {patient.movements && patient.movements.length > 0 ? (
            patient.movements.map((mov, idx) => (
              <div
                key={mov.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              >
                <div className="flex size-6 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {mov.location} {mov.bed ? `(${mov.bed})` : ""}
                    </span>
                    <span className="font-mono text-slate-500 text-[11px]">
                      {formatDateTime(mov.startTime)} → {formatDateTime(mov.endTime)}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    <span className="font-semibold text-slate-700">Department:</span>{" "}
                    {mov.department} • <span className="font-semibold">Event:</span>{" "}
                    {mov.eventType}
                  </div>
                  {mov.details && (
                    <div className="text-slate-500 italic pt-0.5">{mov.details}</div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400 text-center py-4">
              Single admission in {patient.currentWard}.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Microbiology Lab Reports with AST Panel */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="size-5 text-teal-600" />
          <span>Microbiology Lab Reports & Phenotypic Profiles</span>
        </h3>

        {patient.labReports && patient.labReports.length > 0 ? (
          patient.labReports.map((report) => (
            <LabReportCard key={report.id} report={report} />
          ))
        ) : (
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-6 text-center text-xs text-slate-500">
              No isolated lab reports recorded for this patient.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

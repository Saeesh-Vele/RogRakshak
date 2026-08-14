"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Search, Sparkles, Filter, User } from "lucide-react";
import { Patient, PriorityLevel } from "@/types/patient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RiskBadge } from "@/components/ui/risk-badge";
import {
  formatDateOnly,
  formatDateTime,
  getResistanceBadgeVariant,
  getStatusBadgeVariant,
} from "@/lib/formatters";

interface CasesTableProps {
  patients: Patient[];
}

type SortField = "name" | "mrn" | "organism" | "status" | "priority" | "admissionDate" | "lastLab";

const priorityWeight: Record<PriorityLevel, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

export function CasesTable({ patients }: CasesTableProps) {
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredAndSortedPatients = useMemo(() => {
    let result = [...patients];

    // Filter by status
    if (statusFilter !== "ALL") {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.mrn.toLowerCase().includes(q) ||
          p.currentWard.toLowerCase().includes(q) ||
          p.latestLab?.organism.toLowerCase().includes(q) ||
          p.latestLab?.resistance.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "mrn":
          comparison = a.mrn.localeCompare(b.mrn);
          break;
        case "organism":
          comparison = (a.latestLab?.organism || "").localeCompare(b.latestLab?.organism || "");
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "priority":
          comparison = (priorityWeight[a.priority] || 0) - (priorityWeight[b.priority] || 0);
          break;
        case "admissionDate":
          comparison = new Date(a.admissionDate).getTime() - new Date(b.admissionDate).getTime();
          break;
        case "lastLab":
          comparison =
            new Date(a.latestLab?.reportedAt || 0).getTime() -
            new Date(b.latestLab?.reportedAt || 0).getTime();
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [patients, statusFilter, searchQuery, sortField, sortAsc]);

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by name, MRN, organism..."
            className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Status quick filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
            <Filter className="size-3" />
            Status:
          </span>
          {["ALL", "Potential Cluster", "Under Investigation", "Resolved"].map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-slate-900 text-white font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {status === "ALL" ? "All Cases" : status}
              </button>
            )
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1.5 hover:text-slate-900 font-semibold"
                >
                  <span>Patient</span>
                  <ArrowUpDown className="size-3 text-slate-400" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("mrn")}
                  className="flex items-center gap-1.5 hover:text-slate-900 font-semibold"
                >
                  <span>MRN</span>
                  <ArrowUpDown className="size-3 text-slate-400" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("organism")}
                  className="flex items-center gap-1.5 hover:text-slate-900 font-semibold"
                >
                  <span>Organism</span>
                  <ArrowUpDown className="size-3 text-slate-400" />
                </button>
              </TableHead>
              <TableHead>Resistance</TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("status")}
                  className="flex items-center gap-1.5 hover:text-slate-900 font-semibold"
                >
                  <span>Status</span>
                  <ArrowUpDown className="size-3 text-slate-400" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("priority")}
                  className="flex items-center gap-1.5 hover:text-slate-900 font-semibold"
                >
                  <span>Priority</span>
                  <ArrowUpDown className="size-3 text-slate-400" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("admissionDate")}
                  className="flex items-center gap-1.5 hover:text-slate-900 font-semibold"
                >
                  <span>Admission</span>
                  <ArrowUpDown className="size-3 text-slate-400" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("lastLab")}
                  className="flex items-center gap-1.5 hover:text-slate-900 font-semibold"
                >
                  <span>Last Lab</span>
                  <ArrowUpDown className="size-3 text-slate-400" />
                </button>
              </TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedPatients.length > 0 ? (
              filteredAndSortedPatients.map((patient) => {
                const statusStyle = getStatusBadgeVariant(patient.status);
                const res = patient.latestLab?.resistance;
                const resVariant = getResistanceBadgeVariant(res);
                const isHighAlert = patient.status === "Potential Cluster";

                return (
                  <TableRow key={patient.id} className="hover:bg-slate-50/80">
                    {/* Patient */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
                          <User className="size-4" />
                        </div>
                        <div>
                          <Link
                            href={`/patients/${patient.id}`}
                            className="font-semibold text-slate-900 hover:text-teal-700 hover:underline flex items-center gap-1"
                          >
                            {patient.name}
                            {patient.id === 1 && (
                              <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-bold">
                                INDEX
                              </span>
                            )}
                          </Link>
                          <div className="text-[11px] text-slate-500">
                            {patient.gender}, {patient.age}y • {patient.currentWard}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* MRN */}
                    <TableCell>
                      <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {patient.mrn}
                      </span>
                    </TableCell>

                    {/* Organism */}
                    <TableCell>
                      {patient.latestLab ? (
                        <div>
                          <div className="text-xs font-semibold text-slate-800 italic">
                            {patient.latestLab.organism}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {patient.latestLab.specimen}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>

                    {/* Resistance */}
                    <TableCell>
                      {res ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${resVariant.bg} ${resVariant.text} ${resVariant.border}`}
                        >
                          {res.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                      >
                        <span className={`size-1.5 rounded-full ${statusStyle.dot}`} />
                        {patient.status}
                      </span>
                    </TableCell>

                    {/* Priority */}
                    <TableCell>
                      <RiskBadge risk={patient.priority} size="sm" />
                    </TableCell>

                    {/* Admission */}
                    <TableCell>
                      <span className="text-xs text-slate-600 font-mono">
                        {formatDateOnly(patient.admissionDate)}
                      </span>
                    </TableCell>

                    {/* Last Lab */}
                    <TableCell>
                      <span className="text-xs text-slate-600 font-mono">
                        {formatDateTime(patient.latestLab?.reportedAt)}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <Link
                        href={`/investigate/${patient.id}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                          isHighAlert
                            ? "bg-teal-700 text-white hover:bg-teal-800 ring-2 ring-teal-600/30"
                            : "bg-slate-900 text-white hover:bg-slate-800"
                        }`}
                      >
                        <Sparkles className="size-3 text-teal-300" />
                        <span>Investigate Case</span>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-24 text-center text-slate-500"
                >
                  No active infection cases found matching filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

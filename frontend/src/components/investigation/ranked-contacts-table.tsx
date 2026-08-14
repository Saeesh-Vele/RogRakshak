"use client";

import Link from "next/link";
import {
  Users,
  User,
  ArrowRight,
} from "lucide-react";
import { RankedContact } from "@/types/investigation";
import { RiskBadge } from "@/components/ui/risk-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface RankedContactsTableProps {
  contacts: RankedContact[];
}

export function RankedContactsTable({
  contacts,
}: RankedContactsTableProps) {
  if (!contacts || contacts.length === 0) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-6 text-center text-slate-500 text-xs">
          Ranked contacts will appear after the Contact & Graph agents complete.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 bg-white shadow-xs">
      <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="size-4 text-teal-600" />
            <span>Ranked High-Risk Exposures & Contacts</span>
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Ranked by transmission likelihood based on temporal overlap and staff intermediary crossover
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {contacts.length} ranked contacts
        </span>
      </CardHeader>

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">Rank</TableHead>
              <TableHead>Contact Individual</TableHead>
              <TableHead>Connection Type</TableHead>
              <TableHead>Intermediary / Mediator</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Overlap</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => {
              const isHighPriority = contact.risk === "High";

              return (
                <TableRow
                  key={contact.id}
                  className={`transition-colors ${
                    isHighPriority ? "bg-rose-50/20 hover:bg-rose-50/40" : "hover:bg-slate-50"
                  }`}
                >
                  {/* Rank */}
                  <TableCell className="text-center font-mono font-bold text-xs text-slate-700">
                    #{contact.rank}
                  </TableCell>

                  {/* Contact Individual */}
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex size-7 items-center justify-center rounded-md font-semibold text-xs border ${
                          contact.patientId
                            ? "bg-slate-100 text-slate-800 border-slate-200"
                            : "bg-teal-50 text-teal-800 border-teal-200"
                        }`}
                      >
                        <User className="size-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                          {contact.patientId ? (
                            <Link
                              href={`/patients/${contact.patientId}`}
                              className="hover:text-teal-700 hover:underline"
                            >
                              {contact.name}
                            </Link>
                          ) : (
                            <span>{contact.name}</span>
                          )}
                          {contact.organismStatus && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                contact.organismStatus.includes("Positive")
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {contact.organismStatus}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {contact.mrn || contact.role}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Connection Type */}
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                      {contact.connectionType}
                    </span>
                  </TableCell>

                  {/* Mediator */}
                  <TableCell className="text-xs font-medium text-slate-700">
                    {contact.mediator ? (
                      <span className="text-teal-900 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                        {contact.mediator}
                      </span>
                    ) : (
                      <span className="text-slate-400">Direct Contact</span>
                    )}
                  </TableCell>

                  {/* Location */}
                  <TableCell className="text-xs text-slate-700 font-medium">
                    {contact.location}
                  </TableCell>

                  {/* Overlap */}
                  <TableCell className="text-xs font-mono font-semibold text-slate-800">
                    {contact.overlap}
                  </TableCell>

                  {/* Risk Level */}
                  <TableCell>
                    <RiskBadge risk={contact.risk} size="sm" />
                  </TableCell>

                  {/* Action */}
                  <TableCell className="text-right">
                    {contact.patientId && (
                      <Link
                        href={`/investigate/${contact.patientId}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline"
                      >
                        <span>Investigate</span>
                        <ArrowRight className="size-3" />
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

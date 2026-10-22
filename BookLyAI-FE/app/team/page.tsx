"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonRows } from "@/components/ui/loading-block";
import { getMyBusiness, type OwnedService } from "@/features/business/api";
import {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  addStaffLeave,
  listStaffLeaves,
  deleteStaffLeave,
} from "@/features/staff/api";
import type {
  StaffMember,
  StaffPermission,
  CreateStaffInput,
  StaffLeave,
} from "@/types/staff";
import { ApiError } from "@/types";

const ALL_PERMISSIONS: Array<{
  key: StaffPermission;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    key: "VIEW_CALENDAR",
    label: "View Calendar",
    description: "View scheduled appointments, client bookings, and daily timeline.",
    icon: "📅",
  },
  {
    key: "MANAGE_CALENDAR",
    label: "Manage Bookings",
    description: "Create, reschedule, cancel, or complete appointments on calendar.",
    icon: "✍️",
  },
  {
    key: "CHAT_CLIENTS",
    label: "Respond to Clients",
    description: "Communicate directly with clients through the AI Assistant inbox.",
    icon: "💬",
  },
  {
    key: "MANAGE_SERVICES",
    label: "Catalog & Pricing",
    description: "Create, edit, or adjust service duration, pricing, and active status.",
    icon: "✂️",
  },
  {
    key: "MANAGE_STAFF",
    label: "Manage Team",
    description: "Add new team members, edit roles, and assign custom permissions.",
    icon: "👥",
  },
  {
    key: "VIEW_ANALYTICS",
    label: "Financial Analytics",
    description: "Access business revenue metrics, daily counts, and performance reports.",
    icon: "📊",
  },
];

const DAYS = [
  { day: 1, label: "Monday" },
  { day: 2, label: "Tuesday" },
  { day: 3, label: "Wednesday" },
  { day: 4, label: "Thursday" },
  { day: 5, label: "Friday" },
  { day: 6, label: "Saturday" },
  { day: 0, label: "Sunday" },
];

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<"members" | "permissions" | "leaves">("members");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<OwnedService[]>([]);
  const [leavesList, setLeavesList] = useState<Array<StaffLeave & { staffName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Add/Edit Form state
  const [formName, setFormName] = useState("");
  const [formTitle, setFormTitle] = useState("Team Member");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPermissions, setFormPermissions] = useState<StaffPermission[]>(["VIEW_CALENDAR"]);
  const [formServiceIds, setFormServiceIds] = useState<string[]>([]);
  const [formHours, setFormHours] = useState<
    Array<{ dayOfWeek: number; active: boolean; startTime: string; endTime: string }>
  >(
    DAYS.map((d) => ({
      dayOfWeek: d.day,
      active: d.day !== 0 && d.day !== 6, // Mon-Fri active by default
      startTime: "09:00",
      endTime: "17:00",
    })),
  );

  // Leave Form state
  const [leaveStaffId, setLeaveStaffId] = useState("");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("Annual Leave");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [staffRes, bizRes] = await Promise.all([listStaff(), getMyBusiness()]);
      setStaffList(staffRes.staff);
      setServices(bizRes.services);

      // Collect all leaves across staff members
      const allLeaves: Array<StaffLeave & { staffName: string }> = [];
      for (const s of staffRes.staff) {
        if (s.leaves && s.leaves.length > 0) {
          for (const l of s.leaves) {
            allLeaves.push({ ...l, staffName: s.name });
          }
        }
      }
      setLeavesList(allLeaves);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load team data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingStaff(null);
    setFormName("");
    setFormTitle("Practitioner");
    setFormEmail("");
    setFormPhone("");
    setFormPermissions(["VIEW_CALENDAR", "CHAT_CLIENTS"]);
    setFormServiceIds(services.map((s) => s.id)); // Connect all by default
    setFormHours(
      DAYS.map((d) => ({
        dayOfWeek: d.day,
        active: d.day !== 0 && d.day !== 6,
        startTime: "09:00",
        endTime: "17:00",
      })),
    );
    setShowAddModal(true);
  };

  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormName(staff.name);
    setFormTitle(staff.title);
    setFormEmail(staff.email ?? "");
    setFormPhone(staff.phone ?? "");
    setFormPermissions(staff.permissions);
    setFormServiceIds(staff.services?.map((s) => s.id) ?? []);

    const existingHours = staff.availabilityRules ?? [];
    setFormHours(
      DAYS.map((d) => {
        const found = existingHours.find((h) => h.dayOfWeek === d.day);
        return {
          dayOfWeek: d.day,
          active: Boolean(found),
          startTime: found?.startTime ?? "09:00",
          endTime: found?.endTime ?? "17:00",
        };
      }),
    );
    setShowAddModal(true);
  };

  const togglePermission = (perm: StaffPermission) => {
    setFormPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const toggleService = (svcId: string) => {
    setFormServiceIds((prev) =>
      prev.includes(svcId) ? prev.filter((id) => id !== svcId) : [...prev, svcId],
    );
  };

  const handleSubmitStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setSubmitting(true);
    try {
      const workingHours = formHours
        .filter((h) => h.active)
        .map((h) => ({
          dayOfWeek: h.dayOfWeek,
          startTime: h.startTime,
          endTime: h.endTime,
        }));

      if (editingStaff) {
        await updateStaff(editingStaff.id, {
          name: formName,
          title: formTitle,
          email: formEmail.trim() || null,
          phone: formPhone.trim() || null,
          permissions: formPermissions,
          serviceIds: formServiceIds,
          workingHours,
        });
      } else {
        await createStaff({
          name: formName,
          title: formTitle,
          email: formEmail.trim() || null,
          phone: formPhone.trim() || null,
          permissions: formPermissions,
          serviceIds: formServiceIds,
          workingHours,
        });
      }

      setShowAddModal(false);
      await loadData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to save team member.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (staffId: string) => {
    if (!confirm("Are you sure you want to deactivate this team member?")) return;
    try {
      await deleteStaff(staffId);
      await loadData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to deactivate team member.");
    }
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStaffId || !leaveStartDate || !leaveEndDate) return;

    setSubmitting(true);
    try {
      await addStaffLeave(leaveStaffId, {
        startDate: new Date(leaveStartDate).toISOString(),
        endDate: new Date(leaveEndDate).toISOString(),
        reason: leaveReason,
        status: "APPROVED",
      });
      setShowLeaveModal(false);
      setLeaveStartDate("");
      setLeaveEndDate("");
      await loadData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to schedule time off.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLeave = async (staffId: string, leaveId: string) => {
    if (!confirm("Cancel this scheduled time off?")) return;
    try {
      await deleteStaffLeave(staffId, leaveId);
      await loadData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to remove time off.");
    }
  };

  return (
    <AppShell dense>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Team & Permissions
              </h1>
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
                {staffList.length} Active Staff
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              Manage practitioners, customize granular permissions, and schedule shifts or time-off.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-1.5 text-xs rounded-xl"
              onClick={() => {
                if (staffList.length > 0) {
                  setLeaveStaffId(staffList[0].id);
                  setShowLeaveModal(true);
                } else {
                  alert("Please add at least one team member first.");
                }
              }}
            >
              🏖️ Add Time Off
            </Button>
            <Button
              type="button"
              className="px-3 py-1.5 text-xs rounded-xl"
              onClick={openCreateModal}
            >
              + Add Team Member
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-line">
          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === "members"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            👥 Team Members ({staffList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("permissions")}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === "permissions"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            🛡️ Role Permissions Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("leaves")}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === "leaves"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            🏖️ Leaves & Time Off ({leavesList.length})
          </button>
        </div>

        {/* Content Views */}
        {loading ? (
          <SkeletonRows count={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : activeTab === "members" ? (
          /* TAB 1: TEAM MEMBERS */
          staffList.length === 0 ? (
            <EmptyState
              title="No team members added yet"
              description="Add your first practitioner or staff member to unlock multi-calendar booking and custom staff permissions."
            >
              <div className="mt-4 flex justify-center">
                <Button type="button" onClick={openCreateModal}>
                  + Add Team Member
                </Button>
              </div>
            </EmptyState>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {staffList.map((staff) => (
                <div
                  key={staff.id}
                  className={`flex flex-col justify-between rounded-2xl border bg-surface p-5 shadow-xs transition hover:border-line-elevated ${
                    staff.isActive ? "border-line" : "border-line/40 opacity-60"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-base font-bold text-accent">
                          {staff.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-base">{staff.name}</h3>
                          <div className="text-xs text-muted font-medium">{staff.title}</div>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          staff.isActive
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {staff.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Contact details */}
                    <div className="space-y-1 text-xs text-muted">
                      {staff.email && <div>📧 {staff.email}</div>}
                      {staff.phone && <div>📱 {staff.phone}</div>}
                    </div>

                    {/* Assigned Services */}
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                        Assigned Services ({staff.services?.length ?? 0})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {staff.services && staff.services.length > 0 ? (
                          staff.services.map((svc) => (
                            <span
                              key={svc.id}
                              className="rounded-md bg-surface-elevated px-2 py-0.5 text-xs text-foreground font-medium"
                            >
                              {svc.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs italic text-muted">No specific services assigned</span>
                        )}
                      </div>
                    </div>

                    {/* Permissions Badges */}
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                        Permissions ({staff.permissions.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {staff.permissions.map((p) => {
                          const meta = ALL_PERMISSIONS.find((item) => item.key === p);
                          return (
                            <span
                              key={p}
                              title={meta?.description}
                              className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent"
                            >
                              <span>{meta?.icon}</span>
                              <span>{meta?.label ?? p}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-3 text-xs">
                    <button
                      type="button"
                      onClick={() => openEditModal(staff)}
                      className="font-semibold text-accent hover:underline"
                    >
                      Edit Details & Hours
                    </button>
                    {staff.isActive && (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(staff.id)}
                        className="text-red-500 hover:text-red-700 font-medium"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === "permissions" ? (
          /* TAB 2: ROLE PERMISSIONS MATRIX */
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-surface p-5">
              <h2 className="font-display text-lg font-bold text-foreground">
                Custom Permissions Guide
              </h2>
              <p className="mt-1 text-sm text-muted">
                Each team member can be assigned customized permission flags. Here is what each role authority allows:
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ALL_PERMISSIONS.map((perm) => (
                <div key={perm.key} className="rounded-xl border border-line bg-surface p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{perm.icon}</span>
                    <h3 className="font-semibold text-foreground text-sm">{perm.label}</h3>
                  </div>
                  <code className="text-[11px] text-accent font-mono bg-accent-soft px-1.5 py-0.5 rounded">
                    {perm.key}
                  </code>
                  <p className="text-xs text-muted leading-relaxed">{perm.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* TAB 3: LEAVES & TIME OFF */
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-4">
              <div>
                <h2 className="font-display text-base font-bold text-foreground">
                  Scheduled Leaves & Vacations
                </h2>
                <p className="text-xs text-muted">
                  During approved leaves, the availability engine automatically removes slots for the practitioner so customers cannot double-book them.
                </p>
              </div>
              <Button
                type="button"
                className="px-3 py-1.5 text-xs rounded-xl"
                onClick={() => setShowLeaveModal(true)}
              >
                + Schedule Leave
              </Button>
            </div>

            {leavesList.length === 0 ? (
              <EmptyState
                title="No upcoming leaves scheduled"
                description="When team members request vacation, sick leave, or conference days, schedule them here to automatically block calendar slots."
              >
                <div className="mt-4 flex justify-center">
                  <Button type="button" onClick={() => setShowLeaveModal(true)}>
                    + Schedule Time Off
                  </Button>
                </div>
              </EmptyState>
            ) : (
              <div className="divide-y divide-line rounded-xl border border-line bg-surface overflow-hidden">
                {leavesList.map((leave) => {
                  const start = new Date(leave.startDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const end = new Date(leave.endDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  return (
                    <div
                      key={leave.id}
                      className="flex items-center justify-between p-4 hover:bg-surface-elevated transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {leave.staffName}
                          </span>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            {leave.reason ?? "Time Off"}
                          </span>
                        </div>
                        <div className="text-xs text-muted">
                          📅 {start} &rarr; {end}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteLeave(leave.staffId, leave.id)}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition"
                      >
                        Cancel Leave
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MODAL: ADD / EDIT STAFF MEMBER */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-display text-lg font-bold text-foreground">
                  {editingStaff ? `Edit ${editingStaff.name}` : "Add New Team Member"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg p-1 text-muted hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitStaff} className="mt-4 space-y-5">
                {/* Basic info */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Dr. Maya Lin"
                      className="w-full rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Role / Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Senior Stylist"
                      className="w-full rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="maya@example.com"
                      className="w-full rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+1 (555) 012-3456"
                      className="w-full rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Granular Permissions Checkboxes */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                    Custom Permissions (RBAC)
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ALL_PERMISSIONS.map((perm) => {
                      const checked = formPermissions.includes(perm.key);
                      return (
                        <label
                          key={perm.key}
                          className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition ${
                            checked
                              ? "border-accent bg-accent-soft/40"
                              : "border-line bg-surface-elevated/40 hover:bg-surface-elevated"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePermission(perm.key)}
                            className="mt-1 h-4 w-4 rounded border-line text-accent focus:ring-accent"
                          />
                          <div className="text-xs">
                            <div className="font-semibold text-foreground">
                              {perm.icon} {perm.label}
                            </div>
                            <div className="text-[11px] text-muted leading-tight mt-0.5">
                              {perm.description}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Assigned Services */}
                {services.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                      Assigned Services
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {services.map((svc) => {
                        const checked = formServiceIds.includes(svc.id);
                        return (
                          <button
                            type="button"
                            key={svc.id}
                            onClick={() => toggleService(svc.id)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
                              checked
                                ? "border-accent bg-accent text-white"
                                : "border-line bg-surface-elevated text-muted hover:text-foreground"
                            }`}
                          >
                            {svc.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Working Hours Shifts */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                    Shift Working Hours
                  </label>
                  <div className="space-y-1.5 rounded-xl border border-line bg-surface-elevated/50 p-3">
                    {DAYS.map((d, index) => {
                      const hourEntry = formHours[index];
                      return (
                        <div
                          key={d.day}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <label className="flex items-center gap-2 font-medium text-foreground w-28">
                            <input
                              type="checkbox"
                              checked={hourEntry.active}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFormHours((prev) =>
                                  prev.map((item, i) =>
                                    i === index ? { ...item, active: checked } : item,
                                  ),
                                );
                              }}
                              className="h-3.5 w-3.5 rounded border-line text-accent"
                            />
                            {d.label}
                          </label>
                          {hourEntry.active ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={hourEntry.startTime}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFormHours((prev) =>
                                    prev.map((item, i) =>
                                      i === index ? { ...item, startTime: val } : item,
                                    ),
                                  );
                                }}
                                className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-foreground"
                              />
                              <span className="text-muted">to</span>
                              <input
                                type="time"
                                value={hourEntry.endTime}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFormHours((prev) =>
                                    prev.map((item, i) =>
                                      i === index ? { ...item, endTime: val } : item,
                                    ),
                                  );
                                }}
                                className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-foreground"
                              />
                            </div>
                          ) : (
                            <span className="text-muted text-xs italic">Off Duty</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit buttons */}
                <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : editingStaff ? "Update Staff" : "Create Staff"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: SCHEDULE LEAVE / TIME OFF */}
        {showLeaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-display text-lg font-bold text-foreground">
                  Schedule Time Off
                </h3>
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="rounded-lg p-1 text-muted hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddLeave} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Select Team Member *
                  </label>
                  <select
                    required
                    value={leaveStaffId}
                    onChange={(e) => setLeaveStaffId(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-hidden"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.title})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Reason / Note
                  </label>
                  <input
                    type="text"
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="e.g. Annual Vacation, Conference, Sick Leave"
                    className="w-full rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowLeaveModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Scheduling..." : "Confirm Time Off"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

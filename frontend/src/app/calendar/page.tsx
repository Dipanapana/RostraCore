"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { CalendarDays, Filter, X, Plus, Edit2, Users } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { shiftsApi, sitesApi, employeesApi } from "@/services/api";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// Setup the localizer for react-big-calendar
const locales = {
    "en-US": enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

interface Employee {
    employee_id: number;
    first_name: string;
    last_name: string;
    role: string;
    status: string;
}

interface Shift {
    shift_id: number;
    site_id: number;
    start_time: string;
    end_time: string;
    role: string;
    required_staff?: number;
    assigned_employee_id?: number;
    site?: {
        site_name: string;
        client?: {
            client_name: string;
        };
    };
    employee?: {
        first_name: string;
        last_name: string;
    };
}

interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    resource: {
        shift: Shift;
        color: string;
    };
}

// Color palette for different sites
const SITE_COLORS = [
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#f59e0b", // amber
    "#10b981", // emerald
    "#06b6d4", // cyan
    "#f97316", // orange
    "#6366f1", // indigo
];

// Drag and drop item types
const ItemTypes = {
    EMPLOYEE: "employee",
};

// Draggable Employee Card Component
const DraggableEmployee = ({ employee }: { employee: Employee }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.EMPLOYEE,
        item: { employeeId: employee.employee_id, employeeName: `${employee.first_name} ${employee.last_name}` },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <div
            ref={drag}
            className={`p-3 bg-white border border-slate-200 rounded-lg cursor-move hover:bg-blue-50 hover:border-blue-300 transition-colors ${
                isDragging ? "opacity-50" : "opacity-100"
            }`}
        >
            <p className="font-medium text-slate-900">
                {employee.first_name} {employee.last_name}
            </p>
            <p className="text-xs text-slate-600 capitalize">{employee.role}</p>
        </div>
    );
};

// Droppable Event Wrapper Component
const DroppableEventWrapper = ({
    children,
    event,
    onDrop
}: {
    children: React.ReactNode;
    event: CalendarEvent;
    onDrop: (shiftId: number, employeeId: number) => void;
}) => {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ItemTypes.EMPLOYEE,
        drop: (item: { employeeId: number; employeeName: string }) => {
            onDrop(event.resource.shift.shift_id, item.employeeId);
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        }),
    }));

    return (
        <div
            ref={drop}
            className={`${isOver && canDrop ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
            style={{ height: "100%" }}
        >
            {children}
        </div>
    );
};

export default function CalendarPage() {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [view, setView] = useState<View>("month");
    const [date, setDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [siteFilter, setSiteFilter] = useState<number | null>(null);
    const [employeeFilter, setEmployeeFilter] = useState<number | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [sites, setSites] = useState<any[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [showEmployeeSidebar, setShowEmployeeSidebar] = useState(false);
    const [formData, setFormData] = useState({
        site_id: "",
        start_time: "",
        end_time: "",
        role: "",
        required_staff: 1,
    });

    // Fetch shifts, sites, and employees data
    useEffect(() => {
        fetchShifts();
        fetchSites();
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const response = await employeesApi.getAll();
            setEmployees(response.data);
        } catch (err) {
            console.error("Failed to load employees:", err);
        }
    };

    // Populate form when editing
    useEffect(() => {
        if (showEditModal && selectedEvent) {
            const shift = selectedEvent.resource.shift;
            setFormData({
                site_id: shift.site_id.toString(),
                start_time: format(new Date(shift.start_time), "yyyy-MM-dd'T'HH:mm"),
                end_time: format(new Date(shift.end_time), "yyyy-MM-dd'T'HH:mm"),
                role: shift.role,
                required_staff: shift.required_staff || 1, // Use shift value or default to 1
            });
        }
    }, [showEditModal, selectedEvent]);

    const fetchSites = async () => {
        try {
            const response = await sitesApi.getAll();
            setSites(response.data);
        } catch (err) {
            console.error("Failed to load sites:", err);
        }
    };

    const fetchShifts = async () => {
        try {
            setLoading(true);
            const response = await shiftsApi.getAll();
            setShifts(response.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load shifts");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateShift = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await shiftsApi.create({
                site_id: Number(formData.site_id),
                start_time: formData.start_time,
                end_time: formData.end_time,
                role: formData.role,
                required_staff: formData.required_staff,
            });
            setShowCreateModal(false);
            setFormData({
                site_id: "",
                start_time: "",
                end_time: "",
                role: "",
                required_staff: 1,
            });
            fetchShifts();
            alert("Shift created successfully!");
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to create shift");
        }
    };

    const handleUpdateShift = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEvent) return;
        try {
            await shiftsApi.update(selectedEvent.resource.shift.shift_id, {
                site_id: Number(formData.site_id),
                start_time: formData.start_time,
                end_time: formData.end_time,
                role: formData.role,
                required_staff: formData.required_staff,
            });
            setShowEditModal(false);
            setSelectedEvent(null);
            fetchShifts();
            alert("Shift updated successfully!");
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to update shift");
        }
    };

    const handleDeleteShift = async () => {
        if (!selectedEvent) return;
        if (!confirm("Are you sure you want to delete this shift?")) return;
        try {
            await shiftsApi.delete(selectedEvent.resource.shift.shift_id);
            setShowEditModal(false);
            setSelectedEvent(null);
            fetchShifts();
            alert("Shift deleted successfully!");
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to delete shift");
        }
    };

    const handleAssignEmployee = async (shiftId: number, employeeId: number) => {
        try {
            await shiftsApi.assignEmployee(shiftId, employeeId);
            fetchShifts(); // Refresh to show the assignment
            alert("Employee assigned successfully!");
        } catch (err: any) {
            const errorMsg = err.response?.data?.detail || err.message || "Failed to assign employee";
            alert(errorMsg);
        }
    };

    // Create color map for sites
    const siteColorMap = useMemo(() => {
        const uniqueSiteIds = [...new Set(shifts.map((s) => s.site_id))];
        const colorMap: Record<number, string> = {};
        uniqueSiteIds.forEach((siteId, index) => {
            colorMap[siteId] = SITE_COLORS[index % SITE_COLORS.length];
        });
        return colorMap;
    }, [shifts]);

    // Transform shifts into calendar events
    const events: CalendarEvent[] = useMemo(() => {
        let filteredShifts = shifts;

        // Apply filters
        if (siteFilter) {
            filteredShifts = filteredShifts.filter((s) => s.site_id === siteFilter);
        }
        if (employeeFilter) {
            filteredShifts = filteredShifts.filter(
                (s) => s.assigned_employee_id === employeeFilter
            );
        }

        return filteredShifts.map((shift) => {
            const employeeName = shift.employee
                ? `${shift.employee.first_name} ${shift.employee.last_name}`
                : "Unassigned";
            const siteName = shift.site?.site_name || "Unknown Site";
            const clientName = shift.site?.client?.client_name || "";

            return {
                id: shift.shift_id,
                title: `${employeeName} - ${siteName}`,
                start: new Date(shift.start_time),
                end: new Date(shift.end_time),
                resource: {
                    shift,
                    color: siteColorMap[shift.site_id] || "#64748b",
                },
            };
        });
    }, [shifts, siteFilter, employeeFilter, siteColorMap]);

    // Get unique sites and employees for filters
    const uniqueSites = useMemo(() => {
        const sites = shifts
            .filter((s) => s.site)
            .map((s) => ({
                id: s.site_id,
                name: s.site!.site_name,
            }));
        return Array.from(new Map(sites.map((s) => [s.id, s])).values());
    }, [shifts]);

    const uniqueEmployees = useMemo(() => {
        const employees = shifts
            .filter((s) => s.employee)
            .map((s) => ({
                id: s.assigned_employee_id!,
                name: `${s.employee!.first_name} ${s.employee!.last_name}`,
            }));
        return Array.from(new Map(employees.map((e) => [e.id, e])).values());
    }, [shifts]);

    // Custom event style getter
    const eventStyleGetter = (event: CalendarEvent) => {
        return {
            style: {
                backgroundColor: event.resource.color,
                borderRadius: "6px",
                opacity: 0.9,
                color: "white",
                border: "none",
                display: "block",
                fontSize: "0.875rem",
                padding: "2px 6px",
            },
        };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading calendar...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={fetchShifts}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <DndProvider backend={HTML5Backend}>
        <DashboardLayout>
            <div className="flex h-screen overflow-hidden">
                {/* Employee Sidebar */}
                {showEmployeeSidebar && (
                    <div className="w-80 bg-white border-r border-slate-200 overflow-y-auto">
                        <div className="p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    Available Employees
                                </h3>
                                <button
                                    onClick={() => setShowEmployeeSidebar(false)}
                                    className="p-1 hover:bg-slate-100 rounded"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-xs text-slate-600">
                                Drag employees onto shifts to assign them
                            </p>
                        </div>
                        <div className="p-4 space-y-3">
                            {employees
                                .filter((emp) => emp.status === "active")
                                .map((employee) => (
                                    <DraggableEmployee key={employee.employee_id} employee={employee} />
                                ))}
                        </div>
                    </div>
                )}

                {/* Main Calendar Content */}
                <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <CalendarDays className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Calendar View</h1>
                        <p className="text-sm text-slate-600">
                            View shifts and assignments by date
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowEmployeeSidebar(!showEmployeeSidebar)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm ${
                            showEmployeeSidebar
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-white border border-slate-300 hover:bg-slate-50"
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        Assign Guards
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Create Shift
                    </button>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        {(siteFilter || employeeFilter) && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-900">Filters</h3>
                        <button
                            onClick={() => {
                                setSiteFilter(null);
                                setEmployeeFilter(null);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-700"
                        >
                            Clear All
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Site Filter */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Filter by Site
                            </label>
                            <select
                                value={siteFilter || ""}
                                onChange={(e) =>
                                    setSiteFilter(e.target.value ? Number(e.target.value) : null)
                                }
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Sites</option>
                                {uniqueSites.map((site) => (
                                    <option key={site.id} value={site.id}>
                                        {site.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Employee Filter */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Filter by Employee
                            </label>
                            <select
                                value={employeeFilter || ""}
                                onChange={(e) =>
                                    setEmployeeFilter(
                                        e.target.value ? Number(e.target.value) : null
                                    )
                                }
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Employees</option>
                                {uniqueEmployees.map((employee) => (
                                    <option key={employee.id} value={employee.id}>
                                        {employee.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Calendar */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm calendar-container">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 700 }}
                    view={view}
                    onView={setView}
                    date={date}
                    onNavigate={setDate}
                    eventPropGetter={eventStyleGetter}
                    onSelectEvent={(event) => setSelectedEvent(event)}
                    popup
                    views={["month", "week", "day", "agenda"]}
                    components={{
                        event: ({ event }) => (
                            <DroppableEventWrapper
                                event={event}
                                onDrop={handleAssignEmployee}
                            >
                                <span>{event.title}</span>
                            </DroppableEventWrapper>
                        ),
                    }}
                />
            </div>

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-slate-900">Shift Details</h3>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-slate-600">Employee</p>
                                <p className="font-semibold text-slate-900">
                                    {selectedEvent.resource.shift.employee
                                        ? `${selectedEvent.resource.shift.employee.first_name} ${selectedEvent.resource.shift.employee.last_name}`
                                        : "Unassigned"}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-slate-600">Site</p>
                                <p className="font-semibold text-slate-900">
                                    {selectedEvent.resource.shift.site?.site_name || "Unknown"}
                                </p>
                            </div>

                            {selectedEvent.resource.shift.site?.client && (
                                <div>
                                    <p className="text-sm text-slate-600">Client</p>
                                    <p className="font-semibold text-slate-900">
                                        {selectedEvent.resource.shift.site.client.client_name}
                                    </p>
                                </div>
                            )}

                            <div>
                                <p className="text-sm text-slate-600">Role</p>
                                <p className="font-semibold text-slate-900">
                                    {selectedEvent.resource.shift.role}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-slate-600">Time</p>
                                <p className="font-semibold text-slate-900">
                                    {format(selectedEvent.start, "PPp")} -{" "}
                                    {format(selectedEvent.end, "p")}
                                </p>
                            </div>

                            <div
                                className="mt-4 p-3 rounded-lg"
                                style={{ backgroundColor: `${selectedEvent.resource.color}20` }}
                            >
                                <p className="text-sm font-medium" style={{ color: selectedEvent.resource.color }}>
                                    Shift ID: {selectedEvent.resource.shift.shift_id}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowEditModal(true);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                                Edit Shift
                            </button>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Shift Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900">Create New Shift</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateShift} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Site *
                                </label>
                                <select
                                    value={formData.site_id}
                                    onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select a site</option>
                                    {sites.map((site) => (
                                        <option key={site.site_id} value={site.site_id}>
                                            {site.site_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Role *
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select a role</option>
                                    <option value="armed">Armed Guard</option>
                                    <option value="unarmed">Unarmed Guard</option>
                                    <option value="supervisor">Supervisor</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Start Time *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        End Time *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.end_time}
                                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Required Staff *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.required_staff}
                                    onChange={(e) => setFormData({ ...formData, required_staff: Number(e.target.value) })}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Create Shift
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Shift Modal */}
            {showEditModal && selectedEvent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900">Edit Shift</h3>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setSelectedEvent(null);
                                }}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateShift} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Site *
                                </label>
                                <select
                                    value={formData.site_id}
                                    onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select a site</option>
                                    {sites.map((site) => (
                                        <option key={site.site_id} value={site.site_id}>
                                            {site.site_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Role *
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select a role</option>
                                    <option value="armed">Armed Guard</option>
                                    <option value="unarmed">Unarmed Guard</option>
                                    <option value="supervisor">Supervisor</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Start Time *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        End Time *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.end_time}
                                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Required Staff *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.required_staff}
                                    onChange={(e) => setFormData({ ...formData, required_staff: Number(e.target.value) })}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Update Shift
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteShift}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Delete Shift
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedEvent(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Styles */}
            <style jsx global>{`
        .calendar-container .rbc-calendar {
          font-family: inherit;
        }
        .calendar-container .rbc-header {
          padding: 12px 4px;
          font-weight: 600;
          color: #1e293b;
          background-color: #f8fafc;
          border-color: #e2e8f0;
        }
        .calendar-container .rbc-today {
          background-color: #eff6ff;
        }
        .calendar-container .rbc-off-range-bg {
          background-color: #f8fafc;
        }
        .calendar-container .rbc-toolbar button {
          color: #475569;
          border-color: #cbd5e1;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 500;
        }
        .calendar-container .rbc-toolbar button:hover {
          background-color: #f1f5f9;
          border-color: #94a3b8;
        }
        .calendar-container .rbc-toolbar button.rbc-active {
          background-color: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
        .calendar-container .rbc-toolbar button.rbc-active:hover {
          background-color: #2563eb;
          border-color: #2563eb;
        }
        .calendar-container .rbc-event {
          padding: 4px 6px;
        }
        .calendar-container .rbc-event-label {
          font-size: 0.75rem;
        }
        .calendar-container .rbc-month-view,
        .calendar-container .rbc-time-view {
          border-color: #e2e8f0;
        }
        .calendar-container .rbc-day-bg,
        .calendar-container .rbc-time-slot {
          border-color: #e2e8f0;
        }
      `}</style>
        </div>
                </div>
            </div>
        </DashboardLayout>
        </DndProvider>
    );
}

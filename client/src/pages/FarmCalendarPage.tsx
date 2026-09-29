import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarDays, LayoutGrid, SunMedium, Loader2, BookOpen, FileText } from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import CalendarFilters from '../components/calendar/CalendarFilters';
import AlertsPanel from '../components/calendar/AlertsPanel';
import WeekAgendaStrip from '../components/calendar/WeekAgendaStrip';
import CalendarGrid from '../components/calendar/CalendarGrid';
import EventDetailDrawer from '../components/calendar/EventDetailDrawer';
import TodayPanel from '../components/calendar/TodayPanel';
import YearOverview from '../components/calendar/YearOverview';
import MissedPanel from '../components/calendar/MissedPanel';
import ActivityLogPanel from '../components/calendar/ActivityLogPanel';
import AddTaskModal from '../components/calendar/AddTaskModal';
import {
  getFarmCalendar,
  getTodayTasks,
  getYearOverview,
  getMissedTasks,
  getActivityLog,
} from '../lib/api';
import type {
  CalendarResponse,
  CalendarEvent,
  CalendarFilters as Filters,
  TodayResponse,
  YearOverviewResponse,
  MissedTasksResponse,
  ActivityLogResponse,
  ActivityLogTask,
  EventType,
  EventCategory,
} from '../types/calendar';

type Tab = 'today' | 'month' | 'year' | 'activity';

const EMPTY_FILTERS: Filters = { zoneId: '', cropName: '', category: '' };

interface ActivityFilters {
  year: number | '';
  month: number | '';
  status: 'ALL' | 'COMPLETED' | 'SKIPPED';
  zoneId: string;
}

const DEFAULT_ACTIVITY_FILTERS: ActivityFilters = {
  year:   new Date().getFullYear(),
  month:  '',
  status: 'ALL',
  zoneId: '',
};

// ── Tab button ────────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all
        ${active
          ? 'bg-green-700 text-white shadow-sm'
          : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
        }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {badge != null && badge > 0 && (
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold
          ${active ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-600'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FarmCalendarPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const navigate = useNavigate();
  const today = new Date();

  const [tab,   setTab]   = useState<Tab>('today');
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [filters,         setFilters]         = useState<Filters>(EMPTY_FILTERS);
  const [activityFilters, setActivityFilters] = useState<ActivityFilters>(DEFAULT_ACTIVITY_FILTERS);

  const [calendarData,  setCalendarData]  = useState<CalendarResponse | null>(null);
  const [todayData,     setTodayData]     = useState<TodayResponse | null>(null);
  const [yearData,      setYearData]      = useState<YearOverviewResponse | null>(null);
  const [missedData,    setMissedData]    = useState<MissedTasksResponse | null>(null);
  const [activityData,  setActivityData]  = useState<ActivityLogResponse | null>(null);

  const [loadingToday,    setLoadingToday]    = useState(true);
  const [loadingMonth,    setLoadingMonth]    = useState(false);
  const [loadingYear,     setLoadingYear]     = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [selectedEvent,   setSelectedEvent]   = useState<CalendarEvent | null>(null);
  const [addTaskDate,     setAddTaskDate]     = useState<string | null>(null);
  const [editCustomEvent, setEditCustomEvent] = useState<CalendarEvent | null>(null);

  if (!farmId) return null;

  // ── Data fetchers ──────────────────────────────────────────────────────────

  const fetchToday = useCallback(async () => {
    setLoadingToday(true);
    try {
      const [td, missed] = await Promise.all([
        getTodayTasks(farmId),
        getMissedTasks(farmId),
      ]);
      setTodayData(td);
      setMissedData(missed);
    } catch {
      toast.error('Failed to load today\'s tasks');
    } finally {
      setLoadingToday(false);
    }
  }, [farmId]);

  const fetchMonth = useCallback(async () => {
    setLoadingMonth(true);
    try {
      const data = await getFarmCalendar(farmId, {
        year,
        month,
        zoneId:   filters.zoneId   || undefined,
        category: filters.category || undefined,
      });
      setCalendarData(data);
    } catch {
      toast.error('Failed to load calendar data');
    } finally {
      setLoadingMonth(false);
    }
  }, [farmId, year, month, filters.zoneId, filters.category]);

  const fetchYear = useCallback(async () => {
    setLoadingYear(true);
    try {
      const data = await getYearOverview(farmId, year);
      setYearData(data);
    } catch {
      toast.error('Failed to load year overview');
    } finally {
      setLoadingYear(false);
    }
  }, [farmId, year]);

  const fetchActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const data = await getActivityLog(farmId, {
        year:   activityFilters.year   || undefined,
        month:  activityFilters.month  || undefined,
        status: activityFilters.status !== 'ALL' ? activityFilters.status : undefined,
        zoneId: activityFilters.zoneId || undefined,
      });
      setActivityData(data);
    } catch {
      toast.error('Failed to load activity log');
    } finally {
      setLoadingActivity(false);
    }
  }, [farmId, activityFilters]);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => { fetchToday(); }, [fetchToday]);

  useEffect(() => {
    if (tab === 'month') fetchMonth();
  }, [tab, fetchMonth]);

  useEffect(() => {
    if (tab === 'year') fetchYear();
  }, [tab, fetchYear]);

  useEffect(() => {
    if (tab === 'activity') fetchActivity();
  }, [tab, fetchActivity]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleTaskUpdated = useCallback(() => {
    fetchToday();
    if (tab === 'month')    fetchMonth();
    if (tab === 'year')     fetchYear();
    if (tab === 'activity') fetchActivity();
  }, [fetchToday, fetchMonth, fetchYear, fetchActivity, tab]);

  const handleFiltersChange = (partial: Partial<Filters>) =>
    setFilters((prev) => ({ ...prev, ...partial }));

  const handleActivityFiltersChange = (partial: Partial<ActivityFilters>) =>
    setActivityFilters((prev) => ({ ...prev, ...partial }));

  const handlePrevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else             { setMonth((m) => m - 1); }
  };

  const handleNextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else              { setMonth((m) => m + 1); }
  };

  const handleMonthClick = (m: number) => {
    setMonth(m);
    setTab('month');
  };

  const handleAddTask = useCallback((date: string) => setAddTaskDate(date), []);
  const handleEditCustomTask = useCallback((event: CalendarEvent) => {
    setSelectedEvent(null);
    setEditCustomEvent(event);
  }, []);
  const handleCloseModal = useCallback(() => {
    setAddTaskDate(null);
    setEditCustomEvent(null);
  }, []);

  // Convert ActivityLogTask → CalendarEvent shape for the drawer
  const handleActivityRowClick = useCallback((task: ActivityLogTask) => {
    const event: CalendarEvent = {
      id:           `log-${task.id}`,
      dbTaskId:     task.id,
      date:         task.scheduledDate,
      type:         task.taskType as EventType,
      category:     task.category as EventCategory,
      title:        task.title,
      zoneId:       task.zoneId,
      zoneName:     task.zoneName,
      zoneNumber:   task.zoneNumber,
      cropName:     task.cropName,
      priority:     task.priority,
      labourWorkers: task.labourWorkers,
      labourHours:   task.labourHours,
      status:       task.status.toLowerCase() as 'completed' | 'skipped',
      checklistItems: task.checklistItems,
      details: {
        recipe:       null,
        irrigation:   null,
        soilAdvisory: null,
        notes:        task.completedNote ?? `${task.cropName} — ${task.zoneName}`,
      },
    };
    setSelectedEvent(event);
  }, []);

  // Client-side crop filter
  const filteredEvents = calendarData
    ? filters.cropName
      ? calendarData.events.filter((e) => e.cropName === filters.cropName)
      : calendarData.events
    : [];

  const missedCount = missedData?.missedCount ?? todayData?.missedCount ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardShell
      title="Farm Calendar"
      subtitle="Crop lifecycle tasks, irrigation schedules, labour overview, and upcoming alerts — all in one place"
    >
      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 rounded-2xl border border-stone-200 bg-stone-50 p-1 w-fit">
        <TabBtn
          active={tab === 'today'}
          onClick={() => setTab('today')}
          icon={SunMedium}
          label="Today"
          badge={missedCount}
        />
        <TabBtn
          active={tab === 'month'}
          onClick={() => setTab('month')}
          icon={CalendarDays}
          label="Month"
        />
        <TabBtn
          active={tab === 'year'}
          onClick={() => setTab('year')}
          icon={LayoutGrid}
          label="Year"
        />
        <TabBtn
          active={tab === 'activity'}
          onClick={() => setTab('activity')}
          icon={BookOpen}
          label="Activity Log"
        />
      </div>

      {/* ── TODAY tab ────────────────────────────────────────────────────── */}
      {tab === 'today' && (
        <div className="mt-5 space-y-4">
          {loadingToday ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-green-700" />
            </div>
          ) : todayData ? (
            <>
              <TodayPanel
                farmId={farmId}
                data={todayData}
                onTaskUpdated={handleTaskUpdated}
                onEventClick={setSelectedEvent}
              />
              {missedData && (
                <MissedPanel
                  farmId={farmId}
                  data={missedData}
                  onTaskUpdated={handleTaskUpdated}
                  onEventClick={setSelectedEvent}
                />
              )}
            </>
          ) : (
            <p className="py-12 text-center text-sm text-stone-400">
              No data — assign crops to your zones first.
            </p>
          )}
        </div>
      )}

      {/* ── MONTH tab ────────────────────────────────────────────────────── */}
      {tab === 'month' && (
        <div className="mt-5 space-y-5">
          {calendarData && (
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1">
                <CalendarFilters
                  zoneMeta={calendarData.zoneMeta}
                  filters={filters}
                  onChange={handleFiltersChange}
                />
              </div>
              {filters.zoneId && (
                <button
                  onClick={() => navigate(`/season-report/${filters.zoneId}`)}
                  className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100 shrink-0"
                >
                  <FileText className="h-4 w-4" />
                  Season Report
                </button>
              )}
            </div>
          )}
          {loadingMonth ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-green-700" />
            </div>
          ) : calendarData ? (
            <>
              <AlertsPanel alerts={calendarData.alerts} onEventClick={setSelectedEvent} />
              <WeekAgendaStrip events={filteredEvents} onEventClick={setSelectedEvent} />
              <CalendarGrid
                year={year}
                month={month}
                events={filteredEvents}
                dailyLabour={calendarData.dailyLabour}
                onPrev={handlePrevMonth}
                onNext={handleNextMonth}
                onEventClick={setSelectedEvent}
                onAddTask={handleAddTask}
              />
            </>
          ) : (
            <p className="py-12 text-center text-sm text-stone-400">No calendar data available</p>
          )}
        </div>
      )}

      {/* ── YEAR tab ─────────────────────────────────────────────────────── */}
      {tab === 'year' && (
        <div className="mt-5">
          {loadingYear ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-green-700" />
            </div>
          ) : yearData ? (
            <YearOverview
              data={yearData}
              year={year}
              onYearChange={(y) => setYear(y)}
              onMonthClick={handleMonthClick}
            />
          ) : (
            <p className="py-12 text-center text-sm text-stone-400">No year data available</p>
          )}
        </div>
      )}

      {/* ── ACTIVITY LOG tab ─────────────────────────────────────────────── */}
      {tab === 'activity' && (
        <div className="mt-5">
          {loadingActivity ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-green-700" />
            </div>
          ) : activityData ? (
            <ActivityLogPanel
              farmId={farmId}
              data={activityData}
              filters={activityFilters}
              onFiltersChange={handleActivityFiltersChange}
              onRowClick={handleActivityRowClick}
            />
          ) : (
            <p className="py-12 text-center text-sm text-stone-400">No activity data available</p>
          )}
        </div>
      )}

      {/* Event detail drawer */}
      <EventDetailDrawer
        event={selectedEvent}
        farmId={farmId}
        onClose={() => setSelectedEvent(null)}
        onTaskUpdated={handleTaskUpdated}
        onEditCustomTask={handleEditCustomTask}
      />

      {/* Add / Edit custom task modal */}
      {(addTaskDate !== null || editCustomEvent !== null) && (
        <AddTaskModal
          farmId={farmId}
          date={addTaskDate ?? editCustomEvent!.date}
          zoneMeta={calendarData?.zoneMeta ?? []}
          editEvent={editCustomEvent}
          onClose={handleCloseModal}
          onSaved={handleTaskUpdated}
        />
      )}
    </DashboardShell>
  );
}

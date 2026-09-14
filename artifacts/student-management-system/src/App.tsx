import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  FileText,
  LayoutDashboard,
  Menu,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  getGetStudentQueryKey,
  getGetStudentsSummaryQueryKey,
  getListStudentsQueryKey,
  type Student,
  type StudentInput,
  useCreateStudent,
  useDeleteStudent,
  useGetStudent,
  useGetStudentsSummary,
  useListStudents,
  useUpdateStudent,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import NotFound from '@/pages/not-found';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';

const queryClient = new QueryClient();

type FormState = {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  year: string;
  phone: string;
  enrollmentDate: string;
  status: 'active' | 'inactive';
};

const blankForm: FormState = {
  studentId: '',
  firstName: '',
  lastName: '',
  email: '',
  department: '',
  year: '1',
  phone: '',
  enrollmentDate: new Date().toISOString().slice(0, 10),
  status: 'active',
};

const departments = ['Computer Science', 'Business Administration', 'Engineering', 'Arts & Humanities', 'Natural Sciences'];

function initials(student: Pick<Student, 'firstName' | 'lastName'>) {
  return `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`.toUpperCase();
}

function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formFromStudent(student?: Student): FormState {
  if (!student) return blankForm;
  return {
    studentId: student.studentId,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    department: student.department,
    year: String(student.year),
    phone: student.phone,
    enrollmentDate: student.enrollmentDate.slice(0, 10),
    status: student.status,
  };
}

function toStudentInput(form: FormState): StudentInput {
  return {
    studentId: form.studentId.trim(),
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    department: form.department,
    year: Number(form.year),
    phone: form.phone.trim(),
    enrollmentDate: form.enrollmentDate,
    status: form.status,
  };
}

function Notice({ message, tone = 'error', onDismiss }: { message: string; tone?: 'error' | 'success'; onDismiss?: () => void }) {
  return (
    <div className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${tone === 'error' ? 'border-destructive/20 bg-destructive/10 text-destructive' : 'border-accent/20 bg-accent/10 text-accent'}`} role="status" data-testid={`status-${tone}`}>
      {tone === 'error' ? <AlertCircle size={17} className="mt-0.5 shrink-0" /> : <Check size={17} className="mt-0.5 shrink-0" />}
      <span className="flex-1">{message}</span>
      {onDismiss && <button type="button" onClick={onDismiss} className="focus-ring rounded p-0.5" aria-label="Dismiss message" data-testid="button-dismiss-notice"><X size={15} /></button>}
    </div>
  );
}

function Avatar({ student, size = 'md' }: { student: Pick<Student, 'firstName' | 'lastName'>; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-16 w-16 text-xl' : size === 'sm' ? 'h-8 w-8 text-[10px]' : 'h-10 w-10 text-xs';
  return <div className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-primary font-extrabold text-primary-foreground`} data-testid={`avatar-${student.firstName}-${student.lastName}`}>{initials(student)}</div>;
}

function StatusPill({ status }: { status: Student['status'] }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${status === 'active' ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`} data-testid={`status-student-${status}`}><span className={`h-1.5 w-1.5 rounded-full ${status === 'active' ? 'bg-accent' : 'bg-muted-foreground'}`} />{status}</span>;
}

function SkeletonRows({ count = 4 }: { count?: number }) {
  return <div className="space-y-3" aria-label="Loading records" data-testid="loading-records">{Array.from({ length: count }).map((_, index) => <div key={index} className="skeleton h-[70px] rounded-xl" />)}</div>;
}

function EmptyState({ filtered = false, onClear }: { filtered?: boolean; onClear?: () => void }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-5 text-center" data-testid="empty-students">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-secondary"><FileText size={24} /></div>
      <h3 className="font-extrabold text-secondary">{filtered ? 'No records match those filters' : 'Your student register is empty'}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{filtered ? 'Try broadening your search or resetting the filters.' : 'Add the first student record to start building your register.'}</p>
      {filtered && onClear && <button type="button" onClick={onClear} className="focus-ring mt-4 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-secondary transition hover:bg-muted" data-testid="button-clear-empty-filters">Clear filters</button>}
    </div>
  );
}

function ConfirmDialog({ student, pending, onCancel, onConfirm }: { student: Student; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-secondary/45 p-4 backdrop-blur-[2px]" role="presentation">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-rise-in" role="dialog" aria-modal="true" aria-labelledby="confirm-title" data-testid="dialog-delete-student">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><Trash2 size={19} /></div>
        <h2 id="confirm-title" className="text-xl font-extrabold text-secondary">Delete this record?</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">This will permanently remove <strong className="text-secondary">{student.firstName} {student.lastName}</strong> from the student register. This action cannot be undone.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="focus-ring rounded-lg px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-muted" data-testid="button-cancel-delete">Keep record</button>
          <button type="button" disabled={pending} onClick={onConfirm} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground transition hover:brightness-95 disabled:opacity-60" data-testid="button-confirm-delete"><Trash2 size={15} />{pending ? 'Deleting…' : 'Delete record'}</button>
        </div>
      </div>
    </div>
  );
}

function StudentModal({ open, student, pending, error, onClose, onSubmit }: { open: boolean; student?: Student; pending: boolean; error?: string; onClose: () => void; onSubmit: (form: FormState) => void }) {
  const [form, setForm] = useState<FormState>(() => formFromStudent(student));
  const [validation, setValidation] = useState('');
  useEffect(() => {
    if (open) {
      setForm(formFromStudent(student));
      setValidation('');
    }
  }, [open, student]);
  if (!open) return null;
  const set = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.studentId.trim() || !form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.department || !form.phone.trim() || !form.enrollmentDate) {
      setValidation('Complete every required field before saving.');
      return;
    }
    if (!form.email.includes('@')) {
      setValidation('Enter a valid email address.');
      return;
    }
    setValidation('');
    onSubmit(form);
  };
  const inputClass = 'focus-ring h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary';
  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-secondary/45 p-4 backdrop-blur-[2px]" role="presentation">
      <div className="mx-auto my-4 max-w-2xl rounded-2xl border border-border bg-card shadow-2xl animate-rise-in" role="dialog" aria-modal="true" aria-labelledby="student-form-title" data-testid="dialog-student-form">
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div><p className="data-label text-accent">{student ? 'Edit record' : 'New record'}</p><h2 id="student-form-title" className="mt-1 text-2xl font-extrabold tracking-tight text-secondary">{student ? `${student.firstName} ${student.lastName}` : 'Add a student'}</h2><p className="mt-1 text-sm text-muted-foreground">Keep the register accurate and ready for the next conversation.</p></div>
          <button type="button" onClick={onClose} className="focus-ring rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-secondary" aria-label="Close form" data-testid="button-close-student-form"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-5 p-6">
          {(validation || error) && <Notice message={validation || error || ''} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5"><span className="data-label text-muted-foreground">Student ID *</span><input className={inputClass} value={form.studentId} onChange={(e) => set('studentId', e.target.value)} placeholder="STU-2048" data-testid="input-student-id" /></label>
            <label className="space-y-1.5"><span className="data-label text-muted-foreground">Department *</span><select className={inputClass} value={form.department} onChange={(e) => set('department', e.target.value)} data-testid="select-department"><option value="">Select department</option>{departments.map((department) => <option value={department} key={department}>{department}</option>)}</select></label>
            <label className="space-y-1.5"><span className="data-label text-muted-foreground">First name *</span><input className={inputClass} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Amina" data-testid="input-first-name" /></label>
            <label className="space-y-1.5"><span className="data-label text-muted-foreground">Last name *</span><input className={inputClass} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Okafor" data-testid="input-last-name" /></label>
            <label className="space-y-1.5 sm:col-span-2"><span className="data-label text-muted-foreground">Email address *</span><input type="email" className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="am.okafor@college.edu" data-testid="input-email" /></label>
            <label className="space-y-1.5"><span className="data-label text-muted-foreground">Year *</span><select className={inputClass} value={form.year} onChange={(e) => set('year', e.target.value)} data-testid="select-year">{[1, 2, 3, 4, 5, 6].map((year) => <option value={year} key={year}>Year {year}</option>)}</select></label>
            <label className="space-y-1.5"><span className="data-label text-muted-foreground">Enrollment date *</span><input type="date" className={inputClass} value={form.enrollmentDate} onChange={(e) => set('enrollmentDate', e.target.value)} data-testid="input-enrollment-date" /></label>
            <label className="space-y-1.5"><span className="data-label text-muted-foreground">Phone number *</span><input type="tel" className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1 555 0199" data-testid="input-phone" /></label>
            <fieldset className="space-y-1.5"><legend className="data-label text-muted-foreground">Status</legend><div className="flex h-10 items-center gap-4">{(['active', 'inactive'] as const).map((status) => <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold capitalize text-secondary" key={status}><input type="radio" name="status" value={status} checked={form.status === status} onChange={() => setForm((current) => ({ ...current, status }))} className="accent-[hsl(var(--accent))]" data-testid={`radio-status-${status}`} />{status}</label>)}</div></fieldset>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-5"><button type="button" onClick={onClose} className="focus-ring rounded-lg px-4 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted" data-testid="button-cancel-student-form">Cancel</button><button type="submit" disabled={pending} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-secondary px-5 py-2.5 text-sm font-bold text-secondary-foreground transition hover:bg-accent disabled:opacity-60" data-testid="button-save-student"><Check size={16} />{pending ? 'Saving…' : student ? 'Save changes' : 'Add student'}</button></div>
        </form>
      </div>
    </div>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = [{ href: '/', label: 'Overview', icon: LayoutDashboard }, { href: '/students', label: 'Students', icon: Users }];
  return (
    <div className="grain min-h-[100dvh] bg-background">
      <aside className={`fixed inset-y-0 left-0 z-20 flex w-[248px] flex-col bg-secondary px-5 py-6 text-secondary-foreground transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-2"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-secondary"><span className="text-lg font-black">S</span></div><div><p className="font-extrabold tracking-tight">S.D</p><p className="data-label text-secondary-foreground/55">Student registry</p></div></div>
        <div className="mt-12 px-2"><p className="data-label text-secondary-foreground/40">Workspace</p><nav className="mt-3 space-y-1">{navItems.map(({ href, label, icon: Icon }) => <Link href={href} key={href} onClick={() => setMobileOpen(false)} className={`focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${location === href ? 'bg-primary text-secondary' : 'text-secondary-foreground/65 hover:bg-secondary-foreground/10 hover:text-secondary-foreground'}`} data-testid={`link-nav-${label.toLowerCase()}`}><Icon size={18} strokeWidth={location === href ? 2.5 : 2} />{label}{location === href && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-secondary" />}</Link>)}</nav></div>
        <div className="mt-auto rounded-2xl border border-secondary-foreground/10 bg-secondary-foreground/5 p-4"><div className="mb-3 flex items-center justify-between"><span className="data-label text-secondary-foreground/50">Registry health</span><span className="h-2 w-2 rounded-full bg-primary" /></div><p className="text-xs leading-5 text-secondary-foreground/65">Your workspace is ready for today's records.</p><div className="mt-4 flex items-center gap-2 text-xs font-bold text-primary"><CircleHelp size={14} /> Need a hand?</div></div>
        <div className="mt-5 flex items-center gap-3 border-t border-secondary-foreground/10 px-2 pt-5"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">AD</div><div className="min-w-0"><p className="truncate text-xs font-bold">Admin desk</p><p className="truncate text-[11px] text-secondary-foreground/45">College operations</p></div></div>
      </aside>
      {mobileOpen && <button type="button" className="fixed inset-0 z-10 bg-secondary/35 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-close-navigation" />}
      <main className="min-h-[100dvh] md:pl-[248px]"><header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-border/80 bg-background/90 px-5 backdrop-blur-md sm:px-8"><button type="button" onClick={() => setMobileOpen(true)} className="focus-ring rounded-lg p-2 text-secondary md:hidden" aria-label="Open navigation" data-testid="button-open-navigation"><Menu size={21} /></button><div className="hidden md:block"><p className="data-label text-muted-foreground">S.D / {location === '/' ? 'Overview' : 'Students'}</p></div><div className="ml-auto flex items-center gap-3"><span className="hidden items-center gap-2 text-xs font-semibold text-muted-foreground sm:flex"><span className="h-2 w-2 rounded-full bg-accent" /> All systems operational</span><div className="h-7 w-px bg-border" /><button type="button" className="focus-ring rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-secondary" aria-label="Help" data-testid="button-help"><CircleHelp size={18} /></button></div></header>{children}</main>
    </div>
  );
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="data-label text-accent">{eyebrow}</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-secondary sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>{action}</div>;
}

function Dashboard() {
  const summaryQuery = useGetStudentsSummary();
  const studentsQuery = useListStudents();
  const summary = summaryQuery.data;
  const recent = useMemo(() => [...(studentsQuery.data ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5), [studentsQuery.data]);
  const queryError = summaryQuery.isError || studentsQuery.isError;
  return <AppShell><div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10"><PageIntro eyebrow="Monday, 09 September" title="Good morning, admin." description="A clear view of your student register, with the signals that matter at a glance." action={<Link href="/students" className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground transition hover:bg-accent" data-testid="link-open-students"><Plus size={16} /> Open register <ArrowUpRight size={15} /></Link>} />
    {queryError && <Notice message="We couldn't load the latest register data. Please refresh and try again." />}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{summaryQuery.isLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[144px] rounded-2xl" />) : <><StatCard label="Total students" value={summary?.total ?? 0} detail="Across all departments" icon={<Users size={19} />} tone="yellow" /><StatCard label="Active records" value={summary?.active ?? 0} detail={summary?.total ? `${Math.round((summary.active / summary.total) * 100)}% of your register` : 'No active records yet'} icon={<Check size={19} />} tone="green" /><StatCard label="Inactive records" value={summary?.inactive ?? 0} detail="Keep an eye on these" icon={<FileText size={19} />} tone="ink" /><StatCard label="Departments" value={summary?.departments?.length ?? 0} detail="Represented in register" icon={<LayoutDashboard size={19} />} tone="coral" /></>}</div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 animate-rise-in delay-1"><div className="mb-6 flex items-start justify-between"><div><p className="data-label text-muted-foreground">Live register</p><h2 className="mt-1 text-lg font-extrabold text-secondary">Recent records</h2></div><Link href="/students" className="focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-accent transition hover:bg-accent/10" data-testid="link-view-all-students">View all <ArrowUpRight size={14} /></Link></div>{studentsQuery.isLoading ? <SkeletonRows count={4} /> : recent.length === 0 ? <EmptyState /> : <div className="space-y-2">{recent.map((student) => <Link href={`/students/${student.id}`} key={student.id} className="focus-ring flex items-center gap-3 rounded-xl border border-transparent px-2 py-3 transition hover:border-border hover:bg-muted" data-testid={`row-recent-student-${student.id}`}><Avatar student={student} size="sm" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-bold text-secondary">{student.firstName} {student.lastName}</p><StatusPill status={student.status} /></div><p className="mt-0.5 truncate text-xs text-muted-foreground">{student.department} · Year {student.year}</p></div><span className="hidden text-xs text-muted-foreground sm:block">{formatDate(student.createdAt)}</span><ArrowUpRight size={15} className="text-muted-foreground" /></Link>)}</div>}</section>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 animate-rise-in delay-2"><div className="mb-7"><p className="data-label text-muted-foreground">Where students are</p><h2 className="mt-1 text-lg font-extrabold text-secondary">Department mix</h2></div>{summaryQuery.isLoading ? <div className="space-y-6">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="space-y-2"><div className="skeleton h-3 w-2/3 rounded" /><div className="skeleton h-2 rounded" /></div>)}</div> : (summary?.departments ?? []).length === 0 ? <EmptyState /> : <div className="space-y-5">{(summary?.departments ?? []).map((item, index) => { const max = Math.max(...(summary?.departments ?? []).map((department) => department.count), 1); return <div key={item.department} data-testid={`department-row-${index}`}><div className="mb-2 flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold text-secondary">{item.department}</span><span className="font-mono text-xs font-bold text-muted-foreground">{item.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${index % 3 === 0 ? 'bg-primary' : index % 3 === 1 ? 'bg-accent' : 'bg-secondary'}`} style={{ width: `${(item.count / max) * 100}%` }} /></div></div> })}</div>}</section>
    </div>
    <div className="mt-5 rounded-2xl border border-secondary bg-secondary p-5 text-secondary-foreground sm:flex sm:items-center sm:justify-between sm:p-6 animate-rise-in delay-3"><div><p className="data-label text-primary">Register note</p><h2 className="mt-2 text-xl font-extrabold tracking-tight">Small updates keep the big picture honest.</h2><p className="mt-1 text-sm text-secondary-foreground/60">Review inactive records before the next enrollment meeting.</p></div><Link href="/students" className="focus-ring mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-105 sm:mt-0" data-testid="link-review-records">Review records <ArrowUpRight size={15} /></Link></div>
  </div></AppShell>;
}

function StatCard({ label, value, detail, icon, tone }: { label: string; value: number; detail: string; icon: ReactNode; tone: 'yellow' | 'green' | 'ink' | 'coral' }) {
  const toneClass = { yellow: 'bg-primary text-secondary', green: 'bg-accent text-accent-foreground', ink: 'bg-secondary text-secondary-foreground', coral: 'bg-[#d66e57] text-[#fff5e6]' }[tone];
  return <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md animate-rise-in"><div className="flex items-start justify-between"><div><p className="data-label text-muted-foreground">{label}</p><p className="mt-4 text-3xl font-extrabold tracking-tight text-secondary" data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</p></div><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>{icon}</div></div><p className="mt-4 text-xs text-muted-foreground">{detail}</p></div>;
}

function StudentsPage() {
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student>();
  const [deleting, setDeleting] = useState<Student>();
  const [notice, setNotice] = useState<{ text: string; tone: 'error' | 'success' }>();
  const params = { search: search || undefined, department: department || undefined, year: year ? Number(year) : undefined, status: status ? status as 'active' | 'inactive' : undefined };
  const listQuery = useListStudents(params);
  const summaryQuery = useGetStudentsSummary();
  const createMutation = useCreateStudent();
  const updateMutation = useUpdateStudent();
  const deleteMutation = useDeleteStudent();
  const students = listQuery.data ?? [];
  const hasFilters = Boolean(search || department || year || status);
  const openCreate = () => { setEditing(undefined); setNotice(undefined); setFormOpen(true); };
  const openEdit = (student: Student) => { setEditing(student); setNotice(undefined); setFormOpen(true); };
  const clearFilters = () => { setSearch(''); setDepartment(''); setYear(''); setStatus(''); };
  const save = (form: FormState) => {
    const data = toStudentInput(form);
    if (editing) {
      updateMutation.mutate({ id: editing.id, data }, { onSuccess: () => { setFormOpen(false); setNotice({ text: 'Student record updated.', tone: 'success' }); void client.invalidateQueries({ queryKey: getListStudentsQueryKey() }); void client.invalidateQueries({ queryKey: getListStudentsQueryKey(params) }); void client.invalidateQueries({ queryKey: getGetStudentsSummaryQueryKey() }); void client.invalidateQueries({ queryKey: getGetStudentQueryKey(editing.id) }); } });
    } else {
      createMutation.mutate({ data }, { onSuccess: () => { setFormOpen(false); setNotice({ text: 'Student added to the register.', tone: 'success' }); void client.invalidateQueries({ queryKey: getListStudentsQueryKey() }); void client.invalidateQueries({ queryKey: getListStudentsQueryKey(params) }); void client.invalidateQueries({ queryKey: getGetStudentsSummaryQueryKey() }); } });
    }
  };
  const confirmDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate({ id: deleting.id }, { onSuccess: () => { setNotice({ text: 'Student record deleted.', tone: 'success' }); setDeleting(undefined); void client.invalidateQueries({ queryKey: getListStudentsQueryKey() }); void client.invalidateQueries({ queryKey: getListStudentsQueryKey(params) }); void client.invalidateQueries({ queryKey: getGetStudentsSummaryQueryKey() }); } });
  };
  const mutationError = createMutation.isError || updateMutation.isError ? 'We could not save this record. Check the details and try again.' : undefined;
  return <AppShell><div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10"><PageIntro eyebrow="Student register" title="Every record, in one place." description="Search, filter, and keep your college records current without losing your rhythm." action={<button type="button" onClick={openCreate} className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground transition hover:bg-accent" data-testid="button-add-student"><Plus size={17} /> Add student</button>} />
    {notice && <Notice message={notice.text} tone={notice.tone} onDismiss={() => setNotice(undefined)} />}
    <section className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-3 lg:flex-row"><label className="relative flex-1"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, ID, or email" className="focus-ring h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary" data-testid="input-search-students" /></label><div className="flex flex-wrap gap-2"><div className="relative"><select value={department} onChange={(e) => setDepartment(e.target.value)} className="focus-ring h-11 min-w-[170px] appearance-none rounded-xl border border-input bg-background px-3 pr-9 text-sm font-semibold text-secondary outline-none" data-testid="select-filter-department"><option value="">All departments</option>{(summaryQuery.data?.departments ?? departments.map((department) => ({ department, count: 0 }))).map((item) => <option value={item.department} key={item.department}>{item.department}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /></div><div className="relative"><select value={year} onChange={(e) => setYear(e.target.value)} className="focus-ring h-11 appearance-none rounded-xl border border-input bg-background px-3 pr-9 text-sm font-semibold text-secondary outline-none" data-testid="select-filter-year"><option value="">All years</option>{[1, 2, 3, 4, 5, 6].map((value) => <option value={value} key={value}>Year {value}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /></div><div className="relative"><select value={status} onChange={(e) => setStatus(e.target.value)} className="focus-ring h-11 appearance-none rounded-xl border border-input bg-background px-3 pr-9 text-sm font-semibold text-secondary outline-none" data-testid="select-filter-status"><option value="">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option></select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /></div>{hasFilters && <button type="button" onClick={clearFilters} className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl px-3 text-xs font-bold text-accent transition hover:bg-accent/10" data-testid="button-reset-filters"><X size={15} /> Reset</button>}</div></div><div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><SlidersHorizontal size={14} />{listQuery.isLoading ? 'Refreshing register…' : `${students.length} ${students.length === 1 ? 'record' : 'records'} shown`}</div></section>
    {listQuery.isError ? <Notice message="The student register is unavailable right now. Please try again." /> : listQuery.isLoading ? <SkeletonRows count={5} /> : students.length === 0 ? <EmptyState filtered={hasFilters} onClear={clearFilters} /> : <StudentTable students={students} onEdit={openEdit} onDelete={setDeleting} />}
  </div>
  <StudentModal open={formOpen} student={editing} pending={createMutation.isPending || updateMutation.isPending} error={mutationError} onClose={() => setFormOpen(false)} onSubmit={save} />
  {deleting && <ConfirmDialog student={deleting} pending={deleteMutation.isPending} onCancel={() => setDeleting(undefined)} onConfirm={confirmDelete} />}
  </AppShell>;
}

function StudentTable({ students, onEdit, onDelete }: { students: Student[]; onEdit: (student: Student) => void; onDelete: (student: Student) => void }) {
  return <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" data-testid="students-table"><div className="hidden overflow-x-auto md:block"><table className="w-full text-left"><thead className="border-b border-border bg-muted/50"><tr className="data-label text-muted-foreground"><th className="px-5 py-4 font-normal">Student</th><th className="px-5 py-4 font-normal">Department</th><th className="px-5 py-4 font-normal">Year</th><th className="px-5 py-4 font-normal">Status</th><th className="px-5 py-4 font-normal">Enrolled</th><th className="px-5 py-4 text-right font-normal">Actions</th></tr></thead><tbody className="divide-y divide-border">{students.map((student) => <tr key={student.id} className="group transition hover:bg-muted/40" data-testid={`row-student-${student.id}`}><td className="px-5 py-4"><Link href={`/students/${student.id}`} className="focus-ring flex w-fit items-center gap-3 rounded-lg" data-testid={`link-student-${student.id}`}><Avatar student={student} size="sm" /><span><span className="block text-sm font-bold text-secondary">{student.firstName} {student.lastName}</span><span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">{student.studentId}</span></span></Link></td><td className="px-5 py-4 text-sm text-muted-foreground">{student.department}</td><td className="px-5 py-4 text-sm font-semibold text-secondary">Year {student.year}</td><td className="px-5 py-4"><StatusPill status={student.status} /></td><td className="px-5 py-4 text-sm text-muted-foreground">{formatDate(student.enrollmentDate)}</td><td className="px-5 py-4"><div className="flex justify-end gap-1 opacity-70 transition group-hover:opacity-100"><button type="button" onClick={() => onEdit(student)} className="focus-ring rounded-lg p-2 text-muted-foreground transition hover:bg-primary hover:text-secondary" aria-label={`Edit ${student.firstName} ${student.lastName}`} data-testid={`button-edit-student-${student.id}`}><Pencil size={15} /></button><button type="button" onClick={() => onDelete(student)} className="focus-ring rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${student.firstName} ${student.lastName}`} data-testid={`button-delete-student-${student.id}`}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div><div className="divide-y divide-border md:hidden">{students.map((student) => <div key={student.id} className="p-4" data-testid={`card-student-${student.id}`}><div className="flex items-start gap-3"><Avatar student={student} /><div className="min-w-0 flex-1"><Link href={`/students/${student.id}`} className="focus-ring text-sm font-bold text-secondary" data-testid={`link-mobile-student-${student.id}`}>{student.firstName} {student.lastName}</Link><p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{student.studentId}</p><p className="mt-3 text-xs text-muted-foreground">{student.department} · Year {student.year}</p></div><StatusPill status={student.status} /></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => onEdit(student)} className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-bold text-secondary" data-testid={`button-mobile-edit-${student.id}`}><Pencil size={13} /> Edit</button><button type="button" onClick={() => onDelete(student)} className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-destructive" data-testid={`button-mobile-delete-${student.id}`}><Trash2 size={13} /> Delete</button></div></div>)}</div></div>;
}

function StudentDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const client = useQueryClient();
  const id = Number(params.id);
  const studentQuery = useGetStudent(id, { query: { enabled: Number.isFinite(id), queryKey: getGetStudentQueryKey(id) } });
  const updateMutation = useUpdateStudent();
  const deleteMutation = useDeleteStudent();
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: 'error' | 'success' }>();
  const student = studentQuery.data;
  if (studentQuery.isLoading) return <AppShell><div className="mx-auto max-w-[1000px] px-5 py-10 sm:px-8"><div className="skeleton h-5 w-32 rounded" /><div className="mt-8 skeleton h-32 rounded-2xl" /><div className="mt-5 skeleton h-64 rounded-2xl" /></div></AppShell>;
  if (studentQuery.isError || !student) return <AppShell><div className="mx-auto max-w-[1000px] px-5 py-16 sm:px-8"><Notice message="We couldn't find that student record. It may have been removed or the link is incorrect." /><Link href="/students" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-bold text-secondary-foreground" data-testid="link-back-to-students"><ArrowLeft size={16} /> Back to students</Link></div></AppShell>;
  const save = (form: FormState) => updateMutation.mutate({ id: student.id, data: toStudentInput(form) }, { onSuccess: () => { setFormOpen(false); setNotice({ text: 'Student record updated.', tone: 'success' }); void client.invalidateQueries({ queryKey: getGetStudentQueryKey(student.id) }); void client.invalidateQueries({ queryKey: getListStudentsQueryKey() }); void client.invalidateQueries({ queryKey: getGetStudentsSummaryQueryKey() }); } });
  const confirmDelete = () => deleteMutation.mutate({ id: student.id }, { onSuccess: () => { void client.invalidateQueries({ queryKey: getListStudentsQueryKey() }); void client.invalidateQueries({ queryKey: getGetStudentsSummaryQueryKey() }); setLocation('/students'); } });
  return <AppShell><div className="mx-auto max-w-[1100px] px-5 py-8 sm:px-8 sm:py-10"><Link href="/students" className="focus-ring mb-8 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-secondary" data-testid="link-back-students"><ArrowLeft size={16} /> Back to students</Link>{notice && <Notice message={notice.text} tone={notice.tone} onDismiss={() => setNotice(undefined)} />}<div className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between"><div className="flex items-center gap-4"><Avatar student={student} size="lg" /><div><div className="mb-2 flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-muted-foreground">{student.studentId}</span><StatusPill status={student.status} /></div><h1 className="text-3xl font-extrabold tracking-[-0.04em] text-secondary sm:text-4xl">{student.firstName} {student.lastName}</h1><p className="mt-1 text-sm text-muted-foreground">{student.department} · Year {student.year}</p></div></div><div className="flex gap-2"><button type="button" onClick={() => setFormOpen(true)} className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-bold text-secondary transition hover:bg-muted" data-testid="button-detail-edit"><Pencil size={15} /> Edit record</button><button type="button" onClick={() => setDeleting(true)} className="focus-ring inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-destructive transition hover:bg-destructive/10" data-testid="button-detail-delete"><Trash2 size={15} /> Delete</button></div></div>
    <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><div className="mb-6 flex items-center justify-between"><div><p className="data-label text-muted-foreground">Student profile</p><h2 className="mt-1 text-lg font-extrabold text-secondary">Contact details</h2></div><button type="button" onClick={() => navigator.clipboard?.writeText(student.email)} className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-accent transition hover:bg-accent/10" data-testid="button-copy-email"><Copy size={14} /> Copy email</button></div><div className="grid gap-5 sm:grid-cols-2"><DetailItem label="Email address" value={student.email} /><DetailItem label="Phone number" value={student.phone} /><DetailItem label="Department" value={student.department} /><DetailItem label="Academic year" value={`Year ${student.year}`} /></div></section><section className="rounded-2xl border border-border bg-secondary p-5 text-secondary-foreground shadow-sm sm:p-6"><p className="data-label text-primary">Record timeline</p><div className="mt-6 space-y-5"><TimelineItem label="Last updated" value={formatDate(student.updatedAt)} /><TimelineItem label="Enrolled" value={formatDate(student.enrollmentDate)} /><TimelineItem label="Record created" value={formatDate(student.createdAt)} /></div></section></div>
    <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><p className="data-label text-muted-foreground">Record identifier</p><div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="font-mono text-sm font-bold text-secondary">{student.id.toString().padStart(6, '0')} / {student.studentId}</p><p className="text-xs text-muted-foreground">Use the student ID when speaking with the registrar's office.</p></div></div>
  </div><StudentModal open={formOpen} student={student} pending={updateMutation.isPending} error={updateMutation.isError ? 'We could not save this record. Try again.' : undefined} onClose={() => setFormOpen(false)} onSubmit={save} />{deleting && <ConfirmDialog student={student} pending={deleteMutation.isPending} onCancel={() => setDeleting(false)} onConfirm={confirmDelete} />}</AppShell>;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div><p className="data-label text-muted-foreground">{label}</p><p className="mt-2 break-words text-sm font-semibold text-secondary" data-testid={`detail-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</p></div>;
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-primary" /><div><p className="text-xs text-secondary-foreground/55">{label}</p><p className="mt-0.5 text-sm font-bold">{value}</p></div></div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Dashboard} /><Route path="/students" component={StudentsPage} /><Route path="/students/:id" component={StudentDetail} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></QueryClientProvider>;
}

export default App;
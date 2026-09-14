import { useState, type ReactNode } from 'react';
import {
  ArrowUpRight,
  Check,
  CircleHelp,
  FileText,
  LayoutDashboard,
  Menu,
  Plus,
  Users,
  X,
} from 'lucide-react';
import './_group.css';

type Student = {
  id: number;
  firstName: string;
  lastName: string;
  department: string;
  year: number;
  status: 'active' | 'inactive';
  createdAt: string;
};

const students: Student[] = [
  { id: 1, firstName: 'Amina', lastName: 'Okafor', department: 'Computer Science', year: 3, status: 'active', createdAt: '2024-09-08' },
  { id: 2, firstName: 'Lucas', lastName: 'Martin', department: 'Business Administration', year: 2, status: 'active', createdAt: '2024-09-06' },
  { id: 3, firstName: 'Sofia', lastName: 'Chen', department: 'Engineering', year: 4, status: 'inactive', createdAt: '2024-09-04' },
  { id: 4, firstName: 'Ethan', lastName: 'Williams', department: 'Arts & Humanities', year: 1, status: 'active', createdAt: '2024-09-02' },
  { id: 5, firstName: 'Nora', lastName: 'Haddad', department: 'Natural Sciences', year: 3, status: 'active', createdAt: '2024-08-30' },
];

const departments = [
  { department: 'Computer Science', count: 26 },
  { department: 'Business Administration', count: 20 },
  { department: 'Engineering', count: 18 },
  { department: 'Arts & Humanities', count: 12 },
  { department: 'Natural Sciences', count: 8 },
];

function initials(student: Pick<Student, 'firstName' | 'lastName'>) {
  return `${student.firstName[0]}${student.lastName[0]}`.toUpperCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function Avatar({ student }: { student: Student }) {
  return <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-extrabold text-primary-foreground">{initials(student)}</div>;
}

function StatusPill({ status }: { status: Student['status'] }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${status === 'active' ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}><span className={`h-1.5 w-1.5 rounded-full ${status === 'active' ? 'bg-accent' : 'bg-muted-foreground'}`} />{status}</span>;
}

function StatCard({ label, value, detail, icon, tone }: { label: string; value: number; detail: string; icon: ReactNode; tone: 'yellow' | 'green' | 'ink' | 'coral' }) {
  const toneClass = { yellow: 'bg-primary text-secondary', green: 'bg-accent text-accent-foreground', ink: 'bg-secondary text-secondary-foreground', coral: 'bg-[#d66e57] text-[#fff5e6]' }[tone];
  return <div className="animate-rise-in rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><div><p className="data-label text-muted-foreground">{label}</p><p className="mt-4 text-3xl font-extrabold tracking-tight text-secondary">{value}</p></div><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>{icon}</div></div><p className="mt-4 text-xs text-muted-foreground">{detail}</p></div>;
}

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  return <><aside className={`fixed inset-y-0 left-0 z-20 flex w-[248px] flex-col bg-secondary px-5 py-6 text-secondary-foreground transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}><div className="flex items-center gap-3 px-2"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-secondary"><span className="text-lg font-black">S</span></div><div><p className="font-extrabold tracking-tight">S.D</p><p className="data-label text-secondary-foreground/55">Student registry</p></div></div><div className="mt-12 px-2"><p className="data-label text-secondary-foreground/40">Workspace</p><nav className="mt-3 space-y-1"><button type="button" className="focus-ring flex w-full items-center gap-3 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-secondary"><LayoutDashboard size={18} strokeWidth={2.5} />Overview<span className="ml-auto h-1.5 w-1.5 rounded-full bg-secondary" /></button><button type="button" onClick={onClose} className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-secondary-foreground/65 transition hover:bg-secondary-foreground/10 hover:text-secondary-foreground"><Users size={18} />Students</button></nav></div><div className="mt-auto rounded-2xl border border-secondary-foreground/10 bg-secondary-foreground/5 p-4"><div className="mb-3 flex items-center justify-between"><span className="data-label text-secondary-foreground/50">Registry health</span><span className="h-2 w-2 rounded-full bg-primary" /></div><p className="text-xs leading-5 text-secondary-foreground/65">Your workspace is ready for today's records.</p><div className="mt-4 flex items-center gap-2 text-xs font-bold text-primary"><CircleHelp size={14} /> Need a hand?</div></div><div className="mt-5 flex items-center gap-3 border-t border-secondary-foreground/10 px-2 pt-5"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">AD</div><div><p className="text-xs font-bold">Admin desk</p><p className="text-[11px] text-secondary-foreground/45">College operations</p></div></div></aside>{mobileOpen && <button type="button" className="fixed inset-0 z-10 bg-secondary/35 md:hidden" onClick={onClose} aria-label="Close navigation" />}</>;
}

export function Current() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const total = 84;
  const active = 77;
  return <div className="student-management-current grain min-h-screen bg-background"><Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} /><main className="min-h-screen md:pl-[248px]"><header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-border/80 bg-background/90 px-5 backdrop-blur-md sm:px-8"><button type="button" onClick={() => setMobileOpen(true)} className="focus-ring rounded-lg p-2 text-secondary md:hidden" aria-label="Open navigation"><Menu size={21} /></button><div className="hidden md:block"><p className="data-label text-muted-foreground">S.D / Overview</p></div><div className="ml-auto flex items-center gap-3"><span className="hidden items-center gap-2 text-xs font-semibold text-muted-foreground sm:flex"><span className="h-2 w-2 rounded-full bg-accent" /> All systems operational</span><div className="h-7 w-px bg-border" /><button type="button" className="focus-ring rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-secondary" aria-label="Help"><CircleHelp size={18} /></button></div></header><div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10"><div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="data-label text-accent">Monday, 09 September</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-secondary sm:text-4xl">Good morning, admin.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">A clear view of your student register, with the signals that matter at a glance.</p></div><button type="button" className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground transition hover:bg-accent"><Plus size={16} /> Open register <ArrowUpRight size={15} /></button></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Total students" value={total} detail="Across all departments" icon={<Users size={19} />} tone="yellow" /><StatCard label="Active records" value={active} detail="92% of your register" icon={<Check size={19} />} tone="green" /><StatCard label="Inactive records" value={7} detail="Keep an eye on these" icon={<FileText size={19} />} tone="ink" /><StatCard label="Departments" value={departments.length} detail="Represented in register" icon={<LayoutDashboard size={19} />} tone="coral" /></div><div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><section className="animate-rise-in delay-1 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><div className="mb-6 flex items-start justify-between"><div><p className="data-label text-muted-foreground">Live register</p><h2 className="mt-1 text-lg font-extrabold text-secondary">Recent records</h2></div><button type="button" className="focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-accent transition hover:bg-accent/10">View all <ArrowUpRight size={14} /></button></div><div className="space-y-2">{students.map((student) => <button type="button" key={student.id} className="focus-ring flex w-full items-center gap-3 rounded-xl border border-transparent px-2 py-3 text-left transition hover:border-border hover:bg-muted"><Avatar student={student} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-bold text-secondary">{student.firstName} {student.lastName}</p><StatusPill status={student.status} /></div><p className="mt-0.5 truncate text-xs text-muted-foreground">{student.department} · Year {student.year}</p></div><span className="hidden text-xs text-muted-foreground sm:block">{formatDate(student.createdAt)}</span><ArrowUpRight size={15} className="text-muted-foreground" /></button>)}</div></section><section className="animate-rise-in delay-2 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><div className="mb-7"><p className="data-label text-muted-foreground">Where students are</p><h2 className="mt-1 text-lg font-extrabold text-secondary">Department mix</h2></div><div className="space-y-5">{departments.map((item, index) => <div key={item.department}><div className="mb-2 flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold text-secondary">{item.department}</span><span className="font-mono text-xs font-bold text-muted-foreground">{item.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${index % 3 === 0 ? 'bg-primary' : index % 3 === 1 ? 'bg-accent' : 'bg-secondary'}`} style={{ width: `${(item.count / 26) * 100}%` }} /></div></div>)}</div></section></div><div className="animate-rise-in delay-3 mt-5 rounded-2xl border border-secondary bg-secondary p-5 text-secondary-foreground sm:flex sm:items-center sm:justify-between sm:p-6"><div><p className="data-label text-primary">Register note</p><h2 className="mt-2 text-xl font-extrabold tracking-tight">Small updates keep the big picture honest.</h2><p className="mt-1 text-sm text-secondary-foreground/60">Review inactive records before the next enrollment meeting.</p></div><button type="button" className="focus-ring mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-105 sm:mt-0">Review records <ArrowUpRight size={15} /></button></div></div></main></div>;
}
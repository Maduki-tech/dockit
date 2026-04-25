import Link from "next/link";
import {
  CheckCircle2,
  CalendarDays,
  Users,
  Paperclip,
  ArrowRight,
  ListTodo,
} from "lucide-react";
import { NewsletterForm } from "./_components/newsletter-form";

const LANDING_ONLY = process.env.LANDING_ONLY === "true";

const features = [
  {
    icon: ListTodo,
    title: "Shared Task List",
    description:
      "One place for everything your household needs to get done. No more sticky notes or forgotten chores.",
  },
  {
    icon: Users,
    title: "Assign to Each Other",
    description:
      "Delegate tasks to your partner or family members and see exactly who is responsible for what.",
  },
  {
    icon: CheckCircle2,
    title: "Track Progress",
    description:
      "Move tasks from To Do → In Progress → Done and celebrate getting things off your plate together.",
  },
  {
    icon: CalendarDays,
    title: "Plan the Week",
    description:
      "Set due dates and see everything laid out in a calendar so nothing slips through the cracks.",
  },
  {
    icon: Paperclip,
    title: "Attach Files",
    description:
      "Attach recipes, shopping lists, invoices, or any file directly to a task for easy reference.",
  },
];

const steps = [
  {
    step: "01",
    title: "Create your household",
    description: "Sign up and invite your partner or family members with a simple invite code.",
  },
  {
    step: "02",
    title: "Add tasks together",
    description: "Create tasks, set priorities, pick due dates, and assign them to the right person.",
  },
  {
    step: "03",
    title: "Stay on top of it",
    description: "Check off tasks as you go. See at a glance what's done and what still needs attention.",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Nav */}
      <header className="border-border/60 sticky top-0 z-50 border-b bg-white/80 backdrop-blur dark:bg-black/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="bg-foreground flex h-8 w-8 items-center justify-center rounded-lg">
              <ListTodo className="text-background h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Dockit</span>
          </div>
          {!LANDING_ONLY && (
            <Link
              href="/sign-in"
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              Sign in <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-24 pt-20 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,oklch(0.92_0_0/0.3),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,oklch(0.35_0_0/0.4),transparent)]"
        />
        <div className="mx-auto max-w-3xl">
          <div className="border-border mb-6 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-sm font-medium shadow-sm dark:bg-white/5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            Coming soon — join the waitlist
          </div>
          <h1 className="text-foreground mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Stay organized,{" "}
            <span className="relative">
              <span className="relative">together.</span>
              <svg
                aria-hidden
                className="text-muted-foreground/40 absolute -bottom-2 left-0 w-full"
                viewBox="0 0 300 12"
                fill="none"
              >
                <path
                  d="M2 9C50 3 100 1 150 3.5C200 6 250 4 298 9"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p className="text-muted-foreground mx-auto mb-10 max-w-xl text-lg leading-relaxed">
            Dockit is a shared task manager built for couples and families. Assign, track, and
            complete household tasks — all in one place.
          </p>
          <div className="flex justify-center">
            <NewsletterForm />
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            No spam, ever. Unsubscribe at any time.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-border/50 border-t px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to run your home
            </h2>
            <p className="text-muted-foreground mx-auto max-w-lg text-base">
              Simple, focused features that make household coordination actually enjoyable.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="border-border/60 bg-card rounded-2xl border p-6 transition-shadow hover:shadow-md"
              >
                <div className="bg-muted mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl">
                  <f.icon className="text-foreground h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-border/50 border-t px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Up and running in minutes
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.step} className="flex flex-col items-start">
                <span className="text-muted-foreground/40 mb-4 font-mono text-5xl font-bold leading-none">
                  {s.step}
                </span>
                <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-border/50 border-t px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Be first to get access
          </h2>
          <p className="text-muted-foreground mb-8 text-base">
            We&apos;re launching soon. Drop your email and we&apos;ll notify you the moment Dockit
            is ready.
          </p>
          <div className="flex justify-center">
            <NewsletterForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-border/50 border-t px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="bg-foreground flex h-6 w-6 items-center justify-center rounded-md">
              <ListTodo className="text-background h-3 w-3" />
            </div>
            <span className="text-sm font-medium">Dockit</span>
          </div>
          <p className="text-muted-foreground text-xs">
            &copy; {new Date().getFullYear()} Dockit. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

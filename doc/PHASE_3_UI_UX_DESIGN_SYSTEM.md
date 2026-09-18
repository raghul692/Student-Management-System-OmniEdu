# 🎨 Phase 3: UI/UX & Design System Architecture
# OmniEdu: Unified Multi-Tenant Student Management System

---

## Document Control
* **Product Name**: OmniEdu SMS
* **Phase**: Phase 3 — UI/UX Design System, Tokens, Bento Grid & Interaction Architecture
* **Status**: Complete & Ready for Phase 4 (Backend Engineering)
* **Design Philosophy**: Modern Enterprise SaaS (Silicon Valley Executive Grade — Linear & Stripe Aesthetics)
* **Framework Alignment**: Tailwind CSS v3.4+, Radix UI / shadcn/ui primitives, Framer Motion, Lucide Icons

---

## 1. Design Philosophy & Visual Craft

### 1.1 Aesthetic Philosophy: "Modern Executive Enterprise"
Educational ERP software is notoriously known for clunky, outdated, grey-table interfaces built in the early 2000s. OmniEdu breaks this paradigm by delivering an interface that feels like a **high-tech Silicon Valley SaaS platform** (reminiscent of Linear, Vercel, and Stripe):
1. **High Information Density with Zero Clutter**: Bento Grid layouts allow complex academic metrics (attendance rates, exam cutoffs, faculty allocations) to coexist cleanly without visual overwhelm.
2. **Dual-Theme High Contrast**: 
   * **Dark Mode (Default)**: Deep midnight obsidian (`#090d16` and `#0f172a`) with subtle radial gradients, glowing border shaders, and translucent glassmorphism.
   * **Light Mode**: Crisp porcelain white (`#ffffff` and `#f8fafc`) with subtle slate shadows and high-contrast typography designed for daytime classroom visibility.
3. **Tactile Spring Micro-Interactions**: Micro-animations powered by Framer Motion give buttons, switches, and tabs physical weight, preventing robotic transitions.

---

## 2. Design Tokens & Visual Hierarchy

### 2.1 Color Palette & Semantics

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BRAND & SURFACE TOKENS                          │
├───────────────────┬────────────────────────────────────────────────────┤
│ Primary Brand     │ Royal Indigo (#6366f1) / Deep Indigo (#4f46e5)     │
│ Dark Background   │ Obsidian (#090d16) / Slate Navy (#0f172a)          │
│ Dark Card Surface │ Slate Glass (#1e293b / 80% opacity with blur)      │
│ Light Background  │ Crisp Porcelain (#f8fafc)                          │
│ Light Card Surface│ Pure White (#ffffff) with Slate-100 borders        │
├───────────────────┴────────────────────────────────────────────────────┤
│                        ACADEMIC STATUS TOKENS                          │
├───────────────────┬────────────────────────────────────────────────────┤
│ Present / Passed  │ Emerald Green (#10b981) — High attendance & passed │
│ Absent / Fail     │ Crimson Rose (#f43f5e) — Critical attendance / RA  │
│ At-Risk Warning   │ Amber Gold (#f59e0b) — Below 75% attendance        │
│ On-Duty (OD)      │ Electric Cyan (#06b6d4) — College symposium / sport│
│ Neutral / Inactive│ Zinc / Slate (#64748b) — Archived / Unassigned     │
└───────────────────┴────────────────────────────────────────────────────┘
```

#### Tailwind CSS Semantic Color Mapping:
```javascript
// tailwind.config.js token snippet
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        surface: 'hsl(var(--surface))',
        border: 'hsl(var(--border))',
        primary: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          subtle: 'rgba(99, 102, 241, 0.12)',
        },
        academic: {
          present: '#10b981',
          absent: '#f43f5e',
          warning: '#f59e0b',
          onduty: '#06b6d4',
        }
      }
    }
  }
}
```

---

### 2.2 Mathematical Typography Hierarchy (Major Third — 1.250 Scale)
We use a **tri-font typographic strategy** to maximize readability:
* **Display & Section Headers**: `Outfit` (Geometric, modern, bold personality).
* **Body Text & Standard UI**: `Inter` (Neutral, highly legible at small sizes).
* **Academic Identifiers (Reg No, Subject Codes, CGPA)**: `JetBrains Mono` (Monospaced clarity).

| Token | Font Size | Line Height | Tracking | Recommended Font & Use Case |
| :--- | :--- | :--- | :--- | :--- |
| `text-display` | 48px (`3rem`) | 56px | `-0.025em` | **Outfit Bold** — Hero campus headers & large metric numbers. |
| `text-h1` | 36px (`2.25rem`) | 44px | `-0.02em` | **Outfit Semibold** — Page titles (e.g., "Department of CSE"). |
| `text-h2` | 28px (`1.75rem`) | 36px | `-0.015em` | **Outfit Semibold** — Section headers & Modal titles. |
| `text-h3` | 22px (`1.375rem`)| 30px | `-0.01em` | **Outfit Medium** — Bento card titles & widget headers. |
| `text-base` | 16px (`1rem`) | 24px | `normal` | **Inter Regular** — Default body text and form inputs. |
| `text-sm` | 14px (`0.875rem`)| 20px | `normal` | **Inter Medium** — Table cells, navigation items, secondary text. |
| `text-caption`| 12px (`0.75rem`) | 16px | `+0.02em` | **Inter Regular** — Form help text, timestamps, audit details. |
| `text-code` | 13px (`0.8125rem`)| 18px | `normal` | **JetBrains Mono** — Register Numbers, Subject Codes, CGPA. |

---

### 2.3 The 8-Point Spatial Grid System
All margins, paddings, gaps, and dimensions strictly conform to multiples of 8px (with a 4px half-unit for fine icon alignment):
* `4px` (`p-1` / `gap-1`): Fine micro-spacing, badge padding, icon margins.
* `8px` (`p-2` / `gap-2`): Compact table cells, pill button vertical padding.
* `16px` (`p-4` / `gap-4`): Standard card padding, form field gaps, table row heights.
* `24px` (`p-6` / `gap-6`): Bento grid gaps, modal dialog padding.
* `32px` (`p-8` / `gap-8`): Page containers, hero card spacing.
* `48px` (`p-12`): Major module separations and dashboard top sections.

---

### 2.4 Z-Index Elevation & Layering Governance
```css
:root {
  --z-base: 0;           /* Background grids & canvas */
  --z-card: 1;           /* Bento Grid cards & content widgets */
  --z-sticky: 10;        /* Sticky table headers (attendance matrix) */
  --z-header: 20;        /* Fixed top navigation bar */
  --z-drawer: 30;        /* Quick action side drawers */
  --z-dropdown: 40;      /* Campus switcher & user profile menu */
  --z-modal: 50;         /* Add Student / Enter Marks dialogs */
  --z-toast: 60;         /* Success/error toast notifications */
  --z-tooltip: 70;       /* Quick hover tooltips */
}
```

---

## 3. Atomic Design Component Hierarchy

```
Atoms
├── Button (Primary, Secondary, Ghost, Destructive, IconOnly)
├── Input (Text, Number, Date, SearchWithIcon)
├── StatusBadge (Present, Absent, OnDuty, Warning75, Passed, RA)
├── Avatar (User profile with online status beacon)
└── Tooltip (Accessible popover explanation)

Molecules
├── FormField (Label + Input + ErrorHelperText)
├── CampusSelectorPill (Trust Group active campus toggle)
├── AttendanceToggleGroup (Present | Absent | On-Duty segmented control)
├── MetricTile (Value + Icon + Trend Indicator + Subtext)
└── TableSearchFilterBar (Live search + Department/Standard dropdown + Export button)

Organisms
├── GlobalAppHeader (Campus Switcher, Breadcrumbs, Theme Toggle, User Menu)
├── DynamicAppSidebar (Adapts navigation links based on tenantType)
├── BentoGridAnalytics (Multi-widget high-contrast telemetry board)
├── BatchAttendanceMatrix (Hour/Period student attendance grid)
├── MarkEntryLedger (Subject mark entry table with live CGPA/Grade preview)
└── GuestDemoBanner (Top sticky alert explaining sandbox mode with 1-click toggle)

Templates
├── AppShellLayout (Desktop collapsible sidebar + Mobile drawer + Header + Content)
├── AuthCardLayout (Centered high-impact login card with role selection)
└── ModalDrawerSheet (Dialog on desktop, swipe-down bottom drawer on mobile)

Pages
├── DashboardPage (Bento Grid telemetry adapting to School vs College vs Trust)
├── StudentsDirectoryPage (Filterable roster with quick actions)
├── AttendanceManagerPage (Batch daily/hourly marking flow)
├── ExaminationMarksPage (IAT / Term marks entry & report cards)
└── CampusSettingsPage (Institution details, departments, classes configuration)
```

---

## 4. Bento Grid Dashboard Architecture

The dashboard utilizes an **Asymmetric Bento Grid** layout that dynamically shifts its widgets based on whether the active tenant is an **Engineering College**, a **K-12 School**, or an **Educational Trust**.

### 4.1 College Bento Grid Layout (Desktop View)

```
┌─────────────────────────────────────────────────┬───────────────────────┬───────────────────────┐
│ WIDGET 1: Hero Attendance Stream (2 cols, 2 rows)│ WIDGET 2: Metric Tile │ WIDGET 3: Metric Tile │
│ • Live Today's Attendance Rate: 88.4%           │ Total Students        │ Faculty Strength      │
│ • Attendance Defaulters Alert (<75% Anna Univ): │ 1,240 Enrolled        │ 86 Professors / HODs  │
│   - CSE 3rd Sem: 8 students at risk             │ ↑ 4.2% vs last batch  │ 100% Allocated        │
│   - ECE 5th Sem: 3 students at risk             ├───────────────────────┴───────────────────────┤
│ • Interactive hour-by-hour bar trend            │ WIDGET 4: Department Pass % (2 cols, 1 row)   │
│ • One-Click "Dispatch Parent Warning SMS/Email" │ • CSE: 94.2%  • ECE: 89.1%  • MECH: 82.5%     │
├─────────────────────────────────────────────────┤ • Bar comparison with college average cutoff  │
│ WIDGET 5: Quick Action Drawer                   ├───────────────────────────────────────────────┤
│ [ + Mark Hour Attendance ] [ + Enter IAT Marks ]│ WIDGET 6: Academic Calendar & Upcoming IATs   │
│ [ Bulk Student CSV Import ] [ Export PDF ]      │ • IAT-2 starts in 6 days (Schedule locked)    │
└─────────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

### 4.2 School Bento Grid Layout (Desktop View)

```
┌─────────────────────────────────────────────────┬───────────────────────┬───────────────────────┐
│ WIDGET 1: Hero Attendance Matrix (2 cols, 2 rows│ WIDGET 2: Metric Tile │ WIDGET 3: Metric Tile │
│ • Morning Bell Attendance Status: 96.8% Marked  │ Total School Strength │ Class Teachers        │
│ • Standard 6th to 12th attendance comparison    │ 850 Students          │ 32 Active Teachers    │
│ • Late Arrivals / Unexcused Absences counter    │ 440 Boys / 410 Girls  │ 0 Absent Today        │
│ • Direct "Call Guardian" drawer shortcut        ├───────────────────────┴───────────────────────┤
│ • Automated Morning vs Afternoon trend          │ WIDGET 4: Term Exam Pass Trends (2 cols, 1 row│
├─────────────────────────────────────────────────┤ • Quarterly Exam 10th Std: 98% Pass Rate      │
│ WIDGET 5: Quick Class Actions                   │ • 12th Std Board Exam Preparation Cutoffs     │
│ [ Take Period Attendance ] [ Issue Report Card ]├───────────────────────────────────────────────┤
│ [ Add New Admission ] [ Parent Notice Board ]   │ WIDGET 6: School Notices & Events             │
└─────────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

### 4.3 Group Trust Executive View (Multi-Campus Rollup)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP HEADER: Trust Executive Switcher [ Active Campus: Apollo Group (Both) ▾ ]                   │
├────────────────────────────────────────┬────────────────────────────────────────────────────────┤
│ WIDGET 1: Apollo Engineering College   │ WIDGET 2: Apollo Matriculation Higher Secondary School │
│ • Enrolled Students: 1,420             │ • Enrolled Students: 980                               │
│ • Daily Attendance: 89.2%              │ • Daily Attendance: 97.4%                              │
│ • Departments: 6 Active (CSE, ECE...)  │ • Standards: 6th to 12th (14 Sections)                 │
│ • Semester Status: Odd Sem (IAT-2)     │ • Academic Status: Mid-Term Examination Phase          │
│ [ Switch Directly to College Portal ]  │ [ Switch Directly to School Portal ]                   │
├────────────────────────────────────────┴────────────────────────────────────────────────────────┤
│ WIDGET 3: Consolidated Trust Analytics (Cross-Campus Faculty, Compliance, & Resource Health)   │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Screen Wireframes & Responsive Ergonomics

### 5.1 Global Shell & Navigation Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [LOGO] OmniEdu   |   [🏛️ Apollo Engineering College ▾]   Search (Ctrl+K)...   [🌙/☀️] [User ▾]    │
├───────────────┬──────────────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR       │ MAIN CONTENT AREA                                                                │
│ ───────────── │ ──────────────────────────────────────────────────────────────────────────────── │
│ 📊 Dashboard  │ Department of Computer Science & Engineering                                     │
│ 👥 Students   │ Semester 5 — Academic Year 2025-2026                                             │
│ ⏱️ Attendance │                                                                                  │
│ 📝 Exams/Marks│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ 📚 Courses    │ │ [ + Mark Hour Attendance ]   [ + Enter IAT Marks ]   [ Download PDF Report ] │ │
│ ⚙️ Settings   │ └──────────────────────────────────────────────────────────────────────────────┘ │
│               │                                                                                  │
│ ───────────── │ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ 🎭 GUEST MODE │ │ BATCH ATTENDANCE LEDGER — Subject: CS8492 Database Management Systems        │ │
│ [School Demo] │ │ Date: 2026-09-09 | Hour: 3 | Faculty: Dr. Sundaram K.                        │ │
│ [College Demo]│ ├──────────────┬──────────────────┬─────────────┬──────────────────────────────┤ │
│               │ │ Register No  │ Student Name     │ Total Attd% │ Status Toggle                │ │
│               │ ├──────────────┼──────────────────┼─────────────┼──────────────────────────────┤ │
│               │ │ 910021104001 │ Aravind Kumar    │ 94.5%       │ [ (P) |  A  |  OD ]          │ │
│               │ │ 910021104002 │ Bhavani Devi     │ 72.0% ⚠️    │ [  P  | (A) |  OD ]          │ │
│               │ │ 910021104003 │ Chezhiyan S.     │ 88.0%       │ [  P  |  A  | (OD)]          │ │
│               │ └──────────────┴──────────────────┴─────────────┴──────────────────────────────┘ │
└───────────────┴──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.2 Mobile Ergonomics & Responsive Behavior

1. **Desktop Data Grid $\rightarrow$ Mobile Card Stack**:
   * On desktop ($\ge 1024\text{px}$), the attendance ledger renders as a compact, multi-column keyboard-navigable table.
   * On mobile ($< 768\text{px}$), each student row transforms into a **touch-friendly card**:
     ```
     ┌──────────────────────────────────────────────┐
     │ 910021104002 • Bhavani Devi                  │
     │ Current Attendance: 72.0% (At Risk ⚠️)       │
     │ ┌───────────────┬──────────────┬───────────┐ │
     │ │  PRESENT (P)  │  ABSENT (A)  │  ON-DUTY  │ │
     │ └───────────────┴──────────────┴───────────┘ │
     └──────────────────────────────────────────────┘
     ```
2. **Bottom Sheet Drawers (`vaul`) on Mobile**:
   * Instead of tiny popups or modals on mobile, clicking "Enter Marks" or "Filter Students" slides up a natural swipeable bottom drawer that can be operated easily with one thumb.

---

## 6. Framer Motion Micro-Interactions & Animation Specs

### 6.1 Spring Dynamics Configuration
Robotic `linear` and `ease-in-out` transitions are prohibited. All UI animations follow physics-based spring dampening:

```typescript
// src/lib/motionTokens.ts
export const naturalSpring = {
  type: "spring",
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};

export const snappySpring = {
  type: "spring",
  stiffness: 550,
  damping: 35,
};
```

### 6.2 Campus Switcher Layout Morph (`layoutId`)
When a Trust Admin switches campuses in the navbar, the background pill indicator smoothly glides between options:

```tsx
<div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/10">
  {campuses.map((campus) => (
    <button
      key={campus.id}
      onClick={() => setActiveCampus(campus.id)}
      className="relative px-3 py-1.5 text-xs font-medium text-slate-200"
    >
      {activeCampusId === campus.id && (
        <motion.div
          layoutId="active-campus-pill"
          className="absolute inset-0 bg-indigo-600 rounded-lg shadow-md"
          transition={snappySpring}
        />
      )}
      <span className="relative z-10">{campus.name}</span>
    </button>
  ))}
</div>
```

### 6.3 Tactile Haptic-Feel Attendance Toggles
Clicking **PRESENT**, **ABSENT**, or **ON-DUTY** scales the button down slightly on tap and rebounds with a micro-pop:
```tsx
<motion.button
  whileTap={{ scale: 0.94 }}
  whileHover={{ scale: 1.02 }}
  transition={{ type: "spring", stiffness: 500, damping: 20 }}
  className={status === 'PRESENT' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}
>
  P
</motion.button>
```

---

## 7. Accessibility (a11y) & Keyboard Productivity

1. **Excel-Style Rapid Mark Entry (Keyboard First)**:
   * Faculty and teachers can enter marks using keyboard arrow keys:
     * `Enter` or `Down Arrow`: Commits current mark and jumps to the next student in the list.
     * `Tab`: Advances to the next subject column.
     * Instant validation: Typing numbers $> 100$ immediately highlights the input border in Rose-500 and prevents form submission.
2. **WCAG 2.1 AA Contrast Compliance**:
   * Text on Dark Mode surfaces maintains a minimum contrast ratio of **$7:1$** for body text and **$4.5:1$** for captions.
   * All status colors (Emerald, Rose, Amber, Cyan) are paired with text labels or distinct icons so color-blind users can instantly differentiate Present, Absent, and On-Duty.

---

## 8. Phase 3 Sign-Off & Deliverables Checklist

| UI/UX Deliverable Area | Implementation Specification | Status |
| :--- | :--- | :--- |
| **Color & Spacing System** | 8pt Spatial Grid, Semantic Academic Tokens, Dark/Light Themes | **COMPLETE** |
| **Typography Scale** | Major Third (1.250) ratio using Outfit + Inter + JetBrains Mono | **COMPLETE** |
| **Component Hierarchy** | Full Atomic Design breakdown (Atoms $\rightarrow$ Molecules $\rightarrow$ Organisms) | **COMPLETE** |
| **Bento Grid Layouts** | Specific layouts designed for College, School, and Group Trust | **COMPLETE** |
| **Responsive Ergonomics**| Mobile card conversion, swipe-down bottom drawers | **COMPLETE** |
| **Micro-Interactions** | Framer Motion natural springs & `layoutId` pill transitions | **COMPLETE** |
| **Keyboard Productivity**| Tab/Enter rapid mark entry specifications | **COMPLETE** |

---
**Phase 3 UI/UX & Design System Architecture is officially COMPLETE.**  
Ready to proceed with **Phase 4: Core Backend & Database Setup** upon instruction.

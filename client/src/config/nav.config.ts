import {
  LayoutDashboard,
  Timer,
  MonitorCheck,
  Users,
  UsersRound,
  Settings,
  CirclePlay,
  History,
  Plus,
} from "lucide-react";

export const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Sessions",
    href: "/sessions",
    icon: Timer,
    children: [
      { label: "Active", href: "/sessions/active", icon: CirclePlay },
      { label: "History", href: "/sessions", icon: History },
      { label: "New", href: "/sessions/new", icon: Plus },
    ],
  },
  {
    label: "Workstations",
    href: "/workstations",
    icon: MonitorCheck,
  },
  {
    label: "Workers",
    href: "/workers",
    icon: Users,
  },
  {
    label: "Groups",
    href: "/groups",
    icon: UsersRound,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
] as const;

export const BOTTOM_NAV_ITEMS = [
  NAV_ITEMS[0], // Dashboard
  NAV_ITEMS[1], // Sessions
  NAV_ITEMS[3], // Workers
] as const;
import {
  LayoutDashboard,
  Timer,
  MonitorCheck,
  Settings,
  CirclePlay,
  History,
  Plus,
  Package,
  CreditCard,
  ClipboardList,
  User,
  Users,
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
    icon: User,
  },
  {
    label: "Groups",
    href: "/groups",
    icon: Users,
  },
  {
    label: "Items",
    href: "/items",
    icon: Package,
  },
  {
    label: "Forms",
    href: "/forms",
    icon: ClipboardList,
  },
  {
    label: "Billing",
    href: "/billing",
    icon: CreditCard,
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
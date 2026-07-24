import { NavLink } from "react-router-dom";
import {
  Flame,
  LayoutDashboard,
  Building2,
  Radio,
  Map,
  ScrollText,
  Image,
  Users,
  LogOut,
} from "lucide-react";
import { useAuth } from "../auth-context";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/orgs", label: "Organizations", icon: Building2, superOnly: true },
  { to: "/drones", label: "Drones", icon: Radio },
  { to: "/arcgis", label: "ArcGIS Config", icon: Map },
  { to: "/media", label: "Media", icon: Image },
  { to: "/users", label: "Users", icon: Users, adminOnly: true },
  { to: "/sync-logs", label: "Sync Logs", icon: ScrollText },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-2 rounded-lg">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">
              DJI Cloud
            </h1>
            <p className="text-xs text-slate-400">Middleware</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems
          .filter(
            (item) =>
              (!item.superOnly || user?.role === "super_admin") &&
              (!item.adminOnly ||
                user?.role === "super_admin" ||
                user?.role === "org_admin")
          )
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-red-600/20 text-red-400"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="p-3 border-t border-slate-700">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          <p className="text-xs text-slate-500 capitalize">{user?.role?.replace("_", " ")}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

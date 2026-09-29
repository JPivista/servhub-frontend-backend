import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { signOut } from "../store/authSlice";
import { flattenNavItems, getNavItems } from "../constants/nav";
import { icons } from "../components/icons";
import { formatDateLabel, formatTimeLabel, greetingForNow } from "../utils/greeting";
import { materialRequestHref } from "../features/workflow/workflow";
import { userEditHref } from "../features/users/userRoutes";
import { saveSettings } from "../store/directorySlice";
import { api } from "../services/api";

const demoNotifications = [];

const THEME_OPTIONS = [
  { id: "day", icon: "sun", label: "Day" },
  { id: "night", icon: "moon", label: "Night" },
  { id: "system", icon: "system", label: "System" },
];

function matchText(value, q) {
  return String(value || "").toLowerCase().includes(q);
}

function ThemeSwitcher() {
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.directory.settings?.theme || "day");

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-white/15 bg-white/8 p-1">
      {THEME_OPTIONS.map((item) => {
        const active = theme === item.id;
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            aria-label={item.label}
            aria-pressed={active}
            onClick={() => dispatch(saveSettings({ theme: item.id }))}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-[11px] transition ${
              active
                ? "bg-brand-blue text-white shadow-[0_6px_16px_rgba(4,114,223,0.35)]"
                : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            {icons[item.icon]}
          </button>
        );
      })}
    </div>
  );
}

export default function TopBar({ onMenu, navOpen, navVisible, onToggleNav }) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const wrapRef = useRef(null);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const role = useSelector((state) => state.auth.role);
  const privileges = useSelector((state) => state.auth.privileges);
  const users = useSelector((state) => state.directory.users);
  const departments = useSelector((state) => state.directory.departments);
  const roles = useSelector((state) => state.directory.roles);
  const mrs = useSelector((state) => state.workflow.materialRequests);
  const roleKey = role?.key;
  const navItems = flattenNavItems(getNavItems(privileges, roleKey));
  const showSearch = roleKey !== "user" && roleKey !== "requestor" && roleKey !== "requester";
  const firstName = user?.name?.split(" ")[0] || "there";
  const initials = user?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const items = [];

    navItems.forEach((item) => {
      if (matchText(item.label, q)) {
        items.push({
          key: `page-${item.key}`,
          label: item.label,
          hint: "Page",
          to: item.to,
        });
      }
    });

    users.forEach((item) => {
      if (matchText(item.name, q) || matchText(item.email, q) || matchText(item.role, q)) {
        items.push({
          key: `user-${item.id}`,
          label: item.name,
          hint: `User · ${item.email}`,
          to: userEditHref(item.id),
        });
      }
    });

    departments.forEach((item) => {
      if (matchText(item.name, q) || matchText(item.key, q)) {
        items.push({
          key: `dept-${item.key}`,
          label: item.name,
          hint: "Department",
          to: "/departments",
        });
      }
    });

    roles.forEach((item) => {
      if (matchText(item.name, q) || matchText(item.key, q)) {
        items.push({
          key: `role-${item.key}`,
          label: item.name,
          hint: "Role",
          to: `/privileges?role=${encodeURIComponent(item.key)}`,
        });
      }
    });

    mrs.forEach((item) => {
      if (
        matchText(item.id, q) ||
        matchText(item.mrNo, q) ||
        matchText(item.project, q) ||
        matchText(item.status, q) ||
        matchText(item.requestedBy, q)
      ) {
        items.push({
          key: `mr-${item.id}`,
          label: item.id || item.mrNo,
          hint: `MR · ${item.project || item.status}`,
          to: materialRequestHref(item.id || item.mrNo),
        });
      }
    });

    return items.slice(0, 12);
  }, [departments, mrs, navItems, query, roles, users]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onClick = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setSearchOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
        setNotifyOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const onLogout = async () => {
    setProfileOpen(false);
    try {
      await api.post("/auth/logout", {});
    } catch {
      // ignore network errors on logout audit
    }
    dispatch(signOut());
    navigate("/login");
  };

  return (
    <header className="glass fixed top-0 left-0 right-0 z-50 rounded-none border-x-0 border-t-0">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-5">
        <button
          type="button"
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-blue text-white shadow-[0_8px_20px_rgba(4,114,223,0.35)] hover:bg-brand-blue-dark lg:inline-flex"
          onClick={onToggleNav}
          aria-pressed={navVisible}
          aria-label={navVisible ? "Hide navigation" : "Show navigation"}
          title={navVisible ? "Hide navigation" : "Show navigation"}
        >
          {icons.waffle}
        </button>
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white/80 lg:hidden"
          onClick={onMenu}
          aria-pressed={navOpen}
          aria-label={navOpen ? "Close navigation" : "Open navigation"}
        >
          {icons.menu}
        </button>

        <div className="hidden min-w-[11rem] shrink-0 sm:block">
          <p className="text-sm font-semibold leading-tight">
            {greetingForNow(now)}, {firstName}
          </p>
          <p className="text-xs text-white/50">
            {formatDateLabel(now)} · {formatTimeLabel(now)}
          </p>
        </div>

        {showSearch ? (
          <div ref={wrapRef} className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-brand-navy/40">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                />
              </svg>
            </div>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search pages, users, departments, MRs..."
              className="w-full rounded-2xl border border-white/20 bg-white py-2.5 pl-12 pr-4 text-sm text-brand-navy outline-none placeholder:text-brand-navy/45 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
            />
            {searchOpen && query.trim() ? (
              <div className="absolute z-[60] mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-[rgba(15,42,68,0.1)] bg-white shadow-[0_16px_40px_rgba(15,42,68,0.14)]">
                {results.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-brand-navy/55">No matches for “{query}”.</p>
                ) : (
                  results.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        navigate(item.to);
                        setQuery("");
                        setSearchOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#eef3f7]"
                    >
                      <p className="text-sm font-medium text-brand-navy">{item.label}</p>
                      <p className="shrink-0 text-xs text-brand-navy/45">{item.hint}</p>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex-1 sm:hidden">
            <p className="text-sm font-semibold leading-tight">
              {greetingForNow(now)}, {firstName}
            </p>
            <p className="text-xs text-white/50">
              {formatDateLabel(now)} · {formatTimeLabel(now)}
            </p>
          </div>
        )}

        {!showSearch ? <div className="hidden flex-1 sm:block" /> : null}

        <div ref={profileRef} className="relative flex items-center gap-2 sm:gap-3">
          <ThemeSwitcher />

          <button
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-white/80 hover:bg-white/12 hover:text-white"
            onClick={() => {
              setNotifyOpen((value) => !value);
              setProfileOpen(false);
            }}
            aria-label="Notifications"
          >
            {icons.bell}
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-blue" />
          </button>

          <button
            type="button"
            className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/8 px-2 py-1.5 hover:bg-white/12"
            onClick={() => {
              setProfileOpen((value) => !value);
              setNotifyOpen(false);
            }}
            aria-expanded={profileOpen}
          >
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{user?.name}</p>
              <p className="text-xs text-white/50">{role?.name}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-teal text-sm font-semibold text-brand-navy">
              {initials}
            </div>
          </button>

          {notifyOpen ? (
            <div className="absolute right-0 top-12 z-[70] w-80 overflow-hidden rounded-2xl border border-[rgba(15,42,68,0.1)] bg-white shadow-[0_16px_40px_rgba(15,42,68,0.14)]">
              <div className="border-b border-[rgba(15,42,68,0.08)] px-4 py-3">
                <p className="text-sm font-semibold text-brand-navy">Notifications</p>
              </div>
              {demoNotifications.length ? (
                demoNotifications.map((item) => (
                  <div key={item.id} className="border-b border-[rgba(15,42,68,0.06)] px-4 py-3 last:border-0">
                    <p className="text-sm font-medium text-brand-navy">{item.title}</p>
                    <p className="mt-0.5 text-xs text-brand-navy/55">{item.body}</p>
                  </div>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-brand-navy/55">No notifications from the server.</p>
              )}
            </div>
          ) : null}

          {profileOpen ? (
            <div className="absolute right-0 top-12 z-[70] w-56 overflow-hidden rounded-2xl border border-[rgba(15,42,68,0.1)] bg-white shadow-[0_16px_40px_rgba(15,42,68,0.14)]">
              <button
                type="button"
                className="flex w-full px-4 py-3 text-left text-sm font-medium text-brand-navy hover:bg-[#eef3f7]"
                onClick={() => {
                  setProfileOpen(false);
                  navigate("/settings");
                }}
              >
                Settings
              </button>
              <button
                type="button"
                className="flex w-full px-4 py-3 text-left text-sm font-medium text-brand-navy hover:bg-[#eef3f7]"
                onClick={onLogout}
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

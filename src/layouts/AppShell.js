import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet } from "react-router-dom";
import { getNavItems } from "../constants/nav";
import { api } from "../services/api";
import { refreshDirectory } from "../store/authSlice";
import { setMaterialRequests } from "../store/workflowSlice";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

function resolveTheme(theme) {
  if (theme === "night") return "night";
  if (theme === "day") return "day";
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "night";
  }
  return "day";
}

export default function AppShell() {
  const dispatch = useDispatch();
  const [navVisible, setNavVisible] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const privileges = useSelector((state) => state.auth.privileges);
  const roleKey = useSelector((state) => state.auth.role?.key);
  const themePreference = useSelector((state) => state.directory.settings?.theme || "day");
  const [resolved, setResolved] = useState(() => resolveTheme(themePreference));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await dispatch(refreshDirectory());
      } catch {
        // directory stays empty until the next successful fetch
      }
      try {
        const response = await api.get("/material-requests");
        if (!cancelled) dispatch(setMaterialRequests(response.materialRequests || []));
      } catch {
        if (!cancelled) dispatch(setMaterialRequests([]));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    const apply = () => setResolved(resolveTheme(themePreference));
    apply();
    if (themePreference !== "system") return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [themePreference]);

  const themeClass = resolved === "day" ? "theme-rest" : "theme-night";

  return (
    <div className={`${themeClass} relative min-h-screen`}>
      <div className="aurora" />
      <Sidebar
        items={getNavItems(privileges, roleKey)}
        visible={navVisible}
        pinned={pinned}
        onTogglePin={() => setPinned((value) => !value)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <TopBar
        navOpen={mobileOpen}
        navVisible={navVisible}
        onMenu={() => setMobileOpen((value) => !value)}
        onToggleNav={() => {
          setNavVisible((value) => {
            const next = !value;
            if (!next) {
              setPinned(false);
              setMobileOpen(false);
            }
            return next;
          });
        }}
      />
      <div
        className={`relative z-10 flex min-h-screen flex-col px-3 pb-4 pt-[5.75rem] transition-[padding] duration-[850ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] lg:px-4 ${
          navVisible ? (pinned ? "lg:pl-[17.25rem]" : "lg:pl-[5.75rem]") : "lg:pl-4"
        }`}
      >
        <main className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import GlassPanel, { PageIntro } from "../../components/ui/GlassPanel";
import { fieldClass, primaryBtn } from "../../components/ui/formStyles";
import { api } from "../../services/api";
import { syncCurrentUser } from "../../store/authSlice";
import { hasPrivilege } from "../../constants/privileges";

export default function Profile() {
  const dispatch = useDispatch();
  const privileges = useSelector((state) => state.auth.privileges);
  const authUser = useSelector((state) => state.auth.user);
  const users = useSelector((state) => state.directory.users);
  const match = users.find((item) => item.id === authUser?.id) || authUser;
  const canEdit = hasPrivilege(privileges, "profile", "edit");
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  if (!hasPrivilege(privileges, "profile", "view") || !match) {
    return <Navigate to="/" replace />;
  }

  const current = form || match;

  const onSave = async (event) => {
    event.preventDefault();
    if (!canEdit) return;
    setError("");
    try {
      await api.put("/users/me", { name: current.name, email: current.email });
      await dispatch(syncCurrentUser());
      setForm(null);
    } catch (err) {
      setError(err.message || "Failed to save profile");
    }
  };

  return (
    <div className="space-y-5">
      <PageIntro kicker="Account" title="Profile" />
      <GlassPanel as="article" className="p-6">
        {error ? <p className="mb-3 text-sm text-red-200">{error}</p> : null}
        <form className="grid max-w-xl gap-3" onSubmit={onSave}>
          <label className="block">
            <span className="mb-1.5 block text-sm text-white/70">Name</span>
            <input
              className={fieldClass}
              value={current.name || ""}
              disabled={!canEdit}
              onChange={(e) => setForm({ ...current, name: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-white/70">Email</span>
            <input
              type="email"
              className={fieldClass}
              value={current.email || ""}
              disabled={!canEdit}
              onChange={(e) => setForm({ ...current, email: e.target.value })}
            />
          </label>
          {canEdit ? (
            <button type="submit" className={primaryBtn}>
              Save profile
            </button>
          ) : null}
        </form>
      </GlassPanel>
    </div>
  );
}

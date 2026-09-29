import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import GlassPanel, { PageIntro } from "../../components/ui/GlassPanel";
import { approveBtn, fieldClass, ghostBtn } from "../../components/ui/formStyles";
import { hasPrivilege } from "../../constants/privileges";
import { api } from "../../services/api";

const emptyRow = () => ({ productId: "", name: "", unit: "" });

export default function MaterialsPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const privileges = useSelector((state) => state.auth.privileges);
  const roleKey = useSelector((state) => state.auth.role?.key);
  const canCreate = roleKey === "super_admin" || hasPrivilege(privileges, "materials", "create");
  const canEdit = roleKey === "super_admin" || hasPrivilege(privileges, "materials", "edit");
  const [departments, setDepartments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [managers, setManagers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    project: "",
    department: "",
    managerId: "",
    rows: [emptyRow()],
  });

  useEffect(() => {
    if (!canCreate) return;
    (async () => {
      try {
        const [departmentResponse, materialResponse] = await Promise.all([
          api.get("/departments"),
          api.get("/materials"),
        ]);
        setDepartments((departmentResponse.departments || []).filter((item) => item.key !== "testing"));
        const names = [
          ...new Set(
            (materialResponse.materials || []).map((item) => String(item.project || "").trim()).filter(Boolean)
          ),
        ];
        setProjects(names);
        if (isEdit) {
          const match = (materialResponse.materials || []).find((item) => item.id === id);
          if (!match) {
            setError("Material not found");
            return;
          }
          setForm({
            project: match.project || "",
            department: match.department || "",
            managerId: "",
            rows: [{ productId: match.productId || "", name: match.name || "", unit: match.unit || "" }],
          });
        }
      } catch (err) {
        setError(err.message || "Failed to load departments");
      }
    })();
  }, [canCreate, id, isEdit]);

  useEffect(() => {
    if (!form.department) {
      setManagers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ department: form.department });
        if (form.project.trim()) params.set("project", form.project.trim());
        const data = await api.get(`/materials/managers?${params.toString()}`);
        if (cancelled) return;
        setManagers(data.managers || []);
        if (data.appointment?.managerId) {
          setForm((prev) => ({ ...prev, managerId: data.appointment.managerId }));
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load managers");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.department]);

  if (isEdit && !canEdit) return <Navigate to="/materials" replace />;
  if (!isEdit && !canCreate) return <Navigate to="/materials" replace />;

  const updateRow = (index, patch) => {
    setForm((prev) => {
      const rows = [...prev.rows];
      rows[index] = { ...rows[index], ...patch };
      return { ...prev, rows };
    });
  };

  const save = async (event) => {
    event.preventDefault();
    setError("");
    const rows = form.rows.filter((item) => item.productId.trim() && item.name.trim());
    if (!form.project.trim()) {
      setError("Enter a project");
      return;
    }
    if (!form.department) {
      setError("Select a department");
      return;
    }
    if (!form.managerId) {
      setError("Select the manager for this department on this project");
      return;
    }
    if (!rows.length) {
      setError("Add at least one material row");
      return;
    }
    setLoading(true);
    try {
      await api.put("/materials/manager", {
        project: form.project.trim(),
        department: form.department,
        managerId: form.managerId,
      });
      if (isEdit) {
        const row = rows[0];
        await api.put(`/materials/${id}`, {
          productId: row.productId.trim(),
          name: row.name.trim(),
          project: form.project.trim(),
          department: form.department,
          unit: row.unit.trim(),
        });
      } else {
        for (const row of rows) {
          await api.post("/materials", {
            productId: row.productId.trim(),
            name: row.name.trim(),
            project: form.project.trim(),
            department: form.department,
            unit: row.unit.trim(),
          });
        }
      }
      navigate("/materials");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageIntro kicker="Catalog" title={isEdit ? "Edit Material" : "Add Materials"} />
      <GlassPanel as="article" className="p-5 sm:p-6">
        {error ? <p className="mb-4 text-sm text-red-200">{error}</p> : null}
        <form className="space-y-5" onSubmit={save}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm text-white/70">Project</span>
              <input
                className={fieldClass}
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })}
                onBlur={() => {
                  if (!form.department || !form.project.trim()) return;
                  api
                    .get(
                      `/materials/managers?department=${encodeURIComponent(form.department)}&project=${encodeURIComponent(form.project.trim())}`
                    )
                    .then((data) => {
                      setManagers(data.managers || []);
                      if (data.appointment?.managerId) {
                        setForm((prev) => ({ ...prev, managerId: data.appointment.managerId }));
                      }
                    })
                    .catch((err) => setError(err.message));
                }}
                placeholder="e.g. Office renovation"
                list="material-projects"
                required
              />
              <datalist id="material-projects">
                {projects.map((project) => (
                  <option key={project} value={project} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-white/70">Department</span>
              <select
                className={fieldClass}
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value, managerId: "" })}
                required
              >
                <option value="">Select department</option>
                {departments.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm text-white/70">Department manager</span>
              <select
                className={fieldClass}
                value={form.managerId}
                onChange={(e) => setForm({ ...form, managerId: e.target.value })}
                required
                disabled={!form.department}
              >
                <option value="">
                  {form.department
                    ? "Select the manager for this department on this project"
                    : "Select a department first"}
                </option>
                {managers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-3 rounded-[22px] border border-white/10 bg-white/5 p-4">
            <div>
              <p className="text-sm font-semibold">Materials</p>
              <p className="text-xs text-white/50">Use + to add a row and − to remove one</p>
            </div>

            <div className="hidden gap-2 text-[11px] uppercase tracking-[0.14em] text-white/45 sm:grid sm:grid-cols-12">
              <span className="sm:col-span-3">P. id</span>
              <span className="sm:col-span-5">Name</span>
              <span className="sm:col-span-2">Unit</span>
              <span className="sm:col-span-2 text-center">Actions</span>
            </div>

            {form.rows.map((row, index) => (
              <div key={`material-${index}`} className="grid gap-2 sm:grid-cols-12 sm:items-center">
                <input
                  className={`${fieldClass} sm:col-span-3`}
                  placeholder="Product id"
                  value={row.productId}
                  onChange={(e) => updateRow(index, { productId: e.target.value })}
                  required
                />
                <input
                  className={`${fieldClass} sm:col-span-5`}
                  placeholder="Name"
                  value={row.name}
                  onChange={(e) => updateRow(index, { name: e.target.value })}
                  required
                />
                <input
                  className={`${fieldClass} sm:col-span-2`}
                  placeholder="Unit"
                  value={row.unit}
                  onChange={(e) => updateRow(index, { unit: e.target.value })}
                />
                <div className="flex items-center justify-center gap-2 sm:col-span-2">
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal text-lg font-semibold text-white shadow-[0_6px_16px_rgba(4,167,147,0.35)] hover:bg-brand-teal-dark disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => {
                      const rows = [...form.rows];
                      rows.splice(index + 1, 0, emptyRow());
                      setForm({ ...form, rows });
                    }}
                    disabled={isEdit}
                    aria-label="Add material row"
                    title="Add row"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-lg font-semibold text-white shadow-[0_6px_16px_rgba(239,68,68,0.35)] hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() =>
                      setForm({
                        ...form,
                        rows: form.rows.filter((_, itemIndex) => itemIndex !== index),
                      })
                    }
                    disabled={form.rows.length <= 1}
                    aria-label="Remove material row"
                    title="Remove row"
                  >
                    −
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className={approveBtn} disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Save material" : "Save materials"}
            </button>
            <button type="button" className={ghostBtn} onClick={() => navigate("/materials")}>
              Cancel
            </button>
          </div>
        </form>
      </GlassPanel>
    </div>
  );
}

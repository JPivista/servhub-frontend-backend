import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import GlassPanel, { PageIntro } from "../../components/ui/GlassPanel";
import { approveBtn, fieldClass, ghostBtn } from "../../components/ui/formStyles";
import SearchSelect from "../../components/ui/SearchSelect";
import { hasPrivilege } from "../../constants/privileges";
import { api } from "../../services/api";
import { saveMaterialRequest } from "../../store/workflowSlice";
import { isEditableStatus } from "../../features/workflow/workflow";

const emptyProduct = () => ({
  productId: "",
  name: "",
  description: "",
  quantity: "",
  unit: "",
  amount: "",
});

function sameProject(left, right) {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

function toFormProducts(products) {
  if (!products?.length) return [emptyProduct()];
  return products.map((item) => ({
    productId: item.productId || "",
    name: item.name || "",
    description: item.description || (!item.productId ? item.name : "") || "",
    quantity: item.quantity || "",
    unit: item.unit || "",
    amount: item.amount ?? "",
  }));
}

export default function MaterialRequestFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const privileges = useSelector((state) => state.auth.privileges);
  const currentUser = useSelector((state) => state.auth.user);
  const userDepartment = currentUser?.department || "";
  const currentUserId = currentUser?.id || "";
  const currentUserName = currentUser?.name || "";
  const existing = useSelector((state) =>
    state.workflow.materialRequests.find((item) => item.id === id)
  );
  const canCreate = hasPrivilege(privileges, "material_requests", "create");
  const canEdit = hasPrivilege(privileges, "material_requests", "edit");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [requesters, setRequesters] = useState([]);
  const [manager, setManager] = useState(null);
  const [form, setForm] = useState({
    project: "",
    department: userDepartment,
    createdForId: currentUserId,
    justification: "",
    products: [emptyProduct()],
    status: "Draft",
  });

  useEffect(() => {
    (async () => {
      try {
        const [departmentResponse, materialResponse] = await Promise.all([
          api.get("/departments"),
          api.get("/materials"),
        ]);
        setDepartments((departmentResponse.departments || []).filter((item) => item.key !== "testing"));
        setMaterials(materialResponse.materials || []);
      } catch (err) {
        setError(err.message || "Failed to load departments and materials");
      }
    })();
  }, []);

  useEffect(() => {
    if (!form.department || !form.project) {
      setRequesters([]);
      setManager(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await api.get(
          `/material-requests/assignees?department=${encodeURIComponent(form.department)}&project=${encodeURIComponent(form.project)}`
        );
        if (cancelled) return;
        const people = response.requesters || [];
        setRequesters(people);
        setManager(response.manager || null);
        setForm((prev) => {
          if (prev.createdForId && people.some((item) => item.id === prev.createdForId)) return prev;
          const self = people.find((item) => item.id === currentUserId);
          return { ...prev, createdForId: self?.id || "" };
        });
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load requesters");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, form.department, form.project]);

  useEffect(() => {
    if (!isEdit) return;
    if (existing) {
      setForm({
        project: existing.project || "",
        department: existing.department || userDepartment,
        createdForId: existing.requestedById || "",
        justification: existing.justification || "",
        status: existing.status || "Draft",
        products: toFormProducts(existing.products),
      });
      return;
    }
    (async () => {
      try {
        const response = await api.get("/material-requests");
        const match = (response.materialRequests || []).find((item) => item.id === id);
        if (!match) return;
        dispatch(saveMaterialRequest(match));
        setForm({
          project: match.project || "",
          department: match.department || userDepartment,
          createdForId: match.requestedById || "",
          justification: match.justification || "",
          status: match.status || "Draft",
          products: toFormProducts(match.products),
        });
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [dispatch, existing, id, isEdit, userDepartment]);

  if (isEdit && !canEdit) return <Navigate to="/material-requests" replace />;
  if (!isEdit && !canCreate) return <Navigate to="/material-requests" replace />;
  if (isEdit && existing && !isEditableStatus(existing.status)) {
    return <Navigate to={`/material-requests/${id}`} replace />;
  }

  const projectOptions = [...new Set(materials.map((item) => String(item.project || "").trim()).filter(Boolean))];
  if (form.project && !projectOptions.some((item) => sameProject(item, form.project))) {
    projectOptions.unshift(form.project);
  }

  const departmentOptions = departments.filter((department) => {
    if (!form.project) return true;
    return materials.some(
      (item) => item.department === department.key && sameProject(item.project, form.project)
    );
  });
  if (form.department && !departmentOptions.some((item) => item.key === form.department)) {
    const current = departments.find((item) => item.key === form.department);
    if (current) departmentOptions.unshift(current);
  }

  const matchingMaterials = materials.filter(
    (item) => item.department === form.department && sameProject(item.project, form.project)
  );

  const updateProduct = (index, patch) => {
    setForm((prev) => {
      const products = [...prev.products];
      products[index] = { ...products[index], ...patch };
      return { ...prev, products };
    });
  };

  const chooseMaterial = (index, productId) => {
    const material = matchingMaterials.find((item) => item.productId === productId);
    setForm((prev) => {
      const products = prev.products.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              productId: material?.productId || "",
              name: material?.name || "",
              unit: material?.unit || "",
            }
          : item
      );
      if (material && products.every((item) => item.productId)) {
        products.push(emptyProduct());
      }
      return { ...prev, products };
    });
  };

  const clearProductChoices = (products) =>
    products.map((item) => ({
      ...emptyProduct(),
      description: item.description,
      quantity: item.quantity,
      amount: item.amount,
    }));

  const onProjectChange = (project) => {
    setForm((prev) => {
      const departmentStillValid = materials.some(
        (item) => item.department === prev.department && sameProject(item.project, project)
      );
      return {
        ...prev,
        project,
        department: departmentStillValid ? prev.department : "",
        createdForId: currentUserId,
        products: clearProductChoices(prev.products),
      };
    });
  };

  const onDepartmentChange = (department) => {
    setForm((prev) => ({
      ...prev,
      department,
      createdForId: currentUserId,
      products: clearProductChoices(prev.products),
    }));
  };

  const saveRequest = async (status) => {
    setError("");
    setLoading(true);
    const products = form.products
      .filter((item) => item.productId && item.quantity)
      .map((item) => ({
        productId: item.productId,
        name: item.name,
        description: item.description || "",
        quantity: String(item.quantity),
        unit: item.unit || "",
        amount: Number(item.amount) || 0,
      }));
    if (!form.project) {
      setError("Select a project");
      setLoading(false);
      return;
    }
    if (!form.department) {
      setError("Select a department");
      setLoading(false);
      return;
    }
    if (!form.createdForId) {
      setError("Select who this request is created for");
      setLoading(false);
      return;
    }
    if (status === "Requested" && !manager) {
      setError("No manager is appointed for this department on this project");
      setLoading(false);
      return;
    }
    if (!products.length) {
      setError("Select a product and quantity for at least one row");
      setLoading(false);
      return;
    }
    try {
      const payload = {
        project: form.project,
        department: form.department,
        createdForId: form.createdForId,
        justification: form.justification,
        products,
        status,
      };
      const response = isEdit
        ? await api.put(`/material-requests/${id}`, payload)
        : await api.post("/material-requests", payload);
      dispatch(saveMaterialRequest(response.materialRequest));
      navigate("/material-requests");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onSaveDraft = async (event) => {
    event.preventDefault();
    await saveRequest("Draft");
  };

  return (
    <div className="space-y-5">
      <PageIntro
        kicker="Request"
        title={isEdit ? `Edit ${id}` : "New Material Request Form"}
      />
      <GlassPanel as="article" className="p-5 sm:p-6">
        {error ? <p className="mb-4 text-sm text-red-200">{error}</p> : null}
        <form className="space-y-5" onSubmit={onSaveDraft}>
          <div className="grid gap-3 sm:grid-cols-2">
            {isEdit ? (
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm text-white/70">MR No.</span>
                <input className={fieldClass} value={id} disabled />
              </label>
            ) : null}
            <label className="block">
              <span className="mb-1.5 block text-sm text-white/70">Project</span>
              <SearchSelect
                value={form.project}
                onChange={onProjectChange}
                placeholder="Select project"
                required
                options={projectOptions.map((project) => ({ value: project, label: project }))}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-white/70">Department</span>
              <SearchSelect
                value={form.department}
                onChange={onDepartmentChange}
                placeholder="Select department"
                required
                options={departmentOptions.map((item) => ({ value: item.key, label: item.name }))}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-white/70">Created for</span>
              <SearchSelect
                value={form.createdForId}
                onChange={(createdForId) => setForm({ ...form, createdForId })}
                placeholder={
                  !form.department
                    ? "Select department first"
                    : !form.project
                      ? "Select a project first"
                      : "Select a person"
                }
                required
                disabled={!form.department}
                options={[
                  ...(form.createdForId && !requesters.some((item) => item.id === form.createdForId)
                    ? [{
                        value: form.createdForId,
                        label: form.createdForId === currentUserId ? currentUserName : "Saved requester",
                      }]
                    : []),
                  ...requesters.map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-white/70">Assigned manager</span>
              <input
                className={fieldClass}
                value={
                  manager?.name ||
                  (form.project && form.department
                    ? "No manager appointed for this project and department"
                    : "Select a project and department first")
                }
                disabled
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm text-white/70">Description</span>
              <input
                className={fieldClass}
                value={form.justification}
                onChange={(e) => setForm({ ...form, justification: e.target.value })}
                placeholder="Why is this needed?"
                required
              />
            </label>
          </div>

          <div className="space-y-3 rounded-[22px] border border-white/10 bg-white/5 p-4">
            <div>
              <p className="text-sm font-semibold">Materials</p>
              <p className="text-xs text-white/50">
                Choose a project and department. Search by product id or material name. The next row is added when either is filled.
              </p>
            </div>

            <div className="hidden gap-2 text-[11px] uppercase tracking-[0.14em] text-white/45 sm:grid sm:grid-cols-12">
              <span className="sm:col-span-3">P. id</span>
              <span className="sm:col-span-3">Material name</span>
              <span className="sm:col-span-2">Qty</span>
              <span className="sm:col-span-2">Amount</span>
              <span className="sm:col-span-2 text-center">Actions</span>
            </div>

            {form.products.map((product, index) => {
              const taken = new Set(
                form.products
                  .filter((_, itemIndex) => itemIndex !== index)
                  .map((item) => item.productId)
                  .filter(Boolean)
              );
              const options = matchingMaterials.filter(
                (item) => item.productId === product.productId || !taken.has(item.productId)
              );
              const productOptions = [
                ...(product.productId && !options.some((item) => item.productId === product.productId)
                  ? [{ productId: product.productId, name: product.name || product.productId }]
                  : []),
                ...options,
              ];
              const anotherRowChosen = form.products.some(
                (item, itemIndex) => itemIndex !== index && item.productId
              );
              const productRequired = Boolean(product.productId) || !anotherRowChosen;
              return (
                <div key={`product-${index}`} className="grid gap-2 sm:grid-cols-12 sm:items-center">
                  <SearchSelect
                    className="sm:col-span-3"
                    value={product.productId}
                    onChange={(productId) => chooseMaterial(index, productId)}
                    placeholder={
                      form.project && form.department
                        ? "Select product"
                        : "Select project and department first"
                    }
                    required={productRequired}
                    disabled={!form.project || !form.department}
                    options={productOptions.map((item) => ({
                      value: item.productId,
                      label: item.name ? `${item.productId} — ${item.name}` : item.productId,
                    }))}
                  />
                  <SearchSelect
                    className="sm:col-span-3"
                    value={product.productId}
                    onChange={(productId) => chooseMaterial(index, productId)}
                    placeholder="Material name"
                    required={productRequired}
                    disabled={!form.project || !form.department}
                    options={productOptions.map((item) => ({
                      value: item.productId,
                      label: item.name || item.productId,
                    }))}
                  />
                  <input
                    className={`${fieldClass} sm:col-span-2`}
                    placeholder="Qty"
                    value={product.quantity}
                    onChange={(e) => updateProduct(index, { quantity: e.target.value })}
                    required={Boolean(product.productId)}
                  />
                  <input
                    type="number"
                    className={`${fieldClass} sm:col-span-2`}
                    placeholder="Amount"
                    value={product.amount}
                    onChange={(e) => updateProduct(index, { amount: e.target.value })}
                  />
                  <div className="flex items-center justify-center gap-2 sm:col-span-2">
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal text-lg font-semibold text-white shadow-[0_6px_16px_rgba(4,167,147,0.35)] hover:bg-brand-teal-dark disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => {
                        const products = [...form.products];
                        products.splice(index + 1, 0, emptyProduct());
                        setForm({ ...form, products });
                      }}
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
                          products: form.products.filter((_, itemIndex) => itemIndex !== index),
                        })
                      }
                      disabled={form.products.length <= 1}
                      aria-label="Remove material row"
                      title="Remove row"
                    >
                      −
                    </button>
                  </div>
                </div>
              );
            })}
            {form.project && form.department && !matchingMaterials.length ? (
              <p className="text-xs text-white/55">
                No materials are listed for this project and department yet. Add them from the Materials page.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className={ghostBtn} disabled={loading}>
              {loading ? "Saving..." : "Save as draft"}
            </button>
            <button
              type="button"
              className={approveBtn}
              disabled={loading}
              onClick={() => saveRequest("Requested")}
            >
              {loading ? "Sending..." : "Send request"}
            </button>
            <button
              type="button"
              className={ghostBtn}
              onClick={() => navigate("/material-requests")}
            >
              Cancel
            </button>
          </div>
        </form>
      </GlassPanel>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BikeManagerBike = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  type: string | null;
  frameSize: string | null;
  frameMaterial: string | null;
  drivetrain: string | null;
  brakeType: string | null;
  wheelset: string | null;
  tireSetup: string | null;
  notes: string | null;
  isArchived: boolean;
};

type BikeManagerProps = {
  bikes: BikeManagerBike[];
  selectedBikeId?: string;
};

type BikeFormState = {
  name: string;
  brand: string;
  model: string;
  year: string;
  type: string;
  frameSize: string;
  frameMaterial: string;
  drivetrain: string;
  brakeType: string;
  wheelset: string;
  tireSetup: string;
  notes: string;
};

type FormStatus = {
  type: "idle" | "success" | "error";
  message?: string;
};

function blankBikeForm(): BikeFormState {
  return {
    name: "",
    brand: "",
    model: "",
    year: "",
    type: "",
    frameSize: "",
    frameMaterial: "",
    drivetrain: "",
    brakeType: "",
    wheelset: "",
    tireSetup: "",
    notes: "",
  };
}

function bikeToFormState(bike: BikeManagerBike): BikeFormState {
  return {
    name: bike.name,
    brand: bike.brand ?? "",
    model: bike.model ?? "",
    year: bike.year ? String(bike.year) : "",
    type: bike.type ?? "",
    frameSize: bike.frameSize ?? "",
    frameMaterial: bike.frameMaterial ?? "",
    drivetrain: bike.drivetrain ?? "",
    brakeType: bike.brakeType ?? "",
    wheelset: bike.wheelset ?? "",
    tireSetup: bike.tireSetup ?? "",
    notes: bike.notes ?? "",
  };
}

function normalizePayload(form: BikeFormState) {
  return {
    name: form.name.trim(),
    brand: form.brand.trim(),
    model: form.model.trim(),
    year: form.year.trim(),
    type: form.type.trim(),
    frameSize: form.frameSize.trim(),
    frameMaterial: form.frameMaterial.trim(),
    drivetrain: form.drivetrain.trim(),
    brakeType: form.brakeType.trim(),
    wheelset: form.wheelset.trim(),
    tireSetup: form.tireSetup.trim(),
    notes: form.notes.trim(),
  };
}

function bikeDisplayName(bike: BikeManagerBike) {
  const detailed = [bike.year, bike.brand, bike.model].filter(Boolean).join(" ").trim();
  return detailed.length > 0 ? detailed : bike.name;
}

export function BikeManager({ bikes, selectedBikeId }: BikeManagerProps) {
  const router = useRouter();
  const [createForm, setCreateForm] = useState<BikeFormState>(blankBikeForm);
  const [createStatus, setCreateStatus] = useState<FormStatus>({ type: "idle" });
  const [isCreating, setIsCreating] = useState(false);
  const [editingBikeId, setEditingBikeId] = useState<string | undefined>(undefined);
  const [editForm, setEditForm] = useState<BikeFormState>(blankBikeForm);
  const [editStatus, setEditStatus] = useState<FormStatus>({ type: "idle" });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isUpdatingArchive, setIsUpdatingArchive] = useState<string | undefined>(undefined);

  const activeBikes = bikes.filter((bike) => !bike.isArchived);
  const archivedBikes = bikes.filter((bike) => bike.isArchived);

  async function toggleArchived(bike: BikeManagerBike, nextArchived: boolean) {
    setIsUpdatingArchive(bike.id);
    setEditStatus({ type: "idle" });

    try {
      const response = await fetch(`/api/bikes/${bike.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isArchived: nextArchived,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not update bike archive state.");
      }

      setEditStatus({
        type: "success",
        message: nextArchived
          ? `${bikeDisplayName(bike)} archived.`
          : `${bikeDisplayName(bike)} restored.`,
      });
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not update bike archive state.";
      setEditStatus({ type: "error", message });
    } finally {
      setIsUpdatingArchive(undefined);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-display text-xl font-semibold text-slate-900">Bike Garage</h2>
      <p className="mt-1 text-sm text-slate-600">
        Create, edit, archive, and restore bikes from one place.
      </p>

      <form
        className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setCreateStatus({ type: "idle" });

          const payload = normalizePayload(createForm);
          if (!payload.name) {
            setCreateStatus({
              type: "error",
              message: "Bike name is required.",
            });
            return;
          }

          setIsCreating(true);

          try {
            const response = await fetch("/api/bikes", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });

            const result = (await response.json()) as { error?: string };
            if (!response.ok) {
              throw new Error(result.error ?? "Could not create bike.");
            }

            setCreateForm(blankBikeForm());
            setCreateStatus({
              type: "success",
              message: "Bike created.",
            });
            router.refresh();
          } catch (error) {
            const message = error instanceof Error ? error.message : "Could not create bike.";
            setCreateStatus({
              type: "error",
              message,
            });
          } finally {
            setIsCreating(false);
          }
        }}
      >
        <h3 className="text-sm font-semibold text-slate-900">Add bike</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm text-slate-700">
            Name
            <input
              required
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((previous) => ({ ...previous, name: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Brand
            <input
              value={createForm.brand}
              onChange={(event) =>
                setCreateForm((previous) => ({ ...previous, brand: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Model
            <input
              value={createForm.model}
              onChange={(event) =>
                setCreateForm((previous) => ({ ...previous, model: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Year
            <input
              type="number"
              min="1900"
              max="2100"
              value={createForm.year}
              onChange={(event) =>
                setCreateForm((previous) => ({ ...previous, year: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Type
            <input
              value={createForm.type}
              onChange={(event) =>
                setCreateForm((previous) => ({ ...previous, type: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Frame size
            <input
              value={createForm.frameSize}
              onChange={(event) =>
                setCreateForm((previous) => ({ ...previous, frameSize: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Frame material
            <input
              value={createForm.frameMaterial}
              onChange={(event) =>
                setCreateForm((previous) => ({ ...previous, frameMaterial: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Drivetrain
            <input
              value={createForm.drivetrain}
              onChange={(event) =>
                setCreateForm((previous) => ({ ...previous, drivetrain: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Brake type
            <input
              value={createForm.brakeType}
              onChange={(event) =>
                setCreateForm((previous) => ({ ...previous, brakeType: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Wheelset
            <input
              value={createForm.wheelset}
              onChange={(event) =>
                setCreateForm((previous) => ({ ...previous, wheelset: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Tire setup
            <input
              value={createForm.tireSetup}
              onChange={(event) =>
                setCreateForm((previous) => ({ ...previous, tireSetup: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
        </div>
        <label className="mt-3 block text-sm text-slate-700">
          Notes
          <textarea
            value={createForm.notes}
            onChange={(event) =>
              setCreateForm((previous) => ({ ...previous, notes: event.target.value }))
            }
            className="mt-1 h-20 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={isCreating}
          className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreating ? "Creating..." : "Create bike"}
        </button>
        {createStatus.type !== "idle" && createStatus.message ? (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              createStatus.type === "success"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {createStatus.message}
          </p>
        ) : null}
      </form>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-900">Active bikes</h3>
        <div className="mt-3 space-y-3">
          {activeBikes.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              No active bikes. Create one above or restore an archived bike.
            </p>
          ) : (
            activeBikes.map((bike) => (
              <article key={bike.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{bikeDisplayName(bike)}</p>
                    <p className="text-xs text-slate-600">
                      {bike.type ?? "Type not set"}
                      {selectedBikeId === bike.id ? " · Selected" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBikeId(bike.id);
                        setEditForm(bikeToFormState(bike));
                        setEditStatus({ type: "idle" });
                      }}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={isUpdatingArchive === bike.id}
                      onClick={async () => {
                        const shouldArchive = window.confirm(
                          "Archive this bike? It will be hidden from the switcher but data is kept.",
                        );
                        if (!shouldArchive) {
                          return;
                        }

                        await toggleArchived(bike, true);
                      }}
                      className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isUpdatingArchive === bike.id ? "Working..." : "Archive"}
                    </button>
                  </div>
                </div>

                {editingBikeId === bike.id ? (
                  <form
                    className="mt-3 grid gap-3 sm:grid-cols-2"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      setIsSavingEdit(true);
                      setEditStatus({ type: "idle" });

                      try {
                        const response = await fetch(`/api/bikes/${bike.id}`, {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify(normalizePayload(editForm)),
                        });

                        const result = (await response.json()) as { error?: string };
                        if (!response.ok) {
                          throw new Error(result.error ?? "Could not update bike.");
                        }

                        setEditStatus({ type: "success", message: "Bike updated." });
                        setEditingBikeId(undefined);
                        router.refresh();
                      } catch (error) {
                        const message =
                          error instanceof Error ? error.message : "Could not update bike.";
                        setEditStatus({ type: "error", message });
                      } finally {
                        setIsSavingEdit(false);
                      }
                    }}
                  >
                    <label className="text-sm text-slate-700">
                      Name
                      <input
                        required
                        value={editForm.name}
                        onChange={(event) =>
                          setEditForm((previous) => ({ ...previous, name: event.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      Brand
                      <input
                        value={editForm.brand}
                        onChange={(event) =>
                          setEditForm((previous) => ({ ...previous, brand: event.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      Model
                      <input
                        value={editForm.model}
                        onChange={(event) =>
                          setEditForm((previous) => ({ ...previous, model: event.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      Year
                      <input
                        type="number"
                        min="1900"
                        max="2100"
                        value={editForm.year}
                        onChange={(event) =>
                          setEditForm((previous) => ({ ...previous, year: event.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      Type
                      <input
                        value={editForm.type}
                        onChange={(event) =>
                          setEditForm((previous) => ({ ...previous, type: event.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      Frame size
                      <input
                        value={editForm.frameSize}
                        onChange={(event) =>
                          setEditForm((previous) => ({ ...previous, frameSize: event.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      Frame material
                      <input
                        value={editForm.frameMaterial}
                        onChange={(event) =>
                          setEditForm((previous) => ({
                            ...previous,
                            frameMaterial: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      Drivetrain
                      <input
                        value={editForm.drivetrain}
                        onChange={(event) =>
                          setEditForm((previous) => ({ ...previous, drivetrain: event.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      Brake type
                      <input
                        value={editForm.brakeType}
                        onChange={(event) =>
                          setEditForm((previous) => ({ ...previous, brakeType: event.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      Wheelset
                      <input
                        value={editForm.wheelset}
                        onChange={(event) =>
                          setEditForm((previous) => ({ ...previous, wheelset: event.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      Tire setup
                      <input
                        value={editForm.tireSetup}
                        onChange={(event) =>
                          setEditForm((previous) => ({ ...previous, tireSetup: event.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                    <label className="sm:col-span-2 text-sm text-slate-700">
                      Notes
                      <textarea
                        value={editForm.notes}
                        onChange={(event) =>
                          setEditForm((previous) => ({ ...previous, notes: event.target.value }))
                        }
                        className="mt-1 h-20 w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                    <div className="sm:col-span-2 flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={isSavingEdit}
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSavingEdit ? "Saving..." : "Save bike"}
                      </button>
                      <button
                        type="button"
                        disabled={isSavingEdit}
                        onClick={() => {
                          setEditingBikeId(undefined);
                          setEditStatus({ type: "idle" });
                        }}
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}
              </article>
            ))
          )}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-900">Archived bikes</h3>
        <div className="mt-3 space-y-3">
          {archivedBikes.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              No archived bikes.
            </p>
          ) : (
            archivedBikes.map((bike) => (
              <article key={bike.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{bikeDisplayName(bike)}</p>
                    <p className="text-xs text-slate-600">Archived</p>
                  </div>
                  <button
                    type="button"
                    disabled={isUpdatingArchive === bike.id}
                    onClick={() => toggleArchived(bike, false)}
                    className="rounded-full border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUpdatingArchive === bike.id ? "Working..." : "Restore"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      {editStatus.type !== "idle" && editStatus.message ? (
        <p
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            editStatus.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {editStatus.message}
        </p>
      ) : null}
    </section>
  );
}

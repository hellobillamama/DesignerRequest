"use client";

import { useState } from "react";
import { MaterialRequest, Priority, ProcessType, ALL_PRIORITIES, ALL_PROCESS_TYPES, PROCESS_SLA, IN_PROCESS_TYPES, UNITS } from "@/lib/types";
import { createRequestLocal } from "@/lib/local-storage";
import { generateRequestId, calculateSLADate } from "@/lib/utils";
import { HiCamera, HiCheck, HiClock } from "react-icons/hi";

interface NewRequestProps {
  onSuccess: () => void;
}

export default function NewRequest({ onSuccess }: NewRequestProps) {
  const [form, setForm] = useState<{
    material_name: string;
    process_type: ProcessType;
    quantity: string;
    unit: string;
    priority: Priority;
    requested_by: string;
    department: string;
    remarks: string;
    image_url: string;
  }>({
    material_name: "",
    process_type: "Plating",
    quantity: "",
    unit: "pcs",
    priority: "Medium",
    requested_by: "",
    department: "",
    remarks: "",
    image_url: "",
  });
  const [imagePreview, setImagePreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setForm((f) => ({ ...f, image_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.material_name || !form.requested_by) return;

    setSubmitting(true);

    const now = new Date().toISOString();
    const expectedDate = calculateSLADate(form.process_type);

    const request: MaterialRequest = {
      request_id: generateRequestId(),
      request_date: now.split("T")[0],
      material_name: form.material_name,
      process_type: form.process_type,
      quantity: Number(form.quantity) || 0,
      unit: form.unit,
      image_url: form.image_url,
      requested_by: form.requested_by,
      department: form.department,
      approved_by: "",
      current_holder: form.requested_by,
      sent_to: "",
      expected_return_date: expectedDate,
      priority: form.priority,
      status: IN_PROCESS_TYPES.includes(form.process_type) ? "In Process" : "Ordered",
      remarks: form.remarks,
      created_at: now,
      updated_at: now,
    };

    await createRequestLocal(request);

    setSuccess(true);
    setTimeout(() => {
      onSuccess();
    }, 1000);
  };

  if (success) {
    return (
      <div className="px-4 pt-20 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <HiCheck size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Request Created!</h2>
        <p className="text-gray-500 text-sm mt-2">Redirecting to dashboard...</p>
      </div>
    );
  }

  const slaDays = PROCESS_SLA[form.process_type];

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Request</h1>
        <p className="text-sm text-gray-500 mt-1">Create material request</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Image
          </label>
          <label className="block">
            {imagePreview ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200">
                <img
                  src={imagePreview}
                  alt="Material"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Tap to change</span>
                </div>
              </div>
            ) : (
              <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 active:border-blue-400 active:text-blue-400 transition-colors">
                <HiCamera size={28} />
                <span className="text-sm">Tap to upload photo</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Material Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Material Name *
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Gold Wire 22K"
            value={form.material_name}
            onChange={(e) => setForm({ ...form, material_name: e.target.value })}
            required
          />
        </div>

        {/* Process Type with SLA indicator */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Process Type
          </label>
          <select
            className="input-field"
            value={form.process_type}
            onChange={(e) => setForm({ ...form, process_type: e.target.value as ProcessType })}
          >
            {ALL_PROCESS_TYPES.map((pt) => (
              <option key={pt} value={pt}>
                {pt} ({PROCESS_SLA[pt]} day{PROCESS_SLA[pt] > 1 ? 's' : ''} SLA)
              </option>
            ))}
          </select>
          {/* SLA Timer Display */}
          <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
            <HiClock size={16} className="text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">
              SLA: {slaDays} day{slaDays > 1 ? 's' : ''} — Due by {calculateSLADate(form.process_type)}
            </span>
          </div>
        </div>

        {/* Quantity + Unit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="0"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <select
              className="input-field"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <div className="grid grid-cols-4 gap-2">
            {ALL_PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setForm({ ...form, priority: p })}
                className={`py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  form.priority === p
                    ? p === "Urgent"
                      ? "bg-red-600 text-white"
                      : p === "High"
                      ? "bg-orange-500 text-white"
                      : p === "Medium"
                      ? "bg-yellow-500 text-white"
                      : "bg-gray-600 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Requested By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Requested By *
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="Your name"
            value={form.requested_by}
            onChange={(e) => setForm({ ...form, requested_by: e.target.value })}
            required
          />
        </div>

        {/* Department - Free text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Design, Store, QC, Production"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Remarks
          </label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Any additional notes..."
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !form.material_name || !form.requested_by}
          className="btn-primary w-full text-base py-4 mt-2"
        >
          {submitting ? "Creating..." : "Create Request"}
        </button>
      </form>
    </div>
  );
}

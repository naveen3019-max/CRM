import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MapPin,
  UploadCloud,
  Zap,
  Droplet,
  Wifi,
  Camera,
  Thermometer,
  Hammer,
  Paintbrush,
  Wrench,
  Settings,
  PlusCircle
} from "lucide-react";
import apiClient, { withAuth } from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";

const steps = ["Service", "Problem", "Budget", "Location", "Media", "Questions", "Review"];

const serviceCategories = [
  { label: "Electrical", value: "electrical", icon: <Zap className="h-6 w-6 text-yellow-500" /> },
  { label: "Plumbing", value: "plumbing", icon: <Droplet className="h-6 w-6 text-sky-500" /> },
  { label: "Internet Installation", value: "internet_installation", icon: <Wifi className="h-6 w-6 text-indigo-500" /> },
  { label: "CCTV Installation", value: "cctv_installation", icon: <Camera className="h-6 w-6 text-amber-600" /> },
  { label: "AC Service", value: "ac_service", icon: <Thermometer className="h-6 w-6 text-cyan-500" /> },
  { label: "Carpenter", value: "carpenter", icon: <Hammer className="h-6 w-6 text-amber-700" /> },
  { label: "Painting", value: "painting", icon: <Paintbrush className="h-6 w-6 text-pink-500" /> },
  { label: "Appliance Repair", value: "appliance_repair", icon: <Wrench className="h-6 w-6 text-rose-600" /> },
  { label: "General Service", value: "general_service", icon: <Settings className="h-6 w-6 text-slate-600" /> },
  { label: "Other", value: "other", icon: <PlusCircle className="h-6 w-6 text-slate-500" /> }
];

const dynamicQuestionMap = {
  electrical: [
    "Is this residential or commercial?",
    "Is power completely unavailable?",
    "Any burning smell or sparking?"
  ],
  plumbing: [
    "What is leakage severity?",
    "Is the issue indoor or outdoor?",
    "Is the pipe already damaged?"
  ],
  internet_installation: [
    "New connection or repair?",
    "Fiber or broadband?",
    "Router setup needed?"
  ]
};

function getQuestionsByCategory(category) {
  if (dynamicQuestionMap[category]) {
    return dynamicQuestionMap[category];
  }

  return [
    "Is this for home or business?",
    "How long has the issue existed?",
    "Any access constraints or safety notes?"
  ];
}

function getUrgencyBadge(urgency) {
  if (urgency === "urgent") return "🔴 Urgent";
  if (urgency === "important") return "🟠 Important";
  return "🟢 Normal";
}

export default function ServiceRequestPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [locationMeta, setLocationMeta] = useState(null);
  const [successRequest, setSuccessRequest] = useState(null);

  const [form, setForm] = useState({
    serviceCategory: "",
    otherCategory: "",
    problemDescription: "",
    expectedSolution: "",
    requirementDetails: "",
    budget: "",
    urgency: "normal",
    address: "",
    city: "",
    areaPincode: "",
    preferredDate: "",
    preferredTime: "",
    locationLat: "",
    locationLng: ""
  });

  const [dynamicAnswers, setDynamicAnswers] = useState({});
  const [attachments, setAttachments] = useState([]);

  const questions = useMemo(() => getQuestionsByCategory(form.serviceCategory), [form.serviceCategory]);

  const progress = ((step + 1) / steps.length) * 100;

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  }

  function validateCurrentStep() {
    if (step === 0 && !form.serviceCategory) {
      setError(t("serviceRequest.chooseCategory", "Please choose a service category."));
      return false;
    }

    if (step === 1) {
      if (!form.problemDescription.trim() || !form.expectedSolution.trim() || !form.requirementDetails.trim()) {
        setError(t("serviceRequest.completeProblemFields", "Please complete all problem detail fields."));
        return false;
      }
    }

    if (step === 3) {
      if (!form.address.trim() || !form.city.trim() || !form.areaPincode.trim()) {
        setError(t("serviceRequest.completeLocationFields", "Please complete location fields."));
        return false;
      }
    }

    return true;
  }

  function goNext() {
    if (!validateCurrentStep()) {
      return;
    }

    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  }

  function goBack() {
    setStep((prev) => Math.max(prev - 1, 0));
  }

  function handleFilesChange(event) {
    const nextFiles = Array.from(event.target.files || []);
    setAttachments(nextFiles.slice(0, 8));
  }

  function handleDynamicAnswerChange(index, value) {
    setDynamicAnswers((prev) => ({
      ...prev,
      [index]: value
    }));
  }

  async function captureLocation() {
    if (!navigator.geolocation) {
      setError(t("serviceRequest.locationUnavailable", "Location services are not available in this browser."));
      return;
    }

    setLocating(true);
    setError("");

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
      });

      const latitude = Number(position.coords.latitude).toFixed(6);
      const longitude = Number(position.coords.longitude).toFixed(6);
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;

      setForm((prev) => ({
        ...prev,
        locationLat: latitude,
        locationLng: longitude
      }));

      let reverseLabel = "";
      let reverseCity = "";
      let reversePincode = "";

      try {
        const reverseResponse = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&localityLanguage=en`
        );
        if (reverseResponse.ok) {
          const reverse = await reverseResponse.json();
          reverseCity = String(reverse?.city || reverse?.locality || reverse?.principalSubdivision || "").trim();
          reversePincode = String(reverse?.postcode || "").trim();
          reverseLabel = [
            reverse?.localityInfo?.administrative?.[4]?.name,
            reverse?.locality,
            reverse?.city,
            reverse?.principalSubdivision,
            reverse?.countryName
          ]
            .map((part) => String(part || "").trim())
            .filter(Boolean)
            .filter((part, index, array) => array.indexOf(part) === index)
            .join(", ");
        }
      } catch {
        // Reverse-geocoding is best-effort; coordinates remain available.
      }

      setForm((prev) => ({
        ...prev,
        address: prev.address?.trim() ? prev.address : reverseLabel || `${latitude}, ${longitude}`,
        city: prev.city?.trim() ? prev.city : reverseCity,
        areaPincode: prev.areaPincode?.trim() ? prev.areaPincode : reversePincode
      }));

      setLocationMeta({
        latitude,
        longitude,
        mapUrl,
        label: reverseLabel,
        accuracyMeters: Number(position.coords.accuracy || 0)
      });
    } catch {
      setError(t("serviceRequest.unableToAccessLocation", "Unable to access current location."));
    } finally {
      setLocating(false);
    }
  }

  async function submitRequest() {
    if (!validateCurrentStep()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== "" && value !== undefined && value !== null) {
          payload.append(key, value);
        }
      });
      if (form.serviceCategory === 'other' && form.otherCategory) {
        payload.append('otherCategory', form.otherCategory);
      }
      payload.append("dynamicAnswers", JSON.stringify(dynamicAnswers));
      attachments.forEach((file) => {
        payload.append("attachments", file);
      });

      const response = await apiClient.post("/service-requests", payload, {
        ...withAuth(token),
        headers: {
          ...(withAuth(token).headers || {}),
          "Content-Type": "multipart/form-data"
        }
      });

      const created = response.data?.data;
      setSuccessRequest(created);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t("serviceRequest.submitFailed", "Failed to submit service request."));
    } finally {
      setLoading(false);
    }
  }

  const selectedCategory = serviceCategories.find((entry) => entry.value === form.serviceCategory);

  if (successRequest) {
    return (
      <section className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-7 w-7 text-emerald-600" />
            <div>
              <h1 className="text-2xl font-bold text-emerald-900">{t("serviceRequest.submittedTitle")}</h1>
              <p className="mt-2 text-sm text-emerald-800">
                {t("serviceRequest.submittedSubtitle", { id: successRequest.id })}
              </p>
              <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4 text-sm text-slate-700">
                <p><span className="font-semibold">{t("serviceRequest.service")}</span> {selectedCategory?.label || successRequest.serviceCategory}</p>
                <p><span className="font-semibold">{t("serviceRequest.priority")}</span> {getUrgencyBadge(successRequest.urgency)}</p>
                <p><span className="font-semibold">{t("serviceRequest.status")}</span> {successRequest.status}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate("/customer/chat", { state: { scope: "admin_customer" } })}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {t("serviceRequest.openAdminChat")}
            </button>
            <button
              type="button"
              onClick={() => navigate("/customer")}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {t("serviceRequest.backToDashboard")}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="rounded-t-3xl bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50 p-5 sm:p-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t("serviceRequest.title")}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {t("serviceRequest.subtitle", { name: user?.name || t("roles.customer", "customer") })}
          </p>
          <div className="mt-4 h-2 w-full rounded-full bg-white/80">
            <div className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("serviceRequest.stepOf", { step: step + 1, total: steps.length })} {steps[step]}
          </p>
        </div>

        <div className="p-5 sm:p-6">
          {error ? (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : null}

          {step === 0 ? (
            <div>
              <h2 className="text-lg font-semibold text-slate-800">{t("serviceRequest.selectCategory")}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {serviceCategories.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => updateField("serviceCategory", category.value)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      form.serviceCategory === category.value
                        ? "border-cyan-500 bg-cyan-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-white/80 p-2">{category.icon}</div>
                      <div>
                        <p className="font-semibold text-slate-800">{category.label}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {form.serviceCategory === 'other' ? (
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-slate-700">{t("serviceRequest.pleaseSpecify")}</label>
                  <input
                    type="text"
                    value={form.otherCategory}
                    onChange={(e) => updateField('otherCategory', e.target.value)}
                    placeholder={t("serviceRequest.pleaseSpecifyPlaceholder")}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                {t("serviceRequest.problem")}
                <textarea
                  value={form.problemDescription}
                  onChange={(event) => updateField("problemDescription", event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                {t("serviceRequest.expectedSolution")}
                <textarea
                  value={form.expectedSolution}
                  onChange={(event) => updateField("expectedSolution", event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                {t("serviceRequest.requirementDetails")}
                <textarea
                  value={form.requirementDetails}
                  onChange={(event) => updateField("requirementDetails", event.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                {t("serviceRequest.budget")}
                <input
                  type="text"
                  value={form.budget}
                  onChange={(event) => updateField("budget", event.target.value)}
                  placeholder="e.g. 4000-6000"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                {t("serviceRequest.urgency")}
                <select
                  value={form.urgency}
                  onChange={(event) => updateField("urgency", event.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3"
                >
                  <option value="normal">🟢 Normal</option>
                  <option value="important">🟠 Important</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
              </label>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                {t("serviceRequest.address")}
                <textarea
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  {t("serviceRequest.city")}
                  <input
                    type="text"
                    value={form.city}
                    onChange={(event) => updateField("city", event.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  {t("serviceRequest.areaPincode")}
                  <input
                    type="text"
                    value={form.areaPincode}
                    onChange={(event) => updateField("areaPincode", event.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  {t("serviceRequest.preferredDate")}
                  <input
                    type="date"
                    value={form.preferredDate}
                    onChange={(event) => updateField("preferredDate", event.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  {t("serviceRequest.preferredTime")}
                  <input
                    type="time"
                    value={form.preferredTime}
                    onChange={(event) => updateField("preferredTime", event.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={captureLocation}
                disabled={locating}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                <MapPin className="h-4 w-4" />
                {locating ? "Capturing location..." : t("serviceRequest.shareLocation")}
              </button>
              {(form.locationLat && form.locationLng) ? (
                <div className="space-y-1 text-xs text-slate-500">
                  <p>Location captured: {form.locationLat}, {form.locationLng}</p>
                  {locationMeta?.label ? <p>{locationMeta.label}</p> : null}
                  <div className="flex items-center gap-3">
                    {locationMeta?.accuracyMeters ? <span>Accuracy approx: {Math.round(locationMeta.accuracyMeters)}m</span> : null}
                    {locationMeta?.mapUrl ? (
                      <a
                        href={locationMeta.mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        Open in Maps
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <label className="block rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <UploadCloud className="mx-auto h-6 w-6 text-slate-500" />
                <p className="mt-2 text-sm font-semibold text-slate-700">{t("serviceRequest.uploadMedia")}</p>
                <p className="mt-1 text-xs text-slate-500">{t("serviceRequest.uploadHint")}</p>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={handleFilesChange}
                  className="mt-3 block w-full text-xs"
                />
              </label>
              {attachments.length ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                  {attachments.map((file) => (
                    <p key={`${file.name}-${file.size}`}>• {file.name}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-3">
              {questions.map((question, index) => (
                <label key={question} className="block text-sm font-semibold text-slate-700">
                  {question}
                  <textarea
                    value={dynamicAnswers[index] || ""}
                    onChange={(event) => handleDynamicAnswerChange(index, event.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>
              ))}
            </div>
          ) : null}

          {step === 6 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p><span className="font-semibold">{t("serviceRequest.service")}</span> {selectedCategory?.label || "-"}</p>
              <p><span className="font-semibold">{t("serviceRequest.priority")}</span> {getUrgencyBadge(form.urgency)}</p>
              <p><span className="font-semibold">{t("serviceRequest.budget")}</span> {form.budget || t("serviceRequest.notSpecified", "Not specified")}</p>
              <p><span className="font-semibold">{t("serviceRequest.schedule", "Schedule")}</span> {[form.preferredDate, form.preferredTime].filter(Boolean).join(" ") || t("serviceRequest.flexible", "Flexible")}</p>
              <p><span className="font-semibold">{t("serviceRequest.location")}</span> {form.city} ({form.areaPincode})</p>
              <p><span className="font-semibold">{t("serviceRequest.attachments", "Attachments")}</span> {attachments.length}</p>
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={step === 0 ? () => navigate("/customer") : goBack}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? t("serviceRequest.back") : t("serviceRequest.previous")}
          </button>

          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              {t("serviceRequest.continue")}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submitRequest}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? t("serviceRequest.submitting") : t("serviceRequest.submit")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

import React, { useState } from "react";
import { AlertCircle, CheckCircle, Send } from "lucide-react";
import apiClient, { withAuth } from "../services/apiClient";

const RequestSubmissionForm = ({ onSuccess, token }) => {
  const [formData, setFormData] = useState({
    title: "",
    peopleInvolved: "",
    problemDescription: "",
    solution: "",
    requirements: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validation
      if (!formData.title.trim()) {
        throw new Error("Request title is required");
      }
      if (!formData.problemDescription.trim()) {
        throw new Error("Problem description is required");
      }
      if (!formData.solution.trim()) {
        throw new Error("Solution/proposal is required");
      }
      if (!formData.requirements.trim()) {
        throw new Error("Requirements are required");
      }

      const response = await apiClient.post(
        "/leads",
        {
          title: formData.title,
          source: "customer_request",
          peopleInvolved: formData.peopleInvolved,
          problemDescription: formData.problemDescription,
          solution: formData.solution,
          requirements: formData.requirements
        },
        token ? withAuth(token) : undefined
      );

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Failed to submit request");
      }

      setSuccess(true);
      setFormData({
        title: "",
        peopleInvolved: "",
        problemDescription: "",
        solution: "",
        requirements: ""
      });

      // Call callback to notify parent
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      peopleInvolved: "",
      problemDescription: "",
      solution: "",
      requirements: ""
    });
    setError(null);
    setSuccess(false);
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-green-900">Request Submitted!</h3>
        </div>
        <p className="text-green-700 mb-4">
          Your request has been successfully submitted. The admin team will review it shortly and contact you.
        </p>
        <button
          onClick={resetForm}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit a Service Request</h2>
        <p className="text-gray-600">
          Please provide details about what you need help with. The admin team will review your request and reach out to you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900">Error</h4>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Title Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Request Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Brief title of your request"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">Maximum 120 characters</p>
        </div>

        {/* People Involved */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Who is involved/affected? <span className="text-gray-400">(Optional)</span>
          </label>
          <input
            type="text"
            name="peopleInvolved"
            value={formData.peopleInvolved}
            onChange={handleInputChange}
            placeholder="List names or roles of people involved (e.g., John Doe, Team Lead, etc.)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">Maximum 500 characters</p>
        </div>

        {/* Problem Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What is the problem? <span className="text-red-500">*</span>
          </label>
          <textarea
            name="problemDescription"
            value={formData.problemDescription}
            onChange={handleInputChange}
            placeholder="Describe the issue or problem in detail..."
            rows="4"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">Maximum 5000 characters</p>
        </div>

        {/* Solution */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How can we solve it? <span className="text-red-500">*</span>
          </label>
          <textarea
            name="solution"
            value={formData.solution}
            onChange={handleInputChange}
            placeholder="Provide your proposal or suggested solution..."
            rows="4"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">Maximum 5000 characters</p>
        </div>

        {/* Requirements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What are the requirements? <span className="text-red-500">*</span>
          </label>
          <textarea
            name="requirements"
            value={formData.requirements}
            onChange={handleInputChange}
            placeholder="List all requirements needed to fulfill this request (budget, timeline, resources, etc.)"
            rows="4"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">Maximum 5000 characters</p>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Request
              </>
            )}
          </button>
          <button
            type="button"
            onClick={resetForm}
            disabled={loading}
            className="bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          💡 <strong>Tip:</strong> Provide as much detail as possible so the admin team can better understand and address your request.
        </p>
      </div>
    </div>
  );
};

export default RequestSubmissionForm;

import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, CheckCircle, Clock, Loader, AlertCircle } from "lucide-react";
import apiClient from "../services/apiClient";

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [email, setEmail] = useState(location.state?.email || "");
  const [userId, setUserId] = useState(location.state?.userId || "");
  const [verificationToken, setVerificationToken] = useState(location.state?.token || searchParams.get("token") || "");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(!verificationToken);

  // Auto-verify if we have the token from signup
  useEffect(() => {
    if (verificationToken && !isVerified && !showManualEntry) {
      verifyEmail(verificationToken);
    }
  }, [verificationToken, isVerified, showManualEntry]);

  const verifyEmail = async (token = verificationToken) => {
    if (!token) {
      setError("No verification token provided");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const res = await apiClient.post("/auth/verify", {
        token: token
      });

      setIsVerified(true);
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate("/", { replace: true, state: { email: email, verified: true } });
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
            <CheckCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-[#111827] mb-2">Email Verified!</h1>
          <p className="text-[#64748B] mb-6">Your email has been successfully verified. Redirecting to login...</p>
          <Loader className="animate-spin mx-auto text-[#2563EB]" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#2563EB]/10 text-[#2563EB] mb-4">
            <Mail size={24} />
          </div>
          <h1 className="text-2xl font-bold text-[#111827]">Verify Your Email</h1>
          <p className="text-[#64748B] mt-2">
            {email ? `Verification link sent to ${email}` : "Enter your verification token"}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <Clock className="text-[#2563EB] flex-shrink-0" size={20} />
            <div>
              <p className="text-sm font-medium text-[#111827]">Verification link expires in 24 hours</p>
              <p className="text-xs text-[#64748B] mt-1">Check your email and click the verification link or use the code below to verify your account.</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100 mb-4 flex gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {resendStatus && (
          <div className="p-3 rounded-xl bg-green-50 text-green-600 text-sm border border-green-100 mb-4">
            {resendStatus}
          </div>
        )}

        <button
          onClick={() => verifyEmail()}
          disabled={isVerifying || !verificationToken}
          className="w-full bg-[#2563EB] text-white py-3 rounded-xl font-semibold hover:bg-[#1D4ED8] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-[#2563EB]/20 mb-4"
        >
          {isVerifying ? "Verifying..." : "Verify Email"}
        </button>

        {verificationToken && (
          <div className="mb-4 p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-[#64748B] mb-2">Your verification token:</p>
            <code className="text-xs bg-white p-2 rounded border border-[#E5E7EB] block break-all text-center font-mono">
              {verificationToken.substring(0, 20)}...
            </code>
          </div>
        )}

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E5E7EB]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-[#64748B]">or</span>
          </div>
        </div>

        <p className="text-center text-sm text-[#64748B]">
          Didn't receive the email?{" "}
          <button
            onClick={() => setResendStatus("Resend functionality coming soon")}
            className="text-[#2563EB] font-semibold hover:underline"
          >
            Resend Verification
          </button>
        </p>
      </div>
    </div>
  );
}


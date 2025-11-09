"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CVTemplate {
  name: string;
  title: string;
  description: string;
  preview_url: string;
}

interface TemplatesResponse {
  templates: CVTemplate[];
  price: number;
  currency: string;
  features: string[];
}

interface CVPurchase {
  purchase_id: number;
  applicant_id: number;
  amount: number;
  payment_method: string;
  payment_status: string;
  paid_at?: string;
  created_at: string;
}

export default function CVTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplatesResponse | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [purchaseId, setPurchaseId] = useState<number | null>(null);
  const [applicantId, setApplicantId] = useState<number>(1); // TODO: Get from auth
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [generatedCVs, setGeneratedCVs] = useState<any[]>([]);

  useEffect(() => {
    fetchTemplates();
    checkPurchaseStatus();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/cv-generator/templates");
      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
      setError("Failed to load CV templates");
    }
  };

  const checkPurchaseStatus = async () => {
    // Check if user has already purchased CV service
    // This would check the database for completed purchases
    // For now, we'll just check localStorage as a demo
    const purchased = localStorage.getItem(`cv_purchased_${applicantId}`);
    if (purchased) {
      setHasPurchased(true);
      setPurchaseId(parseInt(purchased));
      fetchMyCVs();
    }
  };

  const fetchMyCVs = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/cv-generator/my-cvs/${applicantId}`);
      const data = await response.json();
      setGeneratedCVs(data);
    } catch (err) {
      console.error("Failed to fetch CVs:", err);
    }
  };

  const handlePreview = (template: CVTemplate) => {
    window.open(`http://localhost:8000${template.preview_url}`, "_blank");
  };

  const handlePurchase = () => {
    setShowPaymentModal(true);
  };

  const confirmPurchase = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Create purchase record
      const purchaseResponse = await fetch("http://localhost:8000/api/v1/cv-generator/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_id: applicantId,
          payment_method: paymentMethod,
          payment_reference: `REF-${Date.now()}`,
        }),
      });

      if (!purchaseResponse.ok) {
        const errorData = await purchaseResponse.json();
        throw new Error(errorData.detail || "Purchase failed");
      }

      const purchase: CVPurchase = await purchaseResponse.json();

      // Step 2: Initiate payment with gateway
      const paymentResponse = await fetch("http://localhost:8000/api/v1/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_id: applicantId,
          purchase_id: purchase.purchase_id,
          gateway: paymentMethod === "card" ? "stripe" : "payfast", // Use Stripe for cards, PayFast for others
        }),
      });

      if (!paymentResponse.ok) {
        throw new Error("Payment initiation failed");
      }

      const paymentData = await paymentResponse.json();

      // Step 3: Handle payment based on gateway
      if (paymentData.gateway === "payfast") {
        // Redirect to PayFast payment page
        const form = document.createElement("form");
        form.method = "POST";
        form.action = paymentData.payment_url;

        // Add all payment data as hidden fields
        Object.entries(paymentData.payment_data).forEach(([key, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();

      } else if (paymentData.gateway === "stripe") {
        // For Stripe, you would typically use Stripe.js here
        // This requires adding Stripe Elements to your page
        // For now, show a placeholder message
        alert("Stripe integration requires Stripe.js. Proceeding with demo confirmation.");

        // Demo: Auto-confirm payment (remove in production)
        const confirmResponse = await fetch(
          `http://localhost:8000/api/v1/cv-generator/purchase/${purchase.purchase_id}/confirm`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (confirmResponse.ok) {
          localStorage.setItem(`cv_purchased_${applicantId}`, purchase.purchase_id.toString());
          setHasPurchased(true);
          setPurchaseId(purchase.purchase_id);
          setShowPaymentModal(false);
          alert("✅ Purchase successful! You can now generate unlimited CVs.");
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCV = async (templateName: string) => {
    if (!purchaseId) {
      alert("Please purchase CV service first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:8000/api/v1/cv-generator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_id: applicantId,
          purchase_id: purchaseId,
          template_name: templateName,
          format: "pdf",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "CV generation failed");
      }

      const generatedCV = await response.json();
      alert(`✅ CV generated successfully! Download it from "My CVs" section.`);
      fetchMyCVs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCV = (cvId: number, templateName: string) => {
    window.open(`http://localhost:8000/api/v1/cv-generator/download/${cvId}`, "_blank");
  };

  if (!templates) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Professional CV Generator</h1>
          <p className="text-xl text-blue-200 mb-6">
            Generate professional PSIRA-focused CVs for just R{templates.price}
          </p>
          {!hasPurchased && (
            <button
              onClick={handlePurchase}
              className="bg-gradient-to-r from-green-400 to-green-600 text-white px-8 py-4 rounded-lg font-bold text-xl hover:from-green-500 hover:to-green-700 transition-all shadow-2xl"
            >
              Purchase CV Service - R{templates.price} Once-off
            </button>
          )}
          {hasPurchased && (
            <div className="inline-block bg-green-500/20 border-2 border-green-400 rounded-lg px-6 py-3">
              <div className="flex items-center gap-2 text-green-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-bold">CV Service Activated - Generate Unlimited CVs!</span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border-2 border-red-400 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
            <p className="text-red-300 text-center">{error}</p>
          </div>
        )}

        {/* Features */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-12 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">What You Get</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-blue-200">
                <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CV Templates */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {templates.templates.map((template) => (
            <div
              key={template.name}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-blue-400 transition-all"
            >
              <div className="bg-white rounded-lg h-64 mb-4 flex items-center justify-center overflow-hidden shadow-xl">
                <div className="text-gray-400 text-sm">Preview Available</div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{template.title}</h3>
              <p className="text-blue-200 mb-4 text-sm">{template.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview(template)}
                  className="flex-1 bg-blue-500/20 border border-blue-400 text-blue-200 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-all"
                >
                  Preview
                </button>
                {hasPurchased && (
                  <button
                    onClick={() => handleGenerateCV(template.name)}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50"
                  >
                    {loading ? "Generating..." : "Generate"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* My Generated CVs */}
        {hasPurchased && generatedCVs.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-6">My Generated CVs</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedCVs.map((cv) => (
                <div
                  key={cv.cv_id}
                  className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-blue-400 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-white capitalize">{cv.template_name}</h3>
                    <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-1 rounded">
                      {cv.format.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">
                    Generated: {new Date(cv.generated_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">Downloads: {cv.download_count}</p>
                  <button
                    onClick={() => handleDownloadCV(cv.cv_id, cv.template_name)}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
                  >
                    Download PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 max-w-md w-full border border-white/20">
              <h2 className="text-3xl font-bold text-white mb-6">Complete Purchase</h2>

              <div className="bg-blue-500/10 border border-blue-400 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-blue-200">CV Generation Service</span>
                  <span className="text-2xl font-bold text-white">R{templates.price}</span>
                </div>
                <p className="text-sm text-gray-400">One-time payment, unlimited use</p>
              </div>

              <div className="mb-6">
                <label className="block text-white mb-2 font-semibold">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white"
                >
                  <option value="card">Credit/Debit Card</option>
                  <option value="eft">EFT/Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="voucher">Voucher</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPurchase}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

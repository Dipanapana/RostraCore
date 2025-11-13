"use client";

import { useState, useEffect } from "react";

interface PricingSummary {
  cv_generation: {
    price: number;
    currency: string;
    description: string;
  };
  marketplace_commission: {
    amount: number;
    currency: string;
    deduction_method: string;
    installments: number;
    description: string;
    per_installment: number;
  };
  premium_jobs: {
    bronze: { price: number; duration_days: number; boost_multiplier: number; priority_rank: number };
    silver: { price: number; duration_days: number; boost_multiplier: number; priority_rank: number };
    gold: { price: number; duration_days: number; boost_multiplier: number; priority_rank: number };
  };
  bulk_packages: {
    starter: { hires: number; price: number; price_per_hire: number; discount_percent: number };
    professional: { hires: number; price: number; price_per_hire: number; discount_percent: number };
    enterprise: { hires: number; price: number; price: number; price_per_hire: number; discount_percent: number };
  };
}

export default function MarketplacePricingPage() {
  const [pricing, setPricing] = useState<PricingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/v1/marketplace/settings/pricing-summary");
      if (!response.ok) throw new Error("Failed to fetch pricing");
      const data = await response.json();
      setPricing(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (section: string, data: any) => {
    setEditingSection(section);
    setFormData(data);
  };

  const handleSave = async (section: string, endpoint: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/marketplace/settings/${endpoint}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to update pricing");

      alert("✅ Pricing updated successfully!");
      setEditingSection(null);
      fetchPricing();
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading pricing data...</div>
      </div>
    );
  }

  if (error || !pricing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-red-400 text-xl">Error: {error || "No data"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Marketplace Pricing Configuration</h1>
          <p className="text-gray-400">Superadmin dashboard - Manage all marketplace pricing</p>
        </div>

        {/* CV Generation Pricing */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">CV Generation Service</h2>
              <p className="text-gray-400">{pricing.cv_generation.description}</p>
            </div>
            <button
              onClick={() => handleEdit('cv', { amount: pricing.cv_generation.price, currency: 'ZAR' })}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Edit
            </button>
          </div>

          {editingSection === 'cv' ? (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="mb-4">
                <label className="block text-white mb-2">Price (ZAR)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave('cv', 'cv-pricing')}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingSection(null)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center bg-green-500/20 border border-green-400 rounded-lg p-6">
              <div className="text-5xl font-bold text-green-400">R{pricing.cv_generation.price}</div>
              <div className="text-gray-300 mt-2">One-time payment, unlimited CV generation</div>
            </div>
          )}
        </div>

        {/* Marketplace Commission */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Marketplace Commission</h2>
              <p className="text-gray-400">{pricing.marketplace_commission.description}</p>
            </div>
            <button
              onClick={() => handleEdit('commission', {
                amount: pricing.marketplace_commission.amount,
                currency: 'ZAR',
                deduction_method: pricing.marketplace_commission.deduction_method,
                installments: pricing.marketplace_commission.installments
              })}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Edit
            </button>
          </div>

          {editingSection === 'commission' ? (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-white mb-2">Amount (ZAR)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">Deduction Method</label>
                  <select
                    value={formData.deduction_method}
                    onChange={(e) => setFormData({ ...formData, deduction_method: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                  >
                    <option value="full">Full (1st payroll)</option>
                    <option value="split">Split over installments</option>
                  </select>
                </div>
              </div>
              {formData.deduction_method === 'split' && (
                <div className="mb-4">
                  <label className="block text-white mb-2">Number of Installments</label>
                  <input
                    type="number"
                    value={formData.installments}
                    onChange={(e) => setFormData({ ...formData, installments: parseInt(e.target.value) })}
                    min="1"
                    max="12"
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                  />
                  <p className="text-gray-400 text-sm mt-1">
                    Per installment: R{(formData.amount / formData.installments).toFixed(2)}
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave('commission', 'commission-settings')}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingSection(null)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-orange-500/20 border border-orange-400 rounded-lg p-4 text-center">
                <div className="text-4xl font-bold text-orange-400">R{pricing.marketplace_commission.amount}</div>
                <div className="text-gray-300 mt-2">Total commission</div>
              </div>
              <div className="bg-purple-500/20 border border-purple-400 rounded-lg p-4 text-center">
                <div className="text-4xl font-bold text-purple-400">
                  R{pricing.marketplace_commission.per_installment.toFixed(2)}
                </div>
                <div className="text-gray-300 mt-2">
                  Per payment ({pricing.marketplace_commission.deduction_method === 'full' ? '1 payment' : `${pricing.marketplace_commission.installments} payments`})
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Premium Job Tiers */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">Premium Job Tiers</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {(['bronze', 'silver', 'gold'] as const).map((tier) => (
              <div key={tier} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white capitalize">{tier}</h3>
                  <button
                    onClick={() => handleEdit(`premium_${tier}`, pricing.premium_jobs[tier])}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                  >
                    Edit
                  </button>
                </div>
                <div className="space-y-2 text-gray-300">
                  <div className="flex justify-between">
                    <span>Price:</span>
                    <span className="font-bold text-white">R{pricing.premium_jobs[tier].price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{pricing.premium_jobs[tier].duration_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Boost:</span>
                    <span>{pricing.premium_jobs[tier].boost_multiplier}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Priority:</span>
                    <span>Rank {pricing.premium_jobs[tier].priority_rank}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bulk Packages */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">Bulk Hiring Packages (Company Sponsors Guard Fees)</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {(['starter', 'professional', 'enterprise'] as const).map((pkg) => (
              <div key={pkg} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white capitalize">{pkg}</h3>
                  <button
                    onClick={() => handleEdit(`bulk_${pkg}`, pricing.bulk_packages[pkg])}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                  >
                    Edit
                  </button>
                </div>
                <div className="space-y-2 text-gray-300">
                  <div className="flex justify-between">
                    <span>Hires:</span>
                    <span className="font-bold text-white">{pricing.bulk_packages[pkg].hires}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price:</span>
                    <span className="font-bold text-green-400">R{pricing.bulk_packages[pkg].price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Per hire:</span>
                    <span>R{pricing.bulk_packages[pkg].price_per_hire}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span className="text-green-400">{pricing.bulk_packages[pkg].discount_percent}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

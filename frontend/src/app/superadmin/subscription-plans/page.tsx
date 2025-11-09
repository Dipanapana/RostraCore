"use client";

import { useState, useEffect } from "react";

interface SubscriptionPlan {
  plan_id: number;
  plan_name: string;
  display_name: string;
  description: string;
  monthly_price: number;
  annual_price: number;
  currency: string;
  max_employees: number | null;
  max_sites: number | null;
  max_clients: number | null;
  max_supervisors: number | null;
  features: { [key: string]: boolean };
  is_active: boolean;
  sort_order: number;
  annual_savings: number;
  annual_discount_percent: number;
  organization_count: number;
}

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    plan_name: "",
    display_name: "",
    description: "",
    monthly_price: 0,
    annual_price: 0,
    max_employees: null as number | null,
    max_sites: null as number | null,
    max_clients: null as number | null,
    max_supervisors: null as number | null,
    features: {} as { [key: string]: boolean },
  });

  const availableFeatures = [
    { key: "marketplace_access", label: "Marketplace Access" },
    { key: "advanced_analytics", label: "Advanced Analytics" },
    { key: "api_access", label: "API Access" },
    { key: "bulk_rostering", label: "Bulk Rostering" },
    { key: "priority_support", label: "Priority Support" },
    { key: "custom_branding", label: "Custom Branding" },
    { key: "multi_location", label: "Multi-Location Support" },
  ];

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/subscription-plans/plans", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("superadmin_token")}`,
        },
      });
      const data = await response.json();
      setPlans(data);
    } catch (error) {
      console.error("Error fetching plans:", error);
      alert("❌ Failed to fetch subscription plans");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/subscription-plans/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("superadmin_token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create plan");
      }

      alert("✅ Subscription plan created successfully!");
      setIsCreating(false);
      resetForm();
      fetchPlans();
    } catch (error: any) {
      console.error("Error creating plan:", error);
      alert(`❌ ${error.message}`);
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/subscription-plans/plans/${editingPlan.plan_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("superadmin_token")}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to update plan");
      }

      alert("✅ Subscription plan updated successfully!");
      setEditingPlan(null);
      resetForm();
      fetchPlans();
    } catch (error: any) {
      console.error("Error updating plan:", error);
      alert(`❌ ${error.message}`);
    }
  };

  const handleToggleActive = async (planId: number) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/subscription-plans/plans/${planId}/toggle-active`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("superadmin_token")}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to toggle plan status");

      alert("✅ Plan status updated!");
      fetchPlans();
    } catch (error) {
      console.error("Error toggling plan:", error);
      alert("❌ Failed to update plan status");
    }
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      plan_name: plan.plan_name,
      display_name: plan.display_name,
      description: plan.description,
      monthly_price: plan.monthly_price,
      annual_price: plan.annual_price,
      max_employees: plan.max_employees,
      max_sites: plan.max_sites,
      max_clients: plan.max_clients,
      max_supervisors: plan.max_supervisors,
      features: plan.features,
    });
  };

  const resetForm = () => {
    setFormData({
      plan_name: "",
      display_name: "",
      description: "",
      monthly_price: 0,
      annual_price: 0,
      max_employees: null,
      max_sites: null,
      max_clients: null,
      max_supervisors: null,
      features: {},
    });
  };

  const handleFeatureToggle = (featureKey: string) => {
    setFormData({
      ...formData,
      features: {
        ...formData.features,
        [featureKey]: !formData.features[featureKey],
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
        <div className="text-white text-center">Loading subscription plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Subscription Plans</h1>
            <p className="text-gray-400">Manage organization SaaS pricing tiers</p>
          </div>
          <button
            onClick={() => {
              setIsCreating(true);
              resetForm();
            }}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all"
          >
            + Create New Plan
          </button>
        </div>

        {/* Create/Edit Form */}
        {(isCreating || editingPlan) && (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 mb-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">
              {isCreating ? "Create New Plan" : `Edit: ${editingPlan?.display_name}`}
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div>
                <label className="block text-gray-300 mb-2 font-semibold">Plan Name (Internal)</label>
                <input
                  type="text"
                  value={formData.plan_name}
                  onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                  disabled={!!editingPlan}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                  placeholder="starter, professional, enterprise"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 font-semibold">Display Name</label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="Starter Plan"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-2 font-semibold">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  rows={3}
                  placeholder="Perfect for small security companies..."
                />
              </div>

              {/* Pricing */}
              <div>
                <label className="block text-gray-300 mb-2 font-semibold">Monthly Price (ZAR)</label>
                <input
                  type="number"
                  value={formData.monthly_price}
                  onChange={(e) => setFormData({ ...formData, monthly_price: parseFloat(e.target.value) })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="499.00"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 font-semibold">Annual Price (ZAR)</label>
                <input
                  type="number"
                  value={formData.annual_price}
                  onChange={(e) => setFormData({ ...formData, annual_price: parseFloat(e.target.value) })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="4990.00"
                  step="0.01"
                />
              </div>

              {/* Limits (NULL = Unlimited) */}
              <div>
                <label className="block text-gray-300 mb-2 font-semibold">Max Employees (NULL = Unlimited)</label>
                <input
                  type="number"
                  value={formData.max_employees || ""}
                  onChange={(e) => setFormData({ ...formData, max_employees: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 font-semibold">Max Sites (NULL = Unlimited)</label>
                <input
                  type="number"
                  value={formData.max_sites || ""}
                  onChange={(e) => setFormData({ ...formData, max_sites: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 font-semibold">Max Clients (NULL = Unlimited)</label>
                <input
                  type="number"
                  value={formData.max_clients || ""}
                  onChange={(e) => setFormData({ ...formData, max_clients: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 font-semibold">Max Supervisors (NULL = Unlimited)</label>
                <input
                  type="number"
                  value={formData.max_supervisors || ""}
                  onChange={(e) => setFormData({ ...formData, max_supervisors: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              {/* Features */}
              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-4 font-semibold">Features</label>
                <div className="grid md:grid-cols-3 gap-4">
                  {availableFeatures.map((feature) => (
                    <label key={feature.key} className="flex items-center space-x-3 text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.features[feature.key] || false}
                        onChange={() => handleFeatureToggle(feature.key)}
                        className="w-5 h-5 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <span>{feature.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 mt-8">
              <button
                onClick={isCreating ? handleCreatePlan : handleUpdatePlan}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all"
              >
                {isCreating ? "Create Plan" : "Update Plan"}
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingPlan(null);
                  resetForm();
                }}
                className="bg-gray-700 text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Plans List */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.plan_id}
              className={`bg-gradient-to-br ${
                plan.is_active ? "from-gray-800 to-gray-900" : "from-gray-900 to-black opacity-60"
              } rounded-2xl p-6 border ${plan.is_active ? "border-gray-700" : "border-gray-800"}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-white">{plan.display_name}</h3>
                  <p className="text-gray-400 text-sm mt-1">{plan.plan_name}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    plan.is_active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {plan.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

              {/* Pricing */}
              <div className="mb-6">
                <div className="flex items-baseline space-x-2 mb-2">
                  <span className="text-4xl font-bold text-white">R{plan.monthly_price.toFixed(2)}</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <div className="text-sm text-gray-400">
                  Annual: R{plan.annual_price.toFixed(2)} ({plan.annual_discount_percent.toFixed(0)}% savings)
                </div>
              </div>

              {/* Limits */}
              <div className="space-y-2 mb-6 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>Employees:</span>
                  <span className="font-semibold">{plan.max_employees || "Unlimited"}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Sites:</span>
                  <span className="font-semibold">{plan.max_sites || "Unlimited"}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Clients:</span>
                  <span className="font-semibold">{plan.max_clients || "Unlimited"}</span>
                </div>
              </div>

              {/* Features */}
              <div className="mb-6">
                <div className="text-gray-400 text-xs font-semibold mb-2">FEATURES</div>
                <div className="space-y-1">
                  {Object.entries(plan.features).filter(([_, enabled]) => enabled).map(([key]) => (
                    <div key={key} className="text-sm text-gray-300">
                      ✓ {availableFeatures.find((f) => f.key === key)?.label || key}
                    </div>
                  ))}
                </div>
              </div>

              {/* Organization Count */}
              <div className="text-sm text-gray-400 mb-6">
                <strong>{plan.organization_count}</strong> organization{plan.organization_count !== 1 ? "s" : ""} using this plan
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(plan)}
                  className="flex-1 bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg font-semibold hover:bg-blue-500/30 transition-all"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleToggleActive(plan.plan_id)}
                  className={`flex-1 ${
                    plan.is_active
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  } px-4 py-2 rounded-lg font-semibold transition-all`}
                >
                  {plan.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

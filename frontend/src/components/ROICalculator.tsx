"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ROICalculator() {
  const [guards, setGuards] = useState(50);
  const [hoursPerWeek, setHoursPerWeek] = useState(8);
  const [hourlyRate, setHourlyRate] = useState(500);
  const [monthlyPayroll, setMonthlyPayroll] = useState(250000);

  const [results, setResults] = useState({
    timeSavedPerMonth: 0,
    timeSavedPerYear: 0,
    costSavings: 0,
    overtimeSavings: 0,
    complianceSavings: 0,
    totalSavings: 0,
    roi: 0,
    recommendedPlan: 'PROFESSIONAL'
  });

  useEffect(() => {
    // Calculate time savings
    const timeSavedPerMonth = hoursPerWeek * 4; // hours per month
    const timeSavedPerYear = timeSavedPerMonth * 12;
    const timeSavingsValue = timeSavedPerYear * hourlyRate;

    // Calculate cost savings (conservative estimates)
    const overtimeSavings = Math.round(monthlyPayroll * 0.05); // 5% reduction in overtime costs
    const efficiencySavings = Math.round(monthlyPayroll * 0.03); // 3% efficiency gains
    const complianceSavings = 4166; // R50K annual fine risk / 12 months

    const totalMonthlySavings = overtimeSavings + efficiencySavings + complianceSavings;
    const totalYearlySavings = totalMonthlySavings * 12;

    // Determine recommended plan based on guard count
    let recommendedPlan = 'STARTER';
    let planCost = 499;
    if (guards > 100) {
      recommendedPlan = 'BUSINESS';
      planCost = 2999;
    } else if (guards > 30) {
      recommendedPlan = 'PROFESSIONAL';
      planCost = 1299;
    }

    // Calculate ROI
    const roi = Math.round((totalMonthlySavings / planCost) * 100);

    setResults({
      timeSavedPerMonth,
      timeSavedPerYear,
      costSavings: totalMonthlySavings,
      overtimeSavings,
      complianceSavings,
      totalSavings: totalYearlySavings,
      roi,
      recommendedPlan
    });
  }, [guards, hoursPerWeek, hourlyRate, monthlyPayroll]);

  return (
    <div className="relative z-10 px-6 py-20 border-t border-white/10">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Calculate Your Savings in 30 Seconds
          </h2>
          <p className="text-xl text-white/70">
            See exactly how much time and money RostraCore will save your business
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* INPUT FORM */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6">Your Business</h3>

            <div className="space-y-6">
              {/* Guards Count */}
              <div>
                <label className="block text-white/80 font-medium mb-2">
                  How many guards do you manage?
                </label>
                <input
                  type="number"
                  value={guards}
                  onChange={(e) => setGuards(Number(e.target.value))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="1000"
                />
                <div className="mt-2">
                  <input
                    type="range"
                    value={guards}
                    onChange={(e) => setGuards(Number(e.target.value))}
                    min="1"
                    max="500"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Hours Per Week */}
              <div>
                <label className="block text-white/80 font-medium mb-2">
                  How long does scheduling take per week?
                </label>
                <input
                  type="number"
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="40"
                />
                <p className="text-white/50 text-sm mt-1">{hoursPerWeek} hours per week</p>
              </div>

              {/* Hourly Rate */}
              <div>
                <label className="block text-white/80 font-medium mb-2">
                  What's your hourly rate? (Your time or scheduler's)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-white/60">R</span>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg pl-8 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="100"
                    max="2000"
                    step="50"
                  />
                </div>
              </div>

              {/* Monthly Payroll */}
              <div>
                <label className="block text-white/80 font-medium mb-2">
                  Current monthly payroll costs? (Approx.)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-white/60">R</span>
                  <input
                    type="number"
                    value={monthlyPayroll}
                    onChange={(e) => setMonthlyPayroll(Number(e.target.value))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg pl-8 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="10000"
                    max="10000000"
                    step="10000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RESULTS */}
          <div className="backdrop-blur-md bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-2 border-blue-500/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6">Your Estimated Savings</h3>

            {/* Big Numbers */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-3xl font-bold text-white">R{results.costSavings.toLocaleString()}</div>
                <div className="text-white/70 text-sm">Per Month</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-3xl font-bold text-white">R{results.totalSavings.toLocaleString()}</div>
                <div className="text-white/70 text-sm">Per Year</div>
              </div>
            </div>

            {/* Time Saved */}
            <div className="bg-white/10 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⏰</span>
                <h4 className="text-lg font-bold text-white">TIME SAVED</h4>
              </div>
              <div className="space-y-1 text-white/80">
                <p>{results.timeSavedPerMonth} hours per month</p>
                <p className="text-xl font-bold text-white">{results.timeSavedPerYear} hours per year</p>
                <p className="text-green-400">= {Math.round(results.timeSavedPerYear / 40)} weeks of work!</p>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-white/10 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">💰</span>
                <h4 className="text-lg font-bold text-white">COST SAVINGS</h4>
              </div>
              <div className="space-y-2 text-sm text-white/80">
                <div className="flex justify-between">
                  <span>Reduced overtime:</span>
                  <span className="font-semibold text-white">R{results.overtimeSavings.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Optimized shifts:</span>
                  <span className="font-semibold text-white">R{(results.costSavings - results.overtimeSavings - results.complianceSavings).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avoided fines:</span>
                  <span className="font-semibold text-white">R{results.complianceSavings.toLocaleString()}</span>
                </div>
                <div className="border-t border-white/20 pt-2 mt-2 flex justify-between text-lg">
                  <span className="font-bold">Total Monthly:</span>
                  <span className="font-bold text-green-400">R{results.costSavings.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* ROI */}
            <div className="bg-gradient-to-r from-green-500/30 to-emerald-500/30 border border-green-500/50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-white/80">Return on Investment:</span>
                <span className="text-4xl font-bold text-green-300">{results.roi}%</span>
              </div>
            </div>

            {/* Recommended Plan */}
            <div className="border-t border-white/20 pt-6">
              <h4 className="text-white/80 mb-2">Recommended Plan:</h4>
              <div className="text-2xl font-bold text-white mb-4">{results.recommendedPlan}</div>
              <Link
                href="/login"
                className="block w-full text-center px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-full hover:scale-105 transition-all hover:shadow-xl hover:shadow-blue-500/50"
              >
                Start Your Free Trial →
              </Link>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 text-center">
          <p className="text-white/50 text-sm">
            These are conservative estimates based on average RostraCore customer data.<br />
            Actual savings may vary. <button className="text-blue-400 hover:underline">See methodology →</button>
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const genderOptions = ["Male", "Female"]; 
const educationOptions = ["Graduate", "Post_Graduate", "Undergraduate", "Diploma", "No_Formal"];
const stateOptions = ["MH", "KA", "DL", "UP", "WB", "GJ", "RJ", "TN", "TS", "AP"];
const urbanOptions = ["Urban", "Semi_Urban", "Rural"];
const employmentOptions = ["Salaried", "Self_Employed", "Business_Owner", "Government", "Retired"];
const loanTypeOptions = ["Personal_Loan", "Home_Loan", "Auto_Loan", "Education_Loan", "MSME_Loan", "Gold_Loan"];
const loanPurposeOptions = ["General", "Vehicle", "Education", "Debt_Consolidation", "Home_Purchase", "Business_Expansion", "Medical", "Other"];

export default function Simulator() {
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState("Male");
  const [education, setEducation] = useState("Graduate");
  const [state, setState] = useState("MH");
  const [urbanRural, setUrbanRural] = useState("Urban");
  const [employmentType, setEmploymentType] = useState("Salaried");
  const [employmentYears, setEmploymentYears] = useState(5);

  const [income, setIncome] = useState(1000000);
  const [loan, setLoan] = useState(500000);
  const [loanType, setLoanType] = useState("Personal_Loan");
  const [loanPurpose, setLoanPurpose] = useState("General");
  const [loanTenure, setLoanTenure] = useState(36);
  const [interestRate, setInterestRate] = useState(12);

  const [creditScore, setCreditScore] = useState(700);
  const [numExistingLoans, setNumExistingLoans] = useState(1);
  const [dtiRatio, setDtiRatio] = useState(0.3);
  const [ltvRatio, setLtvRatio] = useState(0.5);
  const [hasCollateral, setHasCollateral] = useState(0);
  const [bureauEnquiries, setBureauEnquiries] = useState(1);
  const [missedPayments, setMissedPayments] = useState(0);
  const [savingsBalance, setSavingsBalance] = useState(100000);

  const [risk, setRisk] = useState(null);
  const [pdPercent, setPdPercent] = useState(null);
  const [riskCategory, setRiskCategory] = useState(null);
  const [decision, setDecision] = useState(null);
  const [derivedMetrics, setDerivedMetrics] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/predict_risk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          age,
          gender,
          education,
          state,
          urban_rural: urbanRural,
          employment_type: employmentType,
          employment_years: employmentYears,
          annual_income_inr: income,
          loan_type: loanType,
          loan_purpose: loanPurpose,
          loan_amount_inr: loan,
          loan_tenure_months: loanTenure,
          interest_rate_pct: interestRate,
          credit_score: creditScore,
          num_existing_loans: numExistingLoans,
          dti_ratio: dtiRatio,
          ltv_ratio: ltvRatio,
          has_collateral: hasCollateral,
          bureau_enquiries_6m: bureauEnquiries,
          missed_payments_2y: missedPayments,
          savings_account_balance_inr: savingsBalance,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || `API error ${response.status}`);
      }

      setRisk(data.probability_of_default);
      setPdPercent(data.pd_percent);
      setRiskCategory(data.risk_category);
      setDecision(data.decision);
      setDerivedMetrics(data.derived_metrics || {});
    } catch (err) {
      setError(err.message || "Unable to connect to the risk API.");
      setRisk(null);
      setPdPercent(null);
      setRiskCategory(null);
      setDecision(null);
      setDerivedMetrics({});
    }

    setLoading(false);
  };

  const loanToIncomeDisplay = derivedMetrics.loan_to_income_ratio ?? (loan / income).toFixed(2);
  const dtiCreditRiskDisplay = derivedMetrics.dti_credit_risk ?? (dtiRatio / (creditScore / 700)).toFixed(3);

  const getRiskDetails = () => {
    if (risk > 0.6) {
      return {
        label: "High Risk",
        color: "text-red-500",
        summary: "This applicant has a high probability of default. Strong caution is advised.",
      };
    }
    if (risk > 0.3) {
      return {
        label: "Medium Risk",
        color: "text-orange-500",
        summary: "This applicant shows moderate risk. Some parameters should be optimized.",
      };
    }
    return {
      label: "Low Risk",
      color: "text-green-500",
      summary: "This applicant has a low probability of default. Financial profile looks stable.",
    };
  };

  const riskDetails = risk !== null ? getRiskDetails() : null;

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-10 max-w-7xl w-full mx-auto">
        <div className="bg-white p-6 rounded-2xl shadow-md border">
          <div className="flex flex-col gap-3 mb-6">
            <div>
              <h2 className="text-xl font-semibold">Loan Simulator</h2>
              <p className="text-sm text-gray-500 mt-1">
                Adjust all applicant parameters and get a real model prediction from the backend.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Age</label>
              <input
                type="range"
                min="21"
                max="65"
                step="1"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="text-sm text-gray-600">{age} years</div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Credit Score</label>
              <input
                type="range"
                min="550"
                max="900"
                step="1"
                value={creditScore}
                onChange={(e) => setCreditScore(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="text-sm text-gray-600">{creditScore}</div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Annual Income</label>
              <input
                type="range"
                min="300000"
                max="5000000"
                step="50000"
                value={income}
                onChange={(e) => setIncome(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="text-sm text-gray-600">₹{income.toLocaleString()}</div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Loan Amount</label>
              <input
                type="range"
                min="100000"
                max="5000000"
                step="50000"
                value={loan}
                onChange={(e) => setLoan(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="text-sm text-gray-600">₹{loan.toLocaleString()}</div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Loan Tenure (months)</label>
              <input
                type="range"
                min="6"
                max="240"
                step="6"
                value={loanTenure}
                onChange={(e) => setLoanTenure(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="text-sm text-gray-600">{loanTenure} months</div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Interest Rate (%)</label>
              <input
                type="range"
                min="5"
                max="25"
                step="0.5"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="text-sm text-gray-600">{interestRate.toFixed(1)}%</div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">DTI Ratio</label>
              <input
                type="range"
                min="0"
                max="0.65"
                step="0.01"
                value={dtiRatio}
                onChange={(e) => setDtiRatio(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="text-sm text-gray-600">{dtiRatio.toFixed(2)}</div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">LTV Ratio</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={ltvRatio}
                onChange={(e) => setLtvRatio(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="text-sm text-gray-600">{ltvRatio.toFixed(2)}</div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Number of existing loans</label>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={numExistingLoans}
                onChange={(e) => setNumExistingLoans(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="text-sm text-gray-600">{numExistingLoans}</div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Bureau enquiries (6m)</label>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={bureauEnquiries}
                onChange={(e) => setBureauEnquiries(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="text-sm text-gray-600">{bureauEnquiries}</div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Missed payments (2y)</label>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={missedPayments}
                onChange={(e) => setMissedPayments(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="text-sm text-gray-600">{missedPayments}</div>
            </div>

            <div className="space-y-3 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Savings account balance</label>
              <input
                type="range"
                min="0"
                max="1500000"
                step="25000"
                value={savingsBalance}
                onChange={(e) => setSavingsBalance(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="text-sm text-gray-600">₹{savingsBalance.toLocaleString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {genderOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Education</label>
              <select
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {educationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.replace("_", " " )}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {stateOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Urban / Rural</label>
              <select
                value={urbanRural}
                onChange={(e) => setUrbanRural(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {urbanOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.replace("_", " " )}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Employment type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {employmentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.replace("_", " " )}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Employment years</label>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={employmentYears}
                onChange={(e) => setEmploymentYears(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="text-sm text-gray-600">{employmentYears} years</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Loan type</label>
              <select
                value={loanType}
                onChange={(e) => setLoanType(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {loanTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.replace("_", " " )}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Loan purpose</label>
              <select
                value={loanPurpose}
                onChange={(e) => setLoanPurpose(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {loanPurposeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.replace("_", " " )}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Collateral</label>
              <select
                value={hasCollateral}
                onChange={(e) => setHasCollateral(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value={1}>Yes</option>
                <option value={0}>No</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSimulate}
            className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition"
          >
            {loading ? "Running model..." : "Run Simulation"}
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {risk !== null ? (
            <>
              <p className="text-sm text-gray-500 mb-1">Probability of Default</p>
              <div className="text-7xl font-extrabold mb-3 tracking-tight">{(risk * 100).toFixed(1)}%</div>
              <div className={`text-lg font-semibold mb-4 ${riskDetails.color}`}>{riskDetails.label}</div>
              <p className="text-gray-600 text-sm mb-3">{riskDetails.summary}</p>

              <div className="mb-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Decision</span>
                  <span className="font-medium">{decision || "N/A"}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Risk category</span>
                  <span className="font-medium">{riskCategory || "N/A"}</span>
                </div>
                {pdPercent !== null && (
                  <div className="flex justify-between text-gray-500">
                    <span>PD percent</span>
                    <span className="font-medium">{pdPercent}%</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 mb-4"></div>

              <h3 className="text-sm font-semibold text-gray-700 mb-3">Derived risk metrics</h3>
              <div className="space-y-2 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-500">Loan-to-income ratio</span>
                  <span className="font-medium">{loanToIncomeDisplay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">DTI credit risk</span>
                  <span className="font-medium">{dtiCreditRiskDisplay}</span>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-2">AI Recommendation</p>
                <p className="text-sm text-gray-600">
                  PD of {(risk * 100).toFixed(1)}% is in the {risk > 0.6 ? "high" : risk > 0.3 ? "elevated" : "safe"} zone.
                  Conditional approval possible — consider reducing loan, increasing collateral or improving credit behaviour.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Why this prediction?</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Loan Amount</span>
                      <span className="text-red-500">+ Higher risk</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded">
                      <div
                        className="bg-red-500 h-2 rounded"
                        style={{ width: `${Math.min((loan / income) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Income</span>
                      <span className="text-green-500">- Reduces risk</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded">
                      <div
                        className="bg-green-500 h-2 rounded"
                        style={{ width: `${Math.min((income / 5000000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Credit Score</span>
                      <span className="text-green-500">- Reduces risk</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded">
                      <div
                        className="bg-green-500 h-2 rounded"
                        style={{ width: `${((creditScore - 300) / 550) * 100}%` }}
                      />
                    </div>
                  </div>

                </div>

                <p className="text-xs text-gray-500 mt-3">
                  Real backend model output. Higher income and credit score lower PD, while large loan size and stress raise the score.
                </p>
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-sm text-center">Run simulation to see full backend analysis</p>
          )}
        </div>
      </div>
    </div>
  );
}
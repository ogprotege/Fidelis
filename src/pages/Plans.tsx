import { useState } from "react";
import { Link } from "react-router-dom";
import { getPlans, deletePlan } from "../lib/storage";
import { planDay, planTotalDays, isComplete, todayPortion, formatPortion } from "../lib/plans";
import { useSettings } from "../SettingsContext";

export default function Plans() {
  const translation = useSettings().translation;
  const [plans, setPlans] = useState(getPlans);

  const remove = (id: string) => {
    deletePlan(id);
    setPlans(getPlans());
  };

  return (
    <>
      <h1 className="page-title">Reading Plans</h1>
      <p className="subtitle">
        Pick the books; the app does the citation arithmetic. Your plans live on this device.
      </p>

      {plans.length === 0 && <p className="muted">No plans yet. Start one below.</p>}

      {plans.map((p) => {
        const portion = todayPortion(p);
        const done = isComplete(p);
        return (
          <div className="card plan-card" key={p.id}>
            <h2>{p.name}</h2>
            <div className="muted small sans">
              {done ? "Complete" : `Day ${planDay(p)} of ${planTotalDays(p)}`}
              {!done && portion.length > 0 && <> · today: {formatPortion(portion, translation)}</>}
            </div>
            <div className="plan-actions">
              {!done && portion.length > 0 && (
                <Link className="continue-cta" to={`/read/${translation}/${portion[0]}`}>
                  Resume →
                </Link>
              )}
              <button type="button" className="link-btn" onClick={() => remove(p.id)}>
                Delete
              </button>
            </div>
          </div>
        );
      })}

      <Link className="continue-cta" to="/plans/new">+ New plan</Link>
    </>
  );
}

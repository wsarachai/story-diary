"use client";
import { Suspense, useReducer } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import IconRail from "@/components/IconRail";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  saveNutritionCheckin,
  selectCheckinSaveStatus,
  selectActivityById,
} from "@/store/habitsSlice";

interface State {
  breakfast: string;
  lunch: string;
  dinner: string;
}

type Action =
  | { type: "SET_BREAKFAST"; value: string }
  | { type: "SET_LUNCH"; value: string }
  | { type: "SET_DINNER"; value: string };

function reducer(state: State, action: Action): State {
  if (action.type === "SET_BREAKFAST") return { ...state, breakfast: action.value };
  if (action.type === "SET_LUNCH") return { ...state, lunch: action.value };
  if (action.type === "SET_DINNER") return { ...state, dinner: action.value };
  return state;
}

function NutritionCheckinInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const saveStatus = useAppSelector(selectCheckinSaveStatus);

  const occId = searchParams.get("occ") ?? "";
  const activityId = searchParams.get("actId") ?? "";
  const activity = useAppSelector((state) => selectActivityById(state, activityId));

  const [state, dispatchLocal] = useReducer(reducer, { breakfast: "", lunch: "", dinner: "" });
  const saving = saveStatus === "saving";

  if (!occId) {
    router.replace("/habit/today");
    return null;
  }

  async function handleSave() {
    if (saving) return;
    await dispatch(saveNutritionCheckin({
      occurrenceId: occId,
      activityName: activity?.name ?? "โภชนาการ",
      breakfast: state.breakfast,
      lunch: state.lunch,
      dinner: state.dinner,
    }));
    router.replace("/habit/today");
  }

  return (
    <main className="screen" aria-label="Story Diary Nutrition Check-in">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
        <section className="page authoring-page" aria-label="บันทึกโภชนาการ">
          <div className="create-card checkin-card" role="dialog" aria-modal="true" aria-labelledby="nutrition-checkin-title">
            <header className="create-header">
              <button className="action-btn" aria-label="กลับ" onClick={() => router.push("/habit/today")}>
                <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <h2 className="create-title" id="nutrition-checkin-title">บันทึกโภชนาการ</h2>
              <button
                className={`action-btn${saving ? " saving" : ""}`}
                aria-label="บันทึก"
                onClick={handleSave}
                disabled={saving}
                style={{ borderColor: "#08c65a" }}
              >
                {saving
                  ? <svg viewBox="0 0 24 24" style={{ stroke: "#08c65a" }}><circle cx="12" cy="12" r="9" strokeDasharray="20 40"/></svg>
                  : <svg viewBox="0 0 24 24" style={{ stroke: "#08c65a" }}><polyline points="20 6 9 17 4 12"/></svg>
                }
              </button>
            </header>

            <div className="checkin-body">
              <div className="nutrition-name-pill" aria-label="ชื่อโภชนาการ">
                {activity?.name ?? "โภชนาการ"}
              </div>

              <div className="nutrition-meals" role="group" aria-label="บันทึกอาหาร">
                <div className="nutrition-meal-field">
                  <label className="nutrition-meal-label" htmlFor="breakfast-field">เช้า :</label>
                  <input
                    id="breakfast-field"
                    className="nutrition-meal-input"
                    type="text"
                    placeholder="รายการอาหารเช้า"
                    value={state.breakfast}
                    onChange={(e) => dispatchLocal({ type: "SET_BREAKFAST", value: e.target.value })}
                  />
                </div>
                <div className="nutrition-meal-field">
                  <label className="nutrition-meal-label" htmlFor="lunch-field">กลางวัน :</label>
                  <input
                    id="lunch-field"
                    className="nutrition-meal-input"
                    type="text"
                    placeholder="รายการอาหารกลางวัน"
                    value={state.lunch}
                    onChange={(e) => dispatchLocal({ type: "SET_LUNCH", value: e.target.value })}
                  />
                </div>
                <div className="nutrition-meal-field">
                  <label className="nutrition-meal-label" htmlFor="dinner-field">เย็น :</label>
                  <input
                    id="dinner-field"
                    className="nutrition-meal-input"
                    type="text"
                    placeholder="รายการอาหารเย็น"
                    value={state.dinner}
                    onChange={(e) => dispatchLocal({ type: "SET_DINNER", value: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
        <IconRail />
      </section>
    </main>
  );
}

export default function NutritionCheckinPage() {
  return (
    <Suspense>
      <NutritionCheckinInner />
    </Suspense>
  );
}

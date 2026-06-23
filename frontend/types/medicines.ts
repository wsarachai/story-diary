/**
 * Medicine catalogue for the habit tracker.
 *
 * Source of truth for the `/habit/add/medicine` select list and the
 * side-effect checklist shown on the medicine check-in form (s022). Each entry
 * maps a stable `MedicineKey` to its display label and the discrete side-effect
 * items the patient may experience.
 *
 * Side-effect items are hand-curated from the clinical reference: multi-word
 * Thai phrases are kept whole (e.g. Azathioprine bleeding sites) rather than
 * naively split on whitespace. Activities created with `medicineKey = null`
 * ("Other" / legacy) have no entry here and fall back to a free-text note.
 */

export type MedicineKey =
  | "prednisolone"
  | "cyclophosphamide"
  | "azathioprine"
  | "mycophenolate"
  | "cyclosporine"
  | "quinnel"
  | "nsaid"
  | "vitamin-d2"
  | "calcium-835";

export interface MedicineSideEffect {
  /** Stable id, `${MedicineKey}-${n}`. Persisted in the check-in record. */
  id: string;
  /** Thai display copy for the checkbox row. */
  label: string;
}

export interface MedicineInfo {
  /** Display label for the select + check-in identity pill. */
  label: string;
  /** Discrete side-effect checkbox items for this medicine. */
  sideEffects: MedicineSideEffect[];
}

function items(key: MedicineKey, labels: string[]): MedicineSideEffect[] {
  return labels.map((label, i) => ({ id: `${key}-${i + 1}`, label }));
}

export const MEDICINES: Readonly<Record<MedicineKey, MedicineInfo>> = {
  prednisolone: {
    label: "Prednisolone",
    sideEffects: items("prednisolone", [
      "ใบหน้าเปลี่ยน",
      "น้ำหนักเพิ่ม",
      "คลื่นไส้",
      "อารมณ์แปรปรวน",
      "นอนไม่หลับ",
      "เป็นสิว",
      "ผิวแห้ง",
    ]),
  },
  cyclophosphamide: {
    label: "Cyclophosphamide",
    sideEffects: items("cyclophosphamide", [
      "ปัสสาวะมีเลือดออก",
      "ไอ",
      "ไข้",
      "หนาวสั่น",
      "มึนงง",
      "ประจำเดือนผิดปกติ",
    ]),
  },
  azathioprine: {
    label: "Azathioprine",
    sideEffects: items("azathioprine", [
      "อาการเหนื่อยหอบ",
      "เลือดออกบริเวณเหงือกและเยื่อบุในช่องปาก",
      "เลือดออกในปัสสาวะหรืออุจจาระ",
    ]),
  },
  mycophenolate: {
    label: "Mycophenolate",
    sideEffects: items("mycophenolate", ["ปวดท้อง", "ถ่ายเหลว"]),
  },
  cyclosporine: {
    label: "Cyclosporine",
    sideEffects: items("cyclosporine", [
      "ความดันโลหิตสูง",
      "เหงือกบวม",
      "ชามือเท้า",
      "ปวดท้อง",
      "คลื่นไส้",
      "ปวดศีรษะ",
    ]),
  },
  quinnel: {
    label: "Quinnel",
    sideEffects: items("quinnel", [
      "เสียงก้องในหู",
      "ตามัว (มองเห็นเป็นแสงไฟวงกลม)",
    ]),
  },
  nsaid: {
    label: "NSAIDs",
    sideEffects: items("nsaid", [
      "อาการปวดท้อง",
      "แน่นท้อง",
      "เลือดออกในทางเดินอาหาร",
    ]),
  },
  "vitamin-d2": {
    label: "Vitamin D2 cap",
    sideEffects: items("vitamin-d2", [
      "สับสน",
      "น้ำหนักลด",
      "เบื่ออาหาร",
      "กระหายน้ำ",
      "ปัสสาวะบ่อย",
      "ปวดกระดูก",
      "คลื่นไส้",
      "อาเจียน",
      "ท้องผูก",
      "เหนื่อยง่าย",
      "อ่อนแรง",
    ]),
  },
  "calcium-835": {
    label: "Calcium 835 mg",
    sideEffects: items("calcium-835", [
      "สับสน",
      "หงุดหงิดง่าย",
      "ปวดศีรษะ",
      "เบื่ออาหาร",
      "คลื่นไส้อาเจียน",
      "อ่อนเพลีย",
      "เหนื่อยง่ายผิดปกติ",
    ]),
  },
};

/** Ordered keys for building the select list. */
export const MEDICINE_KEYS = Object.keys(MEDICINES) as MedicineKey[];

export function isMedicineKey(value: unknown): value is MedicineKey {
  return typeof value === "string" && value in MEDICINES;
}

import { useRef } from "react";
import { X, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CourseResult {
  courseId: string;
  courseTitle: string;
  midObt: number;
  midMax: number;
  endObt: number;
  endMax: number;
  internal: number;
  internalMax: number;
  total: number;
  totalMax: number;
  pct: number;
  grade: string;
}

interface ReportCardProps {
  studentName: string;
  results: CourseResult[];
  overallPct: number;
  grandTotal: number;
  grandMax: number;
  onClose: () => void;
}

export default function ReportCard({ studentName, results, overallPct, grandTotal, grandMax, onClose }: ReportCardProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const overallGrade = overallPct >= 90 ? "A+" : overallPct >= 80 ? "A" : overallPct >= 70 ? "B+" : overallPct >= 60 ? "B" : overallPct >= 50 ? "C" : overallPct >= 40 ? "D" : "F";
  const result = overallPct >= 40 ? "PASS" : "FAIL";

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Report Card - ${studentName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: white; color: #1a1a1a; }
            .header { text-align: center; margin-bottom: 32px; border-bottom: 3px double #1a1a1a; padding-bottom: 20px; }
            .header h1 { font-size: 28px; font-weight: 800; letter-spacing: 2px; margin-bottom: 4px; }
            .header p { font-size: 13px; color: #666; }
            .info { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 14px; }
            .info div { display: flex; gap: 6px; }
            .info strong { font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; }
            th:first-child { text-align: left; }
            td { padding: 10px 12px; border: 1px solid #d1d5db; text-align: center; font-size: 13px; }
            td:first-child { text-align: left; font-weight: 500; }
            .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 32px; padding-top: 20px; border-top: 2px solid #1a1a1a; }
            .footer-box { text-align: center; padding: 12px 24px; border: 1px solid #d1d5db; border-radius: 8px; }
            .footer-box .label { font-size: 10px; text-transform: uppercase; color: #666; margin-bottom: 4px; letter-spacing: 0.5px; }
            .footer-box .value { font-size: 22px; font-weight: 800; }
            .pass { color: #16a34a; }
            .fail { color: #dc2626; }
            .stamp { margin-top: 48px; display: flex; justify-content: space-between; font-size: 12px; color: #666; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📜 REPORT CARD</h1>
            <p>Academic Performance Statement</p>
          </div>
          <div class="info">
            <div><strong>Student:</strong> <span>${studentName}</span></div>
            <div><strong>Date:</strong> <span>${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Mid Sem (30)</th>
                <th>End Sem (70)</th>
                <th>Internal (20)</th>
                <th>Total (120)</th>
                <th>%</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              ${results.map(r => `
                <tr>
                  <td>${r.courseTitle}</td>
                  <td>${r.midObt}</td>
                  <td>${r.endObt}</td>
                  <td>${r.internal}</td>
                  <td><strong>${r.total}</strong></td>
                  <td>${r.pct}%</td>
                  <td><strong>${r.grade}</strong></td>
                </tr>
              `).join("")}
              <tr style="background:#f9fafb;font-weight:700;">
                <td>Grand Total</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>${grandTotal}/${grandMax}</td>
                <td>${overallPct}%</td>
                <td>${overallGrade}</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            <div class="footer-box">
              <div class="label">Overall Percentage</div>
              <div class="value">${overallPct}%</div>
            </div>
            <div class="footer-box">
              <div class="label">Grade</div>
              <div class="value">${overallGrade}</div>
            </div>
            <div class="footer-box">
              <div class="label">Result</div>
              <div class="value ${result === "PASS" ? "pass" : "fail"}">${result}</div>
            </div>
          </div>
          <div class="stamp">
            <span>Generated on ${new Date().toLocaleString("en-IN")}</span>
            <span>Authorized Signature: _______________</span>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">📜 Report Card</h2>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} size="sm" variant="outline" className="gap-1.5">
              <Printer className="w-4 h-4" /> Print / Download PDF
            </Button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div ref={printRef} className="p-6">
          {/* Header */}
          <div className="text-center mb-6 pb-4 border-b-2 border-foreground">
            <h1 className="text-2xl font-extrabold tracking-widest text-foreground">REPORT CARD</h1>
            <p className="text-xs text-muted-foreground mt-1">Academic Performance Statement</p>
          </div>

          {/* Info */}
          <div className="flex justify-between mb-6 text-sm">
            <div><span className="text-muted-foreground">Student: </span><span className="font-semibold text-foreground">{studentName}</span></div>
            <div><span className="text-muted-foreground">Date: </span><span className="font-semibold text-foreground">{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span></div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-3 text-xs font-bold text-muted-foreground uppercase border border-border">Course</th>
                  <th className="text-center p-3 text-xs font-bold text-muted-foreground uppercase border border-border">Mid Sem<br/>(30)</th>
                  <th className="text-center p-3 text-xs font-bold text-muted-foreground uppercase border border-border">End Sem<br/>(70)</th>
                  <th className="text-center p-3 text-xs font-bold text-muted-foreground uppercase border border-border">Internal<br/>(20)</th>
                  <th className="text-center p-3 text-xs font-bold text-muted-foreground uppercase border border-border">Total<br/>(120)</th>
                  <th className="text-center p-3 text-xs font-bold text-muted-foreground uppercase border border-border">%</th>
                  <th className="text-center p-3 text-xs font-bold text-muted-foreground uppercase border border-border">Grade</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.courseId} className="hover:bg-muted/20">
                    <td className="p-3 font-medium text-foreground border border-border">{r.courseTitle}</td>
                    <td className="p-3 text-center text-foreground border border-border">{r.midObt}</td>
                    <td className="p-3 text-center text-foreground border border-border">{r.endObt}</td>
                    <td className="p-3 text-center text-muted-foreground italic border border-border">{r.internal}</td>
                    <td className="p-3 text-center font-bold text-foreground border border-border">{r.total}</td>
                    <td className="p-3 text-center border border-border">
                      <span className={`font-bold ${r.pct >= 60 ? "text-green-500" : r.pct >= 40 ? "text-yellow-500" : "text-red-500"}`}>{r.pct}%</span>
                    </td>
                    <td className="p-3 text-center border border-border">
                      <span className={`font-bold ${r.grade === "F" ? "text-red-500" : "text-foreground"}`}>{r.grade}</span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/40 font-bold">
                  <td className="p-3 text-foreground border border-border">Grand Total</td>
                  <td className="p-3 text-center border border-border text-muted-foreground">—</td>
                  <td className="p-3 text-center border border-border text-muted-foreground">—</td>
                  <td className="p-3 text-center border border-border text-muted-foreground">—</td>
                  <td className="p-3 text-center text-foreground border border-border">{grandTotal}/{grandMax}</td>
                  <td className="p-3 text-center border border-border">
                    <span className={overallPct >= 60 ? "text-green-500" : overallPct >= 40 ? "text-yellow-500" : "text-red-500"}>{overallPct}%</span>
                  </td>
                  <td className="p-3 text-center text-foreground border border-border">{overallGrade}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary boxes */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 rounded-xl border border-border">
              <p className="text-[10px] uppercase text-muted-foreground mb-1 tracking-wider">Overall %</p>
              <p className="text-2xl font-extrabold text-foreground">{overallPct}%</p>
            </div>
            <div className="text-center p-4 rounded-xl border border-border">
              <p className="text-[10px] uppercase text-muted-foreground mb-1 tracking-wider">Grade</p>
              <p className="text-2xl font-extrabold text-primary">{overallGrade}</p>
            </div>
            <div className="text-center p-4 rounded-xl border border-border">
              <p className="text-[10px] uppercase text-muted-foreground mb-1 tracking-wider">Result</p>
              <p className={`text-2xl font-extrabold ${result === "PASS" ? "text-green-500" : "text-red-500"}`}>{result}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end text-xs text-muted-foreground pt-4 border-t border-border">
            <span>Generated: {new Date().toLocaleString("en-IN")}</span>
            <span>Authorized Signature: _______________</span>
          </div>
        </div>
      </div>
    </div>
  );
}

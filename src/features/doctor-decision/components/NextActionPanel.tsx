import { CalendarPlus, Filter, ClipboardList } from "lucide-react";
import { Button } from "../../../components/ui/button";

export function NextActionPanel({
  primaryName,
  onBookPrimary,
  onRefine,
  onCarePlan,
}: {
  primaryName: string;
  onBookPrimary: () => void;
  onRefine: () => void;
  onCarePlan: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
      <div className="mx-auto flex w-full max-w-[390px] flex-col gap-2">
        <Button size="lg" className="w-full" onClick={onBookPrimary}>
          <CalendarPlus className="h-4 w-4" />
          立即挂主推荐医生（{primaryName}）
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onRefine}>
            <Filter className="h-4 w-4" />
            AI 二次筛选
          </Button>
          <Button variant="outline" onClick={onCarePlan}>
            <ClipboardList className="h-4 w-4" />
            陪诊计划
          </Button>
        </div>
      </div>
    </div>
  );
}

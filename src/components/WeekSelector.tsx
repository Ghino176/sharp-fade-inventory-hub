import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";

interface WeekSelectorProps {
  selectedDate: Date;
  onWeekChange: (date: Date) => void;
}

const WeekSelector = ({ selectedDate, onWeekChange }: WeekSelectorProps) => {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  const handlePreviousWeek = () => {
    onWeekChange(subWeeks(selectedDate, 1));
  };

  const handleNextWeek = () => {
    onWeekChange(addWeeks(selectedDate, 1));
  };

  const handleCurrentWeek = () => {
    onWeekChange(new Date());
  };

  const isCurrentWeek = () => {
    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    return weekStart.getTime() === currentWeekStart.getTime();
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousWeek}
          title="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md min-w-[200px] justify-center">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {format(weekStart, "dd MMM", { locale: es })} - {format(weekEnd, "dd MMM yyyy", { locale: es })}
          </span>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNextWeek}
          disabled={isCurrentWeek()}
          title="Semana siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {!isCurrentWeek() && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCurrentWeek}
          className="text-xs"
        >
          Ir a semana actual
        </Button>
      )}
    </div>
  );
};

export default WeekSelector;

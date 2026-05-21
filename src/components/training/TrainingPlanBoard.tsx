import type { TrainingPlanDay } from '../../lib/trainingData';
import TrainingDayStatusCard from './TrainingDayStatusCard';

export default function TrainingPlanBoard({
  days,
  selectedDayIndex,
  onSelect,
}: {
  days: TrainingPlanDay[];
  selectedDayIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {days.map((day) => {
        return (
          <TrainingDayStatusCard
            key={`${day.dayIndex}-${day.date}`}
            day={day}
            selected={day.dayIndex === selectedDayIndex}
            onSelect={() => onSelect(day.dayIndex)}
          />
        );
      })}
    </div>
  );
}

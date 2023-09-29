import PrimitiveDateTimePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import classNames from "@calcom/lib/classNames";

import { Calendar } from "../../icon";
import "./custom.css";

type Props = {
  value: any;
  onDatesChange?: ((date: any) => void) | undefined;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
};

const DateTimePicker = ({ minDate, disabled, value, onDatesChange, className }: Props) => {
  return (
    <div className="focus:ring-primary-500 focus:border-primary-500 border-default flex flex-row items-center rounded-md border px-2 shadow-sm sm:text-sm">
      <PrimitiveDateTimePicker
        className={classNames("w-[100%] border-none", className)}
        showTimeInput
        calendarClassName="rounded-md darked:text-black"
        dateFormat="dd-MM-yyyy h:mm aa"
        selected={value}
        minDate={minDate}
        disabled={disabled}
        onChange={onDatesChange}
        shouldCloseOnSelect={false}
      />
      <Calendar className="text-subtle h-5 w-5 rounded-md" />
    </div>
  );
};

export default DateTimePicker;

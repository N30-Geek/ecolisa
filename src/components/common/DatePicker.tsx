import React from 'react';
import { CustomDatePicker, CustomDatePickerProps } from './CustomDatePicker';

export interface DatePickerProps extends CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const DatePicker: React.FC<DatePickerProps> = (props) => {
  return <CustomDatePicker {...props} />;
};

export default DatePicker;

import { Component, OnInit, Input, OnChanges, SimpleChanges, ElementRef, HostListener, forwardRef, ViewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  setYear,
  eachDay,
  getDate,
  getMonth,
  getYear,
  getHours,
  getMinutes,
  isToday,
  isSameDay,
  isSameMonth,
  isSameYear,
  format,
  getDay,
  subDays,
  setDay,
  setHours,
  setMinutes
} from 'date-fns';
import { ISlimScrollOptions } from 'ngx-slimscroll';

import { TIME_REGEXP, parseTime } from '../pipes/time.pipe';

export type AddClass = string | string[] | { [k: string]: boolean } | null;

export interface DatepickerOptions {
  minYear?: number; // default: current year - 30
  maxYear?: number; // default: current year + 30
  displayFormat?: string; // default: 'MMM D[,] YYYY'
  barTitleFormat?: string; // default: 'MMMM YYYY'
  dayNamesFormat?: string; // default 'ddd'
  barTitleIfEmpty?: string;
  firstCalendarDay?: number; // 0 = Sunday (default), 1 = Monday, ..
  locale?: object;
  minDate?: Date;
  maxDate?: Date;
  /** Placeholder for the input field */
  placeholder?: string;
  timePlaceholder?: string;
  /** [ngClass] to add to the input field */
  addClass?: AddClass;
  /** [ngStyle] to add to the input field */
  addStyle?: { [k: string]: any } | null;
  /** ID to assign to the input field */
  fieldId?: string;
  /** If false, barTitleIfEmpty will be disregarded and a date will always be shown. Default: true */
  useEmptyBarTitle?: boolean;
}

export interface AppTime {
  hours: string | number;
  minutes: string | number;
}

// Counter for calculating the auto-incrementing field ID
let counter = 0;

/**
 * Internal library helper that helps to check if value is empty
 * @param value
 */
const isNil = (value: Date | DatepickerOptions) => {
  return (typeof value === 'undefined') || (value === null);
};

@Component({
  selector: 'ng-datepicker',
  templateUrl: 'ng-datepicker.component.html',
  styleUrls: ['ng-datepicker.component.sass'],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NgDatepickerComponent), multi: true }
  ]
})
export class NgDatepickerComponent implements ControlValueAccessor, OnInit, OnChanges {
  @Input() options: DatepickerOptions;

  /**
   * Disable datepicker's input
   */
  @Input() headless = false;

  /**
   * Set datepicker's visibility state
   */
  @Input() isOpened = false;

  /**
   * Datepicker dropdown position
   */
  @Input() position = 'bottom-right';

  private positions = ['bottom-left', 'bottom-right', 'top-left', 'top-right'];

  @ViewChild('timeContainer') timeContainer: ElementRef;
  @ViewChild('hoursInput') hoursInput: ElementRef;
  @ViewChild('minutesInput') minutesInput: ElementRef;

  innerValue: Date;
  displayValue: string;
  displayFormat: string;
  date: Date;
  time: string;
  hours: string | number;
  minutes: string | number;
  timeParsed: AppTime;
  timePattern: RegExp;
  barTitle: string;
  barTitleFormat: string;
  barTitleIfEmpty: string;
  minYear: number;
  maxYear: number;
  firstCalendarDay: number;
  view: string;
  years: { year: number; isThisYear: boolean }[];
  dayNames: string[];
  dayNamesFormat: string;
  scrollOptions: ISlimScrollOptions;
  days: {
    date: Date;
    day: number;
    month: number;
    year: number;
    inThisMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    isSelectable: boolean;
  }[];
  locale: object;
  placeholder: string;
  timePlaceholder: string;
  addClass: AddClass;
  addStyle: { [k: string]: any } | null;
  fieldId: string;
  useEmptyBarTitle: boolean;
  disabled: boolean;

  private onTouchedCallback: () => void = () => { };
  private onChangeCallback: (_: any) => void = () => { };

  public setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled;
  }

  get value(): Date {
    return this.innerValue;
  }

  set value(val: Date) {
    this.innerValue = val;
    this.onChangeCallback(this.innerValue);
  }

  constructor(private elementRef: ElementRef) {
    this.scrollOptions = {
      barBackground: '#DFE3E9',
      gridBackground: '#FFFFFF',
      barBorderRadius: '3',
      gridBorderRadius: '3',
      barWidth: '6',
      gridWidth: '6',
      barMargin: '0',
      gridMargin: '0'
    };
  }

  ngOnInit() {
    this.view = 'days';
    this.timePattern = TIME_REGEXP;

    this.date = new Date();
    this.setTime(0, 0);

    this.setOptions();
    this.initDayNames();
    this.initYears();

    // Check if 'position' property is correct
    if (this.positions.indexOf(this.position) === -1) {
      throw new TypeError(`ng-datepicker: invalid position property value '${this.position}' (expected: ${this.positions.join(', ')})`);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if ('options' in changes) {
      this.setOptions();
      this.initDayNames();
      this.init();
      this.initYears();
    }
  }

  get defaultFieldId(): string {
    // Only evaluate and increment if required
    const value = `datepicker-${counter++}`;
    Object.defineProperty(this, 'defaultFieldId', {value});

    return value;
  }

  setOptions(): void {
    const today = new Date(); // this const was added because during my tests, I noticed that at this level this.date is undefined
    this.minYear = this.options && this.options.minYear || getYear(today) - 30;
    this.maxYear = this.options && this.options.maxYear || getYear(today) + 30;
    this.displayFormat = this.options && this.options.displayFormat || 'MMM D[,] YYYY HH:mm';
    this.barTitleFormat = this.options && this.options.barTitleFormat || 'MMMM YYYY';
    this.dayNamesFormat = this.options && this.options.dayNamesFormat || 'ddd';
    this.barTitleIfEmpty = this.options && this.options.barTitleIfEmpty || 'Click to select a date';
    this.firstCalendarDay = this.options && this.options.firstCalendarDay || 0;
    this.locale = this.options && { locale: this.options.locale } || {};
    this.placeholder = this.options && this.options.placeholder || '';
    this.timePlaceholder = this.options && this.options.timePlaceholder || 'hh:mm';
    this.addClass = this.options && this.options.addClass || {};
    this.addStyle = this.options && this.options.addStyle || {};
    this.fieldId = this.options && this.options.fieldId || this.defaultFieldId;
    this.useEmptyBarTitle = this.options && 'useEmptyBarTitle' in this.options ? this.options.useEmptyBarTitle : true;
  }

  nextMonth(): void {
    this.date = addMonths(this.date, 1);
    this.init();
  }

  prevMonth(): void {
    this.date = subMonths(this.date, 1);
    this.init();
  }

  setTime(hours: number | string = 0, minutes: number | string = 0): void {
    this.timeParsed = { hours, minutes };

    this.date = setHours(this.date, hours as number);
    this.date = setMinutes(this.date, minutes as number);
  }

  setDate(i: number): void {
    this.date = this.days[i].date;
    this.setTime(this.timeParsed.hours, this.timeParsed.minutes);
    this.value = this.date;

    this.init();
    this.close();
  }

  setYear(i: number): void {
    this.date = setYear(this.date, this.years[i].year);
    this.init();
    this.initYears();
    this.view = 'days';
  }

  /**
   * Checks if specified date is in range of min and max dates
   * @param date
   */
  private isDateSelectable(date: Date): boolean {
    if (isNil(this.options)) {
      return true;
    }

    const minDateSet = !isNil(this.options.minDate);
    const maxDateSet = !isNil(this.options.maxDate);
    const timestamp = date.valueOf();

    if (minDateSet && (timestamp < this.options.minDate.valueOf())) {
      return false;
    }

    if (maxDateSet && (timestamp > this.options.maxDate.valueOf())) {
      return false;
    }

    return true;
  }

  init(): void {
    // this.date may be null after .reset(); fall back to current date.
    const actualDate = this.date || new Date();
    const start = startOfMonth(actualDate);
    const end = endOfMonth(actualDate);

    this.days = eachDay(start, end).map(date => {
      return {
        date: date,
        day: getDate(date),
        month: getMonth(date),
        year: getYear(date),
        inThisMonth: true,
        isToday: isToday(date),
        isSelected: isSameDay(date, this.innerValue) && isSameMonth(date, this.innerValue) && isSameYear(date, this.innerValue),
        isSelectable: this.isDateSelectable(date)
      };
    });

    const tmp = getDay(start) - this.firstCalendarDay;
    const prevDays = tmp < 0 ? 7 - this.firstCalendarDay : tmp;

    for (let i = 1; i <= prevDays; i++) {
      const date = subDays(start, i);
      this.days.unshift({
        date: date,
        day: getDate(date),
        month: getMonth(date),
        year: getYear(date),
        inThisMonth: false,
        isToday: isToday(date),
        isSelected: isSameDay(date, this.innerValue) && isSameMonth(date, this.innerValue) && isSameYear(date, this.innerValue),
        isSelectable: this.isDateSelectable(date)
      });
    }

    if (this.innerValue) {
      this.displayValue = format(this.innerValue, this.displayFormat, this.locale);
      this.barTitle = format(start, this.barTitleFormat, this.locale);
    } else {
      this.displayValue = '';
      this.barTitle = this.useEmptyBarTitle ? this.barTitleIfEmpty : format(start, this.barTitleFormat, this.locale);
    }
  }

  initYears(): void {
    const range = this.maxYear - this.minYear;
    this.years = Array.from(new Array(range), (x, i) => i + this.minYear).map(year => {
      return { year: year, isThisYear: year === getYear(this.date) };
    });
  }

  initDayNames(): void {
    this.dayNames = [];
    const start = this.firstCalendarDay;
    for (let i = start; i <= 6 + start; i++) {
      const date = setDay(new Date(), i);
      this.dayNames.push(format(date, this.dayNamesFormat, this.locale));
    }
  }

  toggleView(): void {
    this.view = this.view === 'days' ? 'years' : 'days';
  }

  toggle(): void {
    this.isOpened = !this.isOpened;

    if (!this.isOpened && this.view === 'years') {
      this.toggleView();
    }
  }

  close(): void {
    this.isOpened = false;

    if (this.view === 'years') {
      this.toggleView();
    }
  }

  reset(fireValueChangeEvent = false): void {
    this.date = null;
    this.innerValue = null;
    this.init();
    if (fireValueChangeEvent && this.onChangeCallback) {
      this.onChangeCallback(this.innerValue);
    }
  }

  writeValue(val: Date) {
    if (val) {
      this.date = val;
      this.innerValue = val;
      this.init();
      this.displayValue = format(this.innerValue, this.displayFormat, this.locale);
      this.barTitle = format(startOfMonth(val), this.barTitleFormat, this.locale);
    }
  }

  registerOnChange(fn: any) {
    this.onChangeCallback = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouchedCallback = fn;
  }

  applyTime(e) {
    console.log(e);
  }

  onTimeChange(e) {
    this.time = e;

    if (!e) {
      return;
    }

    const parsedTime = parseTime(e) || {};
    const { hours, minutes } = parsedTime;

    this.setTime(hours, minutes);

    this.value = this.date;

    this.displayValue = format(this.innerValue, this.displayFormat, this.locale);
  }

  toNumber(value: string | number): number {
    if (typeof value === 'number') {
      return value;
    } else if (typeof value === 'string') {
      return parseInt(value, 10);
    }
  }

  onHoursChange(value) {
    this.hoursInputParser(value);
  }

  onMinutesChange(value) {
    this.minutesInputParser(value);
  }
  hoursInputParser(value) {
    const hours = this.toNumber(value);
    const nModelHours = this.toNumber(this.hours);

    if (isNaN(hours)) {
      console.log('isNaN(hours)')
      this.hours = '00';
      setTimeout(() => this.selectHours())

      return this.hours;
    }

    if (hours === 0) {
      console.log('hours === 0')
      // Check for '10' input
      if (this.toNumber(this.hours) === 0) {
        console.log('this.toNumber(this.hours) === 0')
        this.hours = '00';

        this.jumpToMinutes();

        return this.hours;
      }
    }

    let squashTime = false;

    if (nModelHours === 2 && hours < 4) {
      console.log('nModelHours === 2 && hours < 4')
      squashTime = true;
    } else if (nModelHours < 2 && hours < 10) {
      console.log('nModelHours === 2 && hours < 4')
      squashTime = true;
    }

    if (squashTime) {
      console.log('squashTime')
      this.hours = nModelHours.toString() + value;

      this.jumpToMinutes();

      return this.hours;
    }

    if (hours < 10 && value.length === 1) {
      console.log('hours < 10 && value.length === 1')
      this.hours = '0' + value;
    }

    if (hours > 2) {
      console.log('hours > 2')
      this.jumpToMinutes();
    } else {
      console.log('hours <= 2')
      setTimeout(() => this.selectHours());
    }

    return this.hours;
  }

  minutesInputParser(value) {
    const minutes = this.toNumber(value);
    const nModelMinutes = this.toNumber(this.minutes);

    if (isNaN(minutes)) {
      console.log('isNaN(minutes)')
      this.minutes = '00';

      setTimeout(() => this.selectMinutes());

      return this.minutes;
    }

    if (minutes === 0) {
      console.log('minutes === 0')
      // Check for '10' input
      if (nModelMinutes === 0) {
        console.log('nModelMinutes === 0')
        this.minutes = '00';

        return this.minutes;
      }
    }

    if (nModelMinutes < 6 && minutes < 10) {
      console.log('nModelMinutes: %s minutes: %s', nModelMinutes, minutes)
      console.log('nModelMinutes < 6 && minutes < 10')
      console.log('nModelMinutes.toString() + value', nModelMinutes.toString() + value)
      this.minutes = nModelMinutes.toString() + value;

      setTimeout(() => this.selectMinutes());

      return this.minutes;
    }

    if (minutes < 10 && value.length === 1) {
      console.log('minutes: %s value: %s', minutes, value)
      console.log('minutes < 10 && value.length === 1')
      this.minutes = '0' + value;

      setTimeout(() => this.selectMinutes());
    }

    return this.minutes;
  }

  selectHours() {
    console.log('selectHours')
    this.hoursInput.nativeElement.select();
    this.hoursInput.nativeElement.setSelectionRange(0, 2);
  }

  onHoursInputFocus() {
    this.selectHours();
  }

  jumpToMinutes() {
    this.minutesInput.nativeElement.focus();
    this.minutesInput.nativeElement.select();
  }

  selectMinutes() {
    console.log('selectMinutes')
    this.minutesInput.nativeElement.select();
    this.minutesInput.nativeElement.setSelectionRange(0, 2);
  }

  onMinutesInputFocus() {
    this.selectMinutes();
  }

  onInputFocus() {
    this.timeContainer.nativeElement.classList.add('time-focus');
  }

  onInputBlur() {
    this.timeContainer.nativeElement.classList.remove('time-focus');
  }

  @HostListener('document:click', ['$event']) onBlur(e: MouseEvent) {
    if (!this.isOpened) {
      return;
    }

    const input = this.elementRef.nativeElement.querySelector('.ngx-datepicker-input');

    if (input == null) {
      return;
    }

    if (e.target === input || input.contains(<any>e.target)) {
      return;
    }

    const container = this.elementRef.nativeElement.querySelector('.ngx-datepicker-calendar-container');
    if (container && container !== e.target && !container.contains(<any>e.target) && !(<any>e.target).classList.contains('year-unit')) {
      this.close();
    }
  }
}



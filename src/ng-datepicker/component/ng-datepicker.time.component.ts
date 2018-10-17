import { 
    Component, EventEmitter, OnInit, Input, Output,
    OnChanges, SimpleChanges, ElementRef, HostListener, forwardRef, ViewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

import { ISlimScrollOptions } from 'ngx-slimscroll';

import { TIME_REGEXP, parseTime } from '../pipes/time.pipe';

export interface DatepickerOptions {
  minHours?: number;
  minMinutes?: number;
}

export interface AppTime {
  hours: string | number;
  minutes: string | number;
}

@Component({
  selector: 'ng-datepicker-time',
  templateUrl: 'ng-datepicker.component.time.html',
  styleUrls: ['ng-datepicker.component.time.sass'],
  providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => NgDatepickerTimeComponent),
        multi: true
    }]
})
export class NgDatepickerTimeComponent implements ControlValueAccessor, OnInit, OnChanges {
  @Output() applyTime: EventEmitter<AppTime> = new EventEmitter<AppTime>();

  @ViewChild('timeContainer') timeContainer: ElementRef;
  @ViewChild('hoursInput') hoursInput: ElementRef;
  @ViewChild('minutesInput') minutesInput: ElementRef;

  time: string;
  hours: string | number;
  minutes: string | number;
  timeParsed: AppTime;
  timePattern: RegExp;
  placeholder: string;

  private onTouchedCallback: (_: any) => void = () => { };
  private onChangeCallback: (_: any) => void = () => { };

  constructor(private elementRef: ElementRef) {

  }

  ngOnInit() {
    this.timePattern = TIME_REGEXP;
  }

  registerOnChange(fn: any) {
    this.onChangeCallback = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouchedCallback = fn;
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
}



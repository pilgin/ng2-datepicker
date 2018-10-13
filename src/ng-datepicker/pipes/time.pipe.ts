import { Pipe, PipeTransform } from '@angular/core';

const TIME_REGEXP = /^([01]\d|2[0-3]):?([0-5]\d)$/;
const TIME_SEPARATOR = ':';
const DISALLOWED_CHARS = /[^\d]/g;

@Pipe({ name: 'appTime' })
export class AppTimePipe implements PipeTransform {
    static TIME_REGEXP = TIME_REGEXP;
    static TIME_SEPARATOR = TIME_SEPARATOR;
    static DISALLOWED_CHARS = DISALLOWED_CHARS;

    static parseTime(value: string = ''): any {
        const matches = value.match(this.TIME_REGEXP);

        if (!matches) {
            return {};
        }

        const [ , hours, minutes = '' ] = matches;

        return { hours, minutes };

    }

    transform(value: string = ''): string {
        if (!value || typeof value !== 'string') {
            return value;
        }

        const parsedTime = AppTimePipe.parseTime(value) || {};
        const { hours, minutes } = parsedTime;

        if (!hours || !minutes) {
            return value;
        }

        return `${hours}${AppTimePipe.TIME_SEPARATOR}${minutes}`;
    }

    parse(value: string = ''): any {
        if (!value || typeof value !== 'string') {
            return value;
        }

        return AppTimePipe.parseTime(value);
    }
}

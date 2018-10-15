import { Pipe, PipeTransform } from '@angular/core';

export const TIME_REGEXP = /^([01]\d|2[0-3]):?([0-5]\d)$/;
export const TIME_SEPARATOR = ':';
export const DISALLOWED_CHARS = /[^\d]/g;

export const parseTime = (value: string = ''): any => {
    const matches = value.match(TIME_REGEXP);

    if (!matches) {
        return {};
    }

    const [ , hours, minutes = '' ] = matches;

    return { hours, minutes };
};

// @dynamic
@Pipe({ name: 'appTime' })
export class AppTimePipe implements PipeTransform {
    transform(value: string = ''): string {
        if (!value || typeof value !== 'string') {
            return value;
        }

        const parsedTime = parseTime(value) || {};
        const { hours, minutes } = parsedTime;

        if (!hours || !minutes) {
            return value;
        }

        return `${hours}${TIME_SEPARATOR}${minutes}`;
    }

    parse(value: string = ''): any {
        if (!value || typeof value !== 'string') {
            return value;
        }

        return parseTime(value);
    }
}

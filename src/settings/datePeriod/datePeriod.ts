"use strict";
import * as moment from 'moment';
export interface IPeriod {
    dateStart: Date;
    dateEnd: Date;
}
export class Period implements IPeriod {
    dateStart: Date;
    dateEnd: Date;
    public constructor(start: Date = null, end: Date = null) {
        this.dateStart = start;
        this.dateEnd = end;
    }
}
export enum DefaultPeriodType {
    LastMonth, LastEntireMonth, LastWeek, LastEntireWeek, Custom
}
export enum OrientationType{
    Horizontal,Vertical
}


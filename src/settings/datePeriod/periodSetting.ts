"use strict";
import * as DatePeriod from "./datePeriod";
export class PeriodSettings {
    public defaultPeriodType:DatePeriod.DefaultPeriodType=DatePeriod.DefaultPeriodType.LastEntireMonth;
    public relativeToday:boolean=true;
    public firstDayOfWeek:number=1;
  }
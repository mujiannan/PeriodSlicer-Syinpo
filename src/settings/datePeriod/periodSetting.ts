"use strict";
import * as DatePeriod from "./datePeriod";
export class PeriodSetting {
    public defaultPeriodType:DatePeriod.DefaultPeriodType=DatePeriod.DefaultPeriodType.Custom;
    public relativeToday:boolean=true;
    public firstDayOfWeek:number=1.00;
  }
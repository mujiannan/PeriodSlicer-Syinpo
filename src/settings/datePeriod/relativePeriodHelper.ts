"use strict";
import {DefaultPeriodType,IPeriod,Period} from "./datePeriod";
import * as moment from "moment";
class RelativePeriod {
    periodType: DefaultPeriodType;
    private _period: IPeriod;
    get period(): IPeriod {
        return this._period;
    }
    public constructor(periodType: DefaultPeriodType, period: IPeriod) {
        console.debug("RelativePeriod constructor start,preiodType:",periodType);
        this.periodType = periodType;
        this._period = period;
        console.debug(period.dateStart+"~"+period.dateEnd);
    }
}
export class RelativeReriodHelper {
    private _relativePeriods: RelativePeriod[] = [];
    private _baseMoment: moment.Moment;
    get baseMoment(){
        return moment(this._baseMoment);
    }
    public getPeriod(periodType: DefaultPeriodType): IPeriod {
        console.debug("RelativeReriodHelper getPeriod start");
        let result: IPeriod;
        console.log("input preiodType",periodType);
        for (const key in this._relativePeriods) {
            if (this._relativePeriods.hasOwnProperty(key)) {
                console.debug("key",key);
                let relativePeriod = this._relativePeriods[key];
                console.debug(relativePeriod.periodType);
                if (relativePeriod.periodType == periodType) {
                    result = relativePeriod.period;
                    console.debug("period found",result.dateStart+"~"+result.dateEnd);
                }
            }
        }
        return result;
    }
    public constructor(relativeToday: boolean,firstDayOfWeek:number) {
        console.debug("RelativePeriod helper constructor start");
        moment.locale("cn",{
            week:{
                dow:firstDayOfWeek,
                doy:7
            }
        });
        this._baseMoment = relativeToday ? moment() : moment().subtract(1, "day");
        this._relativePeriods.push(this.getLastWeek(), this.getLastMonth(), this.getLastEntireWeek(), this.getLastEntireMonth());
        console.debug("this._baseMoment:" + this.baseMoment.format());
        console.debug("RelativePeriodHelper constuctor end");
    }
    private getLastWeek(): RelativePeriod {
        const start: Date = this.baseMoment.subtract(6, "days").startOf("day").toDate();
        const end: Date = this.baseMoment.endOf("day").toDate();
        return new RelativePeriod(DefaultPeriodType.LastWeek, new Period(start, end));
    }
    private getLastMonth(): RelativePeriod {
        const start: Date = this.baseMoment.subtract(1, "month").add(1, "day").startOf("day").toDate();
        const end: Date = this.baseMoment.endOf("day").toDate();
        return new RelativePeriod(DefaultPeriodType.LastMonth, new Period(start, end));
    }
    private getLastEntireMonth(): RelativePeriod {
        const start: Date = this.baseMoment.subtract(1, "month").startOf("month").toDate();
        const end: Date = this.baseMoment.subtract(1, "month").endOf("month").toDate();
        return new RelativePeriod(DefaultPeriodType.LastEntireMonth, new Period(start, end));
    }
    private getLastEntireWeek(): RelativePeriod {
        const start: Date = this.baseMoment.subtract(1, "week").startOf("week").toDate();
        const end: Date = this.baseMoment.subtract(1, "week").endOf("week").toDate();
        return new RelativePeriod(DefaultPeriodType.LastEntireWeek, new Period(start, end));
    }
}
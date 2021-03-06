"use strict";
import * as d3 from "d3";
import {IPeriod,Period} from "./datePeriod";
import * as moment from "moment";
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;
export interface IPeriodSelectorManager{
    dateSelector_Start:Selection<HTMLInputElement>;
    dateSelector_End:Selection<HTMLInputElement>;
    period:IPeriod;
    defaultPeriod:IPeriod;
}
export class PeriodSelectorManager implements IPeriodSelectorManager{
    public constructor(dateSelector_Start:Selection<HTMLInputElement>,dateSelector_End:Selection<HTMLInputElement>){
        this._dateSelector_Start=dateSelector_Start;
        this._dateSelector_End=dateSelector_End;
    }
    private _dateSelector_Start:Selection<HTMLInputElement>;
    private _dateSelector_End:Selection<HTMLInputElement>;
    get dateSelector_Start():Selection<HTMLInputElement>{
        return this._dateSelector_Start;
    }
    get dateSelector_End():Selection<HTMLInputElement>{
        return this._dateSelector_End;
    }
    get period():IPeriod{
        let start:Date=this._dateSelector_Start.property("value")?moment(this._dateSelector_Start.property("value")).startOf("day").toDate():null;
        let end:Date=this._dateSelector_End.property("value")?moment(this._dateSelector_End.property("value")).endOf("day").toDate():null;
        if(start&&end&&start>end){
            
            this._dateSelector_End.property("value",this._dateSelector_Start.property("value")); 
            end=start;
        }
        return new Period(start,end);
    }
    private _defaultPeriod:IPeriod=new Period();
    get defaultPeriod(){
        return this._defaultPeriod;
    }
    set defaultPeriod(newDefaultPeriod:IPeriod){
        let defaultPeriodChanged:boolean=false;
        if(((!this._defaultPeriod.dateStart)&&newDefaultPeriod.dateStart)||
            (this._defaultPeriod.dateStart&&newDefaultPeriod.dateStart&&(newDefaultPeriod.dateStart.getTime()-this._defaultPeriod.dateStart.getTime()!=0))){
            defaultPeriodChanged=true;
            let newStartStr=moment(newDefaultPeriod.dateStart).format("YYYY-MM-DD");
            
            this._dateSelector_Start.property("value",newStartStr);
            
        }
        if(((!this._defaultPeriod.dateEnd)&&newDefaultPeriod.dateEnd)||
        (this._defaultPeriod.dateEnd&&newDefaultPeriod.dateEnd&&(newDefaultPeriod.dateEnd.getTime()-this._defaultPeriod.dateEnd.getTime()!=0))){
            defaultPeriodChanged=true;
            let newEndStr=moment(newDefaultPeriod.dateEnd).format("YYYY-MM-DD");
            this._dateSelector_End.property("value",newEndStr);
        }
        this._defaultPeriod=newDefaultPeriod;
        if(defaultPeriodChanged){
            this._dateSelector_Start.dispatch("change");
        }
    }
}
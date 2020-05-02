/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";
//powerbi and d3
import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionId = powerbi.extensibility.ISelectionId;
import * as d3 from "d3";
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;
import { VisualSettings } from "./settings/visualSettings";
import { stratify, rgb } from "d3";
import * as models from 'powerbi-models';
import { IAdvancedFilter } from "powerbi-models";
import IVisualEventService=powerbi.extensibility.IVisualEventService;
import {pixelConverter} from "powerbi-visuals-utils-typeutils";
//custom
import { IPeriod, Period, DefaultPeriodType,OrientationType } from "./settings/datePeriod/datePeriod";
import { RelativePeriodHelper } from "./settings/datePeriod/relativePeriodHelper";
import { IPeriodSelectorManager, PeriodSelectorManager } from "./settings/datePeriod/periodSelectorManager";
//third party
import * as moment from "moment";

export class Visual implements IVisual {
    //pbi
    private host: IVisualHost;
    private settings: VisualSettings;
    private category: powerbi.DataViewCategoryColumn;
    private selectionManager: powerbi.extensibility.ISelectionManager;
    private events: IVisualEventService;

    //others
    private container: Selection<HTMLElement>;
    private periodSelectorManager: IPeriodSelectorManager;
    constructor(options: VisualConstructorOptions) {
        //pbi
        //console.log('Visual constructor', options);
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();
        this.events = options.host.eventService;
        //others
        this.container = d3.select(options.element).classed("container", true).append("div");
        if (document) {
            const dateSelector_Start = this.container.append("input")
                .attr("type", "date")
                .style("margin", "4px");
            const dateSelector_End = this.container.append("input")
                .attr("type", "date")
                .style("margin", "4px");
            dateSelector_Start.on("input change", () => { this.filterPeriod(); });
            dateSelector_End.on("input change", () => { this.filterPeriod(); });
            this.periodSelectorManager = new PeriodSelectorManager(dateSelector_Start, dateSelector_End);
            //Select datePeriod when click this button
            this.container.on('contextmenu', () => {
                const mouseEvent: MouseEvent = <MouseEvent>d3.event;
                //const eventTarget: EventTarget = mouseEvent.target;
                //let dataPoint = d3.select(eventTarget).datum();
                this.selectionManager.showContextMenu({}, {
                    x: mouseEvent.clientX,
                    y: mouseEvent.clientY
                });
                mouseEvent.preventDefault();
            });
        }
    }
    public update(options: VisualUpdateOptions) {
        //pbi
        this.events.renderingStarted(options);
        this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
        let dataView = options.dataViews[0];
        this.category = dataView.categorical.categories[0];
        //style
        let width: number = options.viewport.width;
        if(this.settings.datePickers.backgroundTransparency<0||this.settings.datePickers.backgroundTransparency>1){
            this.settings.datePickers.backgroundTransparency=0;
        }
        let backgroundColor=d3.rgb(this.settings.datePickers.backgroundColor).rgb();
        let backgroundColorWithTransparency=rgb(backgroundColor.r,backgroundColor.g,backgroundColor.b,1-this.settings.datePickers.backgroundTransparency).toString();
        let fontSize:number=pixelConverter.fromPointToPixel(this.settings.datePickers.textSize);
        let datePickerWidth:number=(this.settings.datePickers.orientationType==OrientationType.Horizontal)?width/2-10-4*this.settings.datePickers.borderWidth:width-10-2*this.settings.datePickers.borderWidth;
        //Set style for these date-pickers one-by-one, but not group by class
        this.periodSelectorManager.dateSelector_Start
            .style("width", datePickerWidth + "px")
            .style("font-size",fontSize+"px")
            .style("color",this.settings.datePickers.fontColor)
            .style("background-color",backgroundColorWithTransparency)
            .style("border-width",this.settings.datePickers.borderWidth+"px")
            .style("border-color",this.settings.datePickers.borderColor)
            .style("outline-color",this.settings.datePickers.outlineColor)
            .style("display", (this.settings.datePickers.orientationType==OrientationType.Horizontal)?"inline":"block");
        this.periodSelectorManager.dateSelector_End
            .style("width", datePickerWidth+"px")
            .style("font-size",fontSize+"px")
            .style("color",this.settings.datePickers.fontColor)
            .style("background-color",backgroundColorWithTransparency)
            .style("border-width",this.settings.datePickers.borderWidth+"px")
            .style("border-color",this.settings.datePickers.borderColor)
            .style("display", (this.settings.datePickers.orientationType==OrientationType.Horizontal)?"inline":"block");
        //set new default period
        let newDefaultPeriod: IPeriod = new Period();
        if (this.settings.period.defaultPeriodType == DefaultPeriodType.Custom) {

            dataView.categorical.values.map((measure: powerbi.DataViewValueColumn, index: number) => {
                let measureDate: Date = moment(measure.values[0].toString()).startOf("day").toDate();
                if (measure.source.roles["StartDate"]) {
                    newDefaultPeriod.dateStart = measureDate;
                }
                if (measure.source.roles["EndDate"]) {
                    newDefaultPeriod.dateEnd = measureDate;
                }
            });
        } else {
            let relativePeriodHelper: RelativePeriodHelper = new RelativePeriodHelper(this.settings.period.relativeToday, this.settings.period.firstDayOfWeek);
            newDefaultPeriod = relativePeriodHelper.getPeriod(this.settings.period.defaultPeriodType);
        }
        this.periodSelectorManager.defaultPeriod = newDefaultPeriod;
        this.events.renderingFinished(options);
    }
    private filterPeriod() {
        //determine period from dateSelectors
        let period: IPeriod = this.periodSelectorManager.period;
        let target: models.IFilterColumnTarget;
        let splitPosition:number=this.category.source.queryName.indexOf('.');
        let tableName:string=this.category.source.queryName.substr(0, splitPosition);
        let fieldName:string=this.category.source.queryName.substr(splitPosition+1,this.category.source.queryName.length-splitPosition-1);
        target = {
            table: tableName, // table
            column: fieldName // col1
        };

        //filter
        let conditions: models.IAdvancedFilterCondition[] = [];
        if (period.dateStart) {
            conditions.push(
                {
                    operator: "GreaterThanOrEqual",
                    value: period.dateStart.toJSON()
                }
            );
        }
        if (period.dateEnd) {
            conditions.push(
                {
                    operator: "LessThanOrEqual",
                    value: period.dateEnd.toJSON()
                }
            );
        }
        let filter: IAdvancedFilter = {
            // tslint:disable-next-line: no-http-string
            "$schema": "http://powerbi.com/product/schema#advanced",
            "target": target,
            "filterType": models.FilterType.Advanced,
            "logicalOperator": "And",
            "conditions": conditions
        };
        this.host.applyJsonFilter((period.dateStart || period.dateEnd) ? filter : null, "general", "filter", powerbi.FilterAction.merge);

    }
    private static parseSettings(dataView: DataView): VisualSettings {
        return <VisualSettings>VisualSettings.parse(dataView);
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
    }
}
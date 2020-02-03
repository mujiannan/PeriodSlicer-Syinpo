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
import { VisualSettings } from "./settings/settings";
import { stratify } from "d3";
import * as models from 'powerbi-models';
import { IAdvancedFilter } from "powerbi-models";
//custom
import { IPeriod, Period, DefaultPeriodType } from "./settings/datePeriod/datePeriod";
import { RelativeReriodHelper } from "./settings/datePeriod/relativePeriodHelper";
import { IPeriodSelectorManager, PeriodSelectorManager } from "./settings/datePeriod/periodSelectorManager";
//third party
import * as moment from "moment";
export class Visual implements IVisual {
    //pbi
    private host: IVisualHost;
    private settings: VisualSettings;
    private category: powerbi.DataViewCategoryColumn;
    private selectionManager: powerbi.extensibility.ISelectionManager;

    //others
    private container: Selection<HTMLElement>;
    private periodSelectorManager: IPeriodSelectorManager;
    constructor(options: VisualConstructorOptions) {
        //pbi
        //console.log('Visual constructor', options);
        console.debug("visual constructor start");
        this.host = options.host;
        this.selectionManager=this.host.createSelectionManager();
        //others
        this.container = d3.select(options.element).classed("container", true);
        if (document) {
            const dateSelector_Start = this.container.append("input")
                .attr("type", "date")
                .style("margin", "2px 10px 2px 2px");
            const dateSelector_End = this.container.append("input")
                .attr("type", "date")
                .style("margin", "2px 0px 0px 2px");
            dateSelector_Start.on("input change", () => { this.filterPeriod(); });
            dateSelector_End.on("input change", () => { this.filterPeriod(); });
            this.periodSelectorManager = new PeriodSelectorManager(dateSelector_Start, dateSelector_End);
            //Select datePeriod when click this button

            this.container.on('contextmenu', () => {
                const mouseEvent: MouseEvent = d3.event as MouseEvent;
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
        console.debug("update start");
        //pbi
        this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
        let dataView = options.dataViews[0];
        console.debug("dataView", dataView);
        //set date series
        this.category = dataView.categorical.categories[0];
        //set new default period
        let newDefaultPeriod: IPeriod = new Period();
        if (this.settings.period.defaultPeriodType == DefaultPeriodType.Custom) {
            console.debug("user select custom defaultPeriod");
            dataView.categorical.values.map((messure: powerbi.DataViewValueColumn, index: number) => {
                console.debug("1");
                console.debug(messure.values[0]);
                console.debug("2");
                let messureDate: Date = moment(messure.values[0].toString()).startOf("day").toDate();
                console.debug("messureDate", messureDate);
                if (messure.source.roles["StartDate"]) {
                    newDefaultPeriod.dateStart = messureDate;
                }
                if (messure.source.roles["EndDate"]) {
                    newDefaultPeriod.dateEnd = messureDate;
                }
            });
        } else {
            console.debug("user select " + this.settings.period.defaultPeriodType.toString() + "\ defaultPeriod");
            console.debug("firstDayOfWeek", this.settings.period.firstDayOfWeek);
            let relativePeriodHelper: RelativeReriodHelper = new RelativeReriodHelper(this.settings.period.relativeToday, this.settings.period.firstDayOfWeek);
            newDefaultPeriod = relativePeriodHelper.getPeriod(this.settings.period.defaultPeriodType);
        }
        this.periodSelectorManager.defaultPeriod = newDefaultPeriod;
        console.debug("update end");
    }
    private filterPeriod() {
        //determine period from dateSelectors
        console.debug("filter start");
        let period: IPeriod = this.periodSelectorManager.period;
        let target: models.IFilterColumnTarget;
        try {
            target = {
                table: this.category.source.queryName.substr(0, this.category.source.queryName.indexOf('.')), // table
                column: this.category.source.displayName // col1
            };
        }
        catch (e) {
            console.log(e);
        }
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
            "$schema": "http://powerbi.com/product/schema#advanced",
            "target": target,
            "filterType": models.FilterType.Advanced,
            "logicalOperator": "And",
            "conditions": conditions
        };
        this.host.applyJsonFilter((period.dateStart || period.dateEnd) ? filter : null, "general", "filter", powerbi.FilterAction.merge);
        console.debug("applyFilter end");
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
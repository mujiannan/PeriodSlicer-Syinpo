"use strict";
import { OrientationType } from "./datePeriod";
export class DatePickerSetting {
  public orientationType: OrientationType = OrientationType.Horizontal;
  public textSize: number = 9;
  public fontColor: string = "black";
  public backgroundColor: string = "white";
  public backgroundTransparency: number = 0;
  public borderWidth: number = 1;
  public borderColor: string = "lightgray";
  public outlineColor: string = "blue";
}
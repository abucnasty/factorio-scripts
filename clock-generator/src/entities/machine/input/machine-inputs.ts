import { MapExtended } from "../../../data-types";
import { ItemName } from "../../../data";
import { MachineInput } from "./machine-input";

export class MachineInputs extends MapExtended<ItemName, MachineInput> {

    constructor(entries?: readonly (readonly [ItemName, MachineInput])[] | null) {
        super(entries);
    }
}
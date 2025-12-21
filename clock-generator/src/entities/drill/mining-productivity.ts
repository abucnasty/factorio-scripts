import { Percentage } from "../../data-types";

export interface MiningProductivity {
    readonly productivity: Percentage;
}


function createFromResearchLevel(level: number): MiningProductivity {
    return {
        productivity: new Percentage((level - 1) * 10)
    };
}


export const MiningProductivity = {
    fromLevel: createFromResearchLevel
}
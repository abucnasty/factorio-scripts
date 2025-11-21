import {
    DeciderCombinatorCondition,
    DeciderCombinatorOutput
} from "./decider-combinator";


export interface DeciderConditions {
    readonly conditions?: DeciderCombinatorCondition[],
    readonly outputs?: DeciderCombinatorOutput[],
}

export interface ControlBehavior {
    readonly decider_conditions?: DeciderConditions
}

export class ControlBehaviorBuilder {
    private deciderConditions?: DeciderCombinatorCondition[] = undefined;
    private outputs?: DeciderCombinatorOutput[] = undefined;

    public setDeciderConditions(conditions: DeciderCombinatorCondition[]): ControlBehaviorBuilder {
        this.deciderConditions = conditions;
        return this;
    }

    public setOutputs(outputs: DeciderCombinatorOutput[]): ControlBehaviorBuilder {
        this.outputs = outputs;
        return this;
    }

    public build(): ControlBehavior {
        if (this.deciderConditions === undefined && this.outputs === undefined) {
            return {};
        }

        if (this.deciderConditions?.length === 0 && this.outputs?.length === 0) {
            return {};
        }

        return {
            decider_conditions: {
                conditions: this.deciderConditions,
                outputs: this.outputs,
            }
        };
    }
}
import { ConstantCombinatorSection } from "./constant-combinator";
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
    readonly sections?: ConstantCombinatorSection[]
}

export class ControlBehaviorBuilder {
    private deciderConditions?: DeciderCombinatorCondition[] = undefined;
    private sections?: ConstantCombinatorSection[] = undefined;
    private outputs?: DeciderCombinatorOutput[] = undefined;

    public setDeciderConditions(conditions: DeciderCombinatorCondition[]): ControlBehaviorBuilder {
        this.deciderConditions = conditions;
        return this;
    }

    public setOutputs(outputs: DeciderCombinatorOutput[]): ControlBehaviorBuilder {
        this.outputs = outputs;
        return this;
    }

    public setSections(sections: ConstantCombinatorSection[]): ControlBehaviorBuilder {
        this.sections = sections;
        return this;
    }

    public build(): ControlBehavior {

        // for decider combinators
        if (this.sections) {
            return {
                sections: this.sections,
            }
        }

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
            },
            sections: this.sections,
        };
    }
}
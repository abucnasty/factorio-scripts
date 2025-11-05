import { Fraction } from "fraction.js";
import { createBlueprint, createBlueprintBook, createItemSignal, encodeBlueprintJSON } from "./utility/blueprints.js";
import { lcm } from "mathjs"
import { distributeEvenly } from "./utility/range.js"

const STACK_Q5_SWING = {
    BELT: 12,
    DIRECT: 8,
    SWING_ANIMATION: 4,
}

const CLOCK_SIGNAL = {
    "type": "virtual",
    "name": "signal-clock"
}

function createDeciderConditions(output_signal, ranges) {
    return {
        "conditions": ranges,
        "outputs": [
            {
                "signal": output_signal,
                "copy_count_from_input": false
            }
        ]
    }
}

function createClockConditions(max, step) {
    return {
        "conditions": [
            {
                "first_signal": CLOCK_SIGNAL,
                "constant": max - 1
            }
        ],
        "outputs": [
            {
                "signal": CLOCK_SIGNAL,
                "copy_count_from_input": false,
                "constant": step
            },
            {
                "signal": CLOCK_SIGNAL
            }
        ]
    }
}

function conditionRange(startInclusive, endInclusive) {
    return [
        {
            "first_signal": CLOCK_SIGNAL,
            "constant": startInclusive,
            "comparator": "≥"
        },
        {
            "first_signal": CLOCK_SIGNAL,
            "constant": endInclusive,
            "comparator": "≤",
            "compare_type": "and"
        },
    ]
}



function secondsToTicks(seconds) {
    return seconds * 60
}

/**
 * 
 * @param {Fraction} count 
 * @param {string} item 
 * @returns 
 */
function swingDescription(count, item) {
    let swing = "swing"
    if (count.round() > 1) {
        swing = "swings"
    }

    return `[item=${item}] ${count.toFraction()} ${swing}`
}


function createDeciderCombinator(decider_conditions, description = "") {
    return {
        "name": "decider-combinator",
        "position": {
            "x": 0,
            "y": 0
        },
        "control_behavior": {
            "decider_conditions": decider_conditions
        },
        "player_description": description
    }
}

const config = {
    book_name: "electric mining drill clocks",
    required_output_per_second: 10,
    number_of_machines: 1,
    recipe: {
        inputs: {
            "advanced-circuit": {
                count: 5,
                inserter_count: 1,
                stack_size: 16,
                swing_duration: STACK_Q5_SWING.BELT
            },
            "steel-plate": {
                count: 10,
                inserter_count: 1,
                stack_size: 16,
                swing_duration: STACK_Q5_SWING.DIRECT
            },
            "stone-brick": {
                count: 10,
                inserter_count: 3,
                stack_size: 16,
                swing_duration: STACK_Q5_SWING.DIRECT
            },
            "stone": {
                count: 10 / (1 + 50 / 100) / 3,
                inserter_count: 1,
                swing_duration: 0,
                stack_size: 80,
                // I don't like adding a random "type" here but eh... it works
                type: "loader"
            }
        },
        output: {
            type: "electric-furnace",
            count: 1,
            stack_size: 16,
            swing_duration: STACK_Q5_SWING.BELT,
            swing_count: 1
        }
    },
    productivity: 0
}

function main() {
    const {
        required_output_per_second,
        number_of_machines,
        recipe,
        productivity,
    } = config;

    const output_configuration = {
        type: recipe.output.type,
        start_inclusive: 1,
        stack_size: recipe.output.stack_size,
        end_inclusive: recipe.output.swing_count * recipe.output.swing_duration,
        swing_count: recipe.output.swing_count
    }

    const output_per_machine = required_output_per_second / number_of_machines

    const crafting_cycle_ticks = secondsToTicks(output_configuration.stack_size / output_per_machine * output_configuration.swing_count)

    const input_multiplier_per_second = required_output_per_second / recipe.output.count / (1 + productivity / 100)

    const input_multiplier_per_cycle = input_multiplier_per_second / 60 * crafting_cycle_ticks

    const input_configurations = []

    Object.entries(recipe.inputs).forEach(([ingredient, { count, swing_duration, stack_size, inserter_count, type }]) => {
        const input_per_cycle = input_multiplier_per_cycle * count

        const swings_per_cycle = input_per_cycle / stack_size / inserter_count

        input_configurations.push({
            type: ingredient,
            swings_per_cycle: swings_per_cycle,
            inserter_count: inserter_count,
            swing_duration,
            insertion_type: type
        })
    })


    let least_common_multiple = 1;

    if (input_configurations.some(it => new Fraction(it.swings_per_cycle).d != 1)) {
        // there is a fractional amount being used here, need to compute least common multiple to have absolute swing counts now
        least_common_multiple = lcm(1, ...input_configurations.map(it => new Fraction(it.swings_per_cycle).d))
    }

    const total_cycles = output_configuration.swing_count * least_common_multiple
    input_configurations.forEach(it => {
        const total_swings_required = it.swings_per_cycle * least_common_multiple

        const swing_distribution = distributeEvenly(total_swings_required, least_common_multiple)

        it.swing_distribution = swing_distribution
    })

    output_configuration.swing_distribution = distributeEvenly(output_configuration.swing_count * least_common_multiple, least_common_multiple)

    const full_clock_ticks = crafting_cycle_ticks * least_common_multiple;

    // CLOCK
    console.log(`Total Clock Duration: ${full_clock_ticks} ticks with ${total_cycles} crafting cycles(s) of ${crafting_cycle_ticks} ticks`)

    const clockConditions = createClockConditions(full_clock_ticks, 1)
    const clockDescription = [
        swingDescription(new Fraction(output_configuration.swing_count), output_configuration.type),
        ...input_configurations.map(it => swingDescription(new Fraction(it.swings_per_cycle), it.type))
    ].join("\n")
    const wires = [[1, 2, 1, 4]]
    const clock_blueprint = createBlueprint("clock", CLOCK_SIGNAL, [
        createDeciderCombinator(clockConditions, clockDescription)
    ], wires)

    // OUTPUT DECIDER COMBINATOR
    const output_blueprint = createBlueprint(
        output_configuration.type,
        createItemSignal(output_configuration.type),
        [
            createDeciderCombinator(
                createDeciderConditions(
                    createItemSignal(output_configuration.type),
                    [...Array(least_common_multiple).keys()].flatMap((_, index) => {
                        const start_inclusive = output_configuration.start_inclusive + index * crafting_cycle_ticks
                        const end_inclusive = start_inclusive + output_configuration.end_inclusive - STACK_Q5_SWING.SWING_ANIMATION
                        console.log(`-- output: [${output_configuration.type}]::[cycle=${index + 1}] ${output_configuration.swing_count} swing(s) between ticks [${start_inclusive}, ${end_inclusive}]`)
                        return conditionRange(start_inclusive, end_inclusive)
                    })
                )
            )
        ]
    )

    // INPUT DECIDER COMBINATORS
    const ingredient_blueprints = input_configurations.map(it => {

        const ranges = it.swing_distribution.flatMap((swings, index) => {
            // const start_inclusive = output_configuration.end_inclusive + 1 + index * crafting_cycle_ticks
            const start_inclusive = output_configuration.end_inclusive + 1 + index * crafting_cycle_ticks
            let end_inclusive = start_inclusive + swings * it.swing_duration

            if (it.insertion_type != "loader") {
                end_inclusive = end_inclusive - STACK_Q5_SWING.SWING_ANIMATION
            }

            console.log(`-- input: [${it.type}]::[cycle=${index + 1}] ${swings} swings using ${it.inserter_count} inserters between [${start_inclusive}, ${end_inclusive}]`)
            return conditionRange(start_inclusive, end_inclusive)
        })
        const itemSignal = createItemSignal(it.type)
        const conditions = createDeciderConditions(itemSignal, ranges)
        const entity = createDeciderCombinator(conditions)
        return createBlueprint(it.type, createItemSignal(it.type), [entity])
    })

    const book = createBlueprintBook(
        config.book_name,
        [
            clock_blueprint,
            output_blueprint,
            ...ingredient_blueprints
        ]
    )

    console.log("")
    console.log(`Generated Blueprint book: ${book.blueprint_book.label}`)
    book.blueprint_book.blueprints.forEach(({ blueprint }) => {
        console.log(`-- ${blueprint.label}`)
    })
    console.log(encodeBlueprintJSON(book))

}

main()
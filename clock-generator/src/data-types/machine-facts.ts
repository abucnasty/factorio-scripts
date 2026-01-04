/**
 * Serializable machine facts for displaying computed machine information in the UI.
 * All values are primitive types for JSON serialization compatibility.
 */

export interface SerializableMachineInput {
    /** Name of the input ingredient */
    item_name: string;
    /** Consumption rate in items per second */
    consumption_rate_per_second: number;
    /** Automated insertion limit quantity */
    automated_insertion_limit: number;
    /** Required amount per craft */
    amount_per_craft: number;
}

export interface SerializableMachineFacts {
    /** Recipe name */
    recipe: string;
    /** Machine crafting speed multiplier */
    crafting_speed: number;
    /** Productivity bonus percentage */
    productivity: number;
    /** Machine type (machine or furnace) */
    type: string;
    /** Output item name */
    output_item: string;
    /** Amount produced per craft (including productivity) */
    output_per_craft: number;
    /** Output rate in items per second */
    output_rate_per_second: number;
    /** Output block size (items per output cycle) */
    output_block_size: number;
    /** Overload multiplier value */
    overload_multiplier: number;
    /** Ticks required per craft */
    ticks_per_craft: number;
    /** Ticks per bonus craft from productivity */
    ticks_per_bonus_craft: number;
    /** Insertion duration before overload lockout in ticks */
    insertion_duration_ticks: number;
    /** Input ingredient facts */
    inputs: SerializableMachineInput[];
}

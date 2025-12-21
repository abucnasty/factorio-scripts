# Factorio Clock Generator

A TypeScript-based simulation and blueprint generation tool for Factorio that creates precise circuit-controlled production setups. This tool simulates machine crafting cycles, inserter timing, and generates blueprints with clock signals to ensure deterministic, perfectly-timed production systems.

## Purpose

This tool solves the challenge of creating perfectly synchronized production setups in Factorio by:

1. **Simulating** the exact behavior of machines, inserters, and belts tick-by-tick
2. **Analyzing** when inserters should be enabled/disabled to maintain stable production
3. **Generating** blueprints with decider combinators that provide clock signals to control inserters
4. **Optimizing** for minimal inserter swings while maximizing throughput

The generated blueprints use circuit network clocks to control when inserters are enabled, preventing common issues like:
- Machine inventory overflow/underflow
- Inserter timing conflicts
- Production instability and desynchronization
- Suboptimal throughput

## Installation

```bash
npm install
```

## Usage

### Basic Usage

1. Choose or create a configuration in `src/config/examples.ts`
2. Update `src/multi-machine-poc.ts` to use your desired config:

```typescript
import { Config } from './config/config';
import * as EXAMPLES from './config/examples';
import { DebugSettingsProvider } from './crafting/sequence/debug/debug-settings-provider';
import { generateClockForConfig } from './crafting/generate-blueprint';
import { encodeBlueprintFile } from "./blueprints/serde";

// Select your configuration
const config: Config = EXAMPLES.LOGISTIC_SCIENCE_SHARED_INSERTER_CONFIG;

const debug = DebugSettingsProvider.mutable();
const result = generateClockForConfig(config, debug);

console.log("----------------------");
console.log(encodeBlueprintFile({
    blueprint: result.blueprint
}));
```

3. Run the generator:

```bash
npm run dev
```

4. Copy the output blueprint string and import it into Factorio

### Configuration Example

Here's a complete configuration for a utility science pack setup:

```typescript
export const UTILITY_SCIENCE_CONFIG: Config = {
    target_output: {
        recipe: "utility-science-pack",
        items_per_second: 120,        // Target production rate
        machines: 7,                  // Number of machines in your build
    },
    machines: [
        {
            id: 1,
            recipe: "utility-science-pack",
            productivity: 100,          // Productivity bonus percentage
            // obtained by hovering over machine and executing 
            // `/c game.print(game.player.selected.crafting_speed)`
            crafting_speed: 68.90625,
        },
    ],
    inserters: [
        {
            source: { type: "belt", id: 1 },
            sink: { type: "machine", id: 1 },
            filters: ["low-density-structure", "processing-unit"],
            stack_size: 16,             // Stack inserter capacity bonus
        },
        {
            source: { type: "belt", id: 2 },
            sink: { type: "machine", id: 1 },
            stack_size: 16,
            filters: ["low-density-structure", "flying-robot-frame"]
        },
        {
            source: { type: "machine", id: 1 },
            sink: { type: "belt", id: 1 },
            filters: ["utility-science-pack"],
            stack_size: 16,
        },
    ],
    belts: [
        {
            id: 1,
            type: "turbo-transport-belt",
            lanes: [
                {
                    ingredient: "low-density-structure",
                    stack_size: 4       // Items per stack on belt
                },
                {
                    ingredient: "processing-unit",
                    stack_size: 4
                }
            ]
        },
        {
            id: 2,
            type: "turbo-transport-belt",
            lanes: [
                {
                    ingredient: "low-density-structure",
                    stack_size: 4
                },
                {
                    ingredient: "flying-robot-frame",
                    stack_size: 4
                }
            ]
        }
    ]
};
```

## How It Works

### Three-Phase Simulation Process

The `generateClockForConfig` function executes three distinct steps:

#### 1. **Prepare Phase**
- Simulates until all machines reach output-blocked state
- Establishes steady-state inventory levels
- Determines the crafting cycle baseline

#### 2. **Warmup Phase**
- Runs the simulation for multiple cycles with clock controls enabled
- Ensures the system reaches a stable, repeating state
- Validates that the timing windows are correct

#### 3. **Simulate Phase**
- Records the exact tick ranges when each inserter transfers items
- Captures a complete production cycle
- Generates timing data for the clock signals

### Output

The tool generates a Factorio blueprint containing:
- **Decider combinators** that act as clock signals
- **Timing ranges** for each inserter (when they should be enabled)
- **Properly configured** circuit connections to control inserters

### Key Concepts

- **Overload Multiplier**: Intentionally allows machines to build up input inventory, reducing inserter swing counts
- **Automated Insertion Limit**: Factorio's per-ingredient inventory limits that affect stability
- **Fast-Crafting Stability Threshold**: Automatically detects when machines craft too quickly for always-enabled inserters

## Advanced Configuration

### Mining Drill Support

For direct-insertion mining setups:

```typescript
drills: [
    {
        id: 1,
        type: "electric-mining-drill",
        mined_item_name: "stone",
        speed_bonus: 2.5,  // Get from: /c game.print(game.player.selected.speed_bonus)
        target: { type: "machine", id: 1 }
    }
]
```

### Configuration Overrides

```typescript
overrides: {
    output_swings: 3,           // Force specific output inserter swing count
    terminal_swing_count: 4,    // Override calculated max swings
    lcm: 12                     // Override LCM calculation for cycle length
}
```

## Troubleshooting

### Common Issues

**Issue**: Generated blueprint doesn't work in-game
- Verify your crafting speed and productivity match in-game values exactly
- Check that stack inserter capacity bonuses are correct
- Ensure belt configuration matches your actual setup

**Issue**: Simulation takes too long
- Reduce the number of machines in your configuration
- Check for configuration errors causing infinite loops
- Ensure ingredients are available on belts

**Issue**: Unstable production in-game
- The tool automatically detects fast-crafting instability (threshold: 3.0)
- Review console output for stability warnings
- Consider adjusting configuration parameters

## Development

### Project Structure

```
src/
├── config/           # Configuration definitions and examples
├── crafting/         # Core simulation and blueprint generation
│   ├── runner/       # Step-based execution framework
│   └── sequence/     # Simulation logic and interceptors
├── control-logic/    # Entity behavior and state machines
├── entities/         # Machine, inserter, and belt models
└── blueprints/       # Blueprint encoding/decoding
```

### Running Tests

```bash
npm test
```

## License

MIT

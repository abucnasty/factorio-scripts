import { fraction, evaluate, isProper, isEqual } from 'fractionability';
import { FactorioDataService } from './data/factorio-data-service';
import { InserterFactory } from './crafting/inserter';
import { MachineFactory } from './crafting/machine';
import { CraftingCycleFactory } from './crafting/crafting-cycle';
import { OverloadMultiplierFactory } from './crafting/overload-multipliers';


// compute crafting cycle

console.log(FactorioDataService.findRecipeOrThrow("advanced-circuit"));


console.log(InserterFactory.fromMachineToMachine(16));
console.log(InserterFactory.fromBeltToMachine(16));
console.log(InserterFactory.fromMachineToBelt(16));


console.log("--------------");
console.log("red circuit machine");
console.log("--------------");

const redCircuitMachine = MachineFactory.createMachine(1, {
    recipe: "advanced-circuit",
    productivity: 175,
    crafting_speed: 83.9,
})
console.log({
    redCircuitMachine,
    result: redCircuitMachine.recipe.results[0],
})

console.log("--------------");


console.log("--------------");
console.log("green circuit machine");
console.log("--------------");

const greenCircuitMachine = MachineFactory.createMachine(1, {
    recipe: "electronic-circuit",
    productivity: 175,
    crafting_speed: 63.75,
})
console.log(JSON.stringify(greenCircuitMachine, null, 2));

console.log("--------------");


const craftingCycle = CraftingCycleFactory.fromMachine(redCircuitMachine)
console.log(craftingCycle)
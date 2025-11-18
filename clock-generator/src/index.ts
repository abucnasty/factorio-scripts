import { InserterFactory, MachineInteractionPoint } from './crafting/inserter';
import { MachineFactory, printMachineFacts } from './crafting/machine';
import { Config } from './config/config';
import { MachineRegistry } from './crafting/machine-registry';
import { computeInserterTickTimingForMachine } from './inserter-swing-logic/inserter-tick-timing';
import { InserterRegistry } from './crafting/inserter-registry';

const machineConfigs = [
    {
        id: 1,
        recipe: "productivity-module",
        productivity: 50,
        crafting_speed: 124.65,
    },
    {
        id: 2,
        recipe: "electronic-circuit",
        productivity: 175,
        crafting_speed: 63.75,
    },
    {
        id: 3,
        recipe: "advanced-circuit",
        productivity: 175,
        crafting_speed: 83.9,
    }
]

const productivityModuleMachineConfig = machineConfigs[0];
const electronicCircuitMachineConfig = machineConfigs[1];
const advancedCircuitMachineConfig = machineConfigs[2];

const config: Config = {
    target_output: {
        recipe: "productivity-module",
        items_per_second: 40,
        machines: 3,
    },
    machines: [
        {
            id: 1,
            recipe: "productivity-module",
            productivity: 50,
            crafting_speed: 135.05,
        },
        {
            id: 2,
            recipe: "electronic-circuit",
            productivity: 175,
            crafting_speed: 63.75,
        },
        {
            id: 3,
            recipe: "advanced-circuit",
            productivity: 175,
            crafting_speed: 100.05,
        }
    ],
    inserters: [
        {
            source: { type: "machine", machine_id: electronicCircuitMachineConfig.id },
            target: { type: "machine", machine_id: productivityModuleMachineConfig.id },
            stack_size: 16,
        },
        {
            source: { type: "machine", machine_id: electronicCircuitMachineConfig.id },
            target: { type: "machine", machine_id: advancedCircuitMachineConfig.id },
            stack_size: 16,
        },
        {
            source: { type: "machine", machine_id: advancedCircuitMachineConfig.id },
            target: { type: "machine", machine_id: productivityModuleMachineConfig.id },
            stack_size: 16,
        },
        {
            source: { type: "machine", machine_id: productivityModuleMachineConfig.id },
            target: { type: "belt", ingredient: "productivity-module" },
            stack_size: 16,
        },
    ],
};


const main = () => {
    const machineRegistry = new MachineRegistry();
    const inserterRegistry = new InserterRegistry();
    const inserterFactory = new InserterFactory(machineRegistry);

    config.machines.forEach(machineConfig => {
        machineRegistry.setMachine(MachineFactory.fromConfig(machineConfig))
    });

    // config.inserters.forEach(inserterConfig => {
    //     inserterRegistry.createNewInserter(inserterFactory.fromConfig(inserterConfig))
    // });

    // const primaryMachine = machineRegistry.getMachineByRecipeOrThrow(config.target_output.recipe);

    // const primaryMachineOutputInserter = inserterRegistry.getInsertersForMachine(primaryMachine.id).find(inserter => {
    //     return inserter.target.type === "belt";
    // });

    // if (!primaryMachineOutputInserter) {
    //     throw new Error(`No inserter found for output of primary machine with id ${primaryMachine.id}`);
    // }

    // const foo = computeInserterTickTimingForMachine(primaryMachine, inserterRegistry, config.target_output.items_per_second);

    // // console.log(JSON.stringify(foo[0], null, 2));

    for(const machine of machineRegistry.getAllMachines()) {

        printMachineFacts(machine);

    }

    // console.log(JSON.stringify(primaryMachine, null, 2))
}

main()

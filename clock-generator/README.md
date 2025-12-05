## Overview

work in progress script to generate clocks in factorio

current limitations:
1. only supports 1 assembly machine
2. only supports pickups from belt to machine (simulation of direct insertion setups coming soon...)


to run:

1. Install
```
npm install
```

2. run
```
npm run dev
```

in index.ts choose the target configuration you want to run and the run duration


## Current Implementation Concept
Right now the program assumes a non moving belt. It simulates the input inserters how the game actually controls them always. 

The output inserter has three phases:

**Phase 1: Planning**

don’t pull items out of the machine until it gets output blocked

Keep track of all input inserters and when their full swing duration during planning.

The final output quantity determines the maximum number of swings the output inserter can perform.

**Phase 2: Testing**

Enable the output inserter only for the number of ticks it would require to hit the max number of swings.

The full period is based on the target output rate per machine in ticks.

Input inserters are then tracked the whole time, but can swing freely.

**Phase 3: refinement**

Take the set of all input and output ticks in testing and create decider combinators with those ranges. If the ranges overlap, squash them into one range per inserter.

Add a buffer to the output inserter of 1 crafting cycle to account for it being off by 1 craft in the potential real game.

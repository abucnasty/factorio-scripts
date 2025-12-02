export interface TickProvider {
    getCurrentTick(): number;
}

export class MutableTickProvider implements TickProvider {
    private currentTick: number;

    constructor(initialTick: number = 0) {
        this.currentTick = initialTick;
    }
    
    public getCurrentTick(): number {
        return this.currentTick;
    }

    public setCurrentTick(tick: number): void {
        this.currentTick = tick;
    }

    public incrementTick(): void {
        this.currentTick += 1;
    }
}

export function create(tickProvider: () => number): TickProvider {
    return {
        getCurrentTick(): number {
            return tickProvider();
        }
    }
}

export const TickProvider = {
    create: create,
    mutable: (initialTick: number = 0) => new MutableTickProvider(initialTick),
};
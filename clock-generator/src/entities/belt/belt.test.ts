import { describe, test, expect } from "vitest"
import { Belt, BeltSpeed } from "./belt"

describe("Belt", () => {
    describe("Belt::amountToDropAtTick", () => {
        test("turbo-transport-belt with stack size 4", () => {
            const belt_speed = BeltSpeed.TURBO_TRANSPORT_BELT
            const stack_size = 4

            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 0)).toBe(4)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 1)).toBe(4)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 2)).toBe(4)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 3)).toBe(0)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 4)).toBe(4)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 5)).toBe(0)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 6)).toBe(4)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 7)).toBe(0)
        })

        test("turbo-transport-belt with stack size 1", () => {
            const belt_speed = BeltSpeed.TURBO_TRANSPORT_BELT
            const stack_size = 1

            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 0)).toBe(1)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 1)).toBe(1)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 2)).toBe(1)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 3)).toBe(0)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 4)).toBe(1)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 5)).toBe(0)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 6)).toBe(1)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 7)).toBe(0)
        })

        test("fast-transport-belt with stack size 1", () => {
            const belt_speed = BeltSpeed.FAST_TRANSPORT_BELT
            const stack_size = 1

            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 0)).toBe(1)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 1)).toBe(1)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 2)).toBe(0)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 3)).toBe(0)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 4)).toBe(1)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 5)).toBe(0)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 6)).toBe(0)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 7)).toBe(0)
            expect(Belt.amountToDropAtTick(belt_speed, stack_size, 8)).toBe(1)
        })
    })
})
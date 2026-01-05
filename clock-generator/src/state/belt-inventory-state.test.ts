import { describe, test, expect } from "vitest"
import { BeltInventoryState } from "./belt-inventory-state"
import { BeltBuilder, BeltSpeed } from "../entities/belt/belt"
import { BeltStackSize } from "../entities/belt/belt-stack-size"

describe("BeltInventoryState", () => {
    describe("QUANTITY_PER_LANE constant", () => {
        test("QUANTITY_PER_LANE is 4", () => {
            expect(BeltInventoryState.QUANTITY_PER_LANE).toBe(4)
        })

        test("quantity calculation example: stack size 4 should hold 16 items per lane", () => {
            expect(4 * BeltInventoryState.QUANTITY_PER_LANE).toBe(16)
        })

        test("quantity calculation example: stack size 1 should hold 4 items per lane", () => {
            expect(1 * BeltInventoryState.QUANTITY_PER_LANE).toBe(4)
        })
    })

    describe("fromBelt factory method", () => {
        test("creates belt inventory from a single lane belt", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("stone", BeltStackSize.FOUR)
                .build()

            const beltInventory = BeltInventoryState.fromBelt(belt)

            expect(beltInventory.getQuantity("stone")).toBe(16)
        })

        test("creates belt inventory from a double lane belt (same item)", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("stone", BeltStackSize.FOUR)
                .addLane("stone", BeltStackSize.FOUR)
                .build()

            const beltInventory = BeltInventoryState.fromBelt(belt)

            expect(beltInventory.getQuantity("stone")).toBe(32)
        })

        test("creates belt inventory from a dual lane belt (split items)", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("stone", BeltStackSize.FOUR)
                .addLane("iron-ore", BeltStackSize.FOUR)
                .build()

            const beltInventory = BeltInventoryState.fromBelt(belt)

            expect(beltInventory.getQuantity("stone")).toBe(16)
            expect(beltInventory.getQuantity("iron-ore")).toBe(16)
        })

        test("handles different stack sizes", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("stone", BeltStackSize.ONE)
                .build()

            const beltInventory = BeltInventoryState.fromBelt(belt)

            expect(beltInventory.getQuantity("stone")).toBe(4)
        })

        test("handles large stack sizes", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("stone", BeltStackSize.FOUR)
                .addLane("stone", BeltStackSize.FOUR)
                .build()

            const beltInventory = BeltInventoryState.fromBelt(belt)

            expect(beltInventory.getQuantity("stone")).toBe(32)
        })

        test("multiple belt lanes with same ingredient accumulate", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("copper-ore", BeltStackSize.TWO)
                .addLane("copper-ore", BeltStackSize.THREE)
                .build()

            const beltInventory = BeltInventoryState.fromBelt(belt)

            expect(beltInventory.getQuantity("copper-ore")).toBe((2 + 3) * 4)
        })
    })

    describe("constructor initialization", () => {
        test("constructor adds lanes to inventory during initialization", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("stone", BeltStackSize.FOUR)
                .build()

            // BeltInventoryState constructor is private, tested via fromBelt factory method
            const beltInventory = BeltInventoryState.fromBelt(belt)

            expect(beltInventory.getQuantity("stone")).toBe(16)
        })
    })

    describe("delegation to underlying InventoryState - read operations", () => {
        let beltInventory: BeltInventoryState

        function setupBeltInventory() {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("stone", BeltStackSize.FOUR)
                .addLane("iron-ore", BeltStackSize.TWO)
                .build()

            beltInventory = BeltInventoryState.fromBelt(belt)
        }

        test("getQuantity delegates correctly", () => {
            setupBeltInventory()
            expect(beltInventory.getQuantity("stone")).toBe(16)
            expect(beltInventory.getQuantity("iron-ore")).toBe(8)
            expect(beltInventory.getQuantity("non-existent")).toBe(0)
        })

        test("getItem delegates correctly", () => {
            setupBeltInventory()
            expect(beltInventory.getItem("stone")).toEqual({ item_name: "stone", quantity: 16 })
            expect(beltInventory.getItem("non-existent")).toBeNull()
        })

        test("getItemOrThrow delegates correctly", () => {
            setupBeltInventory()
            expect(beltInventory.getItemOrThrow("stone")).toEqual({ item_name: "stone", quantity: 16 })
        })

        test("getItemOrThrow throws for non-existent item", () => {
            setupBeltInventory()
            expect(() => beltInventory.getItemOrThrow("non-existent")).toThrow()
        })

        test("hasQuantity delegates correctly", () => {
            setupBeltInventory()
            expect(beltInventory.hasQuantity("stone", 16)).toBe(true)
            expect(beltInventory.hasQuantity("stone", 17)).toBe(false)
            expect(beltInventory.hasQuantity("non-existent", 1)).toBe(false)
        })

        test("getItems returns items with quantity > 0", () => {
            setupBeltInventory()
            const items = beltInventory.getItems()
            expect(items).toHaveLength(2)
            expect(items).toContainEqual({ item_name: "stone", quantity: 16 })
            expect(items).toContainEqual({ item_name: "iron-ore", quantity: 8 })
        })

        test("getAllItems returns all items", () => {
            setupBeltInventory()
            const items = beltInventory.getAllItems()
            expect(items.length).toBeGreaterThanOrEqual(2)
            expect(items).toContainEqual({ item_name: "stone", quantity: 16 })
            expect(items).toContainEqual({ item_name: "iron-ore", quantity: 8 })
        })

        test("getTotalQuantity sums all quantities", () => {
            setupBeltInventory()
            expect(beltInventory.getTotalQuantity()).toBe(24)
        })

        test("isEmpty returns false when belt has items", () => {
            setupBeltInventory()
            expect(beltInventory.isEmpty()).toBe(false)
        })

        test("isEmpty returns true for empty belt", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("stone", BeltStackSize.FOUR)
                .build()

            const emptyBeltInventory = BeltInventoryState.fromBelt(belt)
            expect(emptyBeltInventory.isEmpty()).toBe(false) // Not empty since it has items
        })

        test("export returns record of all items", () => {
            setupBeltInventory()
            const exported = beltInventory.export()
            expect(exported["stone"]).toBe(16)
            expect(exported["iron-ore"]).toBe(8)
        })
    })

    describe("write operations - should be NOOP for remove/set/clear/reset", () => {
        let beltInventory: BeltInventoryState

        function setupBeltInventory() {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("stone", BeltStackSize.FOUR)
                .addLane("iron-ore", BeltStackSize.TWO)
                .build()

            beltInventory = BeltInventoryState.fromBelt(belt)
        }

        test("removeQuantity is a NOOP", () => {
            setupBeltInventory()
            const initialQuantity = beltInventory.getQuantity("stone")
            beltInventory.removeQuantity("stone", 5)
            expect(beltInventory.getQuantity("stone")).toBe(initialQuantity)
        })

        test("removeQuantity does not throw", () => {
            setupBeltInventory()
            expect(() => beltInventory.removeQuantity("stone", 5)).not.toThrow()
        })

        test("setQuantity is a NOOP", () => {
            setupBeltInventory()
            const initialQuantity = beltInventory.getQuantity("stone")
            beltInventory.setQuantity("stone", 999)
            expect(beltInventory.getQuantity("stone")).toBe(initialQuantity)
        })

        test("setQuantity does not throw", () => {
            setupBeltInventory()
            expect(() => beltInventory.setQuantity("stone", 999)).not.toThrow()
        })

        test("clear is a NOOP", () => {
            setupBeltInventory()
            const initialQuantity = beltInventory.getTotalQuantity()
            beltInventory.clear()
            expect(beltInventory.getTotalQuantity()).toBe(initialQuantity)
        })

        test("clear does not throw", () => {
            setupBeltInventory()
            expect(() => beltInventory.clear()).not.toThrow()
        })

        test("resetItem is a NOOP", () => {
            setupBeltInventory()
            const initialQuantity = beltInventory.getQuantity("stone")
            beltInventory.resetItem("stone")
            expect(beltInventory.getQuantity("stone")).toBe(initialQuantity)
        })

        test("resetItem does not throw", () => {
            setupBeltInventory()
            expect(() => beltInventory.resetItem("stone")).not.toThrow()
        })
    })

    describe("clone method", () => {
        test("clone creates a new BeltInventoryState with same belt", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("stone", BeltStackSize.FOUR)
                .build()

            const original = BeltInventoryState.fromBelt(belt)
            const cloned = original.clone()

            expect(cloned).not.toBe(original)
            expect(cloned.getQuantity("stone")).toBe(16)
        })

        test("clone is independent from original", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("stone", BeltStackSize.FOUR)
                .build()

            const original = BeltInventoryState.fromBelt(belt)
            const cloned = original.clone()

            expect(original.getQuantity("stone")).toBe(16)
            expect(cloned.getQuantity("stone")).toBe(16)
        })
    })

    describe("complex multi-lane scenarios", () => {
        test("belt with 4 stack sizes across 2 lanes", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("stone-brick", BeltStackSize.FOUR)
                .addLane("stone-brick", BeltStackSize.FOUR)
                .build()

            const beltInventory = BeltInventoryState.fromBelt(belt)

            expect(beltInventory.getQuantity("stone-brick")).toBe(32)
        })

        test("different belt speeds don't affect inventory capacity", () => {
            const slowBelt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("copper-plate", BeltStackSize.FOUR)
                .build()

            const fastBelt = new BeltBuilder()
                .setId(2)
                .setBeltSpeed(BeltSpeed.EXPRESS_TRANSPORT_BELT)
                .addLane("copper-plate", BeltStackSize.FOUR)
                .build()

            const slowInventory = BeltInventoryState.fromBelt(slowBelt)
            const fastInventory = BeltInventoryState.fromBelt(fastBelt)

            expect(slowInventory.getQuantity("copper-plate")).toBe(fastInventory.getQuantity("copper-plate"))
        })

        test("mixed ingredients on different lanes", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TURBO_TRANSPORT_BELT)
                .addLane("iron-gear-wheel", BeltStackSize.THREE)
                .addLane("advanced-circuit", BeltStackSize.TWO)
                .build()

            const beltInventory = BeltInventoryState.fromBelt(belt)

            expect(beltInventory.getQuantity("iron-gear-wheel")).toBe(12)
            expect(beltInventory.getQuantity("advanced-circuit")).toBe(8)
            expect(beltInventory.getTotalQuantity()).toBe(20)
        })

        test("getItems correctly filters for belt inventory", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("steel-plate", BeltStackSize.FOUR)
                .addLane("stone", BeltStackSize.TWO)
                .build()

            const beltInventory = BeltInventoryState.fromBelt(belt)
            const items = beltInventory.getItems()

            expect(items).toHaveLength(2)
            expect(items).toContainEqual({ item_name: "steel-plate", quantity: 16 })
            expect(items).toContainEqual({ item_name: "stone", quantity: 8 })
        })
    })

    describe("WritableInventoryState interface compliance", () => {
        test("implements all ReadableInventoryState methods", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("stone", BeltStackSize.FOUR)
                .build()

            const beltInventory = BeltInventoryState.fromBelt(belt)

            expect(typeof beltInventory.getQuantity).toBe("function")
            expect(typeof beltInventory.getItem).toBe("function")
            expect(typeof beltInventory.getItemOrThrow).toBe("function")
            expect(typeof beltInventory.hasQuantity).toBe("function")
            expect(typeof beltInventory.getItems).toBe("function")
            expect(typeof beltInventory.getAllItems).toBe("function")
            expect(typeof beltInventory.getTotalQuantity).toBe("function")
            expect(typeof beltInventory.isEmpty).toBe("function")
        })

        test("implements all WritableInventoryState methods", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("stone", BeltStackSize.FOUR)
                .build()

            const beltInventory = BeltInventoryState.fromBelt(belt)

            expect(typeof beltInventory.addQuantity).toBe("function")
            expect(typeof beltInventory.removeQuantity).toBe("function")
            expect(typeof beltInventory.setQuantity).toBe("function")
            expect(typeof beltInventory.clear).toBe("function")
            expect(typeof beltInventory.resetItem).toBe("function")
            expect(typeof beltInventory.export).toBe("function")
            expect(typeof beltInventory.clone).toBe("function")
        })
    })

    describe("edge cases", () => {
        test("single lane belt with minimum stack size", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("explosives", BeltStackSize.ONE)
                .build()

            const beltInventory = BeltInventoryState.fromBelt(belt)

            expect(beltInventory.getQuantity("explosives")).toBe(4)
        })

        test("belt with all different items", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.FAST_TRANSPORT_BELT)
                .addLane("iron-ore", BeltStackSize.TWO)
                .addLane("copper-ore", BeltStackSize.THREE)
                .build()

            const beltInventory = BeltInventoryState.fromBelt(belt)

            expect(beltInventory.getQuantity("iron-ore")).toBe(8)
            expect(beltInventory.getQuantity("copper-ore")).toBe(12)
            expect(beltInventory.hasQuantity("iron-ore", 8)).toBe(true)
            expect(beltInventory.hasQuantity("copper-ore", 12)).toBe(true)
        })

        test("querying non-existent item returns 0", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("stone", BeltStackSize.FOUR)
                .build()

            const beltInventory = BeltInventoryState.fromBelt(belt)

            expect(beltInventory.getQuantity("non-existent-item")).toBe(0)
        })

        test("removeQuantity NOOP behavior on non-existent item", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TRANSPORT_BELT)
                .addLane("stone", BeltStackSize.FOUR)
                .build()

            const beltInventory = BeltInventoryState.fromBelt(belt)

            expect(() => beltInventory.removeQuantity("non-existent", 10)).not.toThrow()
        })
    })

    describe("large scale operations", () => {
        test("belt with maximum practical stack size", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.TURBO_TRANSPORT_BELT)
                .addLane("production-science-pack", BeltStackSize.FOUR)
                .addLane("production-science-pack", BeltStackSize.FOUR)
                .build()

            const beltInventory = BeltInventoryState.fromBelt(belt)

            expect(beltInventory.getQuantity("production-science-pack")).toBe(32)
        })

        test("export works with initialized lane items", () => {
            const belt = new BeltBuilder()
                .setId(1)
                .setBeltSpeed(BeltSpeed.EXPRESS_TRANSPORT_BELT)
                .addLane("iron-ore", BeltStackSize.FOUR)
                .addLane("copper-ore", BeltStackSize.TWO)
                .build()

            const beltInventory = BeltInventoryState.fromBelt(belt)

            const exported = beltInventory.export()

            expect(Object.keys(exported).length).toBe(2)
            expect(exported["iron-ore"]).toBe(16)
            expect(exported["copper-ore"]).toBe(8)
        })
    })
})

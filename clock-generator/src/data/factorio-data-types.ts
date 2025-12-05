export type ItemName = string;
export interface Ingredient {
  type: "item" | "fluid",
  name: ItemName,
  amount: number
}

export type RecipeName = string;

export type Recipe = {
  type: "recipe"
  name: RecipeName
  enabled: boolean
  energy_required: number
  ingredients: Ingredient[]
  results: Ingredient[]
  allow_productivity: boolean
  category: string
} & Record<string, any>

export type Item = {
  type: "item"
  name: ItemName
  stack_size: number
} & Record<string, any>

export interface FactorioData {
  recipe: Record<RecipeName, Recipe>
  item: Record<ItemName, Item>
  tool: Record<ItemName, Item>
}
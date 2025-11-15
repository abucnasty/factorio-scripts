export interface Ingredient {
  type: "item" | "fluid",
  name: string,
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

export interface FactorioData {
  recipe: Record<RecipeName, Recipe>
}
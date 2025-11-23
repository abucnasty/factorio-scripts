export const SignalIdType = {
    ITEM: "item",	
    FLUID: "fluid",	
    VIRTUAL: "virtual",	
    ENTITY: "entity",	
    RECIPE: "recipe",	
    SPACE_LOCATION: "space-location",	
    ASTEROID_CHUNK: "asteroid-chunk",	
    QUALITY: "quality"
} as const;

export type SignalIdType = typeof SignalIdType[keyof typeof SignalIdType];

export const QualityIdType = {
    normal: "normal",
    uncommon: "uncommon",
    rare: "rare",
    epic: "epic",
    legendary: "legendary",
} as const;

export type QualityIdType = typeof QualityIdType[keyof typeof QualityIdType];